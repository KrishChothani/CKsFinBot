/** @format */

import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Document } from "../models/document.model.js";
import { storageManager } from "../services/storage/StorageManager.js";
import { outboxRelay } from "../services/outboxRelay.service.js";
import {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} from "@cksfinbot/event-contracts";
import crypto from "crypto";
import fs from "fs";

// Helper to compute SHA-256 hash of a file for deduplication
const computeFileHash = (filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  } catch (err) {
    return `hash-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
};

/**
 * Main Document Upload Handler (Supports bulk intake)
 */
export const uploadDocuments = AsyncHandler(async (req, res) => {
  const { conversationId, clientId, documentTypeHint = "Auto" } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    throw new ApiError(400, "No files uploaded.");
  }

  const resolvedClientId = clientId || req.clientId;
  const userId = req.user?._id || req.user?.id || req.user?.userId;

  const processingPromises = files.map(async (file) => {
    // 1. Calculate file hash for deduplication
    const fileHash = file.path ? computeFileHash(file.path) : `hash-${crypto.randomUUID()}`;

    // 2. Check for duplicate document within client workspace
    let isDuplicate = false;
    let duplicateOf = null;
    if (resolvedClientId) {
      const existingDoc = await Document.findOne({
        client: resolvedClientId,
        fileHash,
      });
      if (existingDoc) {
        isDuplicate = true;
        duplicateOf = existingDoc._id;
      }
    }

    // 3. Upload file via multi-provider storage
    let uploadResult;
    try {
      uploadResult = await storageManager.upload(file);
    } finally {
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (_) {}
      }
    }

    // 4. Create Document record
    const newDocument = await Document.create({
      firm: req.firmId,
      client: resolvedClientId || undefined,
      user: userId,
      conversation: conversationId || undefined,
      fileName: file.originalname,
      fileSize: file.size || 0,
      fileType: file.mimetype,
      fileHash,
      s3Url: uploadResult.url,
      documentType: documentTypeHint !== "Auto" ? documentTypeHint : "Unknown",
      source: "Web_Upload",
      status: "Processing",
      isDuplicate,
      duplicateOf,
      pineconeNamespace: `doc-${crypto.randomUUID()}`,
    });

    // 5. Publish Duplicate Event if detected
    if (isDuplicate) {
      const duplicateEnvelope = createEventEnvelope({
        eventType: EVENT_TYPES.DOCUMENT_DUPLICATE_DETECTED,
        producer: "document-service",
        tenant: {
          firmId: String(req.firmId),
          clientId: resolvedClientId ? String(resolvedClientId) : null,
        },
        correlationId: req.correlationId || crypto.randomUUID(),
        payload: {
          documentId: String(newDocument._id),
          existingDocumentId: String(duplicateOf),
          fileHash,
          fileName: newDocument.fileName,
        },
      });

      await outboxRelay.recordAndPublishEvent(
        duplicateEnvelope,
        ROUTING_KEYS[EVENT_TYPES.DOCUMENT_DUPLICATE_DETECTED]
      );
    }

    // 6. Publish DocumentIngestedEvent to RabbitMQ via Transactional Outbox
    const ingestedEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.DOCUMENT_INGESTED,
      producer: "document-service",
      tenant: {
        firmId: String(req.firmId),
        clientId: resolvedClientId ? String(resolvedClientId) : null,
      },
      correlationId: req.correlationId || crypto.randomUUID(),
      payload: {
        documentId: String(newDocument._id),
        fileName: newDocument.fileName,
        fileSize: newDocument.fileSize,
        fileType: newDocument.fileType,
        fileHash: newDocument.fileHash,
        s3Url: newDocument.s3Url,
        documentType: newDocument.documentType,
        source: "Web_Upload",
        pineconeNamespace: newDocument.pineconeNamespace,
      },
    });

    await outboxRelay.recordAndPublishEvent(
      ingestedEnvelope,
      ROUTING_KEYS[EVENT_TYPES.DOCUMENT_INGESTED]
    );

    return newDocument;
  });

  const createdDocs = await Promise.all(processingPromises);

  return res.status(201).json(
    new ApiResponse(
      201,
      createdDocs,
      `${files.length} document(s) uploaded and queued for autonomous extraction.`
    )
  );
});

/**
 * List documents for Document Inbox
 */
export const listDocuments = AsyncHandler(async (req, res) => {
  const { status, documentType, search, page = 1, limit = 25 } = req.query;

  let query = {};
  if (req.firmId) query.firm = req.firmId;
  if (req.clientId) query.client = req.clientId;

  if (status) query.status = status;
  if (documentType) query.documentType = documentType;
  if (search) {
    query.fileName = { $regex: search, $options: "i" };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [documents, totalCount] = await Promise.all([
    Document.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    Document.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        documents,
        pagination: {
          total: totalCount,
          page: parseInt(page, 10),
          pages: Math.ceil(totalCount / parseInt(limit, 10)),
        },
      },
      "Documents retrieved successfully."
    )
  );
});

/**
 * Presigned S3 direct uploads
 */
export const uploadDocumentsViaS3 = AsyncHandler(async (req, res) => {
  const { conversationId, clientId, documents, documentTypeHint = "Auto" } = req.body;

  if (!documents || documents.length === 0) {
    throw new ApiError(400, "No documents provided.");
  }

  const resolvedClientId = clientId || req.clientId;
  const userId = req.user?._id || req.user?.id || req.user?.userId;

  const processingPromises = documents.map(async (doc) => {
    const { fileName, fileUrl, fileType, fileSize } = doc;

    const newDocument = await Document.create({
      firm: req.firmId,
      client: resolvedClientId || undefined,
      user: userId,
      conversation: conversationId || undefined,
      fileName,
      fileSize: fileSize || 0,
      fileType,
      s3Url: fileUrl,
      documentType: documentTypeHint !== "Auto" ? documentTypeHint : "Unknown",
      status: "Processing",
      pineconeNamespace: `doc-${crypto.randomUUID()}`,
    });

    // Publish DocumentIngestedEvent
    const ingestedEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.DOCUMENT_INGESTED,
      producer: "document-service",
      tenant: {
        firmId: String(req.firmId),
        clientId: resolvedClientId ? String(resolvedClientId) : null,
      },
      correlationId: req.correlationId || crypto.randomUUID(),
      payload: {
        documentId: String(newDocument._id),
        fileName: newDocument.fileName,
        fileSize: newDocument.fileSize,
        fileType: newDocument.fileType,
        s3Url: newDocument.s3Url,
        documentType: newDocument.documentType,
        source: "Web_Upload_S3",
        pineconeNamespace: newDocument.pineconeNamespace,
      },
    });

    await outboxRelay.recordAndPublishEvent(
      ingestedEnvelope,
      ROUTING_KEYS[EVENT_TYPES.DOCUMENT_INGESTED]
    );

    return newDocument;
  });

  const createdDocs = await Promise.all(processingPromises);

  return res.status(201).json(
    new ApiResponse(201, createdDocs, `${createdDocs.length} file(s) registered for extraction.`)
  );
});

/**
 * Extraction webhook for backward compatibility
 */
export const updateDocumentExtractionWebhook = AsyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const {
    documentType,
    status: failStatus,
    errorMessage,
    extractedDataId,
  } = req.body;

  const document = await Document.findById(documentId);
  if (!document) {
    throw new ApiError(404, "Document not found");
  }

  if (failStatus === "failed") {
    document.status = "Failed";
    document.errorMessage = errorMessage || "Extraction failed.";
  } else {
    document.status = "Needs_Review";
    if (documentType) document.documentType = documentType;
    if (extractedDataId) document.extractedDataId = extractedDataId;
  }

  await document.save();

  return res.status(200).json(
    new ApiResponse(200, document, "Document updated successfully.")
  );
});

/**
 * Status update webhook
 */
export const updateDocumentStatusWebhook = AsyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const { status, errorMessage } = req.body;

  const document = await Document.findById(documentId);
  if (!document) {
    throw new ApiError(404, "Document not found");
  }

  if (status) {
    document.status = status;
  }
  if (errorMessage) {
    document.errorMessage = errorMessage;
  }

  await document.save();

  return res.status(200).json(
    new ApiResponse(200, document, "Document status updated.")
  );
});


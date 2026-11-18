/** @format */

import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { DocumentRequest } from "../models/documentRequest.model.js";
import { Document } from "../models/document.model.js";
import { storageManager } from "../services/storage/StorageManager.js";
import { outboxRelay } from "../services/outboxRelay.service.js";
import { createEventEnvelope, EVENT_TYPES, ROUTING_KEYS } from "@cksfinbot/event-contracts";
import crypto from "crypto";
import fs from "fs";

const computeFileHash = (filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  } catch (err) {
    return `hash-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
};

const categoryToDocType = (cat) => {
  switch (cat) {
    case "Bank_Statement":
      return "Bank_Statement";
    case "Purchase_Invoice":
      return "Purchase_Invoice";
    case "Sales_Invoice":
      return "Sales_Invoice";
    case "Expense_Bill":
      return "Expense_Bill";
    case "Tax_Challan":
      return "Tax_Document";
    default:
      return "Unknown";
  }
};

// Public: Get document request details by secure token (NO JWT required)
export const getPublicPortalDetails = AsyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new ApiError(400, "Token is required.");
  }

  const request = await DocumentRequest.findOne({ token });

  if (!request) {
    throw new ApiError(404, "Invalid or expired document request link.");
  }

  if (request.tokenExpiresAt && new Date() > request.tokenExpiresAt) {
    request.status = "Expired";
    await request.save();
    throw new ApiError(410, "This upload link has expired. Please contact your accountant.");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        requestId: request._id,
        title: request.title,
        description: request.description,
        documentCategory: request.documentCategory,
        period: request.period,
        urgency: request.urgency,
        dueDate: request.dueDate,
        status: request.status,
        firmId: request.firm,
        clientId: request.client,
        isFulfilled: request.status === "Fulfilled",
      },
      "Document request details loaded."
    )
  );
});

// Public: Client uploads requested document (NO JWT required)
export const uploadViaPublicPortal = AsyncHandler(async (req, res) => {
  const { token } = req.params;
  const file = req.file;

  if (!token) {
    throw new ApiError(400, "Token is required.");
  }
  if (!file) {
    throw new ApiError(400, "No file uploaded.");
  }

  const request = await DocumentRequest.findOne({ token });
  if (!request) {
    throw new ApiError(404, "Invalid or expired document request link.");
  }

  if (request.status === "Fulfilled") {
    throw new ApiError(400, "This request has already been fulfilled.");
  }

  const fileHash = file.path ? computeFileHash(file.path) : `hash-${crypto.randomUUID()}`;

  // Upload file via multi-provider storage
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

  const documentType = categoryToDocType(request.documentCategory);

  // Create Document record
  const newDocument = await Document.create({
    firm: request.firm,
    client: request.client,
    user: request.requestedBy,
    fileName: file.originalname,
    fileSize: file.size || 0,
    fileType: file.mimetype,
    fileHash,
    s3Url: uploadResult.url,
    documentType,
    source: "Client_Portal",
    status: "Processing",
    pineconeNamespace: `doc-${crypto.randomUUID()}`,
  });

  // Mark request as fulfilled
  request.status = "Fulfilled";
  request.fulfilledDocument = newDocument._id;
  request.fulfilledAt = new Date();
  await request.save();

  // Publish DocumentIngestedEvent via Outbox
  const eventEnvelope = createEventEnvelope({
    eventType: EVENT_TYPES.DOCUMENT_INGESTED,
    producer: "document-service",
    tenant: {
      firmId: String(request.firm),
      clientId: String(request.client),
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
      source: "Client_Portal",
      documentRequestId: String(request._id),
      pineconeNamespace: newDocument.pineconeNamespace,
    },
  });

  await outboxRelay.recordAndPublishEvent(
    eventEnvelope,
    ROUTING_KEYS[EVENT_TYPES.DOCUMENT_INGESTED]
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        documentId: newDocument._id,
        fileName: newDocument.fileName,
        status: "Submitted",
      },
      "Document submitted successfully! Your accountant has been notified."
    )
  );
});


/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { Document } from "../Models/document.model.js";
import { Conversation } from "../Models/conversation.model.js";
import { Message } from "../Models/message.model.js";
import { ExtractedData } from "../Models/extractedData.model.js";
import { Client } from "../Models/client.model.js";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import mongoose from "mongoose";
import fs from "fs";
import crypto from "crypto";
import { storageManager } from "../Services/Storage/StorageManager.js";
import { ingestTransactionsFromStatement } from "../Services/bankRecon.service.js";
import { enqueueExtractionJob } from "../Queues/documentExtraction.queue.js";

// Helper to compute SHA-256 hash of a file for deduplication
const computeFileHash = (filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  } catch (err) {
    return `hash-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
};

// Main Document Upload Handler (Supports both chat attachments & Document Inbox bulk intake)
const uploadDocuments = AsyncHandler(async (req, res) => {
  const { conversationId, clientId, documentTypeHint = "Auto" } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    throw new ApiError(400, "No files uploaded.");
  }

  // Resolve client workspace
  const resolvedClientId = clientId || req.clientId;
  let client = null;
  if (resolvedClientId) {
    client = await Client.findOne({ _id: resolvedClientId, firm: req.firmId });
  }

  // Optional: Conversation check if uploaded from chat
  let conversation = null;
  let isFirstInteraction = false;
  if (conversationId && mongoose.isValidObjectId(conversationId)) {
    conversation = await Conversation.findOne({
      _id: conversationId,
      user: req.user._id,
    });
    const existingMessages = await Message.countDocuments({ conversation: conversationId });
    isFirstInteraction = existingMessages === 0;
  }

  const processingPromises = files.map(async (file) => {
    // 1. Calculate file hash for deduplication
    const fileHash = file.path ? computeFileHash(file.path) : `hash-${uuidv4()}`;

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
      user: req.user._id,
      conversation: conversation?._id || undefined,
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
      pineconeNamespace: `doc-${uuidv4()}`,
    });

    // Optional chat message if in a conversation
    if (conversation) {
      await Message.create({
        conversation: conversation._id,
        role: "system",
        content: `File uploaded: ${newDocument.fileName}. Processing...`,
      });
    }

    // 5. Enqueue Python Structured Extraction via resilient Async Queue
    await enqueueExtractionJob({
      documentId: newDocument._id,
      firmId: req.firmId,
      clientId: req.clientId,
      s3Url: newDocument.s3Url,
      fileName: newDocument.fileName,
    }).catch((err) => {
      console.error(`Failed to enqueue extraction job for doc ${newDocument._id}:`, err.message);
    });

    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";

    // Call Vector RAG Ingestion in parallel for semantic Q&A
    axios
      .post(`${pythonServiceUrl}/process-document`, {
        documentId: newDocument._id.toString(),
        s3Url: newDocument.s3Url,
        pineconeNamespace: newDocument.pineconeNamespace,
      })
      .catch((err) => {
        console.error(
          `Failed to trigger RAG indexing for doc ${newDocument._id}:`,
          err.message
        );
      });

    return { document: newDocument };
  });

  const results = await Promise.all(processingPromises);
  const newDocumentIds = results.map((result) => result.document._id);

  // Update conversation if applicable
  if (conversation) {
    const updateData = {
      $push: { documents: { $each: newDocumentIds } },
      updatedAt: new Date(),
    };
    if (isFirstInteraction && conversation.title === "New Chat") {
      const fileNames = files.map((f) => f.originalname).join(", ");
      updateData.title = `Document Analysis: ${
        fileNames.length > 40 ? fileNames.substring(0, 37) + "..." : fileNames
      }`;
    }
    await Conversation.findByIdAndUpdate(conversation._id, updateData);
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      results.map((r) => r.document),
      `${files.length} document(s) uploaded and extraction started.`
    )
  );
});

// List documents for Document Inbox
const listDocuments = AsyncHandler(async (req, res) => {
  const { status, documentType, search, page = 1, limit = 25 } = req.query;

  let query = { firm: req.firmId };
  if (req.clientId) {
    query.client = req.clientId;
  }

  if (status) query.status = status;
  if (documentType) query.documentType = documentType;
  if (search) {
    query.fileName = { $regex: search, $options: "i" };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [documents, totalCount] = await Promise.all([
    Document.find(query)
      .populate("client", "businessName gstin")
      .populate("extractedDataId")
      .populate("voucherId")
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

// Webhook invoked by Python service when structured extraction finishes
const updateDocumentExtractionWebhook = AsyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const {
    documentType,
    extractionConfidence,
    invoiceData,
    bankData,
    validationResults,
    rawTextPreview,
    status: failStatus,
    errorMessage,
  } = req.body;

  const document = await Document.findById(documentId);
  if (!document) {
    throw new ApiError(404, "Document not found");
  }

  if (failStatus === "failed") {
    document.status = "Failed";
    document.errorMessage = errorMessage || "Extraction failed.";
    await document.save();
    return res.status(200).json(new ApiResponse(200, document, "Marked as failed."));
  }

  // Save or update ExtractedData
  const extractedPayload = {
    firm: document.firm,
    client: document.client,
    document: document._id,
    rawOcrText: rawTextPreview || "",
    extractionConfidence: extractionConfidence || 0.9,
    validationResults: validationResults || { isMathValid: true, isGstinChecksumValid: true },
  };

  if (invoiceData) {
    extractedPayload.invoiceDetails = {
      invoiceNumber: { value: invoiceData.invoiceNumber, confidence: 0.95 },
      invoiceDate: {
        value: invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : null,
        confidence: 0.95,
      },
      dueDate: {
        value: invoiceData.dueDate ? new Date(invoiceData.dueDate) : null,
        confidence: 0.9,
      },
      placeOfSupply: { value: invoiceData.placeOfSupply, confidence: 0.9 },
      currency: { value: invoiceData.currency || "INR", confidence: 1.0 },
    };

    extractedPayload.counterParty = {
      name: { value: invoiceData.supplierName, confidence: 0.95 },
      gstin: { value: invoiceData.supplierGstin, confidence: 0.95 },
      pan: { value: invoiceData.supplierPan, confidence: 0.9 },
      address: { value: invoiceData.supplierAddress, confidence: 0.85 },
    };

    extractedPayload.lineItems = invoiceData.lineItems || [];
    extractedPayload.financialSummary = {
      subTotal: invoiceData.subTotal || 0,
      totalCgst: invoiceData.totalCgst || 0,
      totalSgst: invoiceData.totalSgst || 0,
      totalIgst: invoiceData.totalIgst || 0,
      totalCess: invoiceData.totalCess || 0,
      roundOff: invoiceData.roundOff || 0,
      grandTotal: invoiceData.grandTotal || 0,
    };
  } else if (bankData) {
    extractedPayload.bankSummary = {
      bankName: bankData.bankName || "",
      accountNumber: bankData.accountNumber || "",
      ifscCode: bankData.ifscCode || "",
      accountHolderName: bankData.accountHolderName || "",
      openingBalance: bankData.openingBalance || 0,
      closingBalance: bankData.closingBalance || 0,
      periodStart: bankData.periodStart ? new Date(bankData.periodStart) : null,
      periodEnd: bankData.periodEnd ? new Date(bankData.periodEnd) : null,
    };
    extractedPayload.transactions = bankData.transactions || [];

    // Auto-ingest into BankTransaction collection if client is associated
    if (document.client && bankData.transactions?.length > 0) {
      ingestTransactionsFromStatement({
        firmId: document.firm,
        clientId: document.client,
        documentId: document._id,
        bankSummary: extractedPayload.bankSummary,
        transactions: bankData.transactions,
      }).catch((err) => {
        console.error("Auto-ingest bank transactions error:", err.message);
      });
    }
  }

  const savedExtracted = await ExtractedData.findOneAndUpdate(
    { document: document._id },
    extractedPayload,
    { upsert: true, new: true }
  );

  document.documentType = documentType || document.documentType || "Purchase_Invoice";
  document.status = "Needs_Review";
  document.extractedDataId = savedExtracted._id;
  await document.save();

  // If part of a conversation, update system message
  if (document.conversation) {
    await Message.create({
      conversation: document.conversation,
      role: "system",
      content: `Extracted data for ${document.fileName} is ready for review.`,
    });
  }

  return res.status(200).json(
    new ApiResponse(200, { document, extractedData: savedExtracted }, "Extraction saved successfully.")
  );
});

// Legacy status update webhook for RAG processing
const updateDocumentStatusWebhook = AsyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const { status, errorMessage } = req.body;

  const document = await Document.findById(documentId);
  if (!document) {
    throw new ApiError(404, "Document not found");
  }

  if (document.status === "Processing" || document.status === "Queued") {
    if (status === "failed") {
      document.status = "Failed";
      document.errorMessage = errorMessage;
      await document.save();
    }
  }

  return res.status(200).json(new ApiResponse(200, document, "Document status updated."));
});

// Presigned S3 direct uploads
const uploadDocumentsViaS3 = AsyncHandler(async (req, res) => {
  const { conversationId, clientId, documents, documentTypeHint = "Auto" } = req.body;

  if (!documents || documents.length === 0) {
    throw new ApiError(400, "No documents provided.");
  }

  const resolvedClientId = clientId || req.clientId;
  const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";

  const processingPromises = documents.map(async (doc) => {
    const { fileName, fileUrl, fileType, fileSize } = doc;

    const newDocument = await Document.create({
      firm: req.firmId,
      client: resolvedClientId || undefined,
      user: req.user._id,
      conversation: conversationId || undefined,
      fileName,
      fileSize: fileSize || 0,
      fileType,
      s3Url: fileUrl,
      documentType: documentTypeHint !== "Auto" ? documentTypeHint : "Unknown",
      status: "Processing",
      pineconeNamespace: `doc-${uuidv4()}`,
    });

    // Enqueue Python structured extraction via resilient queue
    await enqueueExtractionJob({
      documentId: newDocument._id,
      firmId: req.firmId,
      clientId: req.clientId,
      s3Url: newDocument.s3Url,
      fileName: newDocument.fileName,
    }).catch((err) => {
      console.error(`S3 direct upload queue error:`, err.message);
    });

    return newDocument;
  });

  const createdDocs = await Promise.all(processingPromises);

  return res.status(201).json(
    new ApiResponse(201, createdDocs, `${createdDocs.length} file(s) registered for extraction.`)
  );
});

export {
  uploadDocuments,
  listDocuments,
  uploadDocumentsViaS3,
  updateDocumentExtractionWebhook,
  updateDocumentStatusWebhook,
};

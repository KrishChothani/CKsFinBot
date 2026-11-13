/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { DocumentRequest } from "../Models/documentRequest.model.js";
import { Document } from "../Models/document.model.js";
import { AuditLog } from "../Models/auditLog.model.js";
import { storageManager } from "../Services/Storage/StorageManager.js";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import fs from "fs";
import axios from "axios";

// Helper to compute SHA-256 hash of a file for deduplication
const computeFileHash = (filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  } catch (err) {
    return `hash-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
};

// Map documentCategory to documentType
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

  const request = await DocumentRequest.findOne({ token })
    .populate("firm", "name")
    .populate("client", "businessName gstin settings");

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
        firmName: request.firm?.name || "Accounting Firm",
        clientName: request.client?.businessName || "Client Entity",
        clientGstin: request.client?.gstin || "",
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

  const request = await DocumentRequest.findOne({ token }).populate("client");
  if (!request) {
    throw new ApiError(404, "Invalid or expired document request link.");
  }

  if (request.status === "Fulfilled") {
    throw new ApiError(400, "This request has already been fulfilled.");
  }

  const fileHash = file.path ? computeFileHash(file.path) : `hash-${uuidv4()}`;

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
    client: request.client._id,
    user: request.requestedBy, // Attributed to the CA who requested it
    fileName: file.originalname,
    fileSize: file.size || 0,
    fileType: file.mimetype,
    fileHash,
    s3Url: uploadResult.url,
    documentType,
    source: "Client_Portal",
    status: "Processing",
    pineconeNamespace: `doc-${uuidv4()}`,
  });

  // Mark request as fulfilled
  request.status = "Fulfilled";
  request.fulfilledDocument = newDocument._id;
  request.fulfilledAt = new Date();
  await request.save();

  // Audit Log
  await AuditLog.create({
    firm: request.firm,
    client: request.client._id,
    action: "DOCUMENT_UPLOAD",
    entityType: "Document",
    entityId: newDocument._id,
    metadata: {
      details: `Document uploaded via client portal for request '${request.title}': ${file.originalname}`,
    },
  });

  // Trigger Python Extraction
  const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";
  axios
    .post(`${pythonServiceUrl}/extract-structured`, {
      documentId: newDocument._id.toString(),
      s3Url: newDocument.s3Url,
      documentTypeHint: documentType,
      clientStateCode: request.client?.settings?.stateCode || "24",
    })
    .catch((err) => {
      console.error(
        `Failed to trigger structured extraction for portal doc ${newDocument._id}:`,
        err.message
      );
    });

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


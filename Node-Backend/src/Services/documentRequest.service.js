/** @format */

import crypto from "crypto";
import { DocumentRequest } from "../Models/documentRequest.model.js";
import { Client } from "../Models/client.model.js";
import { Firm } from "../Models/firm.model.js";
import { AuditLog } from "../Models/auditLog.model.js";

/**
 * CA creates a request for missing documents from a client
 */
export const createDocumentRequest = async ({
  firmId,
  clientId,
  userId,
  title,
  description = "",
  documentCategory = "Other",
  period = "",
  urgency = "Normal",
  dueDate,
}) => {
  const token = crypto.randomBytes(16).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

  const request = await DocumentRequest.create({
    firm: firmId,
    client: clientId,
    requestedBy: userId,
    title,
    description,
    documentCategory,
    period,
    urgency,
    dueDate: dueDate ? new Date(dueDate) : null,
    token,
    tokenExpiresAt,
    status: "Pending",
  });

  await AuditLog.create({
    firm: firmId,
    client: clientId,
    performedBy: userId,
    action: "DOCUMENT_UPLOAD",
    entityType: "Document",
    entityId: request._id,
    metadata: {
      details: `Document request created: ${title} (${documentCategory})`,
    },
  });

  return request;
};

/**
 * List document requests for a client
 */
export const getDocumentRequests = async (firmId, clientId, status = "ALL") => {
  const query = { client: clientId };
  if (status && status !== "ALL") {
    query.status = status;
  }

  const requests = await DocumentRequest.find(query)
    .populate("requestedBy", "fullName email")
    .populate("fulfilledDocument", "title originalName fileUrl status documentType")
    .sort({ createdAt: -1 });

  return requests;
};

/**
 * Public lookup of a request by secure upload token
 */
export const getPublicRequestDetails = async (token) => {
  const request = await DocumentRequest.findOne({ token })
    .populate("firm", "name")
    .populate("client", "businessName gstin");

  if (!request) {
    throw new Error("Invalid or expired document upload link.");
  }

  if (request.tokenExpiresAt && new Date() > request.tokenExpiresAt) {
    request.status = "Expired";
    await request.save();
    throw new Error("This document upload link has expired. Please contact your accountant.");
  }

  return {
    requestId: request._id,
    title: request.title,
    description: request.description,
    documentCategory: request.documentCategory,
    period: request.period,
    urgency: request.urgency,
    status: request.status,
    firmName: request.firm?.name || "Accounting Firm",
    clientName: request.client?.businessName || "Client Entity",
    clientGstin: request.client?.gstin || "",
    isFulfilled: request.status === "Fulfilled",
  };
};

/**
 * Complete document request upon file upload
 */
export const markRequestAsFulfilled = async (token, documentId) => {
  const request = await DocumentRequest.findOne({ token });
  if (!request) return null;

  request.status = "Fulfilled";
  request.fulfilledDocument = documentId;
  request.fulfilledAt = new Date();
  await request.save();

  return request;
};


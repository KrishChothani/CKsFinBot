/** @format */

import crypto from "crypto";
import { DocumentRequest } from "../models/documentRequest.model.js";

/**
 * CA creates a request for missing documents from a client.
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

  return request;
};

/**
 * List document requests for a client.
 */
export const getDocumentRequests = async (firmId, clientId, status = "ALL") => {
  const query = { firm: firmId };
  if (clientId) {
    query.client = clientId;
  }
  if (status && status !== "ALL") {
    query.status = status;
  }

  const requests = await DocumentRequest.find(query)
    .populate("fulfilledDocument", "fileName s3Url status documentType")
    .sort({ createdAt: -1 });

  return requests;
};

/**
 * Public lookup of a request by secure upload token.
 */
export const getPublicRequestDetails = async (token) => {
  const request = await DocumentRequest.findOne({ token }).populate("fulfilledDocument");

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
    dueDate: request.dueDate,
    status: request.status,
    isFulfilled: request.status === "Fulfilled",
  };
};

export default {
  createDocumentRequest,
  getDocumentRequests,
  getPublicRequestDetails,
};


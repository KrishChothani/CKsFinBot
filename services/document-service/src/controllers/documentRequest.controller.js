/** @format */

import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { DocumentRequest } from "../models/documentRequest.model.js";
import {
  createDocumentRequest,
  getDocumentRequests,
} from "../services/documentRequest.service.js";

// CA creates a document request for client
export const createRequest = AsyncHandler(async (req, res) => {
  const {
    title,
    description,
    documentCategory,
    period,
    urgency,
    dueDate,
  } = req.body;
  const clientId = req.body.clientId || req.clientId;
  const userId = req.user?._id || req.user?.id || req.user?.userId;

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }
  if (!title) {
    throw new ApiError(400, "Request title is required.");
  }

  const newRequest = await createDocumentRequest({
    firmId: req.firmId,
    clientId,
    userId,
    title,
    description,
    documentCategory,
    period,
    urgency,
    dueDate,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      newRequest,
      "Document request created successfully. Share the portal link with your client."
    )
  );
});

// List requests for active client
export const listRequests = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const status = req.query.status || "ALL";

  const requests = await getDocumentRequests(req.firmId, clientId, status);

  return res.status(200).json(
    new ApiResponse(
      200,
      requests,
      `Fetched ${requests.length} document request(s).`
    )
  );
});

// Cancel a request
export const cancelRequest = AsyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const clientId = req.body.clientId || req.clientId;

  const query = { _id: requestId };
  if (clientId) query.client = clientId;
  if (req.firmId) query.firm = req.firmId;

  const request = await DocumentRequest.findOne(query);

  if (!request) {
    throw new ApiError(404, "Document request not found.");
  }

  request.status = "Cancelled";
  await request.save();

  return res.status(200).json(
    new ApiResponse(200, request, "Document request cancelled successfully.")
  );
});


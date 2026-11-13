/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { DocumentRequest } from "../Models/documentRequest.model.js";
import {
  createDocumentRequest,
  getDocumentRequests,
} from "../Services/documentRequest.service.js";

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

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }
  if (!title) {
    throw new ApiError(400, "Request title is required.");
  }

  const newRequest = await createDocumentRequest({
    firmId: req.firmId,
    clientId,
    userId: req.user._id,
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

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

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

  const request = await DocumentRequest.findOne({
    _id: requestId,
    client: clientId,
  });

  if (!request) {
    throw new ApiError(404, "Document request not found.");
  }

  request.status = "Cancelled";
  await request.save();

  return res.status(200).json(
    new ApiResponse(200, request, "Document request cancelled successfully.")
  );
});


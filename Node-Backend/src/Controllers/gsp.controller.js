/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import {
  syncGstr2bFromGsp,
  updateGstCredentials,
} from "../Services/gsp.service.js";

// Pull GSTR-2B directly from GST Portal Sandbox / GSP
export const syncPortalGstr2b = AsyncHandler(async (req, res) => {
  const { returnPeriod = "042026", financialYear = "2026-2027" } = req.body;
  const clientId = req.body.clientId || req.clientId;

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const result = await syncGstr2bFromGsp({
    firmId: req.firmId,
    clientId,
    returnPeriod,
    financialYear,
    userId: req.user._id,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      `Direct GSP portal sync completed: ${result.syncedCount} invoices retrieved for period ${returnPeriod}.`
    )
  );
});

// Configure GSP credentials for client
export const setGstCredentials = AsyncHandler(async (req, res) => {
  const { username, gspAppKey } = req.body;
  const clientId = req.body.clientId || req.clientId;

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const creds = await updateGstCredentials({
    firmId: req.firmId,
    clientId,
    username,
    gspAppKey,
  });

  return res.status(200).json(
    new ApiResponse(200, creds, "GST portal credentials saved successfully.")
  );
});


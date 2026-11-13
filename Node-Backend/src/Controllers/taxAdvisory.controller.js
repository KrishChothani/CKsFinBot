/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import {
  getClientTaxAdvisorySummary,
  getMsmePaymentTracker,
  getActiveTaxRules,
} from "../Services/taxAdvisory.service.js";

// Fetch tax advisory disallowance summary
export const getTaxAdvisorySummary = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const advisory = await getClientTaxAdvisorySummary(req.firmId, clientId);

  return res.status(200).json(
    new ApiResponse(200, advisory, "Tax advisory analysis generated successfully.")
  );
});

// Fetch Section 43B(h) MSME 45-day tracker
export const getMsmeTracker = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const msmeData = await getMsmePaymentTracker(req.firmId, clientId);

  return res.status(200).json(
    new ApiResponse(200, msmeData, "MSME Section 43B(h) payment tracker loaded.")
  );
});

// Fetch active versioned tax rules configuration
export const getTaxRules = AsyncHandler(async (req, res) => {
  const rules = getActiveTaxRules();

  return res.status(200).json(
    new ApiResponse(200, rules, "Active statutory tax rules configuration.")
  );
});


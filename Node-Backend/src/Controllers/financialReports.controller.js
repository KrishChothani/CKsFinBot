/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import {
  generateProfitAndLossStatement,
  generateBalanceSheet,
  generateAgeingReport,
  generateFirmConsolidatedOverview,
} from "../Services/financialReports.service.js";

// Fetch Schedule III Profit & Loss (P&L) Statement
export const getProfitAndLoss = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const financialYear = req.query.financialYear || "2026-2027";

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const pnl = await generateProfitAndLossStatement(
    req.firmId,
    clientId,
    financialYear
  );

  return res.status(200).json(
    new ApiResponse(200, pnl, "Profit & Loss statement generated successfully.")
  );
});

// Fetch Balance Sheet Snapshot
export const getBalanceSheetReport = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const financialYear = req.query.financialYear || "2026-2027";

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const balanceSheet = await generateBalanceSheet(
    req.firmId,
    clientId,
    financialYear
  );

  return res.status(200).json(
    new ApiResponse(200, balanceSheet, "Balance Sheet generated successfully.")
  );
});

// Fetch Receivables & Payables Ageing Report
export const getAgeing = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const ageing = await generateAgeingReport(req.firmId, clientId);

  return res.status(200).json(
    new ApiResponse(200, ageing, "Ageing report generated successfully.")
  );
});

// Fetch Multi-Client Firm Consolidated Overview (CA Firm level)
export const getConsolidatedOverview = AsyncHandler(async (req, res) => {
  const overview = await generateFirmConsolidatedOverview(req.firmId);

  return res.status(200).json(
    new ApiResponse(
      200,
      overview,
      "Firm multi-client consolidated overview loaded."
    )
  );
});


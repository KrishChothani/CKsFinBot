/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import {
  computeCloseReadiness,
  generateGapAwareChasingBundles,
} from "../Services/closeReadiness.service.js";

/**
 * Get Month-End Close Readiness Score & 5-Pillar Checklist
 */
export const getCloseReadinessReport = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const month = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
  const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
  const financialYear = req.query.financialYear || "2026-2027";

  if (!clientId) {
    throw new ApiError(400, "Client workspace ID is required.");
  }

  const report = await computeCloseReadiness({
    firmId: req.firmId,
    clientId,
    month,
    year,
    financialYear,
  });

  return res.status(200).json(
    new ApiResponse(200, report, "Close readiness evaluation completed.")
  );
});

/**
 * Generate Gap-Aware Chasing Bundles (WhatsApp / Email for client + vendor notices)
 */
export const getChasingBundles = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const month = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
  const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
  const financialYear = req.query.financialYear || "2026-2027";

  if (!clientId) {
    throw new ApiError(400, "Client workspace ID is required.");
  }

  const bundles = await generateGapAwareChasingBundles({
    firmId: req.firmId,
    clientId,
    userId: req.user._id,
    month,
    year,
    financialYear,
    baseUrl: `${req.protocol}://${req.get("host")}`,
  });

  return res.status(200).json(
    new ApiResponse(200, bundles, "Gap-aware chasing bundles generated successfully.")
  );
});


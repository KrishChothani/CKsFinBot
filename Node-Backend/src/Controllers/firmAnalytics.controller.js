/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { getFirmObservabilityMetrics } from "../Services/firmAnalytics.service.js";

// Fetch Observability, LLM Costs and Intake Metrics for Firm Admin
export const getFirmAnalytics = AsyncHandler(async (req, res) => {
  const metrics = await getFirmObservabilityMetrics(req.firmId);

  return res.status(200).json(
    new ApiResponse(
      200,
      metrics,
      "Firm observability and processing metrics fetched."
    )
  );
});


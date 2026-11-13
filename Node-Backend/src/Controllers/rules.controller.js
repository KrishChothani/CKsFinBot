/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { ApiError } from "../Utils/ApiError.js";
import {
  getAllRules,
  verifyRule,
  seedRulesRegistry,
} from "../Services/rules.service.js";

export const getRules = AsyncHandler(async (req, res) => {
  const { status, jurisdiction } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (jurisdiction) filter.jurisdiction = jurisdiction;

  const rules = await getAllRules(filter);
  return res
    .status(200)
    .json(new ApiResponse(200, rules, "Rules retrieved successfully."));
});

export const seedRules = AsyncHandler(async (req, res) => {
  const seeded = await seedRulesRegistry();
  return res
    .status(200)
    .json(new ApiResponse(200, seeded, `Seeded ${seeded.length} rules.`));
});

export const updateRuleVerification = AsyncHandler(async (req, res) => {
  const { ruleId } = req.params;
  const { reviewerName } = req.body;

  if (!reviewerName) {
    throw new ApiError(400, "Reviewer name and credentials required for formal verification.");
  }

  const updatedRule = await verifyRule(ruleId, reviewerName);
  return res
    .status(200)
    .json(new ApiResponse(200, updatedRule, `Rule ${ruleId} verified successfully.`));
});


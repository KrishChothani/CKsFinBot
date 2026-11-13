/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { ComplianceTask } from "../Models/complianceTask.model.js";
import {
  getClientComplianceCalendar,
  recordComplianceFiling,
  seedIndianComplianceCalendar,
} from "../Services/compliance.service.js";

// Get compliance calendar and metrics for client
export const getComplianceCalendar = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const financialYear = req.query.financialYear || "2026-2027";
  const category = req.query.category || "ALL";

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const calendarData = await getClientComplianceCalendar({
    firmId: req.firmId,
    clientId,
    financialYear,
    category,
  });

  return res.status(200).json(
    new ApiResponse(200, calendarData, "Compliance calendar fetched successfully.")
  );
});

// Seed or reset FY compliance deadlines
export const seedCalendar = AsyncHandler(async (req, res) => {
  const clientId = req.body.clientId || req.clientId;
  const financialYear = req.body.financialYear || "2026-2027";

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  await seedIndianComplianceCalendar(req.firmId, clientId, financialYear);

  return res.status(200).json(
    new ApiResponse(200, null, `Compliance calendar initialized for FY ${financialYear}.`)
  );
});

// Mark compliance task as filed
export const fileTask = AsyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const clientId = req.body.clientId || req.clientId;
  const { filedDate, acknowledgementNumber, challanCin, taxPaidAmount, remarks } = req.body;

  if (!taskId) {
    throw new ApiError(400, "Task ID is required.");
  }

  const updatedTask = await recordComplianceFiling({
    firmId: req.firmId,
    clientId,
    taskId,
    filingDetails: {
      filedDate,
      acknowledgementNumber,
      challanCin,
      taxPaidAmount,
      remarks,
    },
    userId: req.user._id,
  });

  return res.status(200).json(
    new ApiResponse(200, updatedTask, "Compliance filing recorded successfully.")
  );
});

// Add custom compliance task
export const createCustomComplianceTask = AsyncHandler(async (req, res) => {
  const { taskName, category, period, statutoryDueDate, financialYear = "2026-2027" } = req.body;
  const clientId = req.body.clientId || req.clientId;

  if (!clientId || !taskName || !category || !statutoryDueDate) {
    throw new ApiError(400, "Missing required fields for custom compliance task.");
  }

  const dueDate = new Date(statutoryDueDate);
  const task = await ComplianceTask.create({
    firm: req.firmId,
    client: clientId,
    financialYear,
    category,
    taskName,
    period: period || "Custom",
    statutoryDueDate: dueDate,
    status: dueDate < new Date() ? "Overdue" : "Pending",
    isSystemGenerated: false,
  });

  return res.status(201).json(
    new ApiResponse(201, task, "Custom compliance task created successfully.")
  );
});


/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import {
  approveVoucherWorkflow,
  rejectVoucherWorkflow,
  listPendingApprovals,
} from "../Services/approval.service.js";

// List vouchers currently in approval queue
export const getApprovalQueue = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId;

  const queue = await listPendingApprovals(req.firmId, clientId);

  return res.status(200).json(
    new ApiResponse(
      200,
      queue,
      `Fetched ${queue.length} voucher(s) awaiting approval.`
    )
  );
});

// Senior CA / Partner approves voucher
export const approveVoucher = AsyncHandler(async (req, res) => {
  const { voucherId } = req.params;
  const { remarks } = req.body;

  if (!voucherId) {
    throw new ApiError(400, "Voucher ID is required.");
  }

  const approved = await approveVoucherWorkflow({
    firmId: req.firmId,
    voucherId,
    userId: req.user._id,
    userRole: req.user.role || "CA",
    remarks,
  });

  return res.status(200).json(
    new ApiResponse(200, approved, "Voucher approval recorded successfully.")
  );
});

// Reviewer rejects voucher with comments
export const rejectVoucher = AsyncHandler(async (req, res) => {
  const { voucherId } = req.params;
  const { remarks } = req.body;

  if (!voucherId) {
    throw new ApiError(400, "Voucher ID is required.");
  }

  const rejected = await rejectVoucherWorkflow({
    firmId: req.firmId,
    voucherId,
    userId: req.user._id,
    userRole: req.user.role || "CA",
    remarks,
  });

  return res.status(200).json(
    new ApiResponse(200, rejected, "Voucher returned with feedback.")
  );
});


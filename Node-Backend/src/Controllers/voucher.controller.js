/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { Voucher } from "../Models/voucher.model.js";
import { LedgerAccount } from "../Models/ledgerAccount.model.js";
import { AuditLog } from "../Models/auditLog.model.js";

// List vouchers with filters
export const listVouchers = AsyncHandler(async (req, res) => {
  const { voucherType, startDate, endDate, page = 1, limit = 25 } = req.query;

  let query = { firm: req.firmId };
  if (req.clientId) {
    query.client = req.clientId;
  }

  if (voucherType) {
    query.voucherType = voucherType;
  }

  if (startDate || endDate) {
    query.voucherDate = {};
    if (startDate) query.voucherDate.$gte = new Date(startDate);
    if (endDate) query.voucherDate.$lte = new Date(endDate);
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [vouchers, totalCount] = await Promise.all([
    Voucher.find(query)
      .populate("sourceDocument", "fileName documentType s3Url")
      .populate("postedBy", "fullName email")
      .populate("client", "businessName gstin")
      .sort({ voucherDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    Voucher.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        vouchers,
        pagination: {
          total: totalCount,
          page: parseInt(page, 10),
          pages: Math.ceil(totalCount / parseInt(limit, 10)),
        },
      },
      "Vouchers retrieved successfully."
    )
  );
});

// Get single voucher detail
export const getVoucherById = AsyncHandler(async (req, res) => {
  const { voucherId } = req.params;

  const voucher = await Voucher.findOne({ _id: voucherId, firm: req.firmId })
    .populate("sourceDocument")
    .populate("entries.ledgerAccount")
    .populate("postedBy", "fullName email")
    .populate("client");

  if (!voucher) {
    throw new ApiError(404, "Voucher not found.");
  }

  return res.status(200).json(
    new ApiResponse(200, voucher, "Voucher details retrieved.")
  );
});

// Void an existing voucher
export const voidVoucher = AsyncHandler(async (req, res) => {
  const { voucherId } = req.params;
  const { reason } = req.body;

  const voucher = await Voucher.findOne({ _id: voucherId, firm: req.firmId });
  if (!voucher) {
    throw new ApiError(404, "Voucher not found.");
  }

  if (voucher.status === "Void") {
    throw new ApiError(400, "Voucher is already voided.");
  }

  voucher.status = "Void";
  await voucher.save();

  // Reverse credit from vendor if it was a purchase voucher
  if (voucher.voucherType === "Purchase") {
    const creditorEntry = voucher.entries.find((e) => e.creditAmount > 0);
    if (creditorEntry) {
      await LedgerAccount.findByIdAndUpdate(creditorEntry.ledgerAccount, {
        $inc: { currentBalance: -voucher.totalAmount },
      });
    }
  }

  await AuditLog.create({
    firm: req.firmId,
    client: voucher.client,
    user: req.user._id,
    action: "VOUCHER_VOIDED",
    entityType: "Voucher",
    entityId: voucher._id,
    diff: { reason },
    ipAddress: req.ip,
  });

  return res.status(200).json(
    new ApiResponse(200, voucher, "Voucher voided successfully.")
  );
});


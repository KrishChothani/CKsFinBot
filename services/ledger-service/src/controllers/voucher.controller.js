/** @format */

import {
  createPurchaseVoucher,
  listVouchers,
} from "../services/ledger.service.js";
import { ledgerRelay } from "../services/ledgerRelay.service.js";

export const getVouchers = async (req, res) => {
  const firmId = req.firmId || req.headers["x-firm-id"];
  const clientId = req.clientId || req.headers["x-client-id"];

  const vouchers = await listVouchers(firmId, clientId);

  return res.status(200).json({
    success: true,
    statusCode: 200,
    data: vouchers,
    message: `Fetched ${vouchers.length} vouchers successfully.`,
  });
};

export const postVoucher = async (req, res) => {
  const firmId = req.firmId || req.headers["x-firm-id"];
  const clientId = req.clientId || req.headers["x-client-id"];
  const userId = req.user?._id || req.user?.id || "ca-maker-01";

  try {
    const voucher = await createPurchaseVoucher({
      firmId,
      clientId,
      ...req.body,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      data: voucher,
      message: "Voucher created and balanced successfully.",
    });
  } catch (err) {
    return res.status(422).json({
      success: false,
      statusCode: 422,
      message: err.message,
    });
  }
};

export const approveVoucher = async (req, res) => {
  const { voucherId } = req.params;
  const firmId = req.firmId || req.headers["x-firm-id"];
  const userId = req.user?._id || req.user?.id || req.body.userId || "senior-ca-01";
  const userRole = req.user?.role || req.body.userRole || "Senior_CA";
  const remarks = req.body.remarks || "Approved";

  try {
    const result = await ledgerRelay.approveAndCommitVoucher({
      firmId,
      voucherId,
      userId,
      userRole,
      remarks,
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: result.voucher,
      message: "Voucher approved and committed to General Ledger.",
    });
  } catch (err) {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: err.message,
    });
  }
};


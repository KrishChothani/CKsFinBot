/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { MarketplaceSettlement } from "../Models/marketplaceSettlement.model.js";
import { BankTransaction } from "../Models/bankTransaction.model.js";
import {
  parseMarketplaceReport,
  parseSettlementCsvRows,
  generateSettlementVoucher,
  reconcileSettlementWithBank,
} from "../Services/marketplaceSettlement.service.js";

/**
 * Ingest Marketplace Settlement (Amazon MTR or Flipkart CSV / JSON)
 */
export const importMarketplaceSettlement = AsyncHandler(async (req, res) => {
  const clientId = req.body.clientId || req.clientId;
  const marketplace = (req.body.marketplace || "AMAZON").toUpperCase();
  const settlementIdInput = req.body.settlementId || "";

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  let rawData = [];

  // If file was uploaded via multipart/form-data
  if (req.file) {
    const fileContent = req.file.buffer.toString("utf-8");
    rawData = parseSettlementCsvRows(fileContent);
  } else if (req.body.csvContent) {
    rawData = parseSettlementCsvRows(req.body.csvContent);
  } else if (Array.isArray(req.body.items)) {
    rawData = req.body.items;
  } else {
    throw new ApiError(
      400,
      "No settlement data provided. Upload a CSV file or provide csvContent / items array."
    );
  }

  const parsed = parseMarketplaceReport({
    marketplace,
    rawData,
    settlementId: settlementIdInput || req.file?.originalname?.replace(/\.[^/.]+$/, "") || "",
  });

  const settlementId = parsed.settlementId;

  // Check if settlement already exists
  let settlement = await MarketplaceSettlement.findOne({
    firm: req.firmId,
    client: clientId,
    marketplace,
    settlementId,
  });

  if (!settlement) {
    settlement = new MarketplaceSettlement({
      firm: req.firmId,
      client: clientId,
      marketplace,
      settlementId,
      settlementPeriod: {
        startDate: parsed.rawBreakdown[0]?.date || new Date(),
        endDate: parsed.rawBreakdown[parsed.rawBreakdown.length - 1]?.date || new Date(),
        depositDate: new Date(),
      },
      summary: parsed.summary,
      orderCount: parsed.orderCount,
      refundCount: parsed.refundCount,
      rawBreakdown: parsed.rawBreakdown,
      sourceFile: {
        originalName: req.file?.originalname || "settlement_upload.csv",
        fileHash: "",
      },
      status: "PROCESSED",
    });
  } else {
    settlement.summary = parsed.summary;
    settlement.orderCount = parsed.orderCount;
    settlement.refundCount = parsed.refundCount;
    settlement.rawBreakdown = parsed.rawBreakdown;
  }

  await settlement.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      settlement,
      `${marketplace} settlement processed successfully with ${parsed.orderCount} orders.`
    )
  );
});

/**
 * List marketplace settlements for client
 */
export const listMarketplaceSettlements = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const marketplace = req.query.marketplace;
  const status = req.query.status;

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const query = { firm: req.firmId, client: clientId };
  if (marketplace) query.marketplace = marketplace.toUpperCase();
  if (status) query.status = status;

  const settlements = await MarketplaceSettlement.find(query)
    .sort({ createdAt: -1 })
    .populate("voucher", "voucherNumber totalAmount status")
    .populate("reconciliation.matchedBankTransaction", "transactionDate amount description");

  return res.status(200).json(
    new ApiResponse(200, settlements, "Marketplace settlements retrieved.")
  );
});

/**
 * Post balanced double-entry settlement journal voucher
 */
export const postVoucherForSettlement = AsyncHandler(async (req, res) => {
  const { settlementId } = req.params;
  const clientId = req.body.clientId || req.clientId;

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const result = await generateSettlementVoucher({
    firmId: req.firmId,
    clientId,
    settlementId,
    userId: req.user?._id,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      `Double-entry voucher ${result.voucher.voucherNumber} created and posted successfully.`
    )
  );
});

/**
 * Reconcile settlement net disbursement with bank statement transaction
 */
export const reconcileSettlement = AsyncHandler(async (req, res) => {
  const { settlementId } = req.params;
  const { bankTransactionId } = req.body;
  const clientId = req.body.clientId || req.clientId;

  if (!bankTransactionId) {
    throw new ApiError(400, "Bank Transaction ID is required for reconciliation.");
  }

  const result = await reconcileSettlementWithBank({
    firmId: req.firmId,
    clientId,
    settlementId,
    bankTransactionId,
    userId: req.user?._id,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      `Settlement reconciled with bank. Status: ${result.status} (Variance: ₹${(
        result.variancePaise / 100
      ).toFixed(2)}).`
    )
  );
});

/**
 * Search potential matching bank transactions for a settlement disbursement
 */
export const getCandidateBankCredits = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const amountPaise = parseInt(req.query.amountPaise, 10);

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const query = {
    firm: req.firmId,
    client: clientId,
    transactionType: { $in: ["CREDIT", "DEPOSIT"] },
  };

  const candidateTxs = await BankTransaction.find(query).sort({ transactionDate: -1 }).limit(30);

  return res.status(200).json(
    new ApiResponse(200, candidateTxs, "Candidate bank transactions retrieved.")
  );
});


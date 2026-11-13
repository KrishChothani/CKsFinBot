/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { BankTransaction } from "../Models/bankTransaction.model.js";
import {
  runAutoBankReconciliation,
  confirmBankMatch,
  unreconcileBankTransaction,
  getBankReconciliationStatement,
} from "../Services/bankRecon.service.js";

// List bank transactions for client with filters
export const listBankTransactions = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const status = req.query.status; // 'Unreconciled', 'Suggested', 'Reconciled'
  const search = req.query.search;

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const query = { client: clientId };
  if (status && status !== "ALL") {
    query.reconciliationStatus = status;
  }
  if (search) {
    query.$or = [
      { narration: { $regex: search, $options: "i" } },
      { referenceNumber: { $regex: search, $options: "i" } },
    ];
  }

  const transactions = await BankTransaction.find(query)
    .populate("matchedVoucher")
    .sort({ date: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      transactions,
      `Fetched ${transactions.length} bank transaction(s).`
    )
  );
});

// Trigger auto bank reconciliation matching algorithm
export const triggerAutoReconciliation = AsyncHandler(async (req, res) => {
  const clientId = req.body.clientId || req.clientId;
  const toleranceDays = Number(req.body.toleranceDays || 5);

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const result = await runAutoBankReconciliation(
    req.firmId,
    clientId,
    toleranceDays
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      `Auto-reconciliation complete: ${result.matchedCount} high-confidence matched, ${result.suggestedCount} suggested.`
    )
  );
});

// Confirm or manually link a bank transaction to a voucher
export const confirmTransactionMatch = AsyncHandler(async (req, res) => {
  const { transactionId, voucherId } = req.body;
  const clientId = req.body.clientId || req.clientId;

  if (!transactionId || !voucherId) {
    throw new ApiError(400, "Both transactionId and voucherId are required.");
  }

  const updatedTx = await confirmBankMatch({
    firmId: req.firmId,
    clientId,
    transactionId,
    voucherId,
    userId: req.user._id,
  });

  return res.status(200).json(
    new ApiResponse(200, updatedTx, "Bank transaction successfully reconciled.")
  );
});

// Unreconcile a transaction
export const unreconcileTransaction = AsyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const clientId = req.query.clientId || req.clientId;

  if (!transactionId) {
    throw new ApiError(400, "Transaction ID is required.");
  }

  const updatedTx = await unreconcileBankTransaction({
    firmId: req.firmId,
    clientId,
    transactionId,
    userId: req.user._id,
  });

  return res.status(200).json(
    new ApiResponse(200, updatedTx, "Bank transaction unreconciled.")
  );
});

// Get Bank Reconciliation Statement (BRS) metrics
export const getBrsSummary = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const brs = await getBankReconciliationStatement(req.firmId, clientId);

  return res.status(200).json(
    new ApiResponse(200, brs, "Bank reconciliation statement fetched successfully.")
  );
});


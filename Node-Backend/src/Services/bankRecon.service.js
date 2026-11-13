/** @format */

import { BankTransaction } from "../Models/bankTransaction.model.js";
import { Voucher } from "../Models/voucher.model.js";
import { AuditLog } from "../Models/auditLog.model.js";
import { LedgerAccount } from "../Models/ledgerAccount.model.js";

/**
 * Ingest transactions from extracted bank statement into BankTransaction collection
 */
export const ingestTransactionsFromStatement = async ({
  firmId,
  clientId,
  documentId,
  bankSummary = {},
  transactions = [],
}) => {
  if (!transactions || transactions.length === 0) return [];

  const createdTransactions = [];
  const bankName = bankSummary.bankName || "Primary Bank Account";
  const accountNumber = bankSummary.accountNumber || "";

  for (const tx of transactions) {
    if (!tx.date || (!tx.debit && !tx.credit)) continue;

    const amount = Number(tx.debit > 0 ? tx.debit : tx.credit);
    const txType = tx.debit > 0 ? "Debit" : "Credit";

    // Deduplication check
    const existing = await BankTransaction.findOne({
      client: clientId,
      date: new Date(tx.date),
      transactionType: txType,
      amount,
      narration: tx.narration,
    });

    if (existing) continue;

    const newTx = await BankTransaction.create({
      firm: firmId,
      client: clientId,
      sourceDocument: documentId,
      bankName,
      accountNumber,
      date: new Date(tx.date),
      narration: tx.narration || "Bank Transaction",
      referenceNumber: tx.referenceNumber || "",
      transactionType: txType,
      amount,
      balance: Number(tx.balance || 0),
      reconciliationStatus: "Unreconciled",
    });

    createdTransactions.push(newTx);
  }

  return createdTransactions;
};

/**
 * Run deterministic bank reconciliation matching algorithm
 */
export const runAutoBankReconciliation = async (
  firmId,
  clientId,
  dateToleranceDays = 5
) => {
  const unreconciledTxList = await BankTransaction.find({
    client: clientId,
    reconciliationStatus: { $in: ["Unreconciled", "Suggested"] },
  }).sort({ date: 1 });

  const vouchers = await Voucher.find({
    client: clientId,
    status: "Posted",
  }).sort({ voucherDate: 1 });

  let matchedCount = 0;
  let suggestedCount = 0;

  const msInDay = 24 * 60 * 60 * 1000;
  const toleranceMs = dateToleranceDays * msInDay;

  for (const tx of unreconciledTxList) {
    const txTime = new Date(tx.date).getTime();
    let bestVoucher = null;
    let highestScore = 0;
    let matchReason = "";

    for (const v of vouchers) {
      const vTime = new Date(v.voucherDate).getTime();
      const timeDiff = Math.abs(txTime - vTime);

      // Must be within date window
      if (timeDiff > toleranceMs) continue;

      // Must match voucher direction
      // Bank Debit = Money going out -> Voucher should be Payment, Purchase, Contra
      // Bank Credit = Money coming in -> Voucher should be Receipt, Sales, Contra
      const isDebitMatch =
        tx.transactionType === "Debit" &&
        ["Payment", "Purchase", "Contra"].includes(v.voucherType);
      const isCreditMatch =
        tx.transactionType === "Credit" &&
        ["Receipt", "Sales", "Contra"].includes(v.voucherType);

      if (!isDebitMatch && !isCreditMatch) continue;

      // Amount check (strict tolerance <= ₹1.00)
      const amountDiff = Math.abs(v.totalAmount - tx.amount);
      if (amountDiff > 1.0) continue;

      // Calculate confidence score
      let score = 0.7; // Base score for amount + date proximity

      // Proximity score
      if (timeDiff === 0) {
        score += 0.15;
      } else if (timeDiff <= 2 * msInDay) {
        score += 0.1;
      } else {
        score += 0.05;
      }

      // Narration / Reference Number matching bonus
      const txNarr = (tx.narration || "").toLowerCase();
      const vNarr = (v.narration || "").toLowerCase();
      const vNum = (v.voucherNumber || "").toLowerCase();

      if (tx.referenceNumber && vNarr.includes(tx.referenceNumber.toLowerCase())) {
        score += 0.15;
      } else if (vNum && txNarr.includes(vNum)) {
        score += 0.1;
      }

      if (score > highestScore) {
        highestScore = score;
        bestVoucher = v;
        matchReason = `Matched ${v.voucherType} #${v.voucherNumber} on ${v.voucherDate.toISOString().slice(0, 10)} (Diff: ₹${amountDiff.toFixed(2)})`;
      }
    }

    if (bestVoucher) {
      if (highestScore >= 0.9) {
        tx.reconciliationStatus = "Reconciled";
        tx.matchedVoucher = bestVoucher._id;
        tx.confidenceScore = highestScore;
        tx.matchNotes = matchReason;
        tx.reconciledAt = new Date();
        await tx.save();
        matchedCount++;
      } else if (highestScore >= 0.75) {
        tx.reconciliationStatus = "Suggested";
        tx.matchedVoucher = bestVoucher._id;
        tx.confidenceScore = highestScore;
        tx.matchNotes = matchReason;
        await tx.save();
        suggestedCount++;
      }
    }
  }

  return {
    matchedCount,
    suggestedCount,
    totalEvaluated: unreconciledTxList.length,
  };
};

/**
 * Confirm a match manually or accept suggestion
 */
export const confirmBankMatch = async ({
  firmId,
  clientId,
  transactionId,
  voucherId,
  userId,
}) => {
  const tx = await BankTransaction.findOne({
    _id: transactionId,
    client: clientId,
  });
  if (!tx) throw new Error("Bank transaction not found.");

  const voucher = await Voucher.findOne({
    _id: voucherId,
    client: clientId,
  });
  if (!voucher) throw new Error("Voucher not found.");

  tx.reconciliationStatus = "Reconciled";
  tx.matchedVoucher = voucher._id;
  tx.confidenceScore = 1.0;
  tx.matchNotes = `Manually confirmed against ${voucher.voucherType} #${voucher.voucherNumber}`;
  tx.reconciledAt = new Date();
  tx.reconciledBy = userId;
  await tx.save();

  await AuditLog.create({
    firm: firmId,
    client: clientId,
    performedBy: userId,
    action: "VOUCHER_POST",
    entityType: "Voucher",
    entityId: voucher._id,
    metadata: {
      details: `Bank transaction ${tx.narration} (₹${tx.amount}) reconciled with voucher #${voucher.voucherNumber}`,
    },
  });

  return tx;
};

/**
 * Unreconcile transaction
 */
export const unreconcileBankTransaction = async ({
  firmId,
  clientId,
  transactionId,
  userId,
}) => {
  const tx = await BankTransaction.findOne({
    _id: transactionId,
    client: clientId,
  });
  if (!tx) throw new Error("Bank transaction not found.");

  const prevVoucher = tx.matchedVoucher;
  tx.reconciliationStatus = "Unreconciled";
  tx.matchedVoucher = null;
  tx.confidenceScore = 0;
  tx.matchNotes = "Manually unlinked";
  tx.reconciledAt = null;
  tx.reconciledBy = null;
  await tx.save();

  await AuditLog.create({
    firm: firmId,
    client: clientId,
    performedBy: userId,
    action: "REVIEW_REJECT",
    entityType: "Voucher",
    entityId: prevVoucher || tx._id,
    metadata: {
      details: `Bank transaction ${tx.narration} unreconciled`,
    },
  });

  return tx;
};

/**
 * Get Bank Reconciliation Statement (BRS) Summary
 */
export const getBankReconciliationStatement = async (firmId, clientId) => {
  const transactions = await BankTransaction.find({ client: clientId });

  let totalDebits = 0;
  let totalCredits = 0;
  let reconciledDebits = 0;
  let reconciledCredits = 0;
  let unreconciledDebits = 0;
  let unreconciledCredits = 0;

  for (const t of transactions) {
    if (t.transactionType === "Debit") {
      totalDebits += t.amount;
      if (t.reconciliationStatus === "Reconciled") reconciledDebits += t.amount;
      else unreconciledDebits += t.amount;
    } else {
      totalCredits += t.amount;
      if (t.reconciliationStatus === "Reconciled") reconciledCredits += t.amount;
      else unreconciledCredits += t.amount;
    }
  }

  // Find latest transaction balance as statement closing balance
  const latestTx = await BankTransaction.findOne({ client: clientId }).sort({
    date: -1,
  });
  const statementBalance = latestTx?.balance || totalCredits - totalDebits;

  // Compute Book Balance from Vouchers posted to Bank ledgers
  const bankAccounts = await LedgerAccount.find({
    client: clientId,
    accountGroup: "Bank Accounts",
  });
  const bankAccIds = bankAccounts.map((a) => a._id.toString());

  const vouchers = await Voucher.find({
    client: clientId,
    status: "Posted",
  });

  let bookDebit = 0;
  let bookCredit = 0;

  for (const v of vouchers) {
    for (const e of v.entries || []) {
      if (bankAccIds.includes(e.ledgerAccount.toString())) {
        bookDebit += e.debitAmount || 0;
        bookCredit += e.creditAmount || 0;
      }
    }
  }

  const bookBalance = bookDebit - bookCredit;
  const unreconciledDifference = statementBalance - bookBalance;

  return {
    statementBalance: Number(statementBalance.toFixed(2)),
    bookBalance: Number(bookBalance.toFixed(2)),
    unreconciledDifference: Number(unreconciledDifference.toFixed(2)),
    reconciliationMetrics: {
      totalTransactions: transactions.length,
      reconciledCount: transactions.filter((t) => t.reconciliationStatus === "Reconciled").length,
      suggestedCount: transactions.filter((t) => t.reconciliationStatus === "Suggested").length,
      unreconciledCount: transactions.filter((t) => t.reconciliationStatus === "Unreconciled").length,
      unreconciledDebits: Number(unreconciledDebits.toFixed(2)),
      unreconciledCredits: Number(unreconciledCredits.toFixed(2)),
    },
  };
};


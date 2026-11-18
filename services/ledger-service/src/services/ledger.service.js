/** @format */

import crypto from "crypto";
import { pool, withTransaction } from "../config/db.js";
import { toPaise } from "../utils/money.js";
import { createLogger } from "@cksfinbot/shared-logger";

const logger = createLogger("ledger-service:core");

// In-Memory Fallback store for environments without live Postgres
const memoryVouchers = new Map();
const memoryVoucherLines = new Map();

/**
 * Validates double-entry mathematical balance.
 * Total debits must equal total credits in integer paise.
 */
export function assertDoubleEntryBalance(lines) {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const line of lines) {
    if (line.entryType === "DEBIT") {
      totalDebits += Number(line.amountPaise);
    } else if (line.entryType === "CREDIT") {
      totalCredits += Number(line.amountPaise);
    } else {
      throw new Error(`Invalid entryType '${line.entryType}'. Must be DEBIT or CREDIT.`);
    }
  }

  if (totalDebits !== totalCredits) {
    throw new Error(
      `Double-Entry Invariant Violated: Total Debits (${totalDebits} paise) != Total Credits (${totalCredits} paise). Delta: ${totalDebits - totalCredits} paise.`
    );
  }

  return { isBalanced: true, totalPaise: totalDebits };
}

/**
 * Creates and stages a balanced double-entry purchase voucher.
 */
export async function createPurchaseVoucher({
  firmId,
  clientId,
  sourceDocumentId,
  voucherNumber,
  voucherDate = new Date(),
  counterPartyName = "Sundry Creditor",
  summary = {},
  lineItems = [],
  createdBy = "system",
  isPosted = false,
}) {
  const subTotalPaise = summary.subTotalPaise || toPaise(summary.subTotal || 0);
  const cgstPaise = summary.totalCgstPaise || toPaise(summary.totalCgst || 0);
  const sgstPaise = summary.totalSgstPaise || toPaise(summary.totalSgst || 0);
  const igstPaise = summary.totalIgstPaise || toPaise(summary.totalIgst || 0);
  const roundOffPaise = summary.roundOffPaise || toPaise(summary.roundOff || 0);
  const grandTotalPaise = summary.grandTotalPaise || toPaise(summary.grandTotal || 0);

  // Math Invariant Check
  const calculatedGrandTotal = subTotalPaise + cgstPaise + sgstPaise + igstPaise + roundOffPaise;
  if (calculatedGrandTotal !== grandTotalPaise) {
    throw new Error(
      `Arithmetic mismatch: SubTotal (${subTotalPaise}) + Taxes (${cgstPaise + sgstPaise + igstPaise}) + RoundOff (${roundOffPaise}) = ${calculatedGrandTotal} paise, but GrandTotal is ${grandTotalPaise} paise.`
    );
  }

  // Construct Double-Entry Lines
  const lines = [];
  let order = 1;

  if (subTotalPaise > 0) {
    lines.push({
      accountId: "purchase-ledger-01",
      accountName: "General Purchase Account",
      entryType: "DEBIT",
      amountPaise: subTotalPaise,
      lineOrder: order++,
    });
  }
  if (cgstPaise > 0) {
    lines.push({
      accountId: "input-cgst-01",
      accountName: "Input CGST",
      entryType: "DEBIT",
      amountPaise: cgstPaise,
      lineOrder: order++,
    });
  }
  if (sgstPaise > 0) {
    lines.push({
      accountId: "input-sgst-01",
      accountName: "Input SGST",
      entryType: "DEBIT",
      amountPaise: sgstPaise,
      lineOrder: order++,
    });
  }
  if (igstPaise > 0) {
    lines.push({
      accountId: "input-igst-01",
      accountName: "Input IGST",
      entryType: "DEBIT",
      amountPaise: igstPaise,
      lineOrder: order++,
    });
  }
  if (roundOffPaise !== 0) {
    lines.push({
      accountId: "round-off-01",
      accountName: "Round Off Account",
      entryType: roundOffPaise > 0 ? "DEBIT" : "CREDIT",
      amountPaise: Math.abs(roundOffPaise),
      lineOrder: order++,
    });
  }

  // Credit: Counterparty (Sundry Creditor)
  lines.push({
    accountId: "creditor-ledger-01",
    accountName: counterPartyName,
    entryType: "CREDIT",
    amountPaise: grandTotalPaise,
    lineOrder: order++,
  });

  // Verify Double-Entry Balance
  assertDoubleEntryBalance(lines);

  const voucherId = crypto.randomUUID();
  const vNumber = voucherNumber || `PUR-${Date.now().toString().slice(-4)}`;

  const voucherRecord = {
    id: voucherId,
    firmId,
    clientId,
    voucherNumber: vNumber,
    voucherType: "Purchase",
    voucherDate: new Date(voucherDate).toISOString(),
    sourceDocumentId,
    totalAmountPaise: grandTotalPaise,
    narration: `Purchase from ${counterPartyName} (Inv: ${summary.invoiceNumber || "N/A"})`,
    isPosted,
    postedAt: isPosted ? new Date().toISOString() : null,
    postedBy: isPosted ? createdBy : null,
    createdBy,
    lines,
    createdAt: new Date().toISOString(),
  };

  // 1. Try PostgreSQL ACID Transaction with Deferred Balance Trigger
  let pgSuccess = false;
  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO vouchers (id, firm_id, client_id, voucher_number, voucher_type, voucher_date, source_document_id, total_amount_paise, narration, is_posted, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          voucherId,
          firmId,
          clientId,
          vNumber,
          "Purchase",
          voucherDate,
          sourceDocumentId,
          grandTotalPaise,
          voucherRecord.narration,
          isPosted,
          createdBy,
        ]
      );

      for (const line of lines) {
        await client.query(
          `INSERT INTO voucher_lines (id, voucher_id, account_id, account_name, entry_type, amount_paise, line_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            crypto.randomUUID(),
            voucherId,
            line.accountId,
            line.accountName,
            line.entryType,
            line.amountPaise,
            line.lineOrder,
          ]
        );
      }
    });
    pgSuccess = true;
    logger.info(`Persisted voucher ${vNumber} (${voucherId}) to PostgreSQL.`);
  } catch (pgErr) {
    logger.warn(`PostgreSQL storage bypassed (${pgErr.message}). Storing in local memory ledger.`);
  }

  // 2. Persist in memory store
  memoryVouchers.set(voucherId, voucherRecord);
  memoryVoucherLines.set(voucherId, lines);

  return voucherRecord;
}

/**
 * Maker-Checker Dual Control Approval
 */
export async function approveVoucherWorkflow({
  firmId,
  voucherId,
  userId,
  userRole = "Senior_CA",
  remarks = "Approved for financial ledger posting",
}) {
  const voucher = memoryVouchers.get(voucherId);
  if (!voucher) {
    throw new Error(`Voucher with id '${voucherId}' not found.`);
  }

  // CRITICAL FINANCIAL INVARIANT: A maker cannot approve their own voucher
  if (voucher.createdBy && voucher.createdBy.toString() === userId.toString()) {
    throw new Error("Maker-Checker dual control violation: Author cannot approve their own voucher.");
  }

  voucher.isPosted = true;
  voucher.postedAt = new Date().toISOString();
  voucher.postedBy = userId;
  voucher.approvalRemarks = remarks;
  voucher.approvedByRole = userRole;

  // Sync to PostgreSQL if connected
  try {
    await pool.query(
      `UPDATE vouchers SET is_posted = true, posted_at = NOW(), posted_by = $1 WHERE id = $2`,
      [userId, voucherId]
    );
  } catch (_) {}

  logger.info(`Voucher ${voucher.voucherNumber} approved by ${userId} (${userRole})`);
  return voucher;
}

/**
 * Reject a voucher workflow
 */
export async function rejectVoucherWorkflow({
  firmId,
  voucherId,
  userId,
  remarks = "Rejected by reviewer",
}) {
  const voucher = memoryVouchers.get(voucherId);
  if (!voucher) {
    throw new Error(`Voucher with id '${voucherId}' not found.`);
  }

  voucher.isPosted = false;
  voucher.status = "Rejected";
  voucher.rejectedBy = userId;
  voucher.rejectionRemarks = remarks;

  return voucher;
}

/**
 * List vouchers for a client
 */
export async function listVouchers(firmId, clientId) {
  const results = [];
  for (const v of memoryVouchers.values()) {
    if (v.firmId === firmId && (!clientId || v.clientId === clientId)) {
      results.push(v);
    }
  }
  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}


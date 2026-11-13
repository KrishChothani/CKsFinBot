/** @format */

import crypto from "crypto";
import { Document } from "../Models/document.model.js";
import { Voucher } from "../Models/voucher.model.js";
import { toPaise } from "../Utils/money.js";

/**
 * Computes SHA-256 cryptographic hash of a file buffer.
 */
export function calculateFileHash(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new TypeError("calculateFileHash expects a Buffer.");
  }
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Normalizes an invoice number according to Indian commercial formatting variations:
 * - Upper cases everything
 * - Strips all non-alphanumeric delimiters (/ - _ . space)
 * - Strips leading zeroes in numeric tokens (e.g. '0042' -> '42')
 * e.g. "INV/2026-27/0042" -> "INV20262742"
 * e.g. "BFM/26/0412" -> "BFM26412"
 */
export function normalizeInvoiceNumber(invNo) {
  if (!invNo || typeof invNo !== "string") return "";

  const trimmed = invNo.trim().toUpperCase();
  // Split on delimiters
  const segments = trimmed.split(/[/\\_\-.\s]+/);

  const normalizedSegments = segments.map((seg) => {
    // If segment is pure digits with leading zeroes, strip them (keep at least one '0')
    if (/^\d+$/.test(seg)) {
      return seg.replace(/^0+(?=\d)/, "");
    }
    return seg;
  });

  return normalizedSegments.join("");
}

/**
 * Checks Level 1 Duplicate: Exact same physical file uploaded for this client.
 */
export async function checkFileHashDuplicate(clientId, fileHash) {
  if (!fileHash) return { isDuplicate: false };

  const existingDoc = await Document.findOne({
    client: clientId,
    fileHash,
  });

  if (existingDoc) {
    return {
      isDuplicate: true,
      duplicateType: "FILE_HASH",
      existingDocumentId: existingDoc._id,
      fileName: existingDoc.fileName,
      status: existingDoc.status,
    };
  }

  return { isDuplicate: false };
}

/**
 * Checks Level 2 Semantic Duplicate: Same supplier GSTIN + normalized invoice number + date + total paise.
 */
export async function checkSemanticDuplicate(
  clientId,
  { supplierGstin, invoiceNumber, invoiceDate, grandTotalPaise }
) {
  const normGstin = (supplierGstin || "").trim().toUpperCase();
  const normInvNo = normalizeInvoiceNumber(invoiceNumber);
  const paise = Number(grandTotalPaise) || 0;

  if (!normGstin || !normInvNo) {
    return { isDuplicate: false };
  }

  // Check if a voucher has already been created for this exact supplier & invoice
  const existingVouchers = await Voucher.find({
    client: clientId,
    status: { $ne: "Void" },
  }).populate("sourceDocument");

  for (const v of existingVouchers) {
    // If voucher number or narration matches
    const vNoNorm = normalizeInvoiceNumber(v.voucherNumber);
    if (vNoNorm === normInvNo && Math.abs(v.totalAmountPaise - paise) <= 100) {
      return {
        isDuplicate: true,
        duplicateType: "VOUCHER_EXISTS",
        existingVoucherId: v._id,
        voucherNumber: v.voucherNumber,
        reason: `Voucher #${v.voucherNumber} already exists for this client with amount ${v.totalAmountPaise} paise.`,
      };
    }
  }

  return { isDuplicate: false };
}

export default {
  calculateFileHash,
  normalizeInvoiceNumber,
  checkFileHashDuplicate,
  checkSemanticDuplicate,
};


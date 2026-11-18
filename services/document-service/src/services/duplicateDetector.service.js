/** @format */

import crypto from "crypto";
import { Document } from "../models/document.model.js";

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
  const segments = trimmed.split(/[/\\_\-.\s]+/);

  const normalizedSegments = segments.map((seg) => {
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

export default {
  calculateFileHash,
  normalizeInvoiceNumber,
  checkFileHashDuplicate,
};


/** @format */

/**
 * Normalizes commercial invoice numbers according to Indian tax standards:
 * - Uppercase
 * - Strips non-alphanumeric delimiters (/ - _ . space)
 * - Strips leading zeroes in numeric tokens
 * e.g. "INV/2026-27/0042" -> "INV20262742"
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

const SECTION_17_5_KEYWORDS = [
  "MOTOR VEHICLE",
  "CAR",
  "AUTOMOBILE",
  "FOOD",
  "BEVERAGE",
  "CATERING",
  "RESTAURANT",
  "HEALTH INSURANCE",
  "LIFE INSURANCE",
  "CLUB MEMBERSHIP",
  "FITNESS",
  "BEAUTY",
  "OUTDOOR CATERING",
  "PERSONAL CONSUMPTION",
  "GIFT",
  "FREE SAMPLE",
];

export function isSection17_5Candidate(text) {
  if (!text) return false;
  const upper = String(text).toUpperCase();
  return SECTION_17_5_KEYWORDS.some((kw) => upper.includes(kw));
}

/**
 * 2-Tier Pure Deterministic Reconciliation Engine
 * Guarantees conservation of records.
 */
export function reconcileInvoiceSets(gstr2bRecords = [], booksRecords = []) {
  const matchedExact = [];
  const matchedTolerance = [];
  const onlyIn2B = [];
  const onlyInBooks = [];

  const booksUsed = new Set();
  const gstr2bUsed = new Set();

  // Tier 1: Exact Match (Normalized GSTIN + Canonical Invoice No + Exact Integer Paise)
  for (let i = 0; i < gstr2bRecords.length; i++) {
    const r2b = gstr2bRecords[i];
    const norm2bGstin = (r2b.supplierGstin || "").trim().toUpperCase();
    const norm2bInv = normalizeInvoiceNumber(r2b.invoiceNumber);
    const amt2b = Number(r2b.totalInvoiceValuePaise || 0);

    for (let j = 0; j < booksRecords.length; j++) {
      if (booksUsed.has(j)) continue;
      const b = booksRecords[j];
      const normBookGstin = (b.supplierGstin || "").trim().toUpperCase();
      const normBookInv = normalizeInvoiceNumber(b.invoiceNumber || b.voucherNumber);
      const amtBook = Number(b.totalAmountPaise || 0);

      const isGstinMatch = norm2bGstin && normBookGstin && norm2bGstin === normBookGstin;
      const isInvMatch = norm2bInv && normBookInv && norm2bInv === normBookInv;

      if (isGstinMatch && isInvMatch && amt2b === amtBook) {
        matchedExact.push({
          gstr2b: r2b,
          books: b,
          status: "Exact_Match",
          deltaPaise: 0,
        });
        gstr2bUsed.add(i);
        booksUsed.add(j);
        break;
      }
    }
  }

  // Tier 2: Assisted Tolerance Match (<= 100 paise / ₹1 rounding variance)
  for (let i = 0; i < gstr2bRecords.length; i++) {
    if (gstr2bUsed.has(i)) continue;
    const r2b = gstr2bRecords[i];
    const norm2bGstin = (r2b.supplierGstin || "").trim().toUpperCase();
    const norm2bInv = normalizeInvoiceNumber(r2b.invoiceNumber);
    const amt2b = Number(r2b.totalInvoiceValuePaise || 0);

    for (let j = 0; j < booksRecords.length; j++) {
      if (booksUsed.has(j)) continue;
      const b = booksRecords[j];
      const normBookGstin = (b.supplierGstin || "").trim().toUpperCase();
      const normBookInv = normalizeInvoiceNumber(b.invoiceNumber || b.voucherNumber);
      const amtBook = Number(b.totalAmountPaise || 0);

      const isGstinMatch = norm2bGstin && normBookGstin && norm2bGstin === normBookGstin;
      const isInvMatch = norm2bInv && normBookInv && norm2bInv === normBookInv;
      const delta = Math.abs(amt2b - amtBook);

      if (isGstinMatch && isInvMatch && delta <= 100) {
        matchedTolerance.push({
          gstr2b: r2b,
          books: b,
          status: "Matched_With_Tolerance",
          deltaPaise: delta,
        });
        gstr2bUsed.add(i);
        booksUsed.add(j);
        break;
      }
    }
  }

  // Identify Residuals
  for (let i = 0; i < gstr2bRecords.length; i++) {
    if (!gstr2bUsed.has(i)) {
      onlyIn2B.push(gstr2bRecords[i]);
    }
  }

  for (let j = 0; j < booksRecords.length; j++) {
    if (!booksUsed.has(j)) {
      onlyInBooks.push(booksRecords[j]);
    }
  }

  // Invariant Assertion: Conservation of records
  const totalReconciled = matchedExact.length + matchedTolerance.length;
  if (totalReconciled + onlyIn2B.length !== gstr2bRecords.length) {
    throw new Error("Record Conservation Invariant Violated: GSTR-2B input record count mismatch.");
  }
  if (totalReconciled + onlyInBooks.length !== booksRecords.length) {
    throw new Error("Record Conservation Invariant Violated: Books input record count mismatch.");
  }

  return {
    matchedExact,
    matchedTolerance,
    onlyIn2B,
    onlyInBooks,
    summary: {
      total2BCount: gstr2bRecords.length,
      totalBooksCount: booksRecords.length,
      matchedCount: totalReconciled,
      exactMatchCount: matchedExact.length,
      toleranceMatchCount: matchedTolerance.length,
      onlyIn2BCount: onlyIn2B.length,
      onlyInBooksCount: onlyInBooks.length,
    },
  };
}

export default {
  normalizeInvoiceNumber,
  isSection17_5Candidate,
  reconcileInvoiceSets,
};


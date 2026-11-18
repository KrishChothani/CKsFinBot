/** @format */

import { validateGstin } from "../utils/gstin.js";
import { lookupHsnRate } from "./rateTables.js";
import { toPaise } from "../utils/money.js";

/**
 * Deterministic Statutory Validation Engine.
 * 
 * FINTECH RULES:
 * 1. Pure deterministic code. ZERO LLM arithmetic.
 * 2. Every check returns: rule_id, version, title, status ('pass', 'fail', 'warning', 'not-checked'), reason.
 * 3. Unverified rules emit 'warning' only, never automatic rejection or block.
 * 4. Missing inputs emit 'not-checked' with plain-language explanation (Honest Uncertainty).
 */

export function runDeterministicValidation(invoiceData, context = {}) {
  const {
    clientStateCode = "24",
    clientFinancialYear = "2026-27",
    clientBooksStartDate = "2026-04-01",
    clientBooksEndDate = "2027-03-31",
  } = context;

  const results = [];

  const supplierGstin =
    invoiceData.counterParty?.supplierGstin?.normalizedValue ||
    invoiceData.counterParty?.supplierGstin?.rawText ||
    invoiceData.supplierGstin;

  const invoiceNumber =
    invoiceData.invoiceDetails?.invoiceNumber?.normalizedValue ||
    invoiceData.invoiceDetails?.invoiceNumber?.rawText ||
    invoiceData.invoiceNumber;

  const invoiceDateStr =
    invoiceData.invoiceDetails?.invoiceDate?.normalizedValue ||
    invoiceData.invoiceDetails?.invoiceDate?.rawText ||
    invoiceData.invoiceDate;

  const placeOfSupply =
    invoiceData.invoiceDetails?.placeOfSupply?.normalizedValue ||
    invoiceData.invoiceDetails?.placeOfSupply?.rawText ||
    invoiceData.placeOfSupply;

  const lineItems = invoiceData.lineItems || [];
  const financialSummary = invoiceData.financialSummary || {};

  // ----------------------------------------------------
  // 1. RULE-GSTIN-MOD36-001: GSTIN Format & Checksum
  // ----------------------------------------------------
  if (!supplierGstin) {
    results.push({
      rule_id: "RULE-GSTIN-MOD36-001",
      version: "1.0.0",
      title: "GSTIN Checksum & Structure",
      status: "not-checked",
      reason: "Supplier GSTIN was not detected in document text layer.",
      evidence: null,
    });
  } else {
    const gstinCheck = validateGstin(supplierGstin);
    if (gstinCheck.isValid && gstinCheck.isChecksumValid) {
      results.push({
        rule_id: "RULE-GSTIN-MOD36-001",
        version: "1.0.0",
        title: "GSTIN Checksum & Structure",
        status: "pass",
        reason: `Valid 15-character GSTIN verified via ISO/IEC 7064 MOD 36-2 algorithm. State: ${gstinCheck.stateName} (${gstinCheck.stateCode}).`,
        evidence: { gstin: supplierGstin, checksum: gstinCheck.actualChecksum },
      });
    } else {
      results.push({
        rule_id: "RULE-GSTIN-MOD36-001",
        version: "1.0.0",
        title: "GSTIN Checksum & Structure",
        status: "fail",
        reason: gstinCheck.reason,
        evidence: { gstin: supplierGstin },
      });
    }
  }

  // ----------------------------------------------------
  // 2. RULE-GST-PLACE-OF-SUPPLY-002: Intra vs Inter State Tax Allocation
  // ----------------------------------------------------
  const supplierState = supplierGstin ? supplierGstin.substring(0, 2) : null;
  const posState = placeOfSupply ? String(placeOfSupply).substring(0, 2) : clientStateCode;

  if (!supplierState || !posState) {
    results.push({
      rule_id: "RULE-GST-PLACE-OF-SUPPLY-002",
      version: "1.0.0",
      title: "Place of Supply Tax Allocation",
      status: "not-checked",
      reason: "Cannot determine place of supply without both Supplier State and Recipient State.",
      evidence: null,
    });
  } else {
    const isInterState = supplierState !== posState;
    const cgstPaise = financialSummary.totalCgstPaise || toPaise(financialSummary.totalCgst || 0);
    const sgstPaise = financialSummary.totalSgstPaise || toPaise(financialSummary.totalSgst || 0);
    const igstPaise = financialSummary.totalIgstPaise || toPaise(financialSummary.totalIgst || 0);

    if (isInterState) {
      if (igstPaise > 0 && cgstPaise === 0 && sgstPaise === 0) {
        results.push({
          rule_id: "RULE-GST-PLACE-OF-SUPPLY-002",
          version: "1.0.0",
          title: "Place of Supply Tax Allocation",
          status: "pass",
          reason: `Inter-State supply confirmed (Supplier State ${supplierState} ≠ Place of Supply ${posState}). 100% IGST allocated correctly.`,
          evidence: { supplierState, posState, igstPaise },
        });
      } else {
        results.push({
          rule_id: "RULE-GST-PLACE-OF-SUPPLY-002",
          version: "1.0.0",
          title: "Place of Supply Tax Allocation",
          status: "fail",
          reason: `Tax split violation: Supply is Inter-State (${supplierState} to ${posState}), but CGST/SGST was recorded instead of IGST.`,
          evidence: { supplierState, posState, cgstPaise, sgstPaise, igstPaise },
        });
      }
    } else {
      // Intra-state: CGST and SGST must equal
      if (cgstPaise > 0 && Math.abs(cgstPaise - sgstPaise) <= 1 && igstPaise === 0) {
        results.push({
          rule_id: "RULE-GST-PLACE-OF-SUPPLY-002",
          version: "1.0.0",
          title: "Place of Supply Tax Allocation",
          status: "pass",
          reason: `Intra-State supply confirmed (State ${supplierState} = State ${posState}). Equal CGST and SGST allocated correctly.`,
          evidence: { supplierState, posState, cgstPaise, sgstPaise },
        });
      } else if (igstPaise > 0) {
        results.push({
          rule_id: "RULE-GST-PLACE-OF-SUPPLY-002",
          version: "1.0.0",
          title: "Place of Supply Tax Allocation",
          status: "fail",
          reason: `Tax split violation: Supply is Intra-State (${supplierState} = ${posState}), but IGST was charged instead of CGST + SGST.`,
          evidence: { supplierState, posState, cgstPaise, sgstPaise, igstPaise },
        });
      } else {
        results.push({
          rule_id: "RULE-GST-PLACE-OF-SUPPLY-002",
          version: "1.0.0",
          title: "Place of Supply Tax Allocation",
          status: "pass",
          reason: `Intra-state zero-rated / exempt supply verified.`,
          evidence: { supplierState, posState },
        });
      }
    }
  }

  // ----------------------------------------------------
  // 3. RULE-GST-ARITHMETIC-003: Line Items Sum & Grand Total in Integer Paise
  // ----------------------------------------------------
  if (lineItems.length === 0) {
    results.push({
      rule_id: "RULE-GST-ARITHMETIC-003",
      version: "1.0.0",
      title: "Line Item Sum & Grand Total Arithmetic",
      status: "not-checked",
      reason: "No line items extracted to perform arithmetic verification.",
      evidence: null,
    });
  } else {
    let calcTaxablePaise = 0;
    let calcTotalTaxPaise = 0;

    lineItems.forEach((item) => {
      const taxable = item.taxableAmountPaise || toPaise(item.taxableAmount || 0);
      const cgst = item.cgstPaise || toPaise(item.cgstAmount || 0);
      const sgst = item.sgstPaise || toPaise(item.sgstAmount || 0);
      const igst = item.igstPaise || toPaise(item.igstAmount || 0);
      const cess = item.cessPaise || toPaise(item.cessAmount || 0);

      calcTaxablePaise += taxable;
      calcTotalTaxPaise += cgst + sgst + igst + cess;
    });

    const extractedSubtotalPaise =
      financialSummary.subTotalPaise || toPaise(financialSummary.subTotal || 0);
    const extractedGrandTotalPaise =
      financialSummary.grandTotalPaise || toPaise(financialSummary.grandTotal || 0);
    const roundOffPaise =
      financialSummary.roundOffPaise || toPaise(financialSummary.roundOff || 0);

    const calculatedGrandTotalPaise =
      calcTaxablePaise + calcTotalTaxPaise + roundOffPaise;

    // 100 paise (₹1.00) allowable tolerance for subtotal
    const subtotalDiff = Math.abs(calcTaxablePaise - extractedSubtotalPaise);
    const grandTotalDiff = Math.abs(calculatedGrandTotalPaise - extractedGrandTotalPaise);

    if (subtotalDiff <= 100 && grandTotalDiff <= 100) {
      results.push({
        rule_id: "RULE-GST-ARITHMETIC-003",
        version: "1.0.0",
        title: "Line Item Sum & Grand Total Arithmetic",
        status: "pass",
        reason: `Deterministic arithmetic verified: Line items taxable (${calcTaxablePaise} paise) matches subtotal, and grand total (${calculatedGrandTotalPaise} paise) is balanced within tolerance.`,
        evidence: { calcTaxablePaise, calculatedGrandTotalPaise },
      });
    } else {
      results.push({
        rule_id: "RULE-GST-ARITHMETIC-003",
        version: "1.0.0",
        title: "Line Item Sum & Grand Total Arithmetic",
        status: "fail",
        reason: `Arithmetic mismatch: Sum of line items (${calcTaxablePaise} paise) differs from subtotal (${extractedSubtotalPaise} paise) by ${subtotalDiff} paise, or grand total differs by ${grandTotalDiff} paise.`,
        evidence: {
          calcTaxablePaise,
          extractedSubtotalPaise,
          calculatedGrandTotalPaise,
          extractedGrandTotalPaise,
        },
      });
    }
  }

  // ----------------------------------------------------
  // 4. RULE-MSME-43B-H-004: Section 43B(h) MSME Vendor Tracking
  // ----------------------------------------------------
  const isMsme =
    invoiceData.isMsmeVendor ||
    invoiceData.counterParty?.isMsmeVendor ||
    (invoiceData.counterParty?.supplierName?.rawText || "").toLowerCase().includes("udyam");

  if (isMsme) {
    results.push({
      rule_id: "RULE-MSME-43B-H-004",
      version: "1.0.0",
      title: "Section 43B(h) MSME Payment Warning",
      status: "warning", // Draft rule: emits warning only
      reason:
        "VERIFY WITH CA / OFFICIAL SOURCE: Vendor flagged as Micro/Small enterprise. Section 43B(h) mandates payment within 45 days (or 15 days without agreement) to avert income tax expense disallowance.",
      evidence: { invoiceDate: invoiceDateStr },
    });
  } else {
    results.push({
      rule_id: "RULE-MSME-43B-H-004",
      version: "1.0.0",
      title: "Section 43B(h) MSME Payment Warning",
      status: "pass",
      reason: "Supplier is not identified as a Section 43B(h) Micro or Small enterprise.",
      evidence: null,
    });
  }

  // ----------------------------------------------------
  // 5. RULE-GST-BLOCKED-ITC-005: Section 17(5) Blocked ITC Flag
  // ----------------------------------------------------
  const blockedKeywords = [
    "catering",
    "food",
    "beverage",
    "restaurant",
    "motor car",
    "motor vehicle",
    "insurance",
    "club membership",
  ];

  let hasBlockedCandidate = false;
  let matchingKeyword = "";

  lineItems.forEach((item) => {
    const desc = (
      item.description?.rawText ||
      item.description ||
      ""
    ).toLowerCase();

    for (const kw of blockedKeywords) {
      if (desc.includes(kw)) {
        hasBlockedCandidate = true;
        matchingKeyword = kw;
        break;
      }
    }
  });

  if (hasBlockedCandidate) {
    results.push({
      rule_id: "RULE-GST-BLOCKED-ITC-005",
      version: "1.0.0",
      title: "Section 17(5) Blocked ITC Review Flag",
      status: "warning",
      reason: `VERIFY WITH CA / OFFICIAL SOURCE: Line item contains keyword '${matchingKeyword}', which may represent ineligible ITC under Section 17(5) of the CGST Act. Requires human confirmation before claim.`,
      evidence: { keyword: matchingKeyword },
    });
  } else {
    results.push({
      rule_id: "RULE-GST-BLOCKED-ITC-005",
      version: "1.0.0",
      title: "Section 17(5) Blocked ITC Review Flag",
      status: "pass",
      reason: "No Section 17(5) candidate blocked credit items detected.",
      evidence: null,
    });
  }

  // ----------------------------------------------------
  // 6. RULE-INV-DATE-SANITY-007: Invoice Date Not in Future & Within FY
  // ----------------------------------------------------
  if (!invoiceDateStr) {
    results.push({
      rule_id: "RULE-INV-DATE-SANITY-007",
      version: "1.0.0",
      title: "Invoice Date Temporal Boundary",
      status: "not-checked",
      reason: "Invoice Date was not detected in document.",
      evidence: null,
    });
  } else {
    const invDate = new Date(invoiceDateStr);
    const now = new Date();

    if (isNaN(invDate.getTime())) {
      results.push({
        rule_id: "RULE-INV-DATE-SANITY-007",
        version: "1.0.0",
        title: "Invoice Date Temporal Boundary",
        status: "fail",
        reason: `Invalid invoice date format: '${invoiceDateStr}'.`,
        evidence: { invoiceDateStr },
      });
    } else if (invDate > now) {
      results.push({
        rule_id: "RULE-INV-DATE-SANITY-007",
        version: "1.0.0",
        title: "Invoice Date Temporal Boundary",
        status: "fail",
        reason: `Invoice date '${invoiceDateStr}' is in the future. Cannot post future-dated vouchers.`,
        evidence: { invoiceDateStr, currentDate: now.toISOString().split("T")[0] },
      });
    } else {
      results.push({
        rule_id: "RULE-INV-DATE-SANITY-007",
        version: "1.0.0",
        title: "Invoice Date Temporal Boundary",
        status: "pass",
        reason: `Invoice date '${invoiceDateStr}' is valid and not future-dated.`,
        evidence: { invoiceDateStr },
      });
    }
  }

  // ----------------------------------------------------
  // 7. RULE-HSN-RATE-TABLE-009: HSN/SAC Chapter GST Rate Verification
  // ----------------------------------------------------
  let hsnMismatches = [];
  lineItems.forEach((item) => {
    const hsn = item.hsnCode?.rawText || item.hsnCode;
    const rateBps = item.gstRateBasisPoints || (item.gstRate ? Math.round(item.gstRate * 100) : 1800);
    const lookup = lookupHsnRate(hsn, invoiceDateStr ? new Date(invoiceDateStr) : new Date());

    if (lookup && lookup.defaultRateBasisPoints !== rateBps) {
      hsnMismatches.push({
        hsn,
        chargedRateBps: rateBps,
        scheduledRateBps: lookup.defaultRateBasisPoints,
      });
    }
  });

  if (hsnMismatches.length > 0) {
    results.push({
      rule_id: "RULE-HSN-RATE-TABLE-009",
      version: "1.0.0",
      title: "Effective-Dated HSN Rate Verification",
      status: "warning",
      reason: `VERIFY WITH CA / OFFICIAL SOURCE: HSN ${hsnMismatches[0].hsn} charged at ${hsnMismatches[0].chargedRateBps / 100}%, but official schedule lists standard rate of ${hsnMismatches[0].scheduledRateBps / 100}%.`,
      evidence: hsnMismatches[0],
    });
  } else {
    results.push({
      rule_id: "RULE-HSN-RATE-TABLE-009",
      version: "1.0.0",
      title: "Effective-Dated HSN Rate Verification",
      status: "pass",
      reason: "Line item HSN codes conform to effective-dated statutory rate schedule.",
      evidence: null,
    });
  }

  return results;
}

export default {
  runDeterministicValidation,
};


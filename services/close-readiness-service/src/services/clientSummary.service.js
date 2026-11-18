/** @format */

import { createHash } from "node:crypto";

/**
 * Computes a deterministic SHA-256 digital hash of summary financial metrics.
 * Non-negotiable: Key-sorted canonical JSON ensures bit-for-bit repeatability.
 * Altering a single paise completely alters the digital signature.
 */
export function computeSummaryDigitalHash(metrics = {}, periodIdentifier = "", clientGstin = "") {
  const canonicalPayload = {
    clientGstin: clientGstin || "",
    closingBankBalancePaise: Number(metrics.closingBankBalancePaise) || 0,
    eligibleItcPaise: Number(metrics.eligibleItcPaise) || 0,
    grossProfitPaise: Number(metrics.grossProfitPaise) || 0,
    ineligibleItcPaise: Number(metrics.ineligibleItcPaise) || 0,
    itcAtRiskPaise: Number(metrics.itcAtRiskPaise) || 0,
    netGstPayablePaise: Number(metrics.netGstPayablePaise) || 0,
    netOperatingPositionPaise: Number(metrics.netOperatingPositionPaise) || 0,
    outputGstPaise: Number(metrics.outputGstPaise) || 0,
    periodIdentifier: periodIdentifier || "",
    totalDirectExpensesPaise: Number(metrics.totalDirectExpensesPaise) || 0,
    totalOperatingExpensesPaise: Number(metrics.totalOperatingExpensesPaise) || 0,
    totalRevenuePaise: Number(metrics.totalRevenuePaise) || 0,
    unreconciledBankAmountPaise: Number(metrics.unreconciledBankAmountPaise) || 0,
  };

  const sortedKeys = Object.keys(canonicalPayload).sort();
  const canonicalString = JSON.stringify(canonicalPayload, sortedKeys);
  return createHash("sha256").update(canonicalString).digest("hex");
}

export const generateDeterministicDigitalHash = computeSummaryDigitalHash;

/**
 * Evaluates completeness and crafts the mandatory statutory Completeness Banner.
 * NON-NEGOTIABLE FINTECH RULE: If any close-readiness pillar fails (< 100%),
 * the banner MUST be prominent, warning that books are NOT closed.
 */
export function formulateCompletenessBanner(closeReadinessReport = {}) {
  const score = closeReadinessReport?.score ?? 0;
  const pillars = closeReadinessReport?.pillars || [];
  const openGaps = [];

  for (const p of pillars) {
    if (p.status !== "PASS") {
      openGaps.push({
        pillar: p.title,
        description: p.blocker || p.details || p.title,
        count: p.count || 0,
        severity: p.status === "FAIL" ? "BLOCKER" : "WARNING",
      });
    }
  }

  const isComplete = score === 100 && openGaps.length === 0;

  let bannerMessage = "";
  if (!isComplete) {
    const gapSummaries = openGaps.map((g) => g.description).join("; ");
    bannerMessage = `PROVISIONAL & UNVERIFIED SUMMARY: ${openGaps.length} compliance gap(s) detected (${
      gapSummaries || "Incomplete reconciliations"
    }). Books are NOT closed. Numbers must not be relied upon for final tax filing or statutory audit.`;
  } else {
    bannerMessage =
      "RECONCILIATION COMPLETE: All 5 statutory pillars verified and reconciled (100%). Ready for CA Partner review & sign-off.";
  }

  return {
    isComplete,
    closeReadinessScore: score,
    bannerMessage,
    openGaps,
  };
}

/**
 * Pure integer paise aggregation for financial metrics from vouchers.
 */
export function aggregateFinancialMetrics(vouchers = []) {
  let totalRevenuePaise = 0;
  let totalDirectExpensesPaise = 0;
  let totalOperatingExpensesPaise = 0;
  let outputGstPaise = 0;
  let eligibleItcPaise = 0;
  let ineligibleItcPaise = 0;

  for (const v of vouchers) {
    const vType = v.voucherType;
    const amountPaise = Number(v.totalAmountPaise) || Math.round((Number(v.totalAmount) || 0) * 100);

    if (vType === "Sales") {
      totalRevenuePaise += amountPaise;
      for (const e of v.entries || []) {
        const name = (e.accountName || "").toLowerCase();
        if (name.includes("gst") || name.includes("tax")) {
          outputGstPaise += Number(e.creditAmountPaise) || Math.round((Number(e.creditAmount) || 0) * 100);
        }
      }
    } else if (vType === "Purchase") {
      totalDirectExpensesPaise += amountPaise;
      const hasBlockedCredit = (v.rulesApplied || []).some(
        (r) => r.rule_id === "RULE-GST-004" || (r.status || "").toLowerCase().includes("blocked")
      );
      for (const e of v.entries || []) {
        const name = (e.accountName || "").toLowerCase();
        if (name.includes("gst") || name.includes("tax") || name.includes("itc")) {
          const taxPaise = Number(e.debitAmountPaise) || Math.round((Number(e.debitAmount) || 0) * 100);
          if (hasBlockedCredit) {
            ineligibleItcPaise += taxPaise;
          } else {
            eligibleItcPaise += taxPaise;
          }
        }
      }
    } else if (vType === "Payment" || vType === "Journal") {
      totalOperatingExpensesPaise += amountPaise;
    }
  }

  const grossProfitPaise = totalRevenuePaise - totalDirectExpensesPaise;
  const netOperatingPositionPaise = grossProfitPaise - totalOperatingExpensesPaise;
  const netGstPayablePaise = Math.max(0, outputGstPaise - eligibleItcPaise);

  return {
    totalRevenuePaise,
    totalDirectExpensesPaise,
    totalOperatingExpensesPaise,
    grossProfitPaise,
    netOperatingPositionPaise,
    outputGstPaise,
    eligibleItcPaise,
    ineligibleItcPaise,
    itcAtRiskPaise: 0,
    netGstPayablePaise,
    closingBankBalancePaise: 0,
    unreconciledBankAmountPaise: 0,
  };
}

export default {
  computeSummaryDigitalHash,
  generateDeterministicDigitalHash,
  formulateCompletenessBanner,
  aggregateFinancialMetrics,
};


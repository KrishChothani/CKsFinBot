/** @format */

import { createHash } from "node:crypto";
import { ClientSummary } from "../Models/clientSummary.model.js";
import { Voucher } from "../Models/voucher.model.js";
import { BankTransaction } from "../Models/bankTransaction.model.js";
import { Gstr2bRecord } from "../Models/gstr2b.model.js";
import { Document } from "../Models/document.model.js";
import { ComplianceTask } from "../Models/complianceTask.model.js";
import { Firm } from "../Models/firm.model.js";
import { Client } from "../Models/client.model.js";
import { computeCloseReadiness } from "./closeReadiness.service.js";

/**
 * Computes a deterministic SHA-256 digital hash of summary financial metrics.
 * Used for tamper-detection and statutory audit provenance.
 */
export const computeSummaryDigitalHash = (metrics, periodIdentifier, clientGstin = "") => {
  const sortedPayload = {
    clientGstin: clientGstin || "",
    periodIdentifier: periodIdentifier || "",
    totalRevenuePaise: metrics.totalRevenuePaise || 0,
    totalDirectExpensesPaise: metrics.totalDirectExpensesPaise || 0,
    totalOperatingExpensesPaise: metrics.totalOperatingExpensesPaise || 0,
    grossProfitPaise: metrics.grossProfitPaise || 0,
    netOperatingPositionPaise: metrics.netOperatingPositionPaise || 0,
    outputGstPaise: metrics.outputGstPaise || 0,
    eligibleItcPaise: metrics.eligibleItcPaise || 0,
    ineligibleItcPaise: metrics.ineligibleItcPaise || 0,
    itcAtRiskPaise: metrics.itcAtRiskPaise || 0,
    netGstPayablePaise: metrics.netGstPayablePaise || 0,
    closingBankBalancePaise: metrics.closingBankBalancePaise || 0,
    unreconciledBankAmountPaise: metrics.unreconciledBankAmountPaise || 0,
  };

  const canonicalString = JSON.stringify(sortedPayload, Object.keys(sortedPayload).sort());
  return createHash("sha256").update(canonicalString).digest("hex");
};

/**
 * Evaluates completeness and crafts the mandatory statutory Completeness Banner.
 * NON-NEGOTIABLE FINTECH RULE: If any close-readiness pillar fails (< 100%),
 * the banner MUST be prominent, warning that books are NOT closed.
 */
export const formulateCompletenessBanner = (closeReadinessReport) => {
  const score = closeReadinessReport?.score ?? 0;
  const pillars = closeReadinessReport?.pillars || [];
  const openGaps = [];

  for (const p of pillars) {
    if (p.status !== "PASS") {
      openGaps.push({
        pillar: p.title,
        description: p.details || p.title,
        count: p.count || 0,
        severity: p.status === "FAIL" ? "BLOCKER" : "WARNING",
      });
    }
  }

  const isComplete = score === 100 && openGaps.length === 0;

  let bannerMessage = "";
  if (!isComplete) {
    const gapSummaries = openGaps.map((g) => g.description).join("; ");
    bannerMessage = `PROVISIONAL & UNVERIFIED SUMMARY: ${openGaps.length} compliance gap(s) detected (${gapSummaries || "Incomplete reconciliations"}). Books are NOT closed. Numbers must not be relied upon for final tax filing or statutory audit.`;
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
};

/**
 * Computes deterministic financial metrics from database records.
 * Strictly integer paise math. Zero float calculations. Zero LLM hallucinations.
 */
export const computeDeterministicMetrics = async (firmId, clientId, startDate, endDate) => {
  // Query posted vouchers within the period
  const query = {
    firm: firmId,
    client: clientId,
    status: "Posted",
  };
  if (startDate && endDate) {
    query.voucherDate = { $gte: startDate, $lte: endDate };
  }

  const vouchers = await Voucher.find(query).lean();
  const totalVouchersCount = vouchers.length;

  let totalRevenuePaise = 0;
  let totalDirectExpensesPaise = 0;
  let totalOperatingExpensesPaise = 0;
  let outputGstPaise = 0;
  let eligibleItcPaise = 0;
  let ineligibleItcPaise = 0;

  for (const v of vouchers) {
    const vType = v.voucherType;
    const amountPaise = v.totalAmountPaise || Math.round((v.totalAmount || 0) * 100);

    if (vType === "Sales") {
      totalRevenuePaise += amountPaise;
      // Calculate output GST from entries if present
      for (const e of v.entries || []) {
        const name = (e.accountName || "").toLowerCase();
        if (name.includes("gst") || name.includes("tax")) {
          outputGstPaise += e.creditAmountPaise || Math.round((e.creditAmount || 0) * 100);
        }
      }
    } else if (vType === "Purchase") {
      totalDirectExpensesPaise += amountPaise;
      // Calculate input tax credit from entries
      let hasBlockedCredit = (v.rulesApplied || []).some(
        (r) => r.rule_id === "RULE-GST-004" || (r.status || "").toLowerCase().includes("blocked")
      );

      for (const e of v.entries || []) {
        const name = (e.accountName || "").toLowerCase();
        if (name.includes("gst") || name.includes("tax") || name.includes("itc")) {
          const taxPaise = e.debitAmountPaise || Math.round((e.debitAmount || 0) * 100);
          if (hasBlockedCredit) {
            ineligibleItcPaise += taxPaise;
          } else {
            eligibleItcPaise += taxPaise;
          }
        }
      }
    } else if (vType === "Payment" || vType === "Journal") {
      // Operating expenses
      totalOperatingExpensesPaise += amountPaise;
    }
  }

  const grossProfitPaise = totalRevenuePaise - totalDirectExpensesPaise;
  const netOperatingPositionPaise = grossProfitPaise - totalOperatingExpensesPaise;
  const netGstPayablePaise = Math.max(0, outputGstPaise - eligibleItcPaise);

  // Bank position: query bank transactions
  const bankQuery = { firm: firmId, client: clientId };
  if (startDate && endDate) {
    bankQuery.transactionDate = { $gte: startDate, $lte: endDate };
  }
  const bankTxs = await BankTransaction.find(bankQuery).lean();
  const unreconciledTxs = bankTxs.filter((t) => !t.isReconciled);
  const unreconciledBankCount = unreconciledTxs.length;
  const unreconciledBankAmountPaise = unreconciledTxs.reduce(
    (sum, t) => sum + (t.amountPaise || Math.round((t.amount || 0) * 100)),
    0
  );

  // Closing bank balance: sum net deposits vs withdrawals
  const closingBankBalancePaise = bankTxs.reduce((bal, t) => {
    const amt = t.amountPaise || Math.round((t.amount || 0) * 100);
    return t.transactionType === "CREDIT" || t.type === "DEPOSIT" ? bal + amt : bal - amt;
  }, 0);

  // ITC at Risk: query GSTR-2B mismatches (Section 16(2)(aa))
  const atRisk2b = await Gstr2bRecord.find({
    firm: firmId,
    client: clientId,
    reconciliationStatus: "MISSING_IN_2B",
  }).lean();
  const itcAtRiskPaise = atRisk2b.reduce(
    (sum, r) => sum + (r.totalTaxPaise || Math.round((r.totalTax || 0) * 100)),
    0
  );

  // Total documents count
  const totalDocumentsCount = await Document.countDocuments({
    firm: firmId,
    client: clientId,
  });

  return {
    totalRevenuePaise,
    totalDirectExpensesPaise,
    totalOperatingExpensesPaise,
    grossProfitPaise,
    netOperatingPositionPaise,
    totalTaxableTurnoverPaise: Math.max(0, totalRevenuePaise - outputGstPaise),
    outputGstPaise,
    eligibleItcPaise,
    ineligibleItcPaise,
    itcAtRiskPaise,
    netGstPayablePaise,
    closingBankBalancePaise,
    unreconciledBankCount,
    unreconciledBankAmountPaise,
    totalVouchersCount,
    totalDocumentsCount,
  };
};

/**
 * Builds standard statutory filing status for the client period.
 */
export const buildStatutoryFilings = async (firmId, clientId, periodIdentifier) => {
  const tasks = await ComplianceTask.find({
    firm: firmId,
    client: clientId,
  }).lean();

  if (tasks.length > 0) {
    return tasks.map((t) => ({
      taxType: t.statutoryBody || t.title || "Statutory Filing",
      period: t.frequency || periodIdentifier || "Monthly",
      dueDate: t.dueDate,
      filingStatus: t.status === "FILED" ? "FILED" : t.status === "OVERDUE" ? "OVERDUE" : "PENDING",
      arn: t.acknowledgementNumber || "",
      filedDate: t.filedDate,
    }));
  }

  // Default statutory filings standard for Indian SMEs
  const now = new Date();
  return [
    {
      taxType: "GSTR-1 (Outward Supplies)",
      period: periodIdentifier || "Monthly",
      dueDate: new Date(now.getFullYear(), now.getMonth(), 11),
      filingStatus: "PENDING",
      arn: "",
    },
    {
      taxType: "GSTR-3B (Monthly Summary & Tax)",
      period: periodIdentifier || "Monthly",
      dueDate: new Date(now.getFullYear(), now.getMonth(), 20),
      filingStatus: "PENDING",
      arn: "",
    },
    {
      taxType: "TDS Payment (Challan ITNS 281)",
      period: periodIdentifier || "Monthly",
      dueDate: new Date(now.getFullYear(), now.getMonth(), 7),
      filingStatus: "PENDING",
      arn: "",
    },
    {
      taxType: "Advance Tax Installment (Sec 208)",
      period: "Quarterly",
      dueDate: new Date(now.getFullYear(), 2, 15),
      filingStatus: "PENDING",
      arn: "",
    },
  ];
};

/**
 * Deterministically generates or refreshes a client summary.
 */
export const generateClientSummaryReport = async ({
  firmId,
  clientId,
  financialYear = "2024-2025",
  period = "Monthly",
  periodIdentifier = "Current",
  performedByUserId,
}) => {
  const client = await Client.findById(clientId).lean();
  if (!client) {
    throw new Error("Client not found.");
  }

  // 1. Evaluate Close Readiness (5 statutory pillars)
  const closeReadiness = await computeCloseReadiness({ firmId, clientId, financialYear });
  const completeness = formulateCompletenessBanner(closeReadiness);

  // 2. Compute Deterministic Financial Metrics strictly in integer paise
  const metrics = await computeDeterministicMetrics(firmId, clientId);

  // 3. Compute Digital Hash for tamper detection
  const digitalHash = computeSummaryDigitalHash(metrics, periodIdentifier, client.gstin);

  // 4. Statutory Filings
  const statutoryFilings = await buildStatutoryFilings(firmId, clientId, periodIdentifier);

  // 5. Check if an existing summary exists
  let summary = await ClientSummary.findOne({
    firm: firmId,
    client: clientId,
    financialYear,
    periodIdentifier,
  });

  const now = new Date();
  if (!summary) {
    summary = new ClientSummary({
      firm: firmId,
      client: clientId,
      financialYear,
      period,
      periodIdentifier,
      status: "Draft",
      completeness,
      metrics,
      statutoryFilings,
      signOff: {
        digitalHash,
      },
      history: [
        {
          action: "SUMMARY_GENERATED",
          performedBy: performedByUserId,
          timestamp: now,
          notes: `Deterministic summary generated. Close readiness: ${completeness.closeReadinessScore}%.`,
        },
      ],
    });
  } else {
    // If previously signed off, check if metrics or hash changed
    const wasSignedOff = summary.status === "Signed_Off";
    const hashChanged = summary.signOff?.digitalHash !== digitalHash;

    if (wasSignedOff && hashChanged) {
      summary.status = "Draft";
      summary.signOff = { digitalHash };
      summary.history.push({
        action: "SIGN_OFF_INVALIDATED_BY_DATA_CHANGE",
        performedBy: performedByUserId,
        timestamp: now,
        notes: "Financial numbers were updated in ledger. Previous CA sign-off invalidated.",
      });
    }

    summary.completeness = completeness;
    summary.metrics = metrics;
    summary.statutoryFilings = statutoryFilings;
    summary.signOff.digitalHash = digitalHash;
    summary.history.push({
      action: "SUMMARY_REFRESHED",
      performedBy: performedByUserId,
      timestamp: now,
      notes: `Deterministic summary refreshed. Close readiness: ${completeness.closeReadinessScore}%.`,
    });
  }

  await summary.save();
  return summary;
};

/**
 * Formal CA Partner Review & Digital Sign-Off.
 */
export const signOffClientSummary = async ({
  summaryId,
  firmId,
  userId,
  partnerName,
  membershipNumber,
  remarks = "",
  forceWithQualifiedDisclaimer = false,
}) => {
  const summary = await ClientSummary.findOne({ _id: summaryId, firm: firmId });
  if (!summary) {
    throw new Error("Client summary not found.");
  }

  if (!partnerName || !partnerName.trim()) {
    throw new Error("CA Partner Name is required for statutory sign-off.");
  }
  if (!membershipNumber || !membershipNumber.trim()) {
    throw new Error("ICAI Membership Number (M.No.) is required for statutory sign-off.");
  }

  // Check completeness gate
  if (!summary.completeness?.isComplete && !forceWithQualifiedDisclaimer) {
    throw new Error(
      `Cannot sign off summary with open reconciliation gaps (${summary.completeness.openGaps?.length || 0} gaps open). Check 'Acknowledge disclaimer' to sign off with a qualified opinion.`
    );
  }

  const client = await Client.findById(summary.client).lean();
  const digitalHash = computeSummaryDigitalHash(
    summary.metrics,
    summary.periodIdentifier,
    client?.gstin || ""
  );

  const now = new Date();
  summary.status = "Signed_Off";
  summary.signOff = {
    signedBy: userId,
    partnerName: partnerName.trim(),
    membershipNumber: membershipNumber.trim(),
    signedAt: now,
    remarks: remarks.trim(),
    digitalHash,
  };

  if (!summary.completeness?.isComplete) {
    summary.completeness.bannerMessage = `SIGNED-OFF WITH QUALIFIED OPINION: Signed by ${partnerName.trim()} (ICAI M.No. ${membershipNumber.trim()}) with acknowledged gaps: "${remarks || "Provisional figures pending source docs"}".`;
  } else {
    summary.completeness.bannerMessage = `STATUTORY SIGN-OFF: Verified and signed off by ${partnerName.trim()} (ICAI M.No. ${membershipNumber.trim()}) on ${now.toLocaleDateString("en-IN")}. All statutory pillars reconciled.`;
  }

  summary.history.push({
    action: "CA_SIGNED_OFF",
    performedBy: userId,
    timestamp: now,
    notes: `Signed off by ${partnerName.trim()} (${membershipNumber.trim()}). Digital Hash: ${digitalHash.substring(0, 12)}...`,
  });

  await summary.save();
  return summary;
};

/**
 * Revokes CA sign-off, resetting status to Draft.
 */
export const revokeClientSummarySignOff = async ({ summaryId, firmId, userId, reason = "" }) => {
  const summary = await ClientSummary.findOne({ _id: summaryId, firm: firmId });
  if (!summary) {
    throw new Error("Client summary not found.");
  }

  const now = new Date();
  summary.status = "Draft";
  summary.signOff.signedAt = null;
  summary.signOff.remarks = `Revoked: ${reason || "Re-opened by CA"}`;

  summary.history.push({
    action: "SIGN_OFF_REVOKED",
    performedBy: userId,
    timestamp: now,
    notes: `Sign-off revoked by CA. Reason: ${reason || "Re-opened for adjustment"}`,
  });

  await summary.save();
  return summary;
};

/** @format */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Voucher } from "../Models/voucher.model.js";
import { LedgerAccount } from "../Models/ledgerAccount.model.js";
import { ExtractedData } from "../Models/extractedData.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load versioned tax rules JSON
const loadTaxRules = () => {
  try {
    const rulesPath = path.join(__dirname, "..", "Config", "taxRules.json");
    const raw = fs.readFileSync(rulesPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load taxRules.json, using defaults:", err);
    return {
      version: "2026.1",
      tdsRules: [],
      disallowanceRules: {},
    };
  }
};

/**
 * Returns active versioned tax rules configuration
 */
export const getActiveTaxRules = () => {
  return loadTaxRules();
};

/**
 * Evaluate tax compliance and disallowance risks for a single voucher or extracted invoice
 */
export const evaluateTaxCompliance = async ({
  voucher,
  vendorLedger = null,
  clientStateCode = "24",
}) => {
  const rules = loadTaxRules();
  const flags = [];

  const invoiceAmount = voucher.totalAmount || 0;
  const voucherText = `${voucher.narration || ""} ${voucher.entries?.map((e) => e.accountName).join(" ") || ""}`.toLowerCase();

  // 1. Check Section 40A(3) Cash Disallowance
  const cashEntries = (voucher.entries || []).filter(
    (e) =>
      e.accountName?.toLowerCase().includes("cash") &&
      e.creditAmount > rules.disallowanceRules?.section40A3?.dailyCashLimit
  );

  if (cashEntries.length > 0) {
    for (const c of cashEntries) {
      flags.push({
        ruleId: "SEC_40A3",
        section: "Section 40A(3)",
        severity: "Danger",
        message: `Cash payment of ₹${c.creditAmount.toLocaleString("en-IN")} exceeds daily threshold of ₹10,000.`,
        suggestedAction:
          "100% of this expenditure will be disallowed from business profits under Section 40A(3) unless covered by Rule 6DD exceptions.",
        potentialDisallowance: c.creditAmount,
      });
    }
  }

  // 2. Check TDS Applicability under Section 194C, 194J, 194I
  for (const rule of rules.tdsRules || []) {
    const isKeywordMatch = rule.applicableKeywords.some((kw) =>
      voucherText.includes(kw.toLowerCase())
    );

    if (isKeywordMatch) {
      const threshold = rule.singleInvoiceThreshold || rule.annualThreshold;
      if (invoiceAmount >= threshold) {
        // Check if TDS was deducted in entries
        const hasTdsDeduction = (voucher.entries || []).some(
          (e) =>
            e.accountName?.toLowerCase().includes("tds") &&
            e.creditAmount > 0
        );

        if (!hasTdsDeduction) {
          const expectedRate = rule.rateIndividualHuf || rule.rateProfessional || rule.rate || 0.02;
          const estimatedTds = Number((invoiceAmount * expectedRate).toFixed(2));
          const potential30PctDisallowance = Number((invoiceAmount * 0.30).toFixed(2));

          flags.push({
            ruleId: `TDS_${rule.section}`,
            section: `Section ${rule.section}`,
            severity: "Warning",
            message: `Invoice value ₹${invoiceAmount.toLocaleString("en-IN")} appears subject to TDS under Section ${rule.section} (${rule.title}), but no TDS deduction found.`,
            suggestedAction: `Deduct TDS @ ${(expectedRate * 100).toFixed(1)}% (approx ₹${estimatedTds.toLocaleString("en-IN")}). Failure to deduct will result in 30% expenditure disallowance (₹${potential30PctDisallowance.toLocaleString("en-IN")}) under Section 40(a)(ia).`,
            potentialDisallowance: potential30PctDisallowance,
          });
        }
      }
    }
  }

  // 3. Check Section 43B(h) MSME 45-day Timely Payment Requirement
  if (vendorLedger && ["Micro", "Small"].includes(vendorLedger.msmeCategory)) {
    const allowedDays = vendorLedger.creditPeriodDays || 45;
    const invDate = new Date(voucher.voucherDate);
    const statutoryDueDate = new Date(invDate.getTime() + allowedDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysElapsed = Math.floor((now.getTime() - invDate.getTime()) / (24 * 60 * 60 * 1000));
    const isOverdue = now > statutoryDueDate;

    if (isOverdue) {
      flags.push({
        ruleId: "SEC_43BH",
        section: "Section 43B(h)",
        severity: "Danger",
        message: `Vendor is registered as ${vendorLedger.msmeCategory} Enterprise. Invoice is unpaid beyond statutory limit of ${allowedDays} days (${daysElapsed} days elapsed).`,
        suggestedAction: `Pay ₹${invoiceAmount.toLocaleString("en-IN")} before March 31 to claim tax deduction; otherwise, the entire ₹${invoiceAmount.toLocaleString("en-IN")} must be added back to taxable income under Section 43B(h).`,
        potentialDisallowance: invoiceAmount,
      });
    } else if (allowedDays - daysElapsed <= 7) {
      flags.push({
        ruleId: "SEC_43BH_WARN",
        section: "Section 43B(h)",
        severity: "Warning",
        message: `Payment to ${vendorLedger.msmeCategory} Enterprise due in ${allowedDays - daysElapsed} day(s) (Statutory Deadline: ${statutoryDueDate.toISOString().slice(0, 10)}).`,
        suggestedAction: "Schedule vendor payment immediately to prevent Section 43B(h) disallowance.",
        potentialDisallowance: invoiceAmount,
      });
    }
  }

  return flags;
};

/**
 * Returns MSME 45-day payment tracker list and summary
 */
export const getMsmePaymentTracker = async (firmId, clientId) => {
  // Find all vendor ledgers marked as Micro or Small
  const msmeVendors = await LedgerAccount.find({
    client: clientId,
    accountGroup: "Sundry_Creditors",
    msmeCategory: { $in: ["Micro", "Small"] },
  });

  const vendorMap = new Map();
  msmeVendors.forEach((v) => {
    vendorMap.set(v._id.toString(), v);
    vendorMap.set(v.accountName.toLowerCase(), v);
  });

  // Find all purchase vouchers
  const purchaseVouchers = await Voucher.find({
    client: clientId,
    voucherType: "Purchase",
    status: "Posted",
  }).sort({ voucherDate: -1 });

  const bills = [];
  let totalMsmeOutstanding = 0;
  let totalDisallowedUnder43Bh = 0;
  let totalDueWithin7Days = 0;

  const now = new Date();

  for (const v of purchaseVouchers) {
    // Identify vendor from entries (credit entry in Sundry_Creditors)
    const creditorEntry = (v.entries || []).find((e) => e.creditAmount > 0);
    if (!creditorEntry) continue;

    const vendor =
      vendorMap.get(creditorEntry.ledgerAccount?.toString()) ||
      vendorMap.get(creditorEntry.accountName.toLowerCase());

    if (!vendor) continue; // Not an MSME vendor

    const invDate = new Date(v.voucherDate);
    const allowedDays = vendor.creditPeriodDays || 45;
    const statutoryDueDate = new Date(invDate.getTime() + allowedDays * 24 * 60 * 60 * 1000);
    const diffMs = statutoryDueDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    const isPaid = v.isPaid || false;

    let status = "Compliant";
    if (!isPaid) {
      if (daysRemaining < 0) {
        status = "Disallowed_43Bh";
        totalDisallowedUnder43Bh += v.totalAmount;
      } else if (daysRemaining <= 7) {
        status = "Due_Soon";
        totalDueWithin7Days += v.totalAmount;
      } else {
        status = "Upcoming";
      }
      totalMsmeOutstanding += v.totalAmount;
    }

    bills.push({
      voucherId: v._id,
      voucherNumber: v.voucherNumber,
      voucherDate: v.voucherDate,
      vendorName: vendor.accountName,
      msmeCategory: vendor.msmeCategory,
      msmeUdyamNumber: vendor.msmeUdyamNumber || "UDYAM-REG-PENDING",
      amount: v.totalAmount,
      allowedDays,
      statutoryDueDate,
      daysRemaining,
      isPaid,
      status,
      disallowanceRisk: status === "Disallowed_43Bh" ? v.totalAmount : 0,
    });
  }

  return {
    metrics: {
      totalMsmeBills: bills.length,
      totalMsmeOutstanding: Number(totalMsmeOutstanding.toFixed(2)),
      totalDisallowedUnder43Bh: Number(totalDisallowedUnder43Bh.toFixed(2)),
      totalDueWithin7Days: Number(totalDueWithin7Days.toFixed(2)),
      compliantCount: bills.filter((b) => b.isPaid || b.status === "Upcoming").length,
      atRiskCount: bills.filter((b) => b.status === "Disallowed_43Bh" || b.status === "Due_Soon").length,
    },
    bills,
  };
};

/**
 * Returns comprehensive tax advisory summary with all potential disallowance flags
 */
export const getClientTaxAdvisorySummary = async (firmId, clientId) => {
  const vouchers = await Voucher.find({
    client: clientId,
    status: "Posted",
  }).sort({ voucherDate: -1 });

  const vendorLedgers = await LedgerAccount.find({
    client: clientId,
    accountGroup: "Sundry_Creditors",
  });

  const vendorMap = new Map();
  vendorLedgers.forEach((vl) => {
    vendorMap.set(vl._id.toString(), vl);
    vendorMap.set(vl.accountName.toLowerCase(), vl);
  });

  const flaggedVouchers = [];
  let totalPotentialDisallowance = 0;
  let sec40A3Total = 0;
  let sec40AiaTotal = 0;
  let sec43BhTotal = 0;

  for (const v of vouchers) {
    const creditorEntry = (v.entries || []).find((e) => e.creditAmount > 0);
    const vendorLedger = creditorEntry
      ? vendorMap.get(creditorEntry.ledgerAccount?.toString()) ||
        vendorMap.get(creditorEntry.accountName.toLowerCase())
      : null;

    const flags = await evaluateTaxCompliance({
      voucher: v,
      vendorLedger,
    });

    if (flags.length > 0) {
      for (const f of flags) {
        totalPotentialDisallowance += f.potentialDisallowance || 0;
        if (f.ruleId === "SEC_40A3") sec40A3Total += f.potentialDisallowance || 0;
        else if (f.ruleId.startsWith("TDS_")) sec40AiaTotal += f.potentialDisallowance || 0;
        else if (f.ruleId.startsWith("SEC_43BH")) sec43BhTotal += f.potentialDisallowance || 0;
      }

      flaggedVouchers.push({
        voucherId: v._id,
        voucherNumber: v.voucherNumber,
        voucherType: v.voucherType,
        voucherDate: v.voucherDate,
        amount: v.totalAmount,
        flags,
      });
    }
  }

  return {
    metrics: {
      totalFlaggedVouchers: flaggedVouchers.length,
      totalPotentialDisallowance: Number(totalPotentialDisallowance.toFixed(2)),
      sec40A3CashDisallowance: Number(sec40A3Total.toFixed(2)),
      sec40AiaTdsDisallowance: Number(sec40AiaTotal.toFixed(2)),
      sec43BhMsmeDisallowance: Number(sec43BhTotal.toFixed(2)),
    },
    flaggedVouchers,
  };
};


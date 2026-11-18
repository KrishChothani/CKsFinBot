/** @format */

import taxRules from "../config/taxRules.json" with { type: "json" };

export function getActiveTaxRules() {
  return taxRules;
}

/**
 * Evaluates statutory tax risks and potential Section 40(a)(ia) / 40A(3) / 43B(h) disallowances.
 */
export function evaluateVoucherTaxRisks(voucher) {
  const flags = [];
  const totalAmount = voucher.totalAmountPaise ? voucher.totalAmountPaise / 100 : Number(voucher.totalAmount || 0);
  const voucherText = `${voucher.narration || ""} ${voucher.lines?.map((e) => e.accountName).join(" ") || ""}`.toLowerCase();

  // 1. Check Section 40A(3) Cash Disallowance (> ₹10,000 cash payments)
  const cashLines = (voucher.lines || []).filter(
    (l) =>
      l.accountName?.toLowerCase().includes("cash") &&
      (l.entryType === "CREDIT" || l.entryType === "DEBIT") &&
      Number(l.amountPaise || 0) > (taxRules.disallowanceRules?.section40A3?.dailyCashLimit || 10000) * 100
  );

  if (cashLines.length > 0) {
    for (const c of cashLines) {
      const amtPaise = Number(c.amountPaise);
      flags.push({
        ruleId: "SEC_40A3",
        section: "Section 40A(3)",
        severity: "Danger",
        message: `Cash payment of ₹${(amtPaise / 100).toLocaleString("en-IN")} exceeds statutory threshold of ₹10,000.`,
        suggestedAction:
          "100% of this expenditure will be disallowed from business taxable profits under Section 40A(3).",
        disallowancePaise: amtPaise,
      });
    }
  }

  // 2. Check TDS Applicability under Section 194C, 194J, 194I
  for (const rule of taxRules.tdsRules || []) {
    const isKeywordMatch = rule.applicableKeywords.some((kw) =>
      voucherText.includes(kw.toLowerCase())
    );

    if (isKeywordMatch) {
      const threshold = rule.singleInvoiceThreshold || rule.annualThreshold || 30000;
      if (totalAmount >= threshold) {
        // Check if TDS entry exists
        const hasTdsLine = (voucher.lines || []).some(
          (l) =>
            l.accountName?.toLowerCase().includes("tds") &&
            l.entryType === "CREDIT" &&
            Number(l.amountPaise || 0) > 0
        );

        if (!hasTdsLine) {
          const rate = rule.rateIndividualHuf || rule.rateProfessional || rule.rateTechnical || 0.02;
          const disallowancePaise = Math.round((voucher.totalAmountPaise || totalAmount * 100) * 0.30);

          flags.push({
            ruleId: `TDS_${rule.section}`,
            section: `Section ${rule.section}`,
            severity: "Warning",
            message: `Invoice value ₹${totalAmount.toLocaleString("en-IN")} appears subject to TDS under Section ${rule.section} (${rule.title}), but no TDS deduction found.`,
            suggestedAction: `Deduct TDS @ ${(rate * 100).toFixed(1)}%. Failure to deduct will trigger 30% expenditure disallowance (₹${(disallowancePaise / 100).toLocaleString("en-IN")}) under Section 40(a)(ia).`,
            disallowancePaise,
          });
        }
      }
    }
  }

  // 3. Check Section 43B(h) MSME due date tracking
  if (voucher.isMsmeVendor) {
    const invoiceDate = new Date(voucher.voucherDate || Date.now());
    const agreedDays = voucher.creditPeriodDays;
    // Statutory cap of 45 days under Section 15 of MSMED Act
    const effectiveDays = agreedDays && agreedDays > 0 ? Math.min(agreedDays, 45) : 15;
    const statutoryDueDate = new Date(invoiceDate.getTime() + effectiveDays * 24 * 60 * 60 * 1000);
    const isOverdue = new Date() > statutoryDueDate;

    if (isOverdue) {
      flags.push({
        ruleId: "MSME_SEC_43BH_OVERDUE",
        section: "Section 43B(h)",
        severity: "Danger",
        message: `Payment to MSME supplier is overdue past statutory deadline (${statutoryDueDate.toISOString().split("T")[0]}).`,
        suggestedAction: `Settle outstanding amount of ₹${totalAmount.toLocaleString("en-IN")} immediately to avoid 100% deduction disallowance under Section 43B(h).`,
        disallowancePaise: voucher.totalAmountPaise || totalAmount * 100,
        statutoryDueDate: statutoryDueDate.toISOString(),
      });
    }
  }

  return {
    voucherId: voucher.id || voucher.voucherId,
    voucherNumber: voucher.voucherNumber,
    hasTaxRisks: flags.length > 0,
    riskCount: flags.length,
    flags,
  };
}

export default {
  getActiveTaxRules,
  evaluateVoucherTaxRisks,
};


/** @format */

import { Voucher } from "../Models/voucher.model.js";
import { LedgerAccount } from "../Models/ledgerAccount.model.js";
import { Client } from "../Models/client.model.js";
import { ComplianceTask } from "../Models/complianceTask.model.js";
import { DocumentRequest } from "../Models/documentRequest.model.js";
import { BankTransaction } from "../Models/bankTransaction.model.js";
import { Gstr2bRecord } from "../Models/gstr2b.model.js";

/**
 * Helper to compute date range for an Indian FY (e.g. "2026-2027")
 */
const getFinancialYearRange = (financialYear = "2026-2027") => {
  const startYear = parseInt(financialYear.split("-")[0], 10) || 2026;
  const startDate = new Date(startYear, 3, 1); // 1st April
  const endDate = new Date(startYear + 1, 2, 31, 23, 59, 59, 999); // 31st March
  return { startDate, endDate };
};

/**
 * Generate Schedule III Profit & Loss (P&L) Statement
 */
export const generateProfitAndLossStatement = async (
  firmId,
  clientId,
  financialYear = "2026-2027"
) => {
  const { startDate, endDate } = getFinancialYearRange(financialYear);

  const vouchers = await Voucher.find({
    client: clientId,
    status: "Posted",
    voucherDate: { $gte: startDate, $lte: endDate },
  });

  const ledgers = await LedgerAccount.find({ client: clientId });
  const ledgerGroupMap = new Map();
  ledgers.forEach((l) => ledgerGroupMap.set(l._id.toString(), l.accountGroup));

  let revenueFromOperations = 0;
  let otherIncome = 0;

  let costOfMaterials = 0; // Direct expenses / Purchases
  let employeeBenefits = 0;
  let financeCosts = 0;
  let depreciation = 0;
  let otherExpenses = 0; // Rent, legal, software, utilities

  // Categorize each entry
  for (const v of vouchers) {
    for (const e of v.entries || []) {
      const group = ledgerGroupMap.get(e.ledgerAccount?.toString());
      const name = (e.accountName || "").toLowerCase();

      // Income (Credits in Sales_Accounts or Indirect_Expenses)
      if (group === "Sales_Accounts" || name.includes("sales") || name.includes("revenue")) {
        revenueFromOperations += e.creditAmount - e.debitAmount;
      } else if (name.includes("interest") || name.includes("discount received") || name.includes("other income")) {
        otherIncome += e.creditAmount - e.debitAmount;
      }

      // Expenses (Debits in Expenses / Purchases)
      if (group === "Purchase_Accounts" || group === "Direct_Expenses" || name.includes("purchase") || name.includes("freight")) {
        costOfMaterials += e.debitAmount - e.creditAmount;
      } else if (name.includes("salary") || name.includes("wage") || name.includes("employee") || name.includes("staff")) {
        employeeBenefits += e.debitAmount - e.creditAmount;
      } else if (name.includes("bank charge") || name.includes("interest paid") || name.includes("finance")) {
        financeCosts += e.debitAmount - e.creditAmount;
      } else if (name.includes("depreciation") || name.includes("amortization")) {
        depreciation += e.debitAmount - e.creditAmount;
      } else if (group === "Indirect_Expenses" || name.includes("rent") || name.includes("professional") || name.includes("office") || name.includes("utility")) {
        otherExpenses += e.debitAmount - e.creditAmount;
      }
    }
  }

  // Ensure positive values
  revenueFromOperations = Math.max(0, revenueFromOperations);
  otherIncome = Math.max(0, otherIncome);
  const totalRevenue = revenueFromOperations + otherIncome;

  costOfMaterials = Math.max(0, costOfMaterials);
  employeeBenefits = Math.max(0, employeeBenefits);
  financeCosts = Math.max(0, financeCosts);
  depreciation = Math.max(0, depreciation);
  otherExpenses = Math.max(0, otherExpenses);

  const totalExpenses =
    costOfMaterials + employeeBenefits + financeCosts + depreciation + otherExpenses;

  const profitBeforeTax = totalRevenue - totalExpenses;
  const corporateTaxRate = 0.25; // 25% corporate tax rate
  const estimatedTax = profitBeforeTax > 0 ? Number((profitBeforeTax * corporateTaxRate).toFixed(2)) : 0;
  const netProfitAfterTax = profitBeforeTax - estimatedTax;

  const operatingMargin =
    totalRevenue > 0 ? ((profitBeforeTax / totalRevenue) * 100).toFixed(1) : 0;
  const netMargin =
    totalRevenue > 0 ? ((netProfitAfterTax / totalRevenue) * 100).toFixed(1) : 0;

  return {
    financialYear,
    period: `${startDate.toLocaleDateString("en-IN")} to ${endDate.toLocaleDateString("en-IN")}`,
    revenue: {
      revenueFromOperations: Number(revenueFromOperations.toFixed(2)),
      otherIncome: Number(otherIncome.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
    },
    expenses: {
      costOfMaterials: Number(costOfMaterials.toFixed(2)),
      employeeBenefits: Number(employeeBenefits.toFixed(2)),
      financeCosts: Number(financeCosts.toFixed(2)),
      depreciation: Number(depreciation.toFixed(2)),
      otherExpenses: Number(otherExpenses.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
    },
    profitability: {
      profitBeforeTax: Number(profitBeforeTax.toFixed(2)),
      estimatedTax: Number(estimatedTax.toFixed(2)),
      netProfitAfterTax: Number(netProfitAfterTax.toFixed(2)),
      operatingMarginPercent: Number(operatingMargin),
      netMarginPercent: Number(netMargin),
    },
  };
};

/**
 * Generate Balance Sheet Snapshot (Assets = Liabilities + Equity)
 */
export const generateBalanceSheet = async (
  firmId,
  clientId,
  financialYear = "2026-2027"
) => {
  const pnl = await generateProfitAndLossStatement(firmId, clientId, financialYear);
  const netProfitForPeriod = pnl.profitability.netProfitAfterTax;

  const vouchers = await Voucher.find({
    client: clientId,
    status: "Posted",
  });

  const ledgers = await LedgerAccount.find({ client: clientId });
  const ledgerMap = new Map();
  ledgers.forEach((l) => {
    ledgerMap.set(l._id.toString(), {
      name: l.accountName,
      group: l.accountGroup,
      opening: l.openingBalance || 0,
      debits: 0,
      credits: 0,
    });
  });

  // Calculate ledger balances
  for (const v of vouchers) {
    for (const e of v.entries || []) {
      const rec = ledgerMap.get(e.ledgerAccount?.toString());
      if (rec) {
        rec.debits += e.debitAmount || 0;
        rec.credits += e.creditAmount || 0;
      }
    }
  }

  // Assets
  let fixedAssets = 0;
  let bankBalances = 0;
  let cashInHand = 0;
  let tradeReceivables = 0;
  let gstInputCredit = 0;

  // Liabilities
  let capitalAccount = 0;
  let longTermBorrowings = 0;
  let tradePayables = 0;
  let gstOutputLiability = 0;

  for (const [_, acc] of ledgerMap.entries()) {
    const netDebit = acc.opening + (acc.debits - acc.credits);
    const netCredit = acc.opening + (acc.credits - acc.debits);
    const lowerName = acc.name.toLowerCase();

    if (acc.group === "Fixed_Assets") {
      fixedAssets += Math.max(0, netDebit);
    } else if (acc.group === "Bank_Accounts") {
      bankBalances += Math.max(0, netDebit);
    } else if (acc.group === "Cash_in_Hand") {
      cashInHand += Math.max(0, netDebit);
    } else if (acc.group === "Sundry_Debtors" || acc.group === "Current_Assets") {
      tradeReceivables += Math.max(0, netDebit);
    } else if (acc.group === "Duties_and_Taxes" && (lowerName.includes("input") || netDebit > 0)) {
      gstInputCredit += Math.max(0, netDebit);
    }

    if (acc.group === "Capital_Account") {
      capitalAccount += Math.max(0, netCredit);
    } else if (acc.group === "Sundry_Creditors" || acc.group === "Current_Liabilities") {
      tradePayables += Math.max(0, netCredit);
    } else if (acc.group === "Duties_and_Taxes" && (lowerName.includes("output") || netCredit > 0)) {
      gstOutputLiability += Math.max(0, netCredit);
    }
  }

  // Capital includes opening capital + net profit for current year
  const totalEquity = capitalAccount + netProfitForPeriod;
  const currentLiabilities = tradePayables + Math.max(0, gstOutputLiability - gstInputCredit);
  const totalLiabilitiesAndEquity = totalEquity + longTermBorrowings + currentLiabilities;

  const currentAssets = tradeReceivables + bankBalances + cashInHand + Math.max(0, gstInputCredit - gstOutputLiability);
  const totalAssets = fixedAssets + currentAssets;

  const difference = totalAssets - totalLiabilitiesAndEquity;
  const isBalanced = Math.abs(difference) <= 2.0;

  return {
    asOfDate: new Date().toISOString().slice(0, 10),
    financialYear,
    isBalanced,
    difference: Number(difference.toFixed(2)),
    equityAndLiabilities: {
      shareholdersFunds: {
        capitalAccount: Number(capitalAccount.toFixed(2)),
        retainedEarningsNetProfit: Number(netProfitForPeriod.toFixed(2)),
        totalEquity: Number(totalEquity.toFixed(2)),
      },
      nonCurrentLiabilities: {
        longTermBorrowings: Number(longTermBorrowings.toFixed(2)),
      },
      currentLiabilities: {
        tradePayables: Number(tradePayables.toFixed(2)),
        netGstPayable: Number(Math.max(0, gstOutputLiability - gstInputCredit).toFixed(2)),
        totalCurrentLiabilities: Number(currentLiabilities.toFixed(2)),
      },
      totalLiabilitiesAndEquity: Number(totalLiabilitiesAndEquity.toFixed(2)),
    },
    assets: {
      nonCurrentAssets: {
        fixedAssets: Number(fixedAssets.toFixed(2)),
      },
      currentAssets: {
        tradeReceivables: Number(tradeReceivables.toFixed(2)),
        bankBalances: Number(bankBalances.toFixed(2)),
        cashInHand: Number(cashInHand.toFixed(2)),
        netGstReceivable: Number(Math.max(0, gstInputCredit - gstOutputLiability).toFixed(2)),
        totalCurrentAssets: Number(currentAssets.toFixed(2)),
      },
      totalAssets: Number(totalAssets.toFixed(2)),
    },
  };
};

/**
 * Generate Receivables and Payables Ageing Report
 */
export const generateAgeingReport = async (firmId, clientId) => {
  const vouchers = await Voucher.find({
    client: clientId,
    voucherType: { $in: ["Purchase", "Sales"] },
    status: "Posted",
  }).sort({ voucherDate: 1 });

  const now = new Date();

  const receivables = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total: 0, items: [] };
  const payables = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total: 0, items: [] };

  for (const v of vouchers) {
    if (v.isPaid) continue;

    const diffDays = Math.floor((now.getTime() - new Date(v.voucherDate).getTime()) / (24 * 60 * 60 * 1000));
    const bucket = diffDays <= 30 ? "0-30" : diffDays <= 60 ? "31-60" : diffDays <= 90 ? "61-90" : "90+";

    const item = {
      voucherId: v._id,
      voucherNumber: v.voucherNumber,
      voucherDate: v.voucherDate,
      partyName: v.narration || "Counterparty",
      amount: v.totalAmount,
      daysElapsed: diffDays,
      bucket,
    };

    if (v.voucherType === "Sales") {
      receivables[bucket] += v.totalAmount;
      receivables.total += v.totalAmount;
      receivables.items.push(item);
    } else {
      payables[bucket] += v.totalAmount;
      payables.total += v.totalAmount;
      payables.items.push(item);
    }
  }

  // Round summary numbers
  ["0-30", "31-60", "61-90", "90+", "total"].forEach((b) => {
    receivables[b] = Number(receivables[b].toFixed(2));
    payables[b] = Number(payables[b].toFixed(2));
  });

  return {
    asOfDate: now.toISOString().slice(0, 10),
    receivables,
    payables,
  };
};

/**
 * Generate Multi-Entity Consolidation Overview for CA Firms
 */
export const generateFirmConsolidatedOverview = async (firmId) => {
  const clients = await Client.find({ firm: firmId }).sort({ businessName: 1 });

  const clientSummaries = [];
  let aggregateRevenue = 0;
  let aggregatePurchases = 0;
  let aggregateOverdueTasks = 0;
  let aggregatePendingRequests = 0;

  for (const c of clients) {
    const vouchers = await Voucher.find({ client: c._id, status: "Posted" });

    let revenue = 0;
    let purchases = 0;
    vouchers.forEach((v) => {
      if (v.voucherType === "Sales") revenue += v.totalAmount;
      else if (v.voucherType === "Purchase") purchases += v.totalAmount;
    });

    const [overdueTasks, pendingRequests, unreconciledBank] = await Promise.all([
      ComplianceTask.countDocuments({ client: c._id, status: "Overdue" }),
      DocumentRequest.countDocuments({ client: c._id, status: "Pending" }),
      BankTransaction.countDocuments({ client: c._id, reconciliationStatus: "Unreconciled" }),
    ]);

    aggregateRevenue += revenue;
    aggregatePurchases += purchases;
    aggregateOverdueTasks += overdueTasks;
    aggregatePendingRequests += pendingRequests;

    clientSummaries.push({
      clientId: c._id,
      businessName: c.businessName,
      tradeName: c.tradeName || c.businessName,
      gstin: c.gstin,
      stateCode: c.settings?.stateCode || "24",
      financialYear: c.financialYear || "2026-2027",
      financials: {
        totalRevenue: Number(revenue.toFixed(2)),
        totalPurchases: Number(purchases.toFixed(2)),
      },
      actionItems: {
        overdueComplianceCount: overdueTasks,
        pendingDocumentRequests: pendingRequests,
        unreconciledBankCount: unreconciledBank,
        hasUrgentAction: overdueTasks > 0 || pendingRequests > 2,
      },
    });
  }

  return {
    firmSummary: {
      totalClients: clients.length,
      aggregateRevenue: Number(aggregateRevenue.toFixed(2)),
      aggregatePurchases: Number(aggregatePurchases.toFixed(2)),
      aggregateOverdueCompliance: aggregateOverdueTasks,
      aggregatePendingRequests: aggregatePendingRequests,
    },
    clients: clientSummaries,
  };
};


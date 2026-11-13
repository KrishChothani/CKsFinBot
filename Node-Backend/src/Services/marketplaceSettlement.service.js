/** @format */

import { MarketplaceSettlement } from "../Models/marketplaceSettlement.model.js";
import { Voucher } from "../Models/voucher.model.js";
import { BankTransaction } from "../Models/bankTransaction.model.js";
import { LedgerAccount } from "../Models/ledgerAccount.model.js";
import { toPaise } from "../Utils/money.js";

/**
 * Parses raw text/CSV rows of marketplace settlement reports
 */
export function parseSettlementCsvRows(csvContent) {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(",").map((h) => h.replace(/["']/g, "").trim().toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    // Handle comma inside quotes if any, or simple split
    const currentLine = lines[i];
    const values = currentLine.split(",").map((v) => v.replace(/["']/g, "").trim());
    if (values.length < headers.length) continue;

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || "";
    });
    rows.push(rowObj);
  }
  return rows;
}

/**
 * Deterministically parses Amazon or Flipkart settlement data from JSON/CSV payload.
 * Converts every financial figure to exact integer paise.
 */
export function parseMarketplaceReport({ marketplace = "AMAZON", rawData = [], settlementId = "" }) {
  let grossSalesPaise = 0;
  let salesReturnPaise = 0;
  let outputGstPaise = 0;
  let marketplaceFeePaise = 0;
  let shippingFeePaise = 0;
  let inputGstOnFeesPaise = 0;
  let tcsPaise = 0;
  let tdsPaise = 0;
  let otherDeductionsPaise = 0;

  let orderCount = 0;
  let refundCount = 0;
  const rawBreakdown = [];

  for (const item of rawData) {
    const cleanType = (item.type || item.transaction_type || item["transaction type"] || "")
      .toUpperCase()
      .replace(/[_\s-]+/g, " ");
    const cleanDesc = (item.description || item.amount_description || item["amount description"] || "")
      .toUpperCase()
      .replace(/[_\s-]+/g, " ");
    const amountFloat = parseFloat(item.amount || item.value || 0) || 0;
    const itemPaise = Math.abs(toPaise(amountFloat));

    if (cleanType.includes("REFUND") || cleanDesc.includes("REFUND") || cleanDesc.includes("CUSTOMER RETURN")) {
      refundCount++;
      salesReturnPaise += itemPaise;
      rawBreakdown.push({
        orderId: item.order_id || item["order id"] || "REFUND",
        sku: item.sku || "",
        type: "Refund",
        amountPaise: itemPaise,
        taxPaise: 0,
        date: item.date ? new Date(item.date) : new Date(),
      });
    } else if (
      cleanDesc.includes("COMMISSION") ||
      cleanDesc.includes("REFERRAL") ||
      cleanDesc.includes("CLOSING FEE") ||
      cleanDesc.includes("MARKETPLACE FEE") ||
      cleanDesc.includes("PLATFORM FEE")
    ) {
      marketplaceFeePaise += itemPaise;
    } else if (
      cleanDesc.includes("SHIPPING") ||
      cleanDesc.includes("FBA") ||
      cleanDesc.includes("EASY SHIP") ||
      cleanDesc.includes("LOGISTICS") ||
      cleanDesc.includes("WEIGHT HANDLING") ||
      cleanDesc.includes("DELIVERY")
    ) {
      shippingFeePaise += itemPaise;
    } else if (
      cleanDesc.includes("GST ON FEE") ||
      cleanDesc.includes("SERVICE TAX") ||
      cleanDesc.includes("INPUT GST")
    ) {
      inputGstOnFeesPaise += itemPaise;
    } else if (
      cleanDesc.includes("TCS") ||
      cleanDesc.includes("SEC 52") ||
      cleanDesc.includes("TAX COLLECTED")
    ) {
      tcsPaise += itemPaise;
    } else if (
      cleanDesc.includes("TDS") ||
      cleanDesc.includes("194 O") ||
      cleanDesc.includes("194O")
    ) {
      tdsPaise += itemPaise;
    } else if (
      cleanDesc.includes("PROMOTION") ||
      cleanDesc.includes("STORAGE") ||
      cleanDesc.includes("REIMBURSEMENT")
    ) {
      otherDeductionsPaise += itemPaise;
    } else {
      // Order Principal / Tax
      orderCount++;
      const taxFloat = parseFloat(item.tax || item.gst || 0) || 0;
      const taxPaise = toPaise(taxFloat);

      grossSalesPaise += itemPaise;
      outputGstPaise += taxPaise;

      rawBreakdown.push({
        orderId: item.order_id || item["order id"] || `ORD-${orderCount}`,
        sku: item.sku || "",
        type: "Order",
        amountPaise: itemPaise,
        taxPaise,
        date: item.date ? new Date(item.date) : new Date(),
      });
    }
  }

  // If input GST on fees was not explicitly split by platform, Amazon/Flipkart charge standard 18% GST on services
  if (inputGstOnFeesPaise === 0 && (marketplaceFeePaise > 0 || shippingFeePaise > 0)) {
    inputGstOnFeesPaise = Math.round((marketplaceFeePaise + shippingFeePaise) * 0.18);
  }

  // If TCS § 52 was not explicitly itemized, calculate standard 1% (0.5% CGST + 0.5% SGST) on net taxable sales
  const netTaxablePaise = Math.max(0, grossSalesPaise - salesReturnPaise);
  if (tcsPaise === 0 && netTaxablePaise > 0) {
    tcsPaise = Math.round(netTaxablePaise * 0.01);
  }

  // If TDS § 194-O was not explicitly itemized, calculate standard 1% on gross sales
  if (tdsPaise === 0 && grossSalesPaise > 0) {
    tdsPaise = Math.round(grossSalesPaise * 0.01);
  }

  const netSalesPaise = grossSalesPaise - salesReturnPaise;

  // Net Disbursement = (Gross Sales + Output GST) - Sales Returns - (Fees + Shipping + Input GST + TCS + TDS + Other)
  const totalDebitedToSeller =
    salesReturnPaise +
    marketplaceFeePaise +
    shippingFeePaise +
    inputGstOnFeesPaise +
    tcsPaise +
    tdsPaise +
    otherDeductionsPaise;

  const totalCreditRevenue = grossSalesPaise + outputGstPaise;
  const netDisbursementPaise = Math.max(0, totalCreditRevenue - totalDebitedToSeller);

  return {
    marketplace,
    settlementId: settlementId || `SETTLE-${Date.now()}`,
    summary: {
      grossSalesPaise,
      salesReturnPaise,
      netSalesPaise,
      outputGstPaise,
      marketplaceFeePaise,
      shippingFeePaise,
      inputGstOnFeesPaise,
      tcsPaise,
      tdsPaise,
      otherDeductionsPaise,
      netDisbursementPaise,
    },
    orderCount,
    refundCount,
    rawBreakdown,
  };
}

/**
 * Ensures system chart of accounts ledgers exist for marketplace e-commerce
 */
export async function ensureMarketplaceLedgers(firmId, clientId, marketplace = "AMAZON") {
  const prefix = marketplace === "FLIPKART" ? "Flipkart" : "Amazon";

  const requiredLedgers = [
    { accountName: `${prefix} Settlement Clearing Account`, accountGroup: "Current_Assets" },
    { accountName: `${prefix} Marketplace Commission Fees`, accountGroup: "Indirect_Expenses" },
    { accountName: `${prefix} Logistics & Shipping Charges`, accountGroup: "Direct_Expenses" },
    { accountName: `Input GST on E-Commerce Fees`, accountGroup: "Duties_and_Taxes" },
    { accountName: `TCS Receivable Under GST (§ 52)`, accountGroup: "Current_Assets" },
    { accountName: `TDS Receivable Under IT (§ 194-O)`, accountGroup: "Current_Assets" },
    { accountName: `E-Commerce Customer Sales Returns`, accountGroup: "Sales_Accounts" },
    { accountName: `Gross E-Commerce Sales Revenue`, accountGroup: "Sales_Accounts" },
    { accountName: `Output GST on E-Commerce Sales`, accountGroup: "Duties_and_Taxes" },
  ];

  const ledgerMap = {};
  for (const item of requiredLedgers) {
    let ledger = await LedgerAccount.findOne({ client: clientId, accountName: item.accountName });
    if (!ledger) {
      ledger = await LedgerAccount.create({
        firm: firmId,
        client: clientId,
        accountName: item.accountName,
        accountGroup: item.accountGroup,
        isSystemDefault: true,
      });
    }
    ledgerMap[item.accountName] = ledger;
  }
  return ledgerMap;
}

/**
 * Auto-generates a balanced double-entry settlement journal voucher.
 * Enforces strict integer paise debit/credit equality.
 */
export async function generateSettlementVoucher({
  firmId,
  clientId,
  settlementId,
  userId,
}) {
  const settlement = await MarketplaceSettlement.findOne({
    firm: firmId,
    client: clientId,
    settlementId,
  });

  if (!settlement) {
    throw new Error("Marketplace settlement record not found.");
  }

  const { summary, marketplace } = settlement;
  const prefix = marketplace === "FLIPKART" ? "Flipkart" : "Amazon";
  const ledgers = await ensureMarketplaceLedgers(firmId, clientId, marketplace);

  const entries = [];

  // 1. DEBITS
  // Net disbursement to clearing/bank account
  if (summary.netDisbursementPaise > 0) {
    entries.push({
      ledgerAccount: ledgers[`${prefix} Settlement Clearing Account`]._id,
      accountName: `${prefix} Settlement Clearing Account`,
      debitAmount: summary.netDisbursementPaise / 100,
      debitAmountPaise: summary.netDisbursementPaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      narration: `Net disbursement for settlement ${settlementId}`,
    });
  }

  // Marketplace commission
  if (summary.marketplaceFeePaise > 0) {
    entries.push({
      ledgerAccount: ledgers[`${prefix} Marketplace Commission Fees`]._id,
      accountName: `${prefix} Marketplace Commission Fees`,
      debitAmount: summary.marketplaceFeePaise / 100,
      debitAmountPaise: summary.marketplaceFeePaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      narration: `Marketplace referral and closing fees`,
    });
  }

  // Logistics & shipping
  if (summary.shippingFeePaise > 0) {
    entries.push({
      ledgerAccount: ledgers[`${prefix} Logistics & Shipping Charges`]._id,
      accountName: `${prefix} Logistics & Shipping Charges`,
      debitAmount: summary.shippingFeePaise / 100,
      debitAmountPaise: summary.shippingFeePaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      narration: `FBA / Logistics delivery charges`,
    });
  }

  // Input GST on marketplace fees
  if (summary.inputGstOnFeesPaise > 0) {
    entries.push({
      ledgerAccount: ledgers[`Input GST on E-Commerce Fees`]._id,
      accountName: `Input GST on E-Commerce Fees`,
      debitAmount: summary.inputGstOnFeesPaise / 100,
      debitAmountPaise: summary.inputGstOnFeesPaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      narration: `Input GST credit on marketplace platform fees`,
    });
  }

  // TCS Receivable under § 52 CGST Act
  if (summary.tcsPaise > 0) {
    entries.push({
      ledgerAccount: ledgers[`TCS Receivable Under GST (§ 52)`]._id,
      accountName: `TCS Receivable Under GST (§ 52)`,
      debitAmount: summary.tcsPaise / 100,
      debitAmountPaise: summary.tcsPaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      narration: `TCS deducted under Section 52 of CGST Act`,
    });
  }

  // TDS Receivable under § 194-O Income Tax Act
  if (summary.tdsPaise > 0) {
    entries.push({
      ledgerAccount: ledgers[`TDS Receivable Under IT (§ 194-O)`]._id,
      accountName: `TDS Receivable Under IT (§ 194-O)`,
      debitAmount: summary.tdsPaise / 100,
      debitAmountPaise: summary.tdsPaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      narration: `TDS deducted under Section 194-O of Income Tax Act`,
    });
  }

  // Customer sales returns
  if (summary.salesReturnPaise > 0) {
    entries.push({
      ledgerAccount: ledgers[`E-Commerce Customer Sales Returns`]._id,
      accountName: `E-Commerce Customer Sales Returns`,
      debitAmount: summary.salesReturnPaise / 100,
      debitAmountPaise: summary.salesReturnPaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      narration: `Customer returns and refunds for settlement`,
    });
  }

  // 2. CREDITS
  // Gross sales revenue
  if (summary.grossSalesPaise > 0) {
    entries.push({
      ledgerAccount: ledgers[`Gross E-Commerce Sales Revenue`]._id,
      accountName: `Gross E-Commerce Sales Revenue`,
      debitAmount: 0,
      debitAmountPaise: 0,
      creditAmount: summary.grossSalesPaise / 100,
      creditAmountPaise: summary.grossSalesPaise,
      narration: `Gross e-commerce sales turnover`,
    });
  }

  // Output GST on sales
  if (summary.outputGstPaise > 0) {
    entries.push({
      ledgerAccount: ledgers[`Output GST on E-Commerce Sales`]._id,
      accountName: `Output GST on E-Commerce Sales`,
      debitAmount: 0,
      debitAmountPaise: 0,
      creditAmount: summary.outputGstPaise / 100,
      creditAmountPaise: summary.outputGstPaise,
      narration: `Output GST collected on e-commerce sales`,
    });
  }

  // Exact mathematical balance verification
  const totalDebitsPaise = entries.reduce((s, e) => s + e.debitAmountPaise, 0);
  const totalCreditsPaise = entries.reduce((s, e) => s + e.creditAmountPaise, 0);

  // If there is any 1 paise rounding drift, adjust in clearing account
  const drift = totalCreditsPaise - totalDebitsPaise;
  if (drift !== 0 && Math.abs(drift) <= 2) {
    const clearingEntry = entries.find((e) => e.accountName.includes("Clearing"));
    if (clearingEntry) {
      clearingEntry.debitAmountPaise += drift;
      clearingEntry.debitAmount = clearingEntry.debitAmountPaise / 100;
    }
  }

  // Final assertion: must be perfectly balanced
  const finalDebits = entries.reduce((s, e) => s + e.debitAmountPaise, 0);
  const finalCredits = entries.reduce((s, e) => s + e.creditAmountPaise, 0);

  if (finalDebits !== finalCredits) {
    throw new Error(
      `Double-entry imbalance: debits (${finalDebits} paise) != credits (${finalCredits} paise). Difference: ${
        finalDebits - finalCredits
      } paise.`
    );
  }

  const voucherNumber = `VOUCH-MKT-${Date.now().toString().slice(-6)}`;
  const voucher = await Voucher.create({
    firm: firmId,
    client: clientId,
    voucherNumber,
    voucherType: "Journal",
    voucherDate: settlement.settlementPeriod?.depositDate || new Date(),
    entries,
    totalAmount: finalDebits / 100,
    totalAmountPaise: finalDebits,
    partyLedgerName: `${prefix} India`,
    referenceNumber: settlementId,
    referenceDate: settlement.settlementPeriod?.depositDate || new Date(),
    narration: `${marketplace} settlement ${settlementId} journal voucher`,
    postedBy: userId,
    status: "Posted",
    approvalWorkflow: { stage: "Approved" },
    rulesApplied: [
      { rule_id: "RULE-GST-005", version: "1.0", status: "VERIFIED" },
      { rule_id: "RULE-TDS-194O", version: "1.0", status: "VERIFIED" },
    ],
  });

  settlement.voucher = voucher._id;
  settlement.status = "VOUCHER_POSTED";
  await settlement.save();

  return { voucher, settlement };
}

/**
 * Matches settlement net disbursement against bank statement credits
 */
export async function reconcileSettlementWithBank({
  firmId,
  clientId,
  settlementId,
  bankTransactionId,
  userId,
}) {
  const settlement = await MarketplaceSettlement.findOne({
    firm: firmId,
    client: clientId,
    settlementId,
  });

  if (!settlement) {
    throw new Error("Settlement record not found.");
  }

  const bankTx = await BankTransaction.findOne({
    _id: bankTransactionId,
    firm: firmId,
    client: clientId,
  });

  if (!bankTx) {
    throw new Error("Bank transaction not found.");
  }

  const settlementPaise = settlement.summary.netDisbursementPaise;
  const bankPaise = bankTx.amountPaise || Math.round((bankTx.amount || 0) * 100);
  const variancePaise = Math.abs(settlementPaise - bankPaise);

  let status = "MATCHED";
  if (variancePaise > 100) {
    status = "DISCREPANCY";
  }

  // Update bank transaction
  bankTx.isReconciled = true;
  bankTx.reconciliationStatus = "Reconciled";
  await bankTx.save();

  // Update settlement
  settlement.reconciliation = {
    status,
    matchedBankTransaction: bankTx._id,
    bankAmountPaise: bankPaise,
    variancePaise,
    reconciledAt: new Date(),
    reconciledBy: userId,
  };
  settlement.status = "RECONCILED";
  await settlement.save();

  return { settlement, bankTx, variancePaise, status };
}

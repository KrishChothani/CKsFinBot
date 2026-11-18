/** @format */

import { toPaise } from "../utils/money.js";
import crypto from "crypto";

/**
 * Parses raw text/CSV rows of marketplace settlement reports
 */
export function parseSettlementCsvRows(csvContent) {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.replace(/["']/g, "").trim().toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
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
 * Deterministically parses Amazon or Flipkart settlement data into exact integer paise.
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

  for (const item of rawData) {
    const cleanType = (
      item.type ||
      item.transaction_type ||
      item["transaction type"] ||
      item["transaction-type"] ||
      ""
    )
      .toUpperCase()
      .replace(/[_\s-]+/g, " ");
    const cleanDesc = (
      item.description ||
      item.amount_description ||
      item["amount description"] ||
      item["amount-description"] ||
      ""
    )
      .toUpperCase()
      .replace(/[_\s-]+/g, " ");
    const amountFloat = parseFloat(item.amount || item.value || 0) || 0;
    const itemPaise = Math.abs(toPaise(amountFloat));

    if (cleanType.includes("REFUND") || cleanDesc.includes("REFUND") || cleanDesc.includes("CUSTOMER RETURN")) {
      refundCount++;
      salesReturnPaise += itemPaise;
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
      orderCount++;
      const taxFloat = parseFloat(item.tax || item.gst || 0) || 0;
      const taxPaise = toPaise(taxFloat);

      grossSalesPaise += itemPaise;
      outputGstPaise += taxPaise;
    }
  }

  // 18% Input GST on fees if not explicitly split by report
  if (inputGstOnFeesPaise === 0 && (marketplaceFeePaise > 0 || shippingFeePaise > 0)) {
    inputGstOnFeesPaise = Math.round((marketplaceFeePaise + shippingFeePaise) * 0.18);
  }

  // 1% TCS Section 52 on net taxable sales if not explicitly provided
  const netTaxablePaise = Math.max(0, grossSalesPaise - salesReturnPaise);
  if (tcsPaise === 0 && netTaxablePaise > 0) {
    tcsPaise = Math.round(netTaxablePaise * 0.01);
  }

  // 1% TDS Section 194-O on gross sales if not explicitly provided
  if (tdsPaise === 0 && grossSalesPaise > 0) {
    tdsPaise = Math.round(grossSalesPaise * 0.01);
  }

  const netSalesPaise = grossSalesPaise - salesReturnPaise;

  const totalDeductionsPaise =
    salesReturnPaise +
    marketplaceFeePaise +
    shippingFeePaise +
    inputGstOnFeesPaise +
    tcsPaise +
    tdsPaise +
    otherDeductionsPaise;

  const totalCreditRevenuePaise = grossSalesPaise + outputGstPaise;
  const netDisbursementPaise = Math.max(0, totalCreditRevenuePaise - totalDeductionsPaise);

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
  };
}

/**
 * Builds balanced double-entry settlement journal entries.
 */
export function buildBalancedSettlementVoucher(parsedReport, { firmId, clientId }) {
  const { marketplace, settlementId, summary } = parsedReport;
  const prefix = marketplace === "FLIPKART" ? "Flipkart" : "Amazon";

  const lines = [];
  let order = 1;

  // Debit: Clearing Account (Net Bank Disbursement)
  if (summary.netDisbursementPaise > 0) {
    lines.push({
      accountName: `${prefix} Settlement Clearing Account`,
      entryType: "DEBIT",
      amountPaise: summary.netDisbursementPaise,
      lineOrder: order++,
    });
  }

  // Debit: Commission Expense
  if (summary.marketplaceFeePaise > 0) {
    lines.push({
      accountName: `${prefix} Marketplace Commission`,
      entryType: "DEBIT",
      amountPaise: summary.marketplaceFeePaise,
      lineOrder: order++,
    });
  }

  // Debit: Logistics & Shipping Expense
  if (summary.shippingFeePaise > 0) {
    lines.push({
      accountName: `${prefix} Shipping & Logistics Expense`,
      entryType: "DEBIT",
      amountPaise: summary.shippingFeePaise,
      lineOrder: order++,
    });
  }

  // Debit: Input GST on Services (18%)
  if (summary.inputGstOnFeesPaise > 0) {
    lines.push({
      accountName: `Input GST on Marketplace Fees`,
      entryType: "DEBIT",
      amountPaise: summary.inputGstOnFeesPaise,
      lineOrder: order++,
    });
  }

  // Debit: TCS Receivable § 52 (1%)
  if (summary.tcsPaise > 0) {
    lines.push({
      accountName: `TCS Receivable u/s 52 (${prefix})`,
      entryType: "DEBIT",
      amountPaise: summary.tcsPaise,
      lineOrder: order++,
    });
  }

  // Debit: TDS Receivable § 194-O (1%)
  if (summary.tdsPaise > 0) {
    lines.push({
      accountName: `TDS Receivable u/s 194-O (${prefix})`,
      entryType: "DEBIT",
      amountPaise: summary.tdsPaise,
      lineOrder: order++,
    });
  }

  // Debit: Sales Returns / Refunds
  if (summary.salesReturnPaise > 0) {
    lines.push({
      accountName: `E-Commerce Sales Return & Refunds`,
      entryType: "DEBIT",
      amountPaise: summary.salesReturnPaise,
      lineOrder: order++,
    });
  }

  // Credit: Gross E-Commerce Sales Revenue
  if (summary.grossSalesPaise > 0) {
    lines.push({
      accountName: `E-Commerce Gross Sales Revenue`,
      entryType: "CREDIT",
      amountPaise: summary.grossSalesPaise,
      lineOrder: order++,
    });
  }

  // Credit: Output GST on Sales
  if (summary.outputGstPaise > 0) {
    lines.push({
      accountName: `Output GST on E-Commerce Sales`,
      entryType: "CREDIT",
      amountPaise: summary.outputGstPaise,
      lineOrder: order++,
    });
  }

  // Verify Double-Entry Balance: SUM Debits === SUM Credits
  const totalDebits = lines.filter((l) => l.entryType === "DEBIT").reduce((acc, l) => acc + l.amountPaise, 0);
  const totalCredits = lines.filter((l) => l.entryType === "CREDIT").reduce((acc, l) => acc + l.amountPaise, 0);

  if (totalDebits !== totalCredits) {
    // If fractional paise rounding divergence exists, add exact round-off balancing line
    const delta = totalCredits - totalDebits;
    if (Math.abs(delta) <= 100) {
      lines.push({
        accountName: `Round Off Account`,
        entryType: delta > 0 ? "DEBIT" : "CREDIT",
        amountPaise: Math.abs(delta),
        lineOrder: order++,
      });
    } else {
      throw new Error(`Double-Entry Balance Invariant Violated: Debits (${totalDebits}) != Credits (${totalCredits}).`);
    }
  }

  return {
    voucherId: crypto.randomUUID(),
    voucherNumber: `MKT-${marketplace.substring(0, 3)}-${Date.now().toString().slice(-4)}`,
    voucherType: "Journal",
    settlementId,
    marketplace,
    lines,
    totalAmountPaise: totalCredits,
    isBalanced: true,
  };
}

export default {
  parseSettlementCsvRows,
  parseMarketplaceReport,
  buildBalancedSettlementVoucher,
};

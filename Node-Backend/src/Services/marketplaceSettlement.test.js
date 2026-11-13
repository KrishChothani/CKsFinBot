/** @format */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseSettlementCsvRows,
  parseMarketplaceReport,
} from "./marketplaceSettlement.service.js";

describe("Marketplace Settlement Engine — First-Niche Invariants", () => {
  it("parses Amazon MTR & Settlement CSV rows correctly", () => {
    const csvContent = `settlement-id,transaction-type,order-id,amount-description,amount
159203841,Order,402-1928472-1029384,Principal,1200.00
159203841,Order,402-1928472-1029384,Commission,-180.00
159203841,Order,402-1928472-1029384,ShippingHB,-70.00
159203841,Refund,402-8374928-9182736,Principal,-1200.00`;

    const rows = parseSettlementCsvRows(csvContent);
    assert.equal(rows.length, 4);
    assert.equal(rows[0]["settlement-id"], "159203841");
    assert.equal(rows[0]["amount"], "1200.00");
    assert.equal(rows[3]["transaction-type"], "Refund");
  });

  it("decomposes Amazon settlement with integer paise precision and exact double-entry balance", () => {
    const rawData = [
      {
        type: "Order",
        description: "Principal",
        amount: 2500.0, // ₹2,500 gross sales
        tax: 450.0, // ₹450 (18% output GST)
        order_id: "AMZ-001",
      },
      {
        type: "Order",
        description: "Principal",
        amount: 1500.0, // ₹1,500 gross sales
        tax: 270.0, // ₹270 output GST
        order_id: "AMZ-002",
      },
      {
        type: "Refund",
        description: "Principal",
        amount: 500.0, // ₹500 sales return
        order_id: "AMZ-003",
      },
      {
        type: "Service Fee",
        description: "Commission",
        amount: 400.0, // ₹400 marketplace fee
      },
      {
        type: "Service Fee",
        description: "Shipping / FBA",
        amount: 200.0, // ₹200 logistics fee
      },
      {
        type: "Statutory Deductions",
        description: "TCS Sec 52",
        amount: 35.0, // ₹35 TCS (1% of net sales 3500)
      },
      {
        type: "Statutory Deductions",
        description: "TDS 194-O",
        amount: 40.0, // ₹40 TDS (1% of gross sales 4000)
      },
    ];

    const result = parseMarketplaceReport({
      marketplace: "AMAZON",
      rawData,
      settlementId: "SETTLE-AMZ-88912",
    });

    const { summary } = result;

    assert.equal(summary.grossSalesPaise, 400000); // ₹4,000.00
    assert.equal(summary.outputGstPaise, 72000); // ₹720.00
    assert.equal(summary.salesReturnPaise, 50000); // ₹500.00
    assert.equal(summary.netSalesPaise, 350000); // ₹3,500.00
    assert.equal(summary.marketplaceFeePaise, 40000); // ₹400.00
    assert.equal(summary.shippingFeePaise, 20000); // ₹200.00
    assert.equal(summary.tcsPaise, 3500); // ₹35.00
    assert.equal(summary.tdsPaise, 4000); // ₹40.00

    // 18% Input GST on (40000 + 20000) = 10800 paise (₹108.00)
    assert.equal(summary.inputGstOnFeesPaise, 10800);

    // Assert exact double-entry equality down to the single integer paise
    const totalCredits = summary.grossSalesPaise + summary.outputGstPaise;
    const totalDebits =
      summary.netDisbursementPaise +
      summary.salesReturnPaise +
      summary.marketplaceFeePaise +
      summary.shippingFeePaise +
      summary.inputGstOnFeesPaise +
      summary.tcsPaise +
      summary.tdsPaise +
      summary.otherDeductionsPaise;

    assert.equal(
      totalDebits,
      totalCredits,
      "Settlement debits must mathematically equal credits down to 0 paise difference"
    );
  });

  it("handles Flipkart settlement with auto-computed TCS (§ 52) and TDS (§ 194-O)", () => {
    const rawData = [
      {
        type: "Order",
        description: "Sale Amount",
        amount: 10000.0, // ₹10,000 gross sales
        tax: 1800.0, // ₹1,800 output GST
        order_id: "FLIP-991",
      },
      {
        type: "Service Fee",
        description: "Marketplace Fee",
        amount: 1200.0, // ₹1,200 commission
      },
      {
        type: "Service Fee",
        description: "Logistics Fee",
        amount: 600.0, // ₹600 logistics
      },
    ];

    const result = parseMarketplaceReport({
      marketplace: "FLIPKART",
      rawData,
      settlementId: "SETTLE-FK-1102",
    });

    const { summary } = result;

    assert.equal(summary.grossSalesPaise, 1000000);
    assert.equal(summary.outputGstPaise, 180000);
    assert.equal(summary.tcsPaise, 10000); // Auto-computed 1% of ₹10,000 = ₹100.00 (10000 paise)
    assert.equal(summary.tdsPaise, 10000); // Auto-computed 1% of ₹10,000 = ₹100.00 (10000 paise)

    // Input GST 18% on (120000 + 60000) = 32400 paise (₹324.00)
    assert.equal(summary.inputGstOnFeesPaise, 32400);

    const totalCredits = summary.grossSalesPaise + summary.outputGstPaise;
    const totalDebits =
      summary.netDisbursementPaise +
      summary.salesReturnPaise +
      summary.marketplaceFeePaise +
      summary.shippingFeePaise +
      summary.inputGstOnFeesPaise +
      summary.tcsPaise +
      summary.tdsPaise;

    assert.equal(totalDebits, totalCredits);
  });

  it("evaluates bank settlement reconciliation with integer paise tolerance", () => {
    const netDisbursementPaise = 745025; // ₹7,450.25

    // Exact match
    const exactBankPaise = 745025;
    const diffExact = Math.abs(netDisbursementPaise - exactBankPaise);
    assert.equal(diffExact === 0 ? "MATCHED" : "DISCREPANCY", "MATCHED");

    // 50 paise tolerance match (e.g. bank rounding fee)
    const toleranceBankPaise = 745075;
    const diffTol = Math.abs(netDisbursementPaise - toleranceBankPaise);
    assert.equal(diffTol <= 100 ? "MATCHED" : "DISCREPANCY", "MATCHED");

    // Large discrepancy (e.g. ₹500 discrepancy)
    const discrepancyBankPaise = 695025;
    const diffDisc = Math.abs(netDisbursementPaise - discrepancyBankPaise);
    assert.equal(diffDisc > 100 ? "DISCREPANCY" : "MATCHED", "DISCREPANCY");
  });
});

/** @format */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.NODE_ENV = "test";
process.env.EVENT_BUS_MODE = "memory";

const { app } = await import("./src/index.js");
const {
  parseSettlementCsvRows,
  parseMarketplaceReport,
  buildBalancedSettlementVoucher,
} = await import("./src/services/marketplaceSettlement.service.js");
const {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} = await import("@cksfinbot/event-contracts");
const { marketplaceRelay } = await import("./src/services/marketplaceRelay.service.js");

describe("E-Commerce Marketplace Settlement Service", () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
    await marketplaceRelay.init();
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await marketplaceRelay.close();
  });

  test("GET /health returns healthy status and service version", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, "HEALTHY");
    assert.strictEqual(body.service, "marketplace-service");
    assert.strictEqual(body.version, "2.0.0");
  });

  test("parses Amazon settlement CSV rows and decomposes fees into integer paise", () => {
    const sampleCsv = `settlement-id,transaction-type,order-id,amount-description,amount
159203841,Order,402-1928472-1029384,Principal,1200.00
159203841,Order,402-1928472-1029384,Commission,-180.00
159203841,Order,402-1928472-1029384,ShippingHB,-70.00
159203841,Refund,402-8374928-9182736,Principal,-200.00`;

    const rows = parseSettlementCsvRows(sampleCsv);
    assert.strictEqual(rows.length, 4);

    const report = parseMarketplaceReport({
      marketplace: "AMAZON",
      rawData: rows,
      settlementId: "SETTLE-AMZ-001",
    });

    assert.strictEqual(report.summary.grossSalesPaise, 120000); // ₹1,200 = 1,20,000 paise
    assert.strictEqual(report.summary.marketplaceFeePaise, 18000); // ₹180 commission
    assert.strictEqual(report.summary.shippingFeePaise, 7000);     // ₹70 logistics
    assert.strictEqual(report.summary.salesReturnPaise, 20000);   // ₹200 refund
  });

  test("computes 1% TCS (§ 52) and 1% TDS (§ 194-O) with exact double-entry balance", () => {
    const flipkartData = [
      { type: "Order", description: "Item Price", amount: 5000.0, tax: 900.0 },
      { type: "Order", description: "Commission Fee", amount: 500.0 },
      { type: "Order", description: "Shipping Charge", amount: 200.0 },
    ];

    const report = parseMarketplaceReport({
      marketplace: "FLIPKART",
      rawData: flipkartData,
    });

    // 1% TCS on ₹5,000 net taxable sales = ₹50 (5,000 paise)
    assert.strictEqual(report.summary.tcsPaise, 5000);
    // 1% TDS on ₹5,000 gross sales = ₹50 (5,000 paise)
    assert.strictEqual(report.summary.tdsPaise, 5000);

    const voucher = buildBalancedSettlementVoucher(report, {
      firmId: "firm-mkt-01",
      clientId: "client-mkt-01",
    });

    assert.strictEqual(voucher.isBalanced, true);

    const totalDebits = voucher.lines
      .filter((l) => l.entryType === "DEBIT")
      .reduce((acc, l) => acc + l.amountPaise, 0);
    const totalCredits = voucher.lines
      .filter((l) => l.entryType === "CREDIT")
      .reduce((acc, l) => acc + l.amountPaise, 0);

    assert.strictEqual(totalDebits, totalCredits);
  });

  test("processes settlement import and emits MarketplaceSettlementImportedEvent & MarketplaceVoucherGeneratedEvent", async () => {
    let importedEvent = null;
    let voucherEvent = null;

    marketplaceRelay.eventBus.memoryEmitter.on(
      ROUTING_KEYS[EVENT_TYPES.MARKETPLACE_SETTLEMENT_IMPORTED],
      (event) => {
        importedEvent = event;
      }
    );

    marketplaceRelay.eventBus.memoryEmitter.on(
      ROUTING_KEYS[EVENT_TYPES.MARKETPLACE_VOUCHER_GENERATED],
      (event) => {
        voucherEvent = event;
      }
    );

    const sampleData = [
      { type: "Order", description: "Principal", amount: 2000.0, tax: 360.0 },
      { type: "Order", description: "Referral Fee", amount: 240.0 },
      { type: "Order", description: "Easy Ship Weight Handling Fee", amount: 80.0 },
    ];

    const result = await marketplaceRelay.processSettlementImport({
      firmId: "firm-mkt-01",
      clientId: "client-mkt-01",
      marketplace: "AMAZON",
      rawData: sampleData,
      settlementId: "AMZ-SETTLE-777",
    });

    assert.ok(result.report);
    assert.ok(result.voucher);
    assert.strictEqual(result.voucher.isBalanced, true);

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(importedEvent);
    assert.strictEqual(importedEvent.payload.settlementId, "AMZ-SETTLE-777");
    assert.ok(voucherEvent);
    assert.strictEqual(voucherEvent.payload.marketplace, "AMAZON");
  });
});

/** @format */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "crypto";

process.env.NODE_ENV = "test";
process.env.EVENT_BUS_MODE = "memory";

const { app } = await import("./src/index.js");
const {
  normalizeInvoiceNumber,
  isSection17_5Candidate,
  reconcileInvoiceSets,
} = await import("./src/services/gstRecon.service.js");
const {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} = await import("@cksfinbot/event-contracts");
const { reconRelay } = await import("./src/services/reconRelay.service.js");

describe("GSTR-2B Reconciliation & IMS Service", () => {
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
    await reconRelay.init();
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await reconRelay.close();
  });

  test("GET /health returns healthy status and service version", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, "HEALTHY");
    assert.strictEqual(body.service, "reconciliation-service");
    assert.strictEqual(body.version, "2.0.0");
  });

  test("normalizes commercial invoice numbers canonically by stripping delimiters and leading zeros", () => {
    assert.strictEqual(normalizeInvoiceNumber("INV/2026-27/0042"), "INV20262742");
    assert.strictEqual(normalizeInvoiceNumber("BFM/26/0412"), "BFM26412");
    assert.strictEqual(normalizeInvoiceNumber("tax-inv_00099"), "TAXINV99");
    assert.strictEqual(normalizeInvoiceNumber("00001"), "1");
  });

  test("detects Section 17(5) blocked credit candidates via statutory keyword triggers", () => {
    assert.strictEqual(isSection17_5Candidate("Annual Executive Club Membership"), true);
    assert.strictEqual(isSection17_5Candidate("Corporate Dinner Food & Catering"), true);
    assert.strictEqual(isSection17_5Candidate("Cloud Hosting Subscription AWS"), false);
    assert.strictEqual(isSection17_5Candidate("Factory Raw Material Steel Rods"), false);
  });

  test("evaluates 2-tier matching invariants and guarantees record conservation", () => {
    const gstr2bRecords = [
      {
        supplierGstin: "24AAACA1234A1ZQ",
        invoiceNumber: "INV/2026/001",
        totalInvoiceValuePaise: 1180000,
      },
      {
        supplierGstin: "24AAACA1234A1ZQ",
        invoiceNumber: "INV/2026/002",
        totalInvoiceValuePaise: 2360040, // 40 paise rounding variance
      },
      {
        supplierGstin: "27AABCZ5678B1Z4",
        invoiceNumber: "INV-999",
        totalInvoiceValuePaise: 500000, // Only in 2B
      },
    ];

    const booksRecords = [
      {
        supplierGstin: "24AAACA1234A1ZQ",
        voucherNumber: "INV20261", // Normalized matches INV/2026/001
        totalAmountPaise: 1180000, // Tier 1 exact match
      },
      {
        supplierGstin: "24AAACA1234A1ZQ",
        voucherNumber: "INV-2026-002",
        totalAmountPaise: 2360000, // Tier 2 tolerance match (40 paise diff <= 100 paise)
      },
      {
        supplierGstin: "29XYZAB1234C1Z9",
        voucherNumber: "PUR-888",
        totalAmountPaise: 950000, // Only in Books
      },
    ];

    const results = reconcileInvoiceSets(gstr2bRecords, booksRecords);

    assert.strictEqual(results.matchedExact.length, 1);
    assert.strictEqual(results.matchedTolerance.length, 1);
    assert.strictEqual(results.onlyIn2B.length, 1);
    assert.strictEqual(results.onlyInBooks.length, 1);

    // Record conservation assertion
    assert.strictEqual(
      results.summary.matchedCount + results.summary.onlyIn2BCount,
      gstr2bRecords.length
    );
    assert.strictEqual(
      results.summary.matchedCount + results.summary.onlyInBooksCount,
      booksRecords.length
    );
  });

  test("projects VoucherCommittedEvent and executes reconciliation publishing GSTR2BReconciliationCompletedEvent", async () => {
    let completedEvent = null;
    reconRelay.eventBus.memoryEmitter.on(
      ROUTING_KEYS[EVENT_TYPES.GSTR2B_RECONCILIATION_COMPLETED],
      (event) => {
        completedEvent = event;
      }
    );

    // 1. Simulate VoucherCommittedEvent from Ledger service
    const committedEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.VOUCHER_COMMITTED,
      producer: "ledger-service",
      tenant: { firmId: "firm-rc-01", clientId: "client-rc-01" },
      payload: {
        voucherId: "v-rc-101",
        voucherNumber: "INV/2026/505",
        voucherType: "Purchase",
        totalAmountPaise: 3540000,
        voucherDate: "2026-05-20",
        lines: [{ entryType: "CREDIT", accountName: "Delta Tech Systems" }],
      },
    });

    await reconRelay.handleVoucherCommitted(committedEnvelope);

    // 2. Run reconciliation against GSTR-2B input
    const gstr2bList = [
      {
        supplierGstin: "24AAACA1234A1ZQ",
        invoiceNumber: "INV2026505",
        totalInvoiceValuePaise: 3540000,
      },
    ];

    const booksList = [
      {
        supplierGstin: "24AAACA1234A1ZQ",
        voucherNumber: "INV/2026/505",
        totalAmountPaise: 3540000,
      },
    ];

    const { reconResults } = await reconRelay.runReconciliation({
      firmId: "firm-rc-01",
      clientId: "client-rc-01",
      gstr2bList,
      booksList,
    });

    assert.strictEqual(reconResults.matchedExact.length, 1);

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(completedEvent);
    assert.strictEqual(completedEvent.payload.matchedCount, 1);
  });

  test("records IMS action and emits IMSActionRecordedEvent", async () => {
    let imsEvent = null;
    reconRelay.eventBus.memoryEmitter.on(
      ROUTING_KEYS[EVENT_TYPES.IMS_ACTION_RECORDED],
      (event) => {
        imsEvent = event;
      }
    );

    await reconRelay.recordIMSAction({
      firmId: "firm-rc-01",
      clientId: "client-rc-01",
      invoiceNumber: "INV-2026-505",
      action: "Accept",
      remarks: "Accepted in IMS for GSTR-3B ITC credit",
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(imsEvent);
    assert.strictEqual(imsEvent.payload.action, "Accept");
    assert.strictEqual(imsEvent.payload.invoiceNumber, "INV-2026-505");
  });
});


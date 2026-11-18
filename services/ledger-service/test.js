/** @format */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "crypto";

process.env.NODE_ENV = "test";
process.env.EVENT_BUS_MODE = "memory";

const { app } = await import("./src/index.js");
const {
  assertDoubleEntryBalance,
  createPurchaseVoucher,
  approveVoucherWorkflow,
} = await import("./src/services/ledger.service.js");
const {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} = await import("@cksfinbot/event-contracts");
const { ledgerRelay } = await import("./src/services/ledgerRelay.service.js");

describe("Double-Entry Ledger & Voucher Service", () => {
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
    await ledgerRelay.init();
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await ledgerRelay.close();
  });

  test("GET /health returns healthy status and service version", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, "HEALTHY");
    assert.strictEqual(body.service, "ledger-service");
    assert.strictEqual(body.version, "2.0.0");
  });

  test("enforces strict double-entry balance in integer paise (SUM Debits === SUM Credits)", () => {
    const balancedLines = [
      { accountId: "p1", accountName: "Purchases", entryType: "DEBIT", amountPaise: 1000000 },
      { accountId: "c1", accountName: "Input CGST", entryType: "DEBIT", amountPaise: 90000 },
      { accountId: "s1", accountName: "Input SGST", entryType: "DEBIT", amountPaise: 90000 },
      { accountId: "v1", accountName: "Vendor Payable", entryType: "CREDIT", amountPaise: 1180000 },
    ];

    const result = assertDoubleEntryBalance(balancedLines);
    assert.strictEqual(result.isBalanced, true);
    assert.strictEqual(result.totalPaise, 1180000);

    // Unbalanced lines: Debits (11,80,000) != Credits (11,00,000)
    const unbalancedLines = [
      { accountId: "p1", accountName: "Purchases", entryType: "DEBIT", amountPaise: 1000000 },
      { accountId: "c1", accountName: "Input CGST", entryType: "DEBIT", amountPaise: 90000 },
      { accountId: "s1", accountName: "Input SGST", entryType: "DEBIT", amountPaise: 90000 },
      { accountId: "v1", accountName: "Vendor Payable", entryType: "CREDIT", amountPaise: 1100000 },
    ];

    assert.throws(
      () => assertDoubleEntryBalance(unbalancedLines),
      /Double-Entry Invariant Violated/
    );
  });

  test("rejects voucher creation when subTotal + taxes != grandTotal in integer paise", async () => {
    await assert.rejects(
      async () => {
        await createPurchaseVoucher({
          firmId: "firm-001",
          clientId: "client-001",
          summary: {
            subTotalPaise: 1000000,
            totalCgstPaise: 90000,
            totalSgstPaise: 90000,
            totalIgstPaise: 0,
            roundOffPaise: 0,
            grandTotalPaise: 1200000, // Invalid: 10,00,000 + 1,80,000 = 11,80,000, but says 12,00,000
          },
        });
      },
      /Arithmetic mismatch/
    );
  });

  test("enforces Maker-Checker dual control: Author cannot approve their own voucher", async () => {
    const voucher = await createPurchaseVoucher({
      firmId: "firm-001",
      clientId: "client-001",
      counterPartyName: "Tech Solutions Pvt Ltd",
      summary: {
        subTotalPaise: 2000000,
        totalCgstPaise: 180000,
        totalSgstPaise: 180000,
        totalIgstPaise: 0,
        roundOffPaise: 0,
        grandTotalPaise: 2360000,
      },
      createdBy: "accountant-maker-42",
    });

    // 1. Author attempts to self-approve: MUST FAIL
    await assert.rejects(
      async () => {
        await approveVoucherWorkflow({
          firmId: "firm-001",
          voucherId: voucher.id,
          userId: "accountant-maker-42", // Same author
          userRole: "Senior_CA",
        });
      },
      /Maker-Checker dual control violation: Author cannot approve their own voucher/
    );

    // 2. Independent checker approves: MUST SUCCEED
    const approved = await approveVoucherWorkflow({
      firmId: "firm-001",
      voucherId: voucher.id,
      userId: "partner-checker-99", // Different user
      userRole: "Firm_Admin",
      remarks: "Verified tax breakdown and counterparty GSTIN",
    });

    assert.strictEqual(approved.isPosted, true);
    assert.strictEqual(approved.postedBy, "partner-checker-99");
  });

  test("processes DocumentValidatedEvent, drafts voucher, and emits VoucherCommittedEvent on approval", async () => {
    let committedEnvelope = null;
    ledgerRelay.eventBus.memoryEmitter.on(
      ROUTING_KEYS[EVENT_TYPES.VOUCHER_COMMITTED],
      (event) => {
        committedEnvelope = event;
      }
    );

    const validatedEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.DOCUMENT_VALIDATED,
      producer: "validation-service",
      tenant: { firmId: "firm-ledger-01", clientId: "client-ledger-01" },
      payload: {
        documentId: "doc-auto-001",
        invoiceData: {
          supplierName: "Apex Cloud Services Ltd",
          financialSummary: {
            subTotalPaise: 5000000,
            totalCgstPaise: 450000,
            totalSgstPaise: 450000,
            totalIgstPaise: 0,
            roundOffPaise: 0,
            grandTotalPaise: 5900000,
          },
        },
      },
    });

    // 1. Process validated document
    const result = await ledgerRelay.processValidatedDocument(validatedEnvelope);
    assert.ok(result.voucher);
    assert.strictEqual(result.voucher.totalAmountPaise, 5900000);
    assert.strictEqual(result.voucher.isPosted, false);

    // 2. Senior CA approves the drafted voucher
    const commitResult = await ledgerRelay.approveAndCommitVoucher({
      firmId: "firm-ledger-01",
      voucherId: result.voucher.id,
      userId: "senior-ca-reviewer",
      userRole: "Senior_CA",
      remarks: "Statutory checks and double-entry verified",
    });

    assert.strictEqual(commitResult.voucher.isPosted, true);

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(committedEnvelope);
    assert.strictEqual(committedEnvelope.payload.voucherId, result.voucher.id);
    assert.strictEqual(committedEnvelope.payload.totalAmountPaise, 5900000);
    assert.strictEqual(committedEnvelope.payload.isPosted, true);
  });
});


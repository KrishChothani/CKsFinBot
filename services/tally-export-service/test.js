/** @format */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.NODE_ENV = "test";
process.env.EVENT_BUS_MODE = "memory";

const { app } = await import("./src/index.js");
const {
  formatTallyDate,
  escapeXml,
  buildTallyXmlEnvelope,
} = await import("./src/services/tallyExport.service.js");
const { validateTallyXml } = await import("./src/services/tallyLinter.service.js");
const {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} = await import("@cksfinbot/event-contracts");
const { exportRelay } = await import("./src/services/exportRelay.service.js");

describe("ERP & TallyPrime Export Service", () => {
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
    await exportRelay.init();
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await exportRelay.close();
  });

  test("GET /health returns healthy status and service version", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, "HEALTHY");
    assert.strictEqual(body.service, "tally-export-service");
    assert.strictEqual(body.version, "2.0.0");
  });

  test("formats dates into Tally standard YYYYMMDD and escapes XML safely", () => {
    const testDate = new Date("2026-04-15T00:00:00.000Z");
    assert.strictEqual(formatTallyDate(testDate), "20260415");
    assert.strictEqual(escapeXml("M/S Smith & Jones <Pvt Ltd>"), "M/S Smith &amp; Jones &lt;Pvt Ltd&gt;");
  });

  test("generates compliant, balanced Tally XML with correct debits (negative) and credits (positive)", () => {
    const sampleVoucher = {
      voucherNumber: "PUR-2026-001",
      voucherType: "Purchase",
      voucherDate: new Date("2026-04-20"),
      partyLedgerName: "Gujarat Tech Suppliers",
      narration: "Cloud hosting and maintenance",
      entries: [
        { accountName: "General Purchase Account", debitAmountPaise: 1000000, creditAmountPaise: 0 },
        { accountName: "Input CGST", debitAmountPaise: 90000, creditAmountPaise: 0 },
        { accountName: "Input SGST", debitAmountPaise: 90000, creditAmountPaise: 0 },
        { accountName: "Gujarat Tech Suppliers", debitAmountPaise: 0, creditAmountPaise: 1180000 },
      ],
    };

    const { xml, validation: lint } = buildTallyXmlEnvelope([sampleVoucher], "Acme Enterprises");

    assert.strictEqual(lint.isValid, true);
    assert.strictEqual(lint.errors.length, 0);
    assert.strictEqual(lint.voucherCount, 1);
  });

  test("schema linter rejects unbalanced vouchers and polarity violations", () => {
    const brokenXml = `<ENVELOPE>
      <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
      <BODY>
        <IMPORTDATA>
          <REQUESTDESC><STATICVARIABLES><SVCURRENTCOMPANY>Test</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC>
          <REQUESTDATA>
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
              <VOUCHER VCHTYPE="Purchase" ACTION="Create">
                <DATE>20260420</DATE>
                <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
                <VOUCHERNUMBER>PUR-BAD-01</VOUCHERNUMBER>
                <ALLLEDGERENTRIES.LIST>
                  <LEDGERNAME>Purchases</LEDGERNAME>
                  <AMOUNT>-1000.00</AMOUNT>
                </ALLLEDGERENTRIES.LIST>
                <ALLLEDGERENTRIES.LIST>
                  <LEDGERNAME>Supplier</LEDGERNAME>
                  <AMOUNT>900.00</AMOUNT>
                </ALLLEDGERENTRIES.LIST>
              </VOUCHER>
            </TALLYMESSAGE>
          </REQUESTDATA>
        </IMPORTDATA>
      </BODY>
    </ENVELOPE>`;

    const lint = validateTallyXml(brokenXml);
    assert.strictEqual(lint.isValid, false);
    assert.ok(lint.errors.some((e) => e.includes("Double-entry balance violation")));
  });

  test("processes VoucherCommittedEvent, generates export, and emits TallyExportGeneratedEvent", async () => {
    let exportEvent = null;
    exportRelay.eventBus.memoryEmitter.on(
      ROUTING_KEYS[EVENT_TYPES.TALLY_EXPORT_GENERATED],
      (event) => {
        exportEvent = event;
      }
    );

    const committedEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.VOUCHER_COMMITTED,
      producer: "ledger-service",
      tenant: { firmId: "firm-exp-01", clientId: "client-exp-01" },
      payload: {
        voucherId: "v-exp-001",
        voucherNumber: "PUR-2026-555",
        voucherType: "Purchase",
        voucherDate: "2026-05-15",
        totalAmountPaise: 2360000,
        lines: [
          { accountName: "Purchases", entryType: "DEBIT", amountPaise: 2000000 },
          { accountName: "Input CGST", entryType: "DEBIT", amountPaise: 180000 },
          { accountName: "Input SGST", entryType: "DEBIT", amountPaise: 180000 },
          { accountName: "Apex Vendor", entryType: "CREDIT", amountPaise: 2360000 },
        ],
      },
    });

    await exportRelay.handleVoucherCommitted(committedEnvelope);

    const result = await exportRelay.exportVouchers({
      firmId: "firm-exp-01",
      clientId: "client-exp-01",
      companyName: "Apex Manufacturing India",
    });

    assert.ok(result.xmlString);
    assert.strictEqual(result.lintResult.isValid, true);

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(exportEvent);
    assert.strictEqual(exportEvent.payload.companyName, "Apex Manufacturing India");
    assert.strictEqual(exportEvent.payload.vouchersExportedCount, 1);
  });
});

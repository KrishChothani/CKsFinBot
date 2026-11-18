/** @format */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.NODE_ENV = "test";
process.env.EVENT_BUS_MODE = "memory";

const { app } = await import("./src/index.js");
const { evaluateVoucherTaxRisks } = await import("./src/services/taxAdvisory.service.js");
const { generateComplianceCalendar } = await import("./src/services/compliance.service.js");
const {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} = await import("@cksfinbot/event-contracts");
const { taxRelay } = await import("./src/services/taxRelay.service.js");

describe("Statutory Tax Advisory & MSME Service", () => {
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
    await taxRelay.init();
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await taxRelay.close();
  });

  test("GET /health returns healthy status and service version", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, "HEALTHY");
    assert.strictEqual(body.service, "tax-advisory-service");
    assert.strictEqual(body.version, "2.0.0");
  });

  test("flags Section 40A(3) cash expenditure limit disallowance when cash payment exceeds ₹10,000", () => {
    const cashVoucher = {
      voucherNumber: "PAY-0042",
      totalAmountPaise: 2500000, // ₹25,000
      lines: [
        { accountName: "Office Renovation Expense", entryType: "DEBIT", amountPaise: 2500000 },
        { accountName: "Petty Cash Account", entryType: "CREDIT", amountPaise: 2500000 },
      ],
    };

    const evaluation = evaluateVoucherTaxRisks(cashVoucher);
    assert.strictEqual(evaluation.hasTaxRisks, true);

    const cashRisk = evaluation.flags.find((f) => f.ruleId === "SEC_40A3");
    assert.ok(cashRisk);
    assert.strictEqual(cashRisk.severity, "Danger");
    assert.strictEqual(cashRisk.disallowancePaise, 2500000);
  });

  test("flags Section 40(a)(ia) 30% expenditure disallowance when TDS on professional fees is omitted", () => {
    const legalConsultingVoucher = {
      voucherNumber: "PUR-1090",
      totalAmountPaise: 10000000, // ₹1,00,000
      narration: "Legal and Technical Consultancy Charges",
      lines: [
        { accountName: "Legal & Professional Fees", entryType: "DEBIT", amountPaise: 10000000 },
        { accountName: "Advocate Sharma & Associates", entryType: "CREDIT", amountPaise: 10000000 },
      ],
    };

    const evaluation = evaluateVoucherTaxRisks(legalConsultingVoucher);
    assert.strictEqual(evaluation.hasTaxRisks, true);

    const tdsRisk = evaluation.flags.find((f) => f.ruleId === "TDS_194J");
    assert.ok(tdsRisk);
    assert.strictEqual(tdsRisk.severity, "Warning");
    // 30% of ₹1,00,000 = ₹30,000 (30,00,000 paise)
    assert.strictEqual(tdsRisk.disallowancePaise, 3000000);
  });

  test("flags Section 43B(h) overdue disallowance for overdue MSME vendor payments", () => {
    // 60 days old invoice for an MSME vendor
    const pastDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const msmeVoucher = {
      voucherNumber: "PUR-MSME-01",
      voucherDate: pastDate.toISOString(),
      totalAmountPaise: 5000000,
      isMsmeVendor: true,
      creditPeriodDays: 30,
      lines: [
        { accountName: "Micro Parts Fabricators", entryType: "CREDIT", amountPaise: 5000000 },
      ],
    };

    const evaluation = evaluateVoucherTaxRisks(msmeVoucher);
    const msmeRisk = evaluation.flags.find((f) => f.ruleId === "MSME_SEC_43BH_OVERDUE");
    assert.ok(msmeRisk);
    assert.strictEqual(msmeRisk.severity, "Danger");
  });

  test("processes VoucherCommittedEvent and publishes TaxRiskDetectedEvent", async () => {
    let publishedRiskEvent = null;
    taxRelay.eventBus.memoryEmitter.on(
      ROUTING_KEYS[EVENT_TYPES.TAX_RISK_DETECTED],
      (event) => {
        publishedRiskEvent = event;
      }
    );

    const committedEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.VOUCHER_COMMITTED,
      producer: "ledger-service",
      tenant: { firmId: "firm-tax-01", clientId: "client-tax-01" },
      payload: {
        voucherId: "v-tax-999",
        voucherNumber: "PUR-TAX-999",
        totalAmountPaise: 5000000, // ₹50,000
        lines: [
          { accountName: "Technical Consultancy Services", entryType: "DEBIT", amountPaise: 5000000 },
          { accountName: "Sundry Creditor", entryType: "CREDIT", amountPaise: 5000000 },
        ],
      },
    });

    const result = await taxRelay.processCommittedVoucher(committedEnvelope);
    assert.strictEqual(result.evaluation.hasTaxRisks, true);

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(publishedRiskEvent);
    assert.strictEqual(publishedRiskEvent.payload.voucherNumber, "PUR-TAX-999");
  });

  test("generates complete statutory Indian compliance calendar for financial year", () => {
    const calendar = generateComplianceCalendar("2026-2027");
    assert.ok(calendar.length >= 24);

    const gstr1Tasks = calendar.filter((t) => t.category === "GST" && t.taskName.includes("GSTR-1"));
    const gstr3bTasks = calendar.filter((t) => t.category === "GST" && t.taskName.includes("GSTR-3B"));
    const advanceTaxTasks = calendar.filter((t) => t.category === "Income_Tax");

    assert.strictEqual(gstr1Tasks.length, 12);
    assert.strictEqual(gstr3bTasks.length, 12);
    assert.strictEqual(advanceTaxTasks.length, 4);
  });
});


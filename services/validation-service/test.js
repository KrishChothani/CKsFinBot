/** @format */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "crypto";

process.env.NODE_ENV = "test";
process.env.EVENT_BUS_MODE = "memory";

const { app } = await import("./src/index.js");
const { runDeterministicValidation } = await import("./src/rules/validator.engine.js");
const { validateGstin } = await import("./src/utils/gstin.js");
const {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} = await import("@cksfinbot/event-contracts");
const { validationRelay } = await import("./src/services/validationRelay.service.js");

describe("Deterministic Validation & Statutory Rules Service", () => {
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
    await validationRelay.init();
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await validationRelay.close();
  });

  test("GET /health returns healthy status and service version", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, "HEALTHY");
    assert.strictEqual(body.service, "validation-service");
    assert.strictEqual(body.version, "2.0.0");
  });

  test("validates Indian GSTIN checksum using ISO/IEC 7064 MOD 36-2 algorithm", () => {
    // Known valid test vectors matching exact MOD 36-2 checksums
    const v1 = validateGstin("24AAACA1234A1ZQ");
    assert.strictEqual(v1.isValid, true);
    assert.strictEqual(v1.isChecksumValid, true);
    assert.strictEqual(v1.stateCode, "24");
    assert.strictEqual(v1.stateName, "Gujarat");

    const v2 = validateGstin("27AABCZ5678B1Z4");
    assert.strictEqual(v2.isValid, true);
    assert.strictEqual(v2.isChecksumValid, true);
    assert.strictEqual(v2.stateCode, "27");

    // Checksum mismatch check ('Q' tampered with '5')
    const tampered = validateGstin("24AAACA1234A1Z5");
    assert.strictEqual(tampered.isChecksumValid, false);
    assert.match(tampered.reason, /checksum mismatch/i);
  });

  test("evaluates intra-state vs inter-state tax split correctly", () => {
    const intraInvoice = {
      counterParty: { supplierGstin: { normalizedValue: "24AAACA1234A1ZQ" } },
      invoiceDetails: {
        placeOfSupply: { normalizedValue: "24-Gujarat" },
        invoiceDate: { normalizedValue: "2026-10-15" },
      },
      lineItems: [
        {
          taxableAmountPaise: 10000000,
          cgstPaise: 900000,
          sgstPaise: 900000,
          igstPaise: 0,
        },
      ],
      financialSummary: {
        subTotalPaise: 10000000,
        totalCgstPaise: 900000,
        totalSgstPaise: 900000,
        totalIgstPaise: 0,
        grandTotalPaise: 11800000,
      },
    };

    const results = runDeterministicValidation(intraInvoice, { clientStateCode: "24" });
    const posRule = results.find((r) => r.rule_id === "RULE-GST-PLACE-OF-SUPPLY-002");
    assert.ok(posRule);
    assert.strictEqual(posRule.status, "pass");
  });

  test("flags Section 17(5) blocked credit candidate items for human review only", () => {
    const cateringInvoice = {
      counterParty: { supplierGstin: { normalizedValue: "24AAACA1234A1ZQ" } },
      invoiceDetails: {
        placeOfSupply: { normalizedValue: "24-Gujarat" },
        invoiceDate: { normalizedValue: "2026-10-15" },
      },
      lineItems: [
        {
          description: { rawText: "Annual Corporate Dinner Catering Services" },
          taxableAmountPaise: 5000000,
          cgstPaise: 125000,
          sgstPaise: 125000,
        },
      ],
      financialSummary: {
        subTotalPaise: 5000000,
        totalCgstPaise: 125000,
        totalSgstPaise: 125000,
        grandTotalPaise: 5250000,
      },
    };

    const results = runDeterministicValidation(cateringInvoice, { clientStateCode: "24" });
    const blockedRule = results.find((r) => r.rule_id === "RULE-GST-BLOCKED-ITC-005");
    assert.ok(blockedRule);
    assert.strictEqual(blockedRule.status, "warning");
    assert.match(blockedRule.reason, /Section 17\(5\)/i);
  });

  test("processes DocumentExtractedEvent and publishes DocumentValidatedEvent", async () => {
    let publishedValidatedEvent = null;
    validationRelay.eventBus.memoryEmitter.on(
      ROUTING_KEYS[EVENT_TYPES.DOCUMENT_VALIDATED],
      (event) => {
        publishedValidatedEvent = event;
      }
    );

    const validExtractionInvoice = {
      counterParty: { supplierGstin: { normalizedValue: "24AAACA1234A1ZQ" } },
      invoiceDetails: {
        placeOfSupply: { normalizedValue: "24-Gujarat" },
        invoiceDate: { normalizedValue: "2026-10-15" },
        invoiceNumber: { normalizedValue: "INV-VAL-001" },
      },
      lineItems: [
        {
          description: { rawText: "Cloud Server Hosting Services" },
          taxableAmountPaise: 10000000,
          cgstPaise: 900000,
          sgstPaise: 900000,
          igstPaise: 0,
        },
      ],
      financialSummary: {
        subTotalPaise: 10000000,
        totalCgstPaise: 900000,
        totalSgstPaise: 900000,
        totalIgstPaise: 0,
        grandTotalPaise: 11800000,
      },
    };

    const extractedEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.DOCUMENT_EXTRACTED,
      producer: "ai-extraction-service",
      tenant: { firmId: "firm-val-01", clientId: "client-val-01" },
      payload: {
        documentId: "doc-val-001",
        documentType: "Purchase_Invoice",
        invoiceData: validExtractionInvoice,
      },
    });

    const result = await validationRelay.processExtractedEvent(extractedEnvelope);

    assert.ok(result);
    assert.strictEqual(result.eventType, "DocumentValidatedEvent");
    assert.strictEqual(result.payload.isValid, true);

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(publishedValidatedEvent);
    assert.strictEqual(publishedValidatedEvent.payload.documentId, "doc-val-001");
  });
});

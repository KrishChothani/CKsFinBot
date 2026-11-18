/** @format */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "crypto";

process.env.NODE_ENV = "test";
process.env.EVENT_BUS_MODE = "memory";

const { app } = await import("./src/index.js");
const {
  calculateFileHash,
  normalizeInvoiceNumber,
} = await import("./src/services/duplicateDetector.service.js");
const {
  createEventEnvelope,
  validateEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} = await import("@cksfinbot/event-contracts");
const { outboxRelay } = await import("./src/services/outboxRelay.service.js");

describe("Document Ingestion & Storage Vault Service", () => {
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
    await outboxRelay.init();
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await outboxRelay.close();
  });

  test("GET /health returns healthy status, service name, and event bus state", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, "HEALTHY");
    assert.strictEqual(body.service, "document-service");
    assert.strictEqual(body.version, "2.0.0");
    assert.strictEqual(body.eventBusMode, "memory");
  });

  test("calculates deterministic SHA-256 cryptographic file hashes", () => {
    const buffer = Buffer.from("Invoice PDF Stream for MSME Client 2026", "utf-8");
    const hash = calculateFileHash(buffer);
    const expected = crypto.createHash("sha256").update(buffer).digest("hex");
    assert.strictEqual(hash, expected);
    assert.strictEqual(hash.length, 64);
  });

  test("normalizes Indian commercial invoice numbers correctly", () => {
    assert.strictEqual(normalizeInvoiceNumber("INV/2026-27/0042"), "INV20262742");
    assert.strictEqual(normalizeInvoiceNumber("BFM/26/0412"), "BFM26412");
    assert.strictEqual(normalizeInvoiceNumber("tax-inv_00099"), "TAXINV99");
    assert.strictEqual(normalizeInvoiceNumber("00001"), "1");
    assert.strictEqual(normalizeInvoiceNumber(""), "");
  });

  test("creates valid DocumentIngestedEvent and validates AMQP routing key", () => {
    const docId = crypto.randomUUID();
    const firmId = crypto.randomUUID();
    const clientId = crypto.randomUUID();

    const envelope = createEventEnvelope({
      eventType: EVENT_TYPES.DOCUMENT_INGESTED,
      producer: "document-service",
      tenant: { firmId, clientId },
      payload: {
        documentId: docId,
        fileName: "purchase_invoice.pdf",
        fileSize: 204800,
        fileType: "application/pdf",
        s3Url: "https://bucket.s3.ap-south-1.amazonaws.com/documents/test.pdf",
        documentType: "Purchase_Invoice",
      },
    });

    const validation = validateEventEnvelope(envelope);
    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(ROUTING_KEYS[EVENT_TYPES.DOCUMENT_INGESTED], "cksfinbot.document.ingested");
  });

  test("relays events via OutboxRelay and memory event bus with listener confirmation", async () => {
    let receivedEvent = null;
    outboxRelay.eventBus.memoryEmitter.on("cksfinbot.document.ingested", (event) => {
      receivedEvent = event;
    });

    const envelope = createEventEnvelope({
      eventType: EVENT_TYPES.DOCUMENT_INGESTED,
      producer: "document-service",
      tenant: { firmId: "firm-101", clientId: "client-202" },
      payload: {
        documentId: "doc-999",
        fileName: "test_upload.pdf",
      },
    });

    const published = await outboxRelay.recordAndPublishEvent(
      envelope,
      ROUTING_KEYS[EVENT_TYPES.DOCUMENT_INGESTED]
    );

    assert.strictEqual(published, true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(receivedEvent);
    assert.strictEqual(receivedEvent.payload.documentId, "doc-999");
    assert.strictEqual(receivedEvent.tenant.firmId, "firm-101");
  });
});

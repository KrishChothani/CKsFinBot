/** @format */

import { test, describe } from "node:test";
import assert from "node:assert";
import {
  EVENT_TYPES,
  ROUTING_KEYS,
  createEventEnvelope,
  validateEventEnvelope,
  getRoutingKey,
} from "./index.js";

describe("Event Contracts & Envelope Invariants", () => {
  test("creates a valid standardized event envelope", () => {
    const envelope = createEventEnvelope({
      eventType: EVENT_TYPES.DOCUMENT_INGESTED,
      producer: "document-service",
      tenant: { firmId: "firm-101", clientId: "client-202" },
      payload: { documentId: "doc-999", s3Key: "firms/101/doc.pdf" },
    });

    assert.strictEqual(envelope.eventType, EVENT_TYPES.DOCUMENT_INGESTED);
    assert.strictEqual(envelope.producer, "document-service");
    assert.strictEqual(envelope.tenant.firmId, "firm-101");
    assert.strictEqual(envelope.tenant.clientId, "client-202");
    assert.strictEqual(envelope.payload.documentId, "doc-999");
    assert.ok(envelope.eventId);
    assert.ok(envelope.occurredAt);
    assert.strictEqual(envelope.correlationId, envelope.eventId);
  });

  test("validates required fields and rejects malformed envelopes", () => {
    const invalid = { eventType: "SomeEvent" };
    const result = validateEventEnvelope(invalid);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.length >= 4);
  });

  test("resolves correct routing keys for all domains", () => {
    assert.strictEqual(getRoutingKey(EVENT_TYPES.DOCUMENT_INGESTED), "cksfinbot.document.ingested");
    assert.strictEqual(getRoutingKey(EVENT_TYPES.DOCUMENT_EXTRACTED), "cksfinbot.extraction.completed");
    assert.strictEqual(getRoutingKey(EVENT_TYPES.VOUCHER_COMMITTED), "cksfinbot.voucher.committed");
    assert.strictEqual(getRoutingKey(EVENT_TYPES.GSTR2B_RECONCILIATION_COMPLETED), "cksfinbot.recon.completed");
  });
});


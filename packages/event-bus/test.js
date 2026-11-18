/** @format */

import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { EventBus } from "./index.js";
import { createEventEnvelope, EVENT_TYPES } from "@cksfinbot/event-contracts";

describe("Event Bus Integration & Invariant Tests", () => {
  let bus;

  before(async () => {
    bus = new EventBus({ mode: "memory" });
    await bus.connect();
  });

  after(async () => {
    await bus.close();
  });

  test("publishes and subscribes to domain events seamlessly", async () => {
    const receivedEvents = [];

    await bus.subscribe({
      queueName: "test-extraction-queue",
      routingKeys: ["cksfinbot.document.ingested"],
      handler: async (envelope) => {
        receivedEvents.push(envelope);
      },
    });

    const envelope = createEventEnvelope({
      eventType: EVENT_TYPES.DOCUMENT_INGESTED,
      producer: "document-service",
      tenant: { firmId: "firm-101", clientId: "client-202" },
      payload: { documentId: "doc-12345", s3Key: "vault/doc.pdf" },
    });

    const published = await bus.publish(envelope);
    assert.strictEqual(published, true);

    // Wait for event tick
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.strictEqual(receivedEvents.length, 1);
    assert.strictEqual(receivedEvents[0].eventId, envelope.eventId);
    assert.strictEqual(receivedEvents[0].payload.documentId, "doc-12345");
  });

  test("routes unhandled handler errors to the dead-letter store", async () => {
    await bus.subscribe({
      queueName: "test-failing-queue",
      routingKeys: ["cksfinbot.document.duplicate"],
      handler: async () => {
        throw new Error("Simulated consumer crash");
      },
    });

    const envelope = createEventEnvelope({
      eventType: EVENT_TYPES.DOCUMENT_DUPLICATE_DETECTED,
      producer: "document-service",
      tenant: { firmId: "firm-101" },
      payload: { hash: "sha256-abc" },
    });

    await bus.publish(envelope);
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.strictEqual(bus.deadLetterStore.length >= 1, true);
    assert.strictEqual(bus.deadLetterStore[0].queue, "test-failing-queue");
    assert.ok(bus.deadLetterStore[0].error.includes("Simulated consumer crash"));
  });

  test("rejects malformed event envelopes during publish", async () => {
    await assert.rejects(
      async () => {
        await bus.publish({ invalid: "data" });
      },
      /Publish rejected — malformed envelope/
    );
  });
});


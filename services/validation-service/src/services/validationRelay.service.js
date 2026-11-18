/** @format */

import { EventBus } from "@cksfinbot/event-bus";
import {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} from "@cksfinbot/event-contracts";
import { createLogger } from "@cksfinbot/shared-logger";
import { runDeterministicValidation } from "../rules/validator.engine.js";

const logger = createLogger("validation-service:relay");

export const EXTRACTION_QUEUE = "validation.document-extracted.q";
export const EXTRACTION_BINDING = "cksfinbot.extraction.completed";

export class ValidationRelayService {
  constructor() {
    this.eventBus = new EventBus({
      url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    });
    this.isListening = false;
  }

  async init() {
    await this.eventBus.connect();
    logger.info("ValidationRelay event bus connected.");
  }

  /**
   * Processes a single DocumentExtractedEvent envelope deterministically.
   */
  async processExtractedEvent(envelope) {
    const { tenant, payload, correlationId, eventId } = envelope;
    const documentId = payload?.documentId;
    const invoiceData = payload?.invoiceData;

    logger.info(`Processing extraction validation for docId=${documentId}`);

    if (!invoiceData) {
      logger.warn(`No invoiceData found in payload for docId=${documentId}, skipping arithmetic validation.`);
      return;
    }

    // 1. Run Deterministic Statutory Engine (MOD 36-2, POS, Line item paise arithmetic)
    const validationResults = runDeterministicValidation(invoiceData, {
      clientStateCode: tenant.stateCode || "24",
    });

    const hasCriticalFailures = validationResults.some((r) => r.status === "fail");

    if (!hasCriticalFailures) {
      // 2. Publish DocumentValidatedEvent
      const validatedEnvelope = createEventEnvelope({
        eventType: EVENT_TYPES.DOCUMENT_VALIDATED,
        producer: "validation-service",
        tenant,
        correlationId,
        causationId: eventId,
        payload: {
          documentId,
          documentType: payload.documentType || "Purchase_Invoice",
          invoiceData,
          validationResults,
          isValid: true,
          validatedAt: new Date().toISOString(),
        },
      });

      await this.eventBus.publish(
        validatedEnvelope,
        ROUTING_KEYS[EVENT_TYPES.DOCUMENT_VALIDATED]
      );
      logger.info(`Document validated successfully for docId=${documentId}. Published DocumentValidatedEvent.`);
      return validatedEnvelope;
    } else {
      // 3. Publish DocumentValidationFailedEvent
      const failedEnvelope = createEventEnvelope({
        eventType: EVENT_TYPES.DOCUMENT_VALIDATION_FAILED,
        producer: "validation-service",
        tenant,
        correlationId,
        causationId: eventId,
        payload: {
          documentId,
          documentType: payload.documentType || "Purchase_Invoice",
          validationResults,
          isValid: false,
          failedRules: validationResults.filter((r) => r.status === "fail"),
        },
      });

      await this.eventBus.publish(
        failedEnvelope,
        ROUTING_KEYS[EVENT_TYPES.DOCUMENT_VALIDATION_FAILED]
      );
      logger.warn(`Document validation failed for docId=${documentId}. Published DocumentValidationFailedEvent.`);
      return failedEnvelope;
    }
  }

  /**
   * Subscribes to the durable extraction queue.
   */
  async startConsumer() {
    if (this.isListening) return;

    await this.eventBus.subscribe(
      EXTRACTION_QUEUE,
      EXTRACTION_BINDING,
      async (envelope) => {
        await this.processExtractedEvent(envelope);
      }
    );
    this.isListening = true;
    logger.info(`Validation service listening on queue '${EXTRACTION_QUEUE}' for '${EXTRACTION_BINDING}'`);
  }

  async close() {
    await this.eventBus.close();
  }
}

export const validationRelay = new ValidationRelayService();


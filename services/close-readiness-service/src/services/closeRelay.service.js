/** @format */

import { EventBus } from "@cksfinbot/event-bus";
import {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} from "@cksfinbot/event-contracts";
import { createLogger } from "@cksfinbot/shared-logger";
import { calculate5PillarScore } from "./closeReadiness.service.js";

const logger = createLogger("close-readiness-service:relay");

export class CloseRelayService {
  constructor() {
    this.eventBus = new EventBus({
      url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    });
    this.stateStore = new Map(); // In-memory cache per tenant for lightweight event processing
  }

  async init() {
    await this.eventBus.connect();

    // Subscribe to domain events that trigger close readiness state transitions
    await this.eventBus.subscribe({
      queueName: "close.events.q",
      routingKeys: [
        ROUTING_KEYS[EVENT_TYPES.DOCUMENT_INGESTED] || "cksfinbot.document.ingested",
        ROUTING_KEYS[EVENT_TYPES.VOUCHER_COMMITTED] || "cksfinbot.voucher.committed",
        ROUTING_KEYS[EVENT_TYPES.GSTR2B_RECONCILIATION_COMPLETED] || "cksfinbot.recon.completed",
        ROUTING_KEYS[EVENT_TYPES.TAX_RISK_DETECTED] || "cksfinbot.tax.risk_detected",
      ],
      handler: async (envelope) => {
        await this.handleIncomingEvent(envelope);
      },
    });

    logger.info("CloseRelayService connected and subscribed to domain queues.");
  }

  async handleIncomingEvent(envelope) {
    try {
      const { eventType, tenant, payload } = envelope;
      const tenantKey = `${tenant.firmId}:${tenant.clientId}`;

      logger.info(`Received ${eventType} for tenant ${tenantKey}`);

      // Track tenant event state
      const current = this.stateStore.get(tenantKey) || {
        unreviewedDocsCount: 0,
        unreconciledBankTxCount: 0,
        atRiskItcCount: 0,
        missingRecurringCount: 0,
        pendingVouchersCount: 0,
      };

      if (eventType === EVENT_TYPES.DOCUMENT_INGESTED) {
        current.unreviewedDocsCount = Math.max(0, current.unreviewedDocsCount + 1);
      } else if (eventType === EVENT_TYPES.VOUCHER_COMMITTED) {
        current.pendingVouchersCount = Math.max(0, current.pendingVouchersCount - 1);
      } else if (eventType === EVENT_TYPES.GSTR2B_RECONCILIATION_COMPLETED) {
        current.atRiskItcCount = payload.missingIn2bCount || payload.unmatchedCount || 0;
      } else if (eventType === EVENT_TYPES.TAX_RISK_DETECTED) {
        // If tax risk detected, might increment blockers
      }

      this.stateStore.set(tenantKey, current);

      // Recompute readiness score
      const readiness = calculate5PillarScore(current);

      // Publish updated close readiness event
      await this.publishCloseReadinessUpdated({
        firmId: tenant.firmId,
        clientId: tenant.clientId,
        readinessReport: readiness,
      });
    } catch (err) {
      logger.error(`Error processing incoming event in CloseRelay: ${err.message}`, {
        envelope,
      });
    }
  }

  async publishCloseReadinessUpdated({ firmId, clientId, readinessReport }) {
    const envelope = createEventEnvelope({
      eventType: EVENT_TYPES.CLOSE_READINESS_UPDATED,
      producer: "close-readiness-service",
      tenant: { firmId, clientId },
      payload: {
        score: readinessReport.score,
        readinessStatus: readinessReport.readinessStatus,
        passedPillarsCount: readinessReport.passedPillarsCount,
        blockers: readinessReport.blockers,
        pillars: readinessReport.pillars,
      },
    });

    await this.eventBus.publish(
      envelope,
      ROUTING_KEYS[EVENT_TYPES.CLOSE_READINESS_UPDATED]
    );

    logger.info(
      `Published CloseReadinessUpdatedEvent for client ${clientId}: Score = ${readinessReport.score}% (${readinessReport.readinessStatus})`
    );

    return envelope;
  }

  async publishMissingDocumentDetected({ firmId, clientId, missingItem, reason }) {
    const envelope = createEventEnvelope({
      eventType: EVENT_TYPES.MISSING_DOCUMENT_DETECTED,
      producer: "close-readiness-service",
      tenant: { firmId, clientId },
      payload: {
        category: missingItem.category || "General",
        label: missingItem.label || "Missing Document",
        expectedAmount: missingItem.expectedAmount || 0,
        expectedDayOfMonth: missingItem.expectedDayOfMonth || 1,
        reason: reason || "Expected monthly recurring bill missing from general ledger",
      },
    });

    await this.eventBus.publish(
      envelope,
      ROUTING_KEYS[EVENT_TYPES.MISSING_DOCUMENT_DETECTED]
    );

    logger.info(
      `Published MissingDocumentDetectedEvent for client ${clientId}: ${missingItem.label || missingItem.category}`
    );

    return envelope;
  }

  async publishClientReminderDispatched({ firmId, clientId, channel, recipient, template }) {
    const envelope = createEventEnvelope({
      eventType: EVENT_TYPES.CLIENT_REMINDER_DISPATCHED,
      producer: "close-readiness-service",
      tenant: { firmId, clientId },
      payload: {
        channel, // "WHATSAPP" | "EMAIL"
        recipient,
        template,
        timestamp: new Date().toISOString(),
      },
    });

    await this.eventBus.publish(
      envelope,
      ROUTING_KEYS[EVENT_TYPES.CLIENT_REMINDER_DISPATCHED]
    );

    logger.info(
      `Published ClientReminderDispatchedEvent for client ${clientId} via ${channel}`
    );

    return envelope;
  }

  async close() {
    await this.eventBus.close();
  }
}

export const closeRelay = new CloseRelayService();

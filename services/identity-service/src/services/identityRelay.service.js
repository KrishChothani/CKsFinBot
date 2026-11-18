/** @format */

import { EventBus } from "@cksfinbot/event-bus";
import {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} from "@cksfinbot/event-contracts";
import { createLogger } from "@cksfinbot/shared-logger";

const logger = createLogger("identity-service:relay");

export class IdentityRelayService {
  constructor() {
    this.eventBus = new EventBus({
      url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    });
  }

  async init() {
    await this.eventBus.connect();
    logger.info("IdentityRelayService event bus connected.");
  }

  async publishUserCreated({ userId, email, userName, fullName, firmId, role }) {
    const envelope = createEventEnvelope({
      eventType: EVENT_TYPES.USER_CREATED,
      producer: "identity-service",
      tenant: { firmId: firmId ? String(firmId) : null, clientId: null },
      payload: {
        userId: String(userId),
        email,
        userName,
        fullName,
        firmId: firmId ? String(firmId) : null,
        role: role || "Firm_Admin",
      },
    });

    await this.eventBus.publish(
      envelope,
      ROUTING_KEYS[EVENT_TYPES.USER_CREATED]
    );

    logger.info(`Published UserCreatedEvent for user ${userId} (${email})`);
    return envelope;
  }

  async publishTenantCreated({ tenantType, tenantId, name, slug, parentFirmId = null }) {
    const envelope = createEventEnvelope({
      eventType: EVENT_TYPES.TENANT_CREATED,
      producer: "identity-service",
      tenant: {
        firmId: parentFirmId ? String(parentFirmId) : String(tenantId),
        clientId: parentFirmId ? String(tenantId) : null,
      },
      payload: {
        tenantType, // "FIRM" | "CLIENT"
        tenantId: String(tenantId),
        name,
        slug,
        parentFirmId: parentFirmId ? String(parentFirmId) : null,
      },
    });

    await this.eventBus.publish(
      envelope,
      ROUTING_KEYS[EVENT_TYPES.TENANT_CREATED]
    );

    logger.info(`Published TenantCreatedEvent for ${tenantType} ${tenantId} (${name})`);
    return envelope;
  }

  async close() {
    await this.eventBus.close();
  }
}

export const identityRelay = new IdentityRelayService();


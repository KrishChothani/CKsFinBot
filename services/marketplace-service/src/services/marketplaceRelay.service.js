/** @format */

import { EventBus } from "@cksfinbot/event-bus";
import {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} from "@cksfinbot/event-contracts";
import { createLogger } from "@cksfinbot/shared-logger";
import {
  parseMarketplaceReport,
  buildBalancedSettlementVoucher,
} from "./marketplaceSettlement.service.js";

const logger = createLogger("marketplace-service:relay");

export class MarketplaceRelayService {
  constructor() {
    this.eventBus = new EventBus({
      url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    });
  }

  async init() {
    await this.eventBus.connect();
    logger.info("MarketplaceRelay event bus connected.");
  }

  async processSettlementImport({ firmId, clientId, marketplace, rawData, settlementId }) {
    const report = parseMarketplaceReport({ marketplace, rawData, settlementId });

    // 1. Publish MarketplaceSettlementImportedEvent
    const importedEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.MARKETPLACE_SETTLEMENT_IMPORTED,
      producer: "marketplace-service",
      tenant: { firmId, clientId },
      payload: {
        marketplace,
        settlementId: report.settlementId,
        summary: report.summary,
        orderCount: report.orderCount,
        refundCount: report.refundCount,
      },
    });

    await this.eventBus.publish(
      importedEnvelope,
      ROUTING_KEYS[EVENT_TYPES.MARKETPLACE_SETTLEMENT_IMPORTED]
    );

    // 2. Build Balanced Journal Voucher
    const voucher = buildBalancedSettlementVoucher(report, { firmId, clientId });

    // 3. Publish MarketplaceVoucherGeneratedEvent
    const voucherEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.MARKETPLACE_VOUCHER_GENERATED,
      producer: "marketplace-service",
      tenant: { firmId, clientId },
      payload: {
        voucherId: voucher.voucherId,
        voucherNumber: voucher.voucherNumber,
        marketplace,
        settlementId: report.settlementId,
        totalAmountPaise: voucher.totalAmountPaise,
        linesCount: voucher.lines.length,
      },
    });

    await this.eventBus.publish(
      voucherEnvelope,
      ROUTING_KEYS[EVENT_TYPES.MARKETPLACE_VOUCHER_GENERATED]
    );

    logger.info(`Processed settlement ${report.settlementId} (${marketplace}). Emitted settlement and voucher events.`);
    return { report, voucher, importedEnvelope, voucherEnvelope };
  }

  async close() {
    await this.eventBus.close();
  }
}

export const marketplaceRelay = new MarketplaceRelayService();


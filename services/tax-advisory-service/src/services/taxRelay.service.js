/** @format */

import { EventBus } from "@cksfinbot/event-bus";
import {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} from "@cksfinbot/event-contracts";
import { createLogger } from "@cksfinbot/shared-logger";
import { evaluateVoucherTaxRisks } from "./taxAdvisory.service.js";

const logger = createLogger("tax-advisory-service:relay");

export const TAX_VOUCHER_QUEUE = "tax.voucher-committed.q";
export const TAX_VOUCHER_BINDING = "cksfinbot.voucher.committed";

export class TaxRelayService {
  constructor() {
    this.eventBus = new EventBus({
      url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    });
    this.isListening = false;
  }

  async init() {
    await this.eventBus.connect();
    logger.info("TaxRelay event bus connected.");
  }

  /**
   * Processes a committed voucher for tax risks, TDS disallowances, and MSME deadlines.
   */
  async processCommittedVoucher(envelope) {
    const { tenant, payload, correlationId, eventId } = envelope;
    logger.info(`Analyzing tax compliance for voucher ${payload.voucherNumber} (docId=${payload.sourceDocumentId})`);

    const evaluation = evaluateVoucherTaxRisks(payload);

    let riskEnvelope = null;
    let msmeEnvelope = null;

    // 1. Emit TaxRiskDetectedEvent if risks exist
    if (evaluation.hasTaxRisks) {
      riskEnvelope = createEventEnvelope({
        eventType: EVENT_TYPES.TAX_RISK_DETECTED,
        producer: "tax-advisory-service",
        tenant,
        correlationId,
        causationId: eventId,
        payload: {
          voucherId: payload.voucherId,
          voucherNumber: payload.voucherNumber,
          riskCount: evaluation.riskCount,
          flags: evaluation.flags,
          totalPotentialDisallowancePaise: evaluation.flags.reduce(
            (acc, f) => acc + (f.disallowancePaise || 0),
            0
          ),
        },
      });

      await this.eventBus.publish(riskEnvelope, ROUTING_KEYS[EVENT_TYPES.TAX_RISK_DETECTED]);
      logger.warn(`Tax risks detected for voucher ${payload.voucherNumber}. Published TaxRiskDetectedEvent.`);
    }

    // 2. Check for MSME overdue flags
    const msmeOverdueFlag = evaluation.flags.find((f) => f.ruleId === "MSME_SEC_43BH_OVERDUE");
    if (msmeOverdueFlag) {
      msmeEnvelope = createEventEnvelope({
        eventType: EVENT_TYPES.MSME_OVERDUE,
        producer: "tax-advisory-service",
        tenant,
        correlationId,
        causationId: eventId,
        payload: {
          voucherId: payload.voucherId,
          voucherNumber: payload.voucherNumber,
          statutoryDueDate: msmeOverdueFlag.statutoryDueDate,
          totalAmountPaise: payload.totalAmountPaise,
        },
      });

      await this.eventBus.publish(msmeEnvelope, ROUTING_KEYS[EVENT_TYPES.MSME_OVERDUE]);
      logger.warn(`MSME Section 43B(h) overdue for voucher ${payload.voucherNumber}. Emitted MSMEOverdueEvent.`);
    }

    return { evaluation, riskEnvelope, msmeEnvelope };
  }

  async startConsumer() {
    if (this.isListening) return;

    await this.eventBus.subscribe(
      TAX_VOUCHER_QUEUE,
      TAX_VOUCHER_BINDING,
      async (envelope) => {
        await this.processCommittedVoucher(envelope);
      }
    );
    this.isListening = true;
    logger.info(`Tax advisory service listening on queue '${TAX_VOUCHER_QUEUE}'`);
  }

  async close() {
    await this.eventBus.close();
  }
}

export const taxRelay = new TaxRelayService();


/** @format */

import { EventBus } from "@cksfinbot/event-bus";
import {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} from "@cksfinbot/event-contracts";
import { createLogger } from "@cksfinbot/shared-logger";
import { buildTallyXmlEnvelope } from "./tallyExport.service.js";
import { validateTallyXml } from "./tallyLinter.service.js";

const logger = createLogger("tally-export-service:relay");

export const EXPORT_QUEUE = "export.voucher-committed.q";
export const EXPORT_BINDING = "cksfinbot.voucher.committed";

const memoryClientVouchers = new Map();

export class ExportRelayService {
  constructor() {
    this.eventBus = new EventBus({
      url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    });
    this.isListening = false;
  }

  async init() {
    await this.eventBus.connect();
    logger.info("ExportRelay event bus connected.");
  }

  /**
   * Caches incoming committed vouchers by client ID.
   */
  async handleVoucherCommitted(envelope) {
    const { tenant, payload } = envelope;
    const clientKey = `${tenant.firmId}:${tenant.clientId}`;

    if (!memoryClientVouchers.has(clientKey)) {
      memoryClientVouchers.set(clientKey, []);
    }

    const voucherRecord = {
      voucherNumber: payload.voucherNumber,
      voucherType: payload.voucherType,
      voucherDate: payload.voucherDate,
      partyLedgerName: payload.lines?.find((l) => l.entryType === "CREDIT")?.accountName || "Vendor",
      entries: (payload.lines || []).map((l) => ({
        accountName: l.accountName,
        debitAmountPaise: l.entryType === "DEBIT" ? l.amountPaise : 0,
        creditAmountPaise: l.entryType === "CREDIT" ? l.amountPaise : 0,
      })),
      totalAmountPaise: payload.totalAmountPaise,
    };

    memoryClientVouchers.get(clientKey).push(voucherRecord);
    logger.info(`Cached committed voucher ${payload.voucherNumber} for Tally export (Client: ${tenant.clientId})`);
    return voucherRecord;
  }

  /**
   * Generates compliant, linted TallyPrime XML and emits TallyExportGeneratedEvent.
   */
  async exportVouchers({ firmId, clientId, companyName = "SME Client Company", vouchers = [] }) {
    const clientKey = `${firmId}:${clientId}`;
    const targetVouchers = vouchers.length > 0 ? vouchers : memoryClientVouchers.get(clientKey) || [];

    if (targetVouchers.length === 0) {
      throw new Error(`No posted vouchers available to export for client ${clientId}`);
    }

    const { xml: xmlString, validation: lintResult } = buildTallyXmlEnvelope(targetVouchers, companyName);

    if (!lintResult.isValid) {
      const failedEnvelope = createEventEnvelope({
        eventType: EVENT_TYPES.TALLY_EXPORT_FAILED,
        producer: "tally-export-service",
        tenant: { firmId, clientId },
        payload: {
          errors: lintResult.errors,
          vouchersCount: targetVouchers.length,
        },
      });

      await this.eventBus.publish(failedEnvelope, ROUTING_KEYS[EVENT_TYPES.TALLY_EXPORT_FAILED]);
      throw new Error(`Tally XML schema validation failed: ${lintResult.errors.join("; ")}`);
    }

    // Emit TallyExportGeneratedEvent
    const generatedEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.TALLY_EXPORT_GENERATED,
      producer: "tally-export-service",
      tenant: { firmId, clientId },
      payload: {
        companyName,
        vouchersExportedCount: targetVouchers.length,
        xmlByteLength: Buffer.byteLength(xmlString, "utf8"),
        timestamp: new Date().toISOString(),
      },
    });

    await this.eventBus.publish(generatedEnvelope, ROUTING_KEYS[EVENT_TYPES.TALLY_EXPORT_GENERATED]);
    logger.info(`Generated compliant Tally XML for client ${clientId} (${targetVouchers.length} vouchers).`);

    return { xmlString, lintResult, generatedEnvelope };
  }

  async startConsumer() {
    if (this.isListening) return;

    await this.eventBus.subscribe(
      EXPORT_QUEUE,
      EXPORT_BINDING,
      async (envelope) => {
        await this.handleVoucherCommitted(envelope);
      }
    );
    this.isListening = true;
    logger.info(`Export service listening on queue '${EXPORT_QUEUE}'`);
  }

  async close() {
    await this.eventBus.close();
  }
}

export const exportRelay = new ExportRelayService();

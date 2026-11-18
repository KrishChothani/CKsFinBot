/** @format */

import { EventBus } from "@cksfinbot/event-bus";
import {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} from "@cksfinbot/event-contracts";
import { createLogger } from "@cksfinbot/shared-logger";
import { reconcileInvoiceSets, normalizeInvoiceNumber } from "./gstRecon.service.js";

const logger = createLogger("reconciliation-service:relay");

export const VOUCHER_COMMITTED_QUEUE = "recon.voucher-committed.q";
export const VOUCHER_COMMITTED_BINDING = "cksfinbot.voucher.committed";

// In-Memory store for fast isolated unit tests and projections
const memoryBooksEntries = new Map();
const memory2bRecords = new Map();

export class ReconRelayService {
  constructor() {
    this.eventBus = new EventBus({
      url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    });
    this.isListening = false;
  }

  async init() {
    await this.eventBus.connect();
    logger.info("ReconRelay event bus connected.");
  }

  /**
   * Projects incoming committed purchase vouchers into local book model.
   */
  async handleVoucherCommitted(envelope) {
    const { tenant, payload, correlationId, eventId } = envelope;
    const { voucherId, voucherNumber, voucherType, totalAmountPaise, voucherDate, lines } = payload;

    if (voucherType !== "Purchase") return;

    logger.info(`Projecting committed voucher ${voucherNumber} into reconciliation books.`);

    // Find supplier credit line
    const creditLine = lines?.find((l) => l.entryType === "CREDIT") || {};
    const supplierName = creditLine.accountName || "Vendor";

    const bookEntry = {
      voucherId,
      firmId: tenant.firmId,
      clientId: tenant.clientId,
      voucherNumber,
      normalizedInvoiceNumber: normalizeInvoiceNumber(voucherNumber),
      supplierName,
      supplierGstin: payload.supplierGstin || "",
      voucherDate: voucherDate || new Date().toISOString(),
      totalAmountPaise: Number(totalAmountPaise),
      isReconciled: false,
    };

    memoryBooksEntries.set(voucherId, bookEntry);
    return bookEntry;
  }

  /**
   * Runs 2-Tier Reconciliation and emits GSTR2BReconciliationCompletedEvent.
   */
  async runReconciliation({ firmId, clientId, gstr2bList = [], booksList = [] }) {
    // If lists not explicitly passed, load from memory projection
    const r2b = gstr2bList.length > 0 ? gstr2bList : Array.from(memory2bRecords.values());
    const books = booksList.length > 0 ? booksList : Array.from(memoryBooksEntries.values());

    const reconResults = reconcileInvoiceSets(r2b, books);

    // Publish GSTR2BReconciliationCompletedEvent
    const completedEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.GSTR2B_RECONCILIATION_COMPLETED,
      producer: "reconciliation-service",
      tenant: { firmId, clientId },
      payload: {
        summary: reconResults.summary,
        matchedCount: reconResults.summary.matchedCount,
        unmatched2BCount: reconResults.summary.onlyIn2BCount,
        unmatchedBooksCount: reconResults.summary.onlyInBooksCount,
        completedAt: new Date().toISOString(),
      },
    });

    await this.eventBus.publish(
      completedEnvelope,
      ROUTING_KEYS[EVENT_TYPES.GSTR2B_RECONCILIATION_COMPLETED]
    );

    logger.info(`Reconciliation completed for client ${clientId}. Matched: ${reconResults.summary.matchedCount}.`);
    return { reconResults, completedEnvelope };
  }

  /**
   * Records IMS action and emits IMSActionRecordedEvent.
   */
  async recordIMSAction({ firmId, clientId, invoiceNumber, action, remarks }) {
    const envelope = createEventEnvelope({
      eventType: EVENT_TYPES.IMS_ACTION_RECORDED,
      producer: "reconciliation-service",
      tenant: { firmId, clientId },
      payload: {
        invoiceNumber,
        action,
        remarks: remarks || `Action ${action} taken via IMS`,
        timestamp: new Date().toISOString(),
      },
    });

    await this.eventBus.publish(envelope, ROUTING_KEYS[EVENT_TYPES.IMS_ACTION_RECORDED]);
    logger.info(`IMS action '${action}' recorded for invoice ${invoiceNumber}`);
    return envelope;
  }

  async startConsumer() {
    if (this.isListening) return;

    await this.eventBus.subscribe(
      VOUCHER_COMMITTED_QUEUE,
      VOUCHER_COMMITTED_BINDING,
      async (envelope) => {
        await this.handleVoucherCommitted(envelope);
      }
    );
    this.isListening = true;
    logger.info(`Recon service listening on queue '${VOUCHER_COMMITTED_QUEUE}'`);
  }

  async close() {
    await this.eventBus.close();
  }
}

export const reconRelay = new ReconRelayService();


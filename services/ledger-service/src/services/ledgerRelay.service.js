/** @format */

import { EventBus } from "@cksfinbot/event-bus";
import {
  createEventEnvelope,
  EVENT_TYPES,
  ROUTING_KEYS,
} from "@cksfinbot/event-contracts";
import { createLogger } from "@cksfinbot/shared-logger";
import {
  createPurchaseVoucher,
  approveVoucherWorkflow,
  rejectVoucherWorkflow,
} from "./ledger.service.js";

const logger = createLogger("ledger-service:relay");

export const VALIDATED_QUEUE = "ledger.document-validated.q";
export const VALIDATED_BINDING = "cksfinbot.validation.passed";

export class LedgerRelayService {
  constructor() {
    this.eventBus = new EventBus({
      url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    });
    this.isListening = false;
  }

  async init() {
    await this.eventBus.connect();
    logger.info("LedgerRelay event bus connected.");
  }

  /**
   * Consumes DocumentValidatedEvent and auto-drafts a balanced financial voucher.
   */
  async processValidatedDocument(envelope) {
    const { tenant, payload, correlationId, eventId } = envelope;
    const documentId = payload?.documentId;
    const invoiceData = payload?.invoiceData;

    logger.info(`Received DocumentValidatedEvent for docId=${documentId}`);

    if (!invoiceData) {
      logger.warn(`No invoiceData provided in DocumentValidatedEvent for docId=${documentId}`);
      return;
    }

    const summary = invoiceData.financialSummary || {};
    const counterParty = invoiceData.counterParty || {};
    const counterPartyName =
      (typeof counterParty.name === "object" ? counterParty.name?.value : counterParty.name) ||
      invoiceData.supplierName ||
      "Sundry Creditor";

    // 1. Create Double-Entry Voucher
    const voucher = await createPurchaseVoucher({
      firmId: tenant.firmId,
      clientId: tenant.clientId,
      sourceDocumentId: documentId,
      counterPartyName,
      summary,
      lineItems: invoiceData.lineItems || [],
      createdBy: "auto-ingestion-worker",
      isPosted: false, // Requires maker-checker review
    });

    // 2. Publish VoucherCreatedEvent
    const createdEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.VOUCHER_CREATED,
      producer: "ledger-service",
      tenant,
      correlationId,
      causationId: eventId,
      payload: {
        voucherId: voucher.id,
        voucherNumber: voucher.voucherNumber,
        sourceDocumentId: documentId,
        totalAmountPaise: voucher.totalAmountPaise,
        linesCount: voucher.lines.length,
        isPosted: false,
      },
    });

    await this.eventBus.publish(
      createdEnvelope,
      ROUTING_KEYS[EVENT_TYPES.VOUCHER_CREATED]
    );

    // 3. Publish VoucherApprovalRequestedEvent for Senior CA / Partner dual-control
    const approvalReqEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.VOUCHER_APPROVAL_REQUESTED,
      producer: "ledger-service",
      tenant,
      correlationId,
      causationId: eventId,
      payload: {
        voucherId: voucher.id,
        voucherNumber: voucher.voucherNumber,
        totalAmountPaise: voucher.totalAmountPaise,
        requiredRole: voucher.totalAmountPaise > 10000000 ? "Firm_Admin" : "CA",
      },
    });

    await this.eventBus.publish(
      approvalReqEnvelope,
      ROUTING_KEYS[EVENT_TYPES.VOUCHER_APPROVAL_REQUESTED]
    );

    logger.info(`Drafted voucher ${voucher.voucherNumber} and requested maker-checker approval.`);
    return { voucher, createdEnvelope, approvalReqEnvelope };
  }

  /**
   * Approves a voucher and publishes VoucherApprovedEvent + VoucherCommittedEvent.
   */
  async approveAndCommitVoucher({ firmId, voucherId, userId, userRole, remarks }) {
    const voucher = await approveVoucherWorkflow({
      firmId,
      voucherId,
      userId,
      userRole,
      remarks,
    });

    const tenant = { firmId: voucher.firmId, clientId: voucher.clientId };

    // 1. Publish VoucherApprovedEvent
    const approvedEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.VOUCHER_APPROVED,
      producer: "ledger-service",
      tenant,
      payload: {
        voucherId: voucher.id,
        voucherNumber: voucher.voucherNumber,
        approvedBy: userId,
        approvedByRole: userRole,
      },
    });
    await this.eventBus.publish(approvedEnvelope, ROUTING_KEYS[EVENT_TYPES.VOUCHER_APPROVED]);

    // 2. Publish VoucherCommittedEvent (Primary event consumed by Reconciliation, Tax Advisory, and Tally Export)
    const committedEnvelope = createEventEnvelope({
      eventType: EVENT_TYPES.VOUCHER_COMMITTED,
      producer: "ledger-service",
      tenant,
      payload: {
        voucherId: voucher.id,
        voucherNumber: voucher.voucherNumber,
        voucherType: voucher.voucherType,
        voucherDate: voucher.voucherDate,
        totalAmountPaise: voucher.totalAmountPaise,
        lines: voucher.lines,
        isPosted: true,
        postedAt: voucher.postedAt,
        postedBy: voucher.postedBy,
      },
    });
    await this.eventBus.publish(committedEnvelope, ROUTING_KEYS[EVENT_TYPES.VOUCHER_COMMITTED]);

    logger.info(`Voucher ${voucher.voucherNumber} committed to general ledger. Emitted VoucherCommittedEvent.`);
    return { voucher, committedEnvelope };
  }

  /**
   * Subscribes to the durable queue for validated documents.
   */
  async startConsumer() {
    if (this.isListening) return;

    await this.eventBus.subscribe(
      VALIDATED_QUEUE,
      VALIDATED_BINDING,
      async (envelope) => {
        await this.processValidatedDocument(envelope);
      }
    );
    this.isListening = true;
    logger.info(`Ledger service listening on queue '${VALIDATED_QUEUE}' for '${VALIDATED_BINDING}'`);
  }

  async close() {
    await this.eventBus.close();
  }
}

export const ledgerRelay = new LedgerRelayService();


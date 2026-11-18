/** @format */

import crypto from "crypto";

/**
 * Standardized Event Type Registry across all 10 CKsFinBot Microservices.
 */
export const EVENT_TYPES = {
  // Document Ingestion Domain
  DOCUMENT_UPLOADED: "DocumentUploadedEvent",
  DOCUMENT_INGESTED: "DocumentIngestedEvent",
  DOCUMENT_DUPLICATE_DETECTED: "DocumentDuplicateDetectedEvent",
  DOCUMENT_DELETED: "DocumentDeletedEvent",

  // AI & OCR Extraction Domain
  DOCUMENT_EXTRACTION_STARTED: "DocumentExtractionStartedEvent",
  DOCUMENT_EXTRACTED: "DocumentExtractedEvent",
  DOCUMENT_EXTRACTION_FAILED: "DocumentExtractionFailedEvent",

  // Deterministic Validation Domain
  DOCUMENT_VALIDATED: "DocumentValidatedEvent",
  DOCUMENT_VALIDATION_FAILED: "DocumentValidationFailedEvent",

  // Double-Entry Ledger & Voucher Domain
  VOUCHER_APPROVAL_REQUESTED: "VoucherApprovalRequestedEvent",
  VOUCHER_CREATED: "VoucherCreatedEvent",
  VOUCHER_COMMITTED: "VoucherCommittedEvent",
  VOUCHER_APPROVED: "VoucherApprovedEvent",
  VOUCHER_REJECTED: "VoucherRejectedEvent",

  // GSTR-2B Reconciliation Domain
  GSTR2B_RECONCILIATION_COMPLETED: "GSTR2BReconciliationCompletedEvent",
  IMS_ACTION_RECORDED: "IMSActionRecordedEvent",
  ITC_RISK_DETECTED: "ITCRiskDetectedEvent",

  // Statutory Tax Advisory Domain
  TAX_RISK_DETECTED: "TaxRiskDetectedEvent",
  MSME_DEADLINE_APPROACHING: "MSMEDeadlineApproachingEvent",
  MSME_OVERDUE: "MSMEOverdueEvent",

  // Marketplace Settlement Domain
  MARKETPLACE_SETTLEMENT_IMPORTED: "MarketplaceSettlementImportedEvent",
  MARKETPLACE_VOUCHER_GENERATED: "MarketplaceVoucherGeneratedEvent",

  // Month-End Close Readiness Domain
  CLOSE_READINESS_UPDATED: "CloseReadinessUpdatedEvent",
  MISSING_DOCUMENT_DETECTED: "MissingDocumentDetectedEvent",
  CLIENT_REMINDER_DISPATCHED: "ClientReminderDispatchedEvent",

  // ERP & Tally Export Domain
  TALLY_EXPORT_GENERATED: "TallyExportGeneratedEvent",
  TALLY_EXPORT_FAILED: "TallyExportFailedEvent",

  // Identity & Tenant Domain
  USER_CREATED: "UserCreatedEvent",
  TENANT_CREATED: "TenantCreatedEvent",
};

/**
 * Maps event types to AMQP topic routing keys.
 * Format: cksfinbot.<domain>.<action>
 */
export const ROUTING_KEYS = {
  [EVENT_TYPES.DOCUMENT_UPLOADED]: "cksfinbot.document.uploaded",
  [EVENT_TYPES.DOCUMENT_INGESTED]: "cksfinbot.document.ingested",
  [EVENT_TYPES.DOCUMENT_DUPLICATE_DETECTED]: "cksfinbot.document.duplicate",
  [EVENT_TYPES.DOCUMENT_DELETED]: "cksfinbot.document.deleted",

  [EVENT_TYPES.DOCUMENT_EXTRACTION_STARTED]: "cksfinbot.extraction.started",
  [EVENT_TYPES.DOCUMENT_EXTRACTED]: "cksfinbot.extraction.completed",
  [EVENT_TYPES.DOCUMENT_EXTRACTION_FAILED]: "cksfinbot.extraction.failed",

  [EVENT_TYPES.DOCUMENT_VALIDATED]: "cksfinbot.validation.passed",
  [EVENT_TYPES.DOCUMENT_VALIDATION_FAILED]: "cksfinbot.validation.failed",

  [EVENT_TYPES.VOUCHER_APPROVAL_REQUESTED]: "cksfinbot.voucher.approval_requested",
  [EVENT_TYPES.VOUCHER_CREATED]: "cksfinbot.voucher.created",
  [EVENT_TYPES.VOUCHER_COMMITTED]: "cksfinbot.voucher.committed",
  [EVENT_TYPES.VOUCHER_APPROVED]: "cksfinbot.voucher.approved",
  [EVENT_TYPES.VOUCHER_REJECTED]: "cksfinbot.voucher.rejected",

  [EVENT_TYPES.GSTR2B_RECONCILIATION_COMPLETED]: "cksfinbot.recon.completed",
  [EVENT_TYPES.IMS_ACTION_RECORDED]: "cksfinbot.recon.ims_action",
  [EVENT_TYPES.ITC_RISK_DETECTED]: "cksfinbot.recon.itc_risk",

  [EVENT_TYPES.TAX_RISK_DETECTED]: "cksfinbot.tax.risk_detected",
  [EVENT_TYPES.MSME_DEADLINE_APPROACHING]: "cksfinbot.tax.msme_deadline",
  [EVENT_TYPES.MSME_OVERDUE]: "cksfinbot.tax.msme_overdue",

  [EVENT_TYPES.MARKETPLACE_SETTLEMENT_IMPORTED]: "cksfinbot.marketplace.imported",
  [EVENT_TYPES.MARKETPLACE_VOUCHER_GENERATED]: "cksfinbot.marketplace.voucher_generated",

  [EVENT_TYPES.CLOSE_READINESS_UPDATED]: "cksfinbot.close.updated",
  [EVENT_TYPES.MISSING_DOCUMENT_DETECTED]: "cksfinbot.close.missing_doc",
  [EVENT_TYPES.CLIENT_REMINDER_DISPATCHED]: "cksfinbot.close.reminder_dispatched",

  [EVENT_TYPES.TALLY_EXPORT_GENERATED]: "cksfinbot.export.tally_generated",
  [EVENT_TYPES.TALLY_EXPORT_FAILED]: "cksfinbot.export.tally_failed",

  [EVENT_TYPES.USER_CREATED]: "cksfinbot.identity.user_created",
  [EVENT_TYPES.TENANT_CREATED]: "cksfinbot.identity.tenant_created",
};

/**
 * Validates that an event object adheres to the universal event envelope specification.
 *
 * @param {Object} event - Event object to validate
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateEventEnvelope(event) {
  const errors = [];

  if (!event || typeof event !== "object") {
    return { isValid: false, errors: ["Event must be a non-null object"] };
  }

  if (!event.eventId || typeof event.eventId !== "string") {
    errors.push("Missing or invalid 'eventId' (UUID string required)");
  }

  if (!event.eventType || typeof event.eventType !== "string") {
    errors.push("Missing or invalid 'eventType' string");
  }

  if (!event.eventVersion || typeof event.eventVersion !== "number") {
    errors.push("Missing or invalid 'eventVersion' number");
  }

  if (!event.occurredAt || isNaN(new Date(event.occurredAt).getTime())) {
    errors.push("Missing or invalid 'occurredAt' ISO-8601 timestamp");
  }

  if (!event.producer || typeof event.producer !== "string") {
    errors.push("Missing or invalid 'producer' service identifier");
  }

  if (!event.tenant || typeof event.tenant !== "object") {
    errors.push("Missing 'tenant' context object");
  } else {
    if (!event.tenant.firmId) {
      errors.push("Missing 'tenant.firmId'");
    }
  }

  if (event.payload === undefined || event.payload === null) {
    errors.push("Event 'payload' must not be null or undefined");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Factory creator to generate strongly-typed event envelopes with guaranteed structure.
 *
 * @param {Object} params
 * @param {string} params.eventType - From EVENT_TYPES
 * @param {string} params.producer - Service name (e.g. 'document-service')
 * @param {Object} params.tenant - { firmId, clientId }
 * @param {Object} params.payload - Domain-specific event data
 * @param {string} [params.correlationId] - Distributed trace/correlation ID
 * @param {string} [params.causationId] - Parent event ID causing this event
 * @param {number} [params.eventVersion=1] - Version number of the event schema
 * @returns {Object} Full standardized event envelope
 */
export function createEventEnvelope({
  eventType,
  producer,
  tenant,
  payload,
  correlationId = null,
  causationId = null,
  eventVersion = 1,
}) {
  const eventId = crypto.randomUUID();
  const occurredAt = new Date().toISOString();

  const envelope = {
    eventId,
    eventType,
    eventVersion,
    occurredAt,
    producer,
    correlationId: correlationId || eventId,
    causationId: causationId || eventId,
    tenant: {
      firmId: String(tenant?.firmId || ""),
      clientId: tenant?.clientId ? String(tenant.clientId) : null,
    },
    payload,
  };

  const validation = validateEventEnvelope(envelope);
  if (!validation.isValid) {
    throw new Error(`Invalid Event Envelope creation: ${validation.errors.join("; ")}`);
  }

  return envelope;
}

/**
 * Returns the routing key for a given event type.
 */
export function getRoutingKey(eventType) {
  return ROUTING_KEYS[eventType] || `cksfinbot.events.${eventType.toLowerCase()}`;
}

export default {
  EVENT_TYPES,
  ROUTING_KEYS,
  validateEventEnvelope,
  createEventEnvelope,
  getRoutingKey,
};


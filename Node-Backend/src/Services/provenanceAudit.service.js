/** @format */

import { ProvenanceAudit } from "../Models/provenanceAudit.model.js";

/**
 * Appends a provenance audit entry for an entity modification.
 * Strictly immutable: calculates the next revision number automatically.
 */
export async function recordAudit({
  firmId,
  clientId,
  entityType,
  entityId,
  fieldKey = "",
  previousValue = null,
  newValue = null,
  sourceDocumentId = null,
  sourcePage = 1,
  sourceBoundingBox = null,
  rawSourceText = "",
  extractorVersion = "pymupdf-vision-v2",
  modelVersion = "gemini-1.5-pro",
  rulesApplied = [],
  action,
  performedBy,
  performedByEmail = "",
  overrideReason = "",
}) {
  // Find highest revision number for this entity
  const latest = await ProvenanceAudit.findOne({
    entityType,
    entityId: String(entityId),
  }).sort({ revisionNumber: -1 });

  const nextRevision = latest ? latest.revisionNumber + 1 : 1;

  return ProvenanceAudit.create({
    firm: firmId,
    client: clientId,
    entityType,
    entityId: String(entityId),
    revisionNumber: nextRevision,
    fieldKey,
    previousValue,
    newValue,
    sourceDocument: sourceDocumentId,
    sourcePage,
    sourceBoundingBox,
    rawSourceText,
    extractorVersion,
    modelVersion,
    rulesApplied,
    action,
    performedBy: String(performedBy),
    performedByEmail,
    overrideReason,
  });
}

/**
 * Retrieves the full immutable audit trail for an entity.
 */
export async function getAuditTrail(entityType, entityId) {
  return ProvenanceAudit.find({
    entityType,
    entityId: String(entityId),
  }).sort({ revisionNumber: 1 });
}

export default {
  recordAudit,
  getAuditTrail,
};


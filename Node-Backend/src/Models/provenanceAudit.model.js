/** @format */

import mongoose, { Schema } from "mongoose";

const provenanceAuditSchema = new Schema(
  {
    firm: {
      type: Schema.Types.ObjectId,
      ref: "Firm",
      required: true,
      index: true,
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["voucher", "extracted_field", "document", "gstr2b_match", "rule"],
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    revisionNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    fieldKey: {
      type: String,
      default: "",
    },
    previousValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    // Exact Source Evidence
    sourceDocument: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      index: true,
    },
    sourcePage: {
      type: Number,
      default: 1,
    },
    sourceBoundingBox: {
      type: [Number], // [x0, y0, x1, y1] normalized to 0-1000 or page points
      default: null,
    },
    rawSourceText: {
      type: String,
      default: "",
    },
    // Pipeline Provenance
    extractorVersion: {
      type: String,
      default: "pymupdf-vision-v2",
    },
    modelVersion: {
      type: String,
      default: "gemini-1.5-pro",
    },
    rulesApplied: [
      {
        rule_id: { type: String, required: true },
        version: { type: String, required: true },
        status: { type: String, enum: ["pass", "fail", "warning", "not-checked"], required: true },
        reason: { type: String, default: "" },
      },
    ],
    action: {
      type: String,
      enum: [
        "EXTRACTED",
        "VALIDATED",
        "OVERRIDDEN",
        "APPROVED",
        "POSTED_TO_TALLY",
        "REJECTED",
      ],
      required: true,
      index: true,
    },
    performedBy: {
      type: String,
      required: true, // "AI_EXTRACTOR" or User ObjectId string
    },
    performedByEmail: {
      type: String,
      default: "",
    },
    overrideReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable: createdAt only, never updatedAt
  }
);

// Compound index for instant version history query
provenanceAuditSchema.index({ entityType: 1, entityId: 1, revisionNumber: -1 });

// Guard: Strict immutability check
provenanceAuditSchema.pre("updateOne", function () {
  throw new Error("ProvenanceAudit records are strictly append-only and immutable. Updates are rejected.");
});
provenanceAuditSchema.pre("findOneAndUpdate", function () {
  throw new Error("ProvenanceAudit records are strictly append-only and immutable. Updates are rejected.");
});
provenanceAuditSchema.pre("deleteOne", function () {
  throw new Error("ProvenanceAudit records are strictly append-only and immutable. Deletions are rejected.");
});

export const ProvenanceAudit = mongoose.model("ProvenanceAudit", provenanceAuditSchema);
export default ProvenanceAudit;


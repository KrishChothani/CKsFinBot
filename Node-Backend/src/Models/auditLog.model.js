/** @format */

import mongoose, { Schema } from "mongoose";

const auditLogSchema = new Schema(
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
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "DOCUMENT_UPLOADED",
        "DOCUMENT_RE_EXTRACTED",
        "REVIEW_FIELD_MODIFIED",
        "DOCUMENT_APPROVED",
        "DOCUMENT_REJECTED",
        "VOUCHER_POSTED",
        "VOUCHER_VOIDED",
        "EXPORT_TALLY_XML",
        "EXPORT_EXCEL",
        "RECONCILIATION_MATCHED",
        "USER_ROLE_CHANGED",
        "CLIENT_CREATED",
        "CLIENT_UPDATED",
      ],
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    diff: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);


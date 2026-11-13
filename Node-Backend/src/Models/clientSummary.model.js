/** @format */

import mongoose, { Schema } from "mongoose";

const gapSchema = new Schema(
  {
    pillar: { type: String, required: true },
    description: { type: String, required: true },
    count: { type: Number, default: 0 },
    severity: {
      type: String,
      enum: ["BLOCKER", "WARNING", "INFO"],
      default: "WARNING",
    },
  },
  { _id: false }
);

const statutoryFilingSchema = new Schema(
  {
    taxType: { type: String, required: true }, // e.g. "GSTR-1", "GSTR-3B", "TDS § 194", "ADVANCE_TAX"
    period: { type: String, required: true },
    dueDate: { type: Date },
    filingStatus: {
      type: String,
      enum: ["FILED", "PENDING", "OVERDUE", "NOT_APPLICABLE"],
      default: "PENDING",
    },
    arn: { type: String, default: "" },
    filedDate: { type: Date },
  },
  { _id: false }
);

const clientSummarySchema = new Schema(
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
    financialYear: {
      type: String,
      required: true,
      index: true,
    },
    period: {
      type: String,
      enum: ["Monthly", "Quarterly", "Annual"],
      default: "Monthly",
    },
    periodIdentifier: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Reviewed", "Signed_Off"],
      default: "Draft",
      index: true,
    },
    completeness: {
      isComplete: {
        type: Boolean,
        default: false,
      },
      closeReadinessScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      bannerMessage: {
        type: String,
        default: "",
      },
      openGaps: [gapSchema],
    },
    metrics: {
      totalRevenuePaise: { type: Number, default: 0 },
      totalDirectExpensesPaise: { type: Number, default: 0 },
      totalOperatingExpensesPaise: { type: Number, default: 0 },
      grossProfitPaise: { type: Number, default: 0 },
      netOperatingPositionPaise: { type: Number, default: 0 },
      totalTaxableTurnoverPaise: { type: Number, default: 0 },
      outputGstPaise: { type: Number, default: 0 },
      eligibleItcPaise: { type: Number, default: 0 },
      ineligibleItcPaise: { type: Number, default: 0 },
      itcAtRiskPaise: { type: Number, default: 0 },
      netGstPayablePaise: { type: Number, default: 0 },
      closingBankBalancePaise: { type: Number, default: 0 },
      unreconciledBankCount: { type: Number, default: 0 },
      unreconciledBankAmountPaise: { type: Number, default: 0 },
      totalVouchersCount: { type: Number, default: 0 },
      totalDocumentsCount: { type: Number, default: 0 },
    },
    statutoryFilings: [statutoryFilingSchema],
    signOff: {
      signedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      partnerName: {
        type: String,
        default: "",
      },
      membershipNumber: {
        type: String,
        default: "",
      },
      signedAt: {
        type: Date,
      },
      remarks: {
        type: String,
        default: "",
      },
      digitalHash: {
        type: String,
        default: "",
      },
    },
    history: [
      {
        action: { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

clientSummarySchema.index(
  { firm: 1, client: 1, financialYear: 1, periodIdentifier: 1 },
  { unique: true }
);

export const ClientSummary = mongoose.model("ClientSummary", clientSummarySchema);


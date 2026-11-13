/** @format */

import mongoose, { Schema } from "mongoose";

const complianceTaskSchema = new Schema(
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
      index: true, // e.g. "2026-2027"
    },
    category: {
      type: String,
      enum: ["GST", "TDS", "ADVANCE_TAX", "INCOME_TAX", "ROC", "OTHER"],
      required: true,
      index: true,
    },
    taskName: {
      type: String,
      required: true,
      trim: true,
    },
    period: {
      type: String,
      required: true,
      trim: true, // e.g. "April 2026"
    },
    statutoryDueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Filed", "Overdue", "Not_Applicable"],
      default: "Pending",
      index: true,
    },
    filingDetails: {
      filedDate: { type: Date },
      acknowledgementNumber: { type: String, default: "", trim: true },
      challanCin: { type: String, default: "", trim: true },
      taxPaidAmount: { type: Number, default: 0 },
      filedBy: { type: Schema.Types.ObjectId, ref: "User" },
      remarks: { type: String, default: "" },
    },
    isSystemGenerated: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

complianceTaskSchema.index({ client: 1, financialYear: 1, statutoryDueDate: 1 });
complianceTaskSchema.index({ client: 1, status: 1 });

export const ComplianceTask = mongoose.model(
  "ComplianceTask",
  complianceTaskSchema
);


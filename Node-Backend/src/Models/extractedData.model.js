/** @format */

import mongoose, { Schema } from "mongoose";

const referenceFieldSchema = new Schema(
  {
    rawText: { type: String, default: "" },
    normalizedValue: { type: Schema.Types.Mixed, default: null },
    // Legacy compatibility: getter so .value returns normalizedValue or rawText
    value: { type: Schema.Types.Mixed },
    page: { type: Number, default: 1 },
    boundingBox: { type: [Number], default: null }, // [x0, y0, x1, y1] normalized to 0-1000
    confidence: { type: Number, default: 0.95 },
    source: {
      type: String,
      enum: ["text-layer", "ocr", "llm-mapped", "not-found", "human-override"],
      default: "text-layer",
    },
    isLocated: { type: Boolean, default: true },
    isOverridden: { type: Boolean, default: false },
    overrideReason: { type: String, default: "" },
    disagreement: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

// Auto-sync .value with normalizedValue or rawText
referenceFieldSchema.pre("validate", function () {
  if (this.value === undefined && (this.normalizedValue !== undefined || this.rawText !== undefined)) {
    this.value = this.normalizedValue !== undefined && this.normalizedValue !== null ? this.normalizedValue : this.rawText;
  }
});

const lineItemSchema = new Schema(
  {
    description: { type: Schema.Types.Mixed, required: true },
    hsnCode: { type: Schema.Types.Mixed, default: "" },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: "NOS" },
    rate: { type: Number, default: 0 },
    ratePaise: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    taxableAmountPaise: { type: Number, default: 0 },
    gstRate: { type: Number, default: 18 },
    gstRateBasisPoints: { type: Number, default: 1800 },
    cgstAmount: { type: Number, default: 0 },
    cgstPaise: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    sgstPaise: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    igstPaise: { type: Number, default: 0 },
    cessAmount: { type: Number, default: 0 },
    cessPaise: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    totalAmountPaise: { type: Number, default: 0 },
    confidence: { type: Number, default: 0.9 },
    page: { type: Number, default: 1 },
    boundingBox: { type: [Number], default: null },
    isLocated: { type: Boolean, default: true },
    isOverridden: { type: Boolean, default: false },
    overrideReason: { type: String, default: "" },
  },
  { _id: false }
);

const transactionSchema = new Schema(
  {
    date: { type: Date },
    narration: { type: String, required: true },
    referenceNumber: { type: String, default: "" },
    debit: { type: Number, default: 0 },
    debitPaise: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    creditPaise: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    balancePaise: { type: Number, default: 0 },
    page: { type: Number, default: 1 },
    boundingBox: { type: [Number], default: null },
    isLocated: { type: Boolean, default: true },
  },
  { _id: false }
);

const tokenSchema = new Schema(
  {
    tokenId: { type: String, required: true },
    text: { type: String, required: true },
    page: { type: Number, required: true },
    bbox: { type: [Number], required: true },
    normBbox: { type: [Number], required: true },
  },
  { _id: false }
);

const ruleEvaluationSchema = new Schema(
  {
    rule_id: { type: String, required: true },
    version: { type: String, required: true },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ["pass", "fail", "warning", "not-checked"],
      required: true,
    },
    reason: { type: String, default: "" },
    evidence: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const extractedDataSchema = new Schema(
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
    document: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      unique: true,
      index: true,
    },
    hasTextLayer: {
      type: Boolean,
      default: true,
    },
    rawOcrText: {
      type: String,
      default: "",
    },
    tokens: [tokenSchema],
    extractionConfidence: {
      type: Number,
      default: 0.9,
      min: 0,
      max: 1,
    },
    // General Invoice / Bill Data with Reference Evidence
    invoiceDetails: {
      invoiceNumber: referenceFieldSchema,
      invoiceDate: referenceFieldSchema,
      dueDate: referenceFieldSchema,
      placeOfSupply: referenceFieldSchema,
      currency: referenceFieldSchema,
    },
    counterParty: {
      name: referenceFieldSchema,
      supplierName: referenceFieldSchema,
      gstin: referenceFieldSchema,
      supplierGstin: referenceFieldSchema,
      pan: referenceFieldSchema,
      address: referenceFieldSchema,
      supplierAddress: referenceFieldSchema,
      customerName: referenceFieldSchema,
      customerGstin: referenceFieldSchema,
    },
    lineItems: [lineItemSchema],
    financialSummary: {
      subTotal: { type: Number, default: 0 },
      subTotalPaise: { type: Number, default: 0 },
      totalCgst: { type: Number, default: 0 },
      totalCgstPaise: { type: Number, default: 0 },
      totalSgst: { type: Number, default: 0 },
      totalSgstPaise: { type: Number, default: 0 },
      totalIgst: { type: Number, default: 0 },
      totalIgstPaise: { type: Number, default: 0 },
      totalCess: { type: Number, default: 0 },
      totalCessPaise: { type: Number, default: 0 },
      roundOff: { type: Number, default: 0 },
      roundOffPaise: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
      grandTotalPaise: { type: Number, default: 0 },
      grandTotalEvidence: { type: Schema.Types.Mixed, default: null },
    },
    // Bank Statement Data
    bankSummary: {
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      accountHolderName: { type: String, default: "" },
      openingBalance: { type: Number, default: 0 },
      openingBalancePaise: { type: Number, default: 0 },
      closingBalance: { type: Number, default: 0 },
      closingBalancePaise: { type: Number, default: 0 },
      periodStart: { type: Date },
      periodEnd: { type: Date },
    },
    transactions: [transactionSchema],
    // Deterministic Rule Evaluations
    ruleEvaluations: [ruleEvaluationSchema],
    // Legacy validation summary for backward compatibility
    validationResults: {
      isMathValid: { type: Boolean, default: true },
      isGstinChecksumValid: { type: Boolean, default: true },
      hasTaxMismatch: { type: Boolean, default: false },
      isInterState: { type: Boolean, default: false },
      errors: [{ type: String }],
      warnings: [{ type: String }],
    },
  },
  { timestamps: true }
);

export const ExtractedData = mongoose.model(
  "ExtractedData",
  extractedDataSchema
);
export default ExtractedData;

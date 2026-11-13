/** @format */

import mongoose, { Schema } from "mongoose";

const gstr2bSchema = new Schema(
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
    returnPeriod: {
      type: String,
      required: true,
      index: true, // e.g. "042026" or "2026-04"
    },
    financialYear: {
      type: String,
      required: true,
      index: true, // e.g. "2026-2027"
    },
    sectionType: {
      type: String,
      enum: ["B2B", "B2BA", "CDNR", "CDNRA"],
      default: "B2B",
      index: true,
    },
    supplierGstin: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    supplierTradeName: {
      type: String,
      default: "",
      trim: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedInvoiceNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
    },
    invoiceType: {
      type: String,
      default: "Regular",
    },
    // Monetary Values in Rupee (Floats) and Integer Paise
    invoiceValue: {
      type: Number,
      default: 0,
    },
    invoiceValuePaise: {
      type: Number,
      default: 0,
      validate: { validator: Number.isInteger, message: "invoiceValuePaise must be an integer." },
    },
    taxableValue: {
      type: Number,
      required: true,
      default: 0,
    },
    taxableValuePaise: {
      type: Number,
      default: 0,
      validate: { validator: Number.isInteger, message: "taxableValuePaise must be an integer." },
    },
    igst: {
      type: Number,
      default: 0,
    },
    igstPaise: {
      type: Number,
      default: 0,
    },
    cgst: {
      type: Number,
      default: 0,
    },
    cgstPaise: {
      type: Number,
      default: 0,
    },
    sgst: {
      type: Number,
      default: 0,
    },
    sgstPaise: {
      type: Number,
      default: 0,
    },
    cess: {
      type: Number,
      default: 0,
    },
    cessPaise: {
      type: Number,
      default: 0,
    },
    totalTaxPaise: {
      type: Number,
      default: 0,
    },
    itcAvailability: {
      type: String,
      enum: ["Yes", "No"],
      default: "Yes",
    },
    isSection17_5Candidate: {
      type: Boolean,
      default: false,
      index: true,
    },
    section17_5Reason: {
      type: String,
      default: "",
    },
    // 2-Tier Reconciliation Categorization
    reconciliationStatus: {
      type: String,
      enum: ["MATCHED", "MISSING_IN_BOOKS", "TAX_MISMATCH", "BLOCKED_CREDIT"],
      default: "MISSING_IN_BOOKS",
      index: true,
    },
    matchTier: {
      type: String,
      enum: ["TIER_1_EXACT", "TIER_2_TOLERANCE", "MANUAL", "NONE"],
      default: "NONE",
      index: true,
    },
    toleranceDiffPaise: {
      type: Number,
      default: 0,
    },
    matchedVoucher: {
      type: Schema.Types.ObjectId,
      ref: "Voucher",
    },
    difference: {
      taxableDiff: { type: Number, default: 0 },
      taxDiff: { type: Number, default: 0 },
      taxableDiffPaise: { type: Number, default: 0 },
      taxDiffPaise: { type: Number, default: 0 },
    },
    // Invoice Management System (IMS) Actions
    imsAction: {
      type: String,
      enum: ["NONE", "ACCEPTED", "REJECTED", "PENDING"],
      default: "NONE",
      index: true,
    },
    imsActionDate: {
      type: Date,
    },
    imsActionBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    imsRemarks: {
      type: String,
      default: "",
    },
    sourceFile: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Pre-validate hook to calculate integer paise equivalents
gstr2bSchema.pre("validate", function () {
  if (!this.taxableValuePaise && this.taxableValue) {
    this.taxableValuePaise = Math.round(this.taxableValue * 100);
  }
  if (!this.igstPaise && this.igst) {
    this.igstPaise = Math.round(this.igst * 100);
  }
  if (!this.cgstPaise && this.cgst) {
    this.cgstPaise = Math.round(this.cgst * 100);
  }
  if (!this.sgstPaise && this.sgst) {
    this.sgstPaise = Math.round(this.sgst * 100);
  }
  if (!this.cessPaise && this.cess) {
    this.cessPaise = Math.round(this.cess * 100);
  }
  this.totalTaxPaise =
    (this.igstPaise || 0) + (this.cgstPaise || 0) + (this.sgstPaise || 0) + (this.cessPaise || 0);
  if (!this.invoiceValuePaise && this.invoiceValue) {
    this.invoiceValuePaise = Math.round(this.invoiceValue * 100);
  }
});

gstr2bSchema.index({
  client: 1,
  financialYear: 1,
  supplierGstin: 1,
  normalizedInvoiceNumber: 1,
});

export const Gstr2bRecord = mongoose.model("Gstr2bRecord", gstr2bSchema);

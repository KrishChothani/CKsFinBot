/** @format */

import mongoose, { Schema } from "mongoose";

const gstr2bSchema = new Schema(
  {
    firm: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    client: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    returnPeriod: {
      type: String, // MMYYYY e.g. "042026"
      required: true,
      index: true,
    },
    financialYear: {
      type: String, // e.g. "2026-2027"
      required: true,
      index: true,
    },
    supplierGstin: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    supplierTradeName: {
      type: String,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedInvoiceNumber: {
      type: String,
      trim: true,
      index: true,
    },
    invoiceType: {
      type: String,
      enum: ["B2B", "B2BA", "CDNR", "CDNRA", "ISD", "IMPG"],
      default: "B2B",
    },
    invoiceDate: {
      type: Date,
      required: true,
    },
    taxableValue: {
      type: Number,
      required: true,
      default: 0,
    },
    taxableValuePaise: {
      type: Number,
      required: true,
      default: 0,
    },
    cgstPaise: {
      type: Number,
      default: 0,
    },
    sgstPaise: {
      type: Number,
      default: 0,
    },
    igstPaise: {
      type: Number,
      default: 0,
    },
    cessPaise: {
      type: Number,
      default: 0,
    },
    totalInvoiceValuePaise: {
      type: Number,
      required: true,
    },
    itcAvailability: {
      type: String,
      enum: ["Yes", "No"],
      default: "Yes",
    },
    isSection17_5Candidate: {
      type: Boolean,
      default: false,
    },
    reconciliationStatus: {
      type: String,
      enum: [
        "Pending",
        "Exact_Match",
        "Matched_With_Tolerance",
        "Value_Mismatch",
        "Tax_Mismatch",
        "Only_In_2B",
        "Only_In_Books",
      ],
      default: "Only_In_2B",
      index: true,
    },
    imsAction: {
      type: String,
      enum: ["Accept", "Reject", "Pending", "None"],
      default: "None",
      index: true,
    },
    imsRemarks: {
      type: String,
      trim: true,
    },
    matchedVoucherId: {
      type: String,
      index: true,
    },
    matchedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

gstr2bSchema.index({ client: 1, financialYear: 1, supplierGstin: 1 });
gstr2bSchema.index({ client: 1, returnPeriod: 1 });

export const Gstr2bRecord = mongoose.model("Gstr2bRecord", gstr2bSchema);


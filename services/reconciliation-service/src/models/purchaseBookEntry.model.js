/** @format */

import mongoose, { Schema } from "mongoose";

const purchaseBookEntrySchema = new Schema(
  {
    voucherId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firmId: {
      type: String,
      required: true,
      index: true,
    },
    clientId: {
      type: String,
      required: true,
      index: true,
    },
    voucherNumber: {
      type: String,
      required: true,
    },
    normalizedInvoiceNumber: {
      type: String,
      trim: true,
      index: true,
    },
    supplierGstin: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    supplierName: {
      type: String,
      trim: true,
    },
    voucherDate: {
      type: Date,
      required: true,
    },
    totalAmountPaise: {
      type: Number,
      required: true,
    },
    isReconciled: {
      type: Boolean,
      default: false,
      index: true,
    },
    reconciliationStatus: {
      type: String,
      enum: ["Pending", "Exact_Match", "Matched_With_Tolerance", "Only_In_Books", "Mismatch"],
      default: "Only_In_Books",
    },
    matched2bRecordId: {
      type: Schema.Types.ObjectId,
      ref: "Gstr2bRecord",
    },
  },
  { timestamps: true }
);

purchaseBookEntrySchema.index({ clientId: 1, isReconciled: 1 });

export const PurchaseBookEntry = mongoose.model("PurchaseBookEntry", purchaseBookEntrySchema);


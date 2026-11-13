/** @format */

import mongoose, { Schema } from "mongoose";

const bankTransactionSchema = new Schema(
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
    sourceDocument: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      index: true,
    },
    bankName: {
      type: String,
      default: "Bank Account",
    },
    accountNumber: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    narration: {
      type: String,
      required: true,
      trim: true,
    },
    referenceNumber: {
      type: String,
      default: "",
      trim: true,
    },
    transactionType: {
      type: String,
      enum: ["Debit", "Credit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    reconciliationStatus: {
      type: String,
      enum: ["Unreconciled", "Suggested", "Reconciled"],
      default: "Unreconciled",
      index: true,
    },
    matchedVoucher: {
      type: Schema.Types.ObjectId,
      ref: "Voucher",
    },
    confidenceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    matchNotes: {
      type: String,
      default: "",
    },
    reconciledAt: {
      type: Date,
    },
    reconciledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

bankTransactionSchema.index({ client: 1, date: -1 });
bankTransactionSchema.index({ client: 1, reconciliationStatus: 1 });

export const BankTransaction = mongoose.model(
  "BankTransaction",
  bankTransactionSchema
);


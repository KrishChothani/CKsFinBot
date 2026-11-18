/** @format */

import mongoose, { Schema } from "mongoose";

const documentSchema = new Schema(
  {
    firm: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    client: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    conversation: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileHash: {
      type: String,
      trim: true,
      index: true,
    },
    s3Url: {
      type: String,
      required: true,
    },
    documentType: {
      type: String,
      enum: [
        "Purchase_Invoice",
        "Sales_Invoice",
        "Expense_Bill",
        "Bank_Statement",
        "Credit_Note",
        "Debit_Note",
        "GSTR_2B",
        "GSTR_3B",
        "TDS_26AS",
        "Salary_Slip",
        "Unknown",
      ],
      default: "Unknown",
      index: true,
    },
    source: {
      type: String,
      enum: ["Web_Upload", "Email_Forward", "Client_Portal"],
      default: "Web_Upload",
    },
    status: {
      type: String,
      required: true,
      enum: [
        "Queued",
        "Processing",
        "Needs_Review",
        "Approved",
        "Voucher_Created",
        "Failed",
        // Legacy aliases
        "uploading",
        "processing",
        "processed",
        "failed",
      ],
      default: "Queued",
      index: true,
    },
    extractedDataId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    voucherId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    duplicateOf: {
      type: Schema.Types.ObjectId,
      ref: "Document",
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    pineconeNamespace: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

documentSchema.index({ client: 1, fileHash: 1 });
documentSchema.index({ client: 1, status: 1 });
documentSchema.index({ firm: 1, createdAt: -1 });

export const Document = mongoose.model("Document", documentSchema);


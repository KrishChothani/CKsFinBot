/** @format */

import mongoose, { Schema } from "mongoose";

const documentRequestSchema = new Schema(
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
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    documentCategory: {
      type: String,
      enum: [
        "Bank_Statement",
        "Purchase_Invoice",
        "Sales_Invoice",
        "Expense_Bill",
        "Tax_Challan",
        "Other",
      ],
      default: "Other",
    },
    period: {
      type: String,
      default: "",
      trim: true, // e.g. "April 2026"
    },
    urgency: {
      type: String,
      enum: ["Normal", "High", "Urgent"],
      default: "Normal",
    },
    dueDate: {
      type: Date,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenExpiresAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Pending", "Fulfilled", "Expired", "Cancelled"],
      default: "Pending",
      index: true,
    },
    fulfilledDocument: {
      type: Schema.Types.ObjectId,
      ref: "Document",
    },
    fulfilledAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

documentRequestSchema.index({ client: 1, status: 1 });

export const DocumentRequest = mongoose.model(
  "DocumentRequest",
  documentRequestSchema
);


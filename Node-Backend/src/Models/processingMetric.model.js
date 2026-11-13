/** @format */

import mongoose, { Schema } from "mongoose";

const processingMetricSchema = new Schema(
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
    document: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    modelUsed: {
      type: String,
      default: "gemini-2.0-flash",
    },
    inputTokens: {
      type: Number,
      default: 0,
    },
    outputTokens: {
      type: Number,
      default: 0,
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    estimatedCostInr: {
      type: Number,
      default: 0, // In Indian Rupees
    },
    confidenceScore: {
      type: Number,
      default: 0.95,
    },
    documentType: {
      type: String,
      default: "Purchase_Invoice",
    },
    source: {
      type: String,
      enum: ["Web_Upload", "WhatsApp", "Client_Portal", "Email", "Direct_S3"],
      default: "Web_Upload",
      index: true,
    },
    isSuccess: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

processingMetricSchema.index({ firm: 1, createdAt: -1 });

export const ProcessingMetric = mongoose.model(
  "ProcessingMetric",
  processingMetricSchema
);


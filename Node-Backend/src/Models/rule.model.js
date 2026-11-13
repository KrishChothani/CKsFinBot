/** @format */

import mongoose, { Schema } from "mongoose";

const changelogItemSchema = new Schema(
  {
    version: { type: String, required: true },
    date: { type: String, required: true },
    author: { type: String, required: true },
    changeReason: { type: String, required: true },
  },
  { _id: false }
);

const ruleSchema = new Schema(
  {
    rule_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    version: {
      type: String,
      required: true,
      default: "1.0.0",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    jurisdiction: {
      type: String,
      enum: ["IN-GST", "IN-INCOME-TAX", "IN-COMMERCIAL", "FINTECH-CORE", "OTHER"],
      required: true,
    },
    effective_from: {
      type: Date,
      required: true,
    },
    effective_to: {
      type: Date,
      default: null,
    },
    source_url: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "verified", "deprecated"],
      default: "draft",
      index: true,
    },
    reviewer_name: {
      type: String,
      default: "PENDING CA VERIFICATION",
    },
    reviewed_on: {
      type: Date,
      default: null,
    },
    changelog: [changelogItemSchema],
    test_vectors: {
      type: Schema.Types.Mixed,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Rule = mongoose.model("Rule", ruleSchema);
export default Rule;


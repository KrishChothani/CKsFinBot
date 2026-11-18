/** @format */

import mongoose, { Schema } from "mongoose";

const outboxSchema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    routingKey: {
      type: String,
      required: true,
    },
    envelope: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PUBLISHED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
    },
    publishedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

outboxSchema.index({ status: 1, createdAt: 1 });

export const Outbox = mongoose.model("DocumentOutbox", outboxSchema);


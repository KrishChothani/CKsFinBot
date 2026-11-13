/** @format */

import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["user", "assistant", "system"],
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "success",
    },
    sourceDocuments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Document",
      },
    ],
    citations: [
      {
        index: { type: Number },
        citationType: {
          type: String,
          enum: ["web", "document"],
          default: "document",
        },
        title: { type: String },
        url: { type: String },
        documentId: {
          type: Schema.Types.ObjectId,
          ref: "Document",
        },
        fileName: { type: String },
        pageNumber: { type: Number },
        pageSpan: [{ type: Number }],
        snippet: { type: String },
        bboxes: [
          {
            page: { type: Number },
            x: { type: Number },
            y: { type: Number },
            w: { type: Number },
            h: { type: Number },
          },
        ],
        confidenceScore: { type: Number, default: 1.0 },
      },
    ],
    tokensUsed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);

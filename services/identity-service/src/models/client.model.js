/** @format */

import mongoose, { Schema } from "mongoose";

const clientSchema = new Schema(
  {
    firm: {
      type: Schema.Types.ObjectId,
      ref: "Firm",
      required: true,
      index: true,
    },
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      index: true,
    },
    tradeName: {
      type: String,
      trim: true,
    },
    legalStructure: {
      type: String,
      enum: [
        "Private_Limited",
        "LLP",
        "Partnership",
        "Sole_Proprietorship",
        "Public_Limited",
        "Trust_NGO",
        "Individual",
      ],
      default: "Private_Limited",
    },
    gstin: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    panNumber: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    industry: {
      type: String,
      default: "General",
    },
    financialYear: {
      currentFY: {
        type: String,
        default: "2024-2025",
      },
      booksBeginDate: {
        type: Date,
        default: () => new Date("2024-04-01"),
      },
    },
    inboxEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    authorizedPhoneNumbers: [
      {
        type: String,
        trim: true,
      },
    ],
    gstCredentials: {
      username: { type: String, default: "" },
      gspAppKey: { type: String, default: "" },
      isConnected: { type: Boolean, default: false },
      lastSyncedAt: { type: Date },
    },
    approvalPolicy: {
      requiresPartnerApprovalAbove: {
        type: Number,
        default: 50000,
      },
      requiresSeniorReview: {
        type: Boolean,
        default: true,
      },
    },
    settings: {
      autoVoucherApprovalConfidence: {
        type: Number,
        default: 0.95,
      },
      defaultCashAccount: {
        type: Schema.Types.ObjectId,
        ref: "LedgerAccount",
      },
      defaultBankAccount: {
        type: Schema.Types.ObjectId,
        ref: "LedgerAccount",
      },
      stateCode: {
        type: String,
        default: "24",
      },
    },
    status: {
      type: String,
      enum: ["Active", "Archived"],
      default: "Active",
    },
  },
  { timestamps: true }
);

clientSchema.index({ firm: 1, gstin: 1 }, { unique: false });
clientSchema.index({ firm: 1, businessName: 1 });

export const Client = mongoose.model("Client", clientSchema);


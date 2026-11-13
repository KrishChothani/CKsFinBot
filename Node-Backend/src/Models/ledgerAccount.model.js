/** @format */

import mongoose, { Schema } from "mongoose";

const ledgerAccountSchema = new Schema(
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
    accountName: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
    },
    accountCode: {
      type: String,
      trim: true,
    },
    accountGroup: {
      type: String,
      enum: [
        "Current_Assets",
        "Fixed_Assets",
        "Bank_Accounts",
        "Cash_in_Hand",
        "Sundry_Debtors",
        "Current_Liabilities",
        "Sundry_Creditors",
        "Duties_and_Taxes",
        "Direct_Expenses",
        "Indirect_Expenses",
        "Sales_Accounts",
        "Purchase_Accounts",
        "Capital_Account",
      ],
      required: true,
      index: true,
    },
    isSystemDefault: {
      type: Boolean,
      default: false,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    gstin: {
      type: String,
      uppercase: true,
      trim: true,
    },
    msmeCategory: {
      type: String,
      enum: ["None", "Micro", "Small", "Medium"],
      default: "None",
      index: true,
    },
    msmeUdyamNumber: {
      type: String,
      default: "",
      trim: true,
    },
    creditPeriodDays: {
      type: Number,
      default: 45,
    },
  },
  { timestamps: true }
);

// Ensure account name is unique per client workspace
ledgerAccountSchema.index({ client: 1, accountName: 1 }, { unique: true });

export const LedgerAccount = mongoose.model(
  "LedgerAccount",
  ledgerAccountSchema
);


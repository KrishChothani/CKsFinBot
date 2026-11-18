/** @format */

import mongoose, { Schema } from "mongoose";

const firmSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Firm name is required"],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    firmType: {
      type: String,
      enum: ["CA_Firm", "Accounting_Agency", "SME_Business", "Individual"],
      default: "CA_Firm",
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },
    gstin: {
      type: String,
      uppercase: true,
      trim: true,
    },
    address: {
      line1: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
      country: { type: String, default: "India" },
    },
    branding: {
      logoUrl: { type: String, default: "" },
      icaiRegistrationNumber: { type: String, default: "" },
      partnerName: { type: String, default: "" },
      membershipNumber: { type: String, default: "" },
      letterheadHeader: {
        type: String,
        default: "Chartered Accountants & Financial Advisors",
      },
      letterheadFooter: {
        type: String,
        default:
          "This statement is prepared for internal management review and statutory compliance. Subject to audit under the Companies Act, 2013 and Income Tax Act, 1961.",
      },
      primaryColor: { type: String, default: "#0f766e" },
      accentColor: { type: String, default: "#f59e0b" },
      contactEmail: { type: String, default: "" },
      contactPhone: { type: String, default: "" },
      website: { type: String, default: "" },
      digitalSignatureUrl: { type: String, default: "" },
    },
    subscription: {
      plan: {
        type: String,
        enum: ["Starter", "Professional", "Enterprise"],
        default: "Starter",
      },
      status: {
        type: String,
        enum: ["trial", "active", "past_due", "canceled"],
        default: "trial",
      },
      maxClients: {
        type: Number,
        default: 15,
      },
      monthlyDocLimit: {
        type: Number,
        default: 300,
      },
      docsProcessedThisMonth: {
        type: Number,
        default: 0,
      },
      renewsAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
    settings: {
      defaultCurrency: {
        type: String,
        default: "INR",
      },
      financialYearStartMonth: {
        type: Number,
        default: 4,
      },
      enableAuditLog: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true }
);

export const Firm = mongoose.model("Firm", firmSchema);


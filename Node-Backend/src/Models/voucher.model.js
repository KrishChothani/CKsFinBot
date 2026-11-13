/** @format */

import mongoose, { Schema } from "mongoose";

const voucherEntrySchema = new Schema(
  {
    ledgerAccount: {
      type: Schema.Types.ObjectId,
      ref: "LedgerAccount",
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    debitAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    debitAmountPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "debitAmountPaise must be an integer.",
      },
    },
    creditAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditAmountPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "creditAmountPaise must be an integer.",
      },
    },
    sourcePageNumber: {
      type: Number,
      default: 1,
    },
    sourceBoundingBox: {
      type: [Number],
      default: null,
    },
    isLocatedInSource: {
      type: Boolean,
      default: true,
    },
    narration: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const voucherSchema = new Schema(
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
    voucherNumber: {
      type: String,
      required: true,
      index: true,
    },
    voucherType: {
      type: String,
      enum: ["Purchase", "Sales", "Payment", "Receipt", "Journal", "Contra"],
      required: true,
      index: true,
    },
    voucherDate: {
      type: Date,
      required: true,
      index: true,
    },
    sourceDocument: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      index: true,
    },
    entries: {
      type: [voucherEntrySchema],
      validate: {
        validator: function (entries) {
          if (!entries || entries.length < 2) return false;
          // Check integer paise invariant if provided
          const hasPaise = entries.some(
            (e) => e.debitAmountPaise > 0 || e.creditAmountPaise > 0
          );
          if (hasPaise) {
            const totalDebitPaise = entries.reduce(
              (sum, e) => sum + (e.debitAmountPaise || 0),
              0
            );
            const totalCreditPaise = entries.reduce(
              (sum, e) => sum + (e.creditAmountPaise || 0),
              0
            );
            return totalDebitPaise === totalCreditPaise;
          }
          // Legacy float fallback
          const totalDebit = entries.reduce(
            (sum, e) => sum + (e.debitAmount || 0),
            0
          );
          const totalCredit = entries.reduce(
            (sum, e) => sum + (e.creditAmount || 0),
            0
          );
          return Math.abs(totalDebit - totalCredit) <= 0.05;
        },
        message: "Double-entry invariant violated: Total debits must exactly equal total credits.",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmountPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "totalAmountPaise must be an integer.",
      },
    },
    rulesApplied: {
      type: [
        {
          rule_id: String,
          version: String,
          status: String,
        },
      ],
      default: [],
    },
    referenceNumber: {
      type: String,
      default: "",
      index: true,
    },
    referenceDate: {
      type: Date,
    },
    partyLedgerName: {
      type: String,
      default: "",
    },
    msmeDetails: {
      isMsme: {
        type: Boolean,
        default: false,
      },
      category: {
        type: String,
        enum: ["None", "Micro", "Small", "Medium"],
        default: "None",
      },
      udyamNumber: {
        type: String,
        default: "",
      },
      statutoryDueDate: {
        type: Date,
      },
      creditPeriodDays: {
        type: Number,
        default: 45,
      },
      isOverdue: {
        type: Boolean,
        default: false,
      },
    },
    narration: {
      type: String,
      default: "",
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["Draft", "Posted", "Void"],
      default: "Posted",
      index: true,
    },
    approvalWorkflow: {
      stage: {
        type: String,
        enum: [
          "Not_Required",
          "Pending_Senior_CA",
          "Pending_Partner",
          "Approved",
          "Rejected",
        ],
        default: "Approved",
        index: true,
      },
      currentReviewerRole: {
        type: String,
        default: "None",
      },
      requiresApproval: {
        type: Boolean,
        default: false,
      },
      history: [
        {
          action: { type: String, enum: ["Submitted", "Approved", "Rejected"] },
          by: { type: Schema.Types.ObjectId, ref: "User" },
          role: String,
          date: { type: Date, default: Date.now },
          remarks: String,
        },
      ],
    },
    tallyExported: {
      type: Boolean,
      default: false,
    },
    tallyExportedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Synchronize integer paise fields with rupee amounts & MSME overdue status
voucherSchema.pre("validate", function () {
  if (this.entries && Array.isArray(this.entries)) {
    this.entries.forEach((e) => {
      if (!e.debitAmountPaise && e.debitAmount) {
        e.debitAmountPaise = Math.round(e.debitAmount * 100);
      }
      if (!e.creditAmountPaise && e.creditAmount) {
        e.creditAmountPaise = Math.round(e.creditAmount * 100);
      }
    });
  }
  if (!this.totalAmountPaise && this.totalAmount) {
    this.totalAmountPaise = Math.round(this.totalAmount * 100);
  }
  if (this.msmeDetails && this.msmeDetails.statutoryDueDate) {
    this.msmeDetails.isOverdue = new Date() > new Date(this.msmeDetails.statutoryDueDate);
  }
});

// Compound index for client voucher numbering uniqueness
voucherSchema.index({ client: 1, voucherType: 1, voucherNumber: 1 });
voucherSchema.index({ client: 1, voucherDate: -1 });

export const Voucher = mongoose.model("Voucher", voucherSchema);


/** @format */

import mongoose, { Schema } from "mongoose";

const marketplaceSettlementSchema = new Schema(
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
    marketplace: {
      type: String,
      enum: ["AMAZON", "FLIPKART", "MEESHO", "MYNTRA", "OTHER"],
      required: true,
      index: true,
    },
    settlementId: {
      type: String,
      required: true,
      index: true,
    },
    settlementPeriod: {
      startDate: { type: Date },
      endDate: { type: Date },
      depositDate: { type: Date, default: Date.now },
    },
    currency: {
      type: String,
      default: "INR",
    },
    summary: {
      grossSalesPaise: { type: Number, default: 0 },
      salesReturnPaise: { type: Number, default: 0 },
      netSalesPaise: { type: Number, default: 0 },
      outputGstPaise: { type: Number, default: 0 },
      marketplaceFeePaise: { type: Number, default: 0 }, // Referral, closing, listing fees
      shippingFeePaise: { type: Number, default: 0 }, // FBA, Easy Ship, logistics fees
      inputGstOnFeesPaise: { type: Number, default: 0 }, // 18% GST charged by platform
      tcsPaise: { type: Number, default: 0 }, // TCS under § 52 CGST Act
      tdsPaise: { type: Number, default: 0 }, // TDS under § 194-O IT Act
      otherDeductionsPaise: { type: Number, default: 0 }, // Reimbursements, promotions
      netDisbursementPaise: { type: Number, default: 0 }, // Net deposit amount
    },
    orderCount: {
      type: Number,
      default: 0,
    },
    refundCount: {
      type: Number,
      default: 0,
    },
    reconciliation: {
      status: {
        type: String,
        enum: ["MATCHED", "DISCREPANCY", "UNMATCHED"],
        default: "UNMATCHED",
        index: true,
      },
      matchedBankTransaction: {
        type: Schema.Types.ObjectId,
        ref: "BankTransaction",
      },
      bankAmountPaise: {
        type: Number,
        default: 0,
      },
      variancePaise: {
        type: Number,
        default: 0,
      },
      reconciledAt: {
        type: Date,
      },
      reconciledBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    },
    voucher: {
      type: Schema.Types.ObjectId,
      ref: "Voucher",
      index: true,
    },
    sourceFile: {
      originalName: { type: String, default: "" },
      fileHash: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["PROCESSED", "VOUCHER_POSTED", "RECONCILED", "VOID"],
      default: "PROCESSED",
      index: true,
    },
    rawBreakdown: [
      {
        orderId: String,
        sku: String,
        type: String, // Order, Refund, Fee
        amountPaise: Number,
        taxPaise: Number,
        date: Date,
      },
    ],
  },
  { timestamps: true }
);

marketplaceSettlementSchema.index(
  { firm: 1, client: 1, marketplace: 1, settlementId: 1 },
  { unique: true }
);

export const MarketplaceSettlement = mongoose.model(
  "MarketplaceSettlement",
  marketplaceSettlementSchema
);


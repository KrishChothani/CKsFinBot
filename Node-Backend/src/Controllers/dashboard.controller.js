/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { Document } from "../Models/document.model.js";
import { Voucher } from "../Models/voucher.model.js";
import { Client } from "../Models/client.model.js";
import { Firm } from "../Models/firm.model.js";
import mongoose from "mongoose";

// Client-level financial dashboard
export const getClientDashboard = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;

  if (!clientId) {
    throw new ApiError(400, "Client workspace ID required.");
  }

  const client = await Client.findOne({ _id: clientId, firm: req.firmId });
  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  const clientObjId = new mongoose.Types.ObjectId(clientId);

  // 1. Document pipeline counts
  const [docCounts, voucherSummary, topVendors, recentVouchers] = await Promise.all([
    Document.aggregate([
      { $match: { client: clientObjId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // 2. Financial totals from posted vouchers
    Voucher.aggregate([
      { $match: { client: clientObjId, status: "Posted" } },
      {
        $group: {
          _id: "$voucherType",
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]),

    // 3. Top vendors by total purchase volume
    Voucher.aggregate([
      { $match: { client: clientObjId, voucherType: "Purchase", status: "Posted" } },
      { $unwind: "$entries" },
      { $match: { "entries.creditAmount": { $gt: 0 } } },
      {
        $group: {
          _id: "$entries.accountName",
          totalSpend: { $sum: "$entries.creditAmount" },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpend: -1 } },
      { $limit: 5 },
    ]),

    // 4. Recent vouchers
    Voucher.find({ client: clientObjId, status: "Posted" })
      .sort({ voucherDate: -1, createdAt: -1 })
      .limit(6)
      .lean(),
  ]);

  // Format document statuses
  const statusMap = {
    total: 0,
    needsReview: 0,
    processing: 0,
    voucherCreated: 0,
    failed: 0,
  };

  docCounts.forEach((d) => {
    statusMap.total += d.count;
    if (d._id === "Needs_Review") statusMap.needsReview += d.count;
    else if (d._id === "Processing" || d._id === "Queued" || d._id === "processing")
      statusMap.processing += d.count;
    else if (d._id === "Voucher_Created" || d._id === "Approved" || d._id === "processed")
      statusMap.voucherCreated += d.count;
    else if (d._id === "Failed" || d._id === "failed") statusMap.failed += d.count;
  });

  // Financial totals
  let totalPurchases = 0;
  let totalSales = 0;
  voucherSummary.forEach((v) => {
    if (v._id === "Purchase") totalPurchases = v.totalAmount;
    if (v._id === "Sales") totalSales = v.totalAmount;
  });

  // Calculate approximate Input GST from purchases (approx 18%)
  const estimatedInputGst = Math.round(totalPurchases * 0.18 * 100) / 100;
  const estimatedOutputGst = Math.round(totalSales * 0.18 * 100) / 100;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        client: {
          _id: client._id,
          businessName: client.businessName,
          gstin: client.gstin,
          panNumber: client.panNumber,
          currentFY: client.financialYear?.currentFY || "2024-2025",
        },
        documentPipeline: statusMap,
        financialOverview: {
          totalPurchases,
          totalSales,
          netGstLiability: Math.max(0, estimatedOutputGst - estimatedInputGst),
          inputTaxCredit: estimatedInputGst,
          outputTax: estimatedOutputGst,
        },
        topVendors: topVendors.map((tv) => ({
          vendorName: tv._id,
          totalSpend: tv.totalSpend,
          invoiceCount: tv.invoiceCount,
        })),
        recentVouchers,
      },
      "Client dashboard metrics retrieved."
    )
  );
});

// Firm-wide overview for CA / Admin
export const getFirmOverview = AsyncHandler(async (req, res) => {
  const firm = await Firm.findById(req.firmId);
  const clientCount = await Client.countDocuments({ firm: req.firmId, status: "Active" });

  const [totalDocs, pendingReviewCount, recentActivities] = await Promise.all([
    Document.countDocuments({ firm: req.firmId }),
    Document.countDocuments({ firm: req.firmId, status: "Needs_Review" }),
    Document.find({ firm: req.firmId })
      .populate("client", "businessName")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        firm: {
          name: firm.name,
          plan: firm.subscription?.plan || "Starter",
          maxClients: firm.subscription?.maxClients || 15,
          monthlyDocLimit: firm.subscription?.monthlyDocLimit || 300,
          docsProcessedThisMonth: firm.subscription?.docsProcessedThisMonth || 0,
        },
        clientCount,
        totalDocs,
        pendingReviewCount,
        recentActivities,
      },
      "Firm overview retrieved."
    )
  );
});


/** @format */

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Receipt,
  FileCheck,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileCode,
  FileSpreadsheet,
  Building,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useTenant } from "../Contexts/TenantContext";
import { getClientDashboard } from "../../services/apiClient";

const FinancialDashboardView = ({ onNavigateTab }) => {
  const { activeClient } = useTenant();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!activeClient?._id) return;
    setIsLoading(true);
    try {
      const res = await getClientDashboard(activeClient._id);
      setDashboardData(res.data?.data);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeClient]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading && !dashboardData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#070b14] text-xs text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mr-2" />
        <span>Loading financial metrics for {activeClient?.businessName || "workspace"}...</span>
      </div>
    );
  }

  const fin = dashboardData?.financialOverview || {};
  const pipe = dashboardData?.documentPipeline || {};
  const topVendors = dashboardData?.topVendors || [];
  const recentVouchers = dashboardData?.recentVouchers || [];

  return (
    <div className="flex-1 overflow-y-auto bg-[#070b14] p-4 sm:p-6 space-y-6">
      {/* Client Summary Header */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-[#0d1424] border border-gray-800 rounded-xl gap-3">
        <div>
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
            Indian Financial Year (April - March) Overview
          </span>
          <h2 className="text-base font-bold text-white mt-0.5">
            {activeClient?.businessName || "Client Entity"} ({activeClient?.financialYear?.currentFY || "2024-2025"})
          </h2>
          <p className="text-xs text-gray-400">
            GSTIN: {activeClient?.gstin || "Not Registered"} • PAN: {activeClient?.panNumber || "N/A"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab("inbox")}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors"
          >
            Upload Invoices
          </button>
          <button
            onClick={() => onNavigateTab("review")}
            className="px-3.5 py-1.5 text-xs font-semibold text-gray-200 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors"
          >
            Open Review Queue
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchases */}
        <div className="p-4 bg-[#0a0f1d] border border-gray-800 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Total Purchases (FY)</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            ₹{(fin.totalPurchases || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-gray-500">From verified & posted purchase vouchers</p>
        </div>

        {/* Total Sales */}
        <div className="p-4 bg-[#0a0f1d] border border-gray-800 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Total Sales (FY)</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            ₹{(fin.totalSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-gray-500">Revenue captured from sales register</p>
        </div>

        {/* Input Tax Credit (ITC) */}
        <div className="p-4 bg-[#0a0f1d] border border-gray-800 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Available ITC (GST)</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            ₹{(fin.inputTaxCredit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-gray-500">Input CGST + SGST + IGST claimed</p>
        </div>

        {/* Net GST Payable */}
        <div className="p-4 bg-[#0a0f1d] border border-gray-800 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Net GST Liability</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-amber-300">
            ₹{(fin.netGstLiability || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-gray-500">Output tax minus eligible ITC offset</p>
        </div>
      </div>

      {/* Document Pipeline Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab("review")}
          className="p-4 bg-[#0a0f1d] border border-gray-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300">Pending Review</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {pipe.needsReview || 0}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Documents awaiting human verification & voucher posting.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab("inbox")}
          className="p-4 bg-[#0a0f1d] border border-gray-800 hover:border-blue-500/50 rounded-xl cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300">Processing / Ingestion</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {pipe.processing || 0}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            AI extracting line items and deterministic tax splits.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab("ledger")}
          className="p-4 bg-[#0a0f1d] border border-gray-800 hover:border-emerald-500/50 rounded-xl cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300">Vouchers Posted</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {pipe.voucherCreated || 0}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Converted to double-entry vouchers ready for Tally/Excel export.
          </p>
        </div>
      </div>

      {/* Bottom Grid: Top Vendors by Spend & Recent Vouchers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Vendors */}
        <div className="p-4 bg-[#0a0f1d] border border-gray-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-400" />
              <span>Top Vendors by Spend (FY)</span>
            </h3>
            <span className="text-[11px] text-gray-400">Total: {topVendors.length}</span>
          </div>

          <div className="space-y-2">
            {topVendors.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No vendor spend data yet.</p>
            ) : (
              topVendors.map((vendor, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-gray-900/60 border border-gray-800/80"
                >
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      {vendor.vendorName}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {vendor.invoiceCount} Invoices
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    ₹{vendor.totalSpend.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Vouchers */}
        <div className="p-4 bg-[#0a0f1d] border border-gray-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recent Posted Vouchers</span>
            </h3>
            <button
              onClick={() => onNavigateTab("ledger")}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              View All
            </button>
          </div>

          <div className="space-y-2">
            {recentVouchers.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No vouchers posted yet.</p>
            ) : (
              recentVouchers.map((v) => (
                <div
                  key={v._id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-gray-900/60 border border-gray-800/80"
                >
                  <div>
                    <span className="text-xs font-mono font-bold text-blue-400 mr-2">
                      {v.voucherNumber}
                    </span>
                    <span className="text-xs text-gray-200">
                      {v.voucherType} • {new Date(v.voucherDate).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    ₹{v.totalAmount.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboardView;


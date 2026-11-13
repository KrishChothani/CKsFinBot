/** @format */

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Scale,
  Clock,
  Building,
  Download,
  FileSpreadsheet,
  FileText,
  FileCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PieChart,
  DollarSign,
  Users,
} from "lucide-react";
import { useTenant } from "../Contexts/TenantContext";
import {
  getProfitAndLoss,
  getBalanceSheet,
  getAgeingReport,
  getFirmConsolidatedOverview,
  exportZohoBooksCsvBlob,
  exportExcelRegisterBlob,
} from "../../services/apiClient";
import { ClientSummaryLetterhead } from "../../components/financials/ClientSummaryLetterhead";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../lib/utils";
import { formatINR } from "../../lib/format";

const resolveFY = (client) => {
  if (!client) return "2026-2027";
  if (typeof client.financialYear === "string") return client.financialYear;
  return client.financialYear?.currentFY || "2026-2027";
};

const FinancialReportsView = () => {
  const { activeClient, switchClient, clients } = useTenant();
  const [activeReportTab, setActiveReportTab] = useState("summary"); // "summary" | "pnl" | "balance_sheet" | "ageing" | "consolidation"
  const [financialYear, setFinancialYear] = useState(() => resolveFY(activeClient));

  useEffect(() => {
    if (activeClient) {
      setFinancialYear(resolveFY(activeClient));
    }
  }, [activeClient]);

  // State
  const [pnlData, setPnlData] = useState(null);
  const [balanceSheetData, setBalanceSheetData] = useState(null);
  const [ageingData, setAgeingData] = useState(null);
  const [consolidatedData, setConsolidatedData] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchReportData = useCallback(async () => {
    if (!activeClient?._id && activeReportTab !== "consolidation") return;
    setIsLoading(true);
    try {
      if (activeReportTab === "pnl") {
        const res = await getProfitAndLoss(activeClient._id, financialYear);
        setPnlData(res.data?.data);
      } else if (activeReportTab === "balance_sheet") {
        const res = await getBalanceSheet(activeClient._id, financialYear);
        setBalanceSheetData(res.data?.data);
      } else if (activeReportTab === "ageing") {
        const res = await getAgeingReport(activeClient._id);
        setAgeingData(res.data?.data);
      } else if (activeReportTab === "consolidation") {
        const res = await getFirmConsolidatedOverview();
        setConsolidatedData(res.data?.data);
      }
    } catch (err) {
      console.error("Failed to load financial report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeClient?._id, activeReportTab, financialYear]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleExportZoho = async () => {
    if (!activeClient?._id) return;
    setIsExporting(true);
    try {
      const res = await exportZohoBooksCsvBlob(activeClient._id, { voucherType: "Purchase" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ZohoBooks_Bills_${activeClient.businessName.replace(/\s+/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to export Zoho Books CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--surface)] overflow-y-auto p-4 md:p-6 text-[var(--text-primary)] rounded-2xl border border-[var(--border)] shadow-xs">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-[var(--primary)]" />
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Statutory Financial Statements & Reports
              </h1>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Schedule III Profit & Loss, Balance Sheet snapshot, Ageing analysis, and Zoho Books integration
            </p>
          </div>

          {/* Sub-Tab Navigation */}
          <div className="flex flex-wrap items-center p-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl gap-1">
            <button
              onClick={() => setActiveReportTab("summary")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeReportTab === "summary"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>CA Letterhead Summary</span>
            </button>
            <button
              onClick={() => setActiveReportTab("pnl")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeReportTab === "pnl"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>P&L Statement</span>
            </button>
            <button
              onClick={() => setActiveReportTab("balance_sheet")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeReportTab === "balance_sheet"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Balance Sheet</span>
            </button>
            <button
              onClick={() => setActiveReportTab("ageing")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeReportTab === "ageing"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Ageing Analysis</span>
            </button>
            <button
              onClick={() => setActiveReportTab("consolidation")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeReportTab === "consolidation"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Building className="w-3.5 h-3.5" />
              <span>CA Client Portfolio</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            REPORT 0: CA PRACTICE CLIENT SUMMARY & DETERMINISTIC LETTERHEAD
           ══════════════════════════════════════════════════════════════════════ */}
        {activeReportTab === "summary" && (
          <ClientSummaryLetterhead
            clientId={activeClient?._id}
            clientName={activeClient?.businessName}
          />
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            REPORT 1: SCHEDULE III PROFIT & LOSS (P&L) STATEMENT
           ══════════════════════════════════════════════════════════════════════ */}
        {activeReportTab === "pnl" && (
          <div className="space-y-6">
            {/* Action Bar & Scorecards */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface-raised)] p-3 rounded-xl border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)] font-medium">Financial Year:</span>
                <span className="text-xs font-bold font-mono text-[var(--text-primary)] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                  {typeof (pnlData?.financialYear || financialYear) === "string"
                    ? pnlData?.financialYear || financialYear
                    : pnlData?.financialYear?.currentFY || "2026-2027"}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  ({pnlData?.period || "Full Year"})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={FileText}
                  onClick={handleExportZoho}
                  isLoading={isExporting}
                >
                  Export Zoho Books CSV
                </Button>
              </div>
            </div>

            {/* P&L Key Performance Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Total Revenue</span>
                <div className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">
                  {formatINR(pnlData?.revenue?.totalRevenue || 0)}
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">
                  Operations + Other Income
                </span>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Total Expenses</span>
                <div className="text-2xl font-bold font-mono text-[var(--text-secondary)] mt-1">
                  {formatINR(pnlData?.expenses?.totalExpenses || 0)}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  Direct + Administrative Costs
                </span>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Profit Before Tax (PBT)</span>
                <div
                  className={cn(
                    "text-2xl font-bold font-mono mt-1",
                    (pnlData?.profitability?.profitBeforeTax || 0) >= 0
                      ? "text-[var(--primary)]"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {formatINR(pnlData?.profitability?.profitBeforeTax || 0)}
                </div>
                <span className="text-[10px] text-[var(--primary)] mt-1 block">
                  Operating Margin: {pnlData?.profitability?.operatingMarginPercent || 0}%
                </span>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Net Profit (PAT)</span>
                <div
                  className={cn(
                    "text-2xl font-bold font-mono mt-1",
                    (pnlData?.profitability?.netProfitAfterTax || 0) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {formatINR(pnlData?.profitability?.netProfitAfterTax || 0)}
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">
                  Net Margin: {pnlData?.profitability?.netMarginPercent || 0}% (Post 25% Tax)
                </span>
              </div>
            </div>

            {/* Schedule III Formal Table */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 bg-[var(--surface-raised)] border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Statement of Profit and Loss (Schedule III Format)
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    Entity: {activeClient?.businessName} • All values in INR (₹)
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6 text-xs">
                {/* I. INCOME */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider border-b border-[var(--border)] pb-1 flex justify-between">
                    <span>I. REVENUE / INCOME</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-secondary)]">
                    <span className="pl-4">Revenue from Operations (Sales / Turnover)</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">
                      {formatINR(pnlData?.revenue?.revenueFromOperations || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-secondary)]">
                    <span className="pl-4">Other Income (Interest, Discounts, Non-Operating)</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">
                      {formatINR(pnlData?.revenue?.otherIncome || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-[var(--border)] font-bold text-[var(--text-primary)] bg-[var(--surface-raised)] px-3 rounded-lg">
                    <span>TOTAL REVENUE (I + II)</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatINR(pnlData?.revenue?.totalRevenue || 0)}
                    </span>
                  </div>
                </div>

                {/* II. EXPENSES */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider border-b border-[var(--border)] pb-1 flex justify-between">
                    <span>II. EXPENSES</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-secondary)]">
                    <span className="pl-4">Cost of Materials Consumed / Direct Purchases</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">
                      {formatINR(pnlData?.expenses?.costOfMaterials || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-secondary)]">
                    <span className="pl-4">Employee Benefit Expenses (Salaries & Welfare)</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">
                      {formatINR(pnlData?.expenses?.employeeBenefits || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-secondary)]">
                    <span className="pl-4">Finance Costs (Bank Charges & Borrowing Costs)</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">
                      {formatINR(pnlData?.expenses?.financeCosts || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-secondary)]">
                    <span className="pl-4">Depreciation and Amortization Expense</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">
                      {formatINR(pnlData?.expenses?.depreciation || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-secondary)]">
                    <span className="pl-4">Other Operating / Administrative Expenses (Rent, Professional, Utilities)</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">
                      {formatINR(pnlData?.expenses?.otherExpenses || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-[var(--border)] font-bold text-[var(--text-primary)] bg-[var(--surface-raised)] px-3 rounded-lg">
                    <span>TOTAL EXPENSES</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400">
                      {formatINR(pnlData?.expenses?.totalExpenses || 0)}
                    </span>
                  </div>
                </div>

                {/* III. PROFIT / TAX */}
                <div className="space-y-2 border-t-2 border-[var(--border)] pt-3">
                  <div className="flex justify-between py-1 text-sm font-bold text-[var(--text-primary)]">
                    <span>PROFIT BEFORE TAX (PBT)</span>
                    <span className="font-mono text-[var(--primary)]">
                      {formatINR(pnlData?.profitability?.profitBeforeTax || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-[var(--text-muted)]">
                    <span className="pl-4">Estimated Tax Expense (@ 25% Corporate Rate)</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">
                      {formatINR(pnlData?.profitability?.estimatedTax || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-t border-[var(--border)] font-bold text-base text-[var(--text-primary)] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 px-4 rounded-xl">
                    <span>PROFIT AFTER TAX (NET PROFIT)</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatINR(pnlData?.profitability?.netProfitAfterTax || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            REPORT 2: BALANCE SHEET SNAPSHOT
           ══════════════════════════════════════════════════════════════════════ */}
        {activeReportTab === "balance_sheet" && (
          <div className="space-y-6">
            {/* Balance Status Banner */}
            <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[var(--primary)]" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Balance Sheet Invariant Check</h3>
                  <span className="text-xs text-[var(--text-muted)]">Assets = Liabilities + Equity Equation</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {balanceSheetData?.isBalanced ? (
                  <Badge variant="success" size="sm">
                    Perfectly Balanced
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm">
                    Variance: ₹{balanceSheetData?.difference}
                  </Badge>
                )}
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  As at {balanceSheetData?.asOfDate}
                </span>
              </div>
            </div>

            {/* Dual Column Layout: Liabilities (Left) vs Assets (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT: EQUITY AND LIABILITIES */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <h4 className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                    EQUITY AND LIABILITIES
                  </h4>
                  <span className="text-[10px] text-[var(--text-muted)]">AMOUNT (₹)</span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* 1. Shareholders' Funds */}
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block mb-1">1. Shareholders' Funds / Capital</span>
                    <div className="flex justify-between pl-3 py-0.5 text-[var(--text-muted)]">
                      <span>Proprietor / Partner Capital Account</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {formatINR(balanceSheetData?.equityAndLiabilities?.shareholdersFunds?.capitalAccount || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between pl-3 py-0.5 text-[var(--text-muted)]">
                      <span>Retained Earnings (Net Profit for Year)</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        {formatINR(balanceSheetData?.equityAndLiabilities?.shareholdersFunds?.retainedEarningsNetProfit || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between pl-3 py-1 border-t border-[var(--border)] font-semibold text-[var(--text-secondary)]">
                      <span>Total Equity</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {formatINR(balanceSheetData?.equityAndLiabilities?.shareholdersFunds?.totalEquity || 0)}
                      </span>
                    </div>
                  </div>

                  {/* 2. Non-Current Liabilities */}
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block mb-1">2. Non-Current Liabilities</span>
                    <div className="flex justify-between pl-3 py-0.5 text-[var(--text-muted)]">
                      <span>Long-Term Borrowings</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {formatINR(balanceSheetData?.equityAndLiabilities?.nonCurrentLiabilities?.longTermBorrowings || 0)}
                      </span>
                    </div>
                  </div>

                  {/* 3. Current Liabilities */}
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block mb-1">3. Current Liabilities</span>
                    <div className="flex justify-between pl-3 py-0.5 text-[var(--text-muted)]">
                      <span>Trade Payables (Sundry Creditors)</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {formatINR(balanceSheetData?.equityAndLiabilities?.currentLiabilities?.tradePayables || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between pl-3 py-0.5 text-[var(--text-muted)]">
                      <span>Duties & Taxes (Net GST Output Liability)</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {formatINR(balanceSheetData?.equityAndLiabilities?.currentLiabilities?.netGstPayable || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Total Liabilities & Equity */}
                  <div className="flex justify-between pt-4 border-t-2 border-[var(--border)] font-bold text-sm text-[var(--text-primary)] bg-[var(--surface-raised)] p-3 rounded-xl">
                    <span>TOTAL LIABILITIES & EQUITY</span>
                    <span className="font-mono text-[var(--primary)]">
                      {formatINR(balanceSheetData?.equityAndLiabilities?.totalLiabilitiesAndEquity || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT: ASSETS */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    ASSETS
                  </h4>
                  <span className="text-[10px] text-[var(--text-muted)]">AMOUNT (₹)</span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* 1. Non-Current Assets */}
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block mb-1">1. Non-Current Assets</span>
                    <div className="flex justify-between pl-3 py-0.5 text-[var(--text-muted)]">
                      <span>Property, Plant & Equipment (Fixed Assets)</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {formatINR(balanceSheetData?.assets?.nonCurrentAssets?.fixedAssets || 0)}
                      </span>
                    </div>
                  </div>

                  {/* 2. Current Assets */}
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block mb-1">2. Current Assets</span>
                    <div className="flex justify-between pl-3 py-0.5 text-[var(--text-muted)]">
                      <span>Trade Receivables (Sundry Debtors)</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {formatINR(balanceSheetData?.assets?.currentAssets?.tradeReceivables || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between pl-3 py-0.5 text-[var(--text-muted)]">
                      <span>Bank Balances</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {formatINR(balanceSheetData?.assets?.currentAssets?.bankBalances || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between pl-3 py-0.5 text-[var(--text-muted)]">
                      <span>Cash in Hand</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {formatINR(balanceSheetData?.assets?.currentAssets?.cashInHand || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between pl-3 py-0.5 text-[var(--text-muted)]">
                      <span>Input Tax Credit (GST Receivable)</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        {formatINR(balanceSheetData?.assets?.currentAssets?.netGstReceivable || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Total Assets */}
                  <div className="flex justify-between pt-4 border-t-2 border-[var(--border)] font-bold text-sm text-[var(--text-primary)] bg-[var(--surface-raised)] p-3 rounded-xl mt-auto">
                    <span>TOTAL ASSETS</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatINR(balanceSheetData?.assets?.totalAssets || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            REPORT 3: RECEIVABLES & PAYABLES AGEING ANALYSIS
           ══════════════════════════════════════════════════════════════════════ */}
        {activeReportTab === "ageing" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Receivables Ageing Card */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Debtors Receivables Ageing</h3>
                    <span className="text-xs text-[var(--text-muted)]">Money owed by customers</span>
                  </div>
                  <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(ageingData?.receivables?.total || 0)}
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "0 to 30 Days (Current)", val: ageingData?.receivables?.["0-30"] || 0, color: "bg-emerald-500" },
                    { label: "31 to 60 Days", val: ageingData?.receivables?.["31-60"] || 0, color: "bg-teal-500" },
                    { label: "61 to 90 Days", val: ageingData?.receivables?.["61-90"] || 0, color: "bg-amber-500" },
                    { label: "Over 90 Days (Overdue)", val: ageingData?.receivables?.["90+"] || 0, color: "bg-rose-500" },
                  ].map((b) => (
                    <div key={b.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">{b.label}</span>
                        <span className="font-mono text-[var(--text-primary)] font-medium">
                          {formatINR(b.val)}
                        </span>
                      </div>
                      <div className="w-full bg-[var(--surface-raised)] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${b.color}`}
                          style={{
                            width: `${ageingData?.receivables?.total ? Math.min(100, (b.val / ageingData.receivables.total) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payables Ageing Card */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Creditors Payables Ageing</h3>
                    <span className="text-xs text-[var(--text-muted)]">Money owed to suppliers</span>
                  </div>
                  <div className="text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                    {formatINR(ageingData?.payables?.total || 0)}
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "0 to 30 Days (Current)", val: ageingData?.payables?.["0-30"] || 0, color: "bg-emerald-500" },
                    { label: "31 to 60 Days", val: ageingData?.payables?.["31-60"] || 0, color: "bg-teal-500" },
                    { label: "61 to 90 Days", val: ageingData?.payables?.["61-90"] || 0, color: "bg-amber-500" },
                    { label: "Over 90 Days (High MSME Risk)", val: ageingData?.payables?.["90+"] || 0, color: "bg-rose-500" },
                  ].map((b) => (
                    <div key={b.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">{b.label}</span>
                        <span className="font-mono text-[var(--text-primary)] font-medium">
                          {formatINR(b.val)}
                        </span>
                      </div>
                      <div className="w-full bg-[var(--surface-raised)] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${b.color}`}
                          style={{
                            width: `${ageingData?.payables?.total ? Math.min(100, (b.val / ageingData.payables.total) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            REPORT 4: CA MULTI-CLIENT PORTFOLIO OVERVIEW
           ══════════════════════════════════════════════════════════════════════ */}
        {activeReportTab === "consolidation" && (
          <div className="space-y-6">
            {/* Firm Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Total Clients Managed</span>
                <div className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">
                  {consolidatedData?.firmSummary?.totalClients || 0}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Active SME workspaces</span>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Portfolio Revenue Processed</span>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatINR(consolidatedData?.firmSummary?.aggregateRevenue || 0)}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Across all client books</span>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Overdue Returns Across Firm</span>
                <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                  {consolidatedData?.firmSummary?.aggregateOverdueCompliance || 0}
                </div>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 block">Requires staff attention</span>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Pending Document Requests</span>
                <div className="text-2xl font-bold font-mono text-[var(--primary)] mt-1">
                  {consolidatedData?.firmSummary?.aggregatePendingRequests || 0}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Awaiting client uploads</span>
              </div>
            </div>

            {/* Cross-Client Table */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                    <tr>
                      <th className="px-4 py-3">Client Entity</th>
                      <th className="px-4 py-3">GSTIN</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Purchases</th>
                      <th className="px-4 py-3 text-center">Unreconciled Bank</th>
                      <th className="px-4 py-3 text-center">Overdue Returns</th>
                      <th className="px-4 py-3 text-center">Pending Requests</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-tabular">
                    {(consolidatedData?.clients || []).map((c) => (
                      <tr key={c.clientId} className="hover:bg-[var(--surface-raised)]/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                          <div>{c.businessName}</div>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            FY {typeof c.financialYear === "string" ? c.financialYear : c.financialYear?.currentFY || "2026-2027"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">
                          {c.gstin || "Unregistered"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                          {formatINR(c.financials?.totalRevenue || 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--text-secondary)]">
                          {formatINR(c.financials?.totalPurchases || 0)}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {c.actionItems?.unreconciledBankCount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">{c.actionItems.unreconciledBankCount}</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {c.actionItems?.overdueComplianceCount > 0 ? (
                            <Badge variant="danger" size="sm">
                              {c.actionItems.overdueComplianceCount} Overdue
                            </Badge>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">✓ Clear</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {c.actionItems?.pendingDocumentRequests > 0 ? (
                            <span className="text-[var(--primary)] font-semibold">{c.actionItems.pendingDocumentRequests}</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const target = clients.find((cl) => cl._id === c.clientId);
                              if (target) switchClient(target);
                            }}
                          >
                            Switch Workspace
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialReportsView;

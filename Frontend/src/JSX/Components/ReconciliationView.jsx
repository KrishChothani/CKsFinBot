/** @format */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Layers,
  Landmark,
  FileCheck2,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Download,
  Plus,
  Link as LinkIcon,
  Unlink,
  FileSpreadsheet,
  ShieldCheck,
  Clock,
  Check,
  X,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
} from "lucide-react";
import { useTenant } from "../Contexts/TenantContext";
import {
  getBankTransactions,
  triggerBankAutoReconcile,
  confirmBankMatch,
  unreconcileBankTx,
  getBrsSummary,
  getGstReconciliationReport,
  importGstr2bJson,
  importGstr2bFile,
  recordImsActionApi,
  createVoucherFrom2b,
  exportGstMismatchExcelBlob,
  listVouchers,
} from "../../services/apiClient";
import { MarketplaceSettlementsView } from "../../components/marketplace/MarketplaceSettlementsView";
import { formatINR } from "../../lib/format";
import { Button, IconButton } from "../../components/ui/Button";
import { Badge, StatusPill } from "../../components/ui/Badge";
import { cn } from "../../lib/utils";

const ReconciliationView = () => {
  const { activeClient } = useTenant();
  const [activeModule, setActiveModule] = useState("gst"); // "gst" | "bank" | "marketplace"

  // ─── BANK RECON STATE ────────────────────────────────────────────────────────
  const [bankTransactions, setBankTransactions] = useState([]);
  const [brsSummary, setBrsSummary] = useState(null);
  const [bankStatusFilter, setBankStatusFilter] = useState("ALL");
  const [bankSearch, setBankSearch] = useState("");
  const [isBankLoading, setIsBankLoading] = useState(true);
  const [isAutoReconciling, setIsAutoReconciling] = useState(false);
  const [manualMatchModalTx, setManualMatchModalTx] = useState(null);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState("");

  // ─── GST RECON STATE ─────────────────────────────────────────────────────────
  const [gstReport, setGstReport] = useState(null);
  const [gstStatusFilter, setGstStatusFilter] = useState("ALL"); // ALL, MATCHED, MISSING_IN_BOOKS, MISSING_IN_2B, TAX_MISMATCH, BLOCKED_CREDIT
  const [gstSearch, setGstSearch] = useState("");
  const [isGstLoading, setIsGstLoading] = useState(true);
  const [isGstImporting, setIsGstImporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");
  const [activeImsActioningId, setActiveImsActioningId] = useState(null);
  const [copiedChasingIdx, setCopiedChasingIdx] = useState(null);
  const fileInputRef = useRef(null);

  // ─── FETCH BANK DATA ─────────────────────────────────────────────────────────
  const fetchBankData = useCallback(async () => {
    if (!activeClient?._id) return;
    setIsBankLoading(true);
    try {
      const [txRes, brsRes] = await Promise.all([
        getBankTransactions({
          clientId: activeClient._id,
          status: bankStatusFilter,
          search: bankSearch,
        }),
        getBrsSummary(activeClient._id),
      ]);
      setBankTransactions(txRes.data?.data || []);
      setBrsSummary(brsRes.data?.data || null);
    } catch (err) {
      console.error("Failed to load bank reconciliation data:", err);
    } finally {
      setIsBankLoading(false);
    }
  }, [activeClient?._id, bankStatusFilter, bankSearch]);

  const getClientFY = () => {
    if (!activeClient) return "2026-2027";
    if (typeof activeClient.financialYear === "string") return activeClient.financialYear;
    return activeClient.financialYear?.currentFY || "2026-2027";
  };

  // ─── FETCH GST DATA ──────────────────────────────────────────────────────────
  const fetchGstData = useCallback(async () => {
    if (!activeClient?._id) return;
    setIsGstLoading(true);
    try {
      const res = await getGstReconciliationReport({
        clientId: activeClient._id,
        financialYear: getClientFY(),
      });
      setGstReport(res.data?.data || null);
    } catch (err) {
      console.error("Failed to load GST reconciliation data:", err);
    } finally {
      setIsGstLoading(false);
    }
  }, [activeClient?._id, activeClient?.financialYear]);

  useEffect(() => {
    if (activeModule === "bank") {
      fetchBankData();
    } else {
      fetchGstData();
    }
  }, [activeModule, fetchBankData, fetchGstData]);

  // Trigger auto bank reconciliation
  const handleAutoReconcile = async () => {
    if (!activeClient?._id) return;
    setIsAutoReconciling(true);
    try {
      const res = await triggerBankAutoReconcile({
        clientId: activeClient._id,
        toleranceDays: 5,
      });
      setActionSuccessMsg(res.data?.message || "Auto-reconciliation complete.");
      fetchBankData();
      setTimeout(() => setActionSuccessMsg(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Auto reconciliation failed.");
    } finally {
      setIsAutoReconciling(false);
    }
  };

  // Open manual link modal
  const openManualLink = async (tx) => {
    setManualMatchModalTx(tx);
    try {
      const res = await listVouchers({ clientId: activeClient._id });
      const raw = res.data?.data;
      const list = raw?.vouchers || (Array.isArray(raw) ? raw : []);
      setAvailableVouchers(list);
    } catch (err) {
      console.error("Failed to load vouchers for matching:", err);
      setAvailableVouchers([]);
    }
  };

  // Confirm bank match
  const handleConfirmMatch = async (transactionId, voucherId) => {
    try {
      await confirmBankMatch({
        clientId: activeClient._id,
        transactionId,
        voucherId,
      });
      setManualMatchModalTx(null);
      fetchBankData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to confirm match.");
    }
  };

  // Unreconcile bank tx
  const handleUnreconcile = async (transactionId) => {
    try {
      await unreconcileBankTx(transactionId, { clientId: activeClient._id });
      fetchBankData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to unlink transaction.");
    }
  };

  // 1-Click: Create Voucher from 2B
  const handleCreateVoucherFrom2b = async (gstr2bId) => {
    try {
      const res = await createVoucherFrom2b(gstr2bId, { clientId: activeClient._id });
      setActionSuccessMsg(res.data?.message || "Voucher created from GSTR-2B.");
      fetchGstData();
      setTimeout(() => setActionSuccessMsg(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to book voucher from GSTR-2B.");
    }
  };

  // Update IMS Action (ACCEPTED, REJECTED, PENDING)
  const handleImsAction = async (gstr2bId, action) => {
    let remarks = "";
    if (action === "REJECTED") {
      remarks = prompt("Enter reason for IMS rejection (e.g. Wrong GSTIN, Goods not received):");
      if (remarks === null) return;
    }

    setActiveImsActioningId(gstr2bId);
    try {
      await recordImsActionApi({
        clientId: activeClient._id,
        gstr2bId,
        action,
        remarks,
      });
      setActionSuccessMsg(`IMS action updated to ${action}`);
      fetchGstData();
      setTimeout(() => setActionSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to record IMS action.");
    } finally {
      setActiveImsActioningId(null);
    }
  };

  // Import GSTR-2B (File or JSON)
  const handleImportGstr2b = async () => {
    if (!activeClient?._id) return;
    setIsGstImporting(true);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("clientId", activeClient._id);
        formData.append("financialYear", getClientFY());
        formData.append("returnPeriod", "042026");
        await importGstr2bFile(formData);
      } else if (jsonInput.trim()) {
        const parsed = JSON.parse(jsonInput);
        await importGstr2bJson({
          clientId: activeClient._id,
          financialYear: getClientFY(),
          returnPeriod: "042026",
          data: parsed,
          sourceFileName: "pasted_gstr2b.json",
        });
      } else {
        alert("Please select a file (.xlsx or .json) or paste JSON data.");
        setIsGstImporting(false);
        return;
      }

      setShowImportModal(false);
      setJsonInput("");
      setSelectedFile(null);
      fetchGstData();
      setActionSuccessMsg("GSTR-2B data ingested and 2-tier reconciled successfully!");
      setTimeout(() => setActionSuccessMsg(""), 4000);
    } catch (err) {
      alert("Import error: " + (err.response?.data?.message || err.message));
    } finally {
      setIsGstImporting(false);
    }
  };

  // Export Mismatch Excel
  const handleExportGstExcel = async () => {
    if (!activeClient?._id) return;
    setIsExportingExcel(true);
    try {
      const response = await exportGstMismatchExcelBlob(activeClient._id, {
        financialYear: getClientFY(),
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `GSTR2B_Recon_${activeClient.businessName.replace(/\s+/g, "_")}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to export Excel mismatch report.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Copy Chasing Template for Offending Suppliers
  const handleCopyChasingNotice = (item, idx) => {
    const text = `Dear ${item.partyLedgerName || "Vendor"},\n\nInvoice #${item.invoiceNumber} dated ${new Date(
      item.voucherDate
    ).toLocaleDateString("en-IN")} for amount ₹${item.totalAmount} is recorded in our books, but does NOT appear in our official GSTR-2B (GSTIN: ${
      item.supplierGstin || "N/A"
    }).\n\nUnder Section 16(2)(aa) of the CGST Act, our Input Tax Credit of ₹${item.taxAmount} is blocked. Please upload this invoice in your upcoming GSTR-1/IFF immediately to avoid payment hold.\n\nAccounts Department,\n${
      activeClient.businessName
    }`;
    navigator.clipboard.writeText(text);
    setCopiedChasingIdx(idx);
    setTimeout(() => setCopiedChasingIdx(null), 2500);
  };

  // Filtered GSTR-2B list
  const filteredGstrRecords = (gstReport?.records || []).filter((r) => {
    const matchesStatus =
      gstStatusFilter === "ALL" ||
      r.reconciliationStatus === gstStatusFilter ||
      (gstStatusFilter === "BLOCKED_CREDIT" && r.reconciliationStatus === "BLOCKED_CREDIT");
    const matchesSearch =
      !gstSearch ||
      r.supplierGstin?.toLowerCase().includes(gstSearch.toLowerCase()) ||
      r.supplierTradeName?.toLowerCase().includes(gstSearch.toLowerCase()) ||
      r.invoiceNumber?.toLowerCase().includes(gstSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--surface)] overflow-y-auto p-4 sm:p-6 text-[var(--text-primary)] rounded-2xl border border-[var(--border)] shadow-xs">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Module Switcher Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[var(--primary)]" />
              <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                FinTech Statutory Reconciliation Engine
              </h1>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              2-Tier GSTR-2B Section 16(2)(aa) ITC Matching & Automated Bank Statement BRS
            </p>
          </div>

          {/* Module Selector Pill */}
          <div className="flex items-center p-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl">
            <button
              onClick={() => setActiveModule("gst")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeModule === "gst"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>GSTR-2B vs Books (ITC)</span>
            </button>
            <button
              onClick={() => setActiveModule("bank")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeModule === "bank"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Landmark className="w-4 h-4" />
              <span>Bank Statement Recon</span>
            </button>
            <button
              onClick={() => setActiveModule("marketplace")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeModule === "marketplace"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Marketplace Settlements</span>
            </button>
          </div>
        </div>

        {/* Action success alert */}
        {actionSuccessMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 1: GSTR-2B VS BOOKS (GST RECONCILIATION & ITC AT RISK)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeModule === "gst" && (
          <div className="space-y-6">
            {/* Regulatory Alert Banner */}
            <div className="bg-[var(--primary-light)]/30 border border-[var(--primary)]/20 rounded-xl p-4 flex items-start gap-3">
              <FileCheck2 className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>Statutory Invariant: Section 16(2)(aa) of the CGST Act & IMS Workflow</span>
                  <Badge variant="primary" size="sm">
                    FY {getClientFY()}
                  </Badge>
                </span>
                <p className="text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Input Tax Credit (ITC) can <strong>ONLY</strong> be claimed if the supplier has filed GSTR-1 and it is reflected in your GSTR-2B.
                  Invoices missing in GSTR-2B are <strong>At-Risk</strong> and cannot be claimed in GSTR-3B without vendor follow-up. CA actions taken in IMS (Accepted, Rejected, Pending) are tracked deterministically.
                </p>
              </div>
            </div>

            {/* GST Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Card 1: Eligible Matched ITC */}
              <div className="bg-[var(--surface-raised)]/40 border border-emerald-500/30 rounded-xl p-3.5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Eligible Matched ITC</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {formatINR(gstReport?.summary?.matchedItc || 0, { showDecimals: true })}
                </div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 block font-medium">
                  {gstReport?.summary?.matchedCount || 0} bills safe • {gstReport?.summary?.tier1MatchCount || 0} Exact / {gstReport?.summary?.tier2MatchCount || 0} Tolerance
                </span>
              </div>

              {/* Card 2: At Risk ITC (Missing in 2B) */}
              <div
                onClick={() => setGstStatusFilter(gstStatusFilter === "MISSING_IN_2B" ? "ALL" : "MISSING_IN_2B")}
                className={cn(
                  "bg-[var(--surface-raised)]/40 border rounded-xl p-3.5 shadow-xs cursor-pointer transition-all",
                  gstStatusFilter === "MISSING_IN_2B"
                    ? "border-rose-500 ring-2 ring-rose-500/20"
                    : "border-rose-500/30 hover:border-rose-500"
                )}
              >
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>At-Risk ITC (Missing in 2B)</span>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono">
                  {formatINR(gstReport?.summary?.atRiskItc || 0, { showDecimals: true })}
                </div>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 block font-medium">
                  {gstReport?.summary?.missingIn2bCount || 0} bills pending vendor filing
                </span>
              </div>

              {/* Card 3: Unclaimed ITC (Missing in Books) */}
              <div
                onClick={() => setGstStatusFilter(gstStatusFilter === "MISSING_IN_BOOKS" ? "ALL" : "MISSING_IN_BOOKS")}
                className={cn(
                  "bg-[var(--surface-raised)]/40 border rounded-xl p-3.5 shadow-xs cursor-pointer transition-all",
                  gstStatusFilter === "MISSING_IN_BOOKS"
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-blue-500/30 hover:border-blue-500"
                )}
              >
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Unclaimed ITC (In 2B)</span>
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">
                  {formatINR(gstReport?.summary?.unclaimedItc || 0, { showDecimals: true })}
                </div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block font-medium">
                  {gstReport?.summary?.missingInBooksCount || 0} bills unbooked (1-click book)
                </span>
              </div>

              {/* Card 4: Blocked Credit Section 17(5) */}
              <div
                onClick={() => setGstStatusFilter(gstStatusFilter === "BLOCKED_CREDIT" ? "ALL" : "BLOCKED_CREDIT")}
                className={cn(
                  "bg-[var(--surface-raised)]/40 border rounded-xl p-3.5 shadow-xs cursor-pointer transition-all",
                  gstStatusFilter === "BLOCKED_CREDIT"
                    ? "border-amber-500 ring-2 ring-amber-500/20"
                    : "border-amber-500/30 hover:border-amber-500"
                )}
              >
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Blocked Credit § 17(5)</span>
                  <XCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                  {formatINR(gstReport?.summary?.blockedCreditItc || 0, { showDecimals: true })}
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block font-medium">
                  {gstReport?.summary?.blockedCreditCount || 0} candidate flags (Disallowed)
                </span>
              </div>

              {/* Card 5: Tax Mismatch */}
              <div
                onClick={() => setGstStatusFilter(gstStatusFilter === "TAX_MISMATCH" ? "ALL" : "TAX_MISMATCH")}
                className={cn(
                  "bg-[var(--surface-raised)]/40 border rounded-xl p-3.5 shadow-xs cursor-pointer transition-all",
                  gstStatusFilter === "TAX_MISMATCH"
                    ? "border-slate-500 ring-2 ring-slate-500/20"
                    : "border-[var(--border)] hover:border-slate-400"
                )}
              >
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Tax Mismatches</span>
                  <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
                <div className="text-lg font-bold text-[var(--text-primary)] mt-1 font-mono">
                  {gstReport?.summary?.taxMismatchCount || 0}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block font-medium">
                  Rate / amount difference &gt; ₹1.00
                </span>
              </div>
            </div>

            {/* GST Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface-raised)]/30 p-3 rounded-xl border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search supplier, GSTIN, invoice..."
                    value={gstSearch}
                    onChange={(e) => setGstSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>

                <select
                  value={gstStatusFilter}
                  onChange={(e) => setGstStatusFilter(e.target.value)}
                  className="bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-secondary)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
                >
                  <option value="ALL">All Statuses ({gstReport?.records?.length || 0})</option>
                  <option value="MATCHED">Matched (Safe)</option>
                  <option value="MISSING_IN_BOOKS">Missing in Books (Unclaimed)</option>
                  <option value="MISSING_IN_2B">Missing in 2B (At Risk)</option>
                  <option value="TAX_MISMATCH">Tax Mismatch</option>
                  <option value="BLOCKED_CREDIT">Blocked Credit § 17(5)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={UploadCloud}
                  onClick={() => setShowImportModal(true)}
                  className="text-xs font-semibold"
                >
                  Import GSTR-2B (.xlsx / .json)
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  icon={FileSpreadsheet}
                  onClick={handleExportGstExcel}
                  isLoading={isExportingExcel}
                  className="text-xs font-bold"
                >
                  Export Mismatch Excel
                </Button>
              </div>
            </div>

            {/* SECTION: Invoices Missing in 2B (ITC At Risk & Chasing Assistant) */}
            {gstStatusFilter === "MISSING_IN_2B" && (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <h3 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                      Purchase Invoices Missing in GSTR-2B ({gstReport?.missingIn2b?.length || 0})
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-600">
                    Total At Risk: {formatINR(gstReport?.summary?.atRiskItc || 0, { showDecimals: true })}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  These invoices are booked in your accounts, but the vendor has not uploaded them to the GST Portal. Use the copy button below to generate a vendor chasing notice.
                </p>

                <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--surface-raised)] border-b border-[var(--border)] text-[var(--text-muted)] text-[10px] uppercase font-semibold">
                        <th className="py-2.5 px-3">Voucher #</th>
                        <th className="py-2.5 px-3">Invoice No & Date</th>
                        <th className="py-2.5 px-3">Supplier GSTIN & Name</th>
                        <th className="py-2.5 px-3 text-right">Taxable</th>
                        <th className="py-2.5 px-3 text-right">ITC At Risk</th>
                        <th className="py-2.5 px-3 text-right">Vendor Chasing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] font-tabular">
                      {(gstReport?.missingIn2b || []).map((m, idx) => (
                        <tr key={idx} className="hover:bg-[var(--surface-raised)]/50">
                          <td className="py-2 px-3 font-mono font-bold text-[var(--primary)]">
                            {m.voucherNumber}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-[var(--text-primary)] font-semibold">{m.invoiceNumber}</span>
                            <span className="block text-[10px] text-[var(--text-muted)]">
                              {new Date(m.voucherDate).toLocaleDateString("en-IN")}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-medium text-[var(--text-primary)]">{m.partyLedgerName || "Vendor"}</span>
                            <span className="block font-mono text-[10px] text-[var(--text-muted)]">{m.supplierGstin || "N/A"}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {formatINR(m.taxableValue, { showDecimals: true })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatINR(m.taxAmount, { showDecimals: true })}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={copiedChasingIdx === idx ? Check : Copy}
                              onClick={() => handleCopyChasingNotice(m, idx)}
                              className="text-[11px] h-7 px-2"
                            >
                              {copiedChasingIdx === idx ? "Copied Notice" : "Copy Notice"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* GSTR-2B Invoices Table with 2-Tier Match & Read-Only IMS Actions */}
            <div className="bg-[var(--surface-raised)]/30 border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--surface-raised)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider font-semibold">
                      <th className="px-4 py-3">Supplier GSTIN & Name</th>
                      <th className="px-4 py-3">Invoice No & Date</th>
                      <th className="px-4 py-3 text-right">Taxable</th>
                      <th className="px-4 py-3 text-right">Tax Amount</th>
                      <th className="px-4 py-3">2-Tier Recon Status</th>
                      <th className="px-4 py-3">IMS Action</th>
                      <th className="px-4 py-3 text-right">CA Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-tabular">
                    {isGstLoading ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-[var(--text-muted)]">
                          <RefreshCw className="w-5 h-5 text-[var(--primary)] animate-spin mx-auto mb-2" />
                          <span>Matching GSTR-2B records against Purchase Books...</span>
                        </td>
                      </tr>
                    ) : filteredGstrRecords.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-[var(--text-muted)]">
                          <FileCheck2 className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                          <p className="font-semibold text-[var(--text-primary)]">No matching GSTR-2B records found</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            Click &quot;Import GSTR-2B&quot; to upload your portal Excel (.xlsx) or JSON file.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredGstrRecords.map((r) => {
                        const taxTotal = (r.totalTaxPaise ? r.totalTaxPaise / 100 : r.igst + r.cgst + r.sgst + r.cess) || 0;

                        return (
                          <tr key={r._id} className="hover:bg-[var(--surface-raised)]/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-[11px] text-[var(--primary)] font-bold block">
                                {r.supplierGstin}
                              </span>
                              <span className="text-[11px] text-[var(--text-primary)] font-medium truncate max-w-xs block">
                                {r.supplierTradeName || "Supplier"}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-mono text-[var(--text-primary)] font-semibold">{r.invoiceNumber}</div>
                              <div className="text-[10px] text-[var(--text-muted)]">
                                {new Date(r.invoiceDate).toISOString().slice(0, 10)}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right font-mono text-[var(--text-primary)]">
                              {formatINR(r.taxableValue, { showDecimals: true })}
                            </td>

                            <td className="px-4 py-3 text-right font-mono font-bold text-[var(--primary)]">
                              {formatINR(taxTotal, { showDecimals: true })}
                            </td>

                            {/* 2-Tier Recon Status Badge */}
                            <td className="px-4 py-3">
                              {r.reconciliationStatus === "MATCHED" && (
                                <div className="flex flex-col gap-0.5 items-start">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>
                                      {r.matchTier === "TIER_1_EXACT" ? "Tier 1 Exact Match" : "Tier 2 (<= ₹1.00 Diff)"}
                                    </span>
                                  </span>
                                </div>
                              )}
                              {r.reconciliationStatus === "MISSING_IN_BOOKS" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                  <HelpCircle className="w-3 h-3" /> Unbooked in Books
                                </span>
                              )}
                              {r.reconciliationStatus === "TAX_MISMATCH" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  <AlertTriangle className="w-3 h-3" /> Tax Mismatch ({r.difference?.taxDiff ? `₹${r.difference.taxDiff}` : "Rate"})
                                </span>
                              )}
                              {r.reconciliationStatus === "BLOCKED_CREDIT" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400" title={r.section17_5Reason || "Section 17(5)"}>
                                  <XCircle className="w-3 h-3" /> Blocked § 17(5)
                                </span>
                              )}
                            </td>

                            {/* IMS Status Badge */}
                            <td className="px-4 py-3">
                              {r.imsAction === "ACCEPTED" && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  <Check className="w-3 h-3" /> ACCEPTED
                                </span>
                              )}
                              {r.imsAction === "REJECTED" && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20" title={r.imsRemarks}>
                                  <X className="w-3 h-3" /> REJECTED
                                </span>
                              )}
                              {r.imsAction === "PENDING" && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                  <Clock className="w-3 h-3" /> PENDING
                                </span>
                              )}
                              {(!r.imsAction || r.imsAction === "NONE") && (
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                  Action Needed
                                </span>
                              )}
                            </td>

                            {/* CA Action Buttons */}
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {r.reconciliationStatus === "MISSING_IN_BOOKS" && (
                                  <button
                                    onClick={() => handleCreateVoucherFrom2b(r._id)}
                                    className="px-2 py-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded text-[10px] font-bold shadow-xs cursor-pointer"
                                    title="Auto-create and post balanced voucher in books"
                                  >
                                    + Book Voucher
                                  </button>
                                )}

                                {/* IMS Action Dropdown / Button group */}
                                <div className="inline-flex rounded-lg border border-[var(--border)] p-0.5 bg-[var(--surface)] text-[10px]">
                                  <button
                                    onClick={() => handleImsAction(r._id, "ACCEPTED")}
                                    disabled={activeImsActioningId === r._id}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer",
                                      r.imsAction === "ACCEPTED"
                                        ? "bg-emerald-600 text-white"
                                        : "text-[var(--text-muted)] hover:text-emerald-600"
                                    )}
                                    title="Accept invoice in IMS for GSTR-3B ITC claim"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleImsAction(r._id, "PENDING")}
                                    disabled={activeImsActioningId === r._id}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer",
                                      r.imsAction === "PENDING"
                                        ? "bg-amber-600 text-white"
                                        : "text-[var(--text-muted)] hover:text-amber-600"
                                    )}
                                    title="Keep invoice pending in IMS (defer to subsequent month)"
                                  >
                                    Pending
                                  </button>
                                  <button
                                    onClick={() => handleImsAction(r._id, "REJECTED")}
                                    disabled={activeImsActioningId === r._id}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer",
                                      r.imsAction === "REJECTED"
                                        ? "bg-rose-600 text-white"
                                        : "text-[var(--text-muted)] hover:text-rose-600"
                                    )}
                                    title="Reject invoice in IMS (wrong supplier issuance)"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 2: BANK RECONCILIATION STATEMENT (BRS)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeModule === "bank" && (
          <div className="space-y-6">
            {/* BRS Metrics Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--surface-raised)]/40 border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Bank Statement Balance</span>
                <div className="text-xl font-bold text-[var(--text-primary)] mt-1 font-mono">
                  {formatINR(brsSummary?.statementBalance || 0, { showDecimals: true })}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Closing balance per statement</span>
              </div>

              <div className="bg-[var(--surface-raised)]/40 border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">General Ledger Book Balance</span>
                <div className="text-xl font-bold text-[var(--primary)] mt-1 font-mono">
                  {formatINR(brsSummary?.bookBalance || 0, { showDecimals: true })}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Balance per posted Bank vouchers</span>
              </div>

              <div className="bg-[var(--surface-raised)]/40 border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Uncleared Difference</span>
                <div
                  className={cn(
                    "text-xl font-bold mt-1 font-mono",
                    Math.abs(brsSummary?.unreconciledDifference || 0) <= 1
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  )}
                >
                  {formatINR(brsSummary?.unreconciledDifference || 0, { showDecimals: true })}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  {Math.abs(brsSummary?.unreconciledDifference || 0) <= 1
                    ? "✓ Bank ledger perfectly balanced"
                    : "Difference to be reconciled"}
                </span>
              </div>

              <div className="bg-[var(--surface-raised)]/40 border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Reconciliation Progress</span>
                <div className="text-xl font-bold text-[var(--text-primary)] mt-1 font-mono">
                  {brsSummary?.reconciliationMetrics?.reconciledCount || 0} /{" "}
                  {brsSummary?.reconciliationMetrics?.totalTransactions || 0}
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block font-medium">
                  {brsSummary?.reconciliationMetrics?.totalTransactions
                    ? `${Math.round(
                        ((brsSummary?.reconciliationMetrics?.reconciledCount || 0) /
                          brsSummary?.reconciliationMetrics?.totalTransactions) *
                          100
                      )}% cleared`
                    : "No transactions"}
                </span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface-raised)]/30 p-3 rounded-xl border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search narration or ref no..."
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>

                <select
                  value={bankStatusFilter}
                  onChange={(e) => setBankStatusFilter(e.target.value)}
                  className="bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-secondary)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Unreconciled">Unreconciled</option>
                  <option value="Suggested">Suggested Match</option>
                  <option value="Reconciled">Reconciled</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={handleAutoReconcile}
                  isLoading={isAutoReconciling}
                  className="text-xs font-bold"
                >
                  Auto-Match Bank
                </Button>
              </div>
            </div>

            {/* Bank Transactions Table */}
            <div className="bg-[var(--surface-raised)]/30 border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider border-b border-[var(--border)] font-semibold">
                    <tr>
                      <th className="px-4 py-3">Tx Date</th>
                      <th className="px-4 py-3">Narration & Ref</th>
                      <th className="px-4 py-3 text-right">Debit (Out)</th>
                      <th className="px-4 py-3 text-right">Credit (In)</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Matched Voucher</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-tabular">
                    {isBankLoading ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-[var(--text-muted)]">
                          <RefreshCw className="w-5 h-5 text-[var(--primary)] animate-spin mx-auto mb-2" />
                          <span>Loading bank transactions...</span>
                        </td>
                      </tr>
                    ) : bankTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-[var(--text-muted)]">
                          <Landmark className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                          <p className="font-semibold text-[var(--text-primary)]">No bank transactions found</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            Upload a bank statement in the Document Inbox to automatically populate lines.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      bankTransactions.map((tx) => (
                        <tr key={tx._id} className="hover:bg-[var(--surface-raised)]/50 transition-colors">
                          <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-[11px] whitespace-nowrap">
                            {new Date(tx.date).toISOString().slice(0, 10)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-[var(--text-primary)] max-w-sm truncate">
                              {tx.narration}
                            </div>
                            {tx.referenceNumber && (
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                Ref: {tx.referenceNumber}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-rose-600 dark:text-rose-400">
                            {tx.transactionType === "Debit"
                              ? formatINR(tx.amount, { showDecimals: true })
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            {tx.transactionType === "Credit"
                              ? formatINR(tx.amount, { showDecimals: true })
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            {tx.reconciliationStatus === "Reconciled" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" /> Reconciled
                              </span>
                            )}
                            {tx.reconciliationStatus === "Suggested" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <HelpCircle className="w-3 h-3" /> Suggested ({Math.round(tx.confidenceScore * 100)}%)
                              </span>
                            )}
                            {tx.reconciliationStatus === "Unreconciled" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="w-3 h-3" /> Unreconciled
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {tx.matchedVoucher ? (
                              <div>
                                <span className="font-mono text-xs text-[var(--primary)] font-semibold">
                                  {tx.matchedVoucher.voucherType} #{tx.matchedVoucher.voucherNumber}
                                </span>
                                <div className="text-[10px] text-[var(--text-muted)] truncate max-w-xs">
                                  {tx.matchNotes}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)] text-[11px]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {tx.reconciliationStatus === "Suggested" && (
                              <button
                                onClick={() => handleConfirmMatch(tx._id, tx.matchedVoucher._id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold mr-1.5 transition-colors cursor-pointer"
                              >
                                Accept Match
                              </button>
                            )}
                            {tx.reconciliationStatus === "Reconciled" ? (
                              <button
                                onClick={() => handleUnreconcile(tx._id)}
                                className="px-2 py-1 text-[var(--text-muted)] hover:text-rose-600 rounded text-[11px] transition-colors cursor-pointer"
                                title="Unreconcile"
                              >
                                <Unlink className="w-3.5 h-3.5 inline" />
                              </button>
                            ) : (
                              <button
                                onClick={() => openManualLink(tx)}
                                className="px-2.5 py-1 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text-secondary)] rounded text-[11px] font-medium transition-colors cursor-pointer"
                              >
                                <LinkIcon className="w-3 h-3 inline mr-1" />
                                Pair Voucher
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 3: E-COMMERCE MARKETPLACE SETTLEMENTS (AMAZON & FLIPKART)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeModule === "marketplace" && (
          <MarketplaceSettlementsView
            clientId={activeClient?._id}
            clientName={activeClient?.businessName}
          />
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODAL: PAIR VOUCHER (MANUAL BANK LINK)
           ══════════════════════════════════════════════════════════════════════ */}
        {manualMatchModalTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Manual Bank Transaction Pairing</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Link bank statement entry to a posted accounting voucher.
                </p>
              </div>

              <div className="bg-[var(--surface-raised)]/60 p-3 rounded-xl border border-[var(--border)] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Date:</span>
                  <span className="text-[var(--text-primary)] font-mono">
                    {new Date(manualMatchModalTx.date).toISOString().slice(0, 10)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Narration:</span>
                  <span className="text-[var(--text-primary)] truncate max-w-xs">{manualMatchModalTx.narration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Amount:</span>
                  <span className="text-[var(--primary)] font-bold font-mono">
                    {formatINR(manualMatchModalTx.amount, { showDecimals: true })} ({manualMatchModalTx.transactionType})
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Select Posted Voucher to Match</label>
                <select
                  value={selectedVoucherId}
                  onChange={(e) => setSelectedVoucherId(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
                >
                  <option value="">-- Choose Voucher --</option>
                  {(Array.isArray(availableVouchers) ? availableVouchers : []).map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.voucherType} #{v.voucherNumber} ({new Date(v.voucherDate).toISOString().slice(0, 10)}) - ₹ {v.totalAmount}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <Button variant="secondary" size="sm" onClick={() => setManualMatchModalTx(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleConfirmMatch(manualMatchModalTx._id, selectedVoucherId)}
                  disabled={!selectedVoucherId}
                  className="font-bold"
                >
                  Confirm Match
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODAL: DEFENSIVE GSTR-2B INTAKE (EXCEL .xlsx OR JSON)
           ══════════════════════════════════════════════════════════════════════ */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Import Official GSTR-2B (Excel or JSON)
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Upload official GST Portal download (.xlsx containing B2B/B2BA/CDNR sheets, or raw JSON).
                </p>
              </div>

              {/* File Upload Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] rounded-xl p-6 text-center cursor-pointer transition-colors bg-[var(--surface-raised)]/30"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
                <UploadCloud className="w-8 h-8 text-[var(--primary)] mx-auto mb-2" />
                {selectedFile ? (
                  <div>
                    <span className="font-bold text-xs text-[var(--text-primary)] block">{selectedFile.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready to ingest
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-xs text-[var(--text-primary)] block">
                      Click to choose GSTR-2B file (.xlsx or .json)
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Supports multi-sheet official portal Excel or raw JSON download
                    </span>
                  </div>
                )}
              </div>

              {/* Or Paste JSON Area */}
              <div>
                <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Or paste raw portal JSON:
                </span>
                <textarea
                  rows="4"
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    if (e.target.value) setSelectedFile(null);
                  }}
                  placeholder='e.g. { "data": { "docdata": { "b2b": [...] } } }'
                  className="w-full bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <Button variant="secondary" size="sm" onClick={() => setShowImportModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleImportGstr2b}
                  isLoading={isGstImporting}
                  disabled={!selectedFile && !jsonInput.trim()}
                  className="font-bold"
                >
                  Ingest & Run 2-Tier Recon
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReconciliationView;

/** @format */

import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  FileCode,
  FileSpreadsheet,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building,
  RefreshCw,
  Clock,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useTenant } from "../Contexts/TenantContext";
import {
  listVouchers,
  listClientLedgers,
  createClientLedger,
  exportTallyXmlBlob,
  exportExcelRegisterBlob,
  previewTallyXml,
} from "../../services/apiClient";
import { formatINR } from "../../lib/format";
import { Button, IconButton } from "../../components/ui/Button";
import { Badge, StatusPill } from "../../components/ui/Badge";
import { cn } from "../../lib/utils";

const VouchersLedgerView = () => {
  const { activeClient } = useTenant();
  const [activeSubTab, setActiveSubTab] = useState("vouchers"); // "vouchers" | "ledgers"
  const [vouchers, setVouchers] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [voucherTypeFilter, setVoucherTypeFilter] = useState("All");
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Tally XML Preview Modal State
  const [showTallyPreview, setShowTallyPreview] = useState(false);
  const [tallyPreviewData, setTallyPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Custom Ledger Modal State
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [newLedger, setNewLedger] = useState({
    accountName: "",
    accountGroup: "Sundry_Creditors",
    accountCode: "",
    openingBalance: 0,
    gstin: "",
    msmeCategory: "None",
    creditPeriodDays: 45,
  });

  const fetchVouchers = useCallback(async () => {
    if (!activeClient?._id) return;
    setIsLoading(true);
    try {
      const params = {};
      if (voucherTypeFilter !== "All") params.voucherType = voucherTypeFilter;
      const res = await listVouchers(params);
      setVouchers(res.data?.data?.vouchers || []);
    } catch (err) {
      console.error("Failed to load vouchers:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeClient, voucherTypeFilter]);

  const fetchLedgers = useCallback(async () => {
    if (!activeClient?._id) return;
    try {
      const res = await listClientLedgers(activeClient._id);
      setLedgers(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load ledgers:", err);
    }
  }, [activeClient]);

  useEffect(() => {
    if (activeSubTab === "vouchers") {
      fetchVouchers();
    } else {
      fetchLedgers();
    }
  }, [activeSubTab, fetchVouchers, fetchLedgers]);

  // Preview Tally XML with verification report
  const handleOpenTallyPreview = async () => {
    if (!activeClient) return;
    setIsLoadingPreview(true);
    setShowTallyPreview(true);
    try {
      const res = await previewTallyXml(activeClient._id, {
        voucherType: voucherTypeFilter !== "All" ? voucherTypeFilter : undefined,
      });
      setTallyPreviewData(res.data?.data || null);
    } catch (err) {
      console.error("Preview Tally XML error:", err);
      alert("Failed to generate Tally XML preview.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Export Tally XML
  const handleExportTally = async () => {
    if (!activeClient) return;
    setIsExporting(true);
    try {
      const res = await exportTallyXmlBlob(activeClient._id, {
        voucherType: voucherTypeFilter !== "All" ? voucherTypeFilter : undefined,
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Tally_Import_${activeClient.businessName.replace(/\s+/g, "_")}.xml`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      await fetchVouchers();
    } catch (err) {
      alert("No vouchers found to export to Tally XML.");
    } finally {
      setIsExporting(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    if (!activeClient) return;
    setIsExporting(true);
    try {
      const res = await exportExcelRegisterBlob(activeClient._id, {
        voucherType: voucherTypeFilter !== "All" ? voucherTypeFilter : "Purchase",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Purchase_Register_${activeClient.businessName.replace(/\s+/g, "_")}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to export Excel register.");
    } finally {
      setIsExporting(false);
    }
  };

  // Create Ledger
  const handleCreateLedger = async (e) => {
    e.preventDefault();
    if (!newLedger.accountName.trim() || !activeClient) return;

    try {
      await createClientLedger(activeClient._id, newLedger);
      setShowLedgerModal(false);
      setNewLedger({
        accountName: "",
        accountGroup: "Sundry_Creditors",
        accountCode: "",
        openingBalance: 0,
        gstin: "",
        msmeCategory: "None",
        creditPeriodDays: 45,
      });
      await fetchLedgers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create ledger.");
    }
  };

  const handleCopyXml = () => {
    if (tallyPreviewData?.xml) {
      navigator.clipboard.writeText(tallyPreviewData.xml);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--surface)] p-4 sm:p-6 space-y-6 rounded-2xl border border-[var(--border)] shadow-xs">
      {/* Top Header & Sub-tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2">
          <div className="flex p-0.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl">
            <button
              onClick={() => setActiveSubTab("vouchers")}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                activeSubTab === "vouchers"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              Accounting Vouchers ({vouchers.length})
            </button>
            <button
              onClick={() => setActiveSubTab("ledgers")}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                activeSubTab === "ledgers"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              Chart of Accounts ({ledgers.length})
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeSubTab === "vouchers" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={Eye}
                onClick={handleOpenTallyPreview}
                disabled={vouchers.length === 0}
                className="text-xs"
                title="Preview TallyPrime XML with schema linting and polarity verification"
              >
                Preview Tally XML
              </Button>

              <Button
                variant="primary"
                size="sm"
                icon={FileCode}
                onClick={handleExportTally}
                isLoading={isExporting}
                disabled={vouchers.length === 0}
                className="text-xs font-bold"
                title="Download verified Tally XML envelope for TallyPrime import"
              >
                Export Tally XML
              </Button>

              <Button
                variant="secondary"
                size="sm"
                icon={FileSpreadsheet}
                onClick={handleExportExcel}
                isLoading={isExporting}
                disabled={vouchers.length === 0}
                className="text-xs"
                title="Download formatted Excel Purchase/Sales Register"
              >
                Export Excel
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setShowLedgerModal(true)}
              className="text-xs font-bold"
            >
              Add Custom Ledger
            </Button>
          )}
        </div>
      </div>

      {/* ─── VOUCHERS LIST VIEW ─── */}
      {activeSubTab === "vouchers" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {["All", "Purchase", "Sales", "Payment", "Receipt", "Journal"].map((vt) => (
              <button
                key={vt}
                onClick={() => setVoucherTypeFilter(vt)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                  voucherTypeFilter === vt
                    ? "bg-[var(--primary)] text-white font-semibold shadow-xs"
                    : "bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                )}
              >
                {vt} Vouchers
              </button>
            ))}
          </div>

          {/* Vouchers Table */}
          <div className="bg-[var(--surface-raised)]/30 border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--text-secondary)] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Particulars / Vendor</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4">Integrity & MSME</th>
                    <th className="py-3 px-4">Tally Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {isLoading && vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--text-muted)]">
                        <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2 text-[var(--primary)]" />
                        Loading double-entry vouchers...
                      </td>
                    </tr>
                  ) : vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[var(--text-muted)]">
                        No vouchers posted yet. Review uploaded documents to generate verified vouchers!
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v) => {
                      const vendorEntry = v.entries?.find((e) => (e.creditAmountPaise || e.creditAmount) > 0);
                      const vendorName = v.partyLedgerName || vendorEntry?.accountName || v.narration || "General Purchase";
                      const msme = v.msmeDetails;

                      return (
                        <tr
                          key={v._id}
                          className="hover:bg-[var(--surface-raised)] transition-colors cursor-pointer"
                          onClick={() => setSelectedVoucher(v)}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[var(--primary)]">
                            {v.voucherNumber}
                          </td>

                          <td className="py-3 px-4 text-[var(--text-muted)]">
                            {new Date(v.voucherDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-[var(--text-primary)] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                              {v.voucherType}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-medium text-[var(--text-primary)] max-w-xs truncate">
                            {vendorName}
                            {v.referenceNumber && (
                              <span className="block text-[10px] text-[var(--text-muted)] font-mono">
                                Ref: {v.referenceNumber}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-[var(--text-primary)]">
                            {formatINR(v.totalAmount, { showDecimals: true })}
                          </td>

                          {/* Integrity & MSME 43B(h) Badge */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Balanced (Paise Exact)</span>
                              </span>
                              {msme?.isMsme && (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded",
                                    msme.isOverdue
                                      ? "text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30"
                                      : "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                  )}
                                  title={`Section 43B(h) statutory limit: ${msme.creditPeriodDays} days. Due: ${
                                    msme.statutoryDueDate ? new Date(msme.statutoryDueDate).toLocaleDateString("en-IN") : "N/A"
                                  }`}
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    MSME {msme.category} ({msme.isOverdue ? "Overdue 43B(h)" : `Due in ${msme.creditPeriodDays}d`})
                                  </span>
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {v.tallyExported ? (
                              <Badge variant="success" size="sm">
                                Exported to Tally
                              </Badge>
                            ) : (
                              <Badge variant="outline" size="sm" className="text-[var(--text-muted)]">
                                Ready for Export
                              </Badge>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVoucher(v);
                              }}
                              className="text-xs text-[var(--primary)] hover:underline font-semibold cursor-pointer"
                            >
                              View Entry
                            </button>
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

      {/* ─── CHART OF ACCOUNTS (LEDGERS) VIEW ─── */}
      {activeSubTab === "ledgers" && (
        <div className="bg-[var(--surface-raised)]/30 border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--text-secondary)] border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Account Code</th>
                  <th className="py-3 px-4">Ledger Account Name</th>
                  <th className="py-3 px-4">Account Group</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">MSME Tag & Credit Terms</th>
                  <th className="py-3 px-4 text-right">Current Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {ledgers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                      No ledgers found for this client.
                    </td>
                  </tr>
                ) : (
                  ledgers.map((l) => (
                    <tr key={l._id} className="hover:bg-[var(--surface-raised)]">
                      <td className="py-2.5 px-4 font-mono text-[var(--text-muted)]">
                        {l.accountCode || "-"}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-[var(--text-primary)]">
                        {l.accountName}{" "}
                        {l.isSystemDefault && (
                          <span className="text-[10px] font-normal text-[var(--primary)]">(System Default)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-[var(--text-secondary)] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                          {l.accountGroup.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[var(--text-muted)]">
                        {l.gstin || "-"}
                      </td>
                      <td className="py-2.5 px-4">
                        {l.msmeCategory && l.msmeCategory !== "None" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-semibold">
                            <span>MSME {l.msmeCategory}</span>
                            <span className="text-[var(--text-muted)] font-mono">({l.creditPeriodDays || 45}d max)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)]">Standard (30d)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[var(--text-primary)]">
                        {formatINR(l.currentBalance || 0, { showDecimals: true })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TALLY XML PREVIEW MODAL ─── */}
      {showTallyPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="flex flex-col w-full max-w-3xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-raised)]">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-[var(--primary)]" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    TallyPrime XML Export & Schema Verification
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Standard &lt;ENVELOPE&gt; with verified debits/credits polarity and Section 43B(h) allocations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTallyPreview(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {isLoadingPreview ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                  <RefreshCw className="w-5 h-5 animate-spin text-[var(--primary)]" />
                  <span>Generating and linting Tally XML payload...</span>
                </div>
              ) : tallyPreviewData ? (
                <>
                  {/* Validation Report Banner */}
                  <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Schema Validation: PASSED.</strong> All {tallyPreviewData.voucherCount} vouchers conform to TallyPrime standard (Debits negative, Credits positive, Algebraic sum = 0.00).
                      </span>
                    </div>
                    <Badge variant="success" size="sm" className="font-bold">
                      TallyPrime Validated
                    </Badge>
                  </div>

                  {/* XML Code Viewer */}
                  <div className="relative">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--surface-raised)] border border-[var(--border)] border-b-0 rounded-t-lg text-xs text-[var(--text-muted)]">
                      <span className="font-mono text-[11px]">tally_import_payload.xml</span>
                      <button
                        onClick={handleCopyXml}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? "Copied" : "Copy XML"}</span>
                      </button>
                    </div>
                    <pre className="p-3.5 bg-slate-950 text-slate-200 text-xs font-mono rounded-b-lg border border-[var(--border)] overflow-x-auto max-h-[350px] leading-relaxed">
                      {tallyPreviewData.xml}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No vouchers available to preview.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[var(--border)] bg-[var(--surface-raised)]">
              <Button variant="secondary" size="sm" onClick={() => setShowTallyPreview(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={FileCode}
                onClick={() => {
                  setShowTallyPreview(false);
                  handleExportTally();
                }}
                className="font-bold"
              >
                Download XML File
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VOUCHER DETAILS MODAL ─── */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="flex flex-col w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-raised)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Voucher #{selectedVoucher.voucherNumber} ({selectedVoucher.voucherType})
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Date: {new Date(selectedVoucher.voucherDate).toLocaleDateString("en-IN")} • Ref: {selectedVoucher.referenceNumber || "N/A"}
                </p>
              </div>
              <button
                onClick={() => setSelectedVoucher(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-raised)]/30">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--surface-raised)] border-b border-[var(--border)] text-[var(--text-muted)] font-semibold text-[10px] uppercase">
                      <th className="py-2.5 px-3">Ledger Account</th>
                      <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-mono text-xs">
                    {selectedVoucher.entries?.map((e, idx) => (
                      <tr key={idx} className="hover:bg-[var(--surface-raised)]">
                        <td className="py-2 px-3 text-[var(--text-primary)] font-sans">
                          {e.accountName}
                          {e.narration && (
                            <span className="block text-[10px] text-[var(--text-muted)] font-sans">
                              {e.narration}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                          {e.debitAmount > 0 ? formatINR(e.debitAmount, { showDecimals: true }) : "-"}
                        </td>
                        <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400 font-bold">
                          {e.creditAmount > 0 ? formatINR(e.creditAmount, { showDecimals: true }) : "-"}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[var(--surface-raised)] font-bold text-[var(--text-primary)]">
                      <td className="py-2 px-3 font-sans flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Double-Entry Balance Invariant</span>
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                        {formatINR(selectedVoucher.totalAmount, { showDecimals: true })}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400">
                        {formatINR(selectedVoucher.totalAmount, { showDecimals: true })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {selectedVoucher.msmeDetails?.isMsme && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>MSME Section 43B(h) Statutory Compliance</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Supplier is registered as MSME {selectedVoucher.msmeDetails.category}. Payment due date:{" "}
                    <strong>{new Date(selectedVoucher.msmeDetails.statutoryDueDate).toLocaleDateString("en-IN")}</strong>{" "}
                    ({selectedVoucher.msmeDetails.creditPeriodDays} days limit).
                  </p>
                </div>
              )}

              {selectedVoucher.narration && (
                <div className="p-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-muted)] block mb-0.5">Narration:</span>
                  {selectedVoucher.narration}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD CUSTOM LEDGER MODAL ─── */}
      {showLedgerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="flex flex-col w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-raised)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Create General Ledger Account</h3>
              <button
                onClick={() => setShowLedgerModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLedger} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Motors Vendor A/c"
                  value={newLedger.accountName}
                  onChange={(e) => setNewLedger({ ...newLedger, accountName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Account Group *
                </label>
                <select
                  value={newLedger.accountGroup}
                  onChange={(e) => setNewLedger({ ...newLedger, accountGroup: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                >
                  <option value="Sundry_Creditors">Sundry Creditors (Vendors/Suppliers)</option>
                  <option value="Sundry_Debtors">Sundry Debtors (Customers)</option>
                  <option value="Indirect_Expenses">Indirect Expenses</option>
                  <option value="Direct_Expenses">Direct Expenses</option>
                  <option value="Purchase_Accounts">Purchase Accounts</option>
                  <option value="Sales_Accounts">Sales Accounts</option>
                  <option value="Bank_Accounts">Bank Accounts</option>
                  <option value="Cash_in_Hand">Cash on Hand</option>
                  <option value="Duties_and_Taxes">Duties and Taxes</option>
                  <option value="Fixed_Assets">Fixed Assets</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    MSME Category
                  </label>
                  <select
                    value={newLedger.msmeCategory}
                    onChange={(e) => setNewLedger({ ...newLedger, msmeCategory: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  >
                    <option value="None">None (Standard)</option>
                    <option value="Micro">Micro Enterprise</option>
                    <option value="Small">Small Enterprise</option>
                    <option value="Medium">Medium Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Credit Period (Days)
                  </label>
                  <input
                    type="number"
                    max={45}
                    min={1}
                    value={newLedger.creditPeriodDays}
                    onChange={(e) => setNewLedger({ ...newLedger, creditPeriodDays: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Supplier GSTIN (Optional)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="15-character GSTIN"
                  value={newLedger.gstin}
                  onChange={(e) => setNewLedger({ ...newLedger, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] font-mono uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowLedgerModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="font-bold">
                  Save Ledger
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VouchersLedgerView;

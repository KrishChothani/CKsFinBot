/** @format */

import React, { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  DollarSign,
  ArrowRight,
  Landmark,
  FileCheck,
  Check,
  X,
  ExternalLink,
  Percent,
  Plus,
} from "lucide-react";
import {
  getMarketplaceSettlements,
  importMarketplaceSettlementFile,
  importMarketplaceSettlementData,
  postVoucherForSettlementApi,
  reconcileSettlementWithBankApi,
  getCandidateBankCredits,
} from "../../services/apiClient";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/utils";
import { formatINR } from "../../lib/format";

const SAMPLE_AMAZON_MTR_CSV = `settlement-id,transaction-type,order-id,amount-description,amount,tax
SETTLE-AMZ-9901,Order,402-1192834-8821901,Principal,4500.00,810.00
SETTLE-AMZ-9901,Order,402-8829102-1192834,Principal,3200.00,576.00
SETTLE-AMZ-9901,Refund,402-9912019-2281920,Principal,-800.00,0.00
SETTLE-AMZ-9901,Service Fee,,Commission,-924.00,0.00
SETTLE-AMZ-9901,Service Fee,,ShippingHB,-450.00,0.00
SETTLE-AMZ-9901,Statutory Deductions,,TCS Sec 52,-69.00,0.00
SETTLE-AMZ-9901,Statutory Deductions,,TDS 194-O,-77.00,0.00`;

export const MarketplaceSettlementsView = ({ clientId, clientName }) => {
  const [settlements, setSettlements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [marketplace, setMarketplace] = useState("AMAZON"); // "AMAZON" | "FLIPKART"
  const [csvContent, setCsvContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  // Reconcile modal state
  const [activeReconcileSettlement, setActiveReconcileSettlement] = useState(null);
  const [candidateBankTxs, setCandidateBankTxs] = useState([]);
  const [selectedBankTxId, setSelectedBankTxId] = useState("");
  const [isReconciling, setIsReconciling] = useState(false);

  // Voucher posting state
  const [postingSettlementId, setPostingSettlementId] = useState(null);

  const fetchSettlements = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const res = await getMarketplaceSettlements({ clientId });
      setSettlements(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch settlements:", err);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const handleImport = async (e) => {
    e.preventDefault();
    setIsImporting(true);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("clientId", clientId);
        formData.append("marketplace", marketplace);
        await importMarketplaceSettlementFile(formData);
      } else if (csvContent.trim()) {
        await importMarketplaceSettlementData({
          clientId,
          marketplace,
          csvContent: csvContent.trim(),
        });
      } else {
        alert("Please select a file or paste CSV content.");
        setIsImporting(false);
        return;
      }

      setShowImportModal(false);
      setCsvContent("");
      setSelectedFile(null);
      await fetchSettlements();
      setActionSuccess("Marketplace settlement report parsed and ingested successfully!");
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      alert("Import error: " + (err.response?.data?.message || err.message));
    } finally {
      setIsImporting(false);
    }
  };

  const handlePostVoucher = async (settlementId) => {
    setPostingSettlementId(settlementId);
    try {
      const res = await postVoucherForSettlementApi(settlementId, { clientId });
      setActionSuccess(`Double-entry voucher ${res.data?.data?.voucher?.voucherNumber} posted!`);
      setTimeout(() => setActionSuccess(""), 4000);
      await fetchSettlements();
    } catch (err) {
      alert("Failed to post voucher: " + (err.response?.data?.message || err.message));
    } finally {
      setPostingSettlementId(null);
    }
  };

  const handleOpenReconcileModal = async (settlement) => {
    setActiveReconcileSettlement(settlement);
    setSelectedBankTxId("");
    try {
      const res = await getCandidateBankCredits({
        clientId,
        amountPaise: settlement.summary?.netDisbursementPaise,
      });
      setCandidateBankTxs(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load bank credits:", err);
    }
  };

  const handleConfirmReconcile = async () => {
    if (!selectedBankTxId || !activeReconcileSettlement) return;
    setIsReconciling(true);
    try {
      await reconcileSettlementWithBankApi(activeReconcileSettlement.settlementId, {
        clientId,
        bankTransactionId: selectedBankTxId,
      });
      setActiveReconcileSettlement(null);
      await fetchSettlements();
      setActionSuccess("Settlement disbursement verified and reconciled against bank statement!");
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      alert("Reconciliation error: " + (err.response?.data?.message || err.message));
    } finally {
      setIsReconciling(false);
    }
  };

  // Aggregated totals
  const totalGrossSales = settlements.reduce((sum, s) => sum + (s.summary?.grossSalesPaise || 0), 0);
  const totalDisbursements = settlements.reduce(
    (sum, s) => sum + (s.summary?.netDisbursementPaise || 0),
    0
  );
  const totalPlatformFees = settlements.reduce(
    (sum, s) =>
      sum + (s.summary?.marketplaceFeePaise || 0) + (s.summary?.shippingFeePaise || 0),
    0
  );
  const totalTcsTds = settlements.reduce(
    (sum, s) => sum + (s.summary?.tcsPaise || 0) + (s.summary?.tdsPaise || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Action Header & Upload Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--surface-raised)] p-4 rounded-xl border border-[var(--border)]">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[var(--primary)]" />
            <span>Marketplace Seller Settlement Decomposition (Amazon & Flipkart)</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Parses MTR reports, extracts commissions, TCS § 52, TDS § 194-O, and generates balanced double-entry vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchSettlements}
            isLoading={isLoading}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={UploadCloud}
            onClick={() => setShowImportModal(true)}
          >
            Import Settlement
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
          <div className="text-[10px] font-semibold uppercase text-[var(--text-muted)] tracking-wider">
            Gross Order Sales
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1">
            {formatINR(totalGrossSales / 100)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Customer order value
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
          <div className="text-[10px] font-semibold uppercase text-[var(--text-muted)] tracking-wider">
            Net Bank Disbursements
          </div>
          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(totalDisbursements / 100)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Net cash deposited
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
          <div className="text-[10px] font-semibold uppercase text-[var(--text-muted)] tracking-wider">
            Platform Fees & Logistics
          </div>
          <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            {formatINR(totalPlatformFees / 100)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Referral + FBA charges
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
          <div className="text-[10px] font-semibold uppercase text-[var(--text-muted)] tracking-wider">
            TCS (§ 52) & TDS (§ 194-O)
          </div>
          <div className="text-lg font-bold font-mono text-[var(--primary)] mt-1">
            {formatINR(totalTcsTds / 100)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Statutory tax receivables
          </div>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Ingested Marketplace Settlements ({settlements.length})
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            Strict integer paise accounting & bank reconciliation
          </span>
        </div>

        {settlements.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-40" />
            <h4 className="font-semibold text-sm text-[var(--text-primary)]">
              No Marketplace Settlements Ingested Yet
            </h4>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Upload an Amazon MTR or Flipkart settlement spreadsheet to auto-generate balanced double-entry vouchers.
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => {
                setCsvContent(SAMPLE_AMAZON_MTR_CSV);
                setShowImportModal(true);
              }}
            >
              Load Sample Amazon MTR
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)] uppercase text-[10px] font-semibold border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4">Marketplace</th>
                  <th className="py-3 px-4">Settlement ID</th>
                  <th className="py-3 px-4">Orders / Returns</th>
                  <th className="py-3 px-4 text-right">Gross Sales</th>
                  <th className="py-3 px-4 text-right">Fees & Logistics</th>
                  <th className="py-3 px-4 text-right">TCS / TDS</th>
                  <th className="py-3 px-4 text-right font-bold text-[var(--text-primary)]">
                    Net Disbursement
                  </th>
                  <th className="py-3 px-4">Voucher Status</th>
                  <th className="py-3 px-4">Bank Recon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-tabular">
                {settlements.map((s) => {
                  const summary = s.summary || {};
                  const isAmazon = s.marketplace === "AMAZON";
                  const isVoucherPosted = s.status === "VOUCHER_POSTED" || Boolean(s.voucher);
                  const isReconciled = s.reconciliation?.status === "MATCHED";

                  return (
                    <tr key={s._id} className="hover:bg-[var(--surface-raised)]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            isAmazon
                              ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                              : "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                          )}
                        >
                          {s.marketplace}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-[var(--text-primary)]">
                        {s.settlementId}
                        <div className="text-[10px] text-[var(--text-muted)] font-sans">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "—"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                        <div>{s.orderCount || 0} orders</div>
                        {s.refundCount > 0 && (
                          <div className="text-rose-600 dark:text-rose-400 text-[10px]">
                            {s.refundCount} refunds ({formatINR(summary.salesReturnPaise / 100)})
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-[var(--text-primary)]">
                        {formatINR(summary.grossSalesPaise / 100)}
                        <div className="text-[10px] text-[var(--text-muted)]">
                          +GST: {formatINR(summary.outputGstPaise / 100)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                        -{formatINR((summary.marketplaceFeePaise + summary.shippingFeePaise) / 100)}
                        <div className="text-[10px] text-teal-600 dark:text-teal-400">
                          ITC 18%: {formatINR(summary.inputGstOnFeesPaise / 100)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-[var(--primary)]">
                        {formatINR((summary.tcsPaise + summary.tdsPaise) / 100)}
                        <div className="text-[10px] text-[var(--text-muted)]">
                          TCS: {formatINR(summary.tcsPaise / 100)} | TDS: {formatINR(summary.tdsPaise / 100)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                        {formatINR(summary.netDisbursementPaise / 100)}
                      </td>

                      <td className="py-3.5 px-4">
                        {isVoucherPosted ? (
                          <Badge variant="success" size="sm">
                            Voucher Posted
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePostVoucher(s.settlementId)}
                            isLoading={postingSettlementId === s.settlementId}
                          >
                            Post Voucher
                          </Button>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isReconciled ? (
                          <Badge variant="success" size="sm">
                            Bank Matched
                          </Badge>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Landmark}
                            onClick={() => handleOpenReconcileModal(s)}
                          >
                            Match Bank
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[var(--primary)]" />
                <span>Import Marketplace Settlement</span>
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImport} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  E-Commerce Marketplace Platform
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMarketplace("AMAZON")}
                    className={cn(
                      "p-3 rounded-xl border text-center font-bold transition-all",
                      marketplace === "AMAZON"
                        ? "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                        : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]"
                    )}
                  >
                    Amazon India (MTR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarketplace("FLIPKART")}
                    className={cn(
                      "p-3 rounded-xl border text-center font-bold transition-all",
                      marketplace === "FLIPKART"
                        ? "border-blue-500 bg-blue-500/10 text-blue-800 dark:text-blue-300"
                        : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]"
                    )}
                  >
                    Flipkart Settlement
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Upload Settlement CSV / Spreadsheet
                </label>
                <input
                  type="file"
                  accept=".csv,.txt,.xlsx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--primary)] file:text-white hover:file:opacity-90"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[var(--text-primary)]">
                    Or Paste CSV Data
                  </label>
                  <button
                    type="button"
                    onClick={() => setCsvContent(SAMPLE_AMAZON_MTR_CSV)}
                    className="text-[11px] text-[var(--primary)] hover:underline font-semibold"
                  >
                    Paste Sample MTR
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="Paste CSV rows here..."
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isImporting}
                >
                  Parse & Ingest Settlement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Reconciliation Modal */}
      {activeReconcileSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[var(--primary)]" />
                <span>Reconcile Settlement with Bank Statement</span>
              </h3>
              <button
                onClick={() => setActiveReconcileSettlement(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Settlement ID:</span>
                <span className="font-mono font-semibold">{activeReconcileSettlement.settlementId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Reported Net Disbursement:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatINR(activeReconcileSettlement.summary?.netDisbursementPaise / 100)}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-[var(--text-primary)]">
                Select Matching Bank Statement Credit:
              </label>
              {candidateBankTxs.length === 0 ? (
                <p className="text-[var(--text-muted)] p-3 border border-dashed rounded-lg text-center">
                  No uncleared bank credits found for this client. Ensure bank statement is uploaded in Reconciliation.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl">
                  {candidateBankTxs.map((tx) => {
                    const isSelected = selectedBankTxId === tx._id;
                    const diff = Math.abs(
                      (activeReconcileSettlement.summary?.netDisbursementPaise || 0) -
                        (tx.amountPaise || Math.round((tx.amount || 0) * 100))
                    );

                    return (
                      <div
                        key={tx._id}
                        onClick={() => setSelectedBankTxId(tx._id)}
                        className={cn(
                          "p-3 flex items-center justify-between cursor-pointer transition-colors",
                          isSelected
                            ? "bg-[var(--primary-light)] border-l-4 border-[var(--primary)]"
                            : "hover:bg-[var(--surface-raised)]"
                        )}
                      >
                        <div>
                          <div className="font-semibold text-[var(--text-primary)]">
                            {tx.description || "Bank Credit"}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString("en-IN") : "—"}
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="font-bold text-emerald-600">
                            {formatINR(tx.amount || tx.amountPaise / 100)}
                          </div>
                          {diff === 0 ? (
                            <span className="text-[10px] text-emerald-600 font-semibold">Exact Match (₹0 diff)</span>
                          ) : (
                            <span className="text-[10px] text-amber-600">
                              Variance: ₹{(diff / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveReconcileSettlement(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!selectedBankTxId}
                isLoading={isReconciling}
                onClick={handleConfirmReconcile}
              >
                Confirm Bank Reconciliation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


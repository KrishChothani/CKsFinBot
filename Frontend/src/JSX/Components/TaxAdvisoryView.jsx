/** @format */

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  BookOpen,
  FileText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  DollarSign,
  Building,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useTenant } from "../Contexts/TenantContext";
import {
  getTaxAdvisorySummary,
  getMsmePaymentTracker,
  getActiveTaxRules,
} from "../../services/apiClient";

const TaxAdvisoryView = () => {
  const { activeClient } = useTenant();
  const [activeSubTab, setActiveSubTab] = useState("flags"); // "flags" | "msme" | "rules"

  const [advisoryData, setAdvisoryData] = useState(null);
  const [msmeData, setMsmeData] = useState(null);
  const [taxRulesData, setTaxRulesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTaxData = useCallback(async () => {
    if (!activeClient?._id) return;
    setIsLoading(true);
    try {
      if (activeSubTab === "flags") {
        const res = await getTaxAdvisorySummary(activeClient._id);
        setAdvisoryData(res.data?.data);
      } else if (activeSubTab === "msme") {
        const res = await getMsmePaymentTracker(activeClient._id);
        setMsmeData(res.data?.data);
      } else if (activeSubTab === "rules") {
        const res = await getActiveTaxRules();
        setTaxRulesData(res.data?.data);
      }
    } catch (err) {
      console.error("Failed to load tax advisory data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeClient?._id, activeSubTab]);

  useEffect(() => {
    fetchTaxData();
  }, [fetchTaxData]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--surface)] text-[var(--text-primary)] rounded-2xl border border-[var(--border)] shadow-xs overflow-y-auto p-4 md:p-6">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Tax Advisory & Compliance Assistant
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                AY 2026-27 (Ver 2026.1)
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Automated detection of Section 194C/J TDS liabilities, Section 40A(3) cash disallowances, and Section 43B(h) MSME 45-day limits
            </p>
          </div>

          {/* Sub-Tab Navigation */}
          <div className="flex items-center p-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl">
            <button
              onClick={() => setActiveSubTab("flags")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === "flags"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Disallowance Alerts</span>
            </button>
            <button
              onClick={() => setActiveSubTab("msme")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === "msme"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>MSME 45-Day Tracker</span>
            </button>
            <button
              onClick={() => setActiveSubTab("rules")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === "rules"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Tax Rules Engine</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: DISALLOWANCE ADVISORY & FLAGS
           ══════════════════════════════════════════════════════════════════════ */}
        {activeSubTab === "flags" && (
          <div className="space-y-6">
            {/* Metric Scorecards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-red-500/5 dark:bg-red-950/20 border border-red-500/20 rounded-xl p-4">
                <span className="text-xs text-[var(--text-muted)] font-medium">Total At-Risk Disallowance</span>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  ₹ {(advisoryData?.metrics?.totalPotentialDisallowance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-red-600 dark:text-red-400 mt-1 block">
                  Add back to taxable profits if unrectified
                </span>
              </div>

              <div className="bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 rounded-xl p-4">
                <span className="text-xs text-[var(--text-muted)] font-medium">Sec 40(a)(ia) TDS Risk (30%)</span>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  ₹ {(advisoryData?.metrics?.sec40AiaTdsDisallowance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  Non-deduction under Sec 194C / 194J
                </span>
              </div>

              <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4">
                <span className="text-xs text-[var(--text-muted)] font-medium">Sec 40A(3) Cash Disallowance</span>
                <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                  ₹ {(advisoryData?.metrics?.sec40A3CashDisallowance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  Payments &gt; ₹10,000 cash in a single day
                </span>
              </div>

              <div className="bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 rounded-xl p-4">
                <span className="text-xs text-[var(--text-muted)] font-medium">Sec 43B(h) MSME Disallowance</span>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  ₹ {(advisoryData?.metrics?.sec43BhMsmeDisallowance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block">
                  Unpaid beyond 45 days at year-end
                </span>
              </div>
            </div>

            {/* Flagged Vouchers List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Flagged Vouchers Requiring CA Review</h3>
                <span className="text-xs text-[var(--text-muted)]">
                  {advisoryData?.flaggedVouchers?.length || 0} issue(s) detected
                </span>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-[var(--text-muted)] bg-[var(--surface-raised)] rounded-xl border border-[var(--border)]">
                  <RefreshCw className="w-5 h-5 text-[var(--primary)] animate-spin mx-auto mb-2" />
                  <span>Evaluating tax rules against client ledger...</span>
                </div>
              ) : (advisoryData?.flaggedVouchers?.length || 0) === 0 ? (
                <div className="p-12 text-center text-[var(--text-muted)] bg-[var(--surface-raised)] rounded-xl border border-[var(--border)]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-[var(--text-primary)]">No Tax Disallowance Flags</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    All posted vouchers satisfy TDS thresholds, cash limits, and MSME deadlines.
                  </p>
                </div>
              ) : (
                advisoryData.flaggedVouchers.map((v) => (
                  <div
                    key={v.voucherId}
                    className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-primary)] text-sm">
                            {v.voucherType} #{v.voucherNumber}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            {new Date(v.voucherDate).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <div className="font-mono text-sm font-bold text-[var(--text-primary)]">
                        Voucher Total: ₹ {v.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {v.flags.map((flag, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                            flag.severity === "Danger"
                              ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5 flex-wrap">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{flag.section} Compliance Alert</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                Suggestion for CA review
                              </span>
                            </span>
                            <span className="font-mono text-red-600 dark:text-red-400">
                              Disallowance Risk: ₹ {flag.potentialDisallowance?.toLocaleString("en-IN")}
                            </span>
                          </div>

                          <p className="text-[var(--text-secondary)]">{flag.message}</p>

                          <div className="bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--border)] text-[11px] text-[var(--text-secondary)]">
                            <strong className="text-[var(--text-primary)] block mb-0.5">CA Recommended Action:</strong>
                            {flag.suggestedAction}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: MSME 45-DAY PAYMENT TRACKER (SECTION 43B(h))
           ══════════════════════════════════════════════════════════════════════ */}
        {activeSubTab === "msme" && (
          <div className="space-y-6">
            {/* Statutory Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-[var(--text-primary)]">
                  Section 43B(h) of the Income-tax Act, 1961
                </span>
                <p className="text-[var(--text-secondary)] mt-0.5">
                  Payments to Micro and Small Enterprises must be made within 15 days (without agreement) or up to 45 days (with agreement).
                  Any unpaid amount beyond 45 days at the end of the financial year will be added back to taxable profits!
                </p>
              </div>
            </div>

            {/* MSME Metrics Scorecards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4">
                <span className="text-xs text-[var(--text-muted)] font-medium">Total MSME Bills</span>
                <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                  {msmeData?.metrics?.totalMsmeBills || 0}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">From Micro/Small Vendors</span>
              </div>

              <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4">
                <span className="text-xs text-[var(--text-muted)] font-medium">Total MSME Outstanding</span>
                <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                  ₹ {(msmeData?.metrics?.totalMsmeOutstanding || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Awaiting bank settlement</span>
              </div>

              <div className="bg-red-500/5 dark:bg-red-950/20 border border-red-500/20 rounded-xl p-4">
                <span className="text-xs text-[var(--text-muted)] font-medium">Disallowable under Sec 43B(h)</span>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  ₹ {(msmeData?.metrics?.totalDisallowedUnder43Bh || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-red-600 dark:text-red-400 mt-1 block">
                  Exceeded 45 days • Taxable!
                </span>
              </div>

              <div className="bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 rounded-xl p-4">
                <span className="text-xs text-[var(--text-muted)] font-medium">Due Within 7 Days</span>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  ₹ {(msmeData?.metrics?.totalDueWithin7Days || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">
                  Urgent: Pay immediately
                </span>
              </div>
            </div>

            {/* MSME Bills Table */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                    <tr>
                      <th className="px-4 py-3">Vendor / Enterprise</th>
                      <th className="px-4 py-3">MSME Class</th>
                      <th className="px-4 py-3">Invoice No & Date</th>
                      <th className="px-4 py-3 text-right">Amount (₹)</th>
                      <th className="px-4 py-3">Statutory Due Date</th>
                      <th className="px-4 py-3">Days Left</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {(msmeData?.bills || []).length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-[var(--text-muted)]">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                          <p className="font-semibold text-[var(--text-primary)]">No MSME Bills Found</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            Tag vendor ledger accounts with Micro/Small enterprise status to track deadlines.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      msmeData.bills.map((b) => (
                        <tr key={b.voucherId} className="hover:bg-[var(--surface-raised)] transition-colors">
                          <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                            <div>{b.vendorName}</div>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">{b.msmeUdyamNumber}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              {b.msmeCategory}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[var(--text-primary)]">{b.voucherNumber}</span>
                            <div className="text-[10px] text-[var(--text-muted)]">
                              {new Date(b.voucherDate).toISOString().slice(0, 10)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-[var(--text-primary)]">
                            ₹ {b.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">
                            {new Date(b.statutoryDueDate).toISOString().slice(0, 10)}
                          </td>
                          <td className="px-4 py-3">
                            {b.status === "Disallowed_43Bh" ? (
                              <span className="text-red-600 dark:text-red-400 font-semibold font-mono">
                                Overdue by {Math.abs(b.daysRemaining)}d
                              </span>
                            ) : b.status === "Due_Soon" ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold font-mono">
                                {b.daysRemaining} days left
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)] font-mono">{b.daysRemaining} days</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {b.status === "Disallowed_43Bh" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
                                43B(h) Disallowed
                              </span>
                            )}
                            {b.status === "Due_Soon" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                Action Needed
                              </span>
                            )}
                            {b.status === "Upcoming" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                Upcoming
                              </span>
                            )}
                            {b.status === "Compliant" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                Paid
                              </span>
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
            TAB 3: CONFIGURABLE VERSIONED TAX RULES EXPLORER
           ══════════════════════════════════════════════════════════════════════ */}
        {activeSubTab === "rules" && (
          <div className="space-y-6">
            <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Active Versioned Statutory Rules Engine</h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    Engine Version: {taxRulesData?.version || "2026.1"} • Effective From: {taxRulesData?.effectiveFrom || "2026-04-01"}
                  </span>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                  Configurable JSON
                </span>
              </div>

              <p className="text-xs text-[var(--text-secondary)]">
                To accommodate statutory updates in the Indian Income-tax Act, all TDS rates, disallowance sections, and MSMED Act limits are decoupled into a versioned configuration file rather than hard-coded logic.
              </p>

              {/* TDS Rules Grid */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                  Configured TDS Sections (Chapter XVII-B)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(taxRulesData?.tdsRules || []).map((r) => (
                    <div key={r.section} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--text-primary)] text-sm">Section {r.section}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">Disallowance: Sec {r.disallowanceSection}</span>
                      </div>
                      <p className="text-[var(--text-secondary)] font-medium">{r.title}</p>
                      <div className="space-y-1 text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                        <div className="flex justify-between">
                          <span>Threshold Limit:</span>
                          <span className="font-mono text-[var(--text-primary)]">
                            ₹ {(r.singleInvoiceThreshold || r.annualThreshold)?.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Statutory Deduction Rate:</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            {((r.rateIndividualHuf || r.rateProfessional || r.rate) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Disallowance Risk on Default:</span>
                          <span className="font-mono text-red-600 dark:text-red-400 font-bold">
                            {(r.disallowancePercentage * 100)}% of Expenditure
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disallowance Provisions */}
              <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Configured Disallowance Provisions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-2 text-xs">
                    <span className="font-bold text-[var(--text-primary)] text-sm">Section 40A(3)</span>
                    <p className="text-[var(--text-secondary)] font-medium">Cash Payment Disallowance</p>
                    <div className="space-y-1 text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                      <div className="flex justify-between">
                        <span>Daily Cash Limit per Person:</span>
                        <span className="font-mono text-[var(--text-primary)]">₹ 10,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Goods Carriage Limit:</span>
                        <span className="font-mono text-[var(--text-primary)]">₹ 35,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Disallowance on Breach:</span>
                        <span className="font-mono text-red-600 dark:text-red-400 font-bold">100% Disallowed</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-2 text-xs">
                    <span className="font-bold text-[var(--text-primary)] text-sm">Section 43B(h)</span>
                    <p className="text-[var(--text-secondary)] font-medium">MSME Timely Payment Deduction</p>
                    <div className="space-y-1 text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                      <div className="flex justify-between">
                        <span>Limit without Agreement:</span>
                        <span className="font-mono text-[var(--text-primary)]">15 Days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Limit with Written Agreement:</span>
                        <span className="font-mono text-[var(--text-primary)]">45 Days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Disallowance on Default:</span>
                        <span className="font-mono text-red-600 dark:text-red-400 font-bold">100% Added to Income</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxAdvisoryView;

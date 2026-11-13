/** @format */

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  MessageSquare,
  Mail,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  X,
} from "lucide-react";
import {
  getCloseReadinessScore,
  getCloseReadinessChasingBundles,
} from "../../services/apiClient";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/utils";
import { formatINR } from "../../lib/format";

export const CloseReadinessCard = ({ clientId, clientName, className = "" }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChasingModal, setShowChasingModal] = useState(false);
  const [chasingData, setChasingData] = useState(null);
  const [isLoadingChasing, setIsLoadingChasing] = useState(false);
  const [activeChasingTab, setActiveChasingTab] = useState("whatsapp"); // "whatsapp" | "email" | "vendors"
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const res = await getCloseReadinessScore({ clientId });
      setData(res.data?.data || null);
    } catch (err) {
      console.error("Failed to load close readiness score:", err);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenChasingModal = async () => {
    setShowChasingModal(true);
    setIsLoadingChasing(true);
    try {
      const res = await getCloseReadinessChasingBundles({ clientId });
      setChasingData(res.data?.data || null);
    } catch (err) {
      console.error("Failed to load chasing bundles:", err);
    } finally {
      setIsLoadingChasing(false);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (isLoading && !data) {
    return (
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
        <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary)]" />
        <span>Evaluating 5-pillar month-end close readiness...</span>
      </div>
    );
  }

  if (!data) return null;

  const { readiness, pillars, period, recurringExpectations, blockers } = data;
  const isReady = readiness.status === "READY_TO_CLOSE";
  const isInProgress = readiness.status === "IN_PROGRESS";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-[var(--surface)] p-5 sm:p-6 space-y-5 shadow-xs transition-all",
        isReady
          ? "border-emerald-500/30"
          : isInProgress
          ? "border-amber-500/30"
          : "border-rose-500/30",
        className
      )}
    >
      {/* Top Banner & Readiness Gauge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={cn(
                "w-5 h-5",
                isReady
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isInProgress
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Month-End Close Readiness
            </h3>
            <Badge
              variant={isReady ? "success" : isInProgress ? "warning" : "danger"}
              size="sm"
              className="font-bold uppercase tracking-wider"
            >
              {readiness.status.replace(/_/g, " ")} ({readiness.score}%)
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Period: <strong>{period.monthName} {period.year}</strong> • {readiness.passedPillarsCount} of 5 Statutory Accounting Pillars Passed
          </p>
        </div>

        {/* Chasing Action Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchData}
            isLoading={isLoading}
            className="text-xs"
            title="Re-evaluate all 5 pillars"
          >
            Re-evaluate
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Send}
            onClick={handleOpenChasingModal}
            className="text-xs font-bold"
          >
            Dispatch Chasing Notices
          </Button>
        </div>
      </div>

      {/* Progress Bar Gauge */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-[var(--text-secondary)] font-medium">
          <span>Readiness Checklist Completion</span>
          <span className="font-mono font-bold text-[var(--text-primary)]">{readiness.score}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--surface-raised)] overflow-hidden">
          <div
            style={{ width: `${readiness.score}%` }}
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              isReady ? "bg-emerald-500" : isInProgress ? "bg-amber-500" : "bg-rose-500"
            )}
          />
        </div>
      </div>

      {/* 5-Pillar Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pillars.map((pillar) => {
          const isPass = pillar.status === "PASS";

          return (
            <div
              key={pillar.id}
              className={cn(
                "p-3.5 rounded-xl border flex flex-col justify-between transition-colors",
                isPass
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-rose-500/5 border-rose-500/25"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate" title={pillar.title}>
                    {pillar.title}
                  </span>
                  {isPass ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">
                  {pillar.description}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
                {isPass ? (
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">✓ Verified & Cleared</span>
                ) : (
                  <span className="text-rose-700 dark:text-rose-300 font-semibold truncate max-w-[170px]" title={pillar.blocker}>
                    {pillar.blocker}
                  </span>
                )}
                {pillar.href && (
                  <Link
                    to={pillar.href}
                    className="text-[var(--primary)] hover:underline font-semibold flex items-center gap-0.5 ml-1 shrink-0"
                  >
                    <span>Fix</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expected Recurring Monthly Documents Breakdown */}
      <div className="p-3.5 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--border)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Expected Recurring Monthly Documents ({period.monthName})
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">Standard Corporate Expenses</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {recurringExpectations.map((rec) => {
            const isRec = rec.status === "RECEIVED";
            return (
              <div
                key={rec.category}
                className={cn(
                  "p-2 rounded-lg border flex items-center justify-between",
                  isRec
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200"
                )}
              >
                <div>
                  <span className="font-semibold block text-[11px] truncate max-w-[120px]">{rec.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">~{formatINR(rec.expectedAmount)}</span>
                </div>
                {isRec ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── GAP-AWARE CHASING BUNDLE MODAL ─── */}
      {showChasingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="flex flex-col w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-raised)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Gap-Aware Automated Chasing Notices
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Pre-filled WhatsApp & Email bundles with 1-click client upload token & vendor GSTR-1 alerts
                </p>
              </div>
              <button
                onClick={() => setShowChasingModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {isLoadingChasing ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                  <RefreshCw className="w-5 h-5 animate-spin text-[var(--primary)]" />
                  <span>Generating chasing bundles & secure portal upload tokens...</span>
                </div>
              ) : chasingData ? (
                <>
                  {/* Chasing Tabs */}
                  <div className="flex border-b border-[var(--border)] gap-2">
                    <button
                      onClick={() => setActiveChasingTab("whatsapp")}
                      className={cn(
                        "pb-2 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 -mb-[1px]",
                        activeChasingTab === "whatsapp"
                          ? "border-[var(--primary)] text-[var(--primary)] font-bold"
                          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Client WhatsApp Reminder</span>
                    </button>
                    <button
                      onClick={() => setActiveChasingTab("email")}
                      className={cn(
                        "pb-2 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 -mb-[1px]",
                        activeChasingTab === "email"
                          ? "border-[var(--primary)] text-[var(--primary)] font-bold"
                          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Client Email Template</span>
                    </button>
                    <button
                      onClick={() => setActiveChasingTab("vendors")}
                      className={cn(
                        "pb-2 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 -mb-[1px]",
                        activeChasingTab === "vendors"
                          ? "border-[var(--primary)] text-[var(--primary)] font-bold"
                          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Vendor GSTR-1 Notices ({chasingData.vendorChasing?.offendingSupplierCount || 0})</span>
                    </button>
                  </div>

                  {/* Tab 1: WhatsApp */}
                  {activeChasingTab === "whatsapp" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>Ready to send via WhatsApp or SMS:</span>
                        <button
                          onClick={() => handleCopy(chasingData.clientChasing.whatsAppMessage, "wa")}
                          className="flex items-center gap-1 text-[var(--primary)] font-semibold hover:underline cursor-pointer"
                        >
                          {copiedKey === "wa" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === "wa" ? "Copied Message" : "Copy to Clipboard"}</span>
                        </button>
                      </div>
                      <pre className="p-3.5 bg-slate-950 text-slate-200 text-xs font-mono rounded-xl border border-[var(--border)] whitespace-pre-wrap leading-relaxed">
                        {chasingData.clientChasing.whatsAppMessage}
                      </pre>
                    </div>
                  )}

                  {/* Tab 2: Email */}
                  {activeChasingTab === "email" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>Subject: <strong>{chasingData.clientChasing.emailSubject}</strong></span>
                        <button
                          onClick={() => handleCopy(chasingData.clientChasing.emailBody, "email")}
                          className="flex items-center gap-1 text-[var(--primary)] font-semibold hover:underline cursor-pointer"
                        >
                          {copiedKey === "email" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === "email" ? "Copied Email" : "Copy Body"}</span>
                        </button>
                      </div>
                      <pre className="p-3.5 bg-slate-950 text-slate-200 text-xs font-mono rounded-xl border border-[var(--border)] whitespace-pre-wrap leading-relaxed">
                        {chasingData.clientChasing.emailBody}
                      </pre>
                    </div>
                  )}

                  {/* Tab 3: Offending Vendors */}
                  {activeChasingTab === "vendors" && (
                    <div className="space-y-3">
                      {chasingData.vendorChasing?.vendors?.length === 0 ? (
                        <div className="py-8 text-center text-xs text-emerald-600">
                          ✓ No offending suppliers! All purchase invoices appear in GSTR-2B.
                        </div>
                      ) : (
                        chasingData.vendorChasing.vendors.map((v, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/5 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[var(--text-primary)]">
                                {v.supplierName} ({v.supplierGstin})
                              </span>
                              <span className="font-mono font-bold text-rose-600">
                                ITC at risk: {formatINR(v.atRiskTax, { showDecimals: true })}
                              </span>
                            </div>
                            <pre className="p-2.5 bg-slate-950 text-slate-300 font-mono text-[11px] rounded-lg whitespace-pre-wrap">
                              {v.noticeText}
                            </pre>
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleCopy(v.noticeText, `ven_${i}`)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                              >
                                {copiedKey === `ven_${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedKey === `ven_${i}` ? "Copied" : "Copy Notice"}</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="flex justify-end px-6 py-3 border-t border-[var(--border)] bg-[var(--surface-raised)]">
              <Button variant="secondary" size="sm" onClick={() => setShowChasingModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloseReadinessCard;


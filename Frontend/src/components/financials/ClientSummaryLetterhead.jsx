/** @format */

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Printer,
  RefreshCw,
  FileCheck,
  Lock,
  Calendar,
  Building,
  Hash,
  UserCheck,
  ArrowRight,
  ExternalLink,
  X,
  FileText,
} from "lucide-react";
import {
  getLatestClientSummary,
  refreshClientSummary,
  signOffClientSummaryApi,
  revokeClientSummarySignOffApi,
} from "../../services/apiClient";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/utils";
import { formatINR } from "../../lib/format";

export const ClientSummaryLetterhead = ({ clientId, clientName }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  // Sign off form state
  const [partnerName, setPartnerName] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [acknowledgeDisclaimer, setAcknowledgeDisclaimer] = useState(false);
  const [signError, setSignError] = useState("");
  const [isSubmittingSign, setIsSubmittingSign] = useState(false);

  // Revoke state
  const [revokeReason, setRevokeReason] = useState("");
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const res = await getLatestClientSummary({ clientId });
      const payload = res.data?.data;
      setData(payload);
      if (payload?.firmBranding?.partnerName) {
        setPartnerName(payload.firmBranding.partnerName);
      }
      if (payload?.firmBranding?.membershipNumber) {
        setMembershipNumber(payload.firmBranding.membershipNumber);
      }
    } catch (err) {
      console.error("Failed to load client summary:", err);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await refreshClientSummary({ clientId });
      setData(res.data?.data);
    } catch (err) {
      console.error("Failed to refresh client summary:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOff = async (e) => {
    e.preventDefault();
    setSignError("");
    if (!partnerName.trim() || !membershipNumber.trim()) {
      setSignError("Partner Name and ICAI Membership Number (M.No.) are strictly required.");
      return;
    }

    const isComplete = data?.summary?.completeness?.isComplete;
    if (!isComplete && !acknowledgeDisclaimer) {
      setSignError("Please check the box to acknowledge signing with a Qualified Opinion.");
      return;
    }

    setIsSubmittingSign(true);
    try {
      await signOffClientSummaryApi(data.summary._id, {
        partnerName: partnerName.trim(),
        membershipNumber: membershipNumber.trim(),
        remarks: remarks.trim(),
        forceWithQualifiedDisclaimer: !isComplete && acknowledgeDisclaimer,
      });
      setShowSignModal(false);
      await fetchSummary();
    } catch (err) {
      setSignError(err.response?.data?.message || err.message || "Sign-off failed.");
    } finally {
      setIsSubmittingSign(false);
    }
  };

  const handleRevoke = async (e) => {
    e.preventDefault();
    setIsSubmittingRevoke(true);
    try {
      await revokeClientSummarySignOffApi(data.summary._id, {
        reason: revokeReason || "Adjustments required by CA",
      });
      setShowRevokeModal(false);
      setRevokeReason("");
      await fetchSummary();
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to revoke sign-off.");
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl animate-pulse space-y-4">
        <div className="h-6 w-48 bg-[var(--border)] rounded mx-auto" />
        <div className="h-4 w-72 bg-[var(--border)] rounded mx-auto" />
      </div>
    );
  }

  const summary = data?.summary;
  const branding = data?.firmBranding || {};
  const clientDetails = data?.clientDetails || {};
  const metrics = summary?.metrics || {};
  const completeness = summary?.completeness || {};
  const isSignedOff = summary?.status === "Signed_Off";
  const signOff = summary?.signOff || {};

  return (
    <div className="space-y-6">
      {/* Action Bar (Screen only, hidden on print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-raised)] p-4 rounded-xl border border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Badge
            variant={isSignedOff ? "success" : completeness.isComplete ? "primary" : "warning"}
            size="md"
          >
            {isSignedOff
              ? "Verified & Signed Off"
              : completeness.isComplete
              ? "Reconciled (Pending Sign-off)"
              : "Provisional (Gaps Open)"}
          </Badge>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            FY: {summary?.financialYear || "2024-25"} • Period: {summary?.periodIdentifier || "Current"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={handleRefresh}
            isLoading={isRefreshing}
          >
            Recompute
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={Printer}
            onClick={() => window.print()}
          >
            Print / PDF
          </Button>

          {isSignedOff ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRevokeModal(true)}
              className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              Revoke Sign-off
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={FileCheck}
              onClick={() => setShowSignModal(true)}
            >
              CA Partner Sign-Off
            </Button>
          )}
        </div>
      </div>

      {/* Official Printable Statement Sheet (A4 format) */}
      <div
        id="printable-summary-sheet"
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm p-6 sm:p-10 space-y-8 text-[var(--text-primary)] print:border-none print:shadow-none print:p-0"
      >
        {/* Practice Letterhead Header */}
        <div className="border-b-2 border-[var(--primary)] pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {branding.firmName || "CA Practice & Associates"}
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
              {branding.letterheadHeader || "Chartered Accountants & Financial Advisors"}
            </p>
            <div className="text-xs text-[var(--text-secondary)] font-mono flex flex-wrap gap-x-4 gap-y-1 pt-1">
              <span>ICAI FRN: {branding.icaiRegistrationNumber || "014582S"}</span>
              {branding.partnerName && (
                <span>Partner: {branding.partnerName} ({branding.membershipNumber || "M.No. Required"})</span>
              )}
            </div>
            {branding.officeAddress && (
              <p className="text-xs text-[var(--text-muted)]">
                {[
                  branding.officeAddress.line1,
                  branding.officeAddress.city,
                  branding.officeAddress.state,
                  branding.officeAddress.pincode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-1 text-xs text-[var(--text-secondary)]">
            <div className="font-semibold text-sm text-[var(--text-primary)]">
              Client Financial Position Summary
            </div>
            <div>Statement Date: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</div>
            <div className="font-mono text-[10px] text-[var(--text-muted)]">
              Digital Seal: {signOff.digitalHash ? `${signOff.digitalHash.substring(0, 16)}...` : "Unsealed Draft"}
            </div>
          </div>
        </div>

        {/* Client Business Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-xs">
          <div>
            <span className="text-[var(--text-muted)] uppercase text-[10px] font-semibold">Client Name</span>
            <div className="font-bold text-sm text-[var(--text-primary)] truncate">
              {clientDetails.businessName || clientName}
            </div>
            {clientDetails.tradeName && (
              <div className="text-[var(--text-muted)] text-[11px]">{clientDetails.tradeName}</div>
            )}
          </div>

          <div>
            <span className="text-[var(--text-muted)] uppercase text-[10px] font-semibold">GSTIN</span>
            <div className="font-mono font-semibold text-[var(--text-primary)]">
              {clientDetails.gstin || "Unregistered / Composition"}
            </div>
          </div>

          <div>
            <span className="text-[var(--text-muted)] uppercase text-[10px] font-semibold">PAN</span>
            <div className="font-mono font-semibold text-[var(--text-primary)]">
              {clientDetails.panNumber || "—"}
            </div>
          </div>

          <div>
            <span className="text-[var(--text-muted)] uppercase text-[10px] font-semibold">Accounting Period</span>
            <div className="font-semibold text-[var(--text-primary)]">
              FY {summary?.financialYear} ({summary?.periodIdentifier})
            </div>
          </div>
        </div>

        {/* MANDATORY STATUTORY COMPLETENESS BANNER */}
        <div
          className={cn(
            "p-4 rounded-xl border flex flex-col sm:flex-row items-start gap-3 text-xs leading-relaxed transition-all",
            isSignedOff
              ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200"
              : completeness.isComplete
              ? "bg-teal-50/70 border-teal-300 text-teal-950 dark:bg-teal-950/30 dark:border-teal-800 dark:text-teal-200"
              : "bg-amber-50/80 border-amber-300 text-amber-950 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200"
          )}
        >
          <div className="mt-0.5 shrink-0">
            {isSignedOff ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : completeness.isComplete ? (
              <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="font-bold flex items-center gap-2">
              <span>{completeness.bannerMessage}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-white/70 dark:bg-black/30 border border-current">
                Readiness: {completeness.closeReadinessScore}%
              </span>
            </div>

            {/* List open gaps if any */}
            {!completeness.isComplete && completeness.openGaps?.length > 0 && (
              <div className="pt-1 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  Open Reconciliation Blockers:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90 pl-1">
                  {completeness.openGaps.map((gap, i) => (
                    <li key={i}>
                      <span className="font-semibold">{gap.pillar}:</span> {gap.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Deterministic Financial KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/50">
            <div className="text-[10px] font-semibold uppercase text-[var(--text-muted)] tracking-wider">
              Total Revenue (Sales)
            </div>
            <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1">
              {formatINR(metrics.totalRevenuePaise / 100)}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              From verified sales vouchers
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/50">
            <div className="text-[10px] font-semibold uppercase text-[var(--text-muted)] tracking-wider">
              Total Direct Purchases
            </div>
            <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1">
              {formatINR(metrics.totalDirectExpensesPaise / 100)}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Verified vendor bills
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/50">
            <div className="text-[10px] font-semibold uppercase text-[var(--text-muted)] tracking-wider">
              Gross Profit
            </div>
            <div
              className={cn(
                "text-lg font-bold font-mono mt-1",
                metrics.grossProfitPaise >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}
            >
              {formatINR(metrics.grossProfitPaise / 100)}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {metrics.totalRevenuePaise > 0
                ? `${((metrics.grossProfitPaise / metrics.totalRevenuePaise) * 100).toFixed(1)}% margin`
                : "—"}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/50">
            <div className="text-[10px] font-semibold uppercase text-[var(--text-muted)] tracking-wider">
              Net Operating Position
            </div>
            <div
              className={cn(
                "text-lg font-bold font-mono mt-1",
                metrics.netOperatingPositionPaise >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {formatINR(metrics.netOperatingPositionPaise / 100)}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              After operating overheads
            </div>
          </div>
        </div>

        {/* GST & ITC Breakdown Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
            Statutory GST Liability & ITC Reconciliations (§ 16 & § 49)
          </h3>
          <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)] uppercase text-[10px] font-semibold border-b border-[var(--border)]">
                <tr>
                  <th className="py-2.5 px-4">Statutory Head</th>
                  <th className="py-2.5 px-4">Governing Section</th>
                  <th className="py-2.5 px-4">Status & Invariants</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-tabular">
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-[var(--text-primary)]">
                    Output GST Liability (Forward Charge)
                  </td>
                  <td className="py-2.5 px-4 text-[var(--text-secondary)] font-mono">CGST Act § 9</td>
                  <td className="py-2.5 px-4 text-[var(--text-muted)]">Sales vouchers outward tax</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-[var(--text-primary)]">
                    {formatINR(metrics.outputGstPaise / 100)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-semibold text-emerald-700 dark:text-emerald-400">
                    Eligible Input Tax Credit (ITC)
                  </td>
                  <td className="py-2.5 px-4 text-[var(--text-secondary)] font-mono">CGST Act § 16(2)</td>
                  <td className="py-2.5 px-4 text-[var(--text-muted)]">
                    Matched in GSTR-2B & human verified
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatINR(metrics.eligibleItcPaise / 100)}
                  </td>
                </tr>

                {metrics.ineligibleItcPaise > 0 && (
                  <tr className="bg-amber-50/30 dark:bg-amber-950/20">
                    <td className="py-2.5 px-4 font-semibold text-amber-700 dark:text-amber-400">
                      Ineligible / Blocked Credit
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-secondary)] font-mono">CGST Act § 17(5)</td>
                    <td className="py-2.5 px-4 text-[var(--text-muted)]">
                      Motor vehicles, personal food, gifts
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-700 dark:text-amber-400">
                      {formatINR(metrics.ineligibleItcPaise / 100)}
                    </td>
                  </tr>
                )}

                {metrics.itcAtRiskPaise > 0 && (
                  <tr className="bg-rose-50/30 dark:bg-rose-950/20">
                    <td className="py-2.5 px-4 font-semibold text-rose-700 dark:text-rose-400">
                      ITC-at-Risk (Unfiled by Supplier)
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-secondary)] font-mono">CGST Act § 16(2)(aa)</td>
                    <td className="py-2.5 px-4 text-rose-600 dark:text-rose-400">
                      Supplier failed to file GSTR-1
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-rose-700 dark:text-rose-400">
                      {formatINR(metrics.itcAtRiskPaise / 100)}
                    </td>
                  </tr>
                )}

                <tr className="bg-[var(--surface-raised)]/70 font-semibold border-t-2 border-[var(--border)]">
                  <td className="py-2.5 px-4 text-[var(--text-primary)]">
                    Net GST Payable in Cash (Electronic Cash Ledger)
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[var(--text-secondary)]">CGST Act § 49</td>
                  <td className="py-2.5 px-4 text-[var(--text-muted)]">Output Tax − Eligible ITC</td>
                  <td className="py-2.5 px-4 text-right font-mono text-[var(--primary)] text-sm">
                    {formatINR(metrics.netGstPayablePaise / 100)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bank & Cash Position */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/30 space-y-2 text-xs">
            <h4 className="font-bold text-[var(--text-primary)]">Bank Account Position</h4>
            <div className="flex justify-between items-center pt-1 border-t border-[var(--border)]">
              <span className="text-[var(--text-muted)]">Book / Bank Closing Balance:</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {formatINR(metrics.closingBankBalancePaise / 100)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-muted)]">Unreconciled Items (BRS):</span>
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                {metrics.unreconciledBankCount || 0} entries ({formatINR(metrics.unreconciledBankAmountPaise / 100)})
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/30 space-y-2 text-xs">
            <h4 className="font-bold text-[var(--text-primary)]">Vouchers & Processing Audits</h4>
            <div className="flex justify-between items-center pt-1 border-t border-[var(--border)]">
              <span className="text-[var(--text-muted)]">Posted Double-Entry Vouchers:</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {metrics.totalVouchersCount || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-muted)]">Source Documents Ingested:</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {metrics.totalDocumentsCount || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Statutory Compliance Filings Status */}
        {summary?.statutoryFilings?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              Statutory Return Filing Schedule
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {summary.statutoryFilings.map((f, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)] truncate">{f.taxType}</span>
                    <Badge
                      variant={f.filingStatus === "FILED" ? "success" : "neutral"}
                      size="sm"
                    >
                      {f.filingStatus}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] flex justify-between">
                    <span>Due:</span>
                    <span>{f.dueDate ? new Date(f.dueDate).toLocaleDateString("en-IN") : "—"}</span>
                  </div>
                  {f.arn && (
                    <div className="text-[10px] font-mono text-[var(--text-secondary)] truncate">
                      ARN: {f.arn}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formal CA Practice Sign-Off Footer & Disclaimer */}
        <div className="border-t-2 border-[var(--border)] pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs text-[var(--text-secondary)]">
          <div className="space-y-1.5 max-w-xl">
            <div className="font-semibold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">
              Statutory Disclaimer
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              {branding.letterheadFooter ||
                "This statement is prepared for internal management review and statutory compliance. Subject to audit under the Companies Act, 2013 and Income Tax Act, 1961."}
            </p>
          </div>

          <div className="text-right space-y-2 shrink-0 sm:min-w-[200px]">
            {isSignedOff ? (
              <div className="border-2 border-emerald-600/60 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 text-left space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Digitally Signed Off</span>
                </div>
                <div className="font-semibold text-xs">{signOff.partnerName}</div>
                <div className="text-[11px] font-mono">ICAI M.No: {signOff.membershipNumber}</div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  Signed: {signOff.signedAt ? new Date(signOff.signedAt).toLocaleDateString("en-IN") : "—"}
                </div>
                {signOff.remarks && (
                  <div className="text-[10px] italic border-t border-emerald-200 dark:border-emerald-800 pt-1">
                    "{signOff.remarks}"
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-[var(--border)] p-4 rounded-xl text-center space-y-1 text-[var(--text-muted)]">
                <div className="text-[10px] uppercase font-bold tracking-wider">Pending CA Sign-Off</div>
                <div className="text-[11px]">Authorized Partner Signature</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sign-off Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[var(--primary)]" />
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  CA Partner Statutory Sign-Off
                </h3>
              </div>
              <button
                onClick={() => setShowSignModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSignOff} className="space-y-4 text-xs">
              {signError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200">
                  {signError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Partner Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CA Rajesh Sharma"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  ICAI Membership Number (M.No.) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 054321"
                  value={membershipNumber}
                  onChange={(e) => setMembershipNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  CA Remarks / Qualified Opinion Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified against books and GSTR-2B. Books closed for the period."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)]"
                />
              </div>

              {!completeness.isComplete && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Open Reconciliation Gaps Warning</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    The close-readiness score is currently {completeness.closeReadinessScore}%. Signing off will stamp this statement with a Qualified Disclaimer.
                  </p>
                  <label className="flex items-center gap-2 pt-1 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acknowledgeDisclaimer}
                      onChange={(e) => setAcknowledgeDisclaimer(e.target.checked)}
                      className="rounded border-[var(--border)] text-[var(--primary)]"
                    />
                    <span>I acknowledge the gaps and issue a Qualified CA Opinion</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSignModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingSign}
                >
                  Confirm Statutory Sign-Off
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="font-bold text-base text-[var(--text-primary)]">
              Revoke CA Sign-Off
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              This will return the statement to Draft status and log an audit entry.
            </p>
            <form onSubmit={handleRevoke} className="space-y-3 text-xs">
              <textarea
                required
                rows={2}
                placeholder="Reason for revoking (e.g. retroactive purchase invoice adjustments)..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRevokeModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  isLoading={isSubmittingRevoke}
                  className="text-rose-600 border-rose-300"
                >
                  Confirm Revocation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


/** @format */

import React from "react";
import {
  FileCheck2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Building2,
  Download,
  CheckCircle2,
} from "lucide-react";
import Badge from "../../../ui/Badge";

export const MockDashboard = () => {
  return (
    <div className="w-full text-xs font-sans select-none p-3 sm:p-5 space-y-4 bg-[var(--bg-app)]">
      {/* Client Overview Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold">
            CA
          </div>
          <div>
            <h4 className="font-semibold text-sm text-[var(--text-primary)]">
              CKsFinBot CA Practice • Firm Workspace
            </h4>
            <p className="text-[11px] text-[var(--text-muted)]">
              Active Client: <strong className="text-[var(--text-secondary)]">Apex Steel & Alloys Pvt Ltd</strong> (GSTIN: 24AAACA1234A1Z5)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm">
            Q3 FY 2026-27 Active
          </Badge>
          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            Last synced: 2 mins ago
          </span>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
            <span>Monthly Ingested</span>
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="font-mono text-base sm:text-lg font-bold text-[var(--text-primary)]">
            ₹48,20,450
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">
            28 Documents Processed
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
            <span>Pending CA Review</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="font-mono text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
            3 Invoices
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">
            Avg Review Time: 45s
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
            <span>GSTR-2B ITC Match</span>
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="font-mono text-base sm:text-lg font-bold text-[var(--text-primary)]">
            96.4%
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">
            ₹7,14,500 ITC Claimable
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
            <span>MSME Sec 43B(h)</span>
            <AlertCircle className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="font-mono text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
            ₹0 Overdue
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">
            3 Vendors Due in 15 Days
          </span>
        </div>
      </div>

      {/* Pipeline Status Bar */}
      <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-[var(--text-primary)]">
            Document Ingestion Pipeline (October 2026 Batch)
          </span>
          <span className="text-[var(--text-muted)] font-mono">25 / 28 Exported to Tally (89%)</span>
        </div>

        <div className="h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden flex">
          <div className="h-full bg-emerald-500 w-[89%]" title="Exported to Tally: 25" />
          <div className="h-full bg-amber-500 w-[11%]" title="Review Required: 3" />
        </div>

        <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)] pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            25 Vouchers Posted to Tally XML
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            3 Awaiting Quick Verification
          </span>
        </div>
      </div>

      {/* Recent Invoices Table Snippet */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
        <div className="px-3.5 py-2.5 bg-[var(--surface-raised)] border-b border-[var(--border)] flex items-center justify-between">
          <span className="font-semibold text-xs text-[var(--text-primary)]">
            Recent Batch Invoices
          </span>
          <span className="text-[11px] text-[var(--primary)] font-medium cursor-pointer">
            View All in Inbox →
          </span>
        </div>

        <div className="divide-y divide-[var(--border)] text-[11px] font-mono">
          <div className="p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <div>
                <span className="font-semibold text-[var(--text-primary)]">
                  Bharat Forgings & Metals
                </span>
                <span className="block text-[10px] text-[var(--text-muted)] font-sans">
                  #BFM/26/0412 • Hot Rolled Coils
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-[var(--text-primary)]">₹1,77,000</span>
              <Badge variant="warning" size="sm" className="ml-2">
                Review Needed
              </Badge>
            </div>
          </div>

          <div className="p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <span className="font-semibold text-[var(--text-primary)]">
                  Zenith Industrial Gases
                </span>
                <span className="block text-[10px] text-[var(--text-muted)] font-sans">
                  #ZIG/OCT/902 • Argon Gas Cylinders
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-[var(--text-primary)]">₹42,300</span>
              <Badge variant="success" size="sm" className="ml-2">
                Posted to Tally
              </Badge>
            </div>
          </div>

          <div className="p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <span className="font-semibold text-[var(--text-primary)]">
                  Mahalaxmi Transport Corp
                </span>
                <span className="block text-[10px] text-[var(--text-muted)] font-sans">
                  #MTC/26/911 • Freight Inward (RCM)
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-[var(--text-primary)]">₹28,500</span>
              <Badge variant="success" size="sm" className="ml-2">
                Posted to Tally
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockDashboard;

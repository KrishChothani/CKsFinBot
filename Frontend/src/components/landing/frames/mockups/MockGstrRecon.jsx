/** @format */

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, Send, Filter } from "lucide-react";
import Badge from "../../../ui/Badge";
import Button from "../../../ui/Button";

export const MockGstrRecon = () => {
  return (
    <div className="w-full text-xs font-sans select-none p-3 sm:p-5 space-y-4 bg-[var(--bg-app)]">
      {/* Recon Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-[var(--text-primary)]">
              GSTR-2B vs Purchase Register 3-Way Reconciliation
            </h4>
            <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-300">
              Return Period: Oct 2026
            </Badge>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Auto-matched against GST Portal JSON dump • 42 total records processed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export Variance Excel
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Send Vendor Notices
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 mb-0.5 font-medium">
            <span>Matched ITC Clean</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-300">
            ₹6,85,400
          </div>
          <span className="text-[10px] text-emerald-700/80 font-sans">
            38 Invoices • 100% Eligible
          </span>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 mb-0.5 font-medium">
            <span>Tax Rate Mismatch</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="font-mono text-base font-bold text-amber-700 dark:text-amber-300">
            ₹8,240 Diff
          </div>
          <span className="text-[10px] text-amber-700/80 font-sans">
            2 Invoices • Rate discrepancy
          </span>
        </div>

        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <div className="flex items-center justify-between text-[11px] text-rose-800 dark:text-rose-300 mb-0.5 font-medium">
            <span>Missing in Books</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="font-mono text-base font-bold text-rose-700 dark:text-rose-300">
            ₹21,000 ITC
          </div>
          <span className="text-[10px] text-rose-700/80 font-sans">
            2 Invoices in 2B, not entered
          </span>
        </div>
      </div>

      {/* Recon Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 bg-[var(--surface-raised)] px-3 py-2 font-semibold text-[10px] text-[var(--text-muted)] border-b border-[var(--border)]">
          <span className="col-span-4">Supplier Name & GSTIN</span>
          <span className="col-span-2">Invoice / Date</span>
          <span className="col-span-2 text-right">Books Tax</span>
          <span className="col-span-2 text-right">GSTR-2B Tax</span>
          <span className="col-span-2 text-center">Recon Status</span>
        </div>

        <div className="divide-y divide-[var(--border)] font-mono text-[11px]">
          {/* Row 1: Matched */}
          <div className="grid grid-cols-12 px-3 py-2.5 items-center bg-[var(--surface)]">
            <div className="col-span-4 font-sans">
              <span className="font-semibold text-[var(--text-primary)]">Bharat Forgings & Metals</span>
              <span className="block text-[10px] font-mono text-[var(--text-muted)]">24BBBCA9876K1Z9</span>
            </div>
            <div className="col-span-2">
              <span className="text-[var(--text-primary)] font-semibold">BFM/26/0412</span>
              <span className="block text-[10px] text-[var(--text-muted)] font-sans">28-Oct-2026</span>
            </div>
            <div className="col-span-2 text-right font-semibold text-[var(--text-primary)]">₹27,000</div>
            <div className="col-span-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">₹27,000</div>
            <div className="col-span-2 text-center">
              <Badge variant="success" size="sm">
                MATCHED
              </Badge>
            </div>
          </div>

          {/* Row 2: Tax Mismatch */}
          <div className="grid grid-cols-12 px-3 py-2.5 items-center bg-amber-500/5">
            <div className="col-span-4 font-sans">
              <span className="font-semibold text-[var(--text-primary)]">Techno Precision Tools LLP</span>
              <span className="block text-[10px] font-mono text-[var(--text-muted)]">24AAACT4412M1ZG</span>
            </div>
            <div className="col-span-2">
              <span className="text-[var(--text-primary)] font-semibold">TPT/26/109</span>
              <span className="block text-[10px] text-[var(--text-muted)] font-sans">15-Oct-2026</span>
            </div>
            <div className="col-span-2 text-right font-semibold text-[var(--text-primary)]">
              ₹18,000 <span className="text-[9px] text-amber-600 font-sans block">(18%)</span>
            </div>
            <div className="col-span-2 text-right font-semibold text-amber-600 dark:text-amber-400">
              ₹12,000 <span className="text-[9px] text-amber-600 font-sans block">(12%)</span>
            </div>
            <div className="col-span-2 text-center">
              <Badge variant="warning" size="sm">
                TAX MISMATCH
              </Badge>
            </div>
          </div>

          {/* Row 3: Missing in Books */}
          <div className="grid grid-cols-12 px-3 py-2.5 items-center bg-rose-500/5">
            <div className="col-span-4 font-sans">
              <span className="font-semibold text-[var(--text-primary)]">Premier Lubricants India</span>
              <span className="block text-[10px] font-mono text-[var(--text-muted)]">27AAACP5021P1ZK</span>
            </div>
            <div className="col-span-2">
              <span className="text-[var(--text-primary)] font-semibold">PLI-OCT-094</span>
              <span className="block text-[10px] text-[var(--text-muted)] font-sans">22-Oct-2026</span>
            </div>
            <div className="col-span-2 text-right text-[var(--text-muted)]">— Not Entered —</div>
            <div className="col-span-2 text-right font-semibold text-rose-600 dark:text-rose-400">₹21,000</div>
            <div className="col-span-2 text-center">
              <Badge variant="danger" size="sm">
                MISSING IN BOOKS
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockGstrRecon;

/** @format */

import React from "react";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Hash,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Download,
} from "lucide-react";
import Badge from "../../../ui/Badge";
import Button from "../../../ui/Button";

export const MockReviewQueue = () => {
  return (
    <div className="w-full text-xs font-sans select-none p-3 sm:p-5 space-y-4 bg-[var(--bg-app)]">
      {/* Top Banner / Client Context */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold">
            AS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[var(--text-primary)]">
                Apex Steel & Alloys Pvt Ltd
              </span>
              <Badge variant="success" size="sm">
                FY 2026-27
              </Badge>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              GSTIN: 24AAACA1234A1Z5 • State: Gujarat (24)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-teal-500/30 text-teal-700 dark:text-teal-300">
            <Sparkles className="w-3 h-3 text-[var(--primary)]" />
            AI Confidence: 98.4%
          </Badge>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-medium text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5" />
            MSME Sec 43B(h): 38 Days Left
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 5 Cols: Original Scanned Invoice Simulation */}
        <div className="lg:col-span-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm flex flex-col justify-between">
          <div>
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-3 mb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                  Original Document (Scanned PDF)
                </span>
                <h4 className="font-bold text-sm text-[var(--text-primary)] mt-0.5">
                  TAX INVOICE
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                  BHARAT FORGINGS & METALS LTD
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  GSTIN: 24BBBCA9876K1Z9 • Ahmedabad, GJ
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-bold">
                  ORIGINAL FOR RECIPIENT
                </span>
                <p className="font-mono text-[11px] text-[var(--text-primary)] mt-1 font-semibold">
                  # BFM/26/0412
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">Date: 28-Oct-2026</p>
              </div>
            </div>

            {/* Simulated Line Items in Document */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]/50 p-2.5 mb-3 font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-sans border-b border-[var(--border)] pb-1">
                <span>Description</span>
                <span>HSN</span>
                <span>Amount (₹)</span>
              </div>
              <div className="flex justify-between font-medium text-[var(--text-primary)]">
                <span className="truncate max-w-[130px]">Hot Rolled Steel Coils</span>
                <span className="text-[var(--text-muted)]">7208</span>
                <span>1,50,000.00</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>CGST (9.0%)</span>
                <span>—</span>
                <span>13,500.00</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>SGST (9.0%)</span>
                <span>—</span>
                <span>13,500.00</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[var(--border)] font-bold text-sm text-[var(--text-primary)]">
                <span>Total Invoice Value</span>
                <span className="text-emerald-600 dark:text-emerald-400">₹1,77,000.00</span>
              </div>
            </div>

            {/* MSME Vendor Badge */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-800 dark:text-teal-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
              <span>UDYAM Verified: <strong>UDYAM-GJ-01-0029182</strong> (Small Enterprise)</span>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span>OCR Engine: Multi-Lingual Tabular v4</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Matched Clean</span>
          </div>
        </div>

        {/* Right 7 Cols: AI Extraction & Double-Entry Allocation */}
        <div className="lg:col-span-7 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                  AI Extraction & Ledger Allocation
                </span>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">
                  Purchase Voucher (#PUR-2026-0891)
                </h4>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                Debits = Credits Balanced
              </Badge>
            </div>

            {/* Extracted Double-Entry Journal Table */}
            <div className="rounded-lg border border-[var(--border)] overflow-hidden font-mono text-[11px]">
              <div className="grid grid-cols-12 bg-[var(--surface-raised)] px-2.5 py-1.5 font-sans font-semibold text-[10px] text-[var(--text-muted)] border-b border-[var(--border)]">
                <span className="col-span-6">Ledger Account (Chart of Accounts)</span>
                <span className="col-span-3 text-right">Debit (Dr)</span>
                <span className="col-span-3 text-right">Credit (Cr)</span>
              </div>

              <div className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                <div className="grid grid-cols-12 px-2.5 py-1.5 items-center">
                  <div className="col-span-6">
                    <span className="font-medium text-[var(--text-primary)]">Raw Material Purchases A/c</span>
                    <span className="block text-[9px] text-[var(--text-muted)] font-sans">Under: Direct Expenses</span>
                  </div>
                  <span className="col-span-3 text-right font-semibold text-[var(--text-primary)]">₹1,50,000.00</span>
                  <span className="col-span-3 text-right text-[var(--text-muted)]">—</span>
                </div>

                <div className="grid grid-cols-12 px-2.5 py-1.5 items-center">
                  <div className="col-span-6">
                    <span className="font-medium text-[var(--text-primary)]">Input CGST @ 9%</span>
                    <span className="block text-[9px] text-[var(--text-muted)] font-sans">Under: Duties & Taxes</span>
                  </div>
                  <span className="col-span-3 text-right font-semibold text-[var(--text-primary)]">₹13,500.00</span>
                  <span className="col-span-3 text-right text-[var(--text-muted)]">—</span>
                </div>

                <div className="grid grid-cols-12 px-2.5 py-1.5 items-center">
                  <div className="col-span-6">
                    <span className="font-medium text-[var(--text-primary)]">Input SGST @ 9%</span>
                    <span className="block text-[9px] text-[var(--text-muted)] font-sans">Under: Duties & Taxes</span>
                  </div>
                  <span className="col-span-3 text-right font-semibold text-[var(--text-primary)]">₹13,500.00</span>
                  <span className="col-span-3 text-right text-[var(--text-muted)]">—</span>
                </div>

                <div className="grid grid-cols-12 px-2.5 py-1.5 items-center bg-[var(--surface-subtle)]">
                  <div className="col-span-6">
                    <span className="font-medium text-[var(--text-primary)]">Bharat Forgings & Metals Ltd</span>
                    <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-sans font-medium">Sundry Creditors (MSME Section 43B(h))</span>
                  </div>
                  <span className="col-span-3 text-right text-[var(--text-muted)]">—</span>
                  <span className="col-span-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">₹1,77,000.00</span>
                </div>
              </div>

              {/* Total Row */}
              <div className="grid grid-cols-12 px-2.5 py-1.5 bg-[var(--surface-raised)] font-bold text-[11px] text-[var(--text-primary)] border-t border-[var(--border)]">
                <span className="col-span-6 font-sans">Total Balanced Voucher:</span>
                <span className="col-span-3 text-right">₹1,77,000.00</span>
                <span className="col-span-3 text-right">₹1,77,000.00</span>
              </div>
            </div>

            {/* Narration auto-generated */}
            <div className="p-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">Auto Narration: </span>
              Being raw material purchased vide Inv #BFM/26/0412 dt 28-10-2026 from Bharat Forgings (GSTIN 24BBBCA9876K1Z9). Due date under MSME 45-day rule: 12-12-2026.
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-3 mt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Auto-assigned by AI • Reviewed by Article CA
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs">
                Edit Allocation
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1.5 shadow-sm">
                <Download className="w-3.5 h-3.5" />
                Post to Tally XML
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockReviewQueue;

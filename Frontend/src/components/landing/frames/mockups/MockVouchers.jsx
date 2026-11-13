/** @format */

import React from "react";
import { Download, CheckCircle2, FileCode2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Badge from "../../../ui/Badge";
import Button from "../../../ui/Button";

export const MockVouchers = () => {
  return (
    <div className="w-full text-xs font-sans select-none p-3 sm:p-5 space-y-4 bg-[var(--bg-app)]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-[var(--text-primary)]">
              Double-Entry General Ledger Vouchers
            </h4>
            <Badge variant="success" size="sm">
              All 25 Vouchers Balanced
            </Badge>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Strict double-entry accounting schema with Tally XML schema validation passed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="h-7 text-xs gap-1.5 shadow-sm">
            <Download className="w-3.5 h-3.5" />
            Download Tally Prime XML
          </Button>
        </div>
      </div>

      {/* Vouchers List */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 bg-[var(--surface-raised)] px-3 py-2 font-semibold text-[10px] text-[var(--text-muted)] border-b border-[var(--border)]">
          <span className="col-span-2">Voucher # / Date</span>
          <span className="col-span-2">Type</span>
          <span className="col-span-5">Primary Ledger & Narration</span>
          <span className="col-span-2 text-right">Debit / Credit</span>
          <span className="col-span-1 text-center">Status</span>
        </div>

        <div className="divide-y divide-[var(--border)] font-mono text-[11px]">
          {/* Voucher 1: Purchase */}
          <div className="grid grid-cols-12 px-3 py-2.5 items-center">
            <div className="col-span-2">
              <span className="font-semibold text-[var(--text-primary)]">VCH-2026-1048</span>
              <span className="block text-[10px] text-[var(--text-muted)] font-sans">28-Oct-2026</span>
            </div>
            <div className="col-span-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                Purchase
              </span>
            </div>
            <div className="col-span-5 font-sans">
              <span className="font-medium text-[var(--text-primary)]">Bharat Forgings & Metals Ltd</span>
              <span className="block text-[10px] text-[var(--text-muted)] truncate">
                Raw material purchase vide Inv #BFM/26/0412. MSME Sec 43B(h).
              </span>
            </div>
            <div className="col-span-2 text-right">
              <span className="font-bold text-[var(--text-primary)]">₹1,77,000</span>
              <span className="block text-[9px] text-emerald-600 font-sans">Dr=Cr Balanced</span>
            </div>
            <div className="col-span-1 text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 inline-block" />
            </div>
          </div>

          {/* Voucher 2: Payment */}
          <div className="grid grid-cols-12 px-3 py-2.5 items-center">
            <div className="col-span-2">
              <span className="font-semibold text-[var(--text-primary)]">VCH-2026-1049</span>
              <span className="block text-[10px] text-[var(--text-muted)] font-sans">29-Oct-2026</span>
            </div>
            <div className="col-span-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                Payment
              </span>
            </div>
            <div className="col-span-5 font-sans">
              <span className="font-medium text-[var(--text-primary)]">HDFC Current A/c - 0029</span>
              <span className="block text-[10px] text-[var(--text-muted)] truncate">
                NEFT to Zenith Industrial Gases for oxygen cylinders.
              </span>
            </div>
            <div className="col-span-2 text-right">
              <span className="font-bold text-[var(--text-primary)]">₹42,300</span>
              <span className="block text-[9px] text-emerald-600 font-sans">Dr=Cr Balanced</span>
            </div>
            <div className="col-span-1 text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 inline-block" />
            </div>
          </div>

          {/* Voucher 3: Sales */}
          <div className="grid grid-cols-12 px-3 py-2.5 items-center">
            <div className="col-span-2">
              <span className="font-semibold text-[var(--text-primary)]">VCH-2026-1050</span>
              <span className="block text-[10px] text-[var(--text-muted)] font-sans">30-Oct-2026</span>
            </div>
            <div className="col-span-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300">
                Sales
              </span>
            </div>
            <div className="col-span-5 font-sans">
              <span className="font-medium text-[var(--text-primary)]">Gujarat Auto Ancillaries</span>
              <span className="block text-[10px] text-[var(--text-muted)] truncate">
                Supplied 50T Fabricated Steel Rods. GSTIN: 24GAA1992A1Z3.
              </span>
            </div>
            <div className="col-span-2 text-right">
              <span className="font-bold text-[var(--text-primary)]">₹3,45,600</span>
              <span className="block text-[9px] text-emerald-600 font-sans">Dr=Cr Balanced</span>
            </div>
            <div className="col-span-1 text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 inline-block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockVouchers;

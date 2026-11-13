/** @format */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, TrendingUp, IndianRupee, ArrowRight, Sparkles } from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { formatINR } from "../../lib/format";
import { LANDING_CONTENT } from "../../content/landing";

export const RoiCalculator = () => {
  const { roiCalculator } = LANDING_CONTENT;
  const [invoices, setInvoices] = useState(roiCalculator.defaults.invoicesPerMonth);
  const [entities, setEntities] = useState(roiCalculator.defaults.clientEntities);

  // Math:
  // Total documents = invoices * entities
  const totalDocs = invoices * entities;
  // Manual: 8 minutes per document
  // CKsFinBot: 0.75 minutes (45s verification)
  const manualHours = Math.round((totalDocs * 8) / 60);
  const finbotHours = Math.round((totalDocs * 0.75) / 60);
  const hoursSaved = Math.max(0, manualHours - finbotHours);
  const rupeesSaved = hoursSaved * 250; // ₹250/hr blended accountant cost

  return (
    <section id="roi-calculator" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-300 mb-2">
            Interactive ROI Estimator
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {roiCalculator.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
            {roiCalculator.subtitle}
          </p>
        </div>

        {/* Calculator Grid */}
        <div className="max-w-4xl mx-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10 shadow-lg shadow-teal-950/5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 6 Cols: Sliders */}
            <div className="lg:col-span-7 space-y-7">
              {/* Slider 1: Invoices per client entity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                  <span>Invoices & Statements per Client / Month:</span>
                  <span className="font-mono text-base font-bold text-[var(--primary)] px-2.5 py-0.5 rounded-lg bg-[var(--primary-light)]">
                    {invoices} docs
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="50"
                  value={invoices}
                  onChange={(e) => setInvoices(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-[var(--surface-raised)] accent-[var(--primary)] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                  <span>50 docs</span>
                  <span>500 docs</span>
                  <span>1,500 docs</span>
                </div>
              </div>

              {/* Slider 2: Number of Clients / Entities */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                  <span>Number of Client Entities / Companies:</span>
                  <span className="font-mono text-base font-bold text-[var(--primary)] px-2.5 py-0.5 rounded-lg bg-[var(--primary-light)]">
                    {entities} entities
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={entities}
                  onChange={(e) => setEntities(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-[var(--surface-raised)] accent-[var(--primary)] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                  <span>1 entity (Solo)</span>
                  <span>15 entities</span>
                  <span>30 entities (Practice)</span>
                </div>
              </div>

              {/* Total volume info pill */}
              <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Total monthly document pipeline:</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">
                  {totalDocs.toLocaleString("en-IN")} documents/month
                </span>
              </div>
            </div>

            {/* Right 5 Cols: Output Cards */}
            <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-teal-900 to-teal-950 text-white p-6 sm:p-7 shadow-xl flex flex-col justify-between space-y-6">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300">
                  Estimated Savings
                </span>

                <div className="mt-3">
                  <div className="text-4xl sm:text-5xl font-mono font-extrabold text-white tracking-tight">
                    {hoursSaved} hrs
                  </div>
                  <p className="text-xs text-teal-200 mt-1">
                    Reclaimed per month across your team
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-teal-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-teal-100">
                    <span>Est. Staff Cost Savings:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {formatINR(rupeesSaved)} / mo
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-teal-100">
                    <span>Turnaround Time:</span>
                    <span className="font-semibold text-emerald-300">
                      Reduced by ~90%
                    </span>
                  </div>
                </div>
              </div>

              <Button
                as={Link}
                to="/signup"
                className="w-full justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border-none shadow-md"
              >
                <span>Reclaim Your Hours Now</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoiCalculator;


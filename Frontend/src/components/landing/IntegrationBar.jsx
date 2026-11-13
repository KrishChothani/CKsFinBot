/** @format */

import React from "react";
import { Check, ShieldCheck, Database, FileSpreadsheet, Building2, Landmark } from "lucide-react";
import { LANDING_CONTENT } from "../../content/landing";

export const IntegrationBar = () => {
  const { integrations } = LANDING_CONTENT;

  return (
    <section className="py-10 border-y border-[var(--border)] bg-[var(--surface-raised)]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--primary)]">
            Verified Compatibility
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-1">
            {integrations.title}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            {integrations.subtitle}
          </p>
        </div>

        {/* Integration Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {integrations.items.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm hover:border-[var(--primary)] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                    {item.category}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <h4 className="font-bold text-xs text-[var(--text-primary)]">
                  {item.name}
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  {item.format}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-[var(--border)] flex items-center gap-1.5 text-[10px] font-semibold text-teal-700 dark:text-teal-400">
                <Check className="w-3 h-3 text-[var(--primary)]" />
                <span>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IntegrationBar;


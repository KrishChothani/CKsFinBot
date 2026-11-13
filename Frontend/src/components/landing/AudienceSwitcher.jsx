/** @format */

import React, { useState } from "react";
import { CheckCircle2, Building, Briefcase, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { LANDING_CONTENT } from "../../content/landing";
import { cn } from "../../lib/utils";

export const AudienceSwitcher = () => {
  const { audiences } = LANDING_CONTENT;
  const [activeTabId, setActiveTabId] = useState(audiences.tabs[0].id);

  const activeAudience =
    audiences.tabs.find((t) => t.id === activeTabId) || audiences.tabs[0];

  return (
    <section id="audiences" className="py-16 md:py-24 bg-[var(--surface-raised)]/30 border-y border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-300 mb-2">
            Tailored Workflows
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {audiences.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
            {audiences.subtitle}
          </p>
        </div>

        {/* Tab Toggle Switch */}
        <div className="flex justify-center mb-10">
          <div className="p-1 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm inline-flex">
            {audiences.tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const Icon = tab.id === "ca" ? Briefcase : Building;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                    isActive
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-teal-900/20"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Tab Panel */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10 shadow-sm max-w-5xl mx-auto">
          <div className="max-w-2xl mb-8">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--primary)]">
              {activeAudience.label}
            </span>
            <h3 className="text-xl sm:text-3xl font-extrabold text-[var(--text-primary)] mt-1">
              {activeAudience.headline}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeAudience.bullets.map((bullet, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--border)] space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">
                    {bullet.title}
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] pl-6 leading-relaxed">
                  {bullet.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-[var(--text-muted)]">
              {activeTabId === "ca"
                ? "Manage 10 to 100+ clients with one master firm license."
                : "Keep books up to date without hiring full-time in-house data entry clerks."}
            </span>
            <Button as={Link} to="/signup" size="sm" className="gap-1.5">
              <span>{activeTabId === "ca" ? "Start Free Firm Trial" : "Start Free Company Trial"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AudienceSwitcher;


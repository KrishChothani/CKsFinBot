/** @format */

import React from "react";
import {
  ShieldAlert,
  CheckCircle2,
  FileSpreadsheet,
  Building2,
  Send,
  History,
  Sparkles,
} from "lucide-react";
import Badge from "../ui/Badge";
import { LANDING_CONTENT } from "../../content/landing";

export const BentoFeatures = () => {
  const { bento } = LANDING_CONTENT;

  const getIcon = (iconName) => {
    switch (iconName) {
      case "ShieldAlert":
        return <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "CheckCircle2":
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case "FileSpreadsheet":
        return <FileSpreadsheet className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case "Building2":
        return <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "Send":
        return <Send className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case "History":
        return <History className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-[var(--primary)]" />;
    }
  };

  return (
    <section id="features" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-300 mb-2">
            Built for Indian Statutory Rules
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {bento.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
            {bento.subtitle}
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bento.cards.map((card, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm hover:border-[var(--primary)] transition-all hover:shadow-md flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center group-hover:scale-105 transition-transform">
                    {getIcon(card.icon)}
                  </div>
                  <Badge variant="outline" size="sm">
                    {card.tag}
                  </Badge>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-2">
                  {card.title}
                </h3>

                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center gap-1.5 text-[11px] font-semibold text-[var(--primary)] opacity-90 group-hover:opacity-100">
                <span>Enterprise Verified Feature</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoFeatures;


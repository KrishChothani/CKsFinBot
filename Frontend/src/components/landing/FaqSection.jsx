/** @format */

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import Badge from "../ui/Badge";
import { LANDING_CONTENT } from "../../content/landing";
import { cn } from "../../lib/utils";

export const FaqSection = () => {
  const { faq } = LANDING_CONTENT;
  const [openIndices, setOpenIndices] = useState([0]); // First FAQ opened by default

  const toggleIndex = (idx) => {
    setOpenIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <section id="faq" className="py-16 md:py-24 bg-[var(--surface-raised)]/20 border-t border-[var(--border)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-300 mb-2">
            Got Questions?
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {faq.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
            {faq.subtitle}
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {faq.items.map((item, idx) => {
            const isOpen = openIndices.includes(idx);
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl border transition-all duration-200 overflow-hidden",
                  isOpen
                    ? "border-[var(--primary)] bg-[var(--surface)] shadow-md shadow-teal-950/5"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleIndex(idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-sm sm:text-base text-[var(--text-primary)]">
                    {item.question}
                  </span>
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg bg-[var(--surface-raised)] flex items-center justify-center shrink-0 transition-transform duration-200",
                      isOpen ? "rotate-180 text-[var(--primary)]" : "text-[var(--text-muted)]"
                    )}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)]/60 mt-1">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;


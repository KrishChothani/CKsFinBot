/** @format */

import React from "react";
import { CheckCircle2, ArrowRight, UploadCloud, Cpu, FileCheck } from "lucide-react";
import { LANDING_CONTENT } from "../../content/landing";
import Badge from "../ui/Badge";

export const HowItWorks = () => {
  const { howItWorks } = LANDING_CONTENT;

  const stepIcons = [UploadCloud, Cpu, FileCheck];

  return (
    <section id="how-it-works" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-300 mb-3">
            Simple 3-Step Process
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {howItWorks.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
            {howItWorks.subtitle}
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {howItWorks.steps.map((step, idx) => {
            const Icon = stepIcons[idx] || CheckCircle2;
            return (
              <div
                key={idx}
                className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm hover:border-[var(--primary)] transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Step Number & Icon */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-mono font-extrabold text-[var(--text-muted)] opacity-30">
                      {step.step}
                    </span>
                  </div>

                  <Badge variant="outline" size="sm" className="mb-2">
                    {step.badge}
                  </Badge>

                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Sub Features Checklist */}
                <div className="pt-4 mt-5 border-t border-[var(--border)] space-y-2">
                  {step.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;


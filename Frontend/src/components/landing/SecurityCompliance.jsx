/** @format */

import React from "react";
import { Lock, KeyRound, MapPin, UserCheck, ShieldCheck } from "lucide-react";
import Badge from "../ui/Badge";
import { LANDING_CONTENT } from "../../content/landing";

export const SecurityCompliance = () => {
  const { security } = LANDING_CONTENT;

  const getSecurityIcon = (iconName) => {
    switch (iconName) {
      case "Lock":
        return <Lock className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case "KeyRound":
        return <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case "MapPin":
        return <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "UserCheck":
        return <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-[var(--primary)]" />;
    }
  };

  return (
    <section id="security" className="py-16 md:py-24 bg-[var(--surface-raised)]/30 border-y border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-300 mb-2">
            Bank-Grade Architecture
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {security.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
            {security.subtitle}
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {security.pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm hover:border-[var(--primary)] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-11 h-11 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center mb-4">
                  {getSecurityIcon(pillar.icon)}
                </div>

                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                  {pillar.title}
                </h3>

                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {pillar.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Audited Standard</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SecurityCompliance;


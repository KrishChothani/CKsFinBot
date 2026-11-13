/** @format */

import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Calendar,
  Zap,
} from "lucide-react";
import Button from "../ui/Button";
import BrowserFrame from "./frames/BrowserFrame";
import MockReviewQueue from "./frames/mockups/MockReviewQueue";
import { LANDING_CONTENT } from "../../content/landing";

export const HeroSection = ({ onOpenDemoModal }) => {
  const { announcement, hero } = LANDING_CONTENT;

  return (
    <section className="relative pt-6 pb-16 md:pt-12 md:pb-24 overflow-hidden">
      {/* Subtle Radial Glow in Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[250px] bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Announcement Pill Badge */}
        <div className="flex justify-center mb-6">
          <a
            href={announcement.linkHref}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:border-[var(--primary)] text-xs text-[var(--text-secondary)] transition-all hover:scale-[1.01]"
          >
            <span className="flex items-center gap-1 font-semibold text-[var(--primary)] px-2 py-0.5 rounded-full bg-[var(--primary-light)]">
              <Zap className="w-3 h-3" />
              {announcement.badge}
            </span>
            <span className="truncate max-w-[280px] sm:max-w-md">{announcement.text}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </a>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="text-center max-w-4xl mx-auto space-y-5">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.15]">
            Upload Messy Invoices & Bank Statements.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 dark:from-teal-300 dark:via-teal-200 dark:to-emerald-300">
              Get Tally-Ready Books in Seconds.
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
            {hero.subhead}
          </p>

          {/* Dual CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button
              as={Link}
              to={hero.primaryCta.href}
              size="lg"
              className="w-full sm:w-auto px-7 py-3 text-sm font-semibold shadow-lg shadow-teal-900/15 dark:shadow-teal-950/40 gap-2"
            >
              <span>{hero.primaryCta.text}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={onOpenDemoModal}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold gap-2 border-[var(--border-strong)]"
            >
              <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{hero.secondaryCta.text}</span>
            </Button>
          </div>

          {/* Micro-Trust Signals */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--text-muted)] font-medium">
            {hero.trustBadges.map((badge, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Hero Visual Mockup */}
        <div className="mt-12 md:mt-16 max-w-5xl mx-auto">
          <div className="relative group">
            {/* Subtle glow border */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-amber-500/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />

            <BrowserFrame
              url="app.cksfinbot.in/app/review"
              title="CKsFinBot AI Review Queue • Apex Steel & Alloys Pvt Ltd"
            >
              <MockReviewQueue />
            </BrowserFrame>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;


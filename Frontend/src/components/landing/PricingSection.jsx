/** @format */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { PRICING_TIERS } from "../../lib/pricing";
import { formatINR } from "../../lib/format";
import { LANDING_CONTENT } from "../../content/landing";
import { cn } from "../../lib/utils";

export const PricingSection = () => {
  const { pricing } = LANDING_CONTENT;
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-300 mb-2">
            Transparent Pricing
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {pricing.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
            {pricing.subtitle}
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-3 p-1 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                !annual
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Monthly Billing
            </button>

            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                annual
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950">
                2 Mo Free
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {PRICING_TIERS.map((tier) => {
            const price = annual
              ? Math.round(tier.annualPrice / 12)
              : tier.monthlyPrice;

            return (
              <div
                key={tier.id}
                className={cn(
                  "relative rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-200",
                  tier.popular
                    ? "border-[var(--primary)] bg-[var(--surface)] shadow-xl shadow-teal-950/10 dark:shadow-teal-950/30 scale-100 lg:-translate-y-2 ring-2 ring-[var(--primary)]/20"
                    : "border-[var(--border)] bg-[var(--surface)] shadow-sm hover:border-[var(--border-strong)]"
                )}
              >
                {/* Popular Ribbon */}
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold tracking-wide shadow-md">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">
                      {tier.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed min-h-[36px]">
                      {tier.tagline}
                    </p>
                  </div>

                  {/* Price display */}
                  <div className="py-4 border-y border-[var(--border)] my-5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-extrabold font-mono text-[var(--text-primary)]">
                        {formatINR(price, { showDecimals: false })}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-medium">
                        / month
                      </span>
                    </div>
                    {annual && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                        Billed annually ({formatINR(tier.annualPrice)} / year)
                      </p>
                    )}
                  </div>

                  {/* Features list */}
                  <div className="space-y-3">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                      Included in {tier.name}:
                    </span>
                    {tier.features.map((feature, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]"
                      >
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-6 mt-8 border-t border-[var(--border)]">
                  <Button
                    as={Link}
                    to={tier.ctaHref}
                    variant={tier.popular ? "primary" : "outline"}
                    className="w-full justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold"
                  >
                    <span>{tier.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom enterprise note */}
        <div className="text-center mt-10">
          <p className="text-xs text-[var(--text-muted)]">
            Need a custom deployment with dedicated server hosting or custom ERP plugins?{" "}
            <a
              href="#demo"
              className="text-[var(--primary)] font-semibold hover:underline"
            >
              Talk to our Enterprise Architecture Team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;


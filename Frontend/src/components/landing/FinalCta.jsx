/** @format */

import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Calendar, CheckCircle2 } from "lucide-react";
import Button from "../ui/Button";
import { LANDING_CONTENT } from "../../content/landing";

export const FinalCta = ({ onOpenDemoModal }) => {
  const { finalCta } = LANDING_CONTENT;

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-teal-900 via-teal-950 to-slate-950 text-white p-8 sm:p-14 lg:p-16 shadow-2xl border border-teal-800/50">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-3xl mx-auto text-center space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-800/50 text-teal-200 border border-teal-700/60 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              14-Day Free Practice Trial
            </span>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {finalCta.headline}
            </h2>

            <p className="text-sm sm:text-lg text-teal-100 max-w-2xl mx-auto leading-relaxed">
              {finalCta.subhead}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Button
                as={Link}
                to={finalCta.primaryCta.href}
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 border-none shadow-lg shadow-amber-950/20 gap-2"
              >
                <span>{finalCta.primaryCta.text}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={onOpenDemoModal}
                className="w-full sm:w-auto px-7 py-3.5 text-sm font-semibold border-teal-700 hover:bg-teal-900/60 text-white gap-2"
              >
                <Calendar className="w-4 h-4 text-amber-300" />
                <span>{finalCta.secondaryCta.text}</span>
              </Button>
            </div>

            <p className="text-xs text-teal-300/80 pt-2 font-medium">
              {finalCta.footerNote}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCta;


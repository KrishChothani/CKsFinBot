/** @format */

import React from "react";
import { Lock, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../../lib/utils";

export const BrowserFrame = ({
  children,
  url = "app.cksfinbot.in/app/review",
  title = "CKsFinBot Enterprise • Client: Apex Steel & Alloys Pvt Ltd",
  className = "",
  showControls = true,
  aspectRatio,
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-teal-950/10 dark:shadow-black/50 overflow-hidden transition-all duration-300",
        className
      )}
    >
      {/* Browser Chrome Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-raised)]/80 backdrop-blur-sm select-none">
        {/* Left: Window Controls / Traffic Lights */}
        <div className="flex items-center gap-2 min-w-[70px]">
          <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block border border-rose-600/30" />
          <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block border border-amber-600/30" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block border border-emerald-600/30" />
        </div>

        {/* Center: Address Bar */}
        <div className="flex items-center justify-center flex-1 max-w-lg mx-2">
          <div className="flex items-center gap-2 px-3 py-1 w-full max-w-md rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-muted)] font-mono shadow-inner">
            <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">https://</span>
            <span className="truncate text-[var(--text-secondary)]">{url}</span>
            <div className="ml-auto flex items-center gap-1.5 opacity-60">
              <ShieldCheck className="w-3 h-3 text-teal-600" />
            </div>
          </div>
        </div>

        {/* Right: Window Action Icons */}
        <div className="hidden sm:flex items-center gap-2 text-[var(--text-muted)] opacity-70">
          <ChevronLeft className="w-3.5 h-3.5" />
          <ChevronRight className="w-3.5 h-3.5" />
          <RefreshCw className="w-3 h-3 ml-1" />
        </div>
      </div>

      {/* Screen Content Wrapper */}
      <div
        className={cn(
          "relative overflow-hidden bg-[var(--bg-app)]",
          aspectRatio ? `aspect-[${aspectRatio}]` : ""
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default BrowserFrame;


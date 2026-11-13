/** @format */

import React from "react";
import { Wifi, Battery, Signal } from "lucide-react";
import { cn } from "../../../lib/utils";

export const PhoneFrame = ({ children, className = "" }) => {
  return (
    <div
      className={cn(
        "relative mx-auto rounded-[2.5rem] border-[6px] border-slate-800 dark:border-slate-700 bg-slate-900 p-2 shadow-2xl max-w-[320px] overflow-hidden",
        className
      )}
    >
      {/* Dynamic Island / Speaker Notch */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 h-4 w-28 bg-black rounded-full flex items-center justify-center">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-950 inline-block mr-2" />
        <span className="w-2 h-2 rounded-full bg-blue-950 inline-block" />
      </div>

      {/* Screen Inner */}
      <div className="relative rounded-[2rem] overflow-hidden bg-[var(--surface)] text-[var(--text-primary)] border border-slate-800 flex flex-col min-h-[560px]">
        {/* Status Bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2 text-[10px] font-mono text-[var(--text-muted)] select-none">
          <span>09:41</span>
          <div className="flex items-center gap-1.5">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <Battery className="w-3 h-3" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-2">{children}</div>

        {/* Home Indicator Bar */}
        <div className="py-2 flex justify-center">
          <div className="w-32 h-1 bg-[var(--border-strong)] rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default PhoneFrame;


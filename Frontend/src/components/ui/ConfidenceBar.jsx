/** @format */

import React from "react";
import { cn } from "../../lib/utils";

export const ConfidenceBar = ({
  score = 0, // 0 to 1 or 0 to 100
  showLabel = true,
  className,
}) => {
  const normalized = score > 1 ? Math.min(score, 100) : Math.min(Math.max(score * 100, 0), 100);

  let colorClass = "bg-[var(--danger)]";
  let textClass = "text-[var(--danger)]";
  if (normalized >= 85) {
    colorClass = "bg-[var(--success)]";
    textClass = "text-[var(--success)]";
  } else if (normalized >= 60) {
    colorClass = "bg-[var(--warning)]";
    textClass = "text-[var(--warning)]";
  }

  return (
    <div className={cn("flex items-center gap-2 min-w-[90px]", className)}>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", colorClass)}
          style={{ width: `${normalized}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("text-[11px] font-bold font-tabular shrink-0", textClass)}>
          {Math.round(normalized)}%
        </span>
      )}
    </div>
  );
};

export default ConfidenceBar;


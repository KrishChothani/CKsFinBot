/** @format */

import React from "react";
import { cn } from "../../lib/utils";

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]/40",
        className
      )}
      {...props}
    />
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full space-y-2">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export default Skeleton;


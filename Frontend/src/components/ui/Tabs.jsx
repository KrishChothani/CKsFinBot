/** @format */

import React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export const TabsList = ({ children, className, ...props }) => (
  <TabsPrimitive.List
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-[var(--surface-raised)] p-1 text-[var(--text-muted)] border border-[var(--border)]",
      className
    )}
    {...props}
  >
    {children}
  </TabsPrimitive.List>
);

export const TabsTrigger = ({ children, className, value, ...props }) => (
  <TabsPrimitive.Trigger
    value={value}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-xs data-[state=active]:font-semibold cursor-pointer",
      className
    )}
    {...props}
  >
    {children}
  </TabsPrimitive.Trigger>
);

export const SegmentedControl = ({
  options = [], // [{ label: "Month", value: "month" }, ...]
  value,
  onChange,
  className,
}) => {
  return (
    <div
      className={cn(
        "inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-all select-none cursor-pointer",
              isActive
                ? "bg-[var(--surface)] text-[var(--primary)] font-semibold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;


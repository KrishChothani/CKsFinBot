/** @format */

import React from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/utils";

export const Dropdown = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;

export const DropdownContent = ({
  children,
  className,
  align = "end",
  sideOffset = 4,
  ...props
}) => {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[180px] rounded-xl bg-[var(--surface)] border border-[var(--border)] p-1.5 shadow-lg text-[var(--text-primary)] animate-in fade-in-80 duration-100",
          className
        )}
        {...props}
      >
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
};

export const DropdownItem = ({
  children,
  className,
  onSelect,
  disabled = false,
  destructive = false,
  icon: Icon,
  ...props
}) => {
  return (
    <DropdownPrimitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors hover:bg-[var(--surface-raised)] focus:bg-[var(--surface-raised)] disabled:pointer-events-none disabled:opacity-50",
        destructive && "text-[var(--danger)] hover:bg-[var(--danger-light)] focus:bg-[var(--danger-light)]",
        className
      )}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span className="flex-1">{children}</span>
    </DropdownPrimitive.Item>
  );
};

export const DropdownSeparator = ({ className }) => (
  <DropdownPrimitive.Separator
    className={cn("my-1 h-px bg-[var(--border)]", className)}
  />
);

export const DropdownLabel = ({ children, className }) => (
  <DropdownPrimitive.Label
    className={cn(
      "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]",
      className
    )}
  >
    {children}
  </DropdownPrimitive.Label>
);

export default Dropdown;


/** @format */

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export const Sheet = ({
  open,
  onOpenChange,
  children,
}) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
};

export const SheetContent = ({
  children,
  side = "left", // left | right
  className,
  title,
}) => {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-0 bottom-0 z-50 h-full w-[280px] bg-[var(--surface)] border-[var(--border)] shadow-2xl flex flex-col p-4 transition-transform duration-200 ease-in-out focus:outline-none",
          side === "left" && "left-0 border-r",
          side === "right" && "right-0 border-l",
          className
        )}
      >
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--border)]">
          <DialogPrimitive.Title className="text-sm font-semibold text-[var(--text-primary)]">
            {title || "Navigation"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors">
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
};

export default Sheet;


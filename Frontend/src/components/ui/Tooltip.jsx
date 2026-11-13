/** @format */

import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;

export const Tooltip = ({
  children,
  content,
  side = "top",
  align = "center",
  delayDuration = 200,
  className,
}) => {
  if (!content) return children;

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={4}
            className={cn(
              "z-50 overflow-hidden rounded-md bg-[var(--surface-raised)] border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] shadow-md animate-in fade-in-0 zoom-in-95",
              className
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-[var(--surface-raised)]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

export default Tooltip;


/** @format */

import React from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/utils";

export const EmptyState = ({
  icon: Icon = FolderPlus,
  title = "No data available",
  description = "Get started by creating a new entry or selecting a workspace.",
  actionLabel,
  onAction,
  actionIcon,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl bg-[var(--surface)] border border-[var(--border)] border-dashed my-4",
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)] mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="sm"
          onClick={onAction}
          icon={actionIcon}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;


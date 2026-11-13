/** @format */

import React from "react";
import { cn } from "../../lib/utils";

export const Badge = ({
  children,
  variant = "default", // default | primary | success | warning | danger | info | outline
  size = "md", // sm | md
  className,
  ...props
}) => {
  const base = "inline-flex items-center font-medium rounded-full select-none";

  const sizes = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-0.5 text-xs gap-1.5",
  };

  const variants = {
    default:
      "bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]",
    primary:
      "bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary-border)] font-semibold",
    success:
      "bg-[var(--success-light)] text-[var(--success)] border border-[var(--success-border)]",
    warning:
      "bg-[var(--warning-light)] text-[var(--warning)] border border-[var(--warning-border)]",
    danger:
      "bg-[var(--danger-light)] text-[var(--danger)] border border-[var(--danger-border)]",
    info:
      "bg-[var(--info-light)] text-[var(--info)] border border-[var(--info-border)]",
    outline:
      "bg-transparent text-[var(--text-secondary)] border border-[var(--border-strong)]",
  };

  return (
    <span className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </span>
  );
};

export const StatusPill = ({ status, className }) => {
  const s = (status || "").toLowerCase().trim();

  let variant = "default";
  let label = status || "Unknown";

  switch (s) {
    case "approved":
    case "posted":
    case "reconciled":
    case "active":
    case "matched":
    case "completed":
      variant = "success";
      break;
    case "processing":
    case "in_progress":
    case "extracting":
      variant = "info";
      label = label.replace("_", " ");
      break;
    case "needs_review":
    case "pending":
    case "queued":
    case "partial":
    case "action_required":
      variant = "warning";
      label = label.replace("_", " ");
      break;
    case "rejected":
    case "failed":
    case "void":
    case "cancelled":
    case "mismatch":
      variant = "danger";
      label = label.replace("_", " ");
      break;
    default:
      variant = "default";
      break;
  }

  return (
    <Badge variant={variant} size="sm" className={cn("capitalize", className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" />
      <span>{label}</span>
    </Badge>
  );
};

export default Badge;


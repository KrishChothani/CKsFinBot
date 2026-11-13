/** @format */

import React from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

export const PageHeader = ({
  title,
  description,
  breadcrumbs = [], // [{ label: "Home", href: "/app/dashboard" }, { label: "Inbox" }]
  children, // Right-side action slot
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-5 border-b border-[var(--border)]",
        className
      )}
    >
      <div>
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
            {breadcrumbs.map((b, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {b.href && !isLast ? (
                    <Link
                      to={b.href}
                      className="hover:text-[var(--text-primary)] transition-colors"
                    >
                      {b.label}
                    </Link>
                  ) : (
                    <span className={cn(isLast && "font-semibold text-[var(--text-primary)]")}>
                      {b.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />}
                </React.Fragment>
              );
            })}
          </nav>
        )}
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        {description && (
          <p className="text-xs md:text-sm text-[var(--text-muted)] mt-0.5">
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;


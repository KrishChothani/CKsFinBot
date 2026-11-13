/** @format */

import React from "react";
import { cn } from "../../lib/utils";

export const Card = ({
  children,
  className,
  as: Component = "div",
  hover = false,
  ...props
}) => {
  return (
    <Component
      className={cn(
        "rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-xs transition-all",
        hover && "hover:border-[var(--border-strong)] hover:shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export const CardHeader = ({ children, className, ...props }) => (
  <div
    className={cn(
      "px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle = ({ children, className, ...props }) => (
  <h3
    className={cn(
      "text-sm font-semibold text-[var(--text-primary)] tracking-tight",
      className
    )}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription = ({ children, className, ...props }) => (
  <p className={cn("text-xs text-[var(--text-muted)] mt-0.5", className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className, ...props }) => (
  <div className={cn("p-5", className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className, ...props }) => (
  <div
    className={cn(
      "px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-raised)]/50 rounded-b-xl flex items-center justify-between",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const KpiCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend, // { value: "+12.5%", positive: true/false }
  badge,
  className,
}) => {
  return (
    <Card className={cn("p-4 md:p-5 flex flex-col justify-between", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-[var(--text-muted)] block truncate">
            {title}
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)] font-tabular">
              {value}
            </span>
          </div>
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)] shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend || badge) && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
          {subtitle && (
            <span className="text-[var(--text-muted)] truncate">{subtitle}</span>
          )}
          {trend && (
            <span
              className={cn(
                "font-semibold font-tabular flex items-center gap-0.5 ml-auto",
                trend.positive ? "text-[var(--success)]" : "text-[var(--danger)]"
              )}
            >
              {trend.value}
            </span>
          )}
          {badge}
        </div>
      )}
    </Card>
  );
};

export default Card;


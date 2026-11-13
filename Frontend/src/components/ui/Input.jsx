/** @format */

import React, { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef(
  (
    {
      className,
      type = "text",
      icon: Icon,
      error,
      label,
      helperText,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[var(--text-secondary)] tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3 text-[var(--text-muted)] pointer-events-none">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            className={cn(
              "w-full h-9 rounded-lg bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm px-3 border border-[var(--border)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed",
              Icon && "pl-9",
              error && "border-[var(--danger)] focus:ring-[var(--danger)]",
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-[11px] text-[var(--danger)] font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[var(--text-muted)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export const Select = forwardRef(
  (
    {
      className,
      children,
      label,
      error,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[var(--text-secondary)] tracking-wide"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            "w-full h-9 rounded-lg bg-[var(--surface)] text-[var(--text-primary)] text-sm px-3 border border-[var(--border)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent disabled:opacity-50 cursor-pointer",
            error && "border-[var(--danger)] focus:ring-[var(--danger)]",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-[11px] text-[var(--danger)] font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Input;


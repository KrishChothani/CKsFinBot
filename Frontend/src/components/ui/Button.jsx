/** @format */

import React, { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Button = forwardRef(
  (
    {
      children,
      className,
      variant = "primary", // primary | secondary | outline | ghost | danger | success
      size = "md", // sm | md | lg
      disabled = false,
      isLoading = false,
      type = "button",
      icon: Icon,
      iconPosition = "left",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-lg select-none cursor-pointer";

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-sm gap-2",
      lg: "h-11 px-5 text-base gap-2.5",
    };

    const variantStyles = {
      primary:
        "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] focus-visible:ring-[var(--primary)] shadow-sm",
      secondary:
        "bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--border)] border border-[var(--border)] focus-visible:ring-[var(--border-strong)]",
      outline:
        "bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-raised)] border border-[var(--border)] focus-visible:ring-[var(--primary)]",
      ghost:
        "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] focus-visible:ring-[var(--border)]",
      danger:
        "bg-[var(--danger)] text-white hover:opacity-90 focus-visible:ring-[var(--danger)] shadow-sm",
      success:
        "bg-[var(--success)] text-white hover:opacity-90 focus-visible:ring-[var(--success)] shadow-sm",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {!isLoading && Icon && iconPosition === "left" && (
          <Icon className="w-4 h-4 shrink-0" />
        )}
        {children}
        {!isLoading && Icon && iconPosition === "right" && (
          <Icon className="w-4 h-4 shrink-0" />
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export const IconButton = forwardRef(
  (
    {
      icon: Icon,
      className,
      size = "md",
      variant = "ghost",
      disabled = false,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: "w-8 h-8",
      md: "w-9 h-9",
      lg: "w-11 h-11",
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn("p-0 rounded-lg", sizeStyles[size], className)}
        {...props}
      >
        <Icon className="w-4 h-4" />
      </Button>
    );
  }
);

IconButton.displayName = "IconButton";

export default Button;


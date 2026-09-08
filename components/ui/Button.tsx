"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-erp-primary)] disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-erp-primary)] text-white hover:bg-[var(--color-erp-primary-hover)] active:scale-[0.98]",
        secondary:
          "bg-[var(--color-erp-surface-2)] text-[var(--color-erp-text-primary)] border border-[var(--color-erp-border)] hover:bg-[var(--color-erp-border)] active:scale-[0.98]",
        ghost:
          "text-[var(--color-erp-text-secondary)] hover:bg-[var(--color-erp-surface-2)] hover:text-[var(--color-erp-text-primary)] active:scale-[0.98]",
        outline:
          "border border-[var(--color-erp-border)] text-[var(--color-erp-text-primary)] hover:bg-[var(--color-erp-surface-2)] active:scale-[0.98]",
        destructive:
          "bg-[var(--color-erp-danger)] text-white hover:bg-red-700 active:scale-[0.98]",
        "destructive-outline":
          "border border-[var(--color-erp-danger)] text-[var(--color-erp-danger)] hover:bg-[var(--color-erp-danger-surface)] active:scale-[0.98]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-sm",
        xl: "h-11 px-6 text-base",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-7 w-7 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  /** Icon displayed before label */
  leftIcon?: React.ReactNode;
  /** Icon displayed after label */
  rightIcon?: React.ReactNode;
  /** Tooltip shown on icon buttons (required for accessibility) */
  tooltip?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      leftIcon,
      rightIcon,
      tooltip,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-label={tooltip}
        title={tooltip}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };

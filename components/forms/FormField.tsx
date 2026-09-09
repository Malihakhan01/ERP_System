"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// ---- FormField wrapper: label + input + error ----

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  description,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-[var(--color-erp-text-primary)]"
        >
          {label}
        </label>
        {required && (
          <span
            className="text-[var(--color-erp-danger)] text-sm leading-none"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-[var(--color-erp-text-muted)]">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-xs text-[var(--color-erp-danger)] flex items-center gap-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ---- FormSection: groups related fields with a heading ----

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  gridClassName?: string;
}

export function FormSection({ title, description, children, className, gridClassName }: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="border-b border-[var(--color-erp-border)] pb-3">
        <h3 className="text-sm font-semibold text-[var(--color-erp-text-primary)]">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--color-erp-text-muted)]">{description}</p>
        )}
      </div>
      <div className={cn(gridClassName || "grid grid-cols-1 gap-4 sm:grid-cols-2")}>{children}</div>
    </div>
  );
}

// ---- FormActions: submit + cancel row ----

export interface FormActionsProps {
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
}

export function FormActions({
  submitLabel = "Save",
  cancelLabel = "Cancel",
  onCancel,
  loading = false,
  className,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-erp-border)]",
        className
      )}
    >
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md border border-[var(--color-erp-border)] text-[var(--color-erp-text-secondary)] hover:bg-[var(--color-erp-surface-2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelLabel}
        </button>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md bg-[var(--color-erp-primary)] text-white hover:bg-[var(--color-erp-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {submitLabel}
      </button>
    </div>
  );
}

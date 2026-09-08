"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// ---- Text / Number / Currency Input ----

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  /** Displayed before the input (e.g. currency symbol) */
  prefix?: React.ReactNode;
  /** Displayed after the input (e.g. unit "KG") */
  suffix?: React.ReactNode;
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, prefix, suffix, error, ...props }, ref) => {
    const hasWrapper = prefix || suffix;

    const inputEl = (
      <input
        ref={ref}
        className={cn(
          "block w-full rounded-md border bg-[var(--color-erp-surface)] px-3 py-2 text-sm text-[var(--color-erp-text-primary)] placeholder:text-[var(--color-erp-text-muted)]",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-erp-primary)] focus:border-[var(--color-erp-primary)]",
          "disabled:cursor-not-allowed disabled:bg-[var(--color-erp-surface-2)] disabled:opacity-70",
          error
            ? "border-[var(--color-erp-danger)] focus:ring-[var(--color-erp-danger)]"
            : "border-[var(--color-erp-border)]",
          hasWrapper && "rounded-none",
          prefix && "rounded-l-none",
          suffix && "rounded-r-none",
          className
        )}
        {...props}
      />
    );

    if (!hasWrapper) return inputEl;

    return (
      <div className="flex rounded-md border border-[var(--color-erp-border)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-erp-primary)] focus-within:border-[var(--color-erp-primary)]">
        {prefix && (
          <span className="flex items-center px-3 bg-[var(--color-erp-surface-2)] border-r border-[var(--color-erp-border)] text-sm text-[var(--color-erp-text-secondary)] whitespace-nowrap">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "flex-1 px-3 py-2 text-sm bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] placeholder:text-[var(--color-erp-text-muted)]",
            "focus:outline-none disabled:cursor-not-allowed disabled:bg-[var(--color-erp-surface-2)] disabled:opacity-70",
            error && "ring-[var(--color-erp-danger)]"
          )}
          {...props}
        />
        {suffix && (
          <span className="flex items-center px-3 bg-[var(--color-erp-surface-2)] border-l border-[var(--color-erp-border)] text-sm text-[var(--color-erp-text-secondary)] whitespace-nowrap">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

// ---- Textarea ----

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "block w-full rounded-md border bg-[var(--color-erp-surface)] px-3 py-2 text-sm text-[var(--color-erp-text-primary)] placeholder:text-[var(--color-erp-text-muted)] resize-y min-h-[80px]",
        "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-erp-primary)] focus:border-[var(--color-erp-primary)]",
        "disabled:cursor-not-allowed disabled:bg-[var(--color-erp-surface-2)] disabled:opacity-70",
        error
          ? "border-[var(--color-erp-danger)] focus:ring-[var(--color-erp-danger)]"
          : "border-[var(--color-erp-border)]",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

// ---- Select ----

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  placeholder?: string;
  options: { value: string; label: string; disabled?: boolean }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, placeholder, options, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "block w-full rounded-md border bg-[var(--color-erp-surface)] px-3 py-2 text-sm text-[var(--color-erp-text-primary)]",
        "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-erp-primary)] focus:border-[var(--color-erp-primary)]",
        "disabled:cursor-not-allowed disabled:bg-[var(--color-erp-surface-2)] disabled:opacity-70",
        "appearance-none",
        error
          ? "border-[var(--color-erp-danger)] focus:ring-[var(--color-erp-danger)]"
          : "border-[var(--color-erp-border)]",
        className
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: "36px",
      }}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  )
);
Select.displayName = "Select";

// ---- Checkbox ----

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, error, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={cn(
            "mt-0.5 h-4 w-4 rounded border cursor-pointer accent-[var(--color-erp-primary)]",
            "focus:ring-2 focus:ring-[var(--color-erp-primary)] focus:ring-offset-1",
            error ? "border-[var(--color-erp-danger)]" : "border-[var(--color-erp-border)]",
            className
          )}
          {...props}
        />
        {(label || description) && (
          <div className="min-w-0">
            {label && (
              <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-erp-text-primary)] cursor-pointer">
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-[var(--color-erp-text-muted)]">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

// ---- Toggle ----

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Toggle({ checked, onChange, label, description, disabled, id }: ToggleProps) {
  const generatedId = React.useId();
  const toggleId = id ?? generatedId;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        id={toggleId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-erp-primary)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-[var(--color-erp-primary)]" : "bg-[var(--color-erp-border-strong)]"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
      {(label || description) && (
        <div>
          {label && (
            <label htmlFor={toggleId} className="text-sm font-medium text-[var(--color-erp-text-primary)] cursor-pointer">
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-[var(--color-erp-text-muted)]">{description}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Radio Group ----

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  error?: boolean;
}

export function RadioGroup({ name, value, onChange, options, error }: RadioGroupProps) {
  return (
    <div className="space-y-2" role="radiogroup">
      {options.map((opt) => {
        const radioId = `${name}-${opt.value}`;
        return (
          <div key={opt.value} className="flex items-start gap-3">
            <input
              type="radio"
              id={radioId}
              name={name}
              value={opt.value}
              checked={value === opt.value}
              disabled={opt.disabled}
              onChange={() => onChange(opt.value)}
              className={cn(
                "mt-0.5 h-4 w-4 cursor-pointer accent-[var(--color-erp-primary)]",
                "focus:ring-2 focus:ring-[var(--color-erp-primary)]",
                error ? "border-[var(--color-erp-danger)]" : "border-[var(--color-erp-border)]",
                opt.disabled && "cursor-not-allowed opacity-50"
              )}
            />
            <div>
              <label
                htmlFor={radioId}
                className={cn(
                  "text-sm font-medium cursor-pointer",
                  opt.disabled
                    ? "text-[var(--color-erp-text-muted)] cursor-not-allowed"
                    : "text-[var(--color-erp-text-primary)]"
                )}
              >
                {opt.label}
              </label>
              {opt.description && (
                <p className="text-xs text-[var(--color-erp-text-muted)]">{opt.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { PhoneInput } from "./PhoneInput";
export type { PhoneInputProps, PhoneInputValue, CountryConfig } from "./PhoneInput";

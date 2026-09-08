"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

// ---- Empty State ----

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center border-dashed border-2 border-[var(--color-erp-border)] rounded-xl bg-[var(--color-erp-surface)] w-full min-w-0",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3.5 shadow-xs border border-blue-100/60">
        {icon}
      </div>
      <h3 className="text-sm sm:text-base font-bold text-[var(--color-erp-text-primary)]">
        {title}
      </h3>
      <p className="mt-1 text-xs text-[var(--color-erp-text-muted)] max-w-md leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button
            variant="primary"
            size="sm"
            onClick={onAction}
            leftIcon={actionIcon}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---- Tabs ----

export interface TabItem {
  key: string;
  label: string;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeKey, onChange, className }: TabsProps) {
  return (
    <div
      className={cn("flex border-b border-[var(--color-erp-border)] overflow-x-auto no-scrollbar", className)}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeKey === tab.key}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && onChange(tab.key)}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors duration-150 shrink-0",
            "focus-visible:outline-2 focus-visible:outline-[var(--color-erp-primary)]",
            activeKey === tab.key
              ? "border-[var(--color-erp-primary)] text-[var(--color-erp-primary)]"
              : "border-transparent text-[var(--color-erp-text-secondary)] hover:text-[var(--color-erp-text-primary)] hover:border-[var(--color-erp-border-strong)]",
            tab.disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[var(--color-erp-surface-2)] border border-[var(--color-erp-border)] text-[10px] font-bold text-[var(--color-erp-text-secondary)] px-1">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---- Pagination ----

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pageSize, total, onPageChange, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 text-xs p-3.5 border-t border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] w-full min-w-0", className)}>
      <p className="text-[var(--color-erp-text-muted)] font-medium">
        {total === 0 ? "Showing 0 records" : `Showing ${from}–${to} of ${total} records`}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-7 px-2.5 items-center justify-center rounded-lg border border-[var(--color-erp-border)] text-xs font-semibold text-[var(--color-erp-text-secondary)] hover:bg-[var(--color-erp-surface-2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <span className="px-2 text-xs font-semibold text-[var(--color-erp-text-primary)]">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-7 px-2.5 items-center justify-center rounded-lg border border-[var(--color-erp-border)] text-xs font-semibold text-[var(--color-erp-text-secondary)] hover:bg-[var(--color-erp-surface-2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ---- Progress Bar ----

export interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showValue?: boolean;
  variant?: "primary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const PROGRESS_COLOR = {
  primary: "bg-blue-600",
  success: "bg-emerald-600",
  warning: "bg-amber-500",
  danger: "bg-rose-600",
};

const PROGRESS_HEIGHT = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

export function ProgressBar({
  value,
  label,
  showValue = false,
  variant = "primary",
  size = "md",
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("space-y-1 w-full min-w-0", className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs text-[var(--color-erp-text-secondary)] font-medium">
          {label && <span>{label}</span>}
          {showValue && <span className="tabular-nums font-semibold">{clamped}%</span>}
        </div>
      )}
      <div
        className={cn("w-full bg-[var(--color-erp-surface-2)] rounded-full overflow-hidden", PROGRESS_HEIGHT[size])}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", PROGRESS_COLOR[variant])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// ---- Breadcrumb ----

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center min-w-0", className)}>
      <ol className="flex items-center gap-1 flex-wrap text-xs">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {isLast ? (
                <span
                  className="font-semibold text-[var(--color-erp-text-primary)]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-[var(--color-erp-text-muted)] hover:text-[var(--color-erp-text-primary)] transition-colors"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className="text-[var(--color-erp-text-muted)]">
                      {item.label}
                    </span>
                  )}
                  <span className="text-[var(--color-erp-text-muted)]">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

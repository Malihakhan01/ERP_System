"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ---- Base Card ----

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove padding */
  noPadding?: boolean;
}

export function Card({ className, noPadding, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--color-erp-surface)] rounded-xl border border-[var(--color-erp-border)]",
        "shadow-xs min-w-0 w-full",
        !noPadding && "p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ---- Card Header ----

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, description, action, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 mb-4 min-w-0", className)}
      {...props}
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-[var(--color-erp-text-primary)] truncate">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--color-erp-text-muted)] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ---- Stat Card ----

export type TrendDirection = "up" | "down" | "neutral";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Supporting text below the value */
  sub?: string;
  /** Rendered icon element — pass as <Icon className="h-5 w-5" /> */
  icon?: React.ReactNode;
  /** Icon background color class */
  iconColor?: string;
  trend?: {
    value: string;
    direction: TrendDirection;
  };
  loading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  iconColor = "bg-blue-50 text-blue-600",
  trend,
  loading = false,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-[var(--color-erp-surface)] rounded-xl border border-[var(--color-erp-border)] p-5 shadow-xs animate-pulse min-w-0">
        <div className="h-3 w-24 bg-[var(--color-erp-border)] rounded mb-3" />
        <div className="h-7 w-32 bg-[var(--color-erp-border)] rounded mb-2" />
        <div className="h-3 w-16 bg-[var(--color-erp-border)] rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-[var(--color-erp-surface)] rounded-xl border border-[var(--color-erp-border)] p-4 sm:p-5",
        "shadow-xs transition-all hover:border-[var(--color-erp-border-strong)] min-w-0 flex flex-col justify-between h-full",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--color-erp-text-secondary)] truncate">
            {label}
          </p>
          <div className="mt-1.5 flex items-baseline gap-2 min-w-0">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-erp-text-primary)] truncate">
              {value}
            </span>
          </div>
          {(trend || sub) && (
            <div className="mt-1 flex items-center gap-1.5 min-w-0">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center text-[11px] font-semibold shrink-0",
                    trend.direction === "up" && "text-emerald-600",
                    trend.direction === "down" && "text-rose-600",
                    trend.direction === "neutral" && "text-[var(--color-erp-text-muted)]"
                  )}
                >
                  {trend.direction === "up" && <TrendingUp className="mr-0.5 h-3 w-3" />}
                  {trend.direction === "down" && <TrendingDown className="mr-0.5 h-3 w-3" />}
                  {trend.direction === "neutral" && <Minus className="mr-0.5 h-3 w-3" />}
                  {trend.value}
                </span>
              )}
              {sub && (
                <span className="text-[11px] text-[var(--color-erp-text-muted)] truncate">{sub}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn("flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl shrink-0 border border-slate-100", iconColor)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Card Grid ----

export function CardGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  }[columns];

  return (
    <div className={cn("grid gap-3 sm:gap-4 w-full min-w-0", colClass, className)}>
      {children}
    </div>
  );
}

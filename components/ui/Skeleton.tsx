"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// ---- Skeleton base ----

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width (e.g. "w-24", "w-full") */
  width?: string;
  /** Height (e.g. "h-4", "h-12") */
  height?: string;
  /** Shape variant */
  rounded?: "sm" | "md" | "lg" | "full";
}

export function Skeleton({ className, width, height, rounded = "md", ...props }: SkeletonProps) {
  const roundedClass = {
    sm: "rounded",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  }[rounded];

  return (
    <div
      aria-hidden="true"
      className={cn("skeleton-shimmer", roundedClass, width, height, className)}
      {...props}
    />
  );
}

// ---- Skeleton Text lines ----

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="h-4"
          width={i === lines - 1 ? "w-3/4" : "w-full"}
        />
      ))}
    </div>
  );
}

// ---- Skeleton Stat Card ----

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-[var(--color-erp-surface)] rounded-lg border border-[var(--color-erp-border)] shadow-[var(--shadow-card)] p-5",
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton height="h-3" width="w-20" />
          <Skeleton height="h-7" width="w-28" />
          <Skeleton height="h-3" width="w-16" />
        </div>
        <Skeleton height="h-10" width="w-10" rounded="lg" />
      </div>
    </div>
  );
}

// ---- Skeleton Table ----

export function SkeletonTable({
  rows = 5,
  cols = 5,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-[var(--color-erp-border)]", className)}
      aria-hidden="true"
      aria-label="Loading..."
    >
      {/* Header */}
      <div className="bg-[var(--color-erp-surface-2)] border-b border-[var(--color-erp-border)] px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} height="h-3" width="w-20" />
          ))}
        </div>
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 items-center px-4 py-3.5 border-b border-[var(--color-erp-border)] last:border-b-0 bg-[var(--color-erp-surface)]"
        >
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              height="h-4"
              width={j === 0 ? "w-32" : "w-20"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---- Page Loading overlay ----

export function PageLoading() {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 gap-4"
      aria-label="Loading page"
    >
      <svg
        className="h-8 w-8 animate-spin text-[var(--color-erp-primary)]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-sm text-[var(--color-erp-text-muted)]">Loading...</p>
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Buttons/actions displayed on the right */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 min-w-0 w-full", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold text-[var(--color-erp-text-primary)] tracking-tight truncate">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-xs sm:text-sm text-[var(--color-erp-text-muted)] leading-relaxed line-clamp-2 sm:line-clamp-none">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
}

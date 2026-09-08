"use client";

import * as React from "react";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ColumnDef, SortState, TableStatus } from "@/types/table";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Misc";

// ---- DataTable ----

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  status?: TableStatus;
  /** Used in empty-state message */
  entityName?: string;
  /** Row key getter */
  rowKey: (row: T) => string | number;
  /** Optional row action slot */
  onRowAction?: (row: T) => void;
  /** Sort state (controlled) */
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** Search */
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  /** Pagination */
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  /** Extra header actions (buttons, filters etc.) */
  headerActions?: React.ReactNode;
  className?: string;
  /** Error message when status is "error" */
  errorMessage?: string;
  onRetry?: () => void;
}

export function DataTable<T>({
  columns,
  data,
  status = "idle",
  entityName = "records",
  rowKey,
  onRowAction,
  sort,
  onSortChange,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  headerActions,
  className,
  errorMessage,
  onRetry,
}: DataTableProps<T>) {
  // ---- Sort handler ----
  function handleSort(key: string) {
    if (!onSortChange) return;
    if (sort?.key === key) {
      onSortChange({ key, direction: sort.direction === "asc" ? "desc" : "asc" });
    } else {
      onSortChange({ key, direction: "asc" });
    }
  }

  function SortIcon({ colKey }: { colKey: string }) {
    if (sort?.key !== colKey)
      return <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" aria-hidden="true" />;
    return sort.direction === "asc"
      ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
      : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* ---- Table Header Bar ---- */}
      {(onSearchChange || headerActions) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {onSearchChange && (
            <div className="relative w-full sm:w-72">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-erp-text-muted)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] placeholder:text-[var(--color-erp-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-erp-primary)] focus:border-[var(--color-erp-primary)] transition-colors"
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          {headerActions && (
            <div className="flex items-center gap-2 ml-auto">{headerActions}</div>
          )}
        </div>
      )}

      {/* ---- Table ---- */}
      {status === "loading" ? (
        <SkeletonTable rows={5} cols={columns.length} />
      ) : status === "error" ? (
        <div className="rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)]">
          <ErrorState description={errorMessage} onRetry={onRetry} />
        </div>
      ) : status === "empty" || (status === "idle" && data.length === 0) ? (
        <div className="rounded-lg border border-[var(--color-erp-border)] border-dashed bg-[var(--color-erp-surface)]">
          <EmptyState
            title={`No ${entityName} found`}
            description={`No ${entityName} match your current filters.`}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm" role="grid">
              <thead>
                <tr className="border-b border-[var(--color-erp-border)] bg-[var(--color-erp-surface-2)]">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={cn(
                        "px-4 py-3 font-semibold text-xs uppercase tracking-wide text-[var(--color-erp-text-muted)]",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.align !== "right" && col.align !== "center" && "text-left",
                        col.sortable && "cursor-pointer select-none hover:text-[var(--color-erp-text-primary)] transition-colors",
                        col.hideMobile && "hidden sm:table-cell",
                        col.width
                      )}
                      onClick={() => col.sortable && handleSort(col.key)}
                      aria-sort={
                        sort?.key === col.key
                          ? sort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {col.sortable && <SortIcon colKey={col.key} />}
                      </span>
                    </th>
                  ))}
                  {onRowAction && (
                    <th scope="col" className="w-10 px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-erp-border)]">
                {data.map((row, i) => (
                  <tr
                    key={rowKey(row)}
                    className="hover:bg-[var(--color-erp-surface-2)] transition-colors duration-100"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-[var(--color-erp-text-primary)]",
                          col.align === "right" && "text-right tabular-nums",
                          col.align === "center" && "text-center",
                          col.hideMobile && "hidden sm:table-cell"
                        )}
                      >
                        {col.render
                          ? col.render(row, i)
                          : String((row as Record<string, unknown>)[col.key] ?? "—")}
                      </td>
                    ))}
                    {onRowAction && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onRowAction(row)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-erp-text-muted)] hover:bg-[var(--color-erp-surface-2)] hover:text-[var(--color-erp-text-primary)] transition-colors"
                          aria-label="Row actions"
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---- Pagination ---- */}
          {onPageChange && total > pageSize && (
            <div className="border-t border-[var(--color-erp-border)] px-4 py-3">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

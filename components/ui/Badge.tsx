"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";
import type {
  OrderStatus,
  PurchaseStatus,
  PaymentStatus,
  InventoryStatus,
} from "@/types";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-erp-surface-2)] text-[var(--color-erp-text-secondary)] border-[var(--color-erp-border)]",
        primary:
          "bg-[var(--color-erp-primary-surface)] text-[var(--color-erp-primary)] border-blue-200",
        success:
          "bg-[var(--color-erp-success-surface)] text-[var(--color-erp-success)] border-green-200",
        warning:
          "bg-[var(--color-erp-warning-surface)] text-[var(--color-erp-warning)] border-amber-200",
        danger:
          "bg-[var(--color-erp-danger-surface)] text-[var(--color-erp-danger)] border-red-200",
        info:
          "bg-[var(--color-erp-info-surface)] text-[var(--color-erp-info)] border-sky-200",
        muted:
          "bg-[var(--color-erp-surface-2)] text-[var(--color-erp-text-muted)] border-[var(--color-erp-border)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

// ---- Semantic status badge helpers ----

const ORDER_STATUS_MAP: Record<
  OrderStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  inquiry:       { label: "Inquiry",       variant: "muted"   },
  quotation:     { label: "Quotation",     variant: "info"    },
  confirmed:     { label: "Confirmed",     variant: "primary" },
  production:    { label: "Production",    variant: "warning" },
  quality_check: { label: "Quality Check", variant: "warning" },
  packed:        { label: "Packed",        variant: "primary" },
  shipped:       { label: "Shipped",       variant: "info"    },
  completed:     { label: "Completed",     variant: "success" },
  cancelled:     { label: "Cancelled",     variant: "danger"  },
};

const PURCHASE_STATUS_MAP: Record<
  PurchaseStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  draft:              { label: "Draft",              variant: "muted"   },
  ordered:            { label: "Ordered",            variant: "info"    },
  received:           { label: "Received",           variant: "success" },
  partially_received: { label: "Partial",            variant: "warning" },
  cancelled:          { label: "Cancelled",          variant: "danger"  },
};

const PAYMENT_STATUS_MAP: Record<
  PaymentStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  unpaid:          { label: "Unpaid",         variant: "danger"  },
  partially_paid:  { label: "Partial",        variant: "warning" },
  paid:            { label: "Paid",           variant: "success" },
};

const INVENTORY_STATUS_MAP: Record<
  InventoryStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  in_stock:    { label: "In Stock",    variant: "success" },
  low_stock:   { label: "Low Stock",   variant: "warning" },
  out_of_stock:{ label: "Out of Stock",variant: "danger"  },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, variant } = ORDER_STATUS_MAP[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  const { label, variant } = PURCHASE_STATUS_MAP[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, variant } = PAYMENT_STATUS_MAP[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  const { label, variant } = INVENTORY_STATUS_MAP[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}

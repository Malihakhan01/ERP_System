// types/index.ts
// Barrel export for all shared types

export type * from "./user";
export type * from "./navigation";
export type * from "./table";

// ---- Shared domain value types (stubs — wired to DB in later phases) ----

export type StatusVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

// Order statuses
export type OrderStatus =
  | "inquiry"
  | "quotation"
  | "confirmed"
  | "production"
  | "quality_check"
  | "packed"
  | "shipped"
  | "completed"
  | "cancelled";

// Purchase statuses
export type PurchaseStatus =
  | "draft"
  | "ordered"
  | "received"
  | "partially_received"
  | "cancelled";

// Payment statuses
export type PaymentStatus = "unpaid" | "partially_paid" | "paid";

// Inventory statuses
export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

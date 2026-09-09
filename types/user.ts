// types/user.ts
// User and RBAC types — prepared for Database Auth integration

export type UserRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "production_manager"
  | "accountant"
  | "hr_manager"
  | "sales"
  | "warehouse"
  | "viewer";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
  profile: UserProfile | null;
}

/** Maps roles to human-readable labels */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  manager: "Manager",
  production_manager: "Production Manager",
  accountant: "Accountant",
  hr_manager: "HR Manager",
  sales: "Sales",
  warehouse: "Warehouse",
  viewer: "Viewer",
};

/** Permission modules — used for future RBAC checks */
export type PermissionModule =
  | "dashboard"
  | "portal"
  | "products"
  | "materials"
  | "purchases"
  | "inventory"
  | "production"
  | "clients"
  | "orders"
  | "tracking"
  | "qa"
  | "packing"
  | "dispatch"
  | "costing"
  | "quotations"
  | "invoices"
  | "employees"
  | "salaries"
  | "advances"
  | "ai"
  | "reports"
  | "settings";

export type PermissionAction = "view" | "create" | "edit" | "delete";

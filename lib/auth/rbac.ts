import { AuthUser } from "./auth-types";

export type AppModule =
  | "dashboard"
  | "products"
  | "materials"
  | "purchases"
  | "inventory"
  | "production"
  | "tracking"
  | "qa"
  | "packing"
  | "dispatch"
  | "costing"
  | "clients"
  | "orders"
  | "quotations"
  | "invoices"
  | "employees"
  | "salaries"
  | "advances"
  | "ai"
  | "reports"
  | "settings";

export interface RoleConfig {
  key: string;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  allowedModules: AppModule[];
  allowedRoutes: string[];
  kpiHighlight: "all" | "floor" | "finance" | "warehouse";
}

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  super_admin: {
    key: "super_admin",
    title: "Super Administrator (Director)",
    badge: "Full Access",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Complete unrestricted access to all ERP modules, financial ledgers, and system settings.",
    allowedModules: [
      "dashboard",
      "products",
      "materials",
      "purchases",
      "inventory",
      "production",
      "tracking",
      "qa",
      "packing",
      "dispatch",
      "costing",
      "clients",
      "orders",
      "quotations",
      "invoices",
      "employees",
      "salaries",
      "advances",
      "ai",
      "reports",
      "settings",
    ],
    allowedRoutes: ["*"],
    kpiHighlight: "all",
  },
  production_supervisor: {
    key: "production_supervisor",
    title: "Production Floor Supervisor",
    badge: "Manufacturing & QA",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Floor execution, 5-stage line throughput, AQL 2.5 QA audits, and worker headcount roster.",
    allowedModules: [
      "dashboard",
      "products",
      "materials",
      "production",
      "tracking",
      "qa",
      "packing",
      "dispatch",
      "orders",
      "employees",
      "reports",
    ],
    allowedRoutes: [
      "/dashboard",
      "/products",
      "/materials",
      "/production",
      "/tracking",
      "/qa",
      "/packing",
      "/dispatch",
      "/orders",
      "/employees",
      "/reports",
    ],
    kpiHighlight: "floor",
  },
  finance: {
    key: "finance",
    title: "Head of Accounts & Payroll",
    badge: "Financials & Payroll",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Accounts payable, client invoicing, BOM costing profit margins, salary runs, and staff advances.",
    allowedModules: [
      "dashboard",
      "purchases",
      "costing",
      "clients",
      "orders",
      "quotations",
      "invoices",
      "salaries",
      "advances",
      "employees",
      "reports",
    ],
    allowedRoutes: [
      "/dashboard",
      "/purchases",
      "/costing",
      "/clients",
      "/orders",
      "/quotations",
      "/invoices",
      "/salaries",
      "/advances",
      "/employees",
      "/reports",
    ],
    kpiHighlight: "finance",
  },
  factory_manager: {
    key: "factory_manager",
    title: "Warehouse & Inventory Lead",
    badge: "Inventory & Logistics",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-200",
    description: "Raw fabric bays 1-4, FIFO stock movements, material purchases receiving, and dispatch staging.",
    allowedModules: [
      "dashboard",
      "products",
      "materials",
      "inventory",
      "purchases",
      "packing",
      "dispatch",
      "tracking",
      "reports",
    ],
    allowedRoutes: [
      "/dashboard",
      "/products",
      "/materials",
      "/inventory",
      "/purchases",
      "/packing",
      "/dispatch",
      "/tracking",
      "/reports",
    ],
    kpiHighlight: "warehouse",
  },
  qa_inspector: {
    key: "qa_inspector",
    title: "QA & Inspection Auditor",
    badge: "Quality Assurance",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Floor inspection audits, defect categorization (AQL 2.5), inline QC checkpoints, and carton audits.",
    allowedModules: [
      "dashboard",
      "qa",
      "production",
      "tracking",
      "packing",
      "products",
      "reports",
    ],
    allowedRoutes: [
      "/dashboard",
      "/qa",
      "/production",
      "/tracking",
      "/packing",
      "/products",
      "/reports",
    ],
    kpiHighlight: "floor",
  },
  merchandiser: {
    key: "merchandiser",
    title: "Sales Merchandiser & Accounts",
    badge: "Merchandising & Sales",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description: "Buyer order tracking, quotations, client communication, commercial invoices, and garment costing.",
    allowedModules: [
      "dashboard",
      "orders",
      "clients",
      "quotations",
      "invoices",
      "costing",
      "products",
      "reports",
    ],
    allowedRoutes: [
      "/dashboard",
      "/orders",
      "/clients",
      "/quotations",
      "/invoices",
      "/costing",
      "/products",
      "/reports",
    ],
    kpiHighlight: "finance",
  },
  operator: {
    key: "operator",
    title: "Shopfloor Line Operator",
    badge: "Floor Operator",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    description: "Barcode scanning for bundle progression, sewing line operations, and master carton packing.",
    allowedModules: [
      "dashboard",
      "production",
      "tracking",
      "packing",
    ],
    allowedRoutes: [
      "/dashboard",
      "/production",
      "/tracking",
      "/packing",
    ],
    kpiHighlight: "floor",
  },
};

/**
 * Check if a role has access to a specific module
 */
export function hasModuleAccess(role: string, module: AppModule): boolean {
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.super_admin;
  if (config.allowedModules.includes(module)) return true;
  return false;
}

/**
 * Check if a role can access a specific route pathname
 */
export function hasRouteAccess(role: string, pathname: string): boolean {
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.super_admin;
  if (config.allowedRoutes.includes("*")) return true;
  return config.allowedRoutes.some((route) => {
    if (route === "/dashboard") return pathname === "/dashboard";
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export interface AuthUser {
  id: string | number;
  name: string;
  email: string;
  role: "super_admin" | "factory_manager" | "production_supervisor" | "qa_inspector" | "merchandiser" | "finance" | "operator";
  roleTitle: string;
  department: string;
  plant: string;
  initials: string;
  avatarColor?: string;
  lastLogin?: string;
  employeeId?: string | number;
  employeeNumber?: string;
  designation?: string;
  assignedLine?: string;
}

export const DEMO_USERS: Record<string, AuthUser & { password: string }> = {
  admin: {
    id: "USR-001",
    name: "Factory Admin",
    email: "admin@factoryos.internal",
    password: "factoryadmin2026",
    role: "super_admin",
    roleTitle: "Super Administrator (Director)",
    department: "Executive Management",
    plant: "Unit 1 - Small Industrial Estate, Sialkot",
    initials: "FA",
    avatarColor: "from-blue-600 to-indigo-600",
  },
  supervisor: {
    id: "USR-002",
    name: "maliha",
    email: "supervisor@factoryos.internal",
    password: "12345678",
    role: "production_supervisor",
    roleTitle: "Production Floor Supervisor",
    department: "Sewing & Finishing",
    plant: "Unit 1 - Small Industrial Estate, Sialkot",
    initials: "MK",
    avatarColor: "from-amber-600 to-orange-600",
  },
  finance: {
    id: "USR-003",
    name: "Ayesha Siddiqui",
    email: "finance@factoryos.internal",
    password: "finance2026",
    role: "finance",
    roleTitle: "Head of Accounts & Payroll",
    department: "Finance & Commercial",
    plant: "Sialkot Executive Suite - Paris Road",
    initials: "AS",
    avatarColor: "from-emerald-600 to-teal-600",
  },
  warehouse: {
    id: "USR-004",
    name: "Bilal Rasheed",
    email: "warehouse@factoryos.internal",
    password: "warehouse2026",
    role: "factory_manager",
    roleTitle: "Warehouse & Inventory Lead",
    department: "Fabric & Material Storage",
    plant: "Unit 2 - Daska Road Logistics Zone, Sialkot",
    initials: "BR",
    avatarColor: "from-sky-600 to-cyan-600",
  },
  employee: {
    id: 5,
    employeeId: 1,
    employeeNumber: "EMP-2026-001",
    name: "Muhammad Rizwan",
    email: "emp-2026-001@factoryos.internal",
    password: "emp12345",
    role: "operator",
    roleTitle: "Senior Flatlock Operator",
    department: "Stitching",
    plant: "Unit 1 - Small Industrial Estate, Sialkot",
    initials: "MR",
    avatarColor: "from-amber-500 to-rose-600",
    designation: "Senior Flatlock Operator",
    assignedLine: "Line 1 — Export Hoodies (Sialkot Unit)",
  },
};

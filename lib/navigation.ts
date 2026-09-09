"use client";

import {
  LayoutDashboard,
  UserCheck,
  Package,
  Layers,
  ShoppingCart,
  Warehouse,
  Factory,
  Users,
  ClipboardList,
  MapPin,
  Calculator,
  FileText,
  Receipt,
  UserCog,
  DollarSign,
  HandCoins,
  Sparkles,
  Wand2,
  BarChart3,
  Settings,
  ShieldCheck,
  Box,
  Truck,
} from "lucide-react";
import type { NavItem, NavGroup } from "@/types/navigation";

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
      { label: "Worker Portal", href: "/portal", icon: UserCheck, module: "portal" },
    ],
  },
  {
    label: "Catalog & Materials",
    items: [
      { label: "Products", href: "/products", icon: Package, module: "products" },
      { label: "Materials", href: "/materials", icon: Layers, module: "materials" },
      { label: "Purchases", href: "/purchases", icon: ShoppingCart, module: "purchases" },
      { label: "Inventory", href: "/inventory", icon: Warehouse, module: "inventory" },
    ],
  },
  {
    label: "Manufacturing",
    items: [
      { label: "Production", href: "/production", icon: Factory, module: "production" },
      { label: "Tracking", href: "/tracking", icon: MapPin, module: "tracking" },
      { label: "QA & Inspection", href: "/qa", icon: ShieldCheck, module: "qa" },
      { label: "Packing & Cartons", href: "/packing", icon: Box, module: "packing" },
      { label: "Dispatch & Shipping", href: "/dispatch", icon: Truck, module: "dispatch" },
      { label: "Cost Estimation", href: "/costing", icon: Calculator, module: "costing" },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Clients", href: "/clients", icon: Users, module: "clients" },
      { label: "Orders", href: "/orders", icon: ClipboardList, module: "orders" },
      { label: "Quotations", href: "/quotations", icon: FileText, module: "quotations" },
      { label: "Invoices", href: "/invoices", icon: Receipt, module: "invoices" },
    ],
  },
  {
    label: "People & Payments",
    items: [
      { label: "Employees", href: "/employees", icon: UserCog, module: "employees" },
      { label: "Salaries", href: "/salaries", icon: DollarSign, module: "salaries" },
      { label: "Advances", href: "/advances", icon: HandCoins, module: "advances" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "AI Center", href: "/ai", icon: Sparkles, module: "ai", badge: "AI" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3, module: "reports" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, module: "settings" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

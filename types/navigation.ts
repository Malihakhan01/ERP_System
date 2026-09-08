// types/navigation.ts
// Navigation item types for the sidebar

import type { LucideIcon } from "lucide-react";
import type { PermissionModule } from "./user";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module: PermissionModule;
  /** Badge text (e.g. "New", count) — optional */
  badge?: string | number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

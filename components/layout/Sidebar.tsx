"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Shield,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_GROUPS } from "@/lib/navigation";
import { getClientAuthUser } from "@/lib/auth/auth-client";
import { AuthUser, DEMO_USERS } from "@/lib/auth/auth-types";
import { hasRouteAccess, ROLE_CONFIGS } from "@/lib/auth/rbac";

// ---- Sidebar context ----

interface SidebarContextValue {
  collapsed: boolean;
  mobileOpen: boolean;
  setCollapsed: (v: boolean) => void;
  setMobileOpen: (v: boolean) => void;
}

export const SidebarContext = React.createContext<SidebarContextValue>({
  collapsed: false,
  mobileOpen: false,
  setCollapsed: () => {},
  setMobileOpen: () => {},
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

// ---- Sidebar Component ----

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, mobileOpen, setCollapsed, setMobileOpen } = useSidebar();
  const [user, setUser] = React.useState<AuthUser>(DEMO_USERS.admin);

  React.useEffect(() => {
    setUser(getClientAuthUser());
    const handleAuthChange = () => setUser(getClientAuthUser());
    window.addEventListener("factoryos_auth_change", handleAuthChange);
    return () => window.removeEventListener("factoryos_auth_change", handleAuthChange);
  }, []);

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Keyboard Escape closes mobile drawer
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [setMobileOpen]);

  const roleKey = user.role || "super_admin";
  const currentRoleConfig = ROLE_CONFIGS[roleKey] || ROLE_CONFIGS.super_admin;

  // Filter groups and items based on role permissions
  const filteredNavGroups = React.useMemo(() => {
    return NAV_GROUPS.map((group) => {
      const allowedItems = group.items.filter((item) =>
        hasRouteAccess(roleKey, item.href)
      );
      return {
        ...group,
        items: allowedItems,
      };
    }).filter((group) => group.items.length > 0);
  }, [roleKey]);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0b1120] text-slate-200 overflow-hidden border-r border-slate-800/80 select-none shadow-xl">
      {/* ---- Brand Header ---- */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-slate-800/80 px-4 h-[64px] shrink-0 bg-slate-900/40 backdrop-blur-sm",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 shadow-md shadow-blue-500/20 border border-blue-400/30">
          <Layers className="h-5 w-5 text-white" aria-hidden="true" />
          <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#0b1120]" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-white">FactoryOS</span>
              <span className="rounded-md bg-blue-500/20 border border-blue-400/30 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                ERP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate font-medium mt-0.5">
              Garment Manufacturing
            </p>
          </div>
        )}
      </div>

      {/* ---- Grouped Navigation Items (RBAC Filtered) ---- */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-5 custom-scrollbar" aria-label="Main navigation">
        {filteredNavGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed ? (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/90">
                {group.label}
              </p>
            ) : (
              <div className="my-2 mx-auto h-px w-6 bg-slate-800" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-150",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
                        collapsed && "justify-center px-0 py-2.5",
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-900/30 font-bold"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      )}
                      aria-current={isActive ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-blue-400"
                        )}
                        aria-hidden="true"
                      />
                      {!collapsed && (
                        <span className="truncate flex-1 tracking-tight">{item.label}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                          <Sparkles className="h-2.5 w-2.5" />
                          {item.badge}
                        </span>
                      )}
                      {/* Active indicator dot for collapsed mode */}
                      {collapsed && isActive && (
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-400 shadow-sm" aria-hidden="true" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ---- User Role Info Scope Card ---- */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50 shrink-0">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs shadow-inner">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-blue-400" />
                Role Scope
              </span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded-full text-[9px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
            <p className="font-bold text-white text-xs mt-1 truncate">
              {user.roleTitle || currentRoleConfig.title}
            </p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
              <Radio className="h-2.5 w-2.5 text-blue-400 shrink-0" />
              <span className="truncate">{user.plant || "Unit 1 - Korangi Garment Hub"}</span>
            </p>
          </div>
        </div>
      )}

      {/* ---- Collapse Toggle (desktop only) ---- */}
      <div className="hidden lg:flex shrink-0 border-t border-slate-800/80 px-3 py-2.5 items-center justify-between bg-slate-950/60">
        {!collapsed && (
          <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Factory Online</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border border-transparent hover:border-slate-700",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ---- Desktop Sidebar ---- */}
      <aside
        className={cn(
          "hidden lg:flex flex-col sticky top-0 left-0 h-screen z-30 shrink-0 transition-all duration-200 ease-in-out",
          collapsed ? "w-18" : "w-64"
        )}
        aria-label="Sidebar"
      >
        {sidebarContent}
      </aside>

      {/* ---- Mobile Drawer ---- */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <aside
            className="fixed top-0 left-0 h-screen w-72 z-50 lg:hidden shadow-2xl"
            aria-label="Mobile navigation"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3.5 right-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

// ---- Hamburger button (for TopNav) ----

export function SidebarMobileToggle() {
  const { setMobileOpen } = useSidebar();
  return (
    <button
      type="button"
      className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
      onClick={() => setMobileOpen(true)}
      aria-label="Open navigation menu"
    >
      <Menu className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

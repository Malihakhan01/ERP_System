"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Search,
  AlertTriangle,
  Factory,
  DollarSign,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  X,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SidebarMobileToggle } from "./Sidebar";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Misc";
import { getClientAuthUser, setClientAuthUser, clearClientAuthUser } from "@/lib/auth/auth-client";
import { AuthUser, DEMO_USERS } from "@/lib/auth/auth-types";
import { useToast } from "@/components/ui/Toast";

export interface TopNavProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function TopNav({ title, breadcrumbs }: TopNavProps) {
  const router = useRouter();
  const { info, success, error: toastError } = useToast();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [user, setUser] = React.useState<AuthUser>(DEMO_USERS.admin);
  const profileRef = React.useRef<HTMLDivElement>(null);
  const notifRef = React.useRef<HTMLDivElement>(null);

  // Secure Role Switch State
  const [mounted, setMounted] = React.useState(false);
  const [switchModalOpen, setSwitchModalOpen] = React.useState(false);
  const [targetRole, setTargetRole] = React.useState<AuthUser | null>(null);
  const [switchPassword, setSwitchPassword] = React.useState("");
  const [showSwitchPassword, setShowSwitchPassword] = React.useState(false);
  const [switchLoading, setSwitchLoading] = React.useState(false);
  const [switchError, setSwitchError] = React.useState<string | null>(null);
  const [dbUsersList, setDbUsersList] = React.useState<AuthUser[]>([]);

  const loadUsers = React.useCallback(() => {
    fetch("/api/auth/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.users)) {
          setDbUsersList(data.users);
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    setMounted(true);
    setUser(getClientAuthUser());
    loadUsers();

    const handleAuthChange = () => {
      setUser(getClientAuthUser());
      loadUsers();
    };
    window.addEventListener("factoryos_auth_change", handleAuthChange);
    return () => window.removeEventListener("factoryos_auth_change", handleAuthChange);
  }, [loadUsers]);

  const handleOpenSwitchModal = (roleKey: string) => {
    // Look up dynamic user from MySQL first, then fallback to demo static config
    const target =
      dbUsersList.find((u) => {
        if (roleKey === "admin") return u.role === "super_admin";
        if (roleKey === "supervisor") return u.role === "production_supervisor";
        if (roleKey === "finance") return u.role === "finance";
        if (roleKey === "warehouse") return u.role === "factory_manager";
        return false;
      }) || DEMO_USERS[roleKey];

    if (!target) return;
    if (target.email === user.email) {
      info("Already Active", { description: `You are already logged in as ${target.name}.` });
      setProfileOpen(false);
      return;
    }
    setTargetRole(target);
    setSwitchPassword("");
    setSwitchError(null);
    setShowSwitchPassword(false);
    setProfileOpen(false);
    setSwitchModalOpen(true);
  };

  const handleVerifyAndSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole) return;
    setSwitchLoading(true);
    setSwitchError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetRole.email,
          password: switchPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        setClientAuthUser(data.user as AuthUser);
        success(`Identity Verified: Switched to ${data.user.roleTitle}`, {
          description: `Logged in as ${data.user.name}`,
        });
        setSwitchModalOpen(false);
        router.refresh();
      } else {
        setSwitchError(data.message || "Invalid password. Access denied.");
        toastError("Authentication Failed", {
          description: "Incorrect password for this operator account.",
        });
      }
    } catch (err: any) {
      setSwitchError(err.message || "Authentication error.");
    } finally {
      setSwitchLoading(false);
    }
  };

  const handleSignOut = async () => {
    setProfileOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearClientAuthUser();
    info("Signed Out", { description: "Session ended. Returning to login gateway." });
    router.push("/login");
    router.refresh();
  };

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <header
      className="sticky top-0 z-20 h-[60px] w-full min-w-0 flex items-center justify-between border-b border-[var(--color-erp-border)] bg-[var(--color-erp-surface)]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 gap-3 shadow-xs shrink-0"
    >
      {/* Left: Mobile hamburger & Breadcrumbs / Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SidebarMobileToggle />

        <div className="min-w-0 flex-1">
          {breadcrumbs && breadcrumbs.length > 1 ? (
            <Breadcrumb items={breadcrumbs} />
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-[var(--color-erp-text-primary)] truncate">
                {title}
              </h1>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Global Quick Search Input (desktop/tablet) */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <div
          className={cn(
            "relative w-full flex items-center rounded-lg border bg-[var(--color-erp-surface-2)] px-3 py-1.5 transition-all duration-150",
            searchFocused
              ? "border-[var(--color-erp-primary)] bg-white ring-2 ring-[var(--color-erp-primary)]/15"
              : "border-[var(--color-erp-border)] hover:border-[var(--color-erp-border-strong)]"
          )}
        >
          <Search className="h-4 w-4 text-[var(--color-erp-text-muted)] shrink-0 mr-2" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search orders, materials, products, batches..."
            className="w-full bg-transparent text-xs text-[var(--color-erp-text-primary)] placeholder:text-[var(--color-erp-text-muted)] focus:outline-none"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            aria-label="Global search across ERP"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-[var(--color-erp-border-strong)] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-erp-text-muted)] shrink-0">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* ---- Notifications Popover ---- */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((p) => !p);
              setProfileOpen(false);
            }}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--color-erp-text-secondary)] transition-all",
              notifOpen
                ? "border-[var(--color-erp-primary)] bg-[var(--color-erp-primary-surface)] text-[var(--color-erp-primary)]"
                : "border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] hover:bg-[var(--color-erp-surface-2)] hover:text-[var(--color-erp-text-primary)]"
            )}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            aria-haspopup="true"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 w-84 sm:w-96 rounded-xl border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] shadow-[var(--shadow-modal)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-erp-border)] bg-[var(--color-erp-surface-2)]/60">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-[var(--color-erp-text-primary)] uppercase tracking-wider">
                    Factory Alerts & Activity
                  </p>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    Live Feed
                  </span>
                </div>
              </div>

              <div className="divide-y divide-[var(--color-erp-border)] max-h-80 overflow-y-auto">
                <div className="flex items-start gap-3 p-3 hover:bg-[var(--color-erp-surface-2)] transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-[var(--color-erp-text-primary)]">Low Stock Threshold Monitor</p>
                    <p className="text-[var(--color-erp-text-secondary)] mt-0.5">Automated material shortage warnings will feed here in real-time.</p>
                    <span className="text-[10px] text-[var(--color-erp-text-muted)] mt-1 block">Active Telemetry</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 hover:bg-[var(--color-erp-surface-2)] transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Factory className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-[var(--color-erp-text-primary)]">Production Stage Gate Notifications</p>
                    <p className="text-[var(--color-erp-text-secondary)] mt-0.5">Lot progression from Cutting → QC → Packing will alert floor supervisors.</p>
                    <span className="text-[10px] text-[var(--color-erp-text-muted)] mt-1 block">Line 1 & 2 Ready</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 hover:bg-[var(--color-erp-surface-2)] transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-[var(--color-erp-text-primary)]">Invoice & Payment Milestone Ledger</p>
                    <p className="text-[var(--color-erp-text-secondary)] mt-0.5">Buyer payment reconciliations and advance deductions logged here.</p>
                    <span className="text-[10px] text-[var(--color-erp-text-muted)] mt-1 block">Accounts Department</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 border-t border-[var(--color-erp-border)] bg-[var(--color-erp-surface-2)]/40 text-center">
                <Link
                  href="/settings"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-semibold text-[var(--color-erp-primary)] hover:underline inline-flex items-center gap-1"
                >
                  Configure Notification Triggers
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ---- User Profile Menu ---- */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((p) => !p);
              setNotifOpen(false);
            }}
            className={cn(
              "flex items-center gap-2 h-9 rounded-lg border px-2.5 text-sm transition-all",
              profileOpen
                ? "border-[var(--color-erp-primary)] bg-[var(--color-erp-surface-2)]"
                : "border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] hover:bg-[var(--color-erp-surface-2)]"
            )}
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="User account menu"
          >
            <div className="h-6 w-6 rounded-md bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
              <span className="text-[11px] font-bold text-white tracking-wider">
                {user.initials || "FA"}
              </span>
            </div>
            <div className="hidden lg:block text-left min-w-0">
              <p className="text-xs font-semibold text-[var(--color-erp-text-primary)] truncate max-w-[120px]">
                {user.name}
              </p>
            </div>
            <ChevronDown
              className={cn("h-3.5 w-3.5 text-[var(--color-erp-text-muted)] transition-transform duration-150", profileOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 top-11 w-64 rounded-xl border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] shadow-[var(--shadow-modal)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
              role="menu"
            >
              <div className="p-3.5 border-b border-[var(--color-erp-border)] bg-[var(--color-erp-surface-2)]/60">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-blue-700 flex items-center justify-center shrink-0 shadow-xs">
                    <span className="text-xs font-bold text-white">{user.initials || "FA"}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--color-erp-text-primary)] truncate">{user.name}</p>
                    <p className="text-[11px] text-[var(--color-erp-text-muted)] truncate">{user.email}</p>
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.2 mt-1 text-[10px] font-semibold text-emerald-800 truncate max-w-full">
                      <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{user.roleTitle || "Authorized Operator"}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/profile"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[var(--color-erp-text-secondary)] hover:bg-[var(--color-erp-surface-2)] hover:text-[var(--color-erp-text-primary)] transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-[var(--color-erp-text-muted)]" aria-hidden="true" />
                  Operator Profile & Access
                </Link>
                <Link
                  href="/settings"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[var(--color-erp-text-secondary)] hover:bg-[var(--color-erp-surface-2)] hover:text-[var(--color-erp-text-primary)] transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-[var(--color-erp-text-muted)]" aria-hidden="true" />
                  Factory & System Configuration
                </Link>
              </div>

              {/* Secure Role Switcher Trigger (4 Roles) */}
              <div className="p-2.5 border-t border-[var(--color-erp-border)] bg-[var(--color-erp-surface-2)]/40 space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-bold text-[var(--color-erp-text-muted)] uppercase tracking-wider flex items-center gap-1">
                    <Lock className="h-3 w-3 text-slate-400" />
                    Switch Profile (Secure)
                  </p>
                  <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded font-semibold">Password Required</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: "admin", label: "Super Admin", role: "super_admin" },
                    { key: "supervisor", label: "Supervisor", role: "production_supervisor" },
                    { key: "finance", label: "Finance", role: "finance" },
                    { key: "warehouse", label: "Warehouse", role: "factory_manager" },
                  ].map((d) => {
                    const isCurrent = user.role === d.role;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => handleOpenSwitchModal(d.key)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-left transition-all cursor-pointer flex items-center justify-between gap-1",
                          isCurrent
                            ? "bg-blue-600 text-white shadow-xs font-bold"
                            : "bg-white border border-[var(--color-erp-border)] text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                        )}
                      >
                        <span className="truncate">{d.label}</span>
                        {!isCurrent && <Lock className="h-2.5 w-2.5 text-slate-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[var(--color-erp-border)] p-1.5 bg-[var(--color-erp-surface-2)]/30">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          SECURE ROLE SWITCH PASSWORD VERIFICATION MODAL (PORTAL)
          ============================================================ */}
      {mounted && switchModalOpen && targetRole && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto min-h-screen animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150 text-left my-auto">
            <button
              type="button"
              onClick={() => setSwitchModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Security Verification Required</h4>
                <p className="text-xs text-slate-500">Switching Operator Role & Access Scope</p>
              </div>
            </div>

            {/* Target Role Summary Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Target Profile:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                  {targetRole.roleTitle}
                </span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{targetRole.name}</p>
              <p className="text-xs text-slate-500 font-mono">{targetRole.email}</p>
              <p className="text-[11px] text-slate-400">{targetRole.plant}</p>
            </div>

            {/* Error Banner */}
            {switchError && (
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2 mb-4 animate-shake">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed flex-1">{switchError}</p>
              </div>
            )}

            {/* Verification Form */}
            <form onSubmit={handleVerifyAndSwitch} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                    Enter Password for {targetRole.name}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showSwitchPassword ? "text" : "password"}
                    required
                    autoFocus
                    value={switchPassword}
                    onChange={(e) => setSwitchPassword(e.target.value)}
                    placeholder="Enter security password"
                    className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    {showSwitchPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSwitchModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={switchLoading || !switchPassword}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                >
                  {switchLoading ? "Verifying..." : "Authenticate & Switch"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}

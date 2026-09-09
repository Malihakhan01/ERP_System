"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Search,
  CheckCircle2,
  MessageSquare,
  Wrench,
  HandCoins,
  ClipboardList,
  Package,
  DollarSign,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SidebarMobileToggle } from "./Sidebar";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Misc";
import { getClientAuthUser, clearClientAuthUser } from "@/lib/auth/auth-client";
import { AuthUser, DEMO_USERS } from "@/lib/auth/auth-types";
import { useToast } from "@/components/ui/Toast";
import { fetchUnreadChatCount } from "@/lib/services/chat-service";

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
  const [chatUnreadCount, setChatUnreadCount] = React.useState(0);
  const profileRef = React.useRef<HTMLDivElement>(null);
  const notifRef = React.useRef<HTMLDivElement>(null);

  // Live Notification State
  const [notifications, setNotifications] = React.useState<Array<{
    id: string;
    type: "sos" | "advance" | "task" | "inventory" | "chat" | "order";
    title: string;
    message: string;
    tag: string;
    timeAgo: string;
    timestamp: string;
    link: string;
    severity: "danger" | "warning" | "info" | "success";
  }>>([]);
  const [notifUnreadCount, setNotifUnreadCount] = React.useState(0);
  const [loadingNotifs, setLoadingNotifs] = React.useState(false);

  const userRef = React.useRef(user);
  React.useEffect(() => { userRef.current = user; }, [user]);

  const loadNotifications = React.useCallback(() => {
    setLoadingNotifs(true);
    const role = userRef.current?.role || "operator";
    fetch(`/api/notifications?role=${encodeURIComponent(role)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setNotifications(data.data);
          setNotifUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingNotifs(false));
  }, []);


  const loadData = React.useCallback(() => {
    fetchUnreadChatCount().then((count) => setChatUnreadCount(count));
    loadNotifications();
  }, [loadNotifications]);

  React.useEffect(() => {
    setUser(getClientAuthUser());
    loadData();

    const handleAuthChange = () => {
      setUser(getClientAuthUser());
      loadData();
    };
    window.addEventListener("factoryos_auth_change", handleAuthChange);

    // Poll unread chat messages & notifications every 10s
    const pollInterval = setInterval(() => {
      fetchUnreadChatCount().then((count) => setChatUnreadCount(count));
      loadNotifications();
    }, 10000);

    return () => {
      window.removeEventListener("factoryos_auth_change", handleAuthChange);
      clearInterval(pollInterval);
    };
  }, [loadData, loadNotifications]);

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

      {/* Right: Notifications, Chat & Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* ---- Live Chat Button ---- */}
        <Link
          href="/chat"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-secondary)] hover:bg-[var(--color-erp-surface-2)] hover:text-blue-600 transition-all cursor-pointer"
          title="Live Team Chat & Floor Messaging"
          aria-label="Live Team Chat"
        >
          <MessageSquare className="h-4 w-4" />
          {chatUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
              {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
            </span>
          )}
        </Link>

        {/* ---- Notifications Popover ---- */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((p) => !p);
              setProfileOpen(false);
              if (!notifOpen) {
                loadNotifications();
              }
            }}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--color-erp-text-secondary)] transition-all cursor-pointer",
              notifOpen
                ? "border-[var(--color-erp-primary)] bg-[var(--color-erp-primary-surface)] text-[var(--color-erp-primary)]"
                : "border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] hover:bg-[var(--color-erp-surface-2)] hover:text-[var(--color-erp-text-primary)]"
            )}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            aria-haspopup="true"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {notifUnreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white ring-2 ring-white shadow-xs animate-pulse">
                {notifUnreadCount > 9 ? "9+" : notifUnreadCount}
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 w-84 sm:w-96 rounded-xl border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] shadow-[var(--shadow-modal)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 text-left">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-erp-border)] bg-[var(--color-erp-surface-2)]/60">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-[var(--color-erp-text-primary)] uppercase tracking-wider">
                    Factory Alerts & Activity
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Feed
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadNotifications();
                  }}
                  title="Refresh notifications"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loadingNotifs && "animate-spin text-blue-600")} />
                </button>
              </div>

              <div className="divide-y divide-[var(--color-erp-border)] max-h-88 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    {loadingNotifs ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Fetching live factory feed...</span>
                      </div>
                    ) : (
                      <div>
                        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                        <p className="font-semibold text-slate-700">All systems normal</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">No critical alarms or pending approvals found.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  notifications.map((n) => {
                    const getIconAndStyle = () => {
                      switch (n.type) {
                        case "sos":
                          return {
                            icon: <Wrench className="h-4 w-4" />,
                            bg: "bg-red-50 text-red-600 border border-red-200 ring-1 ring-red-100",
                            badge: "bg-red-100 text-red-700 font-bold",
                          };
                        case "advance":
                          return {
                            icon: <HandCoins className="h-4 w-4" />,
                            bg: "bg-amber-50 text-amber-600 border border-amber-200",
                            badge: "bg-amber-100 text-amber-800 font-semibold",
                          };
                        case "task":
                          return {
                            icon: <ClipboardList className="h-4 w-4" />,
                            bg: "bg-blue-50 text-blue-600 border border-blue-200",
                            badge: "bg-blue-100 text-blue-800 font-semibold",
                          };
                        case "inventory":
                          return {
                            icon: <Package className="h-4 w-4" />,
                            bg: "bg-orange-50 text-orange-600 border border-orange-200",
                            badge: "bg-orange-100 text-orange-800 font-semibold",
                          };
                        case "order":
                          return {
                            icon: <DollarSign className="h-4 w-4" />,
                            bg: "bg-emerald-50 text-emerald-600 border border-emerald-200",
                            badge: "bg-emerald-100 text-emerald-800 font-semibold",
                          };
                        default:
                          return {
                            icon: <AlertCircle className="h-4 w-4" />,
                            bg: "bg-slate-50 text-slate-600 border border-slate-200",
                            badge: "bg-slate-100 text-slate-700 font-semibold",
                          };
                      }
                    };

                    const style = getIconAndStyle();

                    return (
                      <Link
                        key={n.id}
                        href={n.link}
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 p-3 hover:bg-[var(--color-erp-surface-2)] transition-colors group cursor-pointer block text-left"
                      >
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5", style.bg)}>
                          {style.icon}
                        </div>
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-[var(--color-erp-text-primary)] group-hover:text-blue-600 transition-colors truncate">
                              {n.title}
                            </p>
                            <span className="text-[10px] text-[var(--color-erp-text-muted)] shrink-0 font-mono">
                              {n.timeAgo}
                            </span>
                          </div>
                          <p className="text-[var(--color-erp-text-secondary)] mt-0.5 line-clamp-2 leading-relaxed text-[11.5px]">
                            {n.message}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className={cn("text-[9.5px] px-1.5 py-0.5 rounded", style.badge)}>
                              {n.tag}
                            </span>
                            <span className="text-[10.5px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                              View <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>

              <div className="p-2.5 border-t border-[var(--color-erp-border)] bg-[var(--color-erp-surface-2)]/40 flex items-center justify-between">
                <Link
                  href="/chat"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-semibold text-slate-600 hover:text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <MessageSquare className="h-3 w-3" />
                  Floor Comms
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-semibold text-[var(--color-erp-primary)] hover:underline inline-flex items-center gap-1"
                >
                  Configure Triggers
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
                {user?.role === 'super_admin' && (
                  <Link
                    href="/settings"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[var(--color-erp-text-secondary)] hover:bg-[var(--color-erp-surface-2)] hover:text-[var(--color-erp-text-primary)] transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-[var(--color-erp-text-muted)]" aria-hidden="true" />
                    Factory & System Configuration
                  </Link>
                )}
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
    </header>
  );
}

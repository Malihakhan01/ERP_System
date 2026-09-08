"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getClientAuthUser } from "@/lib/auth/auth-client";
import { AuthUser, DEMO_USERS } from "@/lib/auth/auth-types";
import { ROLE_CONFIGS } from "@/lib/auth/rbac";

export interface RoleActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  requiredRoles: string[];
  fallbackTooltip?: string;
  showLockIcon?: boolean;
  children: React.ReactNode;
}

/**
 * RoleActionButton gates sensitive actions (e.g., "Approve Salary", "Issue Material",
 * "Delete Client", "Confirm Order", "Override QA Defect").
 * If the active user lacks required role permissions, it renders in a disabled state
 * with an explanatory tooltip and lock indicator.
 */
export function RoleActionButton({
  requiredRoles,
  fallbackTooltip,
  showLockIcon = true,
  className,
  disabled,
  children,
  onClick,
  ...props
}: RoleActionButtonProps) {
  const [user, setUser] = React.useState<AuthUser>(DEMO_USERS.admin);

  React.useEffect(() => {
    setUser(getClientAuthUser());
    const handleAuthChange = () => setUser(getClientAuthUser());
    window.addEventListener("factoryos_auth_change", handleAuthChange);
    return () => window.removeEventListener("factoryos_auth_change", handleAuthChange);
  }, []);

  const roleKey = user.role || "super_admin";
  const isSuperAdmin = roleKey === "super_admin";
  const isAuthorized = isSuperAdmin || requiredRoles.includes(roleKey);

  const formattedRequiredRoles = requiredRoles
    .map((r) => ROLE_CONFIGS[r]?.title || r.replace("_", " "))
    .join(" or ");

  const tooltipText =
    fallbackTooltip ||
    `Requires ${formattedRequiredRoles} permission. (Current: ${ROLE_CONFIGS[roleKey]?.title || roleKey})`;

  if (!isAuthorized) {
    return (
      <div className="relative inline-flex group">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title={tooltipText}
          className={cn(
            "opacity-60 cursor-not-allowed select-none inline-flex items-center justify-center gap-1.5 grayscale-[30%]",
            className
          )}
          {...props}
        >
          {showLockIcon && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />}
          {children}
        </button>

        {/* Hover Tooltip */}
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 text-white text-[11px] font-medium rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg border border-slate-700 flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-amber-400" />
            <span>{tooltipText}</span>
          </div>
          <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700" />
        </div>
      </div>
    );
  }

  return (
    <button
      type={props.type || "button"}
      disabled={disabled}
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Conditional Role Gate wrapper component
 */
export function RoleGate({
  requiredRoles,
  children,
  fallback = null,
}: {
  requiredRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [user, setUser] = React.useState<AuthUser>(DEMO_USERS.admin);

  React.useEffect(() => {
    setUser(getClientAuthUser());
    const handleAuthChange = () => setUser(getClientAuthUser());
    window.addEventListener("factoryos_auth_change", handleAuthChange);
    return () => window.removeEventListener("factoryos_auth_change", handleAuthChange);
  }, []);

  const roleKey = user.role || "super_admin";
  const isSuperAdmin = roleKey === "super_admin";
  const isAuthorized = isSuperAdmin || requiredRoles.includes(roleKey);

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

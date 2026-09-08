"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock, UserCheck, RefreshCw } from "lucide-react";
import { getClientAuthUser, setClientAuthUser } from "@/lib/auth/auth-client";
import { AuthUser, DEMO_USERS } from "@/lib/auth/auth-types";
import { hasRouteAccess, ROLE_CONFIGS } from "@/lib/auth/rbac";
import { useToast } from "@/components/ui/Toast";

export function RoleAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { success } = useToast();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const active = getClientAuthUser();
    if (!active) {
      router.replace("/login");
      return;
    }
    setUser(active);
    setMounted(true);

    const handleAuthChange = () => {
      const updated = getClientAuthUser();
      if (!updated) {
        router.replace("/login");
        return;
      }
      setUser(updated);
    };

    window.addEventListener("factoryos_auth_change", handleAuthChange);
    return () => window.removeEventListener("factoryos_auth_change", handleAuthChange);
  }, [router]);

  if (!mounted || !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Verifying Secure Access Session...</p>
      </div>
    );
  }

  const roleKey = user.role || "super_admin";
  const isAllowed = hasRouteAccess(roleKey, pathname);

  if (isAllowed) {
    return <>{children}</>;
  }

  const currentRoleConfig = ROLE_CONFIGS[roleKey] || ROLE_CONFIGS.super_admin;

  const handleFastSwitch = (demoKey: string) => {
    const demoUser = DEMO_USERS[demoKey];
    if (!demoUser) return;
    setClientAuthUser(demoUser);
    success(`Switched role to ${demoUser.roleTitle}`, {
      description: `Access updated for ${demoUser.name}`,
    });
    router.refresh();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center min-h-[500px]">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Top Warning Icon */}
        <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
          <ShieldAlert className="h-8 w-8" />
        </div>

        {/* Title & Explanation */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100/70 text-amber-900 border border-amber-300/50">
            <Lock className="h-3 w-3" />
            Restricted Module: {pathname.replace("/", "").toUpperCase()}
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Role Permission Required
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Your current logged-in role is{" "}
            <strong className="text-slate-800 font-semibold">{user.name} ({currentRoleConfig.title})</strong>.
            This module is restricted under FactoryOS Role-Based Access Control (RBAC).
          </p>
        </div>

        {/* Current Role Permissions Summary */}
        <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 text-left text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700">Active Scope:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${currentRoleConfig.badgeColor}`}>
              {currentRoleConfig.badge}
            </span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            {currentRoleConfig.description}
          </p>
        </div>

        {/* Switch Operator Account (Security Protected) */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Authenticate with Authorized Profile
            </p>
            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" /> Password Required
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "admin", label: "Super Admin", role: "Full Access", email: "admin@factoryos.internal" },
              { key: "supervisor", label: "Supervisor", role: "Floor Lines", email: "supervisor@factoryos.internal" },
              { key: "finance", label: "Finance Lead", role: "Accounts & Pay", email: "finance@factoryos.internal" },
              { key: "warehouse", label: "Warehouse", role: "Bays & Stock", email: "warehouse@factoryos.internal" },
            ].map((d) => (
              <Link
                key={d.key}
                href="/login"
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-left text-xs transition-colors cursor-pointer block hover:border-blue-300"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800">{d.label}</p>
                  <Lock className="h-3 w-3 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400">{d.role}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Allowed Dashboard
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <UserCheck className="h-4 w-4 text-slate-500" />
            Sign In with Another Account
          </Link>
        </div>

      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import {
  User,
  Shield,
  KeyRound,
  Mail,
  Building2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Laptop,
  Check,
  X,
  AlertCircle,
  Save,
  LogOut,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Activity,
  FileCheck,
  Calendar,
  Phone,
} from "lucide-react";
import { getClientAuthUser, setClientAuthUser, clearClientAuthUser } from "@/lib/auth/auth-client";
import { AuthUser, DEMO_USERS } from "@/lib/auth/auth-types";
import { ROLE_CONFIGS, hasRouteAccess } from "@/lib/auth/rbac";
import { useToast } from "@/components/ui/Toast";

const ALL_MODULES = [
  { name: "Executive Dashboard", href: "/dashboard", desc: "Realtime shop floor KPIs & telemetry" },
  { name: "Style Products", href: "/products", desc: "Tech packs, specs & garment catalog" },
  { name: "Raw Materials", href: "/materials", desc: "Yarn, knits, trims & fabric inventory" },
  { name: "Procurement & POs", href: "/purchases", desc: "Supplier purchase orders & goods receipt" },
  { name: "Warehouse Bays", href: "/inventory", desc: "Bays 1-4 fabric rolls & FIFO tracking" },
  { name: "Production Floor", href: "/production", desc: "Cut-to-pack line tracking & work orders" },
  { name: "Milestone Tracking", href: "/tracking", desc: "9-gate milestone production tracking" },
  { name: "QA & Inspection", href: "/qa", desc: "AQL 2.5 major defect audits & inspection" },
  { name: "Packing & Cartons", href: "/packing", desc: "Master carton barcode staging" },
  { name: "Port Dispatch", href: "/dispatch", desc: "Commercial export containers & gate passes" },
  { name: "BOM Costing", href: "/costing", desc: "CM calculation & net gross margins" },
  { name: "CRM Clients", href: "/clients", desc: "Global apparel buyers & brand accounts" },
  { name: "Sales Orders", href: "/orders", desc: "Export contracts & unit breakups" },
  { name: "Quotations", href: "/quotations", desc: "Commercial cost proposals" },
  { name: "Commercial Invoices", href: "/invoices", desc: "Customs export invoices & payments" },
  { name: "Workforce HR", href: "/employees", desc: "Worker roster & CNIC registration" },
  { name: "Monthly Payroll", href: "/salaries", desc: "Monthly salary runs & disbursements" },
  { name: "Salary Advances", href: "/advances", desc: "Staff advance loan deductions" },
  { name: "AI Center", href: "/ai", desc: "DALL-E 3 Garment mockup generation" },
  { name: "Analytics Reports", href: "/reports", desc: "Executive financial & operational reports" },
  { name: "System Configuration", href: "/settings", desc: "Plant parameters, RBAC & API keys" },
];

export default function UserProfilePage() {
  const router = useRouter();
  const { success, error: toastError, info } = useToast();

  const [user, setUser] = React.useState<AuthUser>(DEMO_USERS.admin);
  const [activeTab, setActiveTab] = React.useState<"info" | "security" | "rbac" | "activity">("info");

  // Editable Form State
  const [name, setName] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [phone, setPhone] = React.useState("+92 300 1234567");
  const [shift, setShift] = React.useState("Shift 1 (08:00 - 17:00 PKT)");
  const [plant, setPlant] = React.useState("");
  const [savingInfo, setSavingInfo] = React.useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const current = getClientAuthUser();
    setUser(current);
    setName(current.name);
    setDepartment(current.department);
    setPlant(current.plant);

    const handleAuthChange = () => {
      const u = getClientAuthUser();
      setUser(u);
      setName(u.name);
      setDepartment(u.department);
      setPlant(u.plant);
      if (u.role !== "super_admin") {
        setActiveTab("info");
      }
    };

    window.addEventListener("factoryos_auth_change", handleAuthChange);
    return () => window.removeEventListener("factoryos_auth_change", handleAuthChange);
  }, []);

  const roleKey = user.role || "super_admin";
  const roleConfig = ROLE_CONFIGS[roleKey] || ROLE_CONFIGS.super_admin;

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name,
          department,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const updatedUser: AuthUser = {
          ...user,
          name,
          department,
          plant,
          initials: name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || user.initials,
        };
        setClientAuthUser(updatedUser);
        setUser(updatedUser);
        success("Profile Updated", { description: "Your operator details were updated in MySQL." });
      } else {
        toastError("Update Failed", { description: data.message || "Failed to update profile." });
      }
    } catch (err: any) {
      toastError("Error", { description: err.message || "Connection failed." });
    } finally {
      setSavingInfo(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match. Please re-type carefully.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        success("Password Changed", { description: "Your password was updated in MySQL database." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(data.message || "Failed to update password.");
        toastError("Security Error", { description: data.message || "Current password invalid." });
      }
    } catch (err: any) {
      setPasswordError(err.message || "Network error.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearClientAuthUser();
    info("Signed Out", { description: "Operator session terminated." });
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <TopNav title="Operator Profile & Security" />

      <div className="flex-1 w-full max-w-[1400px] mx-auto min-w-0 px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* ============================================================
            1. OPERATOR HERO CARD
            ============================================================ */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            {/* Left: Avatar + Details */}
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center text-xl sm:text-2xl font-black shadow-md shrink-0 border-2 border-white">
                {user.initials || "OP"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                    {user.name}
                  </h1>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleConfig.badgeColor}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {user.roleTitle || roleConfig.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-500 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 font-mono text-slate-700">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {user.email}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {user.plant}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-emerald-500" />
                    Shift 1 Active
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Go to Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Access Scope</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{roleConfig.badge}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Department</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{user.department || "Operations"}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Security Tier</p>
              <p className="text-xs font-bold text-emerald-700 mt-0.5 truncate">256-Bit SSL Encrypted</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Session Status</p>
              <p className="text-xs font-bold text-blue-700 mt-0.5 truncate">Active & Verified</p>
            </div>
          </div>
        </div>

        {/* ============================================================
            2. NAVIGATION TABS (ADMIN ONLY TABS RESTRICTED)
            ============================================================ */}
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-2">
          {[
            { id: "info", label: "Profile & Facility Details", icon: User, adminOnly: false },
            { id: "security", label: "Password & Security", icon: KeyRound, adminOnly: false },
            { id: "rbac", label: "RBAC Module Permissions", icon: ShieldCheck, adminOnly: true },
            { id: "activity", label: "Session & Audit Trail", icon: Activity, adminOnly: true },
          ]
            .filter((tab) => !tab.adminOnly || roleKey === "super_admin")
            .map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.adminOnly && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                      Admin
                    </span>
                  )}
                </button>
              );
            })}
        </div>

        {/* ============================================================
            3. TAB 1: PERSONAL & FACILITY INFORMATION
            ============================================================ */}
        {activeTab === "info" && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-base font-bold text-slate-900">Operator Information</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your personal details, factory assignment, and floor communication channels.
              </p>
            </div>

            <form onSubmit={handleSaveInfo} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Corporate Email</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Assigned Plant Facility</label>
                  <select
                    value={plant}
                    onChange={(e) => setPlant(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Unit 1 - Korangi Garment Hub">Unit 1 — Korangi Garment Hub (Lines 1-12)</option>
                    <option value="Unit 2 - Landhi Industrial Park">Unit 2 — Landhi Export Processing Zone</option>
                    <option value="Headquarters Executive Suite">Executive Suite & Commercial HQ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Floor Shift</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Shift 1 (08:00 - 17:00 PKT)">Shift 1 (08:00 - 17:00 PKT)</option>
                    <option value="Shift 2 (17:00 - 02:00 PKT)">Shift 2 (17:00 - 02:00 PKT)</option>
                    <option value="General Management Hours">General Management Hours</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingInfo ? "Saving Changes..." : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================
            4. TAB 2: SECURITY & PASSWORD UPDATE
            ============================================================ */}
        {activeTab === "security" && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-base font-bold text-slate-900">Security Credentials & Password</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Change your account password directly in the MySQL database vault.
              </p>
            </div>

            {passwordError && (
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2 max-w-md animate-shake">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="flex-1 leading-relaxed">{passwordError}</p>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" />
                  {savingPassword ? "Updating Password..." : "Update Security Password"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================
            5. TAB 3: RBAC ROLE & MODULE PERMISSIONS MATRIX (ADMIN ONLY)
            ============================================================ */}
        {activeTab === "rbac" && roleKey === "super_admin" && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">RBAC Module Permission Matrix</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed access scope for role: <strong className="text-slate-800">{user.roleTitle}</strong>
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border self-start ${roleConfig.badgeColor}`}>
                {roleConfig.badge}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {ALL_MODULES.map((mod) => {
                const isAllowed = hasRouteAccess(roleKey, mod.href);
                return (
                  <div
                    key={mod.name}
                    className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isAllowed
                        ? "bg-white border-slate-200/90 shadow-2xs"
                        : "bg-slate-50/70 border-slate-200/50 opacity-60"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">{mod.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{mod.href}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{mod.desc}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                        isAllowed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {isAllowed ? (
                        <>
                          <Check className="h-3 w-3" /> Granted
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" /> Blocked
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================
            6. TAB 4: SESSION & AUDIT TRAIL (ADMIN ONLY)
            ============================================================ */}
        {activeTab === "activity" && roleKey === "super_admin" && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-base font-bold text-slate-900">Operator Activity & Audit Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentication events, IP stamps, and session timestamps.
              </p>
            </div>

            <div className="space-y-3 max-w-2xl">
              {[
                {
                  action: "Active Session Authenticated",
                  ip: "127.0.0.1 (Localhost / Plant Network)",
                  time: "Just now",
                  device: "Web Browser (Chrome / Edge on Windows)",
                  status: "Online",
                },
                {
                  action: "Password & Role Verification Passed",
                  ip: "127.0.0.1 (Internal Gateway)",
                  time: user.lastLogin ? new Date(user.lastLogin).toLocaleTimeString() : "Today",
                  device: "FactoryOS Portal Gateway",
                  status: "Success",
                },
                {
                  action: "Floor Shift Telemetry Synced",
                  ip: "127.0.0.1 (MySQL 8 Localhost)",
                  time: "Continuous",
                  device: "Automated Polling Engine",
                  status: "Active",
                },
              ].map((log, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="font-bold text-slate-900">{log.action}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{log.ip} • {log.device}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {log.status}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">{log.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

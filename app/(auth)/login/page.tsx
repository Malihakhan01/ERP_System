"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Factory,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Activity,
  Layers,
  KeyRound,
  AlertCircle,
  HelpCircle,
  X,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { DEMO_USERS, AuthUser } from "@/lib/auth/auth-types";
import { setClientAuthUser } from "@/lib/auth/auth-client";
import { useToast } from "@/components/ui/Toast";

const PLANTS = [
  { id: "unit-1", name: "Unit 1 — Korangi Garment Hub (Lines 1-12)", location: "Karachi, PK" },
  { id: "unit-2", name: "Unit 2 — Landhi Export Processing Zone", location: "Karachi, PK" },
  { id: "hq", name: "Executive Suite & Commercial Headquarters", location: "Clifton, PK" },
];

export default function LoginPage() {
  const router = useRouter();
  const { success, error: toastError, info } = useToast();

  // Form State
  const [email, setEmail] = React.useState(DEMO_USERS.admin.email);
  const [password, setPassword] = React.useState(DEMO_USERS.admin.password);
  const [selectedPlant, setSelectedPlant] = React.useState(PLANTS[0].name);
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [shiftPinRequired, setShiftPinRequired] = React.useState(false);
  const [shiftPin, setShiftPin] = React.useState("");
  const [activeRoleKey, setActiveRoleKey] = React.useState<string>("admin");

  // UI Flow State
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = React.useState(false);
  const [recoveryEmail, setRecoveryEmail] = React.useState("");
  const [recoverySuccess, setRecoverySuccess] = React.useState(false);

  // Switch demo preset profile
  const handleSelectRole = (key: string) => {
    const user = DEMO_USERS[key];
    if (!user) return;
    setActiveRoleKey(key);
    setEmail(user.email);
    setPassword(user.password);
    setSelectedPlant(user.plant);
    setErrorMessage(null);
    info(`Switched to ${user.roleTitle}`, {
      description: `Preset credentials filled for ${user.name}`,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          plant: selectedPlant,
          shiftPin: shiftPinRequired ? shiftPin : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        setClientAuthUser(data.user as AuthUser);
        success(`Welcome, ${data.user.name}!`, {
          description: `Logged in as ${data.user.roleTitle} — Redirecting to Floor Telemetry...`,
        });
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 600);
      } else {
        setErrorMessage(data.message || "Invalid credentials. Please verify or choose a demo role.");
        toastError("Authentication Failed", {
          description: data.message || "Please check your credentials.",
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error connecting to auth service.");
      toastError("Connection Error", {
        description: "Could not reach authentication endpoint.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail || !recoveryEmail.includes("@")) {
      toastError("Invalid Email", { description: "Please provide a valid company email." });
      return;
    }
    setRecoverySuccess(true);
    success("Security OTP Dispatched", {
      description: `A one-time emergency floor PIN was sent to ${recoveryEmail}`,
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Dynamic Background Glow Rings */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          
          {/* ============================================================
              LEFT HERO PANEL: Factory Showcase Branding (5 Cols)
              ============================================================ */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900/95 to-blue-950/60 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80">
            {/* Top: Logo & System Tag */}
            <div>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
                  <Factory className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-white tracking-tight">FactoryOS</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      ERP v2.4
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">Garment Manufacturing Cloud</p>
                </div>
              </div>

              {/* Tagline */}
              <div className="mt-8 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Floor Operations Online
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  High-Precision Apparel Factory Management.
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  End-to-end telemetry across BOM costing, cut-to-pack line throughput, raw fabric FIFO warehouse bays, and automated piece-rate payroll.
                </p>
              </div>

              {/* Feature Chips */}
              <div className="mt-6 space-y-2.5">
                {[
                  { icon: Layers, label: "Realtime 5-Stage Floor Tracking (Cutting → QA → Packing)" },
                  { icon: Activity, label: "Live Shift 1 & 2 Efficiency & SAM Tracking" },
                  { icon: ShieldCheck, label: "AQL 2.5 Major Defect Audits & Traceability" },
                  { icon: Cpu, label: "DALL-E 3 Garment Mockup & Tech Pack Engine" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-800/40 border border-slate-800 rounded-lg p-2.5">
                      <div className="h-6 w-6 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom: Facility Status Badge */}
            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                256-Bit SSL AES Encrypted
              </span>
              <span className="font-mono text-slate-500">Korangi & Landhi Cluster</span>
            </div>
          </div>

          {/* ============================================================
              RIGHT AUTH FORM PANEL (7 Cols)
              ============================================================ */}
          <div className="lg:col-span-7 bg-slate-900 p-6 sm:p-8 sm:py-10 flex flex-col justify-between">
            <div className="w-full max-w-lg mx-auto space-y-6">
              
              {/* Form Title */}
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Operator Authentication</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select a pre-configured demo operator role or provide your factory login credentials.
                </p>
              </div>

              {/* ============================================================
                  1. FAST DEMO ROLE PRESET SELECTOR (4 Quick Tabs)
                  ============================================================ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Quick Demo Operator Profiles
                  </span>
                  <span className="text-[10px] text-blue-400 font-medium">1-Click Auto-Fill</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: "admin", label: "Super Admin", role: "Full Access", color: "border-blue-500/50 bg-blue-500/10 text-blue-300" },
                    { key: "supervisor", label: "Supervisor", role: "Floor Lines", color: "border-amber-500/50 bg-amber-500/10 text-amber-300" },
                    { key: "finance", label: "Finance Lead", role: "Accounts & Pay", color: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" },
                    { key: "warehouse", label: "Warehouse", role: "Bays & Stock", color: "border-sky-500/50 bg-sky-500/10 text-sky-300" },
                  ].map((role) => {
                    const isSelected = activeRoleKey === role.key;
                    return (
                      <button
                        key={role.key}
                        type="button"
                        onClick={() => handleSelectRole(role.key)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? `${role.color} ring-2 ring-blue-500/50 shadow-md`
                            : "border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <p className="text-xs font-bold truncate">{role.label}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{role.role}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-2 animate-shake">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed flex-1">{errorMessage}</p>
                </div>
              )}

              {/* ============================================================
                  2. AUTHENTICATION CREDENTIALS FORM
                  ============================================================ */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Facility / Plant Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      Target Manufacturing Plant
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Location</span>
                  </label>
                  <select
                    value={selectedPlant}
                    onChange={(e) => setSelectedPlant(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800/80 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                  >
                    {PLANTS.map((plant) => (
                      <option key={plant.id} value={plant.name} className="bg-slate-900 text-white">
                        {plant.name} ({plant.location})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    Corporate Email / Operator ID
                  </label>
                  <div className="relative">
                    <input
                      id="auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setActiveRoleKey("");
                      }}
                      placeholder="admin@factoryos.internal"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password & Reveal */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                      Security Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(true)}
                      className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Forgot Password / PIN?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-slate-700 bg-slate-800/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Optional Shift PIN toggle */}
                {shiftPinRequired && (
                  <div className="space-y-1.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 animate-in fade-in duration-150">
                    <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                      Floor Supervisor 4-Digit Shift Key
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={shiftPin}
                      onChange={(e) => setShiftPin(e.target.value)}
                      placeholder="e.g. 8842"
                      className="w-full h-9 px-3 rounded-lg border border-amber-500/40 bg-slate-900 text-xs text-white focus:outline-none focus:border-amber-400 font-mono tracking-widest"
                    />
                  </div>
                )}

                {/* Options: Remember Me & 2FA toggle */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span>Keep me signed in</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShiftPinRequired(!shiftPinRequired)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
                  >
                    <KeyRound className="h-3 w-3 text-slate-500" />
                    {shiftPinRequired ? "Remove Shift PIN" : "+ Add Shift PIN"}
                  </button>
                </div>

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Verifying Operator Vault...
                      </>
                    ) : (
                      <>
                        <span>Sign In to FactoryOS Dashboard</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Bypass direct entry for testing */}
              <div className="text-center pt-1">
                <Link
                  href="/dashboard"
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
                >
                  Skip login and proceed directly to Dashboard →
                </Link>
              </div>
            </div>

            {/* Bottom Security Info */}
            <div className="mt-8 pt-4 border-t border-slate-800 text-center text-[10px] text-slate-500">
              <p>
                FactoryOS Secure Gateway • Role-Based Access Control (RBAC) • Multi-Tenant Garment ERP
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ============================================================
          PASSWORD / PIN RECOVERY MODAL
          ============================================================ */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-white">
            <button
              type="button"
              onClick={() => {
                setForgotModalOpen(false);
                setRecoverySuccess(false);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Operator Credential Recovery</h4>
                <p className="text-[11px] text-slate-400">Garment Plant Access Control</p>
              </div>
            </div>

            {recoverySuccess ? (
              <div className="space-y-4 py-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Reset Key Dispatched
                  </div>
                  <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                    A temporary one-time password and floor bypass link has been forwarded to{" "}
                    <strong className="text-white">{recoveryEmail}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(false);
                    setRecoverySuccess(false);
                  }}
                  className="w-full h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendRecovery} className="space-y-3.5 mt-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your registered factory email address to receive an instant OTP or contact the IT Plant Administrator.
                </p>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Operator Email</label>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="e.g. supervisor@factoryos.internal"
                    className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md transition-colors"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

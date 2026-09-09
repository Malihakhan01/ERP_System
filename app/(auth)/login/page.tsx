"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Factory,
  Check,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { AuthUser } from "@/lib/auth/auth-types";
import { setClientAuthUser } from "@/lib/auth/auth-client";
import { useToast } from "@/components/ui/Toast";

type RoleKey = "admin" | "supervisor" | "finance" | "warehouse" | "employee";

interface RoleCardOption {
  key: RoleKey;
  title: string;
  subtitle: string;
  targetRoute: string;
}

const ROLES: RoleCardOption[] = [
  {
    key: "admin",
    title: "Super Admin",
    subtitle: "Full system access",
    targetRoute: "/dashboard",
  },
  {
    key: "supervisor",
    title: "Supervisor",
    subtitle: "Production & operations",
    targetRoute: "/production",
  },
  {
    key: "finance",
    title: "Finance Lead",
    subtitle: "Accounts & costing",
    targetRoute: "/invoices",
  },
  {
    key: "warehouse",
    title: "Warehouse",
    subtitle: "Inventory & dispatch",
    targetRoute: "/inventory",
  },
  {
    key: "employee",
    title: "Employee Portal",
    subtitle: "My tasks, wage slips & advances",
    targetRoute: "/portal",
  },
];

const ROLE_CREDENTIALS: Record<RoleKey, { email: string; pass: string; title: string }> = {
  admin: {
    email: "admin@factoryos.internal",
    pass: "factoryadmin2026",
    title: "Super Administrator (Director)",
  },
  supervisor: {
    email: "supervisor@factoryos.internal",
    pass: "12345678",
    title: "Production Floor Supervisor",
  },
  finance: {
    email: "finance@factoryos.internal",
    pass: "finance2026",
    title: "Head of Accounts & Payroll",
  },
  warehouse: {
    email: "warehouse@factoryos.internal",
    pass: "warehouse2026",
    title: "Warehouse & Inventory Lead",
  },
  employee: {
    email: "EMP-2026-001",
    pass: "emp12345",
    title: "Floor Operator (Muhammad Rizwan)",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { success, error: toastError, info } = useToast();

  // Role Selection (default context)
  const [selectedRole, setSelectedRole] = React.useState<RoleKey>("admin");

  // Form Inputs - Blank by default. User enters credentials manually as standard in industry
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);

  // States
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // When clicking a role card, activate that role without overwriting what the user typed
  const handleSelectRole = (roleKey: RoleKey) => {
    setSelectedRole(roleKey);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Optional helper to populate demo credentials on explicit button click
  const handleFillDemoCredentials = () => {
    const creds = ROLE_CREDENTIALS[selectedRole];
    if (creds) {
      setEmail(creds.email);
      setPassword(creds.pass);
      setErrorMessage(null);
    }
  };

  // If user types/pastes an identifier, detect and sync active role card
  const handleEmailChange = (val: string) => {
    setEmail(val);
    const lower = val.toLowerCase().trim();
    if (lower.startsWith("emp") || lower.startsWith("03") || lower.startsWith("+92") || /^\d{5}-\d{7}-\d$/.test(lower) || lower.includes("rizwan")) {
      setSelectedRole("employee");
    } else if (lower.includes("supervisor")) setSelectedRole("supervisor");
    else if (lower.includes("finance")) setSelectedRole("finance");
    else if (lower.includes("warehouse")) setSelectedRole("warehouse");
    else if (lower.includes("admin")) setSelectedRole("admin");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      const msg = selectedRole === "employee" 
        ? "Please enter your Employee Number / Mobile and Password / PIN."
        : "Please enter both your Email / Operator ID and Password.";
      setErrorMessage(msg);
      toastError("Validation Error", { description: msg });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          roleContext: selectedRole,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const loggedInUser: AuthUser = data.user;
        setClientAuthUser(loggedInUser);

        const successText = `Welcome, ${loggedInUser.name}! Access verified as ${loggedInUser.roleTitle}. Redirecting...`;
        setSuccessMessage(successText);
        success(`Welcome, ${loggedInUser.name}`, {
          description: `Authenticated as ${loggedInUser.roleTitle}`,
        });

        // Determine target dashboard based on validated user role
        let destination = "/dashboard";
        if (loggedInUser.role === "operator") {
          destination = "/portal";
        } else if (loggedInUser.role === "production_supervisor") {
          destination = "/production";
        } else if (loggedInUser.role === "finance") {
          destination = "/invoices";
        } else if (loggedInUser.role === "factory_manager") {
          destination = "/inventory";
        } else if (loggedInUser.role === "super_admin") {
          destination = "/dashboard";
        } else {
          const matched = ROLES.find((r) => r.key === selectedRole);
          destination = matched?.targetRoute || "/dashboard";
        }

        setTimeout(() => {
          router.push(destination);
          router.refresh();
        }, 500);
      } else {
        const msg = data.message || "Invalid credentials. Please verify your email and password.";
        setErrorMessage(msg);
        toastError("Authentication Failed", {
          description: msg,
        });
      }
    } catch (err: any) {
      const msg = err.message || "Unable to connect to authentication service.";
      setErrorMessage(msg);
      toastError("Connection Error", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    info("Password Recovery", {
      description: "Please contact your System Administrator to reset your operator credentials.",
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#080c14] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Container: 2-Column Desktop Grid */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* ================= LEFT SIDE (Spacious & Minimal Branding) ================= */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-8 lg:pr-4">
          
          {/* Logo & Category */}
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
                <Factory className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  FactoryOS
                </h1>
                <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                  Garment Manufacturing ERP
                </p>
              </div>
            </div>
          </div>

          {/* Headline & Sentence */}
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-tight">
              Smart Manufacturing. <br />
              <span className="text-blue-400">One Platform.</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              Complete operational intelligence connecting cut plans, stitching lines, warehouse inventory and commercial finance.
            </p>
          </div>

          {/* 3 Simple Benefits */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-200">Production</p>
                <p className="text-xs text-slate-400">Cutting markers, bundle tickets & stitching floor telemetry</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-200">Finance</p>
                <p className="text-xs text-slate-400">Commercial export invoices, BOM costing & piece-rate payroll</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-200">Inventory</p>
                <p className="text-xs text-slate-400">Fabric rolls in warehouse bays, trims & container dispatch</p>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="pt-4 flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span>Plant Network Online — Production Ready</span>
          </div>

        </div>

        {/* ================= RIGHT SIDE (Clean Enterprise Login Card) ================= */}
        <div className="lg:col-span-7">
          <div className="bg-[#0f172a]/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/40 backdrop-blur-md">
            
            {/* Header */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Welcome to FactoryOS
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Sign in to continue
              </p>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-5 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 stroke-[3]" />
                  <span className="font-semibold">{successMessage}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-rose-200 ml-2 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Role Selection Grid */}
            <div className="mb-6">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Select Your Access Context
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ROLES.map((role) => {
                  const isSelected = selectedRole === role.key;
                  return (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => handleSelectRole(role.key)}
                      className={`relative p-3 rounded-xl text-left transition-all cursor-pointer border ${
                        role.key === "employee" ? "col-span-2 sm:col-span-1" : ""
                      } ${
                        isSelected
                          ? "bg-blue-500/15 border-blue-500 ring-1 ring-blue-500/40 text-white shadow-sm"
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100">{role.title}</span>
                        {isSelected && (
                          <span className="h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-500/40">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        {role.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Role Account Indicator */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/70 border border-slate-800 rounded-lg px-3.5 py-2.5 mb-4">
              <span>Signing in as: <strong className="text-slate-100">{ROLE_CREDENTIALS[selectedRole].title}</strong></span>
              <button
                type="button"
                onClick={handleFillDemoCredentials}
                className="text-blue-400 hover:text-blue-300 font-medium hover:underline text-[10px] cursor-pointer"
                title="Populate test credentials for this role"
              >
                Quick Demo Fill
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Identifier Input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {selectedRole === "employee" ? "Employee Number / Mobile / CNIC" : "Email / Operator ID"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder={
                      selectedRole === "employee"
                        ? "e.g. EMP-2026-001 or 03001234567"
                        : "Enter your email or operator ID"
                    }
                    className="w-full bg-[#090d16] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Password / PIN */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {selectedRole === "employee" ? "Security PIN / Password" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      selectedRole === "employee"
                        ? "Enter your security PIN or password (e.g. emp12345)"
                        : "Enter security password"
                    }
                    className="w-full bg-[#090d16] border border-slate-700/80 rounded-lg px-3.5 py-2.5 pr-10 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Keep me signed in & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded bg-[#090d16] border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span>Keep me signed in</span>
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>

      </div>

    </div>
  );
}

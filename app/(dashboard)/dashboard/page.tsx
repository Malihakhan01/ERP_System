"use client";

import * as React from "react";
import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import {
  Factory,
  Layers,
  ClipboardList,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  PackageCheck,
  Plus,
  ArrowUpRight,
  Scissors,
  Shirt,
  CheckSquare,
  Box,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Warehouse,
  Activity,
  Users,
  FileText,
  CreditCard,
  Calculator,
  Compass,
  ShoppingBag,
  UserCheck,
  FileCheck2,
  MessageSquare,
} from "lucide-react";

import { useToast } from "@/components/ui/Toast";
import { getClientAuthUser } from "@/lib/auth/auth-client";
import { AuthUser, DEMO_USERS } from "@/lib/auth/auth-types";
import { hasRouteAccess, ROLE_CONFIGS } from "@/lib/auth/rbac";

interface DashboardTelemetry {
  kpis: {
    activeOrders: number;
    totalOrderValue: number;
    totalUnits: number;
    activeInProductionJobs: number;
    pendingDispatchCartons: number;
    onTimeDeliveryRate: string;
    rawFabricStockKg: number;
    fabricAllocatedKg: number;
    lowStockAlerts: number;
    accountsPayable: number;
    totalInvoiced: number;
    totalCollected: number;
    totalReceivable: number;
    estimatedGrossMargin: number;
    totalInventoryValuation: number;
    activeWorkers: number;
  };
  pipeline: {
    cutting: number;
    stitching: number;
    finishing: number;
    qa: number;
    packing: number;
  };
  warehouse: {
    bay1: number;
    bay2: number;
    bay3: number;
    bay4: number;
    totalStockKg: number;
  };
}

const DEFAULT_METRICS: DashboardTelemetry = {
  kpis: {
    activeOrders: 0,
    totalOrderValue: 0,
    totalUnits: 0,
    activeInProductionJobs: 0,
    pendingDispatchCartons: 0,
    onTimeDeliveryRate: "99.2%",
    rawFabricStockKg: 0,
    fabricAllocatedKg: 0,
    lowStockAlerts: 0,
    accountsPayable: 0,
    totalInvoiced: 0,
    totalCollected: 0,
    totalReceivable: 0,
    estimatedGrossMargin: 24.5,
    totalInventoryValuation: 0,
    activeWorkers: 0,
  },
  pipeline: {
    cutting: 0,
    stitching: 0,
    finishing: 0,
    qa: 0,
    packing: 0,
  },
  warehouse: {
    bay1: 0,
    bay2: 0,
    bay3: 0,
    bay4: 0,
    totalStockKg: 0,
  },
};

export default function DashboardPage() {
  const { success, error: toastError } = useToast();
  const [refreshing, setRefreshing] = React.useState(false);
  const [data, setData] = React.useState<DashboardTelemetry>(DEFAULT_METRICS);
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<AuthUser>(DEMO_USERS.admin);

  React.useEffect(() => {
    setUser(getClientAuthUser());
    const handleAuthChange = () => setUser(getClientAuthUser());
    window.addEventListener("factoryos_auth_change", handleAuthChange);
    return () => window.removeEventListener("factoryos_auth_change", handleAuthChange);
  }, []);

  const roleKey = user.role || "super_admin";
  const roleConfig = ROLE_CONFIGS[roleKey] || ROLE_CONFIGS.super_admin;

  const loadDashboardTelemetry = React.useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const res = await fetch("/api/dashboard/metrics");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        if (showToast) {
          success("Operations Telemetry Refreshed", {
            description: "Synchronized live floor throughput & ERP telemetry from MySQL.",
          });
        }
      }
    } catch (err: any) {
      if (showToast) {
        toastError("Telemetry Sync Failed", { description: err.message || "Failed to query live metrics." });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [success, toastError]);

  React.useEffect(() => {
    loadDashboardTelemetry(false);
  }, [loadDashboardTelemetry]);

  const maxCapacityKg = 12000;
  const capacityPercent = Math.min(100, Math.round((data.warehouse.totalStockKg / maxCapacityKg) * 100));

  // Role-specific primary quick-action CTA
  const primaryAction = React.useMemo(() => {
    if (roleKey === "production_supervisor") {
      return { href: "/production", label: "Floor Jobs", icon: Plus };
    }
    if (roleKey === "finance") {
      return { href: "/invoices", label: "New Invoice", icon: Plus };
    }
    if (roleKey === "factory_manager") {
      return { href: "/inventory", label: "Bay Inventory", icon: Plus };
    }
    return { href: "/production", label: "Launch Job", icon: Plus };
  }, [roleKey]);

  return (
    <>
      <TopNav title={`${user.roleTitle || "Executive Overview"}`} />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* ============================================================
            1. OPERATIONAL DASHBOARD HEADER (ROLE-AWARE)
            ============================================================ */}
        <div className="w-full min-w-0 bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
            {/* Left: Title & Subtitle */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Garment Factory Operations
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleConfig.badgeColor}`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {roleConfig.badge}: {user.name}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {user.plant}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                {roleConfig.description}
              </p>
            </div>

            {/* Right: Telemetry sync & primary quick action */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => loadDashboardTelemetry(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <Link href={primaryAction.href}>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-150 cursor-pointer active:scale-95"
                >
                  <primaryAction.icon className="h-4 w-4" />
                  {primaryAction.label}
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* ============================================================
            2. EXACT 8 KPI CARDS (4 columns × 2 rows on desktop)
            ============================================================ */}
        <section className="w-full min-w-0 space-y-3">
          <div className="flex items-center justify-between min-w-0">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Operational & Financial Metrics
            </h2>
            <span className="text-xs text-slate-400 font-mono font-medium">
              Base Currency: PKR (Rs)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
            {/* KPI 1: Active Orders */}
            <Link href="/orders" className="block group">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs group-hover:border-blue-300 group-hover:shadow-sm transition-all flex flex-col justify-between min-w-0 min-h-[120px]">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
                    Active Orders
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                </div>
                <div className="min-w-0 mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                      {loading ? "..." : data.kpis.activeOrders}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      Contracts
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 truncate">
                    Rs {data.kpis.totalOrderValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total contract value
                  </p>
                </div>
              </div>
            </Link>

            {/* KPI 2: Active in Production */}
            <Link href="/production" className="block group">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs group-hover:border-amber-300 group-hover:shadow-sm transition-all flex flex-col justify-between min-w-0 min-h-[120px]">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
                    Active in Production
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 shrink-0 border border-amber-100 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Factory className="h-4 w-4" />
                  </div>
                </div>
                <div className="min-w-0 mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                      {loading ? "..." : data.kpis.activeInProductionJobs}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      Floor Batches
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 truncate">
                    Live manufacturing floor batches
                  </p>
                </div>
              </div>
            </Link>

            {/* KPI 3: Pending Dispatch */}
            <Link href="/dispatch" className="block group">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs group-hover:border-indigo-300 group-hover:shadow-sm transition-all flex flex-col justify-between min-w-0 min-h-[120px]">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
                    Pending Dispatch
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Truck className="h-4 w-4" />
                  </div>
                </div>
                <div className="min-w-0 mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                      {loading ? "..." : data.kpis.pendingDispatchCartons}
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      Cartons
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 truncate">
                    Packed & staged in warehouse
                  </p>
                </div>
              </div>
            </Link>

            {/* KPI 4: On-Time Delivery */}
            <Link href="/tracking" className="block group">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs group-hover:border-emerald-300 group-hover:shadow-sm transition-all flex flex-col justify-between min-w-0 min-h-[120px]">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
                    On-Time Delivery
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <PackageCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="min-w-0 mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight leading-none">
                      {data.kpis.onTimeDeliveryRate}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Target
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 truncate">
                    9-gate milestone tracking target
                  </p>
                </div>
              </div>
            </Link>

            {/* KPI 5: Raw Fabric Stock */}
            <Link href="/inventory" className="block group">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs group-hover:border-sky-300 group-hover:shadow-sm transition-all flex flex-col justify-between min-w-0 min-h-[120px]">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
                    Raw Fabric Stock
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 shrink-0 border border-sky-100 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
                <div className="min-w-0 mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                      {loading ? "..." : `${data.kpis.rawFabricStockKg.toLocaleString()} KG`}
                    </span>
                    <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                      In Bays
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 truncate">
                    Knits & woven rolls in bays
                  </p>
                </div>
              </div>
            </Link>

            {/* KPI 6: Low Stock Alerts */}
            <Link href="/inventory" className="block group">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs group-hover:border-rose-300 group-hover:shadow-sm transition-all flex flex-col justify-between min-w-0 min-h-[120px]">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
                    Low Stock Alerts
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 shrink-0 border border-rose-100 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </div>
                <div className="min-w-0 mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                      {loading ? "..." : data.kpis.lowStockAlerts}
                    </span>
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${data.kpis.lowStockAlerts > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-50 text-emerald-700"}`}>
                      {data.kpis.lowStockAlerts > 0 ? "Attention Needed" : "Healthy"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 truncate">
                    Items below safety threshold
                  </p>
                </div>
              </div>
            </Link>

            {/* KPI 7: Accounts Payable */}
            <Link href="/purchases" className="block group">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs group-hover:border-purple-300 group-hover:shadow-sm transition-all flex flex-col justify-between min-w-0 min-h-[120px]">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
                    Accounts Payable
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 shrink-0 border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div className="min-w-0 mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                      {loading ? "..." : `Rs ${data.kpis.accountsPayable.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 truncate">
                    Due to yarn & trim mills
                  </p>
                </div>
              </div>
            </Link>

            {/* KPI 8: Estimated Gross Margin */}
            <Link href="/costing" className="block group">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs group-hover:border-teal-300 group-hover:shadow-sm transition-all flex flex-col justify-between min-w-0 min-h-[120px]">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
                    Estimated Gross Margin
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 shrink-0 border border-teal-100 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="min-w-0 mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                      {loading ? "..." : `${data.kpis.estimatedGrossMargin}%`}
                    </span>
                    <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                      Calculated
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 truncate">
                    Average calculated BOM profit
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ============================================================
            3. PRODUCTION PIPELINE (60%) + WAREHOUSE ALLOCATION (40%)
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0">
          {/* Left Card: Production Pipeline (60% -> lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs min-w-0">
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-4 pb-3.5 border-b border-slate-100 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      Production Pipeline
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    Live manufacturing floor status across active sewing lines
                  </p>
                </div>
                <Link
                  href="/production"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 shrink-0"
                >
                  Floor Lines
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* 5 Equal Stages in one row on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 min-w-0">
                {[
                  { step: "01", name: "Cutting", count: data.pipeline.cutting, icon: Scissors, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", link: "/production" },
                  { step: "02", name: "Stitching", count: data.pipeline.stitching, icon: Shirt, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", link: "/production" },
                  { step: "03", name: "Finishing", count: data.pipeline.finishing, icon: Factory, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100", link: "/production" },
                  { step: "04", name: "Quality QA", count: data.pipeline.qa, icon: CheckSquare, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", link: "/qa" },
                  { step: "05", name: "Packing", count: data.pipeline.packing, icon: Box, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", link: "/packing" },
                ].map((stage) => {
                  const Icon = stage.icon;
                  return (
                    <Link key={stage.name} href={stage.link} className="block">
                      <div
                        className={`p-3.5 rounded-xl border ${stage.border} bg-slate-50/60 text-center flex flex-col items-center justify-between min-w-0 transition-all hover:bg-slate-100/80 hover:shadow-2xs cursor-pointer`}
                      >
                        <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                          <span className="font-semibold">STG</span>
                          <span className="font-bold text-slate-600">{stage.step}</span>
                        </div>
                        <div className={`h-9 w-9 rounded-xl ${stage.bg} ${stage.color} flex items-center justify-center mb-2 shadow-2xs`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate max-w-full">
                          {stage.name}
                        </span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-sm font-extrabold text-slate-900">
                            {loading ? "..." : stage.count}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">Batches</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 min-w-0">
              <span className="truncate font-medium">Floor Lines: Shift 1 & 2 Active</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                AQL Standard: 2.5 Major
              </span>
            </div>
          </div>

          {/* Right Card: Warehouse & Fabric Allocation (40% -> lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs min-w-0">
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-4 pb-3.5 border-b border-slate-100 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      Warehouse & Fabric Allocation
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    Raw fabric inventory & cutting allocation
                  </p>
                </div>
                <Link
                  href="/inventory"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 shrink-0"
                >
                  Manage Warehouse →
                </Link>
              </div>

              <div className="space-y-4 mt-4 min-w-0">
                {/* Progress bar: Warehouse Capacity utilized */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                    <span className="text-slate-600">Warehouse Capacity</span>
                    <span className="text-slate-900 font-mono font-bold">{capacityPercent}% utilized</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>
                </div>

                {/* 2 Key Metric Blocks */}
                <div className="grid grid-cols-2 gap-3 min-w-0">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 min-w-0">
                    <p className="text-[11px] text-slate-500 font-semibold truncate">Available in Bays</p>
                    <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 truncate">
                      {loading ? "..." : `${data.warehouse.totalStockKg.toLocaleString()} KG`}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Unallocated rolls</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/60 min-w-0">
                    <p className="text-[11px] text-blue-900 font-semibold truncate">Allocated to Cutting</p>
                    <p className="text-sm sm:text-base font-bold text-blue-700 mt-0.5 truncate">
                      {loading ? "..." : `${data.kpis.fabricAllocatedKg.toLocaleString()} KG`}
                    </p>
                    <p className="text-[10px] text-blue-600/70 mt-0.5">Active cutting queue</p>
                  </div>
                </div>

                {/* Status Blocks */}
                <div className="grid grid-cols-2 gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white min-w-0">
                    <p className="text-[10px] text-slate-400 font-medium truncate">Capacity Headroom</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{maxCapacityKg.toLocaleString()} KG Max</p>
                  </div>
                  <div className={`p-2.5 rounded-lg border min-w-0 ${data.kpis.lowStockAlerts > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                    <p className={`text-[10px] font-medium truncate ${data.kpis.lowStockAlerts > 0 ? "text-amber-800" : "text-emerald-800"}`}>Stock Status</p>
                    <p className={`text-xs font-bold mt-0.5 truncate ${data.kpis.lowStockAlerts > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                      {data.kpis.lowStockAlerts > 0 ? "Reorder Warning" : "Optimal / Healthy"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 min-w-0">
              <span className="truncate font-medium">Sialkot Warehouse Bays 1-4 (Daska Road)</span>
              <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">FIFO Active</span>
            </div>
          </div>
        </div>

        {/* ============================================================
            4. MASTER ERP MODULE DIRECTORY & QUICK-NAVIGATION HUB
            ============================================================ */}
        <section className="w-full min-w-0 space-y-3">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Master ERP System Directory & Quick Navigation
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { title: "CRM Clients", href: "/clients", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { title: "Quotations", href: "/quotations", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
              { title: "Sales Orders", href: "/orders", icon: ClipboardList, color: "text-indigo-600", bg: "bg-indigo-50" },
              { title: "Style Products", href: "/products", icon: Shirt, color: "text-violet-600", bg: "bg-violet-50" },
              { title: "BOM Costing", href: "/costing", icon: Calculator, color: "text-teal-600", bg: "bg-teal-50" },
              { title: "Raw Materials", href: "/materials", icon: Layers, color: "text-amber-600", bg: "bg-amber-50" },
              { title: "Warehouse Stock", href: "/inventory", icon: Warehouse, color: "text-sky-600", bg: "bg-sky-50" },
              { title: "Procurement", href: "/purchases", icon: ShoppingBag, color: "text-orange-600", bg: "bg-orange-50" },
              { title: "Workforce HR", href: "/employees", icon: UserCheck, color: "text-purple-600", bg: "bg-purple-50" },
              { title: "Production Floor", href: "/production", icon: Factory, color: "text-rose-600", bg: "bg-rose-50" },
              { title: "QA Inspection", href: "/qa", icon: CheckSquare, color: "text-amber-600", bg: "bg-amber-50" },
              { title: "Master Cartons", href: "/packing", icon: Box, color: "text-cyan-600", bg: "bg-cyan-50" },
              { title: "Port Dispatch", href: "/dispatch", icon: Truck, color: "text-indigo-600", bg: "bg-indigo-50" },
              { title: "Milestone Tracking", href: "/tracking", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
              { title: "Salary Advances", href: "/advances", icon: CreditCard, color: "text-pink-600", bg: "bg-pink-50" },
              { title: "Monthly Payroll", href: "/salaries", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
              { title: "Commercial Invoices", href: "/invoices", icon: FileCheck2, color: "text-blue-600", bg: "bg-blue-50" },
              { title: "Live Team Chat", href: "/chat", icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
              { title: "Executive Reports", href: "/reports", icon: TrendingUp, color: "text-slate-600", bg: "bg-slate-100" },
            ].map((mod) => {
              const Icon = mod.icon;
              const isAllowed = hasRouteAccess(roleKey, mod.href);

              return (
                <Link key={mod.title} href={mod.href} className="block group">
                  <div
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 min-w-0 ${isAllowed
                        ? "bg-white border-slate-200/80 shadow-2xs hover:border-blue-400 hover:shadow-xs"
                        : "bg-slate-50/70 border-slate-200/50 opacity-60 hover:opacity-100 hover:border-amber-300"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`h-8 w-8 rounded-lg ${mod.bg} ${mod.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 truncate transition-colors">
                        {mod.title}
                      </span>
                    </div>

                    {!isAllowed && (
                      <span
                        className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded shrink-0"
                        title="Restricted for current role"
                      >
                        Lock
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ============================================================
            5. LOWER SECTION: ALERTS (5/12) + RECENT ACTIVITY (7/12)
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0">
          {/* Left: Factory Alerts & Exceptions (5 cols -> lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs min-w-0">
            <div className="min-w-0">
              <div className="pb-3.5 border-b border-slate-100 min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    Factory Alerts & Exceptions
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Live operational exceptions and compliance notices
                </p>
              </div>

              {/* 4 Clean Alert Rows with distinct severities */}
              <div className="space-y-3 mt-4 min-w-0">
                {/* 1. Normal */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="font-bold text-emerald-950 truncate">All Line Operations Normal</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200/70 text-emerald-800 shrink-0">
                        Normal
                      </span>
                    </div>
                    <p className="text-emerald-800 text-[11px] sm:text-xs leading-relaxed">
                      {data.kpis.activeInProductionJobs} manufacturing jobs running smoothly with zero overdue bottlenecks.
                    </p>
                  </div>
                </div>

                {/* 2. Warning / Optimal */}
                <div className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs min-w-0 ${data.kpis.lowStockAlerts > 0 ? "border-amber-200 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/50"}`}>
                  {data.kpis.lowStockAlerts > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`font-bold truncate ${data.kpis.lowStockAlerts > 0 ? "text-amber-950" : "text-emerald-950"}`}>
                        {data.kpis.lowStockAlerts > 0 ? "Reorder Level Thresholds" : "Stock Levels Optimal"}
                      </p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${data.kpis.lowStockAlerts > 0 ? "bg-amber-200/70 text-amber-800" : "bg-emerald-200/70 text-emerald-800"}`}>
                        {data.kpis.lowStockAlerts > 0 ? "Warning" : "Optimal"}
                      </span>
                    </div>
                    <p className={`text-[11px] sm:text-xs leading-relaxed ${data.kpis.lowStockAlerts > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                      {data.kpis.lowStockAlerts > 0
                        ? `${data.kpis.lowStockAlerts} warehouse material items currently below safety reorder threshold.`
                        : "All warehouse fabric and trim lots are currently within safe operational buffers."}
                    </p>
                  </div>
                </div>

                {/* 3. Critical */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 text-xs min-w-0">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="font-bold text-rose-950 truncate">AQL 2.5 Quality Audit Gate</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200/70 text-rose-800 shrink-0">
                        Critical
                      </span>
                    </div>
                    <p className="text-rose-800 text-[11px] sm:text-xs leading-relaxed">
                      Defect rates exceeding 2.5% Major will automatically trigger rework ticket generation.
                    </p>
                  </div>
                </div>

                {/* 4. Policy */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 text-xs min-w-0">
                  <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="font-bold text-purple-950 truncate">Advance Borrowing Policy</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200/70 text-purple-800 shrink-0">
                        Policy
                      </span>
                    </div>
                    <p className="text-purple-800 text-[11px] sm:text-xs leading-relaxed">
                      Staff advances automatically deducted on monthly payroll runs with zero manual bookkeeping.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Telemetry Engine</span>
              <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold text-[11px]">
                MySQL 8 Connected
              </span>
            </div>
          </div>

          {/* Right: Recent Factory Activity (7 cols -> lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs min-w-0">
            <div className="min-w-0">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      Recent Factory Activity
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    Audit trail across sales, manufacturing jobs, and warehouse
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono shrink-0 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Live Sync
                </span>
              </div>

              {/* Activity rows with category badges */}
              <div className="space-y-3 mt-4 text-xs min-w-0">
                {[
                  {
                    category: "Commercial",
                    title: `Active Contracts: ${data.kpis.activeOrders} Orders Registered`,
                    desc: `Total commercial portfolio of Rs ${data.kpis.totalOrderValue.toLocaleString()} with confirmed delivery milestones.`,
                    time: "Live Sync",
                    badgeStyle: "bg-blue-50 text-blue-700 border-blue-200",
                  },
                  {
                    category: "Manufacturing",
                    title: `Production Pipeline Active: ${data.kpis.activeInProductionJobs} Jobs`,
                    desc: `${data.pipeline.cutting} Cutting, ${data.pipeline.stitching} Stitching, and ${data.pipeline.packing} Packing batches on floor.`,
                    time: "Floor Active",
                    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  },
                  {
                    category: "Warehouse",
                    title: `Raw Fabric Stock: ${data.kpis.rawFabricStockKg.toLocaleString()} KG in Bays`,
                    desc: `Knits and fleece rolls in Bays 1-4 with FIFO tracking and automated safety buffer alerts.`,
                    time: "Bays 1-4",
                    badgeStyle: "bg-amber-50 text-amber-700 border-amber-200",
                  },
                  {
                    category: "Financials",
                    title: `Billing & Receivables: Rs ${data.kpis.totalInvoiced.toLocaleString()} Invoiced`,
                    desc: `Rs ${data.kpis.totalCollected.toLocaleString()} collected in cash receipts with Rs ${data.kpis.totalReceivable.toLocaleString()} outstanding receivables balance.`,
                    time: "Reconciled",
                    badgeStyle: "bg-purple-50 text-purple-700 border-purple-200",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors min-w-0 gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.badgeStyle}`}>
                          {item.category}
                        </span>
                        <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {item.title}
                        </p>
                      </div>
                      <p className="text-slate-600 text-[11px] sm:text-xs leading-relaxed line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono shrink-0 whitespace-nowrap self-start mt-0.5">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Showing latest enterprise transactions</span>
              <span className="font-mono text-[11px] text-slate-400">MySQL Telemetry V2</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

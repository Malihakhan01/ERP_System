"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard, Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Pagination } from "@/components/ui/Misc";
import { FormField, FormSection } from "@/components/forms/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  DollarSign,
  Plus,
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
  Calculator,
  ArrowLeft,
  Save,
  Layers,
  Percent,
  Coins,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { CostEstimateRecord } from "@/lib/mysql/costing-db";

const ITEMS_PER_PAGE = 10;

export default function CostingPage() {
  const { success, error: toastError } = useToast();

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [estimates, setEstimates] = React.useState<CostEstimateRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"list" | "create">("list");

  // Filtering & Pagination
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Metrics
  const [metrics, setMetrics] = React.useState({
    totalEstimates: 0,
    approvedQuotes: 0,
    pendingReview: 0,
    averageMarginPct: 20,
  });

  // ---------------------------------------------------------------------------
  // ESTIMATION FORM STATE
  // ---------------------------------------------------------------------------
  const [ordersList, setOrdersList] = React.useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>("");
  const [styleCode, setStyleCode] = React.useState("HD-380");
  const [batchQuantity, setBatchQuantity] = React.useState(500);
  const [currency, setCurrency] = React.useState("PKR");
  const [fabricConsumptionKg, setFabricConsumptionKg] = React.useState(0.45);
  const [fabricRatePerKg, setFabricRatePerKg] = React.useState(7.5);
  const [trimsCostPerPc, setTrimsCostPerPc] = React.useState(1.8);
  const [samMinutes, setSamMinutes] = React.useState(18.5);
  const [laborRatePerMinute, setLaborRatePerMinute] = React.useState(0.15);
  const [overheadCostPerPc, setOverheadCostPerPc] = React.useState(1.2);
  const [packagingCostPerPc, setPackagingCostPerPc] = React.useState(0.65);
  const [targetMarginPct, setTargetMarginPct] = React.useState(22);

  // Live Calculated Costs
  const liveFabricCost = Number((fabricConsumptionKg * fabricRatePerKg).toFixed(2));
  const liveLaborCost = Number((samMinutes * laborRatePerMinute).toFixed(2));
  const liveFactoryCost = Number(
    (liveFabricCost + trimsCostPerPc + liveLaborCost + overheadCostPerPc + packagingCostPerPc).toFixed(2)
  );
  const liveFobPrice = Number((liveFactoryCost * (1 + targetMarginPct / 100)).toFixed(2));
  const liveTotalContract = Number((liveFobPrice * batchQuantity).toFixed(2));

  // ---------------------------------------------------------------------------
  // DATA LOADING
  // ---------------------------------------------------------------------------
  const loadData = React.useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const [cstRes, metRes, ordRes] = await Promise.all([
        fetch("/api/costing").then((r) => (r.ok ? r.json() : { success: false, data: [] })).catch(() => ({ success: false, data: [] })),
        fetch("/api/costing/metrics").then((r) => (r.ok ? r.json() : { success: false, data: null })).catch(() => ({ success: false, data: null })),
        fetch("/api/orders").then((r) => (r.ok ? r.json() : { success: false, data: [] })).catch(() => ({ success: false, data: [] })),
      ]);

      if (cstRes.success && Array.isArray(cstRes.data)) {
        setEstimates(cstRes.data);
      }
      if (metRes.success && metRes.data) {
        setMetrics(metRes.data);
      }
      if (ordRes.success && Array.isArray(ordRes.data)) {
        setOrdersList(ordRes.data);
      }

      if (showToast) {
        success("Costing Data Refreshed", { description: "Loaded live pre-costing estimates and FOB models from MySQL." });
      }
    } catch (err: any) {
      console.error("Error loading costing data:", err);
      if (showToast) {
        toastError("Failed to Load Costing Data", { description: err.message });
      }
    } finally {
      setLoading(false);
    }
  }, [success, toastError]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler when selecting an order from dropdown
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    if (!orderId) return;
    const ord = ordersList.find((o) => String(o.id) === orderId || o.orderNumber === orderId);
    if (ord) {
      if (ord.styleCode) setStyleCode(ord.styleCode);
      if (ord.totalQuantity || ord.quantity) setBatchQuantity(Number(ord.totalQuantity || ord.quantity));
      if (ord.currency) setCurrency(ord.currency);
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: CREATE ESTIMATE
  // ---------------------------------------------------------------------------
  const handleSaveEstimate = async () => {
    try {
      const res = await fetch("/api/costing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId || undefined,
          styleCode,
          batchQuantity: Number(batchQuantity),
          currency,
          fabricConsumptionKg: Number(fabricConsumptionKg),
          fabricRatePerKg: Number(fabricRatePerKg),
          trimsCostPerPc: Number(trimsCostPerPc),
          samMinutes: Number(samMinutes),
          laborRatePerMinute: Number(laborRatePerMinute),
          overheadCostPerPc: Number(overheadCostPerPc),
          packagingCostPerPc: Number(packagingCostPerPc),
          targetMarginPct: Number(targetMarginPct),
        }),
      });

      const json = await res.json();
      if (json.success) {
        success("Cost Estimate Created", {
          description: `Estimate for ${styleCode} saved into MySQL with FOB price Rs ${liveFobPrice}/pc.`,
        });
        setViewMode("list");
        loadData();
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      toastError("Failed to Create Estimate", { description: err.message });
    }
  };

  // ---------------------------------------------------------------------------
  // FILTERING & PAGINATION
  // ---------------------------------------------------------------------------
  const filteredEstimates = React.useMemo(() => {
    return estimates.filter((cst) => {
      const matchesSearch =
        searchQuery === "" ||
        cst.estimateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cst.styleCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || cst.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [estimates, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredEstimates.length / ITEMS_PER_PAGE) || 1;
  const paginatedEstimates = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEstimates.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEstimates, currentPage]);

  // ---------------------------------------------------------------------------
  // RENDER: CREATE ESTIMATION STUDIO (VIEW 1)
  // ---------------------------------------------------------------------------
  if (viewMode === "create") {
    return (
      <>
        <TopNav title="Create Pre-Costing Estimate" />

        <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6 animate-in fade-in-0 duration-200">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                    BOM Pre-Costing & FOB Engine
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Formula Pricing
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculate garment FOB pricing based on fabric yield, trims, Standard Allowed Minutes (SAM), and margins.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              <Button variant="secondary" size="md" onClick={() => setViewMode("list")}>
                Cancel
              </Button>
              <Button variant="primary" size="md" leftIcon={<Save className="h-4 w-4" />} onClick={handleSaveEstimate}>
                Save Cost Estimate
              </Button>
            </div>
          </div>

          {/* Form Canvas: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
            {/* Left Column: Form Sections (8 cols) */}
            <div className="lg:col-span-8 space-y-6 min-w-0">
              <Card>
                <FormSection
                  title="1. Style & Order Batch"
                  description="Specify garment style reference, linked sales contract, and production batch size"
                  gridClassName="block space-y-4 w-full"
                >
                  <div className="mb-4">
                    <FormField label="Link to Sales Order (Optional)">
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                        value={selectedOrderId}
                        onChange={(e) => handleSelectOrder(e.target.value)}
                      >
                        <option value="">-- Stand-alone Style Pre-Costing (No Order Linked) --</option>
                        {ordersList.map((ord) => (
                          <option key={ord.id} value={String(ord.id)}>
                            {ord.orderNumber} — {ord.clientName} ({ord.styleCode || "Standard Style"}, {ord.totalQuantity || ord.quantity || 500} pcs)
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField label="Style Code" required>
                      <Input value={styleCode} onChange={(e) => setStyleCode(e.target.value)} placeholder="e.g. HD-380" />
                    </FormField>
                    <FormField label="Batch Order Quantity" required>
                      <Input
                        type="number"
                        value={batchQuantity}
                        onChange={(e) => setBatchQuantity(parseInt(e.target.value, 10) || 1)}
                      />
                    </FormField>
                    <FormField label="Quotation Currency">
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        <option value="PKR">PKR (Rs)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </FormField>
                  </div>
                </FormSection>
              </Card>

              <Card>
                <FormSection
                  title="2. Fabric Yield & Trims BOM"
                  description="Raw material consumption formulas"
                  gridClassName="block space-y-4 w-full"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField label="Fabric Consumption (kg/pc)" required>
                      <Input
                        type="number"
                        step="0.01"
                        value={fabricConsumptionKg}
                        onChange={(e) => setFabricConsumptionKg(parseFloat(e.target.value) || 0)}
                      />
                    </FormField>
                    <FormField label="Fabric Rate (Rs/kg)" required>
                      <Input
                        type="number"
                        step="0.1"
                        value={fabricRatePerKg}
                        onChange={(e) => setFabricRatePerKg(parseFloat(e.target.value) || 0)}
                      />
                    </FormField>
                    <FormField label="Trims & Accessories (Rs/pc)" required>
                      <Input
                        type="number"
                        step="0.05"
                        value={trimsCostPerPc}
                        onChange={(e) => setTrimsCostPerPc(parseFloat(e.target.value) || 0)}
                      />
                    </FormField>
                  </div>
                </FormSection>
              </Card>

              <Card>
                <FormSection
                  title="3. Labor SAM & Factory Overheads"
                  description="Standard Allowed Minute (SAM) labor rates and factory operational costs"
                  gridClassName="block space-y-4 w-full"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <FormField label="Sewing SAM (Minutes)" required>
                      <Input
                        type="number"
                        step="0.5"
                        value={samMinutes}
                        onChange={(e) => setSamMinutes(parseFloat(e.target.value) || 0)}
                      />
                    </FormField>
                    <FormField label="Labor Rate (Rs/min)" required>
                      <Input
                        type="number"
                        step="0.01"
                        value={laborRatePerMinute}
                        onChange={(e) => setLaborRatePerMinute(parseFloat(e.target.value) || 0)}
                      />
                    </FormField>
                    <FormField label="Overheads (Rs/pc)" required>
                      <Input
                        type="number"
                        step="0.05"
                        value={overheadCostPerPc}
                        onChange={(e) => setOverheadCostPerPc(parseFloat(e.target.value) || 0)}
                      />
                    </FormField>
                    <FormField label="Packaging (Rs/pc)" required>
                      <Input
                        type="number"
                        step="0.05"
                        value={packagingCostPerPc}
                        onChange={(e) => setPackagingCostPerPc(parseFloat(e.target.value) || 0)}
                      />
                    </FormField>
                  </div>

                  <div className="mt-4">
                    <FormField label="Target Net Margin (%)" required>
                      <Input
                        type="number"
                        value={targetMarginPct}
                        onChange={(e) => setTargetMarginPct(parseFloat(e.target.value) || 0)}
                      />
                    </FormField>
                  </div>
                </FormSection>
              </Card>
            </div>

            {/* Right Column: Live FOB Cost Breakdown Preview (4 cols) */}
            <div className="lg:col-span-4 space-y-6 min-w-0">
              <Card className="sticky top-20">
                <CardHeader
                  title="FOB Quotation Summary"
                  description="Live cost structure breakdown"
                />

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Fabric Cost / Pc</span>
                    <span className="font-mono font-bold text-slate-900">Rs {liveFabricCost}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Trims & Labels / Pc</span>
                    <span className="font-mono font-bold text-slate-900">Rs {trimsCostPerPc}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Labor (SAM) Cost / Pc</span>
                    <span className="font-mono font-bold text-slate-900">Rs {liveLaborCost}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Factory Cost / Pc</span>
                    <span className="font-mono font-bold text-slate-900">Rs {liveFactoryCost}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Target Net Margin</span>
                    <span className="font-mono font-bold text-emerald-600">{targetMarginPct}%</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5 bg-blue-50/50 p-2 rounded-lg">
                    <span className="font-bold text-blue-900">Quoted FOB Price / Pc</span>
                    <span className="font-mono font-bold text-blue-700 text-lg">Rs {liveFobPrice}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Total Contract Value</span>
                    <span className="font-mono font-bold text-slate-900">
                      Rs {liveTotalContract.toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      className="w-full justify-center"
                      leftIcon={<Save className="h-4 w-4" />}
                      onClick={handleSaveEstimate}
                    >
                      Save Cost Estimate
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAIN COSTING DASHBOARD (VIEW 2)
  // ---------------------------------------------------------------------------
  return (
    <>
      <TopNav title="Pre-Costing & FOB Estimation Studio" />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Cost Estimation & FOB Pricing"
          description="Build authoritative garment cost sheets with fabric consumption yield, trims BOM, SAM labor rates, and commercial profit margins."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
                onClick={() => loadData(true)}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setViewMode("create")}
              >
                New Cost Estimate
              </Button>
            </div>
          }
        />

        {/* Standardized 4 KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Estimates"
            value={metrics.totalEstimates || 0}
            sub="Cost sheets generated"
            icon={<Calculator className="h-5 w-5" />}
            iconColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Approved Quotes"
            value={metrics.approvedQuotes || 0}
            sub="Commercially signed off"
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Pending Review"
            value={metrics.pendingReview || 0}
            sub="Under merchandising review"
            icon={<Clock className="h-5 w-5" />}
            iconColor="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Average Margin %"
            value={`${metrics.averageMarginPct || 20}%`}
            sub="Factory target margin"
            icon={<Percent className="h-5 w-5" />}
            iconColor="bg-indigo-50 text-indigo-600"
          />
        </div>

        {/* Filter & Search Bar */}
        <Card noPadding className="p-3.5 sm:p-4 bg-white border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Estimate # or Style Code..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none shadow-xs"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="review">Under Review</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {(searchQuery || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setCurrentPage(1);
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Cost Estimates Standard Table */}
        <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
          {filteredEstimates.length === 0 ? (
            <EmptyState
              title="No Cost Estimates Created"
              description="Create a pre-costing BOM sheet to estimate factory costs and FOB quotes."
              icon={<DollarSign className="h-6 w-6" />}
              actionLabel="New Estimate"
              onAction={() => setViewMode("create")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Estimate #</th>
                    <th className="px-4 py-3">Style Code</th>
                    <th className="px-4 py-3">Batch Qty</th>
                    <th className="px-4 py-3">Factory Cost / Pc</th>
                    <th className="px-4 py-3">Margin %</th>
                    <th className="px-4 py-3">FOB Price / Pc</th>
                    <th className="px-4 py-3">Total Value</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedEstimates.map((cst) => (
                    <tr key={cst.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">{cst.estimateNumber}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{cst.styleCode}</td>
                      <td className="px-4 py-3 text-slate-800">{(cst.batchQuantity || 0).toLocaleString()} Pcs</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">Rs {cst.factoryCostPerPc}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">{cst.netMarginPct}%</td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 text-base">Rs {cst.fobPricePerPc}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        Rs {(cst.totalContractValue || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={cst.status === "approved" ? "success" : "default"}>
                          {cst.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredEstimates.length > 0 && (
            <Pagination
              page={currentPage}
              pageSize={ITEMS_PER_PAGE}
              total={filteredEstimates.length}
              onPageChange={(page) => setCurrentPage(page)}
            />
          )}
        </Card>
      </div>
    </>
  );
}

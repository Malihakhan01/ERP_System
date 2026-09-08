"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { formatNumber } from "@/lib/utils/format";
import {
  BarChart3,
  Calendar,
  DollarSign,
  Factory,
  Warehouse,
  Users,
  HandCoins,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  CheckCircle2,
  Clock,
  Truck,
  Layers,
} from "lucide-react";
import {
  ProductionReportRow,
  MaterialConsumptionRow,
  InventoryReportRow,
  PurchaseReportRow,
  LaborCostReportRow,
  LineEfficiencyReportRow,
  OrderProfitabilityReportRow,
  ClientReceivableReportRow,
  InvoiceAgingReportRow,
  DispatchReportRow,
  TrackingPerformanceRow,
  ExecutiveFinancialSummaryData,
  DateFilterRange,
  generateReportCSV,
} from "@/lib/reports-engine";

export interface ReportingFilterOptionsData {
  clients: { id: string; name: string }[];
  products: { id: string; name: string }[];
  jobs: { id: string; number: string }[];
  lines: { code: string; name: string }[];
  suppliers: { id: string; name: string }[];
}

type ReportCategory =
  | "summary"
  | "production"
  | "material"
  | "inventory"
  | "purchase"
  | "labor"
  | "efficiency"
  | "profitability"
  | "receivables"
  | "aging"
  | "dispatch"
  | "tracking";

export default function ReportsPage() {
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = React.useState<ReportCategory>("summary");
  const [dateRangeType, setDateRangeType] = React.useState<DateFilterRange["type"]>("month");
  const [selectedClient, setSelectedClient] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  // Dropdown options
  const [filterOptions, setFilterOptions] = React.useState<ReportingFilterOptionsData>({
    clients: [],
    products: [],
    jobs: [],
    lines: [],
    suppliers: [],
  });

  // Report datasets
  const [summaryData, setSummaryData] = React.useState<ExecutiveFinancialSummaryData>({
    totalRevenue: 0,
    totalInvoiced: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalActualProductionCost: 0,
    totalMaterialCost: 0,
    totalLaborCost: 0,
    totalOverheadCost: 0,
    totalGrossProfit: 0,
    averageGrossMarginPercent: 0,
    totalDispatchedValue: 0,
    activeOrdersCount: 0,
    pendingDispatchesCount: 0,
    averageFloorEfficiency: 0,
  });

  const [productionRows, setProductionRows] = React.useState<ProductionReportRow[]>([]);
  const [materialRows, setMaterialRows] = React.useState<MaterialConsumptionRow[]>([]);
  const [inventoryRows, setInventoryRows] = React.useState<InventoryReportRow[]>([]);
  const [purchaseRows, setPurchaseRows] = React.useState<PurchaseReportRow[]>([]);
  const [laborRows, setLaborRows] = React.useState<LaborCostReportRow[]>([]);
  const [efficiencyRows, setEfficiencyRows] = React.useState<LineEfficiencyReportRow[]>([]);
  const [profitabilityRows, setProfitabilityRows] = React.useState<OrderProfitabilityReportRow[]>([]);
  const [receivableRows, setReceivableRows] = React.useState<ClientReceivableReportRow[]>([]);
  const [agingRows, setAgingRows] = React.useState<InvoiceAgingReportRow[]>([]);
  const [dispatchRows, setDispatchRows] = React.useState<DispatchReportRow[]>([]);
  const [trackingRows, setTrackingRows] = React.useState<TrackingPerformanceRow[]>([]);

  // Load Filter Options Once
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/reports?tab=options");
        const json = await res.json();
        if (mounted && json.success && json.data) {
          setFilterOptions(json.data);
        }
      } catch (e) {
        console.error("Filter options error:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Main Report Data Fetcher
  const loadReportData = React.useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        tab: activeTab,
        dateRangeType,
        clientId: selectedClient,
        status: selectedStatus,
      });

      const res = await fetch(`/api/reports?${queryParams.toString()}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || "Failed to load report data.");
      }

      const data = json.data;

      if (activeTab === "summary") {
        setSummaryData(data);
      } else if (activeTab === "production") {
        setProductionRows(data || []);
      } else if (activeTab === "material") {
        setMaterialRows(data || []);
      } else if (activeTab === "inventory") {
        setInventoryRows(data || []);
      } else if (activeTab === "purchase") {
        setPurchaseRows(data || []);
      } else if (activeTab === "labor") {
        setLaborRows(data || []);
      } else if (activeTab === "efficiency") {
        setEfficiencyRows(data || []);
      } else if (activeTab === "profitability") {
        setProfitabilityRows(data || []);
      } else if (activeTab === "receivables") {
        setReceivableRows(data || []);
      } else if (activeTab === "aging") {
        setAgingRows(data || []);
      } else if (activeTab === "dispatch") {
        setDispatchRows(data || []);
      } else if (activeTab === "tracking") {
        setTrackingRows(data || []);
      }
    } catch (err: unknown) {
      console.error("Report data load error:", err);
      toastError("Failed to fetch authoritative report data from MySQL.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateRangeType, selectedClient, selectedStatus, toastError]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          tab: activeTab,
          dateRangeType,
          clientId: selectedClient,
          status: selectedStatus,
        });

        const res = await fetch(`/api/reports?${queryParams.toString()}`);
        const json = await res.json();

        if (mounted && json.success && json.data) {
          const data = json.data;
          if (activeTab === "summary") setSummaryData(data);
          else if (activeTab === "production") setProductionRows(data || []);
          else if (activeTab === "material") setMaterialRows(data || []);
          else if (activeTab === "inventory") setInventoryRows(data || []);
          else if (activeTab === "purchase") setPurchaseRows(data || []);
          else if (activeTab === "labor") setLaborRows(data || []);
          else if (activeTab === "efficiency") setEfficiencyRows(data || []);
          else if (activeTab === "profitability") setProfitabilityRows(data || []);
          else if (activeTab === "receivables") setReceivableRows(data || []);
          else if (activeTab === "aging") setAgingRows(data || []);
          else if (activeTab === "dispatch") setDispatchRows(data || []);
          else if (activeTab === "tracking") setTrackingRows(data || []);
        }
      } catch (err: unknown) {
        console.error("Report data load error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeTab, dateRangeType, selectedClient, selectedStatus]);

  // Export Filtered CSV Handler
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      let csvContent = "";
      const filename = `FactoryOS_${activeTab.toUpperCase()}_Report_${dateRangeType}.csv`;

      if (activeTab === "production") {
        const headers = ["Job Number", "Order #", "Client", "Product", "Planned Qty", "Cut", "Stitched", "Finished", "QA Passed", "Packed", "Dispatched", "Completion %", "Stage", "Status"];
        const rows = productionRows.map((r) => [r.jobNumber, r.orderNumber, r.clientName, r.productName, r.plannedQty, r.cutQty, r.stitchedQty, r.finishedQty, r.qaPassedQty, r.packedQty, r.dispatchedQty, `${r.completionPercent}%`, r.stage, r.status]);
        csvContent = generateReportCSV("Production Performance Report", headers, rows);
      } else if (activeTab === "material") {
        const headers = ["Material Code", "Name", "Category", "Std Req", "Issued", "Returned", "Actual Consumption", "Unit Cost", "Std Cost", "Actual Cost", "Variance ($)", "Variance %", "Status"];
        const rows = materialRows.map((r) => [r.materialCode, r.materialName, r.category, r.standardRequiredQty, r.issuedQty, r.returnedQty, r.actualConsumptionQty, r.unitCost, r.standardCost, r.actualCost, r.varianceAmount, `${r.variancePercent}%`, r.status]);
        csvContent = generateReportCSV("Material Consumption & Variance Report", headers, rows);
      } else if (activeTab === "inventory") {
        const headers = ["Material Code", "Name", "Category", "Current Stock", "Allocated", "Available", "Reorder Level", "Unit Cost", "Total Valuation", "Status"];
        const rows = inventoryRows.map((r) => [r.materialCode, r.materialName, r.category, r.openingStock, r.allocatedStock, r.availableStock, r.reorderLevel, r.unitCost, r.totalValuation, r.reorderStatus]);
        csvContent = generateReportCSV("Inventory Valuation Report", headers, rows);
      } else if (activeTab === "profitability") {
        const headers = ["Order #", "Client", "Product", "Ordered Qty", "Revenue", "Standard Cost", "Actual Cost", "Gross Profit", "Gross Margin %", "Invoiced", "Paid", "Outstanding", "Status"];
        const rows = profitabilityRows.map((r) => [r.orderNumber, r.clientName, r.productName, r.orderedQty, r.contractRevenue, r.standardCost, r.actualCost, r.grossProfit, `${r.grossMarginPercent}%`, r.invoicedAmount, r.paidAmount, r.outstandingBalance, r.status]);
        csvContent = generateReportCSV("Order Profitability Report", headers, rows);
      } else if (activeTab === "receivables") {
        const headers = ["Client", "Country", "Active POs", "Total Invoiced", "Total Paid", "Outstanding Balance", "Overdue", "Collection Rate %"];
        const rows = receivableRows.map((r) => [r.clientName, r.country, r.activeOrdersCount, r.totalInvoiced, r.totalPaid, r.totalOutstanding, r.overdueBalance, `${r.collectionRatePercent}%`]);
        csvContent = generateReportCSV("Client Receivables & Aging Report", headers, rows);
      } else if (activeTab === "aging") {
        const headers = ["Invoice #", "Order #", "Client", "Issue Date", "Due Date", "Total", "Paid", "Balance Due", "Days Overdue", "Aging Bucket", "Status"];
        const rows = agingRows.map((r) => [r.invoiceNumber, r.orderNumber, r.clientName, r.issueDate, r.dueDate, r.invoiceTotal, r.paidAmount, r.balanceDue, r.daysOverdue, r.agingBucket, r.status]);
        csvContent = generateReportCSV("Invoice Aging Report", headers, rows);
      } else if (activeTab === "dispatch") {
        const headers = ["Dispatch #", "Order #", "Client", "Destination", "Carrier", "Tracking #", "Cartons", "Pieces", "Gross Weight (kg)", "Net Weight (kg)", "Date", "Status"];
        const rows = dispatchRows.map((r) => [r.dispatchNumber, r.orderNumber, r.clientName, `${r.destinationCity}, ${r.destinationCountry}`, r.carrier, r.carrierTrackingNumber, r.totalCartons, r.totalPieces, r.grossWeightKg, r.netWeightKg, r.dispatchDate, r.status]);
        csvContent = generateReportCSV("Dispatch & Export Logistics Report", headers, rows);
      } else if (activeTab === "efficiency") {
        const headers = ["Line Code", "Line Name", "Active Job", "Operators", "Daily Target", "Actual Output", "Rejected", "Rework", "Efficiency %", "Status"];
        const rows = efficiencyRows.map((r) => [r.lineCode, r.lineName, r.activeJobNumber, r.allocatedOperators, r.dailyTarget, r.actualOutput, r.rejectedPieces, r.reworkPieces, `${r.efficiencyPercent}%`, r.status]);
        csvContent = generateReportCSV("Production Line Efficiency Report", headers, rows);
      } else {
        const headers = ["Metric", "Value"];
        const rows = [
          ["Total Revenue", summaryData.totalRevenue],
          ["Total Invoiced", summaryData.totalInvoiced],
          ["Total Collected", summaryData.totalCollected],
          ["Total Outstanding", summaryData.totalOutstanding],
          ["Total Actual Production Cost", summaryData.totalActualProductionCost],
          ["Total Gross Profit", summaryData.totalGrossProfit],
          ["Average Gross Margin %", `${summaryData.averageGrossMarginPercent}%`],
          ["Floor Efficiency", `${summaryData.averageFloorEfficiency}%`],
        ];
        csvContent = generateReportCSV("Executive Financial Summary", headers, rows);
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      success("Report Exported", { description: `Real data CSV spreadsheet downloaded: ${filename}` });
    } catch (e: unknown) {
      console.error("Export error:", e);
      toastError("Failed to generate CSV export.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const resetFilters = () => {
    setSelectedClient("all");
    setSelectedStatus("all");
    setSearchQuery("");
    setDateRangeType("month");
  };

  return (
    <>
      <TopNav title="Reports & Real-Time Analytics" />

      <div className="max-w-[1440px] mx-auto p-4 sm:p-6 space-y-6 pb-16 animate-in fade-in-0 duration-200">
        {/* ========================================================= */}
        {/* 1. TOP HEADER & EXPORT TOOLBAR                            */}
        {/* ========================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Executive Reports & Production Analytics
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Authoritative reporting layer aggregating live production, costing, inventory, and commercial records from MySQL 8 database.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${loading ? "animate-spin" : ""}`} />}
              onClick={loadReportData}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />}
              onClick={handleExportCSV}
              disabled={isExporting || loading}
            >
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Printer className="h-3.5 w-3.5 text-slate-700" />}
              onClick={handlePrintPDF}
            >
              Print PDF
            </Button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. REPORT CATEGORY NAVIGATION TABS                        */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "summary" as const, label: "Executive Summary", icon: DollarSign },
              { id: "production" as const, label: "Production & Floor Output", icon: Factory },
              { id: "material" as const, label: "Material Consumption & Variance", icon: Layers },
              { id: "inventory" as const, label: "Inventory Valuation", icon: Warehouse },
              { id: "efficiency" as const, label: "Line Efficiency", icon: BarChart3 },
              { id: "profitability" as const, label: "Order Profitability", icon: TrendingUp },
              { id: "receivables" as const, label: "Client Receivables", icon: Users },
              { id: "aging" as const, label: "Invoice Aging", icon: Clock },
              { id: "dispatch" as const, label: "Dispatch & Export", icon: Truck },
              { id: "labor" as const, label: "Labor Cost & Piece Rates", icon: HandCoins },
              { id: "tracking" as const, label: "9-Gate Shipment Tracking", icon: CheckCircle2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm ring-2 ring-blue-500/20"
                      : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. TIME PERIOD & FILTER TOOLBAR                           */}
        {/* ========================================================= */}
        <Card className="p-3.5 sm:p-4 bg-white border-slate-200/80 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 rounded-2xl">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0 bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              Time Horizon:
            </span>
            <select
              value={dateRangeType}
              onChange={(e) => setDateRangeType(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs shrink-0"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">Current Month</option>
              <option value="last_month">Last Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>

            {filterOptions.clients.length > 0 && (
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs max-w-[200px] truncate"
              >
                <option value="all">All Clients ({filterOptions.clients.length})</option>
                {filterOptions.clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs shrink-0"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active / In Progress</option>
              <option value="completed">Completed / Dispatched</option>
              <option value="pending">Pending</option>
            </select>

            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-800">
              Reset Filters
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium shrink-0 bg-emerald-50/80 border border-emerald-200/80 px-3 py-1.5 rounded-xl self-start xl:self-center">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-emerald-800 text-[11px]">MySQL 8 Database Connected</span>
          </div>
        </Card>

        {/* ========================================================= */}
        {/* 4. TAB 1: EXECUTIVE FINANCIAL SUMMARY                     */}
        {/* ========================================================= */}
        {activeTab === "summary" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
              <StatCard
                label="Total Contract Revenue"
                value={`$${formatNumber(summaryData.totalRevenue)}`}
                sub={`${summaryData.activeOrdersCount} Active Work Orders`}
              />
              <StatCard
                label="Total Commercial Invoiced"
                value={`$${formatNumber(summaryData.totalInvoiced)}`}
                sub={`Collected: $${formatNumber(summaryData.totalCollected)}`}
              />
              <StatCard
                label="Total Outstanding Balance"
                value={`$${formatNumber(summaryData.totalOutstanding)}`}
                trend={{
                  value: summaryData.totalOutstanding > 0 ? "Receivable" : "Settled",
                  direction: summaryData.totalOutstanding > 0 ? "up" : "down",
                }}
              />
              <StatCard
                label="Actual Production Cost"
                value={`$${formatNumber(summaryData.totalActualProductionCost)}`}
                sub={`Material + Direct Labor + Overhead`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
              <StatCard
                label="Net Production Gross Profit"
                value={`$${formatNumber(summaryData.totalGrossProfit)}`}
                trend={{
                  value: `${summaryData.averageGrossMarginPercent}% Margin`,
                  direction: summaryData.totalGrossProfit >= 0 ? "up" : "down",
                }}
              />
              <StatCard
                label="Material Consumption Cost"
                value={`$${formatNumber(summaryData.totalMaterialCost)}`}
                sub="Direct Warehouse Issues"
              />
              <StatCard
                label="Direct Labor & Piece Rates"
                value={`$${formatNumber(summaryData.totalLaborCost)}`}
                sub="Sewing Logs & Attendance"
              />
              <StatCard
                label="Average Sewing Efficiency"
                value={`${summaryData.averageFloorEfficiency}%`}
                sub="Target vs Output"
              />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. TAB 2: PRODUCTION PERFORMANCE REPORT                   */}
        {/* ========================================================= */}
        {activeTab === "production" && (
          <div className="space-y-6">
            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Production Performance & Work Order Lifecycle ({productionRows.length} Jobs)
                </h3>
              </div>

              {productionRows.length === 0 ? (
                <EmptyState
                  icon={<Factory className="h-6 w-6" />}
                  title="No Production Records Found"
                  description="No production jobs match the selected filters in PostgreSQL database."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-3">Job Number</th>
                        <th className="py-3 px-3">Order #</th>
                        <th className="py-3 px-3">Client</th>
                        <th className="py-3 px-3">Product</th>
                        <th className="py-3 px-3 text-right">Planned</th>
                        <th className="py-3 px-3 text-right">Cut</th>
                        <th className="py-3 px-3 text-right">Stitched</th>
                        <th className="py-3 px-3 text-right">Finished</th>
                        <th className="py-3 px-3 text-right">QA Passed</th>
                        <th className="py-3 px-3 text-right">Packed</th>
                        <th className="py-3 px-3 text-right">Dispatched</th>
                        <th className="py-3 px-3 text-center">Progress</th>
                        <th className="py-3 px-3">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {productionRows.map((row) => (
                        <tr key={row.jobId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{row.jobNumber}</td>
                          <td className="py-3 px-3 text-slate-600">{row.orderNumber}</td>
                          <td className="py-3 px-3 text-slate-700">{row.clientName}</td>
                          <td className="py-3 px-3 text-slate-700">{row.productName}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">{row.plannedQty}</td>
                          <td className="py-3 px-3 text-right text-slate-600">{row.cutQty}</td>
                          <td className="py-3 px-3 text-right text-slate-600">{row.stitchedQty}</td>
                          <td className="py-3 px-3 text-right text-slate-600">{row.finishedQty}</td>
                          <td className="py-3 px-3 text-right text-emerald-600 font-bold">{row.qaPassedQty}</td>
                          <td className="py-3 px-3 text-right text-blue-600 font-bold">{row.packedQty}</td>
                          <td className="py-3 px-3 text-right text-indigo-600 font-bold">{row.dispatchedQty}</td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={row.completionPercent >= 100 ? "success" : "primary"}>
                              {row.completionPercent}%
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="default">{row.stage.toUpperCase()}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. TAB 3: MATERIAL CONSUMPTION & VARIANCE                 */}
        {/* ========================================================= */}
        {activeTab === "material" && (
          <div className="space-y-6">
            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Material Consumption & Cost Variance ({materialRows.length} Items)
                </h3>
              </div>

              {materialRows.length === 0 ? (
                <EmptyState
                  icon={<Layers className="h-6 w-6" />}
                  title="No Material Records Found"
                  description="No material issuance records exist for the selected horizon."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-3">Code</th>
                        <th className="py-3 px-3">Material Name</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3 text-right">Std Req</th>
                        <th className="py-3 px-3 text-right">Issued</th>
                        <th className="py-3 px-3 text-right">Returned</th>
                        <th className="py-3 px-3 text-right">Actual Consumed</th>
                        <th className="py-3 px-3 text-right">Unit Cost</th>
                        <th className="py-3 px-3 text-right">Actual Cost</th>
                        <th className="py-3 px-3 text-right">Variance ($)</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {materialRows.map((row) => (
                        <tr key={row.materialId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{row.materialCode}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{row.materialName}</td>
                          <td className="py-3 px-3 text-slate-600">{row.category}</td>
                          <td className="py-3 px-3 text-right text-slate-600">{row.standardRequiredQty} {row.unit}</td>
                          <td className="py-3 px-3 text-right text-slate-600">{row.issuedQty} {row.unit}</td>
                          <td className="py-3 px-3 text-right text-slate-600">{row.returnedQty} {row.unit}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {row.actualConsumptionQty > 0 ? `${row.actualConsumptionQty} ${row.unit}` : "0"}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">${row.unitCost.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">${row.actualCost.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-mono">
                            {row.varianceAmount > 0 ? (
                              <span className="text-rose-600">+{row.varianceAmount.toFixed(2)}</span>
                            ) : row.varianceAmount < 0 ? (
                              <span className="text-emerald-600">{row.varianceAmount.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-500">$0.00</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {row.status === "unrecorded" ? (
                              <span className="text-[11px] text-slate-400 italic">Actual consumption not recorded</span>
                            ) : (
                              <Badge variant={row.status === "favorable" ? "success" : row.status === "unfavorable" ? "danger" : "default"}>
                                {row.status.toUpperCase()}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* 7. TAB 4: INVENTORY VALUATION                             */}
        {/* ========================================================= */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Authoritative Inventory Stock & Valuation ({inventoryRows.length} Materials)
                </h3>
              </div>

              {inventoryRows.length === 0 ? (
                <EmptyState
                  icon={<Warehouse className="h-6 w-6" />}
                  title="No Inventory Items Found"
                  description="No items recorded in public.inventory_items."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-3">Code</th>
                        <th className="py-3 px-3">Material</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3 text-right">Current Stock</th>
                        <th className="py-3 px-3 text-right">Allocated</th>
                        <th className="py-3 px-3 text-right">Available</th>
                        <th className="py-3 px-3 text-right">Reorder Level</th>
                        <th className="py-3 px-3 text-right">Unit Cost</th>
                        <th className="py-3 px-3 text-right">Valuation ($)</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {inventoryRows.map((row) => (
                        <tr key={row.itemId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{row.materialCode}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{row.materialName}</td>
                          <td className="py-3 px-3 text-slate-600">{row.category}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">{row.openingStock} {row.unit}</td>
                          <td className="py-3 px-3 text-right text-slate-600">{row.allocatedStock} {row.unit}</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600">{row.availableStock} {row.unit}</td>
                          <td className="py-3 px-3 text-right text-slate-600">{row.reorderLevel} {row.unit}</td>
                          <td className="py-3 px-3 text-right text-slate-600">${row.unitCost.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">${row.totalValuation.toFixed(2)}</td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={row.reorderStatus === "adequate" ? "success" : row.reorderStatus === "reorder_needed" ? "warning" : "danger"}>
                              {row.reorderStatus === "adequate" ? "Adequate" : row.reorderStatus === "reorder_needed" ? "Reorder Needed" : "Critical Low"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* 8. TAB 5: PRODUCTION LINE EFFICIENCY                      */}
        {/* ========================================================= */}
        {activeTab === "efficiency" && (
          <div className="space-y-6">
            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Stitching Line Efficiency & Target Tracking ({efficiencyRows.length} Lines)
                </h3>
              </div>

              {efficiencyRows.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="h-6 w-6" />}
                  title="No Production Lines Configured"
                  description="No lines recorded in public.production_lines."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-3">Line Code</th>
                        <th className="py-3 px-3">Line Name</th>
                        <th className="py-3 px-3">Active Job</th>
                        <th className="py-3 px-3 text-right">Operators</th>
                        <th className="py-3 px-3 text-right">Daily Target</th>
                        <th className="py-3 px-3 text-right">Actual Output</th>
                        <th className="py-3 px-3 text-right">Rejections</th>
                        <th className="py-3 px-3 text-right">Rework</th>
                        <th className="py-3 px-3 text-center">Efficiency %</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {efficiencyRows.map((row) => (
                        <tr key={row.lineCode} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{row.lineCode}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{row.lineName}</td>
                          <td className="py-3 px-3 text-slate-600">{row.activeJobNumber}</td>
                          <td className="py-3 px-3 text-right text-slate-700">{row.allocatedOperators}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">{row.dailyTarget} pcs</td>
                          <td className="py-3 px-3 text-right font-bold text-blue-600">{row.actualOutput} pcs</td>
                          <td className="py-3 px-3 text-right text-rose-600 font-bold">{row.rejectedPieces}</td>
                          <td className="py-3 px-3 text-right text-amber-600 font-bold">{row.reworkPieces}</td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={row.efficiencyPercent >= 85 ? "success" : row.efficiencyPercent >= 60 ? "warning" : "danger"}>
                              {row.efficiencyPercent}%
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="default">{row.status.toUpperCase()}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* 9. TAB 6: ORDER PROFITABILITY                             */}
        {/* ========================================================= */}
        {activeTab === "profitability" && (
          <div className="space-y-6">
            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Work Order Profitability & Margin Analysis ({profitabilityRows.length} Orders)
                </h3>
              </div>

              {profitabilityRows.length === 0 ? (
                <EmptyState
                  icon={<TrendingUp className="h-6 w-6" />}
                  title="No Order Profitability Records"
                  description="No sales orders exist matching current filters."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-3">Order Number</th>
                        <th className="py-3 px-3">Client</th>
                        <th className="py-3 px-3 text-right">Contract Revenue</th>
                        <th className="py-3 px-3 text-right">Std Cost</th>
                        <th className="py-3 px-3 text-right">Actual Cost</th>
                        <th className="py-3 px-3 text-right">Gross Profit</th>
                        <th className="py-3 px-3 text-center">Margin %</th>
                        <th className="py-3 px-3 text-right">Invoiced</th>
                        <th className="py-3 px-3 text-right">Paid</th>
                        <th className="py-3 px-3 text-right">Outstanding</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {profitabilityRows.map((row) => (
                        <tr key={row.orderId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{row.orderNumber}</td>
                          <td className="py-3 px-3 text-slate-700">{row.clientName}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">${formatNumber(row.contractRevenue)}</td>
                          <td className="py-3 px-3 text-right text-slate-600">${formatNumber(row.standardCost)}</td>
                          <td className="py-3 px-3 text-right text-slate-600">${formatNumber(row.actualCost)}</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600">${formatNumber(row.grossProfit)}</td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={row.grossMarginPercent >= 25 ? "success" : "warning"}>
                              {row.grossMarginPercent}%
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right text-slate-700">${formatNumber(row.invoicedAmount)}</td>
                          <td className="py-3 px-3 text-right text-emerald-600 font-bold">${formatNumber(row.paidAmount)}</td>
                          <td className="py-3 px-3 text-right text-rose-600 font-bold">${formatNumber(row.outstandingBalance)}</td>
                          <td className="py-3 px-3">
                            <Badge variant="default">{row.status.toUpperCase()}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* 10. TAB 7: CLIENT RECEIVABLES                             */}
        {/* ========================================================= */}
        {activeTab === "receivables" && (
          <div className="space-y-6">
            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Client Receivables Ledger & Collection Rates ({receivableRows.length} Clients)
                </h3>
              </div>

              {receivableRows.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title="No Client Records Found"
                  description="No clients recorded in public.clients."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-3">Client Name</th>
                        <th className="py-3 px-3">Country</th>
                        <th className="py-3 px-3 text-right">Active POs</th>
                        <th className="py-3 px-3 text-right">Total Invoiced</th>
                        <th className="py-3 px-3 text-right">Total Collected</th>
                        <th className="py-3 px-3 text-right">Outstanding Balance</th>
                        <th className="py-3 px-3 text-right">Overdue</th>
                        <th className="py-3 px-3 text-center">Collection Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {receivableRows.map((row) => (
                        <tr key={row.clientId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{row.clientName}</td>
                          <td className="py-3 px-3 text-slate-600">{row.country}</td>
                          <td className="py-3 px-3 text-right text-slate-700">{row.activeOrdersCount}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">${formatNumber(row.totalInvoiced)}</td>
                          <td className="py-3 px-3 text-right text-emerald-600 font-bold">${formatNumber(row.totalPaid)}</td>
                          <td className="py-3 px-3 text-right text-rose-600 font-bold">${formatNumber(row.totalOutstanding)}</td>
                          <td className="py-3 px-3 text-right text-amber-600 font-bold">${formatNumber(row.overdueBalance)}</td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={row.collectionRatePercent >= 80 ? "success" : row.collectionRatePercent >= 50 ? "warning" : "danger"}>
                              {row.collectionRatePercent}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* 11. TAB 8: INVOICE AGING REPORT                           */}
        {/* ========================================================= */}
        {activeTab === "aging" && (
          <div className="space-y-6">
            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Commercial Invoice Aging & Overdue Buckets ({agingRows.length} Invoices)
                </h3>
              </div>

              {agingRows.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-6 w-6" />}
                  title="No Invoices Found"
                  description="No invoices recorded in public.invoices."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-3">Invoice #</th>
                        <th className="py-3 px-3">Order #</th>
                        <th className="py-3 px-3">Client</th>
                        <th className="py-3 px-3">Due Date</th>
                        <th className="py-3 px-3 text-right">Grand Total</th>
                        <th className="py-3 px-3 text-right">Paid</th>
                        <th className="py-3 px-3 text-right">Balance Due</th>
                        <th className="py-3 px-3 text-right">Days Overdue</th>
                        <th className="py-3 px-3 text-center">Aging Bucket</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {agingRows.map((row) => (
                        <tr key={row.invoiceId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{row.invoiceNumber}</td>
                          <td className="py-3 px-3 text-slate-600">{row.orderNumber}</td>
                          <td className="py-3 px-3 text-slate-700">{row.clientName}</td>
                          <td className="py-3 px-3 text-slate-600">{new Date(row.dueDate).toLocaleDateString()}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">${formatNumber(row.invoiceTotal)}</td>
                          <td className="py-3 px-3 text-right text-emerald-600 font-bold">${formatNumber(row.paidAmount)}</td>
                          <td className="py-3 px-3 text-right text-rose-600 font-bold">${formatNumber(row.balanceDue)}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-800">{row.daysOverdue} d</td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={row.agingBucket === "current" ? "success" : row.agingBucket === "1_30_days" ? "warning" : "danger"}>
                              {row.agingBucket.replace(/_/g, " ").toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="default">{row.status.toUpperCase()}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* 12. TAB 9: DISPATCH & EXPORT LOGISTICS                    */}
        {/* ========================================================= */}
        {activeTab === "dispatch" && (
          <div className="space-y-6">
            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Export Shipments & Cargo Logistics ({dispatchRows.length} Dispatches)
                </h3>
              </div>

              {dispatchRows.length === 0 ? (
                <EmptyState
                  icon={<Truck className="h-6 w-6" />}
                  title="No Dispatch Records Found"
                  description="No shipments recorded in public.dispatch_records."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-3">Dispatch #</th>
                        <th className="py-3 px-3">Order #</th>
                        <th className="py-3 px-3">Client</th>
                        <th className="py-3 px-3">Destination</th>
                        <th className="py-3 px-3">Carrier</th>
                        <th className="py-3 px-3">Tracking #</th>
                        <th className="py-3 px-3 text-right">Cartons</th>
                        <th className="py-3 px-3 text-right">Pieces</th>
                        <th className="py-3 px-3 text-right">Gross Wt (kg)</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {dispatchRows.map((row) => (
                        <tr key={row.dispatchId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{row.dispatchNumber}</td>
                          <td className="py-3 px-3 text-slate-600">{row.orderNumber}</td>
                          <td className="py-3 px-3 text-slate-700">{row.clientName}</td>
                          <td className="py-3 px-3 text-slate-700">{row.destinationCity ? `${row.destinationCity}, ` : ""}{row.destinationCountry}</td>
                          <td className="py-3 px-3 text-slate-600">{row.carrier}</td>
                          <td className="py-3 px-3 font-mono text-slate-600">{row.carrierTrackingNumber}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">{row.totalCartons}</td>
                          <td className="py-3 px-3 text-right font-bold text-blue-600">{row.totalPieces}</td>
                          <td className="py-3 px-3 text-right text-slate-600">{row.grossWeightKg}</td>
                          <td className="py-3 px-3 text-slate-600">{new Date(row.dispatchDate).toLocaleDateString()}</td>
                          <td className="py-3 px-3">
                            <Badge variant="success">{row.status.toUpperCase()}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* 13. TAB 10: LABOR COST & PIECE RATES                      */}
        {/* ========================================================= */}
        {activeTab === "labor" && (
          <div className="space-y-6">
            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Floor Labor Cost, Overtime & Piece Rates ({laborRows.length} Employees)
                </h3>
              </div>

              {laborRows.length === 0 ? (
                <EmptyState
                  icon={<HandCoins className="h-6 w-6" />}
                  title="No Employee Records Found"
                  description="No workforce records in public.employees."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-3">Emp #</th>
                        <th className="py-3 px-3">Name</th>
                        <th className="py-3 px-3">Dept</th>
                        <th className="py-3 px-3">Wage Model</th>
                        <th className="py-3 px-3 text-right">Present Days</th>
                        <th className="py-3 px-3 text-right">OT Hours</th>
                        <th className="py-3 px-3 text-right">Piece Units</th>
                        <th className="py-3 px-3 text-right">Piece Earnings</th>
                        <th className="py-3 px-3 text-right">Gross Labor Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {laborRows.map((row) => (
                        <tr key={row.employeeId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{row.employeeNumber}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{row.fullName}</td>
                          <td className="py-3 px-3 text-slate-600">{row.department}</td>
                          <td className="py-3 px-3"><Badge variant="default">{row.wageModel.toUpperCase()}</Badge></td>
                          <td className="py-3 px-3 text-right text-slate-700">{row.presentDays} d</td>
                          <td className="py-3 px-3 text-right text-amber-600 font-bold">{row.overtimeHours} hrs</td>
                          <td className="py-3 px-3 text-right text-blue-600 font-bold">{row.pieceRatePieces} pcs</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">${row.pieceRateEarnings.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600">${row.netLaborCost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* 14. TAB 11: 9-GATE SHIPMENT TRACKING                      */}
        {/* ========================================================= */}
        {activeTab === "tracking" && (
          <div className="space-y-6">
            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  9-Gate Milestone Shipment Performance ({trackingRows.length} Shipments)
                </h3>
              </div>

              {trackingRows.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  title="No Tracking Shipments Found"
                  description="No shipments recorded in public.tracking_shipments."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-3">Tracking Number</th>
                        <th className="py-3 px-3">Order #</th>
                        <th className="py-3 px-3">Job #</th>
                        <th className="py-3 px-3">Client</th>
                        <th className="py-3 px-3 text-center">Milestone Gate</th>
                        <th className="py-3 px-3">Stage</th>
                        <th className="py-3 px-3">Carrier</th>
                        <th className="py-3 px-3">Last Updated</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {trackingRows.map((row) => (
                        <tr key={row.trackingId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-blue-600">{row.trackingNumber}</td>
                          <td className="py-3 px-3 text-slate-600">{row.orderNumber}</td>
                          <td className="py-3 px-3 text-slate-600">{row.jobNumber}</td>
                          <td className="py-3 px-3 text-slate-700">{row.clientName}</td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant="primary">Gate {row.currentGate} / 9</Badge>
                          </td>
                          <td className="py-3 px-3"><Badge variant="default">{row.currentStage.toUpperCase()}</Badge></td>
                          <td className="py-3 px-3 text-slate-600">{row.carrier}</td>
                          <td className="py-3 px-3 text-slate-500">{new Date(row.lastEventTime).toLocaleDateString()}</td>
                          <td className="py-3 px-3"><Badge variant="success">{row.status.toUpperCase()}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

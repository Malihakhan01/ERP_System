"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard, Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { EmptyState, Pagination } from "@/components/ui/Misc";
import { FormField, FormSection } from "@/components/forms/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  Truck,
  Plus,
  Search,
  Box,
  RotateCcw,
  CheckCircle2,
  Clock,
  ScanLine,
  ArrowLeft,
  Save,
  Container,
  FileSpreadsheet,
  Anchor,
  Layers,
  RefreshCw,
} from "lucide-react";
import type { DispatchRecord, DispatchKPIData } from "@/lib/mysql/dispatch-db";

const ITEMS_PER_PAGE = 10;

export default function DispatchPage() {
  const { success, error: toastError } = useToast();

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [dispatches, setDispatches] = React.useState<DispatchRecord[]>([]);
  const [readyCartons, setReadyCartons] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // View Navigation
  const [activeTab, setActiveTab] = React.useState<"queue" | "dispatches" | "manifest" | "scanner">("queue");
  const [viewMode, setViewMode] = React.useState<"list" | "create" | "detail">("list");
  const [selectedDispatch, setSelectedDispatch] = React.useState<DispatchRecord | null>(null);

  // Filtering & Pagination
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Metrics
  const [metrics, setMetrics] = React.useState<DispatchKPIData>({
    readyForDispatch: 0,
    scheduledShipments: 0,
    loadedToday: 0,
    dispatchedToday: 0,
    inTransit: 0,
    delivered: 0,
  });

  // ---------------------------------------------------------------------------
  // CREATE SHIPMENT STUDIO STATE
  // ---------------------------------------------------------------------------
  const [carrierName, setCarrierName] = React.useState("Maersk Line Logistics");
  const [containerNumber, setContainerNumber] = React.useState("MSCU-884920-1");
  const [sealNumber, setSealNumber] = React.useState("SL-994821");
  const [shippingMethod, setShippingMethod] = React.useState("Sea Freight (FCL)");
  const [destinationPort, setDestinationPort] = React.useState("Port of Rotterdam (NLRTM)");
  const [selectedCartonIds, setSelectedCartonIds] = React.useState<string[]>([]);

  // Barcode Scanner State
  const [scanInput, setScanInput] = React.useState("");
  const [scanResult, setScanResult] = React.useState<any>(null);
  const [scanMessage, setScanMessage] = React.useState("");

  // ---------------------------------------------------------------------------
  // DATA LOADING
  // ---------------------------------------------------------------------------
  const loadData = React.useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const [dispRes, cartRes, metRes] = await Promise.all([
        fetch("/api/dispatch").then((r) => (r.ok ? r.json() : { success: false, data: [] })).catch(() => ({ success: false, data: [] })),
        fetch("/api/dispatch/cartons").then((r) => (r.ok ? r.json() : { success: false, data: [] })).catch(() => ({ success: false, data: [] })),
        fetch("/api/dispatch/metrics").then((r) => (r.ok ? r.json() : { success: false, data: null })).catch(() => ({ success: false, data: null })),
      ]);

      if (dispRes.success && Array.isArray(dispRes.data)) {
        setDispatches(dispRes.data);
      }
      if (cartRes.success && Array.isArray(cartRes.data)) {
        setReadyCartons(cartRes.data);
      }
      if (metRes.success && metRes.data) {
        setMetrics(metRes.data);
      }

      if (showToast) {
        success("Dispatch Data Refreshed", { description: "Loaded live export manifests and staging queue from MySQL." });
      }
    } catch (err: any) {
      console.error("Error loading dispatch data:", err);
      if (showToast) {
        toastError("Failed to Load Dispatch Data", { description: err.message });
      }
    } finally {
      setLoading(false);
    }
  }, [success, toastError]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // ACTIONS: CREATE DISPATCH
  // ---------------------------------------------------------------------------
  const handleSaveDispatch = async () => {
    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrierName,
          containerNumber,
          sealNumber,
          shippingMethod,
          destinationPort,
          selectedCartonIds: selectedCartonIds.length > 0 ? selectedCartonIds : readyCartons.map((c) => c.id),
        }),
      });

      const json = await res.json();
      if (json.success) {
        success("Export Dispatch Created", {
          description: `Container ${containerNumber} scheduled for export and logged in MySQL.`,
        });
        setViewMode("list");
        setActiveTab("dispatches");
        loadData();
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      toastError("Failed to Create Dispatch", { description: err.message });
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: SCAN & LOAD CARTON
  // ---------------------------------------------------------------------------
  const handleScanAndLoad = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanInput.trim()) return;

    setScanMessage("");
    try {
      const res = await fetch("/api/dispatch/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartonBarcode: scanInput.trim() }),
      });

      const json = await res.json();
      if (json.success) {
        success("Carton Loaded into Container", { description: `Barcode ${scanInput} validated & marked DISPATCHED.` });
        setScanMessage(`Carton ${scanInput} successfully loaded into container.`);
        setScanInput("");
        loadData();
      } else {
        setScanMessage(json.message || "Failed to validate barcode.");
      }
    } catch (err: any) {
      setScanMessage(err.message || "Scan error.");
    }
  };

  // ---------------------------------------------------------------------------
  // FILTERING & PAGINATION
  // ---------------------------------------------------------------------------
  const filteredDispatches = React.useMemo(() => {
    return dispatches.filter((disp) => {
      const matchesSearch =
        searchQuery === "" ||
        disp.dispatchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        disp.carrierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        disp.containerNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        disp.clientName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || disp.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [dispatches, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredDispatches.length / ITEMS_PER_PAGE) || 1;
  const paginatedDispatches = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDispatches.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDispatches, currentPage]);

  // ---------------------------------------------------------------------------
  // RENDER: CREATE DISPATCH STUDIO (VIEW 1)
  // ---------------------------------------------------------------------------
  if (viewMode === "create") {
    return (
      <>
        <TopNav title="Create Export Dispatch Shipment" />

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
                    Schedule Container Export Dispatch
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    FCL / LCL Ocean Logistics
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign master packing cartons, container seal numbers, and export shipping lines.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              <Button variant="secondary" size="md" onClick={() => setViewMode("list")}>
                Cancel
              </Button>
              <Button variant="primary" size="md" leftIcon={<Save className="h-4 w-4" />} onClick={handleSaveDispatch}>
                Confirm & Schedule Dispatch
              </Button>
            </div>
          </div>

          {/* Form Canvas: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
            {/* Left Column: Form Sections (8 cols) */}
            <div className="lg:col-span-8 space-y-6 min-w-0">
              <Card>
                <FormSection
                  title="1. Ocean Freight & Carrier Details"
                  description="Specify global freight line, container numbers, and seal integrity records"
                  gridClassName="block space-y-4 w-full"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Shipping Line / Carrier" required>
                      <Input value={carrierName} onChange={(e) => setCarrierName(e.target.value)} />
                    </FormField>

                    <FormField label="Shipping Method" required>
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        value={shippingMethod}
                        onChange={(e) => setShippingMethod(e.target.value)}
                      >
                        <option value="Sea Freight (FCL)">Sea Freight (FCL 40ft High Cube)</option>
                        <option value="Sea Freight (LCL)">Sea Freight (LCL Consolidated)</option>
                        <option value="Air Freight Express">Air Freight Priority Express</option>
                      </select>
                    </FormField>

                    <FormField label="Container Number" required>
                      <Input value={containerNumber} onChange={(e) => setContainerNumber(e.target.value)} />
                    </FormField>

                    <FormField label="Customs High-Security Seal #" required>
                      <Input value={sealNumber} onChange={(e) => setSealNumber(e.target.value)} />
                    </FormField>
                  </div>

                  <FormField label="Destination Port of Discharge" required>
                    <Input value={destinationPort} onChange={(e) => setDestinationPort(e.target.value)} />
                  </FormField>
                </FormSection>
              </Card>

              <Card>
                <FormSection
                  title="2. Select Staged Master Cartons"
                  description="Choose verified master cartons for this container manifest"
                  gridClassName="block space-y-4 w-full"
                >
                  {readyCartons.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No staged cartons available. (All cartons will be auto-assigned).</p>
                  ) : (
                    <div className="space-y-2">
                      {readyCartons.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/80 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              defaultChecked
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCartonIds((prev) => [...prev, c.id]);
                                } else {
                                  setSelectedCartonIds((prev) => prev.filter((id) => id !== c.id));
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600"
                            />
                            <div>
                              <span className="font-mono font-bold text-slate-900">{c.cartonNumber}</span>
                              <span className="text-slate-500 font-mono ml-2">({c.cartonBarcode})</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-blue-600">{c.totalUnitsInCarton} Pcs</span>
                            <span className="font-mono text-slate-700">{c.grossWeightKg} kg</span>
                            <Badge variant="success">STAGED</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </FormSection>
              </Card>
            </div>

            {/* Right Column: Live Manifest Preview (4 cols) */}
            <div className="lg:col-span-4 space-y-6 min-w-0">
              <Card className="sticky top-20">
                <CardHeader
                  title="Export Manifest Summary"
                  description="Container lading specs"
                />

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Shipping Line</span>
                    <span className="font-bold text-slate-900">{carrierName}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Container #</span>
                    <span className="font-mono font-bold text-purple-600">{containerNumber}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Seal #</span>
                    <span className="font-mono font-bold text-slate-800">{sealNumber}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Total Cartons</span>
                    <span className="font-bold text-blue-600 font-mono">
                      {selectedCartonIds.length > 0 ? selectedCartonIds.length : readyCartons.length || 2} Cartons
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Destination</span>
                    <span className="font-medium text-slate-900 truncate max-w-[180px]">{destinationPort}</span>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      className="w-full justify-center"
                      leftIcon={<Save className="h-4 w-4" />}
                      onClick={handleSaveDispatch}
                    >
                      Confirm Export Dispatch
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
  // RENDER: MAIN DISPATCH DASHBOARD (VIEW 2)
  // ---------------------------------------------------------------------------
  return (
    <>
      <TopNav title="Export Dispatch & Shipping Management" />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Export Dispatch & Shipping"
          description="Manage ocean and air container manifests, customs seals, Bill of Lading documentation, and export transit milestones."
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
                Create Shipment
              </Button>
            </div>
          }
        />

        {/* Standardized 6 KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Ready For Dispatch"
            value={`${metrics.readyForDispatch || 0} Cartons`}
            sub="Staged on loading bay"
            icon={<Box className="h-5 w-5" />}
            iconColor="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Scheduled Shipments"
            value={metrics.scheduledShipments || 0}
            sub="Active export bookings"
            icon={<Clock className="h-5 w-5" />}
            iconColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Loaded Today"
            value={`${metrics.loadedToday || 0} Cartons`}
            sub="Stuffed into containers"
            icon={<Container className="h-5 w-5" />}
            iconColor="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            label="Dispatched Today"
            value={`${(metrics.dispatchedToday || 0).toLocaleString()} Pcs`}
            sub="Ex-factory cleared"
            icon={<Truck className="h-5 w-5" />}
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="In Transit"
            value={metrics.inTransit || 0}
            sub="Ocean / air shipments"
            icon={<Anchor className="h-5 w-5" />}
            iconColor="bg-purple-50 text-purple-600"
          />
          <StatCard
            label="Delivered"
            value={metrics.delivered || 0}
            sub="Arrived at buyer port"
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconColor="bg-teal-50 text-teal-600"
          />
        </div>

        {/* Clean Navigation Tabs */}
        <Card noPadding className="border-slate-200/80 shadow-xs bg-white overflow-x-auto">
          <div className="flex items-center gap-1 border-b border-slate-200 px-4 pt-2">
            <button
              onClick={() => setActiveTab("queue")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                activeTab === "queue"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Box className="h-4 w-4" /> Dispatch Queue ({readyCartons.length})
            </button>
            <button
              onClick={() => setActiveTab("dispatches")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                activeTab === "dispatches"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Truck className="h-4 w-4" /> Active Dispatches ({dispatches.length})
            </button>
            <button
              onClick={() => setActiveTab("manifest")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                activeTab === "manifest"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" /> Export Manifests
            </button>
            <button
              onClick={() => setActiveTab("scanner")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                activeTab === "scanner"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <ScanLine className="h-4 w-4" /> Container Loading Scanner
            </button>
          </div>
        </Card>

        {/* TAB 1: DISPATCH QUEUE */}
        {activeTab === "queue" && (
          <Card noPadding className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cartons Staged For Container Stuffing</h3>
                <p className="text-xs text-slate-500">Master cartons packed and staged on the warehouse dock</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setViewMode("create")}>
                Schedule Dispatch
              </Button>
            </div>

            {readyCartons.length === 0 ? (
              <EmptyState
                title="No Cartons Waiting in Queue"
                description="Pack and verify master cartons in the Packing Module to stage for dispatch."
                icon={<Box className="h-6 w-6" />}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Carton #</th>
                      <th className="px-4 py-3">Barcode</th>
                      <th className="px-4 py-3">Job / Style</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Gross Weight</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {readyCartons.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.cartonNumber}</td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-bold">{c.cartonBarcode}</td>
                        <td className="px-4 py-3 text-xs text-slate-800">{c.jobNumber} ({c.styleCode})</td>
                        <td className="px-4 py-3 font-bold text-blue-600">{c.totalUnitsInCarton} Pcs</td>
                        <td className="px-4 py-3 font-mono text-xs">{c.grossWeightKg} kg</td>
                        <td className="px-4 py-3">
                          <Badge variant="success">{c.status.toUpperCase()}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* TAB 2: ACTIVE DISPATCHES */}
        {activeTab === "dispatches" && (
          <>
            {/* Filter & Search Bar */}
            <Card noPadding className="p-3.5 sm:p-4 bg-white border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by Dispatch #, Carrier, Container #, or Buyer..."
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
                      <option value="all">All Shipments</option>
                      <option value="in_transit">In Transit</option>
                      <option value="ready_for_dispatch">Ready</option>
                      <option value="delivered">Delivered</option>
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

            {/* Dispatches Table */}
            <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
              {filteredDispatches.length === 0 ? (
                <EmptyState
                  title="No Dispatches Scheduled"
                  description="Schedule a container shipment from the dispatch queue."
                  icon={<Truck className="h-6 w-6" />}
                  actionLabel="Schedule Dispatch"
                  onAction={() => setViewMode("create")}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Dispatch #</th>
                        <th className="px-4 py-3">Carrier / Line</th>
                        <th className="px-4 py-3">Container #</th>
                        <th className="px-4 py-3">Cartons / Pieces</th>
                        <th className="px-4 py-3">Destination</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Dispatched Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedDispatches.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-blue-600">{d.dispatchNumber}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{d.carrierName}</td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-purple-700">{d.containerNumber}</td>
                          <td className="px-4 py-3 text-xs">
                            <span className="font-bold text-slate-900">{d.totalCartons} Ctn</span> /{" "}
                            <span className="text-blue-600 font-bold">{d.totalPieces} Pcs</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700">{d.destinationPort}</td>
                          <td className="px-4 py-3">
                            <Badge variant={d.status === "delivered" ? "success" : "primary"}>
                              {d.status.replace(/_/g, " ").toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{d.createdAt?.split("T")[0] || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {filteredDispatches.length > 0 && (
                <Pagination
                  page={currentPage}
                  pageSize={ITEMS_PER_PAGE}
                  total={filteredDispatches.length}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              )}
            </Card>
          </>
        )}

        {/* TAB 3: EXPORT MANIFEST */}
        {activeTab === "manifest" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader
                title="Bill of Lading & Commercial Invoice"
                description="Customs documentation attached to export dispatches"
              />
              <div className="space-y-3 mt-4 text-xs">
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700">Commercial Invoice:</span>
                  <span className="font-mono font-bold text-slate-900">INV-2026-001 (Rs 22,000)</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700">Packing List Lading:</span>
                  <span className="font-mono font-bold text-slate-900">PKL-2026-001 (74 Pcs • 36.2 kg)</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700">Certificate of Origin:</span>
                  <span className="font-mono font-bold text-emerald-700">Form A (GSP+ Compliant)</span>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Container Seal Verification"
                description="High-security bolt seal integrity check"
              />
              <div className="space-y-3 mt-4 text-xs">
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700">Primary Container:</span>
                  <span className="font-mono font-bold text-purple-700">MSCU-884920-1 (40ft HC)</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700">Bolt Seal Number:</span>
                  <span className="font-mono font-bold text-slate-900">SL-994821</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700">Inspection Check:</span>
                  <Badge variant="success">SEAL LOCKED & TAMPER-FREE</Badge>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: CONTAINER LOADING SCANNER */}
        {activeTab === "scanner" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader
                title="Container Loading Barcode Scanner"
                description="Scan master carton barcodes as they are loaded into the ocean container"
              />

              <form onSubmit={handleScanAndLoad} className="space-y-4 mt-2">
                <FormField label="Scan Master Carton Barcode (e.g. PKG-2026-0001)">
                  <div className="flex gap-2">
                    <Input
                      placeholder="PKG-2026-0001"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      className="font-mono"
                    />
                    <Button type="submit" variant="primary" leftIcon={<ScanLine className="h-4 w-4" />}>
                      Scan & Mark Loaded
                    </Button>
                  </div>
                </FormField>

                {scanMessage && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs font-semibold">
                    {scanMessage}
                  </div>
                )}
              </form>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

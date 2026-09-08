"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard, Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalFooter, ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState, ProgressBar, Pagination } from "@/components/ui/Misc";
import { FormField, FormSection } from "@/components/forms/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  Box,
  Plus,
  Search,
  Package,
  Layers,
  CheckCircle2,
  Truck,
  RotateCcw,
  Barcode,
  ArrowLeft,
  Save,
  ScanLine,
  Weight,
  Clock,
  RefreshCw,
  QrCode,
  FileCheck,
  Printer,
  Tag,
} from "lucide-react";
import type { PackingCartonRecord, PackingQueueItem, PackingKPIData } from "@/lib/services/packing-service";
import { getProductionJobsFromSupabase, ProductionJobRecord } from "@/lib/services/production-service";
import { useBarcodeScanner, BarcodeScannerBanner } from "@/lib/hooks/useBarcodeScanner";
import { MasterCartonShippingLabel } from "@/components/packing/MasterCartonShippingLabel";

const ITEMS_PER_PAGE = 10;

export default function PackingPage() {
  const { success, error: toastError } = useToast();

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [cartons, setCartons] = React.useState<PackingCartonRecord[]>([]);
  const [queueItems, setQueueItems] = React.useState<PackingQueueItem[]>([]);
  const [productionJobs, setProductionJobs] = React.useState<ProductionJobRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  // View Navigation
  const [activeTab, setActiveTab] = React.useState<"queue" | "cartons" | "scanner">("queue");
  const [viewMode, setViewMode] = React.useState<"list" | "create" | "detail">("list");
  const [selectedCarton, setSelectedCarton] = React.useState<PackingCartonRecord | null>(null);

  // Filtering & Pagination
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Metrics
  const [metrics, setMetrics] = React.useState<PackingKPIData>({
    pendingPacking: 0,
    packingToday: 0,
    packedPieces: 0,
    cartonsCreated: 0,
    pendingPieces: 0,
    packingCompletionPct: 0,
    dispatchReady: 0,
  });

  // ---------------------------------------------------------------------------
  // CREATE CARTON STUDIO STATE
  // ---------------------------------------------------------------------------
  const [selectedJobId, setSelectedJobId] = React.useState("");
  const [formPackingType, setFormPackingType] = React.useState("Master Solid Carton");
  const [formLengthCm, setFormLengthCm] = React.useState(60);
  const [formWidthCm, setFormWidthCm] = React.useState(40);
  const [formHeightCm, setFormHeightCm] = React.useState(35);
  const [formGrossWeight, setFormGrossWeight] = React.useState(12.5);
  const [formNetWeight, setFormNetWeight] = React.useState(11.2);
  const [formPackedBy, setFormPackedBy] = React.useState("Packing Floor Lead");
  const [cartonItems, setCartonItems] = React.useState<Array<{ size: string; colorway: string; quantity: number }>>([
    { size: "S", colorway: "Standard", quantity: 6 },
    { size: "M", colorway: "Standard", quantity: 12 },
    { size: "L", colorway: "Standard", quantity: 6 },
  ]);

  // Barcode Scanner State
  const [scanInput, setScanInput] = React.useState("");
  const [scannedCarton, setScannedCarton] = React.useState<any>(null);
  const [scanError, setScanError] = React.useState("");
  const [selectedLabelCarton, setSelectedLabelCarton] = React.useState<PackingCartonRecord | null>(null);

  // Global Hardware Barcode Scanner Listener Hook
  const { lastScannedBarcode, scanPulse, playAudioBeep } = useBarcodeScanner({
    onScan: (barcode) => {
      setScanInput(barcode);
      const matched = cartons.find(
        (c) =>
          (c.cartonBarcode && c.cartonBarcode.toLowerCase() === barcode.toLowerCase()) ||
          (c.cartonNumber && c.cartonNumber.toLowerCase() === barcode.toLowerCase()) ||
          (c.productionJobId && c.productionJobId.toLowerCase() === barcode.toLowerCase())
      );

      if (matched) {
        setScannedCarton({
          carton_number: matched.cartonNumber,
          carton_barcode: matched.cartonBarcode || `CTN-${matched.cartonNumber}-2026`,
          total_units_in_carton: matched.totalUnitsInCarton,
          gross_weight_kg: matched.grossWeightKg,
          status: matched.status,
          items: matched.sizeBreakdown
            ? Object.entries(matched.sizeBreakdown).map(([size, quantity]) => ({ size, colorway: "Standard", quantity }))
            : [],
        });
        setScanError("");
        setActiveTab("scanner");
        success(`Hardware Scan: ${matched.cartonNumber}`, {
          description: `Matched master carton with ${matched.totalUnitsInCarton} units.`,
        });
      } else {
        playAudioBeep("error");
        setScanError(`No carton matched barcode "${barcode}".`);
        toastError("Unrecognized Barcode", {
          description: `Scanned code "${barcode}" is not registered in active packing queue.`,
        });
      }
    },
  });

  // ---------------------------------------------------------------------------
  // DATA LOADING
  // ---------------------------------------------------------------------------
  const loadData = React.useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      // 1. Fetch Cartons & Queue concurrently
      const [cartRes, qRes, jobs, metRes] = await Promise.all([
        fetch("/api/packing").then((r) => (r.ok ? r.json() : { success: false, data: [] })).catch(() => ({ success: false, data: [] })),
        fetch("/api/packing?view=queue").then((r) => (r.ok ? r.json() : { success: false, data: [] })).catch(() => ({ success: false, data: [] })),
        getProductionJobsFromSupabase().catch(() => []),
        fetch("/api/packing/metrics").then((r) => (r.ok ? r.json() : { success: false, data: null })).catch(() => ({ success: false, data: null })),
      ]);

      if (cartRes.success && Array.isArray(cartRes.data)) {
        setCartons(cartRes.data);
      }
      if (qRes.success && Array.isArray(qRes.data)) {
        setQueueItems(qRes.data);
      }
      if (Array.isArray(jobs) && jobs.length > 0) {
        setProductionJobs(jobs);
      }
      if (metRes.success && metRes.data) {
        setMetrics(metRes.data);
      }

      if (showToast) {
        success("Packing Data Refreshed", { description: "Loaded live master cartons and queue from MySQL." });
      }
    } catch (err: any) {
      console.error("Error loading packing data:", err);
      if (showToast) {
        toastError("Failed to Load Packing Data", { description: err.message || "Network request failed." });
      }
    } finally {
      setLoading(false);
    }
  }, [success, toastError]);

  React.useEffect(() => {
    loadData();
  }, []);

  const handleStartPacking = (job: ProductionJobRecord) => {
    setSelectedJobId(job.id);
    const totalUnits = cartonItems.reduce((sum, item) => sum + item.quantity, 0);
    setFormGrossWeight(Number((totalUnits * 0.45 + 1.2).toFixed(2)));
    setFormNetWeight(Number((totalUnits * 0.45).toFixed(2)));
    setViewMode("create");
  };

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: CREATE MASTER CARTON
  // ---------------------------------------------------------------------------
  const handleSaveCarton = async () => {
    if (!selectedJobId) {
      toastError("Validation Error", { description: "Please select a production work order." });
      return;
    }

    const totalUnits = cartonItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalUnits <= 0) {
      toastError("Validation Error", { description: "Carton must contain at least 1 unit." });
      return;
    }

    try {
      const res = await fetch("/api/packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionJobId: selectedJobId,
          packingType: formPackingType,
          totalUnitsInCarton: totalUnits,
          grossWeightKg: Number(formGrossWeight),
          netWeightKg: Number(formNetWeight),
          lengthCm: Number(formLengthCm),
          widthCm: Number(formWidthCm),
          heightCm: Number(formHeightCm),
          packedBy: formPackedBy,
          items: cartonItems,
        }),
      });

      const json = await res.json();
      if (json.success) {
        success("Master Carton Created", {
          description: `Carton with ${totalUnits} Pcs generated with barcode and saved in MySQL.`,
        });
        setViewMode("list");
        setActiveTab("cartons");
        loadData();
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      toastError("Failed to Create Carton", { description: err.message });
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: SCAN BARCODE
  // ---------------------------------------------------------------------------
  const handleScanLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanInput.trim()) return;

    setScanError("");
    try {
      const res = await fetch(`/api/packing/verify?barcode=${encodeURIComponent(scanInput.trim())}`);
      const json = await res.json();
      if (json.success && json.data) {
        setScannedCarton(json.data);
        success("Carton Verified", { description: `Found master carton ${json.data.carton_number}` });
      } else {
        setScannedCarton(null);
        setScanError(json.message || "Carton not found with this barcode.");
      }
    } catch (err: any) {
      setScanError(err.message || "Lookup failed.");
    }
  };

  // ---------------------------------------------------------------------------
  // FILTERING & PAGINATION
  // ---------------------------------------------------------------------------
  const filteredCartons = React.useMemo(() => {
    return cartons.filter((carton) => {
      const matchesSearch =
        searchQuery === "" ||
        carton.cartonNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        carton.cartonBarcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        carton.packedBy?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || carton.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [cartons, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredCartons.length / ITEMS_PER_PAGE) || 1;
  const paginatedCartons = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCartons.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCartons, currentPage]);

  const selectedJob = productionJobs.find((j) => j.id === selectedJobId);
  const totalCartonPieces = cartonItems.reduce((sum, item) => sum + item.quantity, 0);

  // ---------------------------------------------------------------------------
  // RENDER: CREATE MASTER CARTON STUDIO (VIEW 1)
  // ---------------------------------------------------------------------------
  if (viewMode === "create") {
    return (
      <>
        <TopNav title="Create Master Packing Carton" />

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
                    Create Master Export Carton
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Packaging Floor Studio
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pack QA-approved garments into corrugated master cartons, generate barcodes, and stage for container dispatch.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              <Button variant="secondary" size="md" onClick={() => setViewMode("list")}>
                Cancel
              </Button>
              <Button variant="primary" size="md" leftIcon={<Save className="h-4 w-4" />} onClick={handleSaveCarton}>
                Generate & Save Carton
              </Button>
            </div>
          </div>

          {/* Form Canvas: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
            {/* Left Column: Form Sections (8 cols) */}
            <div className="lg:col-span-8 space-y-6 min-w-0">
              <Card>
                <FormSection
                  title="1. Source Production Work Order"
                  description="Select the QA-approved work order ready for export packaging"
                >
                  <FormField label="Select Production Job" required>
                    <select
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                      value={selectedJobId}
                      onChange={(e) => handleSelectJob(e.target.value)}
                    >
                      <option value="" disabled>-- Select Work Order --</option>
                      {productionJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.jobNumber} — {j.clientName} ({j.styleCode} • {(j.plannedQuantity || 0).toLocaleString()} Pcs)
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {selectedJob && (
                    <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 sm:grid-cols-4">
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Buyer</span>
                        <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">{selectedJob.clientName}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Garment Style</span>
                        <p className="mt-0.5 text-sm font-bold text-slate-900 font-mono">{selectedJob.styleCode}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">QA Passed Qty</span>
                        <p className="mt-0.5 text-sm font-bold text-emerald-600">{(selectedJob.totalQaPassedQuantity || selectedJob.plannedQuantity || 0).toLocaleString()} Pcs</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Already Packed</span>
                        <p className="mt-0.5 text-sm font-bold text-blue-600">{(selectedJob.totalPackedQuantity || 0).toLocaleString()} Pcs</p>
                      </div>
                    </div>
                  )}
                </FormSection>
              </Card>

              <Card>
                <FormSection
                  title="2. Carton Dimensions & Weights"
                  description="Specify corrugated carton specs, tare weights, and packing type"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField label="Packing Type">
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        value={formPackingType}
                        onChange={(e) => setFormPackingType(e.target.value)}
                      >
                        <option value="Master Solid Carton">Master Solid Carton (Single Size)</option>
                        <option value="Assorted Ratio Carton">Assorted Ratio Carton (S:M:L)</option>
                        <option value="Custom Buyer Pack">Custom Buyer Polybag Pack</option>
                      </select>
                    </FormField>

                    <FormField label="Gross Weight (KG)" required>
                      <Input
                        type="number"
                        step="0.01"
                        value={formGrossWeight}
                        onChange={(e) => setFormGrossWeight(parseFloat(e.target.value) || 0)}
                      />
                    </FormField>

                    <FormField label="Net Weight (KG)" required>
                      <Input
                        type="number"
                        step="0.01"
                        value={formNetWeight}
                        onChange={(e) => setFormNetWeight(parseFloat(e.target.value) || 0)}
                      />
                    </FormField>

                    <FormField label="Length (cm)">
                      <Input
                        type="number"
                        value={formLengthCm}
                        onChange={(e) => setFormLengthCm(parseInt(e.target.value, 10) || 0)}
                      />
                    </FormField>

                    <FormField label="Width (cm)">
                      <Input
                        type="number"
                        value={formWidthCm}
                        onChange={(e) => setFormWidthCm(parseInt(e.target.value, 10) || 0)}
                      />
                    </FormField>

                    <FormField label="Height (cm)">
                      <Input
                        type="number"
                        value={formHeightCm}
                        onChange={(e) => setFormHeightCm(parseInt(e.target.value, 10) || 0)}
                      />
                    </FormField>
                  </div>
                </FormSection>
              </Card>

              <Card>
                <FormSection
                  title="3. Packaged Items & Size Breakdown"
                  description="Configure the exact garments packed inside this master carton"
                >
                  <div className="space-y-3">
                    {cartonItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <FormField label="Size">
                          <Input
                            value={item.size}
                            onChange={(e) => {
                              const updated = [...cartonItems];
                              updated[idx].size = e.target.value;
                              setCartonItems(updated);
                            }}
                          />
                        </FormField>
                        <FormField label="Colorway">
                          <Input
                            value={item.colorway}
                            onChange={(e) => {
                              const updated = [...cartonItems];
                              updated[idx].colorway = e.target.value;
                              setCartonItems(updated);
                            }}
                          />
                        </FormField>
                        <FormField label="Quantity (Pieces)">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...cartonItems];
                              updated[idx].quantity = parseInt(e.target.value, 10) || 0;
                              setCartonItems(updated);
                              const totalUnits = updated.reduce((s, it) => s + it.quantity, 0);
                              setFormGrossWeight(Number((totalUnits * 0.45 + 1.2).toFixed(2)));
                              setFormNetWeight(Number((totalUnits * 0.45).toFixed(2)));
                            }}
                          />
                        </FormField>
                      </div>
                    ))}

                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() =>
                        setCartonItems((prev) => [...prev, { size: "XL", colorway: "Standard", quantity: 6 }])
                      }
                    >
                      Add Size Line
                    </Button>
                  </div>
                </FormSection>
              </Card>
            </div>

            {/* Right Column: Live Carton Preview (4 cols) */}
            <div className="lg:col-span-4 space-y-6 min-w-0">
              <Card className="sticky top-20">
                <CardHeader
                  title="Master Carton Summary"
                  description="Live packaging specification preview"
                />

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Carton Number</span>
                    <span className="font-mono font-bold text-slate-900">
                      CTN-{selectedJob ? selectedJob.jobNumber.replace("PRD-", "") : "2026"}-001
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Carton Barcode</span>
                    <span className="font-mono font-bold text-indigo-600">
                      PKG-{new Date().getFullYear()}-0001
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Total Units</span>
                    <span className="font-bold text-blue-600 font-mono">{totalCartonPieces} Pieces</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Gross Weight</span>
                    <span className="font-mono font-bold text-slate-900">{formGrossWeight} KG</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Dimensions</span>
                    <span className="font-mono text-slate-700">
                      {formLengthCm} × {formWidthCm} × {formHeightCm} cm
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Dispatch Status</span>
                    <Badge variant="success">READY</Badge>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      className="w-full justify-center"
                      leftIcon={<Save className="h-4 w-4" />}
                      onClick={handleSaveCarton}
                    >
                      Generate Master Carton
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
  // RENDER: MAIN PACKING DASHBOARD (VIEW 2)
  // ---------------------------------------------------------------------------
  return (
    <>
      <TopNav title="Packing, Cartonization & Staging Floor" />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Packing, Cartonization & Dispatch Staging"
          description="Manage master export cartons, polybag ratios, automated barcodes, and container dispatch preparation."
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
                onClick={() => {
                  const firstJob = productionJobs[0];
                  if (firstJob) setSelectedJobId(firstJob.id);
                  setViewMode("create");
                }}
              >
                Create Master Carton
              </Button>
            </div>
          }
        />

        {/* Standardized 6 KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Pending Packing"
            value={`${(metrics.pendingPacking || 0).toLocaleString()} Pcs`}
            sub="QA passed units awaiting pack"
            icon={<Clock className="h-5 w-5" />}
            iconColor="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Packing Today"
            value={`${(metrics.packingToday || 0).toLocaleString()} Pcs`}
            sub="Packed into cartons today"
            icon={<Layers className="h-5 w-5" />}
            iconColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Packed Pieces"
            value={`${(metrics.packedPieces || 0).toLocaleString()} Pcs`}
            sub="Total verified packaged units"
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Cartons Created"
            value={metrics.cartonsCreated || 0}
            sub="Master corrugated cartons"
            icon={<Box className="h-5 w-5" />}
            iconColor="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            label="Pending Pieces"
            value={`${(metrics.pendingPieces || 0).toLocaleString()} Pcs`}
            sub="Remaining order output"
            icon={<Package className="h-5 w-5" />}
            iconColor="bg-rose-50 text-rose-600"
          />
          <StatCard
            label="Dispatch Ready"
            value={metrics.dispatchReady || 0}
            sub="Cartons staged for container"
            icon={<Truck className="h-5 w-5" />}
            iconColor="bg-purple-50 text-purple-600"
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
              <FileCheck className="h-4 w-4" /> QA Approved Queue ({queueItems.length})
            </button>
            <button
              onClick={() => setActiveTab("cartons")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                activeTab === "cartons"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Box className="h-4 w-4" /> Master Cartons ({cartons.length})
            </button>
            <button
              onClick={() => setActiveTab("scanner")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                activeTab === "scanner"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <ScanLine className="h-4 w-4" /> Barcode Scanner Verification
            </button>
          </div>
        </Card>

        {/* TAB 1: QA APPROVED QUEUE */}
        {activeTab === "queue" && (
          <Card noPadding className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">QA Cleared Production Work Orders</h3>
              <p className="text-xs text-slate-500">Orders passed by quality assurance ready for polybag & carton packing</p>
            </div>

            {queueItems.length === 0 ? (
              <EmptyState
                title="Packing Queue is Empty"
                description="Complete quality assurance audits to release production lots to packing."
                icon={<Box className="h-6 w-6" />}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Work Order #</th>
                      <th className="px-4 py-3">Buyer</th>
                      <th className="px-4 py-3">Style Code</th>
                      <th className="px-4 py-3">Total Planned</th>
                      <th className="px-4 py-3">QA Approved</th>
                      <th className="px-4 py-3">Packed Quantity</th>
                      <th className="px-4 py-3">Remaining to Pack</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {queueItems.map((q) => {
                      const job = q.productionJob;
                      return (
                        <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">{job.jobNumber}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{job.clientName}</td>
                          <td className="px-4 py-3 font-mono text-slate-800">{job.styleCode}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {(job.plannedQuantity || 0).toLocaleString()} Pcs
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                            {(q.qaApprovedQuantity || 0).toLocaleString()} Pcs
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-blue-600">
                            {(q.alreadyPackedQuantity || 0).toLocaleString()} Pcs
                          </td>
                          <td className="px-4 py-3 font-mono text-amber-700 font-bold">
                            {(q.pendingQuantity || 0).toLocaleString()} Pcs
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="primary" size="sm" onClick={() => handleStartPacking(job)}>
                              Start Packing
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* TAB 2: MASTER CARTONS */}
        {activeTab === "cartons" && (
          <>
            {/* Filter & Search Bar */}
            <Card noPadding className="p-3.5 sm:p-4 bg-white border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by Carton #, Barcode, or Packed By..."
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
                      <option value="packed">Packed</option>
                      <option value="inspected">Inspected</option>
                      <option value="staged_for_dispatch">Staged for Dispatch</option>
                      <option value="dispatched">Dispatched</option>
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

            {/* Master Cartons Table */}
            <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
              {filteredCartons.length === 0 ? (
                <EmptyState
                  title="No Master Cartons Created"
                  description="Generate master cartons from the QA Approved Queue."
                  icon={<Box className="h-6 w-6" />}
                  actionLabel="Create Carton"
                  onAction={() => setViewMode("create")}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Carton #</th>
                        <th className="px-4 py-3">Barcode Tracking</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3">Gross / Net Weight</th>
                        <th className="px-4 py-3">Dimensions</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Packed By</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedCartons.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.cartonNumber}</td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">
                            {c.cartonBarcode}
                          </td>
                          <td className="px-4 py-3 font-semibold text-blue-600">
                            {c.totalUnitsInCarton} Pcs
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            <span className="font-bold text-slate-900">{c.grossWeightKg} kg</span> /{" "}
                            <span className="text-slate-500">{c.netWeightKg} kg</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {c.lengthCm}×{c.widthCm}×{c.heightCm} cm
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={c.status === "staged_for_dispatch" || c.status === "packed" ? "success" : "default"}>
                              {c.status.replace(/_/g, " ").toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700">{c.packedBy || "Floor Lead"}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedLabelCarton(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                              title="Print 4x6 Master Carton Label"
                            >
                              <Printer className="h-3.5 w-3.5 text-blue-600" />
                              <span>4x6 Label</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {filteredCartons.length > 0 && (
                <Pagination
                  page={currentPage}
                  pageSize={ITEMS_PER_PAGE}
                  total={filteredCartons.length}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              )}
            </Card>
          </>
        )}

        {/* TAB 3: BARCODE SCANNER VERIFICATION */}
        {activeTab === "scanner" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader
                title="Barcode Scanner & Verification"
                description="Scan master carton barcodes to verify contents and staging status"
              />

              <form onSubmit={handleScanLookup} className="space-y-4 mt-2">
                <FormField label="Scan or Enter Carton Barcode">
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. PKG-2026-0001 or CTN-001-001"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      className="font-mono"
                    />
                    <Button type="submit" variant="primary" leftIcon={<ScanLine className="h-4 w-4" />}>
                      Verify
                    </Button>
                  </div>
                </FormField>

                {scanError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                    {scanError}
                  </div>
                )}
              </form>

              {scannedCarton && (
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs text-slate-500 font-semibold uppercase">Verified Carton</span>
                    <span className="font-mono font-bold text-slate-900">{scannedCarton.carton_number}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-slate-500">Barcode Reference</span>
                      <p className="font-mono font-bold text-indigo-600">{scannedCarton.carton_barcode}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Total Units Packed</span>
                      <p className="font-bold text-blue-600">{scannedCarton.total_units_in_carton} Pieces</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Gross Weight</span>
                      <p className="font-mono text-slate-900">{scannedCarton.gross_weight_kg} KG</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Status</span>
                      <Badge variant="success">{scannedCarton.status.toUpperCase()}</Badge>
                    </div>
                  </div>

                  {scannedCarton.items && scannedCarton.items.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-xs font-bold uppercase text-slate-700">Packed Items:</span>
                      <div className="mt-2 space-y-1">
                        {scannedCarton.items.map((it: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs font-mono text-slate-700">
                            <span>Size: {it.size} ({it.colorway})</span>
                            <span className="font-bold">{it.quantity} Pcs</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* 4x6" Commercial Master Carton Shipping Label Modal */}
      <MasterCartonShippingLabel
        carton={selectedLabelCarton}
        isOpen={Boolean(selectedLabelCarton)}
        onClose={() => setSelectedLabelCarton(null)}
      />

      {/* Hardware Barcode Scanner Status Banner */}
      <BarcodeScannerBanner activeBarcode={lastScannedBarcode} pulse={scanPulse} />
    </>
  );
}

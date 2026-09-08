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
  Factory,
  Plus,
  Search,
  Shirt,
  CheckSquare,
  Box,
  ArrowLeft,
  Save,
  Scissors,
  Layers,
  Calendar,
  Package,
  FileText,
  Archive,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  UserCheck,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  getProductionJobsFromSupabase,
  createProductionJobInSupabase,
  deleteProductionJobInSupabase,
  ProductionJobRecord,
  CuttingPlanRecord,
  ProductionBundleRecord,
  OperatorProductionLogRecord,
  ProductionMaterialIssueRecord,
  ProductionLineRecord,
  ProductionStatus,
} from "@/lib/services/production-service";
import type { FinishingOperationRecord } from "@/lib/services/finishing-service";
import { getOrdersFromSupabase } from "@/lib/services/orders-service";
import { type OrderRecord, INITIAL_ORDERS } from "@/lib/orders-engine";
import { getEmployeesFromSupabase } from "@/lib/services/employees-service";
import type { EmployeeRecord } from "@/lib/employees-engine";
import { getInventoryFromSupabase, InventoryItem } from "@/lib/services/inventory-service";

export const STAGE_CONFIG: Record<
  string,
  { label: string; variant: "primary" | "warning" | "info" | "success" | "default"; icon: React.ElementType }
> = {
  planning: { label: "Planning", variant: "default", icon: Calendar },
  material_ready: { label: "Material Ready", variant: "info", icon: Package },
  cutting: { label: "In Cutting", variant: "warning", icon: Scissors },
  cutting_completed: { label: "Cutting Completed", variant: "success", icon: CheckCircle2 },
  ready_for_stitching: { label: "Ready for Stitching", variant: "primary", icon: Shirt },
  stitching: { label: "In Stitching", variant: "primary", icon: Shirt },
  finishing: { label: "In Finishing", variant: "info", icon: Layers },
  qa: { label: "QA Inspection", variant: "warning", icon: CheckSquare },
  packed: { label: "Packed & Complete", variant: "success", icon: Box },
  completed: { label: "Completed", variant: "success", icon: CheckCircle2 },
};

export const STATUS_CONFIG: Record<
  ProductionStatus,
  { label: string; variant: "primary" | "warning" | "success" | "danger" | "default" }
> = {
  draft: { label: "Draft Spec", variant: "default" },
  released: { label: "Released to Floor", variant: "primary" },
  in_production: { label: "In Production", variant: "warning" },
  on_hold: { label: "On Floor Hold", variant: "danger" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

const ITEMS_PER_PAGE = 10;

export default function ProductionPage() {
  const { success, error: toastError } = useToast();

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [jobs, setJobs] = React.useState<ProductionJobRecord[]>([]);
  const [orders, setOrders] = React.useState<OrderRecord[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeRecord[]>([]);
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [productionLines, setProductionLines] = React.useState<ProductionLineRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  // View Navigation
  const [viewMode, setViewMode] = React.useState<"list" | "create" | "detail">("list");
  const [selectedJob, setSelectedJob] = React.useState<ProductionJobRecord | null>(null);
  const [detailTab, setDetailTab] = React.useState<
    "overview" | "cutting" | "stitching" | "finishing" | "materials" | "earnings"
  >("overview");

  // Filtering & Pagination
  const [searchQuery, setSearchQuery] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Job Details sub-records
  const [cuttingPlans, setCuttingPlans] = React.useState<CuttingPlanRecord[]>([]);
  const [bundles, setBundles] = React.useState<ProductionBundleRecord[]>([]);
  const [operatorLogs, setOperatorLogs] = React.useState<OperatorProductionLogRecord[]>([]);
  const [materialIssues, setMaterialIssues] = React.useState<ProductionMaterialIssueRecord[]>([]);
  const [finishingOperations, setFinishingOperations] = React.useState<FinishingOperationRecord[]>([]);

  // Floor Metrics
  const [floorMetrics, setFloorMetrics] = React.useState({
    activeLines: 3,
    bundlesInStitching: 0,
    bundlesPending: 0,
    completedPiecesToday: 0,
    rejectedPiecesToday: 0,
    activeOperators: 0,
  });

  // Modals & Dialogs
  const [jobToArchive, setJobToArchive] = React.useState<ProductionJobRecord | null>(null);
  const [cuttingPlanModalOpen, setCuttingPlanModalOpen] = React.useState(false);
  const [materialIssueModalOpen, setMaterialIssueModalOpen] = React.useState(false);
  const [assignBundleModalOpen, setAssignBundleModalOpen] = React.useState(false);
  const [selectedBundleForAssign, setSelectedBundleForAssign] = React.useState<ProductionBundleRecord | null>(null);
  const [logOutputModalOpen, setLogOutputModalOpen] = React.useState(false);
  const [selectedBundleForOutput, setSelectedBundleForOutput] = React.useState<ProductionBundleRecord | null>(null);

  // ---------------------------------------------------------------------------
  // CREATE WORK ORDER FORM STATE
  // ---------------------------------------------------------------------------
  const [formJobNumber, setFormJobNumber] = React.useState("");
  const [selectedSourceOrderId, setSelectedSourceOrderId] = React.useState<string>("");
  const [formPlannedQty, setFormPlannedQty] = React.useState<number>(500);
  const [formStartDate, setFormStartDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [formTargetDate, setFormTargetDate] = React.useState("");
  const [formPriority, setFormPriority] = React.useState<"low" | "normal" | "high" | "urgent">("normal");
  const [formAssignedLine, setFormAssignedLine] = React.useState("line_1");
  const [formSupervisorId, setFormSupervisorId] = React.useState("");
  const [formNotes, setFormNotes] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // ---------------------------------------------------------------------------
  // SUB-MODAL FORM STATES
  // ---------------------------------------------------------------------------
  // Cutting Plan Form
  const [markerName, setMarkerName] = React.useState("Marker-01 (Solid Size Ratio)");
  const [markerLength, setMarkerLength] = React.useState(6.25);
  const [markerWidth, setMarkerWidth] = React.useState(152);
  const [pliesCount, setPliesCount] = React.useState(25);
  const [fabricType, setFabricType] = React.useState("100% Cotton Fleece");
  const [fabricGsm, setFabricGsm] = React.useState("380");
  const [cutPlanSizes, setCutPlanSizes] = React.useState<Array<{ size: string; ratio: number; plannedQuantity: number }>>([
    { size: "S", ratio: 1, plannedQuantity: 25 },
    { size: "M", ratio: 2, plannedQuantity: 50 },
    { size: "L", ratio: 2, plannedQuantity: 50 },
    { size: "XL", ratio: 1, plannedQuantity: 25 },
  ]);

  // Log Output Form
  const [outputWorkerId, setOutputWorkerId] = React.useState("");
  const [outputOpName, setOutputOpName] = React.useState("Front Pocket Stitch");
  const [outputCompletedPcs, setOutputCompletedPcs] = React.useState(25);
  const [outputRejectedPcs, setOutputRejectedPcs] = React.useState(0);
  const [outputReworkPcs, setOutputReworkPcs] = React.useState(0);
  const [outputPieceRate, setOutputPieceRate] = React.useState(0.85);

  // Assign Bundle Form
  const [assignWorkerId, setAssignWorkerId] = React.useState("");
  const [assignOpName, setAssignOpName] = React.useState("Overlock Seam Assembly");

  // ---------------------------------------------------------------------------
  // DATA LOADING
  // ---------------------------------------------------------------------------
  const loadData = React.useCallback(async (showToastNotification = false) => {
    setLoading(true);
    try {
      // 1. Fetch Production Jobs
      const jobsRes = await getProductionJobsFromSupabase();
      setJobs(jobsRes || []);

      // 2. Fetch Orders
      const ordersRes = await getOrdersFromSupabase();
      setOrders(ordersRes && ordersRes.length > 0 ? ordersRes : INITIAL_ORDERS);

      // 3. Fetch Employees
      const empRes = await getEmployeesFromSupabase();
      setEmployees(empRes || []);

      // 4. Fetch Inventory
      const invRes = await getInventoryFromSupabase();
      setInventory(invRes || []);

      // 5. Fetch Production Floor Metrics
      try {
        const metRes = await fetch("/api/production/metrics");
        const metJson = await metRes.json();
        if (metJson.success && metJson.data) {
          setFloorMetrics(metJson.data);
        }
      } catch (err) {}

      if (showToastNotification) {
        success("Production Data Refreshed", { description: "Loaded live work orders and floor output from MySQL." });
      }
    } catch (err: any) {
      console.error("Error loading production data:", err);
      toastError("Failed to Load Production Data", { description: err.message || "Please check connection." });
    } finally {
      setLoading(false);
    }
  }, [success, toastError]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // LOAD JOB DETAIL SUB-RECORDS
  // ---------------------------------------------------------------------------
  const loadJobDetails = React.useCallback(async (job: ProductionJobRecord) => {
    try {
      // 1. Fetch Cutting Plans
      const cutRes = await fetch(`/api/production/cutting-plans?job_id=${job.id}`);
      const cutJson = await cutRes.json();
      if (cutJson.success) setCuttingPlans(cutJson.data || []);

      // 2. Fetch QR Bundles
      const bunRes = await fetch(`/api/production/bundles?job_id=${job.id}`);
      const bunJson = await bunRes.json();
      if (bunJson.success) setBundles(bunJson.data || []);

      // 3. Fetch Operator Logs
      const logRes = await fetch(`/api/production/operator-output?job_id=${job.id}`);
      const logJson = await logRes.json();
      if (logJson.success) setOperatorLogs(logJson.data || []);
    } catch (err) {
      console.error("Error loading job details:", err);
    }
  }, []);

  const handleOpenDetail = (job: ProductionJobRecord) => {
    setSelectedJob(job);
    setViewMode("detail");
    setDetailTab("overview");
    loadJobDetails(job);
  };

  const handleOpenCreate = () => {
    const defaultJobNo = `PRD-${new Date().getFullYear()}-${String(jobs.length + 1).padStart(3, "0")}`;
    setFormJobNumber(defaultJobNo);

    const firstOrder = orders.find((o) => !o.isArchived) || orders[0];
    if (firstOrder) {
      setSelectedSourceOrderId(firstOrder.id);
      setFormPlannedQty(firstOrder.quantity || 500);
      setFormTargetDate(firstOrder.targetDeliveryDate || new Date().toISOString().split("T")[0]);
    } else {
      setSelectedSourceOrderId("");
      setFormPlannedQty(500);
      setFormTargetDate(new Date().toISOString().split("T")[0]);
    }
    setFormErrors({});
    setViewMode("create");
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedSourceOrderId(orderId);
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setFormPlannedQty(order.quantity || 500);
      if (order.targetDeliveryDate) {
        setFormTargetDate(order.targetDeliveryDate);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: CREATE WORK ORDER CRUD
  // ---------------------------------------------------------------------------
  const handleSaveJob = async () => {
    const errors: Record<string, string> = {};
    if (!formJobNumber.trim()) errors.jobNumber = "Job / Work Order number is required.";
    if (!selectedSourceOrderId) errors.order = "Please select a source sales order.";
    if (!formPlannedQty || formPlannedQty <= 0) errors.qty = "Planned quantity must be greater than 0.";
    if (!formStartDate) errors.startDate = "Target start date is required.";
    if (!formTargetDate) errors.targetDate = "Target end date is required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toastError("Validation Failed", { description: "Please correct the errors in the form." });
      return;
    }

    const order = orders.find((o) => o.id === selectedSourceOrderId);
    const sup = employees.find((e) => e.id === formSupervisorId);

    const newJobPayload = {
      jobNumber: formJobNumber.trim(),
      orderId: selectedSourceOrderId,
      clientId: order?.clientId || "1",
      productId: order?.productId || undefined,
      orderNumber: order?.orderNumber || "ORD-2026-001",
      clientName: order?.clientName || "Nordic Apparel Group",
      styleCode: order?.styleCode || "HD-380",
      styleName: order?.styleName || "Heavyweight Boxy Pullover Hoodie",
      plannedQuantity: formPlannedQty,
      totalCutQuantity: 0,
      totalStitchedQuantity: 0,
      totalFinishedQuantity: 0,
      totalQaPassedQuantity: 0,
      totalPackedQuantity: 0,
      totalRejectedQuantity: 0,
      totalReworkQuantity: 0,
      targetStartDate: formStartDate,
      targetEndDate: formTargetDate,
      stage: "planning" as any,
      status: "released" as any,
      priority: formPriority,
      assignedLine: formAssignedLine,
      supervisorId: formSupervisorId || undefined,
      supervisorName: sup?.personalInfo?.fullName || undefined,
      standardSam: 18.5,
      sizeBreakdown: {
        S: Math.round(formPlannedQty * 0.2),
        M: Math.round(formPlannedQty * 0.3),
        L: Math.round(formPlannedQty * 0.3),
        XL: Math.round(formPlannedQty * 0.2),
      },
      specialInstructions: formNotes.trim() || undefined,
    };

    try {
      const savedJob = await createProductionJobInSupabase(newJobPayload as any);
      setJobs((prev) => [savedJob, ...prev.filter((j) => j.jobNumber !== savedJob.jobNumber)]);
      success("Work Order Released to Floor", {
        description: `Production Job ${savedJob.jobNumber} created and saved in MySQL.`,
      });
      setViewMode("list");
      loadData();
    } catch (err: any) {
      toastError("Error Creating Work Order", { description: err.message || "Could not save to MySQL." });
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: CUTTING PLAN & EXECUTE CUT RUN
  // ---------------------------------------------------------------------------
  const handleSaveCuttingPlan = async () => {
    if (!selectedJob) return;
    try {
      const res = await fetch("/api/production/cutting-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionJobId: selectedJob.id,
          markerName,
          markerLengthMeters: Number(markerLength),
          markerWidthCm: Number(markerWidth),
          fabricType,
          fabricGsm,
          pliesCount: Number(pliesCount),
          sizes: cutPlanSizes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        success("Cutting Plan Created", { description: "CAD Marker lay plan saved in MySQL." });
        setCuttingPlanModalOpen(false);
        loadJobDetails(selectedJob);
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      toastError("Failed to Save Cutting Plan", { description: err.message });
    }
  };

  const handleExecuteCutting = async (planId: string) => {
    if (!selectedJob) return;
    try {
      const res = await fetch("/api/production/cutting-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuttingPlanId: planId,
          bundleSizePieces: 25,
        }),
      });
      const json = await res.json();
      if (json.success) {
        success("Cut Run Executed", {
          description: `${json.data.totalCut} pieces cut. Generated ${json.data.bundlesGenerated} QR bundles in MySQL.`,
        });
        loadJobDetails(selectedJob);
        loadData();
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      toastError("Cut Run Execution Failed", { description: err.message });
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: BUNDLE ALLOCATION & OPERATOR OUTPUT
  // ---------------------------------------------------------------------------
  const handleAssignBundle = async () => {
    if (!selectedBundleForAssign || !assignWorkerId) return;
    try {
      const res = await fetch("/api/production/assign-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundleId: selectedBundleForAssign.id,
          employeeId: assignWorkerId,
          operationName: assignOpName,
          lineCode: selectedJob?.assignedLine,
        }),
      });
      const json = await res.json();
      if (json.success) {
        success("Bundle Allocated", { description: `Bundle ${selectedBundleForAssign.bundleBarcode} assigned to worker.` });
        setAssignBundleModalOpen(false);
        if (selectedJob) loadJobDetails(selectedJob);
      }
    } catch (err: any) {
      toastError("Bundle Allocation Failed", { description: err.message });
    }
  };

  const handleLogOperatorOutput = async () => {
    if (!selectedBundleForOutput || !selectedJob || !outputWorkerId) return;
    try {
      const res = await fetch("/api/production/operator-output", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionJobId: selectedJob.id,
          bundleId: selectedBundleForOutput.id,
          employeeId: outputWorkerId,
          operationName: outputOpName,
          piecesCompleted: Number(outputCompletedPcs),
          piecesRejected: Number(outputRejectedPcs),
          piecesRework: Number(outputReworkPcs),
          ratePerPiece: Number(outputPieceRate),
          workDate: new Date().toISOString().split("T")[0],
        }),
      });
      const json = await res.json();
      if (json.success) {
        success("Operator Output Logged", {
          description: `Logged ${outputCompletedPcs} pieces (Earnings: $${(outputCompletedPcs * outputPieceRate).toFixed(2)}).`,
        });
        setLogOutputModalOpen(false);
        loadJobDetails(selectedJob);
        loadData();
      }
    } catch (err: any) {
      toastError("Output Logging Failed", { description: err.message });
    }
  };

  const handleArchiveJob = async () => {
    if (!jobToArchive) return;
    try {
      await deleteProductionJobInSupabase(jobToArchive.id);
      setJobs((prev) => prev.filter((j) => j.id !== jobToArchive.id));
      success("Work Order Archived", { description: `Work order ${jobToArchive.jobNumber} has been archived.` });
      setJobToArchive(null);
    } catch (err: any) {
      toastError("Failed to Archive", { description: err.message });
    }
  };

  // ---------------------------------------------------------------------------
  // FILTERING & PAGINATION CALCULATIONS
  // ---------------------------------------------------------------------------
  const filteredJobs = React.useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        searchQuery === "" ||
        job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.styleCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStage = stageFilter === "all" || job.stage === stageFilter;
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;

      return matchesSearch && matchesStage && matchesStatus;
    });
  }, [jobs, searchQuery, stageFilter, statusFilter]);

  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE) || 1;
  const paginatedJobs = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredJobs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredJobs, currentPage]);

  // Selected Order for Create Preview
  const selectedOrder = orders.find((o) => o.id === selectedSourceOrderId);

  // ---------------------------------------------------------------------------
  // RENDER: CREATE WORK ORDER STUDIO (VIEW 1)
  // ---------------------------------------------------------------------------
  if (viewMode === "create") {
    return (
      <>
        <TopNav title="Create Production Work Order" />

        <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6 animate-in fade-in-0 duration-200">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="Back to Production List"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                    Release Production Work Order
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Floor Dispatcher Studio
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allocate confirmed commercial orders to stitching lines, define target capacity and supervisors.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              <Button variant="secondary" size="md" onClick={() => setViewMode("list")}>
                Cancel
              </Button>
              <Button variant="primary" size="md" leftIcon={<Save className="h-4 w-4" />} onClick={handleSaveJob}>
                Release Work Order to Floor
              </Button>
            </div>
          </div>

          {/* Form Canvas: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
            {/* Left Column: Form Sections (8 cols) */}
            <div className="lg:col-span-8 space-y-6 min-w-0">
              {/* Section 1: Commercial Order Reference */}
              <Card>
                <FormSection
                  title="1. Commercial Source Order (Confirmed Only)"
                  description="Select the client contract. Specifications and garment styles will automatically populate."
                >
                  <FormField label="Select Sales Order" required error={formErrors.order}>
                    <select
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-xs"
                      value={selectedSourceOrderId}
                      onChange={(e) => handleSelectOrder(e.target.value)}
                    >
                      <option value="" disabled>-- Select Confirmed Sales Order --</option>
                      {orders.map((ord) => (
                        <option key={ord.id} value={ord.id}>
                          {ord.orderNumber} — {ord.clientName} ({ord.styleCode} • {(ord.quantity || 0).toLocaleString()} Pcs)
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {selectedOrder && (
                    <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 sm:grid-cols-4">
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Customer / Buyer</span>
                        <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">{selectedOrder.clientName}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Garment Style</span>
                        <p className="mt-0.5 text-sm font-bold text-slate-900 font-mono">{selectedOrder.styleCode}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Contract Quantity</span>
                        <p className="mt-0.5 text-sm font-bold text-blue-600">{(selectedOrder.quantity || 0).toLocaleString()} Pcs</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Target Delivery</span>
                        <p className="mt-0.5 text-sm font-bold text-amber-700">{selectedOrder.targetDeliveryDate || "—"}</p>
                      </div>
                    </div>
                  )}
                </FormSection>
              </Card>

              {/* Section 2: Manufacturing Parameters */}
              <Card>
                <FormSection
                  title="2. Floor Scheduling & Line Assignment"
                  description="Specify the work order code, floor targets, line allocation, and floor supervisor."
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Job / Work Order #" required error={formErrors.jobNumber}>
                      <Input
                        value={formJobNumber}
                        onChange={(e) => setFormJobNumber(e.target.value)}
                        placeholder="PRD-2026-001"
                      />
                    </FormField>

                    <FormField label="Planned Production Quantity (Pcs)" required error={formErrors.qty}>
                      <Input
                        type="number"
                        min="1"
                        value={formPlannedQty}
                        onChange={(e) => setFormPlannedQty(parseInt(e.target.value, 10) || 0)}
                      />
                    </FormField>

                    <FormField label="Target Start Date" required error={formErrors.startDate}>
                      <Input
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Ex-Factory Target Date" required error={formErrors.targetDate}>
                      <Input
                        type="date"
                        value={formTargetDate}
                        onChange={(e) => setFormTargetDate(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Priority Level">
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-xs"
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as any)}
                      >
                        <option value="low">Low Priority</option>
                        <option value="normal">Normal Priority</option>
                        <option value="high">High Priority</option>
                        <option value="urgent">Urgent / Express Track</option>
                      </select>
                    </FormField>

                    <FormField label="Assigned Sewing Line">
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-xs"
                        value={formAssignedLine}
                        onChange={(e) => setFormAssignedLine(e.target.value)}
                      >
                        <option value="line_1">Line 1 — Main Stitching Floor</option>
                        <option value="line_2">Line 2 — Polos & Jersey</option>
                        <option value="line_3">Line 3 — Bottoms & Pants</option>
                        <option value="sample_room">Sample Room</option>
                      </select>
                    </FormField>

                    <FormField label="Floor Supervisor">
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-xs"
                        value={formSupervisorId}
                        onChange={(e) => setFormSupervisorId(e.target.value)}
                      >
                        <option value="">-- Assign Production Supervisor --</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.personalInfo?.fullName} ({emp.employmentInfo?.designation || "Supervisor"})
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <FormField label="Special Floor Instructions & QA Notes">
                    <Textarea
                      rows={3}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Enter tolerances, seam allowances, critical needle sizes, or packaging notes..."
                    />
                  </FormField>
                </FormSection>
              </Card>
            </div>

            {/* Right Column: Live Summary Preview (4 cols) */}
            <div className="lg:col-span-4 space-y-6 min-w-0">
              <Card className="sticky top-20">
                <CardHeader
                  title="Work Order Preview"
                  description="Live manufacturing configuration summary"
                />

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Job Reference</span>
                    <span className="font-mono font-bold text-slate-900">{formJobNumber || "PRD-2026-XXX"}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Order Reference</span>
                    <span className="font-mono font-medium text-slate-700">{selectedOrder?.orderNumber || "—"}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Garment Style</span>
                    <span className="font-bold text-slate-900 truncate max-w-[160px]">
                      {selectedOrder?.styleName || "Selected Garment Style"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Target Output</span>
                    <span className="font-bold text-blue-600">{(formPlannedQty || 0).toLocaleString()} Pieces</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Target Sewing Line</span>
                    <span className="font-mono text-slate-800">{formAssignedLine}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Ex-Factory Deadline</span>
                    <span className="font-medium text-amber-700">{formTargetDate || "Not Scheduled"}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Standard SAM</span>
                    <span className="font-mono text-slate-800">18.5 min/pc</span>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      className="w-full justify-center"
                      leftIcon={<Save className="h-4 w-4" />}
                      onClick={handleSaveJob}
                    >
                      Release Work Order
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
  // RENDER: DETAIL & FLOOR WORKSPACE VIEW (VIEW 2)
  // ---------------------------------------------------------------------------
  if (viewMode === "detail" && selectedJob) {
    const stageInfo = STAGE_CONFIG[selectedJob.stage] || STAGE_CONFIG.planning;
    const statusInfo = STATUS_CONFIG[selectedJob.status] || STATUS_CONFIG.released;

    return (
      <>
        <TopNav title={`Production / Work Order ${selectedJob.jobNumber}`} />

        <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setViewMode("list")}
              >
                Back
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 font-mono tracking-tight">
                    {selectedJob.jobNumber}
                  </h1>
                  <Badge variant={stageInfo.variant}>{stageInfo.label}</Badge>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order: <span className="font-semibold text-slate-700">{selectedJob.orderNumber}</span> • Buyer:{" "}
                  <span className="font-semibold text-slate-700">{selectedJob.clientName}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Scissors className="h-4 w-4" />}
                onClick={() => setCuttingPlanModalOpen(true)}
              >
                Create Cutting Plan
              </Button>
            </div>
          </div>

          {/* Clean Navigation Tabs */}
          <Card noPadding className="border-slate-200/80 shadow-xs bg-white overflow-x-auto">
            <div className="flex items-center gap-1 border-b border-slate-200 px-4 pt-2">
              <button
                onClick={() => setDetailTab("overview")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                  detailTab === "overview"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <FileText className="h-4 w-4" /> Overview & Specs
              </button>
              <button
                onClick={() => setDetailTab("cutting")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                  detailTab === "cutting"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Scissors className="h-4 w-4" /> Cutting Management ({cuttingPlans.length})
              </button>
              <button
                onClick={() => setDetailTab("stitching")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                  detailTab === "stitching"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Shirt className="h-4 w-4" /> QR Bundles & Stitching ({bundles.length})
              </button>
              <button
                onClick={() => setDetailTab("earnings")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                  detailTab === "earnings"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <DollarSign className="h-4 w-4" /> Piece-Rate Earnings ({operatorLogs.length})
              </button>
            </div>
          </Card>

          {/* TAB 1: OVERVIEW */}
          {detailTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader title="Commercial & Manufacturing Parameters" />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Customer / Buyer</span>
                    <span className="font-bold text-slate-900">{selectedJob.clientName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Planned Quantity</span>
                    <span className="font-bold text-slate-900">{(selectedJob.plannedQuantity || 0).toLocaleString()} Pcs</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Pieces Cut</span>
                    <span className="font-bold text-emerald-600">{(selectedJob.totalCutQuantity || 0).toLocaleString()} Pcs</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Pieces Stitched</span>
                    <span className="font-bold text-blue-600">{(selectedJob.totalStitchedQuantity || 0).toLocaleString()} Pcs</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Target Start Date</span>
                    <span className="text-slate-800">{selectedJob.targetStartDate || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-800">Ex-Factory Deadline</span>
                    <span className="text-slate-800">{selectedJob.targetEndDate || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Assigned Sewing Line</span>
                    <span className="font-mono text-slate-800">{selectedJob.assignedLine}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Floor Supervisor</span>
                    <span className="text-slate-800">{selectedJob.supervisorName || "Unassigned"}</span>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Garment Specification & Size Breakdown" />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Style Code</span>
                    <span className="font-mono font-bold text-slate-900">{selectedJob.styleCode}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Garment Title</span>
                    <span className="font-medium text-slate-800">{selectedJob.styleName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Standard SAM / SMV</span>
                    <span className="font-mono text-slate-800">{selectedJob.standardSam} min/piece</span>
                  </div>
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Planned Size Breakdown:</span>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {Object.entries(selectedJob.sizeBreakdown || {}).map(([sz, qty]) => (
                        <div key={sz} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                          <span className="text-xs text-slate-500">{sz}</span>
                          <p className="text-sm font-bold text-slate-900">{qty}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: CUTTING MANAGEMENT */}
          {detailTab === "cutting" && (
            <div className="space-y-6">
              <Card noPadding className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">CAD Cutting Plans</h3>
                    <p className="text-xs text-slate-500">Approved marker layouts and lay dimensions for this work order</p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setCuttingPlanModalOpen(true)}
                  >
                    Add Cutting Plan
                  </Button>
                </div>

                {cuttingPlans.length === 0 ? (
                  <EmptyState
                    title="No Cutting Plans Configured"
                    description="Create a CAD marker lay plan before executing the cutting run."
                    icon={<Scissors className="h-6 w-6" />}
                    actionLabel="Create Cutting Plan"
                    onAction={() => setCuttingPlanModalOpen(true)}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-4 py-3">Plan #</th>
                          <th className="px-4 py-3">Marker Dimensions</th>
                          <th className="px-4 py-3">Fabric Spec</th>
                          <th className="px-4 py-3">Plies / Lays</th>
                          <th className="px-4 py-3">Efficiency</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cuttingPlans.map((cp) => (
                          <tr key={cp.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">{cp.planNumber}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-700">
                              {cp.markerLengthMeters}m × {cp.markerWidthCm}cm
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {cp.fabricType} ({cp.fabricGsm} GSM)
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold">{cp.pliesCount} Plies</td>
                            <td className="px-4 py-3 text-xs font-bold text-emerald-600">{cp.markerEfficiencyPct}%</td>
                            <td className="px-4 py-3">
                              <Badge variant={cp.status === "completed" ? "success" : "warning"}>{cp.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {cp.status !== "completed" && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  leftIcon={<Play className="h-3.5 w-3.5" />}
                                  onClick={() => handleExecuteCutting(cp.id)}
                                >
                                  Execute Cut Run
                                </Button>
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

          {/* TAB 3: STITCHING & QR BUNDLES */}
          {detailTab === "stitching" && (
            <div className="space-y-6">
              <Card noPadding className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Floor QR Barcode Bundles</h3>
                    <p className="text-xs text-slate-500">Tracked bundle units flowing through sewing lines</p>
                  </div>
                </div>

                {bundles.length === 0 ? (
                  <EmptyState
                    title="No Bundles Generated Yet"
                    description="Execute a cutting run to automatically create floor QR barcode bundles."
                    icon={<Shirt className="h-6 w-6" />}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-4 py-3">Barcode / QR</th>
                          <th className="px-4 py-3">Size</th>
                          <th className="px-4 py-3">Quantity</th>
                          <th className="px-4 py-3">Stage</th>
                          <th className="px-4 py-3">Assigned Operator</th>
                          <th className="px-4 py-3">Passed / Rejected</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bundles.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-mono font-bold text-blue-600">{b.bundleBarcode}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{b.size}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{b.quantity} Pcs</td>
                            <td className="px-4 py-3 text-xs uppercase font-mono">{b.currentStage}</td>
                            <td className="px-4 py-3 text-xs text-slate-700">
                              {b.assignedEmployeeName || <span className="text-slate-400 italic">Unassigned</span>}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono font-semibold">
                              <span className="text-emerald-600">{b.passedPieces}</span> /{" "}
                              <span className="text-rose-600">{b.rejectedPieces}</span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={b.status === "passed" ? "success" : "default"}>{b.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                                  onClick={() => {
                                    setSelectedBundleForAssign(b);
                                    setAssignBundleModalOpen(true);
                                  }}
                                >
                                  Assign
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                  onClick={() => {
                                    setSelectedBundleForOutput(b);
                                    setOutputCompletedPcs(b.quantity);
                                    setLogOutputModalOpen(true);
                                  }}
                                >
                                  Log Output
                                </Button>
                              </div>
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

          {/* TAB 4: PIECE-RATE EARNINGS */}
          {detailTab === "earnings" && (
            <div className="space-y-6">
              <Card noPadding className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">Operator Piece-Rate Output Logs</h3>
                  <p className="text-xs text-slate-500">Live piece wages recorded per sewing operation</p>
                </div>

                {operatorLogs.length === 0 ? (
                  <EmptyState
                    title="No Piece Output Logged"
                    description="Log operator daily stitched pieces from the QR Bundles tab."
                    icon={<DollarSign className="h-6 w-6" />}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-4 py-3">Work Date</th>
                          <th className="px-4 py-3">Operator Name</th>
                          <th className="px-4 py-3">Operation</th>
                          <th className="px-4 py-3">Completed / Rejected</th>
                          <th className="px-4 py-3">Rate / Pc</th>
                          <th className="px-4 py-3">Total Earnings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {operatorLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 text-xs text-slate-600">{log.workDate}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{log.employeeName}</td>
                            <td className="px-4 py-3 text-xs font-medium text-slate-700">{log.operationName}</td>
                            <td className="px-4 py-3 font-mono text-xs">
                              <span className="font-bold text-emerald-600">{log.piecesCompleted} pcs</span> /{" "}
                              <span className="text-rose-600">{log.piecesRejected} rej</span>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">${log.ratePerPiece.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono font-bold text-emerald-700">${log.totalEarnings.toFixed(2)}</td>
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

        {/* MODAL 1: CREATE CUTTING PLAN */}
        <Modal
          isOpen={cuttingPlanModalOpen}
          onClose={() => setCuttingPlanModalOpen(false)}
          title="Create CAD Marker & Cutting Plan"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Marker Name / Identifier" required>
                <Input value={markerName} onChange={(e) => setMarkerName(e.target.value)} />
              </FormField>
              <FormField label="Marker Length (Meters)" required>
                <Input
                  type="number"
                  step="0.01"
                  value={markerLength}
                  onChange={(e) => setMarkerLength(parseFloat(e.target.value) || 0)}
                />
              </FormField>
              <FormField label="Cuttable Width (cm)" required>
                <Input
                  type="number"
                  value={markerWidth}
                  onChange={(e) => setMarkerWidth(parseInt(e.target.value, 10) || 0)}
                />
              </FormField>
              <FormField label="Fabric Plies / Table Lay" required>
                <Input
                  type="number"
                  value={pliesCount}
                  onChange={(e) => {
                    const plies = parseInt(e.target.value, 10) || 1;
                    setPliesCount(plies);
                    setCutPlanSizes((prev) =>
                      prev.map((s) => ({ ...s, plannedQuantity: s.ratio * plies }))
                    );
                  }}
                />
              </FormField>
              <FormField label="Fabric Type">
                <Input value={fabricType} onChange={(e) => setFabricType(e.target.value)} />
              </FormField>
              <FormField label="Fabric GSM">
                <Input value={fabricGsm} onChange={(e) => setFabricGsm(e.target.value)} />
              </FormField>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Size Breakdown & Ratio</h4>
              <div className="mt-2 grid grid-cols-4 gap-3">
                {cutPlanSizes.map((s) => (
                  <div key={s.size} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                    <span className="font-bold text-slate-900">{s.size}</span>
                    <div className="mt-1 flex items-center justify-center gap-1 text-xs">
                      <span>Ratio: {s.ratio}</span>
                    </div>
                    <p className="mt-1 font-mono font-bold text-blue-600">{s.plannedQuantity} Pcs</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setCuttingPlanModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" leftIcon={<Save className="h-4 w-4" />} onClick={handleSaveCuttingPlan}>
              Save Cutting Plan in MySQL
            </Button>
          </ModalFooter>
        </Modal>

        {/* MODAL 2: ASSIGN BUNDLE */}
        <Modal
          isOpen={assignBundleModalOpen}
          onClose={() => setAssignBundleModalOpen(false)}
          title={`Assign Bundle ${selectedBundleForAssign?.bundleBarcode}`}
          size="md"
        >
          <div className="space-y-4">
            <FormField label="Select Sewing Operator" required>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                value={assignWorkerId}
                onChange={(e) => setAssignWorkerId(e.target.value)}
              >
                <option value="">-- Choose Operator --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.personalInfo?.fullName} ({emp.employmentInfo?.designation || "Operator"})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Assigned Operation" required>
              <Input value={assignOpName} onChange={(e) => setAssignOpName(e.target.value)} />
            </FormField>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setAssignBundleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAssignBundle}>
              Assign to Operator
            </Button>
          </ModalFooter>
        </Modal>

        {/* MODAL 3: LOG OPERATOR OUTPUT */}
        <Modal
          isOpen={logOutputModalOpen}
          onClose={() => setLogOutputModalOpen(false)}
          title={`Log Output for Bundle ${selectedBundleForOutput?.bundleBarcode}`}
          size="md"
        >
          <div className="space-y-4">
            <FormField label="Select Worker" required>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                value={outputWorkerId}
                onChange={(e) => setOutputWorkerId(e.target.value)}
              >
                <option value="">-- Choose Worker --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.personalInfo?.fullName}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Completed (Pcs)" required>
                <Input
                  type="number"
                  value={outputCompletedPcs}
                  onChange={(e) => setOutputCompletedPcs(parseInt(e.target.value, 10) || 0)}
                />
              </FormField>
              <FormField label="Rejected (Pcs)">
                <Input
                  type="number"
                  value={outputRejectedPcs}
                  onChange={(e) => setOutputRejectedPcs(parseInt(e.target.value, 10) || 0)}
                />
              </FormField>
              <FormField label="Piece Rate ($)">
                <Input
                  type="number"
                  step="0.01"
                  value={outputPieceRate}
                  onChange={(e) => setOutputPieceRate(parseFloat(e.target.value) || 0)}
                />
              </FormField>
            </div>

            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
              <span className="text-xs text-emerald-700">Calculated Earnings:</span>
              <p className="text-lg font-bold text-emerald-800">
                ${((outputCompletedPcs || 0) * (outputPieceRate || 0)).toFixed(2)}
              </p>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setLogOutputModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleLogOperatorOutput}>
              Record Output & Save to MySQL
            </Button>
          </ModalFooter>
        </Modal>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAIN PRODUCTION DASHBOARD (VIEW 3)
  // ---------------------------------------------------------------------------
  return (
    <>
      <TopNav title="Garment Manufacturing & Stitching Floor" />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Garment Manufacturing & Stitching Floor"
          description="Manage active factory floor work orders, CAD cutting plans, bundle allocations, piece-rate earnings, and floor routing."
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
                onClick={handleOpenCreate}
              >
                Create Work Order
              </Button>
            </div>
          }
        />

        {/* Standardized 6 KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Active Lines"
            value={floorMetrics.activeLines || 3}
            sub="Operating sewing lines"
            icon={<Factory className="h-5 w-5" />}
            iconColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="In Stitching"
            value={`${floorMetrics.bundlesInStitching || 0} Bundles`}
            sub="Active bundle work in progress"
            icon={<Shirt className="h-5 w-5" />}
            iconColor="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Pending Bundles"
            value={`${floorMetrics.bundlesPending || 0} Bundles`}
            sub="Awaiting line allocation"
            icon={<Layers className="h-5 w-5" />}
            iconColor="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            label="Stitched Today"
            value={`${(floorMetrics.completedPiecesToday || 0).toLocaleString()} Pcs`}
            sub="Verified floor output"
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Rejected Today"
            value={`${floorMetrics.rejectedPiecesToday || 0} Pcs`}
            sub="Defects logged on floor"
            icon={<Box className="h-5 w-5" />}
            iconColor="bg-rose-50 text-rose-600"
          />
          <StatCard
            label="Active Operators"
            value={floorMetrics.activeOperators || 0}
            sub="Logged in workers"
            icon={<Scissors className="h-5 w-5" />}
            iconColor="bg-purple-50 text-purple-600"
          />
        </div>

        {/* Filter & Search Bar */}
        <Card noPadding className="p-3.5 sm:p-4 bg-white border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Work Order #, Order #, Buyer, or Style Code..."
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
                <span className="text-xs font-semibold text-slate-500 uppercase">Stage:</span>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none shadow-xs"
                  value={stageFilter}
                  onChange={(e) => {
                    setStageFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Stages</option>
                  {Object.entries(STAGE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

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
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {(searchQuery || stageFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setSearchQuery("");
                    setStageFilter("all");
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

        {/* Work Orders Standardized Table */}
        <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
          {filteredJobs.length === 0 ? (
            <EmptyState
              title="No Production Work Orders Found"
              description="Release a work order from a confirmed commercial sales order to start the manufacturing floor."
              icon={<Factory className="h-6 w-6" />}
              actionLabel="Create Work Order"
              onAction={handleOpenCreate}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Work Order #</th>
                    <th className="px-4 py-3">Order & Buyer</th>
                    <th className="px-4 py-3">Style Code</th>
                    <th className="px-4 py-3">Planned Qty</th>
                    <th className="px-4 py-3">Cut Qty</th>
                    <th className="px-4 py-3">Stitched Qty</th>
                    <th className="px-4 py-3">Production Stage</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Target Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedJobs.map((job) => {
                    const stage = STAGE_CONFIG[job.stage] || STAGE_CONFIG.planning;
                    const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.released;
                    const cutPct = job.plannedQuantity > 0 ? Math.round(((job.totalCutQuantity || 0) / job.plannedQuantity) * 100) : 0;

                    return (
                      <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleOpenDetail(job)}
                            className="font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            {job.jobNumber}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900">{job.clientName}</span>
                          <p className="text-xs text-slate-500 font-mono">{job.orderNumber}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-slate-900">{job.styleCode}</span>
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">{job.styleName}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {(job.plannedQuantity || 0).toLocaleString()} Pcs
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                          {(job.totalCutQuantity || 0).toLocaleString()} Pcs
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-600">
                              {(job.totalStitchedQuantity || 0).toLocaleString()} Pcs
                            </span>
                          </div>
                          <div className="mt-1 w-20">
                            <ProgressBar value={cutPct} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={stage.variant}>{stage.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                          {job.targetEndDate || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="secondary" size="sm" onClick={() => handleOpenDetail(job)}>
                              Open Job
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setJobToArchive(job)}
                              title="Archive Work Order"
                            >
                              <Archive className="h-4 w-4 text-slate-400 hover:text-rose-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredJobs.length > 0 && (
            <Pagination
              page={currentPage}
              pageSize={ITEMS_PER_PAGE}
              total={filteredJobs.length}
              onPageChange={(page) => setCurrentPage(page)}
            />
          )}
        </Card>

        {/* Confirmation Archive Dialog */}
        <ConfirmDialog
          isOpen={Boolean(jobToArchive)}
          onClose={() => setJobToArchive(null)}
          onConfirm={handleArchiveJob}
          title="Archive Production Work Order"
          description={`Are you sure you want to archive work order ${jobToArchive?.jobNumber}? All cutting, bundle, and piece earnings will be preserved in MySQL.`}
          confirmLabel="Archive Work Order"
          destructive={true}
        />
      </div>
    </>
  );
}

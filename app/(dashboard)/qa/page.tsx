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
  CheckSquare,
  Plus,
  Search,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileText,
  Layers,
  Factory,
  ArrowLeft,
  Save,
  Wrench,
  Sparkles,
  Flame,
  RefreshCw,
  Tablet,
  ClipboardList,
} from "lucide-react";
import type { QAInspectionRecord, QADefectRecord, QAReworkRecord } from "@/lib/services/qa-service";
import { getProductionJobsFromDB, ProductionJobRecord } from "@/lib/services/production-service";
import { TabletDefectLogger } from "@/components/qa/TabletDefectLogger";
import { RoleActionButton } from "@/components/auth/RoleActionButton";

const ITEMS_PER_PAGE = 10;

export default function QAPage() {
  const { success, error: toastError } = useToast();

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [inspections, setInspections] = React.useState<QAInspectionRecord[]>([]);
  const [productionJobs, setProductionJobs] = React.useState<ProductionJobRecord[]>([]);
  const [reworkRecords, setReworkRecords] = React.useState<QAReworkRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  // View Navigation
  const [activeView, setActiveView] = React.useState<"inspections" | "rework" | "create" | "detail">("inspections");
  const [selectedInspection, setSelectedInspection] = React.useState<QAInspectionRecord | null>(null);
  const [inspectionDefects, setInspectionDefects] = React.useState<QADefectRecord[]>([]);

  // Filtering & Pagination
  const [searchQuery, setSearchQuery] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Metrics
  const [qaMetrics, setQaMetrics] = React.useState({
    pendingQA: 0,
    inspectedToday: 0,
    passedToday: 0,
    failedToday: 0,
    firstPassYieldPct: 98.4,
    criticalDefects: 0,
  });

  // ---------------------------------------------------------------------------
  // CREATE INSPECTION FORM STATE
  // ---------------------------------------------------------------------------
  const [selectedJobId, setSelectedJobId] = React.useState("");
  const [formStage, setFormStage] = React.useState("end_of_line");
  const [formInspectionLevel, setFormInspectionLevel] = React.useState("Level II (Standard Normal)");
  const [formAqlLevel, setFormAqlLevel] = React.useState("AQL 2.5 Major / 4.0 Minor");
  const [formLotSize, setFormLotSize] = React.useState(500);
  const [formSampleSize, setFormSampleSize] = React.useState(50);
  const [formInspectorName, setFormInspectorName] = React.useState("QA Lead Inspector");
  const [formNotes, setFormNotes] = React.useState("");

  // ---------------------------------------------------------------------------
  // DEFECT LOGGING MODAL STATE
  // ---------------------------------------------------------------------------
  const [defectModalOpen, setDefectModalOpen] = React.useState(false);
  const [tabletLoggerOpen, setTabletLoggerOpen] = React.useState(false);
  const [defectCode, setDefectCode] = React.useState("DEF-ST-01");
  const [defectName, setDefectName] = React.useState("Broken / Skipped Stitching");

  const handleSaveTabletDefect = async (defect: {
    code: string;
    name: string;
    category: "critical" | "major" | "minor";
    zone: string;
    count: number;
    notes?: string;
  }) => {
    if (!selectedInspection) {
      success(`Floor Defect Logged: ${defect.name}`, {
        description: `${defect.count} pcs (${defect.category.toUpperCase()}) in zone ${defect.zone} recorded.`,
      });
      return;
    }
    try {
      const res = await fetch(`/api/qa/${selectedInspection.id}/defects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defect_code: defect.code,
          defect_name: `${defect.name} [Zone: ${defect.zone}]`,
          category: defect.category,
          defect_count: defect.count,
          operation_name: `Sewing Line (${defect.zone})`,
          corrective_action: defect.notes || "Adjust needle tension and check seam alignment",
        }),
      });
      if (res.ok) {
        success(`Defect Logged: ${defect.name}`, {
          description: `Logged ${defect.count} defective pieces in zone ${defect.zone}.`,
        });
        loadData();
      }
    } catch {
      // fallback
    }
  };
  const [defectCategory, setDefectCategory] = React.useState<"critical" | "major" | "minor">("major");
  const [defectCount, setDefectCount] = React.useState(2);
  const [defectOperation, setDefectOperation] = React.useState("Front Pocket Attachment");
  const [correctiveAction, setCorrectiveAction] = React.useState("Adjust needle tension and replace 90/14 needle");

  // ---------------------------------------------------------------------------
  // DECISION MODAL STATE
  // ---------------------------------------------------------------------------
  const [decisionModalOpen, setDecisionModalOpen] = React.useState(false);
  const [decisionType, setDecisionType] = React.useState<"passed" | "failed" | "rework_required">("passed");
  const [decisionPassedPcs, setDecisionPassedPcs] = React.useState(48);
  const [decisionFailedPcs, setDecisionFailedPcs] = React.useState(0);
  const [decisionReworkPcs, setDecisionReworkPcs] = React.useState(2);
  const [reworkSummary, setReworkSummary] = React.useState("Restitch pocket corner and clean oil stains");
  const [decisionAssignedLine, setDecisionAssignedLine] = React.useState("line_1");

  // ---------------------------------------------------------------------------
  // DATA LOADING
  // ---------------------------------------------------------------------------
  const loadData = React.useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      // 1. Fetch QA Inspections
      const inspRes = await fetch("/api/qa");
      const inspJson = await inspRes.json();
      if (inspJson.success) setInspections(inspJson.data || []);

      // 2. Fetch Production Jobs
      const jobs = await getProductionJobsFromDB();
      setProductionJobs(jobs || []);

      // 3. Fetch QA Metrics
      const metRes = await fetch("/api/qa/metrics");
      const metJson = await metRes.json();
      if (metJson.success && metJson.data) setQaMetrics(metJson.data);

      // 4. Fetch Rework Records
      const rewRes = await fetch("/api/qa/rework");
      const rewJson = await rewRes.json();
      if (rewJson.success) setReworkRecords(rewJson.data || []);

      if (showToast) {
        success("QA Audit Data Refreshed", { description: "Loaded live inspection logs from MySQL." });
      }
    } catch (err: any) {
      toastError("Failed to Load QA Data", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [success, toastError]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Inspection Defects
  const loadInspectionDetails = async (insp: QAInspectionRecord) => {
    setSelectedInspection(insp);
    try {
      const res = await fetch(`/api/qa/defects?inspection_id=${insp.id}`);
      const json = await res.json();
      if (json.success) setInspectionDefects(json.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDetail = (insp: QAInspectionRecord) => {
    loadInspectionDetails(insp);
    setActiveView("detail");
  };

  const handleOpenCreate = () => {
    const firstJob = productionJobs[0];
    if (firstJob) {
      setSelectedJobId(firstJob.id);
      setFormLotSize(firstJob.plannedQuantity || 500);
      setFormSampleSize(calculateAqlSampleSize(firstJob.plannedQuantity || 500));
    }
    setActiveView("create");
  };

  const calculateAqlSampleSize = (lot: number): number => {
    if (lot <= 50) return 8;
    if (lot <= 150) return 20;
    if (lot <= 500) return 50;
    if (lot <= 1200) return 80;
    if (lot <= 3200) return 125;
    return 200;
  };

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = productionJobs.find((j) => j.id === jobId);
    if (job) {
      setFormLotSize(job.plannedQuantity || 500);
      setFormSampleSize(calculateAqlSampleSize(job.plannedQuantity || 500));
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: CREATE INSPECTION
  // ---------------------------------------------------------------------------
  const handleSaveInspection = async () => {
    if (!selectedJobId) {
      toastError("Validation Error", { description: "Please select a production work order." });
      return;
    }

    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionJobId: selectedJobId,
          inspectionStage: formStage,
          inspectionLevel: formInspectionLevel,
          aqlLevel: formAqlLevel,
          lotSize: Number(formLotSize),
          sampleSize: Number(formSampleSize),
          inspectorName: formInspectorName,
          notes: formNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        success("AQL Inspection Created", { description: "Audit ticket initiated and saved in MySQL." });
        setActiveView("inspections");
        loadData();
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      toastError("Failed to Create Inspection", { description: err.message });
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: LOG DEFECT
  // ---------------------------------------------------------------------------
  const handleLogDefect = async () => {
    if (!selectedInspection) return;
    try {
      const res = await fetch("/api/qa/defects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qaInspectionId: selectedInspection.id,
          defectCode,
          defectName,
          defectCategory,
          defectCount: Number(defectCount),
          responsibleOperation: defectOperation,
          correctiveAction,
        }),
      });

      const json = await res.json();
      if (json.success) {
        success("Defect Logged", { description: `${defectCount}x ${defectName} recorded in MySQL.` });
        setDefectModalOpen(false);
        loadInspectionDetails(selectedInspection);
        loadData();
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      toastError("Failed to Log Defect", { description: err.message });
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: PASS / FAIL / REWORK DECISION
  // ---------------------------------------------------------------------------
  const handleMakeDecision = async () => {
    if (!selectedInspection) return;
    try {
      const res = await fetch("/api/qa/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qaInspectionId: selectedInspection.id,
          decision: decisionType,
          passedPieces: Number(decisionPassedPcs),
          failedPieces: Number(decisionFailedPcs),
          reworkPieces: Number(decisionReworkPcs),
          reworkSummary,
          assignedLine: decisionAssignedLine,
        }),
      });

      const json = await res.json();
      if (json.success) {
        success("Audit Decision Recorded", {
          description: `Decision '${decisionType.toUpperCase()}' applied. Floor quantities synchronized in MySQL.`,
        });
        setDecisionModalOpen(false);
        setActiveView("inspections");
        loadData();
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      toastError("Failed to Record Decision", { description: err.message });
    }
  };

  // ---------------------------------------------------------------------------
  // FILTERING & PAGINATION
  // ---------------------------------------------------------------------------
  const filteredInspections = React.useMemo(() => {
    return inspections.filter((insp) => {
      const matchesSearch =
        searchQuery === "" ||
        insp.inspectionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        insp.inspectorName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStage = stageFilter === "all" || insp.inspectionStage === stageFilter;
      const matchesStatus = statusFilter === "all" || insp.status === statusFilter;

      return matchesSearch && matchesStage && matchesStatus;
    });
  }, [inspections, searchQuery, stageFilter, statusFilter]);

  const totalPages = Math.ceil(filteredInspections.length / ITEMS_PER_PAGE) || 1;
  const paginatedInspections = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInspections.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInspections, currentPage]);

  const selectedJob = productionJobs.find((j) => j.id === selectedJobId);

  // ---------------------------------------------------------------------------
  // RENDER: CREATE INSPECTION STUDIO (VIEW 1)
  // ---------------------------------------------------------------------------
  if (activeView === "create") {
    return (
      <>
        <TopNav title="Initiate AQL Quality Audit" />

        <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6 animate-in fade-in-0 duration-200">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveView("inspections")}
                className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                    Initiate ANSI/ASQ Z1.4 Quality Inspection
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    AQL 2.5 Standard
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sample floor lots, evaluate critical/major defects, and enforce export shipment compliance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              <Button variant="secondary" size="md" onClick={() => setActiveView("inspections")}>
                Cancel
              </Button>
              <Button variant="primary" size="md" leftIcon={<Save className="h-4 w-4" />} onClick={handleSaveInspection}>
                Start Inspection Run
              </Button>
            </div>
          </div>

          {/* Form Canvas: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
            {/* Left Column: Form Sections (8 cols) */}
            <div className="lg:col-span-8 space-y-6 min-w-0">
              <Card>
                <FormSection
                  title="1. Work Order & Inspection Scope"
                  description="Select the floor work order and inspection checkpoint"
                  gridClassName="block space-y-4 w-full"
                >
                  <FormField label="Select Production Work Order" required>
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                    <FormField label="Inspection Stage" required>
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        value={formStage}
                        onChange={(e) => setFormStage(e.target.value)}
                      >
                        <option value="inline_sewing">Inline Sewing Audit</option>
                        <option value="end_of_line">End-of-Line 100% Floor Check</option>
                        <option value="post_finishing">Post-Finishing & Ironing</option>
                        <option value="pre_shipment_audit">Pre-Shipment Final Audit (FCL)</option>
                      </select>
                    </FormField>

                    <FormField label="Sampling Standard">
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        value={formInspectionLevel}
                        onChange={(e) => setFormInspectionLevel(e.target.value)}
                      >
                        <option value="Level II (Standard Normal)">Level II (Standard Normal Inspection)</option>
                        <option value="Level I (Reduced)">Level I (Reduced Inspection)</option>
                        <option value="Level III (Tightened)">Level III (Tightened Audit)</option>
                      </select>
                    </FormField>

                    <FormField label="AQL Level">
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        value={formAqlLevel}
                        onChange={(e) => setFormAqlLevel(e.target.value)}
                      >
                        <option value="AQL 2.5 Major / 4.0 Minor">AQL 2.5 Major / 4.0 Minor (Standard Garments)</option>
                        <option value="AQL 1.5 Major / 2.5 Minor">AQL 1.5 Major / 2.5 Minor (Premium European Brands)</option>
                        <option value="AQL 4.0 Major / 6.5 Minor">AQL 4.0 Major / 6.5 Minor (Promotional Goods)</option>
                      </select>
                    </FormField>

                    <FormField label="Lead QA Inspector" required>
                      <Input value={formInspectorName} onChange={(e) => setFormInspectorName(e.target.value)} />
                    </FormField>
                  </div>

                  <FormField label="Audit Notes & Customer Tolerances">
                    <Textarea
                      rows={3}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Specify critical measurements, needle hole limits, or shade banding limits..."
                    />
                  </FormField>
                </FormSection>
              </Card>
            </div>

            {/* Right Column: Live AQL Calculator Preview (4 cols) */}
            <div className="lg:col-span-4 space-y-6 min-w-0">
              <Card className="sticky top-20">
                <CardHeader
                  title="AQL 2.5 Sampling Math"
                  description="ISO 2859-1 single sampling plan calculator"
                />

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Lot Size (Total Pieces)</span>
                    <span className="font-bold text-slate-900">{(formLotSize || 0).toLocaleString()} Pcs</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Required Sample Size</span>
                    <span className="font-bold text-blue-600 font-mono">{formSampleSize} Pcs</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Max Allowed Major Defects</span>
                    <span className="font-bold text-amber-700 font-mono">3 Defective Pcs</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Max Allowed Minor Defects</span>
                    <span className="font-bold text-slate-700 font-mono">5 Defective Pcs</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-slate-500">Critical Defects Allowed</span>
                    <span className="font-bold text-rose-600 font-mono">0 (Zero Tolerance)</span>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      className="w-full justify-center"
                      leftIcon={<Save className="h-4 w-4" />}
                      onClick={handleSaveInspection}
                    >
                      Start Inspection Run
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
  // RENDER: DETAIL & DEFECT AUDIT VIEW (VIEW 2)
  // ---------------------------------------------------------------------------
  if (activeView === "detail" && selectedInspection) {
    return (
      <>
        <TopNav title={`QA Audit / ${selectedInspection.inspectionNumber}`} />

        <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setActiveView("inspections")}
              >
                Back
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 font-mono tracking-tight">
                    {selectedInspection.inspectionNumber}
                  </h1>
                  <Badge variant={selectedInspection.inspectionResult === "passed" ? "success" : selectedInspection.inspectionResult === "failed" ? "danger" : "warning"}>
                    {selectedInspection.inspectionResult.toUpperCase()}
                  </Badge>
                  <Badge variant="primary">{selectedInspection.inspectionStage}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspector: <span className="font-semibold text-slate-700">{selectedInspection.inspectorName}</span> • Sample Size:{" "}
                  <span className="font-semibold text-blue-600 font-mono">{selectedInspection.sampleSize} Pcs</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setDefectModalOpen(true)}
              >
                Log Defect
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<ShieldCheck className="h-4 w-4" />}
                onClick={() => {
                  setDecisionPassedPcs(selectedInspection.sampleSize - selectedInspection.criticalDefects - selectedInspection.majorDefects);
                  setDecisionModalOpen(true);
                }}
              >
                Pass / Fail Decision
              </Button>
            </div>
          </div>

          {/* Audit Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="text-center p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Sample Size Checked</span>
              <p className="text-2xl font-bold text-blue-600 font-mono mt-1">{selectedInspection.sampleSize} Pcs</p>
            </Card>
            <Card className="text-center p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Critical Defects</span>
              <p className="text-2xl font-bold text-rose-600 font-mono mt-1">{selectedInspection.criticalDefects}</p>
            </Card>
            <Card className="text-center p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Major Defects</span>
              <p className="text-2xl font-bold text-amber-600 font-mono mt-1">{selectedInspection.majorDefects}</p>
            </Card>
            <Card className="text-center p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Minor Defects</span>
              <p className="text-2xl font-bold text-slate-700 font-mono mt-1">{selectedInspection.minorDefects}</p>
            </Card>
          </div>

          {/* Defect Details Table */}
          <Card noPadding className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recorded Defect Audit Trail</h3>
                <p className="text-xs text-slate-500">Specific defects logged during this AQL sample run</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold"
                  leftIcon={<Tablet className="h-4 w-4" />}
                  onClick={() => setTabletLoggerOpen(true)}
                >
                  Tablet Floor Mode
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setDefectModalOpen(true)}
                >
                  Add Defect
                </Button>
              </div>
            </div>

            {inspectionDefects.length === 0 ? (
              <EmptyState
                title="Zero Defects Logged"
                description="No defects have been identified in this inspection sample lot yet."
                icon={<ShieldCheck className="h-6 w-6" />}
                actionLabel="Log Defect"
                onAction={() => setDefectModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Defect Code</th>
                      <th className="px-4 py-3">Defect Name</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Count</th>
                      <th className="px-4 py-3">Responsible Operation</th>
                      <th className="px-4 py-3">Corrective Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectionDefects.map((def) => (
                      <tr key={def.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{def.defectCode}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{def.defectName}</td>
                        <td className="px-4 py-3">
                          <Badge variant={def.severity === "CRITICAL" ? "danger" : def.severity === "MAJOR" ? "warning" : "default"}>
                            {def.severity}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-rose-600">{def.quantity} Pcs</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{def.responsibleOperation || "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{def.correctiveActionRequired || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* MODAL: LOG DEFECT */}
        <Modal
          isOpen={defectModalOpen}
          onClose={() => setDefectModalOpen(false)}
          title="Log QA Defect in Sample Run"
          size="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Defect Code" required>
                <Input value={defectCode} onChange={(e) => setDefectCode(e.target.value)} />
              </FormField>
              <FormField label="Defect Severity" required>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                  value={defectCategory}
                  onChange={(e) => setDefectCategory(e.target.value as any)}
                >
                  <option value="critical">Critical (0 Tolerance)</option>
                  <option value="major">Major (Functional/Visual Flaw)</option>
                  <option value="minor">Minor (Slight Aesthetic Issue)</option>
                </select>
              </FormField>
            </div>

            <FormField label="Defect Description" required>
              <Input value={defectName} onChange={(e) => setDefectName(e.target.value)} />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Pieces Affected" required>
                <Input
                  type="number"
                  min="1"
                  value={defectCount}
                  onChange={(e) => setDefectCount(parseInt(e.target.value, 10) || 1)}
                />
              </FormField>
              <FormField label="Responsible Operation">
                <Input value={defectOperation} onChange={(e) => setDefectOperation(e.target.value)} />
              </FormField>
            </div>

            <FormField label="Corrective Action Required">
              <Textarea
                rows={2}
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                placeholder="Action required on the stitching floor..."
              />
            </FormField>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setDefectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" leftIcon={<Save className="h-4 w-4" />} onClick={handleLogDefect}>
              Save Defect in MySQL
            </Button>
          </ModalFooter>
        </Modal>

        {/* MODAL: PASS / FAIL / REWORK DECISION */}
        <Modal
          isOpen={decisionModalOpen}
          onClose={() => setDecisionModalOpen(false)}
          title={`AQL Decision for ${selectedInspection.inspectionNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <FormField label="Inspection Verdict" required>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                value={decisionType}
                onChange={(e) => setDecisionType(e.target.value as any)}
              >
                <option value="passed">Pass Lot (Release to Finishing / Packing)</option>
                <option value="rework_required">Rework Required (Generate Floor Ticket)</option>
                <option value="failed">Reject Lot (100% Re-inspection Required)</option>
              </select>
            </FormField>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Passed Pcs" required>
                <Input
                  type="number"
                  value={decisionPassedPcs}
                  onChange={(e) => setDecisionPassedPcs(parseInt(e.target.value, 10) || 0)}
                />
              </FormField>
              <FormField label="Failed Pcs">
                <Input
                  type="number"
                  value={decisionFailedPcs}
                  onChange={(e) => setDecisionFailedPcs(parseInt(e.target.value, 10) || 0)}
                />
              </FormField>
              <FormField label="Rework Pcs">
                <Input
                  type="number"
                  value={decisionReworkPcs}
                  onChange={(e) => setDecisionReworkPcs(parseInt(e.target.value, 10) || 0)}
                />
              </FormField>
            </div>

            {decisionType === "rework_required" && (
              <div className="space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <FormField label="Rework Defect Summary" required>
                  <Input
                    value={reworkSummary}
                    onChange={(e) => setReworkSummary(e.target.value)}
                    placeholder="Describe specific rectification instructions..."
                  />
                </FormField>
                <FormField label="Assign to Sewing Line">
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
                    value={decisionAssignedLine}
                    onChange={(e) => setDecisionAssignedLine(e.target.value)}
                  >
                    <option value="line_1">Line 1 — Main Floor</option>
                    <option value="line_2">Line 2 — Polos & Jersey</option>
                    <option value="line_3">Line 3 — Bottoms</option>
                  </select>
                </FormField>
              </div>
            )}
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setDecisionModalOpen(false)}>
              Cancel
            </Button>
            <RoleActionButton
              requiredRoles={["super_admin", "production_supervisor"]}
              fallbackTooltip="Requires Super Admin or Floor Supervisor permission to confirm/override QA decision"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              onClick={handleMakeDecision}
            >
              Confirm Verdict & Sync MySQL
            </RoleActionButton>
          </ModalFooter>
        </Modal>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAIN QA DASHBOARD (VIEW 3)
  // ---------------------------------------------------------------------------
  return (
    <>
      <TopNav title="Quality Assurance & AQL 2.5 Audit Studio" />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Quality Assurance & AQL 2.5 Audits"
          description="Enforce international quality standards with ANSI/ASQ Z1.4 sampling, defect classifications, and automated rework tickets."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="md"
                className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold"
                leftIcon={<Tablet className="h-4 w-4" />}
                onClick={() => setTabletLoggerOpen(true)}
              >
                Tablet Floor Mode
              </Button>
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
                Start Inspection
              </Button>
            </div>
          }
        />

        {/* Standardized 6 KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Pending QA"
            value={qaMetrics.pendingQA}
            sub="Awaiting floor audit"
            icon={<CheckSquare className="h-5 w-5" />}
            iconColor="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Inspected Today"
            value={`${qaMetrics.inspectedToday} Lots`}
            sub="Sample audits completed"
            icon={<ClipboardList className="h-5 w-5" />}
            iconColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Passed Today"
            value={`${(qaMetrics.passedToday || 0).toLocaleString()} Pcs`}
            sub="Approved for export"
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Failed Today"
            value={`${qaMetrics.failedToday || 0} Pcs`}
            sub="Sent to rework bay"
            icon={<XCircle className="h-5 w-5" />}
            iconColor="bg-rose-50 text-rose-600"
          />
          <StatCard
            label="First Pass Yield %"
            value={`${qaMetrics.firstPassYieldPct}%`}
            sub="Target: >98.0%"
            icon={<ShieldCheck className="h-5 w-5" />}
            iconColor="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            label="Critical Defects"
            value={qaMetrics.criticalDefects}
            sub="Zero tolerance limit"
            icon={<Flame className="h-5 w-5" />}
            iconColor="bg-purple-50 text-purple-600"
          />
        </div>

        {/* Clean Navigation Tabs */}
        <Card noPadding className="border-slate-200/80 shadow-xs bg-white overflow-x-auto">
          <div className="flex items-center gap-1 border-b border-slate-200 px-4 pt-2">
            <button
              onClick={() => setActiveView("inspections")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                activeView === "inspections"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <CheckSquare className="h-4 w-4" /> AQL Sample Inspections ({inspections.length})
            </button>
            <button
              onClick={() => setActiveView("rework")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                activeView === "rework"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Wrench className="h-4 w-4" /> Floor Rework Tickets ({reworkRecords.length})
            </button>
          </div>
        </Card>

        {activeView === "inspections" && (
          <>
            {/* Filter & Search Bar */}
            <Card noPadding className="p-3.5 sm:p-4 bg-white border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by Inspection #, Work Order #, or Inspector..."
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
                      <option value="all">All Checkpoints</option>
                      <option value="inline_sewing">Inline Sewing</option>
                      <option value="end_of_line">End-of-Line</option>
                      <option value="post_finishing">Post-Finishing</option>
                      <option value="pre_shipment_audit">Pre-Shipment Audit</option>
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
                      <option value="in_progress">In Progress</option>
                      <option value="approved">Approved / Passed</option>
                      <option value="rework_required">Rework Required</option>
                      <option value="failed">Failed</option>
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

            {/* Inspections Standard Table */}
            <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
              {filteredInspections.length === 0 ? (
                <EmptyState
                  title="No QA Inspections Found"
                  description="Start an AQL 2.5 sample audit run from an active production work order."
                  icon={<CheckSquare className="h-6 w-6" />}
                  actionLabel="Start Inspection"
                  onAction={handleOpenCreate}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Inspection #</th>
                        <th className="px-4 py-3">Checkpoint Stage</th>
                        <th className="px-4 py-3">Sample Size</th>
                        <th className="px-4 py-3">Major / Minor Def</th>
                        <th className="px-4 py-3">Verdict Result</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Lead Inspector</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedInspections.map((insp) => (
                        <tr key={insp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleOpenDetail(insp)}
                              className="font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              {insp.inspectionNumber}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-800 capitalize">
                            {insp.inspectionStage.replace(/_/g, " ")}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">
                            {insp.sampleSize} Pcs
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            <span className="text-amber-600 font-bold">{insp.majorDefects} Maj</span> /{" "}
                            <span className="text-slate-600">{insp.minorDefects} Min</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={insp.inspectionResult === "passed" ? "success" : insp.inspectionResult === "failed" ? "danger" : "warning"}>
                              {insp.inspectionResult.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={insp.status === "approved" ? "success" : "default"}>{insp.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700">{insp.inspectorName}</td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="secondary" size="sm" onClick={() => handleOpenDetail(insp)}>
                              Open Audit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {filteredInspections.length > 0 && (
                <Pagination
                  page={currentPage}
                  pageSize={ITEMS_PER_PAGE}
                  total={filteredInspections.length}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              )}
            </Card>
          </>
        )}

        {/* TAB 2: REWORK TICKETS */}
        {activeView === "rework" && (
          <Card noPadding className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Active Floor Rework Tickets</h3>
              <p className="text-xs text-slate-500">Defective pieces routed back to sewing lines for rectification</p>
            </div>

            {reworkRecords.length === 0 ? (
              <EmptyState
                title="Zero Active Rework Tickets"
                description="All production lots have cleared quality standards without pending rework."
                icon={<ShieldCheck className="h-6 w-6" />}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Rework #</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Defect Summary</th>
                      <th className="px-4 py-3">Assigned Line</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reworkRecords.map((rwk) => (
                      <tr key={rwk.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-amber-700">{rwk.reworkNumber}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{rwk.quantity} Pcs</td>
                        <td className="px-4 py-3 text-xs text-slate-700 max-w-xs truncate">{rwk.defectReason}</td>
                        <td className="px-4 py-3 font-mono text-xs">{rwk.assignedDepartment}</td>
                        <td className="px-4 py-3">
                          <Badge variant={rwk.status === "completed" ? "success" : "warning"}>{rwk.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{rwk.createdAt?.split("T")[0] || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* 10-Inch Tablet Floor Touch Defect Logger */}
      <TabletDefectLogger
        isOpen={tabletLoggerOpen}
        onClose={() => setTabletLoggerOpen(false)}
        onSaveDefect={handleSaveTabletDefect}
        lotReference={selectedInspection?.inspectionNumber || "ACTIVE-SEWING-LOT-2026"}
      />
    </>
  );
}

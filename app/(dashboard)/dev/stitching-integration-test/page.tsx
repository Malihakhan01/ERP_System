"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardGrid } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/forms/FormField";
import { useToast } from "@/components/ui/Toast";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Database,
  Link2,
  ShieldCheck,
  Layers,
  Shirt,
  Scissors,
  DollarSign,
  Clock,
  Activity,
  UserCheck,
  Plus,
  ArrowRight,
  TrendingUp,
  Sliders,
  Check,
} from "lucide-react";
import {
  getProductionLinesFromSupabase,
  createProductionLineInSupabase,
  updateProductionLineInSupabase,
  toggleProductionLineStatusInSupabase,
  allocateJobToLineInSupabase,
  getBundlesForJob,
  getAllActiveBundles,
  issueBundleToOperator,
  recordOperatorProductionOutput,
  getOperatorProductionLogsForJob,
  getOperatorProductionEarningsForMonth,
  getFloorMetricsFromSupabase,
  getProductionTimelineForJob,
  getProductionJobsFromSupabase,
  ProductionLineRecord,
  ProductionBundleRecord,
  ProductionJobRecord,
  OperatorProductionLogRecord,
  ProductionTimelineRecord,
} from "@/lib/services/production-service";
import { getEmployeesFromSupabase } from "@/lib/services/employees-service";
import type { EmployeeRecord } from "@/lib/employees-engine";

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: "idle" | "running" | "pass" | "fail" | "warning";
  message: string;
  details?: any;
  durationMs?: number;
}

export default function StitchingIntegrationTestPage() {
  const { info, success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = React.useState<"manual_studio" | "test_matrix" | "live_data">("manual_studio");
  const [loadingInitial, setLoadingInitial] = React.useState(true);

  // Live Database State
  const [lines, setLines] = React.useState<ProductionLineRecord[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeRecord[]>([]);
  const [jobs, setJobs] = React.useState<ProductionJobRecord[]>([]);
  const [bundles, setBundles] = React.useState<ProductionBundleRecord[]>([]);
  const [operatorLogs, setOperatorLogs] = React.useState<OperatorProductionLogRecord[]>([]);
  const [timelineEvents, setTimelineEvents] = React.useState<ProductionTimelineRecord[]>([]);
  const [metrics, setMetrics] = React.useState({
    activeLines: 0,
    jobsInStitching: 0,
    bundlesPending: 0,
    bundlesInStitching: 0,
    completedPiecesToday: 0,
    rejectedPiecesToday: 0,
    reworkPiecesToday: 0,
    activeOperators: 0,
    lineEfficiency: 0,
  });

  // Manual Line Form
  const [newLineCode, setNewLineCode] = React.useState("");
  const [newLineName, setNewLineName] = React.useState("");
  const [newLineCapacity, setNewLineCapacity] = React.useState("650");
  const [newLineShift, setNewLineShift] = React.useState("Morning");

  // Manual Allocation Form
  const [selectedJobId, setSelectedJobId] = React.useState("");
  const [selectedLineCode, setSelectedLineCode] = React.useState("");
  const [allocOperators, setAllocOperators] = React.useState("24");
  const [allocDailyTarget, setAllocDailyTarget] = React.useState("600");

  // Manual Bundle & Output Form
  const [selectedBundleId, setSelectedBundleId] = React.useState("");
  const [selectedOperatorId, setSelectedOperatorId] = React.useState("");
  const [selectedOperation, setSelectedOperation] = React.useState("Overlock Assembly");
  const [outputCompleted, setOutputCompleted] = React.useState("23");
  const [outputRejected, setOutputRejected] = React.useState("1");
  const [outputRework, setOutputRework] = React.useState("1");
  const [outputNotes, setOutputNotes] = React.useState("Manual diagnostic test run");

  const [isRunningAll, setIsRunningAll] = React.useState(false);

  const [tests, setTests] = React.useState<TestResult[]>([
    {
      id: "fetch_lines",
      name: "1. Stitching Line Setup & Fetch",
      category: "Line Master",
      status: "idle",
      message: "Ready to test retrieving real stitching lines from Supabase.",
    },
    {
      id: "prevent_duplicate_line",
      name: "2. Prevent Duplicate Line Identifiers",
      category: "Line Guardrail",
      status: "idle",
      message: "Verify that duplicate line codes or names are strictly blocked.",
    },
    {
      id: "select_valid_job",
      name: "3. Cutting Completed Job Selection",
      category: "Job Flow",
      status: "idle",
      message: "Verify active production jobs ready for stitching.",
    },
    {
      id: "allocate_job_to_line",
      name: "4. Allocate Job to Active Line",
      category: "Line Allocation",
      status: "idle",
      message: "Allocate production work order to designated stitching line.",
    },
    {
      id: "bundle_lifecycle",
      name: "5. Bundle Lifecycle & Status Guard",
      category: "Bundle Engine",
      status: "idle",
      message: "Verify transition rules (READY -> ISSUED -> IN_PROGRESS -> COMPLETED).",
    },
    {
      id: "operator_assignment",
      name: "6. Valid Operator Assignment",
      category: "Workforce",
      status: "idle",
      message: "Assign verified active sewing operator to cut bundle.",
    },
    {
      id: "reject_inactive_employee",
      name: "7. Inactive Employee Rejection",
      category: "Workforce Safety",
      status: "idle",
      message: "Verify inactive or archived employees are blocked from line operations.",
    },
    {
      id: "record_production_output",
      name: "8. Record Output & Enforce Capacity",
      category: "Output Entry",
      status: "idle",
      message: "Record completed, rejected, and rework quantities without exceeding capacity.",
    },
    {
      id: "piece_rate_earnings",
      name: "9. Piece-Rate Earnings Calculation",
      category: "Payroll Link",
      status: "idle",
      message: "Calculate and foreign-key verified piece earnings from employee matrix.",
    },
    {
      id: "realtime_floor_kpis",
      name: "10. Real-Time Supabase Floor KPIs",
      category: "Floor KPIs",
      status: "idle",
      message: "Verify all floor metrics strictly reflect database state with zero fallback.",
    },
  ]);

  const loadInitialData = React.useCallback(async () => {
    setLoadingInitial(true);
    try {
      const [l, emp, j, bnds, met] = await Promise.all([
        getProductionLinesFromSupabase(),
        getEmployeesFromSupabase(),
        getProductionJobsFromSupabase(),
        getAllActiveBundles(),
        getFloorMetricsFromSupabase(),
      ]);
      setLines(l);
      setEmployees(emp);
      setJobs(j);
      setBundles(bnds);
      setMetrics(met);

      if (j.length > 0) {
        setSelectedJobId((prev) => prev || j[0].id);
        const [logs, tl] = await Promise.all([
          getOperatorProductionLogsForJob(j[0].id),
          getProductionTimelineForJob(j[0].id),
        ]);
        setOperatorLogs(logs);
        setTimelineEvents(tl);
      }
      if (l.length > 0) setSelectedLineCode((prev) => prev || l[0].lineCode);
      if (emp.length > 0) setSelectedOperatorId((prev) => prev || emp[0].id);
      if (bnds.length > 0) setSelectedBundleId((prev) => prev || bnds[0].id);
    } catch (err: any) {
      console.error("Initial load error:", err);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInitialData();
  }, []);

  const updateTestStatus = (id: string, updates: Partial<TestResult>) => {
    setTests((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // Manual Line Creation
  const handleCreateLine = async () => {
    if (!newLineCode.trim() || !newLineName.trim()) {
      toastError("Line code and line name are required.");
      return;
    }
    try {
      const created = await createProductionLineInSupabase({
        lineCode: newLineCode.trim(),
        lineName: newLineName.trim(),
        department: "Stitching",
        shift: newLineShift,
        dailyTargetCapacity: parseInt(newLineCapacity, 10) || 650,
        isActive: true,
      });
      success(`Stitching Line ${created.lineName} (${created.lineCode}) created in Supabase!`);
      setNewLineCode("");
      setNewLineName("");
      await loadInitialData();
    } catch (err: any) {
      toastError(`Line creation failed: ${err.message || String(err)}`);
    }
  };

  // Manual Toggle Line Status
  const handleToggleLine = async (line: ProductionLineRecord) => {
    try {
      await toggleProductionLineStatusInSupabase(line.id, !line.isActive);
      success(`Line ${line.lineName} is now ${!line.isActive ? "ACTIVE" : "INACTIVE"}.`);
      await loadInitialData();
    } catch (err: any) {
      toastError(`Failed to toggle line status: ${err.message || String(err)}`);
    }
  };

  // Manual Job Allocation
  const handleAllocateJob = async () => {
    if (!selectedJobId || !selectedLineCode) {
      toastError("Please select both a Production Job and a Sewing Line.");
      return;
    }
    try {
      const alloc = await allocateJobToLineInSupabase({
        productionJobId: selectedJobId,
        lineCode: selectedLineCode,
        allocatedOperators: parseInt(allocOperators, 10) || 24,
        targetDailyOutput: parseInt(allocDailyTarget, 10) || 600,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      });
      success(`Job successfully allocated to Line ${alloc.lineCode}!`);
      await loadInitialData();
    } catch (err: any) {
      toastError(`Allocation failed: ${err.message || String(err)}`);
    }
  };

  // Manual Bundle Issue
  const handleIssueBundle = async () => {
    if (!selectedBundleId || !selectedOperatorId) {
      toastError("Please select a bundle and an operator.");
      return;
    }
    const emp = employees.find((e) => e.id === selectedOperatorId);
    const bnd = bundles.find((b) => b.id === selectedBundleId);
    if (!emp || !bnd) return;

    try {
      await issueBundleToOperator({
        bundleId: bnd.id,
        productionJobId: bnd.productionJobId,
        employeeId: emp.id,
        employeeName: emp.personalInfo?.fullName || "Operator",
        operationName: selectedOperation,
        lineCode: selectedLineCode || "line_1",
      });
      success(`Bundle ${bnd.bundleBarcode} issued to ${emp.personalInfo?.fullName}!`);
      await loadInitialData();
    } catch (err: any) {
      toastError(`Bundle issue failed: ${err.message || String(err)}`);
    }
  };

  // Manual Output Entry
  const handleRecordOutput = async () => {
    if (!selectedBundleId || !selectedOperatorId) {
      toastError("Please select a bundle and an operator.");
      return;
    }
    const emp = employees.find((e) => e.id === selectedOperatorId);
    const bnd = bundles.find((b) => b.id === selectedBundleId);
    if (!emp || !bnd) return;

    const completed = parseInt(outputCompleted, 10) || 0;
    const rejected = parseInt(outputRejected, 10) || 0;
    const rework = parseInt(outputRework, 10) || 0;

    const matchedOp = emp.salaryInfo?.pieceRateOperations?.find(
      (op) => op.operationName.toLowerCase() === selectedOperation.toLowerCase()
    );
    const rate = matchedOp ? matchedOp.ratePerPiece : (emp.salaryInfo?.pieceRate || 15.0);

    try {
      const log = await recordOperatorProductionOutput({
        productionJobId: bnd.productionJobId,
        bundleId: bnd.id,
        employeeId: emp.id,
        employeeName: emp.personalInfo?.fullName || "Operator",
        operationName: selectedOperation,
        piecesCompleted: completed,
        piecesRejected: rejected,
        piecesRework: rework,
        ratePerPiece: rate,
        workDate: new Date().toISOString().split("T")[0],
        shift: "Morning",
        payrollMonth: new Date().toISOString().substring(0, 7),
        notes: outputNotes,
      });
      success(`Recorded output: ${completed} completed pcs. Verified Piece Earnings: PKR ${log.totalEarnings.toFixed(2)}.`);
      await loadInitialData();
    } catch (err: any) {
      toastError(`Output entry failed: ${err.message || String(err)}`);
    }
  };

  // Run Test 1
  const runTest1 = async (): Promise<boolean> => {
    const t0 = performance.now();
    updateTestStatus("fetch_lines", { status: "running", message: "Fetching stitching lines..." });
    try {
      const linesList = await getProductionLinesFromSupabase();
      setLines(linesList);
      updateTestStatus("fetch_lines", {
        status: "pass",
        message: `Successfully fetched ${linesList.length} production lines from Supabase.`,
        details: { count: linesList.length, lines: linesList.map((l) => l.lineCode) },
        durationMs: Math.round(performance.now() - t0),
      });
      return true;
    } catch (err: any) {
      updateTestStatus("fetch_lines", {
        status: "fail",
        message: `Line fetch failed: ${err.message}`,
        durationMs: Math.round(performance.now() - t0),
      });
      return false;
    }
  };

  // Run Test 2
  const runTest2 = async (): Promise<boolean> => {
    const t0 = performance.now();
    updateTestStatus("prevent_duplicate_line", { status: "running", message: "Attempting duplicate line insertion..." });
    try {
      const currentLines = await getProductionLinesFromSupabase();
      const testCode = currentLines.length > 0 ? currentLines[0].lineCode : "line_1";
      let prevented = false;
      try {
        await createProductionLineInSupabase({
          lineCode: testCode,
          lineName: "Duplicate Test Line",
          department: "Stitching",
          shift: "Morning",
          dailyTargetCapacity: 600,
          isActive: true,
        });
      } catch (e: any) {
        if (e.message.includes("Duplicate line identifier") || e.message.includes("already exists")) {
          prevented = true;
        }
      }

      if (prevented) {
        updateTestStatus("prevent_duplicate_line", {
          status: "pass",
          message: `Duplicate line code '${testCode}' correctly rejected with validation error.`,
          durationMs: Math.round(performance.now() - t0),
        });
        return true;
      } else {
        updateTestStatus("prevent_duplicate_line", {
          status: "fail",
          message: "Duplicate line identifier was not blocked by validation guard.",
          durationMs: Math.round(performance.now() - t0),
        });
        return false;
      }
    } catch (err: any) {
      updateTestStatus("prevent_duplicate_line", {
        status: "fail",
        message: `Error: ${err.message}`,
        durationMs: Math.round(performance.now() - t0),
      });
      return false;
    }
  };

  // Run All Tests
  const runAllTests = async () => {
    setIsRunningAll(true);
    info("Starting Phase 2.4 Stitching Line & Floor Tracking Integration Test Suite...");
    try {
      await runTest1();
      await runTest2();
      success("Phase 2.4 automated checks completed.");
    } finally {
      setIsRunningAll(false);
    }
  };

  const passCount = tests.filter((t) => t.status === "pass").length;
  const failCount = tests.filter((t) => t.status === "fail").length;

  return (
    <>
      <TopNav title="Dev Diagnostics / Stitching Integration Test" />

      <div className="space-y-6 p-6">
        <PageHeader
          title="Phase 2.4: Stitching Line & Floor Tracking Interactive Test Studio"
          description="Direct Supabase integration workbench to manually test Stitching Lines, Bundle Lifecycles, Operator Output, Piece Rates, and Real-Time Floor KPIs."
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={() => {
                  loadInitialData();
                  info("Database state refreshed.");
                }}
              >
                Refresh Data
              </Button>
              <Button
                variant="primary"
                leftIcon={<Play className="h-4 w-4" />}
                onClick={runAllTests}
                disabled={isRunningAll || loadingInitial}
              >
                {isRunningAll ? "Running Suite..." : "Run Automated Suite"}
              </Button>
            </div>
          }
        />

        {/* Live Real-Time Floor Metrics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="p-4">
            <span className="text-xs font-medium text-slate-400">Active Lines</span>
            <p className="mt-1 text-2xl font-bold text-slate-100">{metrics.activeLines}</p>
          </Card>
          <Card className="p-4">
            <span className="text-xs font-medium text-slate-400">Jobs in Stitching</span>
            <p className="mt-1 text-2xl font-bold text-primary">{metrics.jobsInStitching}</p>
          </Card>
          <Card className="p-4">
            <span className="text-xs font-medium text-slate-400">Bundles in Progress</span>
            <p className="mt-1 text-2xl font-bold text-amber-400">{metrics.bundlesInStitching}</p>
          </Card>
          <Card className="p-4">
            <span className="text-xs font-medium text-slate-400">Stitched Today</span>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{metrics.completedPiecesToday} Pcs</p>
          </Card>
          <Card className="p-4">
            <span className="text-xs font-medium text-slate-400">Rejected Today</span>
            <p className="mt-1 text-2xl font-bold text-rose-400">{metrics.rejectedPiecesToday} Pcs</p>
          </Card>
          <Card className="p-4">
            <span className="text-xs font-medium text-slate-400">Line Efficiency</span>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{metrics.lineEfficiency}%</p>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Card className="p-1">
          <div className="flex gap-2 border-b border-slate-800 px-3 pt-2">
            <button
              onClick={() => setActiveTab("manual_studio")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition ${
                activeTab === "manual_studio" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sliders className="h-4 w-4" /> Interactive Manual Workbench
            </button>
            <button
              onClick={() => setActiveTab("live_data")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition ${
                activeTab === "live_data" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Database className="h-4 w-4" /> Live Database Records ({lines.length} Lines, {bundles.length} Bundles)
            </button>
            <button
              onClick={() => setActiveTab("test_matrix")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition ${
                activeTab === "test_matrix" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="h-4 w-4" /> Automated Suite ({passCount}/{tests.length} PASS)
            </button>
          </div>
        </Card>

        {/* TAB 1: INTERACTIVE MANUAL WORKBENCH */}
        {activeTab === "manual_studio" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Section 1: Create & Toggle Stitching Lines */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shirt className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold text-slate-200">1. Stitching Line Setup & Master</h3>
                </div>
                <Badge variant="primary">Supabase Table: production_lines</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Line Code (e.g. LINE-A01)">
                  <Input value={newLineCode} onChange={(e) => setNewLineCode(e.target.value)} placeholder="LINE-04" />
                </FormField>
                <FormField label="Line Name">
                  <Input value={newLineName} onChange={(e) => setNewLineName(e.target.value)} placeholder="Main Sewing Line 4" />
                </FormField>
                <FormField label="Daily Target Capacity">
                  <Input type="number" value={newLineCapacity} onChange={(e) => setNewLineCapacity(e.target.value)} />
                </FormField>
                <FormField label="Shift">
                  <select
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    value={newLineShift}
                    onChange={(e) => setNewLineShift(e.target.value)}
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Night">Night Shift</option>
                  </select>
                </FormField>
              </div>

              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={handleCreateLine}>
                Create Stitching Line
              </Button>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-400">Existing Lines:</span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {lines.map((l) => (
                    <div key={l.id} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                      <div>
                        <span className="font-bold text-slate-200">{l.lineName}</span>{" "}
                        <span className="font-mono text-slate-400">({l.lineCode})</span>
                        <p className="text-[10px] text-slate-500">Cap: {l.dailyTargetCapacity} pcs/day • Shift: {l.shift}</p>
                      </div>
                      <Button variant={l.isActive ? "secondary" : "ghost"} size="sm" onClick={() => handleToggleLine(l)}>
                        {l.isActive ? "Active (Click to Deactivate)" : "Inactive (Click to Activate)"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Section 2: Allocate Job to Line */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-amber-400" />
                  <h3 className="text-sm font-semibold text-slate-200">2. Allocate Production Job to Line</h3>
                </div>
                <Badge variant="warning">sewing_line_allocations</Badge>
              </div>

              <FormField label="Select Production Job">
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.jobNumber} — {j.clientName} ({j.styleCode} • {j.plannedQuantity} Pcs, Stage: {j.stage})
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Target Line">
                  <select
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    value={selectedLineCode}
                    onChange={(e) => setSelectedLineCode(e.target.value)}
                  >
                    {lines.map((l) => (
                      <option key={l.id} value={l.lineCode}>
                        {l.lineName} {l.isActive ? "" : "(INACTIVE)"}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Allocated Operators">
                  <Input type="number" value={allocOperators} onChange={(e) => setAllocOperators(e.target.value)} />
                </FormField>
              </div>

              <FormField label="Daily Production Target (Pcs)">
                <Input type="number" value={allocDailyTarget} onChange={(e) => setAllocDailyTarget(e.target.value)} />
              </FormField>

              <Button variant="primary" leftIcon={<ArrowRight className="h-4 w-4" />} onClick={handleAllocateJob}>
                Allocate Job &amp; Update Stage to &apos;Stitching&apos;
              </Button>
            </Card>

            {/* Section 3: Issue Bundle to Operator */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-200">3. Issue Bundle to Operator</h3>
                </div>
                <Badge variant="success">production_bundles</Badge>
              </div>

              <FormField label="Select Cut Bundle">
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  value={selectedBundleId}
                  onChange={(e) => setSelectedBundleId(e.target.value)}
                >
                  {bundles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bundleBarcode} (Size: {b.size}, Qty: {b.quantity} pcs, Status: {b.status})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Assign Sewing Operator (Active Employees)">
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  value={selectedOperatorId}
                  onChange={(e) => setSelectedOperatorId(e.target.value)}
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.personalInfo?.fullName} ({e.employmentInfo?.designation || "Operator"} • {e.employmentInfo?.department})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Garment Operation">
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  value={selectedOperation}
                  onChange={(e) => setSelectedOperation(e.target.value)}
                >
                  <option value="Overlock Assembly">Overlock Assembly</option>
                  <option value="Collar Stitching">Collar Stitching</option>
                  <option value="Sleeve Joining">Sleeve Joining</option>
                  <option value="Side Seam Joining">Side Seam Joining</option>
                  <option value="Bottom Hemming">Bottom Hemming</option>
                  <option value="Buttonhole & Buttoning">Buttonhole & Buttoning</option>
                </select>
              </FormField>

              <Button variant="primary" leftIcon={<Shirt className="h-4 w-4" />} onClick={handleIssueBundle}>
                Issue Bundle to Operator
              </Button>
            </Card>

            {/* Section 4: Record Output & Piece-Rate */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-200">4. Record Output & Verified Earnings</h3>
                </div>
                <Badge variant="primary">operator_production_logs</Badge>
              </div>

              {(() => {
                const emp = employees.find((e) => e.id === selectedOperatorId);
                const matchedOp = emp?.salaryInfo?.pieceRateOperations?.find(
                  (op) => op.operationName.toLowerCase() === selectedOperation.toLowerCase()
                );
                const rate = matchedOp ? matchedOp.ratePerPiece : (emp?.salaryInfo?.pieceRate || 15.0);
                const comp = parseInt(outputCompleted, 10) || 0;
                const estEarnings = comp * rate;

                return (
                  <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs flex justify-between">
                    <span className="text-slate-400">Piece Rate for {selectedOperation}:</span>
                    <span className="font-bold text-emerald-400">PKR {rate.toFixed(2)} / pc (Est: PKR {estEarnings.toFixed(2)})</span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-3">
                <FormField label="Completed (Passed)">
                  <Input type="number" value={outputCompleted} onChange={(e) => setOutputCompleted(e.target.value)} />
                </FormField>
                <FormField label="Rejected (Defects)">
                  <Input type="number" value={outputRejected} onChange={(e) => setOutputRejected(e.target.value)} />
                </FormField>
                <FormField label="Rework Required">
                  <Input type="number" value={outputRework} onChange={(e) => setOutputRework(e.target.value)} />
                </FormField>
              </div>

              <FormField label="Remarks / Notes">
                <Input value={outputNotes} onChange={(e) => setOutputNotes(e.target.value)} />
              </FormField>

              <Button variant="primary" leftIcon={<Check className="h-4 w-4" />} onClick={handleRecordOutput}>
                Submit Output Entry
              </Button>
            </Card>
          </div>
        )}

        {/* TAB 2: LIVE DATABASE RECORDS */}
        {activeTab === "live_data" && (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-800 p-4">
                <h3 className="text-sm font-semibold text-slate-200">Live Production Bundles ({bundles.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-slate-800 bg-slate-900/50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Bundle Barcode</th>
                      <th className="px-4 py-3">Size & Qty</th>
                      <th className="px-4 py-3">Stage</th>
                      <th className="px-4 py-3">Line</th>
                      <th className="px-4 py-3">Assigned Operator</th>
                      <th className="px-4 py-3">Operation</th>
                      <th className="px-4 py-3">Progress (P/R/W)</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bundles.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3 font-mono font-medium text-slate-200">{b.bundleBarcode}</td>
                        <td className="px-4 py-3">{b.size} • {b.quantity} pcs</td>
                        <td className="px-4 py-3">{b.currentStage}</td>
                        <td className="px-4 py-3 font-mono text-xs">{b.currentLine}</td>
                        <td className="px-4 py-3">{b.assignedEmployeeName || "Unassigned"}</td>
                        <td className="px-4 py-3">{b.assignedOperation || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="text-emerald-400">{b.passedPieces} P</span> /{" "}
                          <span className="text-rose-400">{b.rejectedPieces} R</span> /{" "}
                          <span className="text-amber-400">{b.reworkPieces} W</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={b.status === "completed" ? "success" : "warning"}>{b.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-800 p-4">
                <h3 className="text-sm font-semibold text-slate-200">Recent Operator Production Logs ({operatorLogs.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-slate-800 bg-slate-900/50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Date & Shift</th>
                      <th className="px-4 py-3">Operator</th>
                      <th className="px-4 py-3">Operation</th>
                      <th className="px-4 py-3">Completed</th>
                      <th className="px-4 py-3">Rejections</th>
                      <th className="px-4 py-3">Rework</th>
                      <th className="px-4 py-3">Rate</th>
                      <th className="px-4 py-3">Total Earnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {operatorLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3">{l.workDate} ({l.shift})</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{l.employeeName}</td>
                        <td className="px-4 py-3">{l.operationName}</td>
                        <td className="px-4 py-3 font-bold text-primary">{l.piecesCompleted} pcs</td>
                        <td className="px-4 py-3 text-rose-400">{l.piecesRejected} pcs</td>
                        <td className="px-4 py-3 text-amber-400">{l.piecesRework} pcs</td>
                        <td className="px-4 py-3">PKR {l.ratePerPiece.toFixed(2)}</td>
                        <td className="px-4 py-3 font-bold text-emerald-400">PKR {l.totalEarnings.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: AUTOMATED TEST MATRIX */}
        {activeTab === "test_matrix" && (
          <Card className="overflow-hidden">
            <div className="border-b border-slate-800 p-4 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-200">Phase 2.4 Verification Matrix</h3>
              <Badge variant="primary">{passCount} of {tests.length} Passed</Badge>
            </div>
            <div className="divide-y divide-slate-800">
              {tests.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-slate-900/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{t.name}</span>
                      <Badge variant="default">{t.category}</Badge>
                    </div>
                    <p className="text-xs text-slate-400">{t.message}</p>
                    {t.details && (
                      <pre className="mt-1 text-[10px] text-slate-500 bg-slate-950 p-1.5 rounded">
                        {JSON.stringify(t.details)}
                      </pre>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {t.durationMs !== undefined && (
                      <span className="text-xs font-mono text-slate-500">{t.durationMs}ms</span>
                    )}
                    {t.status === "pass" && <Badge variant="success">PASS</Badge>}
                    {t.status === "fail" && <Badge variant="danger">FAIL</Badge>}
                    {t.status === "running" && <Badge variant="warning">RUNNING</Badge>}
                    {t.status === "idle" && <Badge variant="default">IDLE</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

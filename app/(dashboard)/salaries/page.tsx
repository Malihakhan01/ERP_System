"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { EmptyState, Pagination } from "@/components/ui/Misc";
import { FormField, FormSection } from "@/components/forms/FormField";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  DollarSign,
  Plus,
  CheckCircle2,
  Clock,
  HandCoins,
  FileText,
  Calendar,
  RotateCcw,
  Printer,
  Search,
  Building2,
  Users,
  Eye,
  CreditCard,
  AlertCircle,
  Download,
  Check,
  Briefcase,
  Layers,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  PayrollRun,
  PayrollRecordItem,
  PayrollPayment,
  PAYROLL_STORAGE_KEY,
  processMonthlyPayrollRun,
  markPayrollRecordPaid,
  markPayrollRunPaid,
  computePayrollDashboardMetrics,
  calculateEmployeePayrollRecord,
  formatPKR,
} from "@/lib/payroll-engine";
import {
  EmployeeRecord,
  EMPLOYEE_STORAGE_KEY,
  DEPARTMENTS,
} from "@/lib/employees-engine";
import {
  AdvanceRecord,
  ADVANCE_STORAGE_KEY,
  deduplicateAndFixAdvances,
} from "@/lib/advances-engine";
import {
  getPayrollRunsFromSupabase,
  createPayrollRunInSupabase,
  updatePayrollRecordPaidInSupabase,
} from "@/lib/services/payroll-service";
import { getEmployeesFromSupabase } from "@/lib/services/employees-service";
import { getAdvancesFromSupabase } from "@/lib/services/advances-service";
import { RoleActionButton } from "@/components/auth/RoleActionButton";

const STATUS_CONFIG = {
  Pending: { label: "Pending Payout", variant: "warning" as const },
  Paid: { label: "Disbursed / Paid", variant: "success" as const },
};

export default function SalariesPage() {
  const router = useRouter();
  const { toast, success, error: toastError } = useToast();

  // Storage synchronization
  const getEmployeesSnapshot = React.useCallback(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(EMPLOYEE_STORAGE_KEY) || "[]" : "[]";
    } catch {
      return "[]";
    }
  }, []);

  const getAdvancesSnapshot = React.useCallback(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(ADVANCE_STORAGE_KEY) || "[]" : "[]";
    } catch {
      return "[]";
    }
  }, []);

  const getPayrollSnapshot = React.useCallback(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(PAYROLL_STORAGE_KEY) || "[]" : "[]";
    } catch {
      return "[]";
    }
  }, []);

  const getServerSnapshot = React.useCallback(() => "[]", []);

  const subscribe = React.useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }, []);

  const rawEmployeesJson = React.useSyncExternalStore(subscribe, getEmployeesSnapshot, getServerSnapshot);
  const rawAdvancesJson = React.useSyncExternalStore(subscribe, getAdvancesSnapshot, getServerSnapshot);
  const rawPayrollJson = React.useSyncExternalStore(subscribe, getPayrollSnapshot, getServerSnapshot);

  const [localEmployeesOverride, setLocalEmployeesOverride] = React.useState<EmployeeRecord[] | null>(null);
  const [localAdvancesOverride, setLocalAdvancesOverride] = React.useState<AdvanceRecord[] | null>(null);
  const [localPayrollOverride, setLocalPayrollOverride] = React.useState<PayrollRun[] | null>(null);
  const [loadingPayroll, setLoadingPayroll] = React.useState(false);

  const loadPayrollData = React.useCallback(async (showToast = false) => {
    setLoadingPayroll(true);
    try {
      const [emps, advs, runs] = await Promise.all([
        getEmployeesFromSupabase().catch(() => []),
        getAdvancesFromSupabase().catch(() => []),
        getPayrollRunsFromSupabase().catch(() => []),
      ]);

      if (emps && emps.length > 0) setLocalEmployeesOverride(emps);
      if (advs && advs.length > 0) setLocalAdvancesOverride(advs);
      if (runs && runs.length > 0) setLocalPayrollOverride(runs);

      if (showToast) {
        success("Payroll Data Refreshed", { description: "Loaded live workforce salaries and loan records from MySQL." });
      }
    } catch (err: any) {
      console.error("Failed to load payroll data:", err);
      if (showToast) {
        toastError("Failed to Refresh", { description: err.message });
      }
    } finally {
      setLoadingPayroll(false);
    }
  }, [success, toastError]);

  // Sync on mount
  React.useEffect(() => {
    loadPayrollData();
  }, [loadPayrollData]);

  const employees: EmployeeRecord[] = React.useMemo(() => {
    if (localEmployeesOverride !== null) return localEmployeesOverride;
    try {
      const list = JSON.parse(rawEmployeesJson) as EmployeeRecord[];
      const seen = new Set<string>();
      return list.filter((emp) => {
        if (!emp || !emp.id || emp.isArchived) return false;
        if (seen.has(emp.id) || (emp.employeeNumber && seen.has(emp.employeeNumber))) return false;
        seen.add(emp.id);
        if (emp.employeeNumber) seen.add(emp.employeeNumber);
        return true;
      });
    } catch {
      return [];
    }
  }, [rawEmployeesJson, localEmployeesOverride]);

  const advances: AdvanceRecord[] = React.useMemo(() => {
    if (localAdvancesOverride !== null) return localAdvancesOverride;
    try {
      const list = JSON.parse(rawAdvancesJson) as AdvanceRecord[];
      return deduplicateAndFixAdvances(list);
    } catch {
      return [];
    }
  }, [rawAdvancesJson, localAdvancesOverride]);

  const payrollRuns: PayrollRun[] = React.useMemo(() => {
    if (localPayrollOverride !== null) return localPayrollOverride;
    try {
      const list = JSON.parse(rawPayrollJson) as PayrollRun[];
      const seen = new Set<string>();
      return list.filter((r) => {
        if (!r || !r.id) return false;
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    } catch {
      return [];
    }
  }, [rawPayrollJson, localPayrollOverride]);

  const savePayrollRuns = (newRuns: PayrollRun[]) => {
    setLocalPayrollOverride(newRuns);
    try {
      localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(newRuns));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Failed to save payroll runs to localStorage", e);
    }
  };

  // State: Filters & View
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [deptFilter, setDeptFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 10;

  // Payslip Preview Modal
  const [selectedRecordForPayslip, setSelectedRecordForPayslip] = React.useState<PayrollRecordItem | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = React.useState(false);

  // Single Disburse Modal
  const [recordToDisburse, setRecordToDisburse] = React.useState<PayrollRecordItem | null>(null);
  const [disbursePaymentMethod, setDisbursePaymentMethod] = React.useState("Bank Transfer");
  const [disburseBankRef, setDisburseBankRef] = React.useState("");

  // All Flattened Records across runs
  const allPayrollRecords: PayrollRecordItem[] = React.useMemo(() => {
    const list: PayrollRecordItem[] = [];
    for (const run of payrollRuns) {
      if (run.records) {
        list.push(...run.records);
      }
    }
    return list;
  }, [payrollRuns]);

  // Dashboard Metrics
  const metrics = React.useMemo(() => {
    return computePayrollDashboardMetrics(payrollRuns, selectedMonth !== "all" ? selectedMonth : undefined);
  }, [payrollRuns, selectedMonth]);

  // Filtered Records for Table
  const filteredRecords = React.useMemo(() => {
    return allPayrollRecords.filter((rec) => {
      if (selectedMonth !== "all" && rec.payrollMonth !== selectedMonth) {
        return false;
      }
      if (deptFilter !== "all" && rec.department !== deptFilter) {
        return false;
      }
      if (statusFilter !== "all" && rec.paymentStatus !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = rec.employeeName.toLowerCase().includes(q);
        const matchesEmpNum = rec.employeeNumber.toLowerCase().includes(q);
        const matchesDept = rec.department.toLowerCase().includes(q);
        if (!matchesName && !matchesEmpNum && !matchesDept) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allPayrollRecords, selectedMonth, deptFilter, statusFilter, searchQuery]);

  const paginatedRecords = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, page]);

  // Open Dedicated Full-Page Payroll Preview & Generation
  const openProcessModal = () => {
    router.push("/salaries/payroll-preview");
  };

  // View Payslip
  const handleViewPayslip = (record: PayrollRecordItem) => {
    setSelectedRecordForPayslip(record);
    setIsPayslipModalOpen(true);
  };

  // Open Disburse Modal
  const openDisburseModal = (record: PayrollRecordItem) => {
    setRecordToDisburse(record);
    setDisbursePaymentMethod(record.paymentMethod || "Bank Transfer");
    setDisburseBankRef(`FT-${Date.now().toString().slice(-6)}`);
  };

  // Confirm Single Disbursement
  const handleConfirmDisbursement = () => {
    if (!recordToDisburse) return;

    const { updatedRecord, payment } = markPayrollRecordPaid(
      recordToDisburse,
      disbursePaymentMethod,
      disburseBankRef
    );

    // Update in payrollRuns state
    const updatedRuns = payrollRuns.map((run) => {
      const recIdx = run.records.findIndex((r) => r.id === updatedRecord.id);
      if (recIdx === -1) return run;

      const updatedRecords = [...run.records];
      updatedRecords[recIdx] = updatedRecord;
      const paidCount = updatedRecords.filter((r) => r.paymentStatus === "Paid").length;

      return {
        ...run,
        paidCount,
        pendingCount: updatedRecords.length - paidCount,
        status: paidCount === updatedRecords.length ? ("Paid" as const) : run.status,
        records: updatedRecords,
      };
    });

    savePayrollRuns(updatedRuns);
    updatePayrollRecordPaidInSupabase(updatedRecord, payment).catch((e) => console.error(e));

    setRecordToDisburse(null);
    toast({
      type: "success",
      message: "Wage Disbursed & Marked Paid",
      description: `${updatedRecord.employeeName} — ${formatPKR(updatedRecord.netPayable)} transferred via ${disbursePaymentMethod}.`,
    });
  };

  return (
    <>
      <TopNav title="Monthly Factory Payroll & Wage Disbursements" />

      <div className="space-y-6 min-w-0 w-full p-4 lg:p-6 pb-20 animate-in fade-in-0 duration-200">
        {/* Page Header */}
        <PageHeader
          title="Salaries & Monthly Factory Payroll"
          description="Process workforce wages, piece-rate earnings, overtime allowances, automatic advance loan deductions, and print employee payslips."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<RefreshCw className={`h-4 w-4 ${loadingPayroll ? "animate-spin" : ""}`} />}
                onClick={() => loadPayrollData(true)}
              >
                Refresh
              </Button>
              <RoleActionButton
                requiredRoles={["super_admin", "finance"]}
                fallbackTooltip="Requires Finance Lead or Super Admin permission to process payroll runs"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                onClick={openProcessModal}
              >
                <Plus className="h-4 w-4" />
                Process Monthly Payroll
              </RoleActionButton>
            </div>
          }
        />

        {/* 5 Clean SaaS White KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Gross Payroll</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5 truncate">{formatPKR(metrics.totalGrossPayroll)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Wages before deductions</p>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Net Payable</span>
            <p className="text-lg font-bold text-blue-700 mt-0.5 truncate">{formatPKR(metrics.totalNetPayable)}</p>
            <p className="text-[11px] text-blue-600 mt-0.5">Take-home workforce wages</p>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pending Payouts</span>
            <p className={`text-lg font-bold mt-0.5 truncate ${metrics.pendingDisbursementAmount > 0 ? "text-amber-700" : "text-slate-900"}`}>
              {formatPKR(metrics.pendingDisbursementAmount)}
            </p>
            <p className="text-[11px] text-amber-600 mt-0.5">{metrics.pendingEmployeesCount} workers pending</p>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Advance Loan Recovery</span>
            <p className="text-lg font-bold text-purple-700 mt-0.5 truncate">{formatPKR(metrics.advanceLoansDeducted)}</p>
            <p className="text-[11px] text-purple-600 mt-0.5">Auto-recovered loans</p>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Workforce on Payroll</span>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{metrics.totalEmployeesProcessed}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">{metrics.paidEmployeesCount} paid / {metrics.pendingEmployeesCount} pending</p>
          </Card>
        </div>

        {/* Filter Toolbar */}
        <Card className="p-4 border-slate-200/80 shadow-xs bg-white">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Employee Name, ID, or Department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Month Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                />
              </div>

              {/* Department Filter */}
              <div className="w-44">
                <Select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  options={[
                    { label: "All Departments", value: "all" },
                    ...DEPARTMENTS.map((d) => ({ label: d, value: d })),
                  ]}
                />
              </div>

              {/* Status Filter */}
              <div className="w-36">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { label: "All Statuses", value: "all" },
                    { label: "Pending Payout", value: "Pending" },
                    { label: "Paid", value: "Paid" },
                  ]}
                />
              </div>

              {(searchQuery || deptFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setSearchQuery("");
                    setDeptFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Main Payroll Table */}
        <Card className="border-slate-200/80 shadow-xs bg-white overflow-hidden" noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Department & Role</th>
                  <th className="py-3 px-3">Wage Model</th>
                  <th className="py-3 px-3 text-right">Basic / Base</th>
                  <th className="py-3 px-3 text-right">Piece Rate</th>
                  <th className="py-3 px-3 text-right">Overtime</th>
                  <th className="py-3 px-3 text-right text-purple-700">Advance Loan</th>
                  <th className="py-3 px-3 text-right font-bold">Gross Wage</th>
                  <th className="py-3 px-3 text-right font-bold text-blue-700">Net Payable</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Employee */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{rec.employeeName}</span>
                          <span className="font-mono text-[11px] text-blue-600">{rec.employeeNumber}</span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{rec.department}</span>
                          <span className="text-[11px] text-slate-500">{rec.designation}</span>
                        </div>
                      </td>

                      {/* Wage Model */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {rec.salaryType === "monthly" ? "Monthly Fixed" : rec.salaryType === "daily" ? "Daily Wage" : "Piece Rate"}
                        </span>
                      </td>

                      {/* Basic */}
                      <td className="py-3 px-3 text-right font-mono">
                        {rec.salaryType === "daily" ? `${formatPKR(rec.dailyWage)}/d` : formatPKR(rec.basicSalary)}
                      </td>

                      {/* Piece Rate */}
                      <td className="py-3 px-3 text-right font-mono text-emerald-700">
                        {rec.pieceRateAmount > 0 ? formatPKR(rec.pieceRateAmount) : "—"}
                      </td>

                      {/* Overtime */}
                      <td className="py-3 px-3 text-right font-mono">
                        {rec.overtimeAmount > 0 ? (
                          <div>
                            <span>{formatPKR(rec.overtimeAmount)}</span>
                            <span className="block text-[10px] text-slate-400">({rec.overtimeHours} hrs)</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Advance Deduction */}
                      <td className="py-3 px-3 text-right font-mono text-purple-700">
                        {rec.advanceDeduction > 0 ? (
                          <div>
                            <span className="font-bold">-{formatPKR(rec.advanceDeduction)}</span>
                            <span className="block text-[10px] text-slate-400">
                              (Rem: {formatPKR(rec.remainingAdvanceBalance)})
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Gross */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatPKR(rec.grossSalary)}
                      </td>

                      {/* Net Payable */}
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-blue-700 bg-blue-50/30">
                        {formatPKR(rec.netPayable)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <Badge variant={STATUS_CONFIG[rec.paymentStatus]?.variant || "default"}>
                          {STATUS_CONFIG[rec.paymentStatus]?.label || rec.paymentStatus}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View / Print Payslip"
                            onClick={() => handleViewPayslip(rec)}
                          >
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                          </Button>
                          {rec.paymentStatus === "Pending" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              title="Disburse / Mark Paid"
                              onClick={() => openDisburseModal(rec)}
                              className="text-[11px] py-1 px-2.5 text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="py-12 text-center">
                      <EmptyState
                        icon={<DollarSign className="h-6 w-6 text-blue-600" />}
                        title={`No Payroll Records for ${selectedMonth}`}
                        description={
                          searchQuery || deptFilter !== "all"
                            ? "Try clearing your search query or filters."
                            : "Click '+ Process Monthly Payroll' to calculate and generate salary statements for this month."
                        }
                        actionLabel="Process Monthly Payroll"
                        onAction={openProcessModal}
                        actionIcon={<Plus className="h-4 w-4" />}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredRecords.length > PAGE_SIZE && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={filteredRecords.length} onPageChange={setPage} />
          )}
        </Card>
      </div>

      {/* ========================================== */}
      {/* MODAL: PROFESSIONAL PAYSLIP VIEW & PRINT   */}
      {/* ========================================== */}

      {/* ========================================== */}
      {/* MODAL: PROFESSIONAL PAYSLIP VIEW & PRINT   */}
      {/* ========================================== */}
      {selectedRecordForPayslip && (
        <Modal
          isOpen={isPayslipModalOpen}
          onClose={() => setIsPayslipModalOpen(false)}
          title={`Payslip Statement — ${selectedRecordForPayslip.employeeNumber}`}
          size="lg"
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Printable Payslip Container */}
            <div className="p-6 bg-white border border-slate-300 rounded-xl space-y-6 text-xs text-slate-900 font-sans shadow-xs">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight uppercase text-slate-900">FactoryOS ERP</h2>
                  <p className="text-[11px] text-slate-600">Garment Manufacturing Factory • Confidential Salary Slip</p>
                  <p className="text-[10px] text-slate-500">Industrial Area, Karachi / Lahore, Pakistan</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm uppercase text-blue-900 bg-blue-50 px-3 py-1 rounded border border-blue-200 inline-block">
                    {selectedRecordForPayslip.payrollMonth} Statement
                  </span>
                  <p className="font-mono text-[10px] text-slate-500 mt-1">Ref: {selectedRecordForPayslip.id}</p>
                </div>
              </div>

              {/* Employee Snapshot Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Employee Name</span>
                  <p className="font-bold text-slate-900">{selectedRecordForPayslip.employeeName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Employee ID</span>
                  <p className="font-mono font-bold text-blue-700">{selectedRecordForPayslip.employeeNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                  <p className="font-bold text-slate-900">{selectedRecordForPayslip.department}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Designation</span>
                  <p className="font-semibold text-slate-800">{selectedRecordForPayslip.designation}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Wage Model</span>
                  <p className="font-semibold text-slate-800">
                    {selectedRecordForPayslip.salaryType === "monthly"
                      ? "Monthly Fixed"
                      : selectedRecordForPayslip.salaryType === "daily"
                      ? "Daily Wage"
                      : "Piece Rate Production"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Attendance Days</span>
                  <p className="font-semibold text-slate-800">
                    {selectedRecordForPayslip.presentDays} / {selectedRecordForPayslip.workingDays} days
                  </p>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown 2-Column Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100/80 px-3 py-2 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-700">
                    Gross Earnings
                  </div>
                  <div className="divide-y divide-slate-100 p-2 font-mono">
                    <div className="flex justify-between py-1.5">
                      <span className="font-sans text-slate-700">Basic / Base Wage:</span>
                      <span className="font-bold">{formatPKR(selectedRecordForPayslip.basicSalary || selectedRecordForPayslip.dailyWage)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="font-sans text-slate-700">Overtime ({selectedRecordForPayslip.overtimeHours} hrs):</span>
                      <span className="text-emerald-700">{formatPKR(selectedRecordForPayslip.overtimeAmount)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="font-sans text-slate-700">Piece Rate Production:</span>
                      <span className="text-emerald-700">{formatPKR(selectedRecordForPayslip.pieceRateAmount)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="font-sans text-slate-700">Allowances & Bonuses:</span>
                      <span>{formatPKR(selectedRecordForPayslip.allowances)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t-2 border-slate-300 font-sans font-bold bg-slate-50 px-2 rounded mt-1">
                      <span>Total Gross Salary:</span>
                      <span className="font-mono text-slate-900">{formatPKR(selectedRecordForPayslip.grossSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100/80 px-3 py-2 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-700">
                    Deductions & Recoveries
                  </div>
                  <div className="divide-y divide-slate-100 p-2 font-mono">
                    <div className="flex justify-between py-1.5">
                      <span className="font-sans text-slate-700">Advance Loan Recovery:</span>
                      <span className="font-bold text-purple-700">
                        {selectedRecordForPayslip.advanceDeduction > 0
                          ? `-${formatPKR(selectedRecordForPayslip.advanceDeduction)}`
                          : "PKR 0"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="font-sans text-slate-700">Absence Deduction:</span>
                      <span className="text-rose-700">
                        {selectedRecordForPayslip.absentDeduction > 0
                          ? `-${formatPKR(selectedRecordForPayslip.absentDeduction)}`
                          : "PKR 0"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="font-sans text-slate-700">Income Tax:</span>
                      <span>{formatPKR(selectedRecordForPayslip.taxDeduction)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="font-sans text-slate-700">Other Deductions:</span>
                      <span>{formatPKR(selectedRecordForPayslip.otherDeductions)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t-2 border-slate-300 font-sans font-bold bg-slate-50 px-2 rounded mt-1">
                      <span>Total Deductions:</span>
                      <span className="font-mono text-rose-700">-{formatPKR(selectedRecordForPayslip.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Payable Highlight Card */}
              <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs uppercase text-blue-900 tracking-wider">Net Salary Payable</span>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Disbursed via {selectedRecordForPayslip.paymentMethod}
                    {selectedRecordForPayslip.accountNumber ? ` (A/C: ${selectedRecordForPayslip.accountNumber})` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-extrabold text-blue-950">
                    {formatPKR(selectedRecordForPayslip.netPayable)}
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="border-t border-slate-300 pt-8 mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="border-b border-slate-400 w-24 mx-auto" />
                  <p className="font-bold text-[10px] text-slate-700">Prepared By (HR)</p>
                </div>
                <div className="space-y-2">
                  <div className="border-b border-slate-400 w-24 mx-auto" />
                  <p className="font-bold text-[10px] text-slate-700">Verified By (Accounts)</p>
                </div>
                <div className="space-y-2">
                  <div className="border-b border-slate-400 w-24 mx-auto" />
                  <p className="font-bold text-[10px] text-slate-700">Employee Signature</p>
                </div>
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsPayslipModalOpen(false)}>
              Close
            </Button>
            <Button variant="primary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
              Print Payslip Document
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ========================================== */}
      {/* MODAL: DISBURSE / MARK PAID                */}
      {/* ========================================== */}
      {recordToDisburse && (
        <Modal
          isOpen={!!recordToDisburse}
          onClose={() => setRecordToDisburse(null)}
          title={`Disburse Salary — ${recordToDisburse.employeeName}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-950">Net Payable Amount:</span>
                <p className="text-[11px] text-emerald-800">{recordToDisburse.employeeNumber} ({recordToDisburse.department})</p>
              </div>
              <span className="font-mono text-xl font-extrabold text-emerald-800">
                {formatPKR(recordToDisburse.netPayable)}
              </span>
            </div>

            <FormField label="Payment Method *">
              <Select
                value={disbursePaymentMethod}
                onChange={(e) => setDisbursePaymentMethod(e.target.value)}
                options={[
                  { label: "Bank Transfer (HBL / Meezan / UBL)", value: "Bank Transfer" },
                  { label: "Cash Payout (Factory Counter)", value: "Cash" },
                  { label: "Company Cheque", value: "Cheque" },
                ]}
              />
            </FormField>

            <FormField label="Bank / Transaction Reference Number">
              <Input
                placeholder="e.g. FT-987654 or Cheque # 123456"
                value={disburseBankRef}
                onChange={(e) => setDisburseBankRef(e.target.value)}
              />
            </FormField>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setRecordToDisburse(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Check className="h-4 w-4" />}
              onClick={handleConfirmDisbursement}
            >
              Confirm Payout
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

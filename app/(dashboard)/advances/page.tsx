"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog, Modal, ModalFooter } from "@/components/ui/Modal";
import { EmptyState, Pagination } from "@/components/ui/Misc";
import { FormField, FormSection } from "@/components/forms/FormField";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  HandCoins,
  Plus,
  Search,
  DollarSign,
  Clock,
  CheckCircle2,
  Info,
  RotateCcw,
  ArrowLeft,
  Eye,
  Check,
  X,
  CreditCard,
  Building2,
  Printer,
  Calendar,
  AlertCircle,
  FileText,
  User,
  Trash2,
  Archive,
  Download,
} from "lucide-react";
import {
  AdvanceRecord,
  AdvanceStatus,
  ADVANCE_STORAGE_KEY,
  createAdvanceRequest,
  approveAdvance,
  disburseAdvance,
  rejectAdvance,
  recordRepaymentInstallment,
  calculateMonthlyDeduction,
  computeAdvanceMetrics,
  validateAdvanceRequest,
  generateNextAdvanceNumber,
  deduplicateAndFixAdvances,
  getEmployeeActiveAdvance,
} from "@/lib/advances-engine";
import {
  EmployeeRecord,
  EMPLOYEE_STORAGE_KEY,
  formatPKR,
} from "@/lib/employees-engine";
import {
  getAdvancesFromDB,
  createAdvanceInDB,
  updateAdvanceInDB,
} from "@/lib/services/advances-service";
import { getEmployeesFromDB } from "@/lib/services/employees-service";

const STATUS_CONFIG: Record<
  AdvanceStatus,
  { label: string; variant: "warning" | "primary" | "info" | "success" | "danger" | "default" }
> = {
  Pending: { label: "Pending Approval", variant: "warning" },
  Approved: { label: "Approved (Awaiting Payout)", variant: "primary" },
  Disbursed: { label: "Disbursed", variant: "info" },
  Recovering: { label: "Active (In Recovery)", variant: "info" },
  Completed: { label: "Fully Recovered", variant: "success" },
  Rejected: { label: "Request Rejected", variant: "danger" },
  Archived: { label: "Archived", variant: "default" },
};

export default function AdvancesPage() {
  const { toast } = useToast();

  // Load Employees from Storage
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

  const getServerSnapshot = React.useCallback(() => "[]", []);

  const subscribe = React.useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }, []);

  const rawEmployeesJson = React.useSyncExternalStore(subscribe, getEmployeesSnapshot, getServerSnapshot);
  const rawAdvancesJson = React.useSyncExternalStore(subscribe, getAdvancesSnapshot, getServerSnapshot);

  const [localEmployeesOverride, setLocalEmployeesOverride] = React.useState<EmployeeRecord[] | null>(null);
  const [localAdvancesOverride, setLocalAdvancesOverride] = React.useState<AdvanceRecord[] | null>(null);

  // Sync latest employees and advances on mount
  React.useEffect(() => {
    getEmployeesFromDB()
      .then((emps) => {
        if (emps && emps.length > 0) {
          setLocalEmployeesOverride(emps);
        }
      })
      .catch((err) => console.error("Failed to load employees for advances:", err));

    getAdvancesFromDB()
      .then((advs) => {
        if (advs && advs.length > 0) {
          setLocalAdvancesOverride(advs);
        }
      })
      .catch((err) => console.error("Failed to load advances:", err));
  }, []);

  const employees: EmployeeRecord[] = React.useMemo(() => {
    if (localEmployeesOverride !== null) return localEmployeesOverride;
    try {
      const list = JSON.parse(rawEmployeesJson) as EmployeeRecord[];
      // Deduplicate employees by ID and Employee Number
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
      const parsed = JSON.parse(rawAdvancesJson) as AdvanceRecord[];
      return deduplicateAndFixAdvances(parsed);
    } catch {
      return [];
    }
  }, [rawAdvancesJson, localAdvancesOverride]);

  const saveAdvancesList = (newList: AdvanceRecord[]) => {
    const sanitized = deduplicateAndFixAdvances(newList);
    setLocalAdvancesOverride(sanitized);
    try {
      localStorage.setItem(ADVANCE_STORAGE_KEY, JSON.stringify(sanitized));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Failed to save advances to localStorage", e);
    }
  };

  // View state: list vs detail
  const [selectedAdvanceId, setSelectedAdvanceId] = React.useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 10;

  // Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = React.useState(false);
  const [selectedEmpId, setSelectedEmpId] = React.useState("");
  const [requestedAmount, setRequestedAmount] = React.useState<number | "">("");
  const [repaymentMonths, setRepaymentMonths] = React.useState(3);
  const [advanceReason, setAdvanceReason] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [formWarnings, setFormWarnings] = React.useState<string[]>([]);

  // Action Modals (Approve, Reject, Disburse, Record Repayment)
  const [isApproveModalOpen, setIsApproveModalOpen] = React.useState(false);
  const [approvedAmountInput, setApprovedAmountInput] = React.useState<number | "">("");
  const [approvalNotes, setApprovalNotes] = React.useState("");

  const [isRejectModalOpen, setIsRejectModalOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = React.useState(false);
  const [repaymentMonthTarget, setRepaymentMonthTarget] = React.useState("");
  const [repaymentAmountPaid, setRepaymentAmountPaid] = React.useState<number | "">("");

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);

  // Archive Confirm
  const [advanceToArchive, setAdvanceToArchive] = React.useState<AdvanceRecord | null>(null);

  // Computed Selected Employee for Request Form
  const formEmployee = React.useMemo(() => {
    return employees.find((e) => e.id === selectedEmpId) || null;
  }, [employees, selectedEmpId]);

  // Computed Selected Advance
  const selectedAdvance = React.useMemo(() => {
    return advances.find((a) => a.id === selectedAdvanceId) || null;
  }, [advances, selectedAdvanceId]);

  // Dynamic KPI Metrics
  const metrics = React.useMemo(() => {
    return computeAdvanceMetrics(advances);
  }, [advances]);

  // Open Request Modal
  const openRequestModal = (defaultEmployeeId?: string) => {
    const targetEmpId = defaultEmployeeId || (employees.length > 0 ? employees[0].id : "");
    setSelectedEmpId(targetEmpId);
    setRequestedAmount("");
    setRepaymentMonths(3);
    setAdvanceReason("");
    setFormErrors({});
    setFormWarnings([]);
    setIsRequestModalOpen(true);
  };

  // Real-time Monthly Deduction in form
  const computedMonthlyDeduction = React.useMemo(() => {
    const amt = typeof requestedAmount === "number" ? requestedAmount : 0;
    return calculateMonthlyDeduction(amt, repaymentMonths);
  }, [requestedAmount, repaymentMonths]);

  // Submit Advance Request
  const handleSubmitAdvanceRequest = () => {
    const amt = typeof requestedAmount === "number" ? requestedAmount : 0;
    const validation = validateAdvanceRequest(
      {
        employeeId: selectedEmpId,
        requestedAmount: amt,
        reason: advanceReason,
        repaymentMonths,
      },
      formEmployee,
      advances
    );

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      setFormWarnings(validation.warnings);
      toast({
        type: "error",
        message: "Validation Error",
        description: Object.values(validation.errors)[0],
      });
      return;
    }

    if (!formEmployee) {
      toast({ type: "error", message: "Please select an employee" });
      return;
    }

    const newAdvance = createAdvanceRequest(
      formEmployee,
      amt,
      advanceReason,
      repaymentMonths,
      advances
    );

    const updatedList = [newAdvance, ...advances];
    saveAdvancesList(updatedList);
    createAdvanceInDB(newAdvance).catch((e) => console.error(e));

    setIsRequestModalOpen(false);
    toast({
      type: "success",
      message: "Advance Requested",
      description: `${newAdvance.advanceNumber} created for ${newAdvance.employeeName} (${formatPKR(amt)}).`,
    });
  };

  // Admin: Approve Advance
  const handleApproveConfirm = () => {
    if (!selectedAdvance) return;
    const finalAmount = typeof approvedAmountInput === "number" ? approvedAmountInput : selectedAdvance.requestedAmount;
    const updated = approveAdvance(selectedAdvance, finalAmount, "HR Director", approvalNotes);

    const updatedList = advances.map((a) => (a.id === updated.id ? updated : a));
    saveAdvancesList(updatedList);
    updateAdvanceInDB(updated).catch((e) => console.error(e));

    setIsApproveModalOpen(false);
    toast({
      type: "success",
      message: "Advance Approved",
      description: `${updated.advanceNumber} approved for ${formatPKR(finalAmount)}. Ready for payout disbursement.`,
    });
  };

  // Admin: Disburse Advance
  const handleDisburseConfirm = () => {
    if (!selectedAdvance) return;
    const updated = disburseAdvance(selectedAdvance, "Finance & Accounts Desk");

    const updatedList = advances.map((a) => (a.id === updated.id ? updated : a));
    saveAdvancesList(updatedList);
    updateAdvanceInDB(updated).catch((e) => console.error(e));

    toast({
      type: "success",
      message: "Funds Disbursed",
      description: `${updated.advanceNumber} disbursed. Recovery schedule activated across ${updated.repaymentMonths} months.`,
    });
  };

  // Admin: Reject Advance
  const handleRejectConfirm = () => {
    if (!selectedAdvance) return;
    const updated = rejectAdvance(selectedAdvance, rejectReason || "Policy limits exceeded", "HR Committee");

    const updatedList = advances.map((a) => (a.id === updated.id ? updated : a));
    saveAdvancesList(updatedList);
    updateAdvanceInDB(updated).catch((e) => console.error(e));

    setIsRejectModalOpen(false);
    toast({
      type: "info",
      message: "Request Rejected",
      description: `${updated.advanceNumber} rejected.`,
    });
  };

  // Record Repayment Installment
  const handleRecordRepaymentSubmit = () => {
    if (!selectedAdvance || !repaymentMonthTarget) return;
    const amtPaid = typeof repaymentAmountPaid === "number" ? repaymentAmountPaid : selectedAdvance.monthlyDeduction;
    const updated = recordRepaymentInstallment(selectedAdvance, repaymentMonthTarget, amtPaid);

    const updatedList = advances.map((a) => (a.id === updated.id ? updated : a));
    saveAdvancesList(updatedList);
    updateAdvanceInDB(updated).catch((e) => console.error(e));

    setIsRepaymentModalOpen(false);
    toast({
      type: "success",
      message: "Installment Recovered",
      description: `Recorded ${formatPKR(amtPaid)} for ${repaymentMonthTarget}. Remaining balance: ${formatPKR(updated.remainingBalance)}.`,
    });
  };

  // Archive Advance Confirm
  const handleArchiveConfirm = () => {
    if (!advanceToArchive) return;
    const updated: AdvanceRecord = {
      ...advanceToArchive,
      isArchived: true,
      status: "Archived",
      updatedAt: new Date().toISOString(),
    };

    const updatedList = advances.map((a) => (a.id === updated.id ? updated : a));
    saveAdvancesList(updatedList);
    updateAdvanceInDB(updated).catch((e) => console.error(e));

    setAdvanceToArchive(null);
    if (selectedAdvanceId === advanceToArchive.id) setSelectedAdvanceId(null);
    toast({
      type: "info",
      message: "Record Archived",
      description: `${advanceToArchive.advanceNumber} has been safely archived.`,
    });
  };

  // Filtered Advances
  const filteredAdvances = React.useMemo(() => {
    return advances.filter((adv) => {
      if (adv.isArchived && statusFilter !== "Archived" && statusFilter !== "all") {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = adv.advanceNumber.toLowerCase().includes(q);
        const matchesName = adv.employeeName.toLowerCase().includes(q);
        const matchesEmpNum = adv.employeeNumber.toLowerCase().includes(q);
        const matchesDept = adv.department.toLowerCase().includes(q);
        if (!matchesNum && !matchesName && !matchesEmpNum && !matchesDept) return false;
      }

      if (statusFilter !== "all") {
        if (statusFilter === "Archived") {
          if (!adv.isArchived && adv.status !== "Archived") return false;
        } else {
          if (adv.status !== statusFilter) return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [advances, searchQuery, statusFilter]);

  const matchingSearchEmployee = React.useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    return employees.find(
      (e) =>
        e.employeeNumber.toLowerCase().includes(q) ||
        e.personalInfo.fullName.toLowerCase().includes(q)
    ) || null;
  }, [searchQuery, employees]);

  const paginatedAdvances = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAdvances.slice(start, start + PAGE_SIZE);
  }, [filteredAdvances, page]);

  // ==========================================
  // VIEW: ADVANCE DETAIL & RECOVERY LEDGER
  // ==========================================
  if (selectedAdvance) {
    const adv = selectedAdvance;
    const progressPercentage =
      adv.approvedAmount > 0
        ? Math.min(100, Math.round(((adv.approvedAmount - adv.remainingBalance) / adv.approvedAmount) * 100))
        : 0;

    return (
      <>
        <TopNav title={`Advance Record — ${adv.advanceNumber}`} />

        <div className="space-y-6 min-w-0 w-full p-4 lg:p-6 pb-20 animate-in fade-in-0 duration-200">
          {/* Header Card matching Image 1 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedAdvanceId(null)}
                className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="Back to Advances List"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                    {adv.advanceNumber}
                  </h1>
                  <span className="text-sm font-semibold text-slate-700 truncate">
                    • {adv.employeeName} ({adv.employeeNumber})
                  </span>
                  <Badge variant={STATUS_CONFIG[adv.status]?.variant || "default"} dot>
                    {STATUS_CONFIG[adv.status]?.label || adv.status}
                  </Badge>
                  {adv.isArchived && <Badge variant="danger">Archived</Badge>}
                </div>

                <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {adv.department} — {adv.designation}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono text-blue-700 font-bold">
                    Requested: {formatPKR(adv.requestedAmount)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {adv.requestDate}
                  </span>
                </p>
              </div>
            </div>

            {/* Admin Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
              {adv.status === "Pending" && (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Check className="h-4 w-4" />}
                    onClick={() => {
                      setApprovedAmountInput(adv.requestedAmount);
                      setApprovalNotes("");
                      setIsApproveModalOpen(true);
                    }}
                  >
                    Approve Loan
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    leftIcon={<X className="h-4 w-4" />}
                    onClick={() => {
                      setRejectReason("");
                      setIsRejectModalOpen(true);
                    }}
                  >
                    Reject
                  </Button>
                </>
              )}

              {adv.status === "Approved" && (
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<DollarSign className="h-4 w-4" />}
                  onClick={handleDisburseConfirm}
                >
                  Disburse Funds (Payout)
                </Button>
              )}

              {adv.status === "Recovering" && (
                <Button
                  variant="secondary"
                  size="md"
                  leftIcon={<CreditCard className="h-4 w-4" />}
                  onClick={() => {
                    const nextPending = adv.repayments?.find((r) => r.status === "Pending");
                    setRepaymentMonthTarget(nextPending ? nextPending.deductionMonth : "");
                    setRepaymentAmountPaid(nextPending ? nextPending.amount : adv.monthlyDeduction);
                    setIsRepaymentModalOpen(true);
                  }}
                >
                  Record Recovery Payment
                </Button>
              )}

              <Button
                variant="ghost"
                size="md"
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={() => setIsPrintModalOpen(true)}
              >
                Print Voucher
              </Button>

              {!adv.isArchived && (
                <Button
                  variant="ghost"
                  size="md"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setAdvanceToArchive(adv)}
                >
                  Archive
                </Button>
              )}
            </div>
          </div>

          {/* 5 Top Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Approved Principal</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                {formatPKR(adv.approvedAmount || adv.requestedAmount)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{adv.repaymentMonths} months duration</p>
            </Card>

            <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Remaining Balance</span>
              <p className={`text-lg font-bold mt-0.5 truncate ${adv.remainingBalance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                {formatPKR(adv.remainingBalance)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {adv.remainingBalance > 0 ? "Outstanding loan" : "Fully settled"}
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Monthly Deduction</span>
              <p className="text-lg font-bold text-blue-700 mt-0.5 truncate">{formatPKR(adv.monthlyDeduction)}/mo</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Salary deduction installment</p>
            </Card>

            <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recovery Progress</span>
              <p className="text-lg font-bold text-emerald-700 mt-0.5 truncate">{progressPercentage}%</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">
                {formatPKR(Math.max(0, (adv.approvedAmount || adv.requestedAmount) - adv.remainingBalance))} recovered
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Loan Status</span>
              <div className="mt-1">
                <Badge variant={STATUS_CONFIG[adv.status]?.variant || "default"} dot>
                  {STATUS_CONFIG[adv.status]?.label || adv.status}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                Disbursed: {adv.disbursedDate ? new Date(adv.disbursedDate).toLocaleDateString() : "Pending"}
              </p>
            </Card>
          </div>

          {/* 2-Column Section Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Loan Summary & Employee Details */}
            <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs bg-white lg:col-span-1">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building2 className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  ADVANCE LOAN SPECIFICATIONS
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] font-medium text-slate-500">Employee Name & ID</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{adv.employeeName}</p>
                  <p className="font-mono text-[11px] text-blue-700">{adv.employeeNumber}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Department</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">{adv.department}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Current Salary</span>
                    <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">{formatPKR(adv.currentSalary)}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500">Advance Reason / Application Note</span>
                  <p className="text-xs text-slate-800 mt-1 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    {adv.reason}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Approved By</span>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">{adv.approvedBy || "Awaiting Approval"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Disbursed By</span>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">{adv.disbursedBy || "Pending Payout"}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Right Column: Recovery Schedule & Repayments Ledger */}
            <Card className="p-0 overflow-hidden border-slate-200/80 shadow-xs bg-white lg:col-span-2">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    PAYROLL RECOVERY SCHEDULE & INSTALLMENT LEDGER
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-700">
                  Remaining: <span className="font-mono text-rose-700">{formatPKR(adv.remainingBalance)}</span>
                </span>
              </div>

              {adv.repayments && adv.repayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4">Deduction Month</th>
                        <th className="py-3 px-4">Installment Amount</th>
                        <th className="py-3 px-4">Balance After Installment</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Recovery Date</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adv.repayments.map((rep, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{rep.deductionMonth}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{formatPKR(rep.amount)}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{formatPKR(rep.balanceAfterDeduction)}</td>
                          <td className="py-3.5 px-4">
                            <Badge variant={rep.status === "Paid" ? "success" : "warning"}>
                              {rep.status === "Paid" ? "✓ Paid / Deducted" : "Pending Payroll"}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">{rep.paidDate || "—"}</td>
                          <td className="py-3.5 px-4 text-right">
                            {rep.status === "Pending" && adv.status === "Recovering" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRepaymentMonthTarget(rep.deductionMonth);
                                  setRepaymentAmountPaid(rep.amount);
                                  setIsRepaymentModalOpen(true);
                                }}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center bg-slate-50 p-6 space-y-2">
                  <CreditCard className="h-8 w-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">No Repayment Schedule Generated Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Once the advance is approved and funds are disbursed, the month-by-month deduction schedule will appear here.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Modal: Approve Advance */}
        <Modal
          isOpen={isApproveModalOpen}
          onClose={() => setIsApproveModalOpen(false)}
          title={`Approve Advance Request — ${adv.advanceNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-blue-700 uppercase">Requested by Employee:</span>
              <p className="text-base font-extrabold text-blue-950">
                {adv.employeeName} ({adv.employeeNumber}) — {formatPKR(adv.requestedAmount)}
              </p>
              <p className="text-xs text-blue-800">Monthly Salary: {formatPKR(adv.currentSalary)}</p>
            </div>

            <FormField label="Approved Principal Amount (PKR) *">
              <Input
                type="number"
                value={approvedAmountInput}
                onChange={(e) => setApprovedAmountInput(e.target.value ? Number(e.target.value) : "")}
              />
            </FormField>

            <FormField label="Approval Remarks & Authority Notes">
              <Textarea
                rows={2}
                placeholder="Approved per factory policy terms..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
              />
            </FormField>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApproveConfirm} leftIcon={<Check className="h-4 w-4" />}>
              Confirm Approval
            </Button>
          </ModalFooter>
        </Modal>

        {/* Modal: Reject Advance */}
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title={`Reject Advance — ${adv.advanceNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Please enter the official reason for declining this advance application.
            </p>
            <FormField label="Reason for Rejection *">
              <Textarea
                rows={3}
                placeholder="e.g. Existing open loan balance pending, or exceeds maximum allowable limit."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </FormField>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="bg-rose-600 hover:bg-rose-700" onClick={handleRejectConfirm}>
              Confirm Rejection
            </Button>
          </ModalFooter>
        </Modal>

        {/* Modal: Record Repayment */}
        <Modal
          isOpen={isRepaymentModalOpen}
          onClose={() => setIsRepaymentModalOpen(false)}
          title={`Record Loan Recovery — ${adv.advanceNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <FormField label="Deduction Month *">
              <Input value={repaymentMonthTarget} onChange={(e) => setRepaymentMonthTarget(e.target.value)} />
            </FormField>

            <FormField label="Amount Recovered (PKR) *">
              <Input
                type="number"
                value={repaymentAmountPaid}
                onChange={(e) => setRepaymentAmountPaid(e.target.value ? Number(e.target.value) : "")}
              />
            </FormField>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsRepaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRecordRepaymentSubmit} leftIcon={<CreditCard className="h-4 w-4" />}>
              Save Recovery Payment
            </Button>
          </ModalFooter>
        </Modal>

        {/* Modal: Print Agreement */}
        <Modal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title="Print Advance Loan Voucher"
          size="lg"
        >
          <div className="space-y-6 p-4 bg-white text-slate-900 rounded-xl border border-slate-200 text-xs">
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-extrabold uppercase">FactoryOS ERP — Garment Manufacturing</h2>
                <p className="text-xs font-semibold text-slate-600">Employee Advance & Loan Disbursement Voucher</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-blue-700">{adv.advanceNumber}</p>
                <p className="text-[11px] text-slate-500">Date: {new Date().toLocaleDateString("en-PK")}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <span className="font-bold uppercase text-[10px] text-slate-500">Borrower Information</span>
                <p><strong>Name:</strong> {adv.employeeName}</p>
                <p><strong>Employee ID:</strong> {adv.employeeNumber}</p>
                <p><strong>Department:</strong> {adv.department}</p>
                <p><strong>Monthly Wage:</strong> {formatPKR(adv.currentSalary)}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <span className="font-bold uppercase text-[10px] text-slate-500">Loan Settlement Terms</span>
                <p><strong>Approved Principal:</strong> {formatPKR(adv.approvedAmount || adv.requestedAmount)}</p>
                <p><strong>Recovery Period:</strong> {adv.repaymentMonths} Months</p>
                <p><strong>Monthly Installment:</strong> {formatPKR(adv.monthlyDeduction)} / Month</p>
                <p><strong>Status:</strong> {adv.status}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <p><strong>Purpose of Advance:</strong> {adv.reason}</p>
            </div>

            <div className="border-t border-slate-300 pt-6 mt-6 grid grid-cols-3 gap-6 text-center">
              <div className="space-y-4">
                <div className="border-b border-slate-400 w-24 mx-auto" />
                <p className="font-bold">Employee Signature</p>
              </div>
              <div className="space-y-4">
                <div className="border-b border-slate-400 w-24 mx-auto" />
                <p className="font-bold">HR Manager</p>
              </div>
              <div className="space-y-4">
                <div className="border-b border-slate-400 w-24 mx-auto" />
                <p className="font-bold">Finance Director</p>
              </div>
            </div>
          </div>

          <ModalFooter className="no-print">
            <Button variant="ghost" onClick={() => setIsPrintModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => {
                document.body.classList.add("print-document-active");
                window.print();
                document.body.classList.remove("print-document-active");
              }}
            >
              Print Document
            </Button>
          </ModalFooter>
        </Modal>

        {/* Archive Dialog */}
        <ConfirmDialog
          isOpen={!!advanceToArchive}
          onClose={() => setAdvanceToArchive(null)}
          onConfirm={handleArchiveConfirm}
          title="Archive Advance Record"
          description={`Archive ${advanceToArchive?.advanceNumber}? All repayment histories will be safely preserved.`}
          confirmLabel="Archive Record"
          destructive
        />
      </>
    );
  }

  // ==========================================
  // VIEW: MAIN DIRECTORY LIST
  // ==========================================
  return (
    <>
      <TopNav title="Employee Advance Loans & Borrowing Ledger" />

      <div className="space-y-6 min-w-0 w-full p-4 lg:p-6 pb-20 animate-in fade-in-0 duration-200">
        <PageHeader
          title="Employee Advances & Loan Ledger"
          description="Manage factory floor employee advance requests, approval hierarchies, maximum borrowing limits, and automated payroll deduction schedules."
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => openRequestModal()}
            >
              Request Employee Advance
            </Button>
          }
        />

        {/* Advance Policy Limit Rules Banner */}
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-blue-950">Factory Advance & Borrowing Policy</h3>
              <p className="text-xs text-blue-800 mt-0.5">
                Maximum allowable advance: <strong>50% to 100% of Basic Monthly Wage</strong>. Repayable across a maximum of <strong>12 monthly payroll installments</strong>.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shrink-0 self-start md:self-center">
            Zero Interest / Shariah Compliant
          </span>
        </div>

        {/* 5 Clean White KPI Cards matching Image 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Advance Loans</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.activeLoansCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">In recovery payroll</p>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pending Approval</span>
            <p className={`text-xl font-bold mt-0.5 ${metrics.pendingApprovalCount > 0 ? "text-amber-700" : "text-slate-900"}`}>
              {metrics.pendingApprovalCount}
            </p>
            <p className="text-[11px] text-amber-600 mt-0.5">Awaiting HR review</p>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding Exposure</span>
            <p className="text-lg font-bold text-rose-700 mt-0.5 truncate">{formatPKR(metrics.totalPrincipalExposure)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Company loan balance</p>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recovered This Month</span>
            <p className="text-lg font-bold text-emerald-700 mt-0.5 truncate">{formatPKR(metrics.recoveredThisMonth)}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Payroll deductions</p>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Settled / Closed</span>
            <p className="text-xl font-bold text-blue-700 mt-0.5">{metrics.completedLoansCount}</p>
            <p className="text-[11px] text-blue-600 mt-0.5">100% recovered</p>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <Card className="p-4 border-slate-200/80 shadow-xs bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="Search Advance ID, Employee Name, Employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                prefix={<Search className="h-4 w-4 text-slate-400" />}
              />
            </div>
            <div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { label: "All Statuses", value: "all" },
                  { label: "Pending Approval", value: "Pending" },
                  { label: "Approved (Ready)", value: "Approved" },
                  { label: "Active (In Recovery)", value: "Recovering" },
                  { label: "Fully Recovered", value: "Completed" },
                  { label: "Rejected", value: "Rejected" },
                  { label: "Archived", value: "Archived" },
                ]}
              />
            </div>
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="md"
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={() => window.print()}
              >
                Export / Print
              </Button>
            </div>
          </div>
        </Card>

        {/* Advances Table */}
        <Card className="p-0 overflow-hidden border-slate-200/80 shadow-xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Advance Ref</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Requested</th>
                  <th className="py-3 px-4">Monthly Deduction</th>
                  <th className="py-3 px-4">Remaining Balance</th>
                  <th className="py-3 px-4">Request Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedAdvances.length > 0 ? (
                  paginatedAdvances.map((adv) => (
                    <tr
                      key={adv.id}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                      onClick={() => {
                        setAdvanceToArchive(null);
                        setSelectedAdvanceId(adv.id);
                      }}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{adv.advanceNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{adv.employeeName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{adv.employeeNumber}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{adv.department}</div>
                        <div className="text-[11px] text-slate-500">{adv.designation}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {formatPKR(adv.requestedAmount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-blue-700 font-bold">
                        {formatPKR(adv.monthlyDeduction)}/mo
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-700">
                        {formatPKR(adv.remainingBalance)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{adv.requestDate}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={STATUS_CONFIG[adv.status]?.variant || "default"} dot>
                          {STATUS_CONFIG[adv.status]?.label || adv.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Ledger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdvanceToArchive(null);
                              setSelectedAdvanceId(adv.id);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-600" />
                          </Button>
                          {!adv.isArchived && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Archive Record"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdvanceToArchive(adv);
                              }}
                            >
                              <Archive className="h-3.5 w-3.5 text-amber-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      {matchingSearchEmployee ? (
                        <div className="max-w-md mx-auto p-6 bg-blue-50/50 rounded-2xl border border-blue-200 text-center space-y-3">
                          <div className="h-12 w-12 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <User className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900">
                              No Advances for {matchingSearchEmployee.personalInfo.fullName} ({matchingSearchEmployee.employeeNumber})
                            </h3>
                            <p className="text-xs text-slate-600 mt-1">
                              Employee is registered in <strong>{matchingSearchEmployee.employmentInfo.department}</strong> department ({matchingSearchEmployee.employmentInfo.designation}) but has no active loans.
                            </p>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Plus className="h-4 w-4" />}
                            onClick={() => openRequestModal(matchingSearchEmployee.id)}
                            className="mx-auto"
                          >
                            Request Advance for {matchingSearchEmployee.personalInfo.fullName}
                          </Button>
                        </div>
                      ) : (
                        <EmptyState
                          icon={<HandCoins className="h-6 w-6 text-blue-600" />}
                          title="No Advances Found"
                          description={
                            searchQuery || statusFilter !== "all"
                              ? "Try clearing your search query or filters."
                              : "Click '+ Request Employee Advance' to create an advance request."
                          }
                          actionLabel="Request Advance"
                          onAction={() => openRequestModal()}
                          actionIcon={<Plus className="h-4 w-4" />}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredAdvances.length > PAGE_SIZE && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={filteredAdvances.length} onPageChange={setPage} />
          )}
        </Card>
      </div>

      {/* ========================================== */}
      {/* MODAL: REQUEST EMPLOYEE ADVANCE            */}
      {/* ========================================== */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Employee Advance Loan"
        size="xl"
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          <FormSection
            title="1. Select Employee & Contract Verification"
            gridClassName="block space-y-4 w-full"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FormField label="Select Employee *" error={formErrors.employeeId}>
                <Select
                  value={selectedEmpId}
                  onChange={(e) => {
                    setSelectedEmpId(e.target.value);
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.employeeId;
                      return next;
                    });
                  }}
                  options={[
                    { label: "-- Select Employee --", value: "" },
                    ...employees.map((emp) => {
                      const activeLoan = getEmployeeActiveAdvance(emp.id, advances);
                      const loanBadge = activeLoan
                        ? ` ⚠️ [Active Loan: ${activeLoan.advanceNumber} - ${formatPKR(activeLoan.remainingBalance)}]`
                        : "";
                      return {
                        label: `${emp.employeeNumber} — ${emp.personalInfo.fullName} (${emp.employmentInfo.department})${loanBadge}`,
                        value: emp.id,
                      };
                    }),
                  ]}
                />
              </FormField>

              <FormField label="Department (Auto-filled)">
                <Input value={formEmployee?.employmentInfo.department || "—"} disabled />
              </FormField>

              <FormField label="Designation (Auto-filled)">
                <Input value={formEmployee?.employmentInfo.designation || "—"} disabled />
              </FormField>

              <FormField label="Current Monthly Salary (Auto-filled)">
                <Input
                  value={
                    formEmployee
                      ? formatPKR(
                          formEmployee.salaryInfo.monthlySalary ||
                            (formEmployee.salaryInfo.dailyRate ? formEmployee.salaryInfo.dailyRate * 26 : 0)
                        )
                      : "—"
                  }
                  disabled
                />
              </FormField>
            </div>

            {getEmployeeActiveAdvance(selectedEmpId, advances) && (
              <div className="p-3.5 mt-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 w-full">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Existing Advance Pending Recovery:</strong>{" "}
                  {getEmployeeActiveAdvance(selectedEmpId, advances)?.advanceNumber} (
                  {formatPKR(getEmployeeActiveAdvance(selectedEmpId, advances)?.remainingBalance || 0)} remaining balance).
                  Company policy permits only one active advance loan at a time.
                </div>
              </div>
            )}
          </FormSection>

          <FormSection
            title="2. Advance Loan & Repayment Configuration"
            gridClassName="block space-y-4 w-full"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FormField label="Requested Advance Amount (PKR) *" error={formErrors.requestedAmount}>
                <Input
                  type="number"
                  placeholder="e.g. 20000"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value ? Number(e.target.value) : "")}
                />
              </FormField>

              <FormField label="Repayment Duration (Months) *" error={formErrors.repaymentMonths}>
                <Select
                  value={String(repaymentMonths)}
                  onChange={(e) => setRepaymentMonths(Number(e.target.value))}
                  options={[
                    { label: "1 Month (Full deduction in next payroll)", value: "1" },
                    { label: "2 Months Installments", value: "2" },
                    { label: "3 Months Installments (Standard)", value: "3" },
                    { label: "4 Months Installments", value: "4" },
                    { label: "6 Months Installments", value: "6" },
                    { label: "12 Months Installments (Max)", value: "12" },
                  ]}
                />
              </FormField>

              <div className="sm:col-span-2 w-full">
                <FormField label="Reason for Advance *" error={formErrors.reason}>
                  <Textarea
                    rows={3}
                    placeholder="Provide specific reason (e.g. Emergency family medical treatment, House repair, Educational fee)"
                    value={advanceReason}
                    onChange={(e) => setAdvanceReason(e.target.value)}
                  />
                </FormField>
              </div>
            </div>

            {/* Real-time Calculation Summary Card */}
            {typeof requestedAmount === "number" && requestedAmount > 0 && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs w-full shadow-xs">
                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Total Advance:</span>
                  <p className="text-lg font-extrabold text-blue-950 mt-0.5">{formatPKR(requestedAmount)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Monthly Payroll Deduction:</span>
                  <p className="text-lg font-extrabold text-blue-700 mt-0.5">
                    {formatPKR(computedMonthlyDeduction)} / mo
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Recovery Duration:</span>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">{repaymentMonths} Payroll Cycles</p>
                </div>
              </div>
            )}

            {formWarnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2 w-full">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{formWarnings[0]}</span>
              </div>
            )}
          </FormSection>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsRequestModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmitAdvanceRequest} leftIcon={<Plus className="h-4 w-4" />}>
            Submit Advance Request
          </Button>
        </ModalFooter>
      </Modal>

      {/* Archive Dialog in Main Directory View */}
      <ConfirmDialog
        isOpen={!!advanceToArchive}
        onClose={() => setAdvanceToArchive(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Advance Record"
        description={`Archive ${advanceToArchive?.advanceNumber}? All repayment histories will be safely preserved.`}
        confirmLabel="Archive Record"
        destructive
      />
    </>
  );
}

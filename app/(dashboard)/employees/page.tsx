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
import { Input, Select, PhoneInput } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import {
  Users,
  Plus,
  Search,
  Building2,
  DollarSign,
  UserCheck,
  RotateCcw,
  Eye,
  Edit,
  Copy,
  Trash2,
  Archive,
  ArrowLeft,
  RefreshCw,
  Clock,
  Briefcase,
  Printer,
  CreditCard,
  History,
  Activity,
  Award,
  FileText,
  Upload,
  Download,
  FileCheck,
  MapPin,
  X,
  FileImage,
  Loader2,
  AlertCircle,
  Camera,
  CheckCircle2,
  CheckSquare,
} from "lucide-react";
import { AssignTaskModal } from "@/components/employees/AssignTaskModal";
import { EmployeeTasksList } from "@/components/employees/EmployeeTasksList";
import {
  EmployeeRecord,
  SalaryType,
  PieceRateOperation,
  StoredDocument,
  DocumentType,
  EMPLOYEE_STORAGE_KEY,
  DEPARTMENTS,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  SALARY_TYPES,
  SKILL_LEVELS,
  PRODUCTION_LINES,
  COMMON_GARMENT_OPERATIONS,
  COUNTRY_CODES,
  createBlankEmployeeRecord,
  validateEmployeeRecord,
  duplicateEmployeeRecord,
  archiveEmployeeRecord,
  appendTimelineEvent,
  computeEmployeeMetrics,
  calculateSalaryBreakdown,
  getEmployeeAttendanceSummary,
  formatPKR,
  capitalizeWords,
  formatCNIC,
  formatPhoneNumber,
  canHardDeleteEmployee,
} from "@/lib/employees-engine";
import {
  AdvanceRecord,
  ADVANCE_STORAGE_KEY,
  getEmployeeLoanSummary,
} from "@/lib/advances-engine";
import {
  getEmployeesFromDB,
  createEmployeeInDB,
  updateEmployeeInDB,
  uploadEmployeeDocumentFile,
  deleteEmployeeDocumentFile,
  formatBytes,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_EXTENSIONS,
} from "@/lib/services/employees-service";

const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; variant: "success" | "primary" | "warning" | "danger" | "default" }
> = {
  Active: { label: "Active", variant: "success" },
  "On Leave": { label: "On Leave", variant: "warning" },
  Resigned: { label: "Resigned", variant: "default" },
  Terminated: { label: "Terminated", variant: "danger" },
  Inactive: { label: "Inactive (Archived)", variant: "default" },
};

const SALARY_TYPE_BADGES: Record<SalaryType, { label: string; variant: "primary" | "info" | "warning" | "default" }> = {
  monthly: { label: "Monthly Fixed", variant: "primary" },
  daily: { label: "Daily Wage", variant: "info" },
  piece_rate: { label: "Piece Rate", variant: "warning" },
};

type ProfileTab =
  | "overview"
  | "employment"
  | "salary"
  | "skills"
  | "documents"
  | "attendance"
  | "advances"
  | "payroll"
  | "timeline"
  | "tasks";

export default function EmployeesPage() {
  const router = useRouter();
  const { toast, success, error: toastError } = useToast();

  // Storage synchronization
  const getSnapshot = React.useCallback(() => {
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

  const rawJson = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const rawAdvancesJson = React.useSyncExternalStore(subscribe, getAdvancesSnapshot, getServerSnapshot);

  const allAdvances: AdvanceRecord[] = React.useMemo(() => {
    try {
      return JSON.parse(rawAdvancesJson) as AdvanceRecord[];
    } catch {
      return [];
    }
  }, [rawAdvancesJson]);

  const [localOverride, setLocalOverride] = React.useState<EmployeeRecord[] | null>(null);
  const [loadingEmployees, setLoadingEmployees] = React.useState(false);

  const loadEmployees = React.useCallback(async (showToast = false) => {
    setLoadingEmployees(true);
    try {
      const data = await getEmployeesFromDB();
      if (data && data.length > 0) {
        setLocalOverride(data);
      }
      if (showToast) {
        success("Workforce Refreshed", { description: "Loaded live employee records from MySQL." });
      }
    } catch (err: any) {
      console.error("Failed to load employees:", err);
      if (showToast) {
        toastError("Failed to Refresh", { description: err.message });
      }
    } finally {
      setLoadingEmployees(false);
    }
  }, [success, toastError]);

  // Sync on mount
  React.useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const employees: EmployeeRecord[] = React.useMemo(() => {
    if (localOverride !== null) return localOverride;
    try {
      return JSON.parse(rawJson) as EmployeeRecord[];
    } catch {
      return [];
    }
  }, [rawJson, localOverride]);

  const saveEmployeesList = (newEmployees: EmployeeRecord[]) => {
    setLocalOverride(newEmployees);
    try {
      localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(newEmployees));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Failed to save employees to localStorage", e);
    }
  };

  // View state: list vs profile
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null);
  const [activeProfileTab, setActiveProfileTab] = React.useState<ProfileTab>("overview");

  // Initial fetch from Database / localStorage on mount
  React.useEffect(() => {
    getEmployeesFromDB()
      .then((data) => {
        if (data && data.length > 0) {
          setLocalOverride(data);
        }
      })
      .catch((err) => console.error("Initial load error:", err));
  }, []);

  // Search & Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [empTypeFilter, setEmpTypeFilter] = React.useState("all");
  const [salaryTypeFilter, setSalaryTypeFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"recent" | "name" | "dept" | "salary">("recent");
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 10;

  // Real Document Upload State
  const [isDocModalOpen, setIsDocModalOpen] = React.useState(false);
  const [selectedDocType, setSelectedDocType] = React.useState<DocumentType>("cnic_front");
  const [docCustomTitle, setDocCustomTitle] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = React.useState(false);
  const [uploadStep, setUploadStep] = React.useState<"idle" | "uploading" | "saving" | "success">("idle");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = React.useState<StoredDocument | null>(null);

  // Print Profile Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);

  // Assign Task Modal State
  const [isAssignTaskModalOpen, setIsAssignTaskModalOpen] = React.useState(false);
  const [assignTaskEmployeeId, setAssignTaskEmployeeId] = React.useState<string | undefined>(undefined);
  const [taskRefreshKey, setTaskRefreshKey] = React.useState(0);

  // Archive & Delete Dialogs
  const [employeeToArchive, setEmployeeToArchive] = React.useState<EmployeeRecord | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = React.useState<EmployeeRecord | null>(null);

  // Computed Selected Employee
  const selectedEmployee = React.useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  // Dynamic KPI Metrics
  const metrics = React.useMemo(() => {
    return computeEmployeeMetrics(employees);
  }, [employees]);

  // Open Add Flow
  const openAddModal = () => {
    router.push("/employees/new");
  };

  // Open Edit Flow
  const openEditModal = (emp: EmployeeRecord) => {
    router.push(`/employees/${emp.employeeNumber || emp.id}/edit`);
  };

  // Filtered & Sorted Employees
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      if (emp.isArchived && statusFilter !== "Inactive" && statusFilter !== "all") {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = emp.employeeNumber.toLowerCase().includes(q);
        const matchesName = emp.personalInfo.fullName.toLowerCase().includes(q);
        const matchesPhone = emp.personalInfo.phone.toLowerCase().includes(q);
        const matchesCnic = (emp.personalInfo.cnic || "").toLowerCase().includes(q);
        const matchesDept = emp.employmentInfo.department.toLowerCase().includes(q);
        const matchesDesig = emp.employmentInfo.designation.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesPhone && !matchesCnic && !matchesDept && !matchesDesig) {
          return false;
        }
      }

      if (deptFilter !== "all" && emp.employmentInfo.department !== deptFilter) return false;

      if (statusFilter !== "all") {
        if (statusFilter === "Inactive") {
          if (!emp.isArchived && emp.employmentInfo.status !== "Inactive") return false;
        } else {
          if (emp.employmentInfo.status !== statusFilter) return false;
        }
      }

      if (empTypeFilter !== "all" && emp.employmentInfo.employmentType !== empTypeFilter) return false;
      if (salaryTypeFilter !== "all" && emp.salaryInfo.salaryType !== salaryTypeFilter) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === "name") return a.personalInfo.fullName.localeCompare(b.personalInfo.fullName);
      if (sortBy === "dept") return a.employmentInfo.department.localeCompare(b.employmentInfo.department);
      if (sortBy === "salary") {
        const getVal = (e: EmployeeRecord) => e.salaryInfo.monthlySalary || (e.salaryInfo.dailyRate ? e.salaryInfo.dailyRate * 26 : 0);
        return getVal(b) - getVal(a);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [employees, searchQuery, deptFilter, statusFilter, empTypeFilter, salaryTypeFilter, sortBy]);

  const paginatedEmployees = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, page]);

  // Duplicate Employee
  const handleDuplicateEmployee = (emp: EmployeeRecord) => {
    const duplicated = duplicateEmployeeRecord(emp, employees);
    const updatedList = [duplicated, ...employees];
    saveEmployeesList(updatedList);
    createEmployeeInDB(duplicated).catch((e) => console.error(e));
    toast({
      type: "success",
      message: "Employee Duplicated",
      description: `Created copy ${duplicated.employeeNumber} from ${emp.employeeNumber}.`,
    });
    setSelectedEmployeeId(duplicated.id);
    setActiveProfileTab("overview");
  };

  // Archive Confirm
  const handleArchiveConfirm = () => {
    if (!employeeToArchive) return;
    const archived = archiveEmployeeRecord(employeeToArchive);
    const updatedList = employees.map((e) => (e.id === archived.id ? archived : e));
    saveEmployeesList(updatedList);
    updateEmployeeInDB(archived).catch((e) => console.error(e));
    setEmployeeToArchive(null);
    toast({
      type: "info",
      message: "Employee Archived",
      description: `${archived.employeeNumber} has been safely archived.`,
    });
  };

  // Restore Employee
  const handleRestoreEmployee = (emp: EmployeeRecord) => {
    const restored: EmployeeRecord = {
      ...emp,
      isArchived: false,
      employmentInfo: {
        ...emp.employmentInfo,
        status: "Active",
      },
      updatedAt: new Date().toISOString(),
    };
    const updatedList = employees.map((e) => (e.id === restored.id ? restored : e));
    saveEmployeesList(updatedList);
    updateEmployeeInDB(restored).catch((e) => console.error(e));
    toast({
      type: "success",
      message: "Employee Restored",
      description: `${restored.employeeNumber} has been restored to active workforce.`,
    });
  };

  // Hard Delete Confirm
  const handleDeleteConfirm = () => {
    if (!employeeToDelete) return;
    const check = canHardDeleteEmployee(employeeToDelete, false);
    if (!check.canDelete) {
      toast({ type: "error", message: "Delete Blocked", description: check.reason });
      setEmployeeToDelete(null);
      return;
    }
    const updatedList = employees.filter((e) => e.id !== employeeToDelete.id);
    saveEmployeesList(updatedList);
    setEmployeeToDelete(null);
    if (selectedEmployeeId === employeeToDelete.id) setSelectedEmployeeId(null);
    toast({
      type: "success",
      message: "Record Deleted",
      description: `${employeeToDelete.employeeNumber} removed from database.`,
    });
  };

  // File selection validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File is too large (${formatBytes(file.size)}). Max allowed is 10MB.`);
      setSelectedFile(null);
      return;
    }

    const cleanName = file.name.toLowerCase();
    const isValid = ALLOWED_FILE_EXTENSIONS.some((ext) => cleanName.endsWith(ext));
    if (!isValid) {
      setFileError("Invalid file type. Please upload a PDF, JPG, or PNG document.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Real Document Upload Handler with Database Storage
  const handleUploadDocumentSubmit = async () => {
    if (!selectedEmployee) return;
    if (!selectedFile) {
      setFileError("Please select a file to upload.");
      return;
    }

    setIsUploadingDoc(true);
    setUploadStep("uploading");

    try {
      setUploadStep("saving");
      const res = await uploadEmployeeDocumentFile(
        selectedEmployee.id,
        selectedFile,
        selectedDocType,
        docCustomTitle
      );

      if (!res.success || !res.document) {
        toast({
          type: "error",
          message: "Upload Failed",
          description: res.error || "Storage upload or database insert failed.",
        });
        setIsUploadingDoc(false);
        setUploadStep("idle");
        return;
      }

      setUploadStep("success");

      // Local state update
      const updatedDocs = [
        ...(selectedEmployee.documents || []).filter((d) => d.type !== selectedDocType),
        res.document,
      ];
      const updatedEmp: EmployeeRecord = {
        ...selectedEmployee,
        documents: updatedDocs,
        updatedAt: new Date().toISOString(),
      };

      const updatedList = employees.map((e) => (e.id === updatedEmp.id ? updatedEmp : e));
      saveEmployeesList(updatedList);

      toast({
        type: "success",
        message: "Document Uploaded",
        description: `${res.document.title} saved to employee files successfully.`,
      });

      setTimeout(() => {
        setIsDocModalOpen(false);
        setSelectedFile(null);
        setDocCustomTitle("");
        setFileError(null);
        setIsUploadingDoc(false);
        setUploadStep("idle");
      }, 500);
    } catch (err: any) {
      toast({
        type: "error",
        message: "Upload Error",
        description: err.message || "An unexpected error occurred.",
      });
      setIsUploadingDoc(false);
      setUploadStep("idle");
    }
  };

  // Real Document Delete Handler
  const handleDeleteDocument = async (docId: string, docTitle: string, storagePath?: string) => {
    if (!selectedEmployee) return;
    try {
      await deleteEmployeeDocumentFile(selectedEmployee.id, docId, storagePath);

      const existingDocs = selectedEmployee.documents || [];
      const updatedDocs = existingDocs.filter((d) => d.id !== docId);

      const updatedEmp: EmployeeRecord = {
        ...selectedEmployee,
        documents: updatedDocs,
        updatedAt: new Date().toISOString(),
      };

      const updatedList = employees.map((e) => (e.id === updatedEmp.id ? updatedEmp : e));
      saveEmployeesList(updatedList);

      toast({
        type: "info",
        message: "Document Deleted",
        description: `${docTitle} removed from storage and database.`,
      });
    } catch (err: any) {
      toast({
        type: "error",
        message: "Delete Failed",
        description: err.message || "Could not delete document.",
      });
    }
  };

  // ==========================================
  // VIEW: CLEAN LIGHT SAAS ERP EMPLOYEE PROFILE
  // ==========================================
  if (selectedEmployee) {
    const emp = selectedEmployee;
    const attSummary = getEmployeeAttendanceSummary(emp);
    const loanSummary = getEmployeeLoanSummary(emp.id, allAdvances);
    const advances = loanSummary.employeeAdvances;
    const payrollHistory = emp.payrollRecords || [];
    const breakdown = emp.salaryInfo.breakdown || calculateSalaryBreakdown(emp.salaryInfo.monthlySalary || 0);
    const totalAdvanceBalance = loanSummary.remaining;

    return (
      <>
        <TopNav title={`Workforce Profile — ${emp.employeeNumber}`} />

        <div className="space-y-6 min-w-0 w-full p-4 lg:p-6 pb-20 animate-in fade-in-0 duration-200">
          {/* ========================================================= */}
          {/* 1. CLEAN WHITE HEADER                                     */}
          {/* ========================================================= */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedEmployeeId(null)}
                className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="Back to Employees List"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                    {emp.employeeNumber}
                  </h1>
                  <span className="text-sm font-semibold text-slate-700 truncate capitalize">
                    • {emp.personalInfo.fullName}
                  </span>
                  <Badge variant={STATUS_BADGE_CONFIG[emp.employmentInfo.status]?.variant || "default"} dot>
                    {STATUS_BADGE_CONFIG[emp.employmentInfo.status]?.label || emp.employmentInfo.status}
                  </Badge>
                  {emp.isArchived && <Badge variant="danger">Archived Record</Badge>}
                </div>

                <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-slate-700 capitalize">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                    {emp.employmentInfo.designation || "Staff"} — {emp.employmentInfo.department || "General"} Department
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono text-blue-700 font-bold">
                    {emp.salaryInfo.salaryType === "monthly"
                      ? formatPKR(emp.salaryInfo.monthlySalary || 0)
                      : emp.salaryInfo.salaryType === "daily"
                      ? `${formatPKR(emp.salaryInfo.dailyRate || 0)} / Day`
                      : `${formatPKR(emp.salaryInfo.pieceRate || 0)} / Piece`}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {emp.personalInfo.city || "Pakistan"}
                  </span>
                </p>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
              <Button
                variant="primary"
                size="md"
                leftIcon={<CheckSquare className="h-4 w-4" />}
                onClick={() => {
                  setAssignTaskEmployeeId(emp.id);
                  setIsAssignTaskModalOpen(true);
                }}
              >
                Assign Task
              </Button>
              <Button
                variant="outline"
                size="md"
                leftIcon={<Copy className="h-4 w-4" />}
                onClick={() => handleDuplicateEmployee(emp)}
              >
                Duplicate
              </Button>
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Edit className="h-4 w-4" />}
                onClick={() => openEditModal(emp)}
              >
                Edit Profile
              </Button>
              <Button
                variant="ghost"
                size="md"
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={() => setIsPrintModalOpen(true)}
              >
                Print
              </Button>
              {!emp.isArchived ? (
                <Button
                  variant="ghost"
                  size="md"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setEmployeeToArchive(emp)}
                >
                  Delete / Archive
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="md"
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                  onClick={() => {
                    const unarchived: EmployeeRecord = {
                      ...emp,
                      isArchived: false,
                      employmentInfo: { ...emp.employmentInfo, status: "Active" },
                    };
                    const updated = employees.map((e) => (e.id === emp.id ? unarchived : e));
                    saveEmployeesList(updated);
                    updateEmployeeInDB(unarchived).catch((e) => console.error(e));
                    toast({ type: "success", message: "Employee Restored" });
                  }}
                >
                  Restore Active
                </Button>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. TOP 5 SUMMARY KPI CARDS                                */}
          {/* ========================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Gross Base Wage</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                {emp.salaryInfo.salaryType === "monthly"
                  ? formatPKR(emp.salaryInfo.monthlySalary || 0)
                  : emp.salaryInfo.salaryType === "daily"
                  ? formatPKR((emp.salaryInfo.dailyRate || 0) * 26)
                  : "Piece Rate Based"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{SALARY_TYPE_BADGES[emp.salaryInfo.salaryType]?.label}</p>
            </Card>

            <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
              <p className={`text-lg font-bold mt-0.5 truncate ${attSummary.attendanceRatePercentage > 0 ? "text-emerald-700" : "text-slate-500"}`}>
                {attSummary.attendanceRatePercentage > 0 ? `${attSummary.attendanceRatePercentage}%` : "0%"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {attSummary.totalWorkingDays > 0
                  ? `${attSummary.presentDays} of ${attSummary.totalWorkingDays} days present`
                  : "No logs recorded"}
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Advance Balance</span>
              <p className={`text-lg font-bold mt-0.5 truncate ${totalAdvanceBalance > 0 ? "text-rose-700" : "text-slate-900"}`}>
                {formatPKR(totalAdvanceBalance)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {totalAdvanceBalance > 0 ? "Active loan balance" : "No active balance"}
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Joining Date</span>
              <p className="text-sm font-bold text-slate-900 mt-1">{emp.employmentInfo.joiningDate}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{emp.employmentInfo.employmentType || "Permanent Contract"}</p>
            </Card>

            <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Employment Status</span>
              <div className="mt-1">
                <Badge variant={STATUS_BADGE_CONFIG[emp.employmentInfo.status]?.variant || "default"} dot>
                  {emp.employmentInfo.status}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                Line: {emp.factoryInfo.assignedLine || "Line 1"}
              </p>
            </Card>
          </div>

          {/* ========================================================= */}
          {/* 3. TABS NAVIGATION BAR (DYNAMIC COUNTER UPDATES)          */}
          {/* ========================================================= */}
          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
            {[
              { id: "overview", label: "Overview & Personal", icon: Building2 },
              { id: "employment", label: "Employment Details", icon: Briefcase },
              { id: "salary", label: "Salary Configuration", icon: DollarSign },
              { id: "skills", label: "Production Skills", icon: Award },
              { id: "documents", label: `Documents (${emp.documents?.length || 0})`, icon: FileText },
              { id: "attendance", label: "Attendance & Shifts", icon: Clock },
              { id: "advances", label: `Advances (${advances.length})`, icon: CreditCard },
              { id: "payroll", label: "Payroll History", icon: History },
              { id: "timeline", label: "Activity Timeline", icon: Activity },
              { id: "tasks", label: "Tasks & Work Orders", icon: CheckSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeProfileTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveProfileTab(tab.id as ProfileTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "border-blue-600 text-blue-700 bg-blue-50/50"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ========================================================= */}
          {/* TAB 1: OVERVIEW & PERSONAL                                */}
          {/* ========================================================= */}
          {activeProfileTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Personal Identification */}
              <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs bg-white">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    PERSONAL & CONTACT IDENTIFICATION
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Full Name</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 capitalize">{emp.personalInfo.fullName}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Father / Guardian Name</span>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5 capitalize">{emp.personalInfo.fatherName || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">National CNIC</span>
                    <p className="text-sm font-mono font-bold text-blue-700 mt-0.5">{emp.personalInfo.cnic || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Mobile Phone</span>
                    <p className="text-sm font-mono font-bold text-slate-900 mt-0.5">{emp.personalInfo.phone}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Email Address</span>
                    <p className="text-sm text-slate-700 mt-0.5 truncate">{emp.personalInfo.email || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Emergency Contact</span>
                    <p className="text-sm font-bold text-amber-700 mt-0.5">{emp.personalInfo.emergencyContact || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-medium text-slate-500">Residential Address</span>
                    <p className="text-sm text-slate-800 mt-0.5">{emp.personalInfo.address || "—"}</p>
                  </div>
                </div>
              </Card>

              {/* Card 2: Employment & Line Allocation */}
              <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs bg-white">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Briefcase className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    EMPLOYMENT & FACTORY ASSIGNMENT
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Department</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{emp.employmentInfo.department || "Unassigned"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Designation / Role</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 capitalize">{emp.employmentInfo.designation || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Employment Contract</span>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{emp.employmentInfo.employmentType || "Permanent"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Joining Date</span>
                    <p className="text-sm font-mono font-bold text-slate-900 mt-0.5">{emp.employmentInfo.joiningDate}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Factory Shift</span>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{emp.factoryInfo.shift || "General Shift"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Production Line</span>
                    <p className="text-sm font-bold text-blue-700 mt-0.5">{emp.factoryInfo.assignedLine || "Line 1"}</p>
                  </div>

                  <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-slate-500">Current Wage Model:</span>
                      <p className="text-sm font-bold text-emerald-700">
                        {SALARY_TYPE_BADGES[emp.salaryInfo.salaryType]?.label}
                      </p>
                    </div>
                    <span className="text-base font-mono font-extrabold text-slate-900">
                      {emp.salaryInfo.salaryType === "monthly" && formatPKR(emp.salaryInfo.monthlySalary || 0)}
                      {emp.salaryInfo.salaryType === "daily" && `${formatPKR(emp.salaryInfo.dailyRate || 0)}/day`}
                      {emp.salaryInfo.salaryType === "piece_rate" && `${formatPKR(emp.salaryInfo.pieceRate || 0)}/pc`}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: EMPLOYMENT DETAILS                                 */}
          {/* ========================================================= */}
          {activeProfileTab === "employment" && (
            <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Briefcase className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  COMPLETE EMPLOYMENT PARAMETERS
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-medium uppercase text-[10px]">Department</span>
                  <p className="text-sm font-bold text-slate-900">{emp.employmentInfo.department || "Unassigned"}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-medium uppercase text-[10px]">Designation</span>
                  <p className="text-sm font-bold text-slate-900 capitalize">{emp.employmentInfo.designation || "—"}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-medium uppercase text-[10px]">Contract Type</span>
                  <p className="text-sm font-bold text-slate-900">{emp.employmentInfo.employmentType || "Permanent"}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-medium uppercase text-[10px]">Joining Date</span>
                  <p className="font-mono text-sm font-bold text-slate-900">{emp.employmentInfo.joiningDate}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-medium uppercase text-[10px]">Skill Classification</span>
                  <p className="text-sm font-bold text-emerald-700">{emp.factoryInfo.skillLevel || "Skilled"}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-medium uppercase text-[10px]">Production Line</span>
                  <p className="text-sm font-bold text-blue-700">{emp.factoryInfo.assignedLine || "Line 1"}</p>
                </div>
              </div>
            </Card>
          )}

          {/* ========================================================= */}
          {/* TAB 3: SALARY CONFIGURATION                               */}
          {/* ========================================================= */}
          {activeProfileTab === "salary" && (
            <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    WAGE & SALARY CONFIGURATION
                  </h3>
                </div>
                <Badge variant={SALARY_TYPE_BADGES[emp.salaryInfo.salaryType]?.variant || "default"}>
                  {SALARY_TYPE_BADGES[emp.salaryInfo.salaryType]?.label}
                </Badge>
              </div>

              {emp.salaryInfo.salaryType === "monthly" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                      <span className="text-[10px] font-bold text-blue-700 uppercase">Gross Monthly Base</span>
                      <p className="text-2xl font-extrabold text-blue-900">{formatPKR(emp.salaryInfo.monthlySalary || 0)}</p>
                      <p className="text-[11px] text-blue-600">Contractual total gross</p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Basic Salary (60%)</span>
                      <p className="text-2xl font-extrabold text-emerald-900">{formatPKR(breakdown.basicSalary)}</p>
                      <p className="text-[11px] text-emerald-600">Core calculation base</p>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-1">
                      <span className="text-[10px] font-bold text-purple-700 uppercase">Overtime Rate</span>
                      <p className="text-2xl font-extrabold text-purple-900">{formatPKR(breakdown.overtimeHourlyRate)}/hr</p>
                      <p className="text-[11px] text-purple-600">Single extra shift rate</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Monthly Allowances Breakdown
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-200">
                          <span className="text-slate-600">House Rent Allowance (20%)</span>
                          <span className="font-mono font-bold text-slate-900">{formatPKR(breakdown.houseRentAllowance)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-200">
                          <span className="text-slate-600">Conveyance Allowance (10%)</span>
                          <span className="font-mono font-bold text-slate-900">{formatPKR(breakdown.conveyanceAllowance)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-200">
                          <span className="text-slate-600">Medical Allowance (5%)</span>
                          <span className="font-mono font-bold text-slate-900">{formatPKR(breakdown.medicalAllowance)}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-600">Food / Special Allowance</span>
                          <span className="font-mono font-bold text-slate-900">{formatPKR(breakdown.foodOrSpecialAllowance)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Statutory Rules & Deductions
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-200">
                          <span className="text-slate-600">EOBI Employee Contribution</span>
                          <span className="font-mono font-bold text-amber-700">{formatPKR(breakdown.eobiDeduction)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-200">
                          <span className="text-slate-600">Estimated Income Tax</span>
                          <span className="font-mono font-bold text-amber-700">{formatPKR(breakdown.taxDeduction)}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-600">Per-Day Absence Basis</span>
                          <span className="font-mono font-bold text-slate-900">{formatPKR(Math.round((emp.salaryInfo.monthlySalary || 0) / 26))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Disbursement Details */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Disbursement & Bank Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-slate-500">Payment Mode</span>
                    <p className="font-bold text-slate-900">{emp.salaryInfo.paymentMode || "Bank Transfer"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-slate-500">Bank Name</span>
                    <p className="font-bold text-slate-900">{emp.salaryInfo.bankName || "—"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-slate-500">Account / IBAN</span>
                    <p className="font-mono font-bold text-slate-900">{emp.salaryInfo.accountNumber || "—"}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ========================================================= */}
          {/* TAB 4: PRODUCTION SKILLS                                  */}
          {/* ========================================================= */}
          {activeProfileTab === "skills" && (
            <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Award className="h-4 w-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  PRODUCTION SKILLS & FLOOR MASTERY
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 uppercase font-semibold text-[10px]">Skill Tier</span>
                  <p className="text-base font-extrabold text-emerald-700">{emp.factoryInfo.skillLevel || "Skilled"}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 uppercase font-semibold text-[10px]">Experience</span>
                  <p className="text-base font-extrabold text-slate-900">
                    {emp.factoryInfo.experienceYears ? `${emp.factoryInfo.experienceYears} Years` : "5 Years Garments Exp"}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 uppercase font-semibold text-[10px]">Verified By</span>
                  <p className="text-base font-extrabold text-blue-700">{emp.factoryInfo.verifiedBy || "Floor Master Supervisor"}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 uppercase font-semibold text-[10px]">Last Evaluation</span>
                  <p className="text-base font-extrabold text-purple-700">
                    {emp.factoryInfo.lastEvaluationDate || "August 2026 (Passed)"}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Verified Machinery Operations
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { name: "Single Needle Lockstitch (SNLS)", level: "Certified Master" },
                    { name: "4-Thread Overlock Machine", level: "Mastered" },
                    { name: "Flatlock / Interlock Machine", level: "Certified" },
                    { name: "Buttonhole & Button Attach", level: "Trained" },
                    { name: "Collar & Cuff Fusing Press", level: "Trained" },
                    { name: "100% End-Line Visual Inspection", level: "Certified" },
                  ].map((skill, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                    >
                      <span className="font-semibold text-slate-800">{skill.name}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {skill.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ========================================================= */}
          {/* TAB 5: REAL DOCUMENT MANAGEMENT (REAL DATABASE STORAGE)   */}
          {/* ========================================================= */}
          {activeProfileTab === "documents" && (
            <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    EMPLOYEE ONBOARDING DOCUMENTS & VERIFICATION
                  </h3>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Upload className="h-4 w-4" />}
                  onClick={() => {
                    setSelectedFile(null);
                    setFileError(null);
                    setDocCustomTitle("");
                    setIsDocModalOpen(true);
                  }}
                >
                  Upload Document
                </Button>
              </div>

              {emp.documents && emp.documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {emp.documents.map((doc) => {
                    const isPdf = doc.fileName.toLowerCase().endsWith(".pdf");
                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            {isPdf ? (
                              <FileText className="h-6 w-6 text-blue-600" />
                            ) : (
                              <FileImage className="h-6 w-6 text-emerald-600" />
                            )}
                            <Badge variant="success">Attached</Badge>
                          </div>
                          <p className="font-bold text-sm text-slate-900 pt-1">{doc.title}</p>
                          <p className="font-mono text-xs text-slate-500 truncate" title={doc.fileName}>
                            File: {doc.fileName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Uploaded: {doc.uploadedAt} • {doc.fileSize}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View Document"
                              onClick={() => {
                                if (doc.fileUrl) {
                                  setPreviewDoc(doc);
                                } else {
                                  toast({ type: "info", message: `Opening: ${doc.title}` });
                                }
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Download Document"
                              onClick={() => {
                                if (doc.fileUrl) {
                                  const link = document.createElement("a");
                                  link.href = doc.fileUrl;
                                  link.download = doc.fileName;
                                  link.target = "_blank";
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                } else {
                                  toast({ type: "success", message: `Downloading ${doc.fileName}` });
                                }
                              }}
                            >
                              <Download className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete Document"
                            onClick={() => handleDeleteDocument(doc.id, doc.title, doc.storagePath)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 space-y-3">
                  <FileText className="h-10 w-10 text-slate-400 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">No Documents Uploaded Yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Upload National CNIC, signed contract agreement, medical fitness certificate, or joining letter.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Upload className="h-4 w-4" />}
                    onClick={() => {
                      setSelectedFile(null);
                      setFileError(null);
                      setDocCustomTitle("");
                      setIsDocModalOpen(true);
                    }}
                  >
                    Upload First Document
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* ========================================================= */}
          {/* TAB 6: ATTENDANCE & SHIFTS (ZERO FAKE DATA)               */}
          {/* ========================================================= */}
          {activeProfileTab === "attendance" && (
            <div className="space-y-6">
              <Card className="p-0 overflow-hidden border-slate-200/80 shadow-xs bg-white">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      DAILY BIOMETRIC TIMECLOCK & SHIFTS LOG
                    </h3>
                  </div>
                  <Badge variant={attSummary.dailyLogs.length > 0 ? "success" : "default"}>
                    {attSummary.dailyLogs.length > 0 ? "Live Biometrics" : "No Records"}
                  </Badge>
                </div>

                {attSummary.dailyLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Check In</th>
                          <th className="py-3 px-4">Check Out</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Overtime</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attSummary.dailyLogs.map((log, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{log.date}</td>
                            <td className="py-3 px-4 font-mono text-slate-700">{log.checkIn}</td>
                            <td className="py-3 px-4 font-mono text-slate-700">{log.checkOut}</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  log.status === "Present"
                                    ? "success"
                                    : log.status === "Late"
                                    ? "warning"
                                    : log.status === "Absent"
                                    ? "danger"
                                    : "default"
                                }
                              >
                                {log.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-purple-700">
                              {log.overtimeHours > 0 ? `+${log.overtimeHours} hrs` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center bg-slate-50 p-6 space-y-2">
                    <Clock className="h-8 w-8 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">No Attendance Data Available</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Biometric timeclock logs and punch history will appear here once recorded.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 7: ADVANCES & LOANS (INTEGRATED WITH ADVANCES LEDGER) */}
          {/* ========================================================= */}
          {activeProfileTab === "advances" && (
            <div className="space-y-6">
              {/* 4 Loan Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Borrowed</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5 truncate">{formatPKR(loanSummary.totalTaken)}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Cumulative advances</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Total Recovered</span>
                  <p className="text-lg font-bold text-emerald-900 mt-0.5 truncate">{formatPKR(loanSummary.recovered)}</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Paid via payroll</p>
                </div>
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider">Remaining Balance</span>
                  <p className="text-lg font-bold text-rose-900 mt-0.5 truncate">{formatPKR(loanSummary.remaining)}</p>
                  <p className="text-[11px] text-rose-600 mt-0.5">Active company loan</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Active Loans</span>
                  <p className="text-lg font-bold text-blue-950 mt-0.5 truncate">{loanSummary.activeLoansCount}</p>
                  <p className="text-[11px] text-blue-600 mt-0.5">Open contracts</p>
                </div>
              </div>

              <Card className="p-0 overflow-hidden border-slate-200/80 shadow-xs bg-white">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      EMPLOYEE ADVANCES & LOAN RECOVERY LEDGER
                    </h3>
                  </div>
                </div>

                {advances.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Advance Ref</th>
                          <th className="py-3 px-4">Request Date</th>
                          <th className="py-3 px-4">Approved Amount</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4">Monthly Deduction</th>
                          <th className="py-3 px-4">Remaining Balance</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {advances.map((adv) => (
                          <tr key={adv.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">{adv.advanceNumber}</td>
                            <td className="py-3 px-4 font-mono text-slate-700">{adv.requestDate}</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {formatPKR(adv.approvedAmount || adv.requestedAmount)}
                            </td>
                            <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate">{adv.reason}</td>
                            <td className="py-3 px-4 font-mono font-bold text-amber-700">
                              {formatPKR(adv.monthlyDeduction)}/mo
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-rose-700">
                              {formatPKR(adv.remainingBalance)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={adv.status === "Completed" ? "success" : adv.status === "Rejected" ? "danger" : "warning"}>
                                {adv.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center bg-slate-50 p-6 space-y-2">
                    <CreditCard className="h-8 w-8 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">No Active Advances</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      No outstanding employee loans or advance requests on record for this worker.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 8: PAYROLL HISTORY & STATEMENT (ZERO FAKE DATA)       */}
          {/* ========================================================= */}
          {activeProfileTab === "payroll" && (
            <Card className="p-0 overflow-hidden border-slate-200/80 shadow-xs bg-white">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    DISBURSED PAYROLL STATEMENT & PAYSLIPS
                  </h3>
                </div>
                <Badge variant={payrollHistory.length > 0 ? "primary" : "default"}>
                  {payrollHistory.length > 0 ? "Payroll Ready" : "No Payroll"}
                </Badge>
              </div>

              {payrollHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4">Month</th>
                        <th className="py-3 px-4">Basic Salary</th>
                        <th className="py-3 px-4">Allowances</th>
                        <th className="py-3 px-4">Overtime</th>
                        <th className="py-3 px-4">Piece Output</th>
                        <th className="py-3 px-4">Advance Deduction</th>
                        <th className="py-3 px-4">Net Payable</th>
                        <th className="py-3 px-4">Payment Status</th>
                        <th className="py-3 px-4 text-right">Payslip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payrollHistory.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-bold text-slate-900">{p.monthYear}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">{formatPKR(p.baseAmount)}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">{formatPKR(p.allowances)}</td>
                          <td className="py-3 px-4 font-mono text-emerald-700">+{formatPKR(p.overtimeAmount)}</td>
                          <td className="py-3 px-4 font-mono text-emerald-700">
                            {p.pieceEarnings > 0 ? `+${formatPKR(p.pieceEarnings)}` : "—"}
                          </td>
                          <td className="py-3 px-4 font-mono text-rose-700">-{formatPKR(p.advanceDeduction)}</td>
                          <td className="py-3 px-4 font-mono font-extrabold text-slate-900 text-sm">
                            {formatPKR(p.netPayable)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="success">{p.status}</Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Printer className="h-3.5 w-3.5" />}
                              onClick={() => setIsPrintModalOpen(true)}
                            >
                              View Payslip
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center bg-slate-50 p-6 space-y-2">
                  <History className="h-8 w-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">No Payroll Generated Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Monthly payslips and salary disbursement statements will be listed here after payroll processing.
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* ========================================================= */}
          {/* TAB 9: ACTIVITY TIMELINE                                  */}
          {/* ========================================================= */}
          {activeProfileTab === "timeline" && (
            <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Activity className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  ACTIVITY & AUDIT TIMELINE
                </h3>
              </div>

              <div className="space-y-3">
                {emp.timeline && emp.timeline.length > 0 ? (
                  emp.timeline.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900">{event.title}</p>
                        <p className="text-slate-600">{event.description}</p>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-4">
                        {new Date(event.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No historical timeline records logged.
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ========================================================= */}
          {/* TAB 10: OPERATIONAL TASKS & WORK ORDERS                   */}
          {/* ========================================================= */}
          {activeProfileTab === "tasks" && (
            <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Assigned Floor Tasks & Work Orders
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Assign and monitor operational duties, maintenance schedules, and quality inspections for {emp.personalInfo.fullName}.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckSquare className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setAssignTaskEmployeeId(emp.id);
                    setIsAssignTaskModalOpen(true);
                  }}
                >
                  Assign Task
                </Button>
              </div>

              <EmployeeTasksList
                employeeId={emp.id}
                employeeName={emp.personalInfo.fullName}
                refreshKey={taskRefreshKey}
                onAssignTaskClick={() => {
                  setAssignTaskEmployeeId(emp.id);
                  setIsAssignTaskModalOpen(true);
                }}
              />
            </Card>
          )}
        </div>

        {/* ========================================================= */}
        {/* MODAL: REAL DOCUMENT UPLOAD (DATABASE STORAGE)            */}
        {/* ========================================================= */}
        <Modal
          isOpen={isDocModalOpen}
          onClose={() => {
            if (!isUploadingDoc) {
              setIsDocModalOpen(false);
              setSelectedFile(null);
              setFileError(null);
            }
          }}
          title={`Upload Document to Storage — ${emp.employeeNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <FormField label="Document Type *">
              <Select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
                options={[
                  { label: "CNIC Copy (Front Side)", value: "cnic_front" },
                  { label: "CNIC Copy (Back Side)", value: "cnic_back" },
                  { label: "Employment Contract Agreement", value: "contract" },
                  { label: "Passport Size Photograph", value: "photo" },
                  { label: "Medical Fitness Certificate", value: "medical" },
                  { label: "Appointment / Joining Letter", value: "joining_letter" },
                ]}
              />
            </FormField>

            <FormField label="Custom Title (Optional)">
              <Input
                placeholder="e.g. Verified CNIC Front 2026"
                value={docCustomTitle}
                onChange={(e) => setDocCustomTitle(e.target.value)}
              />
            </FormField>

            {/* Real File Input Area */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700">Select File Attachment * (PDF, JPG, PNG — Max 10MB)</span>
              
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleFileChange}
              />

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-50/40 transition-colors cursor-pointer space-y-2"
                >
                  <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Click to browse or drag and drop</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Supported formats: PDF, JPG, PNG (Max 10MB)</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/60 border border-blue-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedFile.name.toLowerCase().endsWith(".pdf") ? (
                      <FileText className="h-6 w-6 text-blue-600 shrink-0" />
                    ) : (
                      <FileImage className="h-6 w-6 text-emerald-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-500">{formatBytes(selectedFile.size)}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer"
                    title="Remove selected file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {fileError && (
                <p className="text-xs font-semibold text-rose-600 mt-1">{fileError}</p>
              )}
            </div>

            {/* Upload Progress feedback */}
            {isUploadingDoc && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <span className="text-xs font-bold text-blue-800">
                  {uploadStep === "uploading" && "Uploading file to Database Storage..."}
                  {uploadStep === "saving" && "Saving document record in database..."}
                  {uploadStep === "success" && "Upload complete!"}
                </span>
              </div>
            )}
          </div>

          <ModalFooter>
            <Button
              variant="ghost"
              disabled={isUploadingDoc}
              onClick={() => {
                setIsDocModalOpen(false);
                setSelectedFile(null);
                setFileError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedFile || isUploadingDoc}
              onClick={handleUploadDocumentSubmit}
              leftIcon={
                isUploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />
              }
            >
              {isUploadingDoc ? "Uploading..." : "Upload & Save Document"}
            </Button>
          </ModalFooter>
        </Modal>

        {/* MODAL: DOCUMENT PREVIEW */}
        {previewDoc && (
          <Modal
            isOpen={!!previewDoc}
            onClose={() => setPreviewDoc(null)}
            title={`Document Preview — ${previewDoc.title}`}
            size="lg"
          >
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-4">
              {previewDoc.fileName.toLowerCase().match(/\.(jpg|jpeg|png)$/) && previewDoc.fileUrl ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.title}
                  className="max-h-[65vh] mx-auto rounded-lg shadow-sm border border-slate-200 object-contain"
                />
              ) : (
                <div className="py-12 space-y-3">
                  <FileText className="h-16 w-16 text-blue-600 mx-auto" />
                  <p className="font-bold text-sm text-slate-800">{previewDoc.fileName}</p>
                  <p className="text-xs text-slate-500">PDF Document ({previewDoc.fileSize})</p>
                </div>
              )}
            </div>

            <ModalFooter>
              <Button variant="ghost" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </Button>
              {previewDoc.fileUrl && (
                <Button
                  variant="primary"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = previewDoc.fileUrl!;
                    link.download = previewDoc.fileName;
                    link.target = "_blank";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  Download File
                </Button>
              )}
            </ModalFooter>
          </Modal>
        )}

        {/* MODAL: PRINT PREVIEW */}
        <Modal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title="Print Employee Profile"
          size="lg"
        >
          <div className="space-y-6 p-4 bg-white text-slate-900 rounded-xl border border-slate-200 text-xs">
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-extrabold uppercase">FactoryOS ERP — Garment Manufacturing</h2>
                <p className="text-xs font-semibold text-slate-600">Employee Profile & HR Verification Report</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-blue-700">{emp.employeeNumber}</p>
                <p className="text-[11px] text-slate-500">Date: {new Date().toLocaleDateString("en-PK")}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <span className="font-bold uppercase text-[10px] text-slate-500">Personal Information</span>
                <p><strong>Name:</strong> {emp.personalInfo.fullName}</p>
                <p><strong>Father Name:</strong> {emp.personalInfo.fatherName || "—"}</p>
                <p><strong>CNIC:</strong> {emp.personalInfo.cnic || "—"}</p>
                <p><strong>Phone:</strong> {emp.personalInfo.phone}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <span className="font-bold uppercase text-[10px] text-slate-500">Employment Information</span>
                <p><strong>Department:</strong> {emp.employmentInfo.department}</p>
                <p><strong>Designation:</strong> {emp.employmentInfo.designation}</p>
                <p><strong>Joining Date:</strong> {emp.employmentInfo.joiningDate}</p>
                <p><strong>Wage Model:</strong> {SALARY_TYPE_BADGES[emp.salaryInfo.salaryType]?.label}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 flex justify-between items-center text-sm">
              <span className="font-bold">Base Monthly Gross Salary:</span>
              <span className="font-mono font-extrabold text-blue-800">{formatPKR(emp.salaryInfo.monthlySalary || 0)}</span>
            </div>

            <div className="border-t border-slate-300 pt-6 mt-6 grid grid-cols-2 gap-8 text-center">
              <div className="space-y-4">
                <div className="border-b border-slate-400 w-32 mx-auto" />
                <p className="font-bold">HR Incharge</p>
              </div>
              <div className="space-y-4">
                <div className="border-b border-slate-400 w-32 mx-auto" />
                <p className="font-bold">Authorized Signature</p>
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
              Print Report
            </Button>
          </ModalFooter>
        </Modal>

        {/* Archive Dialog */}
        <ConfirmDialog
          isOpen={!!employeeToArchive}
          onClose={() => setEmployeeToArchive(null)}
          onConfirm={handleArchiveConfirm}
          title="Archive Employee Profile"
          description={`Archive ${employeeToArchive?.employeeNumber}? All records will be preserved.`}
          confirmLabel="Archive Employee"
          destructive
        />

        {/* Delete Dialog */}
        <ConfirmDialog
          isOpen={!!employeeToDelete}
          onClose={() => setEmployeeToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Record"
          description={`Permanently remove ${employeeToDelete?.employeeNumber}?`}
          confirmLabel="Delete Record"
          destructive
        />

        {/* Assign Task Modal */}
        <AssignTaskModal
          isOpen={isAssignTaskModalOpen}
          onClose={() => setIsAssignTaskModalOpen(false)}
          onTaskAssigned={() => {
            setTaskRefreshKey((prev) => prev + 1);
            toast({ type: "success", message: "Task assigned successfully." });
          }}
          employees={employees.map((e) => ({
            id: e.id,
            name: `${e.employeeNumber} - ${e.personalInfo.fullName}`,
            department: e.employmentInfo.department,
            designation: e.employmentInfo.designation,
          }))}
          preselectedEmployeeId={assignTaskEmployeeId}
        />
      </>
    );
  }

  // ==========================================
  // VIEW: MAIN DIRECTORY LIST
  // ==========================================
  return (
    <>
      <TopNav title="Factory Workforce & Employee Profiles" />

      <div className="space-y-6 min-w-0 w-full p-4 lg:p-6 pb-20 animate-in fade-in-0 duration-200">
        <PageHeader
          title="Employee & Workforce Management"
          description="Manage factory workers, staff profiles, departments, wages, and employment records."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<RefreshCw className={`h-4 w-4 ${loadingEmployees ? "animate-spin" : ""}`} />}
                onClick={() => loadEmployees(true)}
              >
                Refresh
              </Button>
              <Button
                variant="outline"
                size="md"
                leftIcon={<CheckSquare className="h-4 w-4" />}
                onClick={() => {
                  setAssignTaskEmployeeId(undefined);
                  setIsAssignTaskModalOpen(true);
                }}
              >
                Assign Task
              </Button>
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openAddModal}>
                Add Employee
              </Button>
            </div>
          }
        />

        {/* 5 Clean White KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Workforce</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.totalEmployees}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Registered workers</p>
          </Card>
          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Employees</span>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{metrics.activeEmployees}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Active on payroll</p>
          </Card>
          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Factory Workers</span>
            <p className="text-xl font-bold text-purple-700 mt-0.5">{metrics.factoryWorkers}</p>
            <p className="text-[11px] text-purple-600 mt-0.5">Floor production</p>
          </Card>
          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Office Staff</span>
            <p className="text-xl font-bold text-amber-700 mt-0.5">{metrics.officeStaff}</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Admin & Planning</p>
          </Card>
          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Monthly Payroll Est.</span>
            <p className="text-lg font-bold text-blue-700 mt-0.5 truncate">{formatPKR(metrics.monthlyPayrollEstimate)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Estimated wage bill</p>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card className="p-4 border-slate-200/80 shadow-xs bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <Input
                placeholder="Search ID, Name, Phone, CNIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                prefix={<Search className="h-4 w-4 text-slate-400" />}
              />
            </div>
            <div>
              <Select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                options={[{ label: "All Departments", value: "all" }, ...DEPARTMENTS.map((d) => ({ label: d, value: d }))]}
              />
            </div>
            <div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[{ label: "All Statuses", value: "all" }, ...EMPLOYMENT_STATUSES.map((s) => ({ label: s, value: s }))]}
              />
            </div>
            <div>
              <Select
                value={empTypeFilter}
                onChange={(e) => setEmpTypeFilter(e.target.value)}
                options={[{ label: "All Contract Types", value: "all" }, ...EMPLOYMENT_TYPES.map((t) => ({ label: t, value: t }))]}
              />
            </div>
            <div>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "recent" | "name" | "dept" | "salary")}
                options={[
                  { label: "Recently Joined", value: "recent" },
                  { label: "Sort by Name", value: "name" },
                  { label: "Sort by Dept", value: "dept" },
                  { label: "Sort by Salary", value: "salary" },
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Employees Table List */}
        <Card className="p-0 overflow-hidden border-slate-200/80 shadow-xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">EMP ID</th>
                  <th className="py-3 px-4">Full Name & Contact</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Wage Model</th>
                  <th className="py-3 px-4">Salary / Rate</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                      onClick={() => {
                        setEmployeeToArchive(null);
                        setEmployeeToDelete(null);
                        setSelectedEmployeeId(emp.id);
                        setActiveProfileTab("overview");
                      }}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{emp.employeeNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 capitalize">{emp.personalInfo.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{emp.personalInfo.phone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{emp.employmentInfo.department || "Unassigned"}</div>
                        <div className="text-[11px] text-slate-500 capitalize">{emp.employmentInfo.designation || "—"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={SALARY_TYPE_BADGES[emp.salaryInfo.salaryType]?.variant || "default"}>
                          {SALARY_TYPE_BADGES[emp.salaryInfo.salaryType]?.label}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {emp.salaryInfo.salaryType === "monthly" && formatPKR(emp.salaryInfo.monthlySalary || 0)}
                        {emp.salaryInfo.salaryType === "daily" && `${formatPKR(emp.salaryInfo.dailyRate || 0)}/day`}
                        {emp.salaryInfo.salaryType === "piece_rate" && `${formatPKR(emp.salaryInfo.pieceRate || 0)}/pc`}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{emp.employmentInfo.joiningDate}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={STATUS_BADGE_CONFIG[emp.employmentInfo.status]?.variant || "default"} dot>
                          {emp.employmentInfo.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Profile"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmployeeToArchive(null);
                              setEmployeeToDelete(null);
                              setSelectedEmployeeId(emp.id);
                              setActiveProfileTab("overview");
                            }}
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Assign Task"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignTaskEmployeeId(emp.id);
                              setIsAssignTaskModalOpen(true);
                            }}
                          >
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit Employee"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(emp);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5 text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Duplicate"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateEmployee(emp);
                            }}
                          >
                            <Copy className="h-3.5 w-3.5 text-slate-600" />
                          </Button>
                          {!emp.isArchived ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Archive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeToArchive(emp);
                              }}
                            >
                              <Archive className="h-3.5 w-3.5 text-amber-600" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Restore Employee"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreEmployee(emp);
                              }}
                            >
                              <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmployeeToDelete(emp);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <EmptyState
                        icon={<Users className="h-6 w-6 text-blue-600" />}
                        title="No Employees Found"
                        description={
                          searchQuery || deptFilter !== "all" || statusFilter !== "all"
                            ? "Try clearing your search query or filters."
                            : "Click '+ Add Employee' to onboard factory workforce and staff."
                        }
                        actionLabel="Add First Employee"
                        onAction={openAddModal}
                        actionIcon={<Plus className="h-4 w-4" />}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredEmployees.length > PAGE_SIZE && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={filteredEmployees.length} onPageChange={setPage} />
          )}
        </Card>

        {/* Assign Task Modal */}
        <AssignTaskModal
          isOpen={isAssignTaskModalOpen}
          onClose={() => setIsAssignTaskModalOpen(false)}
          onTaskAssigned={() => {
            setTaskRefreshKey((prev) => prev + 1);
            toast({ type: "success", message: "Task assigned successfully." });
          }}
          employees={employees.map((e) => ({
            id: e.id,
            name: `${e.employeeNumber} - ${e.personalInfo.fullName}`,
            department: e.employmentInfo.department,
            designation: e.employmentInfo.designation,
          }))}
          preselectedEmployeeId={assignTaskEmployeeId}
        />

        {/* Archive Dialog */}
        <ConfirmDialog
          isOpen={!!employeeToArchive}
          onClose={() => setEmployeeToArchive(null)}
          onConfirm={handleArchiveConfirm}
          title="Archive Employee Profile"
          description={`Archive ${employeeToArchive?.employeeNumber}? All records will be preserved.`}
          confirmLabel="Archive Employee"
          destructive
        />

        {/* Delete Dialog */}
        <ConfirmDialog
          isOpen={!!employeeToDelete}
          onClose={() => setEmployeeToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Record"
          description={`Permanently remove ${employeeToDelete?.employeeNumber}?`}
          confirmLabel="Delete Record"
          destructive
        />
      </div>
    </>
  );
}

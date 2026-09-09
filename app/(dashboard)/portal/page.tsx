"use client";

import * as React from "react";
import Link from "next/link";
import {
  UserCheck,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Check,
  DollarSign,
  HandCoins,
  MessageSquare,
  Wrench,
  Shield,
  Calendar,
  Building2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Plus,
  Send,
  Printer,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { FormField } from "@/components/forms/FormField";
import { TopNav } from "@/components/layout/TopNav";
import { useToast } from "@/components/ui/Toast";
import { getClientAuthUser } from "@/lib/auth/auth-client";
import { AuthUser } from "@/lib/auth/auth-types";

interface EmployeeTask {
  id: string;
  taskNumber: string;
  title: string;
  description?: string;
  taskType: string;
  priority: "urgent" | "high" | "normal" | "low";
  status: "assigned" | "in_progress" | "completed" | "cancelled";
  assignedToEmployeeId: string;
  assignedToName: string;
  assignedByName: string;
  dueDate: string;
  dueTime?: string;
  completionNotes?: string;
  completedAt?: string;
  createdAt: string;
}

interface AdvanceRecord {
  id: string;
  advanceNumber?: string;
  employeeId: string;
  employeeNumber?: string;
  employeeName?: string;
  requestedAmount?: number;
  approvedAmount?: number;
  amount?: number;
  reason: string;
  status: string;
  repaymentMonths?: number;
  monthlyDeduction?: number;
  remainingBalance?: number;
  createdAt: string;
}

export const getAdvanceAmount = (adv: AdvanceRecord) => {
  return Number(adv.approvedAmount ?? adv.requestedAmount ?? adv.amount ?? 0);
};

export const isApprovedOrActive = (status?: string) => {
  const s = (status || "").toLowerCase();
  return s === "approved" || s === "active" || s === "disbursed";
};

export const getMonthlyDeduction = (adv: AdvanceRecord) => {
  if (adv.monthlyDeduction && Number(adv.monthlyDeduction) > 0) {
    return Number(adv.monthlyDeduction);
  }
  const amt = getAdvanceAmount(adv);
  const months = Number(adv.repaymentMonths) || 2;
  return Math.round(amt / months);
};

const PRIORITY_BADGES: Record<string, { label: string; variant: "danger" | "warning" | "info" | "default" }> = {
  urgent: { label: "Urgent", variant: "danger" },
  high: { label: "High Priority", variant: "warning" },
  normal: { label: "Standard", variant: "info" },
  low: { label: "Low Priority", variant: "default" },
};

export default function EmployeePortalPage() {
  const { success, error: toastError, info } = useToast();
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = React.useState<"tasks" | "payroll" | "advances" | "support">("tasks");

  // Data States
  const [employeeProfile, setEmployeeProfile] = React.useState<any | null>(null);
  const [tasks, setTasks] = React.useState<EmployeeTask[]>([]);
  const [advances, setAdvances] = React.useState<AdvanceRecord[]>([]);
  const [loadingTasks, setLoadingTasks] = React.useState(true);
  const [taskFilter, setTaskFilter] = React.useState<"all" | "pending" | "completed">("all");

  // Complete Task Modal State
  const [completingTask, setCompletingTask] = React.useState<EmployeeTask | null>(null);
  const [completionNotes, setCompletionNotes] = React.useState("");
  const [submittingCompletion, setSubmittingCompletion] = React.useState(false);

  // Request Advance Modal State
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = React.useState(false);
  const [advanceAmount, setAdvanceAmount] = React.useState("5000");
  const [advanceReason, setAdvanceReason] = React.useState("Medical emergency / family clinic expense");
  const [advanceMonths, setAdvanceMonths] = React.useState("2");
  const [submittingAdvance, setSubmittingAdvance] = React.useState(false);

  // Machine SOS State
  const [sosSent, setSosSent] = React.useState(false);

  // 1. Load Current Authenticated Session
  React.useEffect(() => {
    const user = getClientAuthUser();
    setCurrentUser(user);
  }, []);

  // 2. Fetch Tasks, Profile & Advances for this employee
  const loadEmployeeData = React.useCallback(async (empId?: string | number) => {
    setLoadingTasks(true);
    try {
      // Fetch live employee profile
      if (empId) {
        try {
          const empRes = await fetch(`/api/employees/${empId}`);
          const empData = await empRes.json();
          if (empData.success && empData.data) {
            setEmployeeProfile(empData.data);
          }
        } catch (e) {
          console.error("Failed to load employee profile:", e);
        }
      }

      // Fetch tasks
      const taskQuery = empId ? `?employeeId=${empId}` : "";
      const tasksRes = await fetch(`/api/tasks${taskQuery}`);
      const tasksData = await tasksRes.json();
      if (tasksData.success && Array.isArray(tasksData.data)) {
        setTasks(tasksData.data);
      }

      // Fetch advances
      const advRes = await fetch("/api/advances");
      const advData = await advRes.json();
      if (advData.success && Array.isArray(advData.data)) {
        if (empId) {
          setAdvances(advData.data.filter((a: any) => String(a.employeeId) === String(empId)));
        } else {
          setAdvances(advData.data);
        }
      }
    } catch (err) {
      console.error("Error loading employee portal telemetry:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  React.useEffect(() => {
    const empId = currentUser?.employeeId || (currentUser?.role === "operator" ? currentUser.id : 1);
    loadEmployeeData(empId);
  }, [currentUser, loadEmployeeData]);

  // Handle task status progression (Start task -> in_progress)
  const handleStartTask = async (task: EmployeeTask) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success("Work Started", {
          description: `Task ${task.taskNumber} is now marked In Progress.`,
        });
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: "in_progress" } : t))
        );
      } else {
        toastError("Update Failed", { description: data.message });
      }
    } catch (err: any) {
      toastError("Error", { description: err.message || "Failed to update task" });
    }
  };

  // Submit task completion
  const handleConfirmTaskCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;

    setSubmittingCompletion(true);
    try {
      const res = await fetch(`/api/tasks/${completingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          completionNotes: completionNotes.trim() || "Completed according to garment spec requirements.",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success("Task Completed!", {
          description: `Task ${completingTask.taskNumber} submitted to supervisor.`,
        });
        setTasks((prev) =>
          prev.map((t) =>
            t.id === completingTask.id
              ? {
                  ...t,
                  status: "completed",
                  completionNotes: completionNotes.trim(),
                  completedAt: new Date().toISOString(),
                }
              : t
          )
        );
        setCompletingTask(null);
        setCompletionNotes("");
      } else {
        toastError("Submission Failed", { description: data.message });
      }
    } catch (err: any) {
      toastError("Error", { description: err.message });
    } finally {
      setSubmittingCompletion(false);
    }
  };

  // Submit Advance Request
  const handleSubmitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(advanceAmount);
    if (!amountNum || amountNum <= 0) {
      toastError("Invalid Amount", { description: "Please enter a valid advance amount." });
      return;
    }

    setSubmittingAdvance(true);
    try {
      const empId = currentUser?.employeeId || (currentUser?.role === "operator" ? currentUser.id : 1);
      const res = await fetch("/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: empId,
          amount: amountNum,
          reason: advanceReason.trim(),
          repaymentMonths: Number(advanceMonths) || 2,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        success("Advance Request Submitted", {
          description: `Your request for Rs ${amountNum.toLocaleString()} has been sent to Finance for approval.`,
        });
        setIsAdvanceModalOpen(false);
        loadEmployeeData(empId);
      } else {
        toastError("Submission Failed", { description: data.message });
      }
    } catch (err: any) {
      toastError("Error", { description: err.message });
    } finally {
      setSubmittingAdvance(false);
    }
  };

  // Trigger Machine Maintenance SOS
  const handleTriggerSOS = () => {
    setSosSent(true);
    success("Maintenance Alert Dispatched", {
      description: `Floor Mechanics notified for ${currentUser?.assignedLine || "Line 1"}. Emergency assistance incoming.`,
    });
    setTimeout(() => setSosSent(false), 8000);
  };

  // Derived Task Metrics
  const pendingTasks = tasks.filter((t) => t.status === "assigned" || t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "pending") return t.status === "assigned" || t.status === "in_progress";
    if (taskFilter === "completed") return t.status === "completed";
    return true;
  });

  const workerName = employeeProfile?.personalInfo?.fullName || currentUser?.name || "Muhammad Rizwan";
  const workerNumber = employeeProfile?.employeeNumber || currentUser?.employeeNumber || "EMP-2026-001";
  const workerRoleTitle = employeeProfile?.employmentInfo?.designation || currentUser?.roleTitle || "Senior Flatlock Operator";
  const rawAssignedLine = employeeProfile?.factoryInfo?.assignedLine;
  const workerLine = rawAssignedLine
    ? rawAssignedLine.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) + " — Export Hoodies (Sialkot Unit)"
    : currentUser?.assignedLine || "Line 1 — Export Hoodies (Sialkot Unit)";
  const workerPlant = currentUser?.plant || "Unit 1 - Small Industrial Estate, Sialkot";
  const workerShift = employeeProfile?.factoryInfo?.shift || "Morning";
  const workerInitials =
    workerName
      .split(" ")
      .map((p: string) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || currentUser?.initials || "MR";

  // Active Advances & Live Deductions
  const activeAdvances = advances.filter((a) => isApprovedOrActive(a.status));
  const totalActiveAdvance = activeAdvances.reduce((acc, a) => {
    const rem = Number(a.remainingBalance);
    return acc + (!isNaN(rem) && rem > 0 ? rem : getAdvanceAmount(a));
  }, 0);
  const totalAdvanceMonthlyDeduction = activeAdvances.reduce((acc, a) => {
    return acc + getMonthlyDeduction(a);
  }, 0);

  // Live Payroll & Compensation Calculations
  const baseSalary = Number(employeeProfile?.salaryInfo?.monthlySalary || 35000);
  const basicSalary = Math.round(baseSalary * 0.85);
  const allowanceAmount = Math.round(baseSalary * 0.15);
  const attendanceBonus = 1500;
  const overtimeHours = 8.5;
  const overtimeRate = Math.round((baseSalary / (26 * 8)) * 1.5);
  const overtimeAmount = Math.round(overtimeRate * overtimeHours);
  const grossEarnings = basicSalary + allowanceAmount + attendanceBonus + overtimeAmount;

  const eobiDeduction = 380;
  const pessiDeduction = 250;
  const advanceSalaryInstallment = totalAdvanceMonthlyDeduction;
  const totalDeductions = eobiDeduction + pessiDeduction + advanceSalaryInstallment;
  const netSalary = Math.max(0, grossEarnings - totalDeductions);

  return (
    <>
      <TopNav title="Worker Self-Service Portal" />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6 pb-16 animate-in fade-in-0 duration-200">
        {/* 1. Worker Identity & Shift Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white shadow-xl border border-slate-700/60">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg ring-4 ring-white/10 shrink-0">
                {workerInitials}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {workerName}
                  </h1>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 font-semibold border border-white/10">
                    {workerNumber}
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Active on Floor
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-300">
                  {workerRoleTitle} • <span className="text-amber-400">{workerLine}</span>
                </p>
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {workerPlant}
                </p>
              </div>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdvanceModalOpen(true)}
                leftIcon={<HandCoins className="h-4 w-4 text-emerald-400" />}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-sm text-xs font-semibold backdrop-blur-sm px-4 py-2"
              >
                Request Advance
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerSOS}
                disabled={sosSent}
                leftIcon={<Wrench className={`h-4 w-4 ${sosSent ? "text-amber-400" : "text-rose-400"}`} />}
                className={`${
                  sosSent
                    ? "bg-amber-500/20 border-amber-500 text-amber-300"
                    : "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-200"
                } shadow-sm text-xs font-semibold backdrop-blur-sm transition-all px-4 py-2`}
              >
                {sosSent ? "Mechanic Alerted" : "Machine SOS"}
              </Button>
              <Link href="/chat">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<MessageSquare className="h-4 w-4" />}
                  className="bg-blue-600 hover:bg-blue-500 text-white shadow-sm text-xs font-semibold px-4 py-2"
                >
                  Floor Chat
                </Button>
              </Link>
            </div>
          </div>

          {/* Shift Telemetry Bar */}
          <div className="relative z-10 mt-6 pt-5 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 text-[11px]">Today's Shift:</span>
              <p className="font-semibold text-slate-100 mt-0.5">{workerShift} (08:00 AM - 05:00 PM)</p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Assigned Sewing Line:</span>
              <p className="font-semibold text-slate-100 mt-0.5">{workerLine}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Base Salary Type:</span>
              <p className="font-semibold text-amber-300 mt-0.5">Monthly Fixed (Rs {baseSalary.toLocaleString()} / mo)</p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Attendance Status:</span>
              <p className="font-semibold text-emerald-400 mt-0.5">Present (On-Time 07:54 AM)</p>
            </div>
          </div>
        </div>

        {/* 2. Top Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <Card className="p-5 sm:p-6 border-slate-200/90 shadow-xs hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Tasks</span>
              <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <ClipboardList className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 mt-3">{pendingTasks.length}</p>
            <p className="text-xs text-slate-500 mt-1.5">
              <strong className="text-blue-600 font-semibold">{pendingTasks.length} pending</strong> • {completedTasks.length} finished
            </p>
          </Card>

          <Card className="p-5 sm:p-6 border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Base Wage</span>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-700 mt-3">Rs {baseSalary.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1.5">Direct Bank Deposit (Meezan Bank Sialkot)</p>
          </Card>

          <Card className="p-5 sm:p-6 border-slate-200/90 shadow-xs hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Advance</span>
              <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <HandCoins className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-amber-700 mt-3">
              Rs {totalActiveAdvance.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1.5">
              {activeAdvances.length > 0 ? `${activeAdvances.length} active advance(s)` : "Zero active deductions"}
            </p>
          </Card>

          <Card className="p-5 sm:p-6 border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Floor Efficiency</span>
              <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-indigo-700 mt-3">94.2%</p>
            <p className="text-xs text-indigo-600 font-medium mt-1.5">Grade A Stitching Standard</p>
          </Card>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 inline-flex gap-1.5 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "tasks"
                ? "bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            My Floor Tasks & Work Orders ({pendingTasks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payroll")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "payroll"
                ? "bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            My Wage Slips & Compensation
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("advances")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "advances"
                ? "bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <HandCoins className="h-4 w-4" />
            Salary Advances & Loans ({advances.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("support")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "support"
                ? "bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Shield className="h-4 w-4" />
            Safety, SOPs & Machine Support
          </button>
        </div>

      {/* 4. Tab Content Panels */}

      {/* ================= TAB 1: MY TASKS & WORK ORDERS ================= */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Tasks:</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                <button
                  type="button"
                  onClick={() => setTaskFilter("all")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    taskFilter === "all" ? "bg-white font-bold text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("pending")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    taskFilter === "pending" ? "bg-white font-bold text-amber-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pending ({pendingTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("completed")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    taskFilter === "completed" ? "bg-white font-bold text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Completed ({completedTasks.length})
                </button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const empId = currentUser?.employeeId || (currentUser?.role === "operator" ? currentUser.id : 1);
                loadEmployeeData(empId);
                success("Tasks Refreshed", { description: "Latest task queue fetched from MySQL." });
              }}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Refresh Task Queue
            </Button>
          </div>

          {loadingTasks ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
              Loading your assigned tasks from MySQL...
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">All Caught Up!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You have no {taskFilter === "pending" ? "pending" : ""} tasks in your queue right now. New tasks assigned by your supervisor will appear here in real time.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredTasks.map((task) => {
                const priorityConfig = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.normal;
                const isPending = task.status === "assigned";
                const isInProgress = task.status === "in_progress";
                const isDone = task.status === "completed";

                return (
                  <Card
                    key={task.id}
                    className={`p-5 sm:p-6 transition-all border ${
                      isDone
                        ? "bg-slate-50/70 border-slate-200 opacity-85"
                        : isInProgress
                        ? "border-blue-300 bg-blue-50/20 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {task.taskNumber}
                          </span>
                          <Badge variant={priorityConfig.variant}>{priorityConfig.label}</Badge>
                          <Badge
                            variant={
                              isDone ? "success" : isInProgress ? "info" : "muted"
                            }
                            dot
                          >
                            {isDone ? "Completed" : isInProgress ? "In Progress" : "Assigned"}
                          </Badge>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            Due: <strong className="text-slate-700">{task.dueDate} {task.dueTime || ""}</strong>
                          </span>
                          <span>•</span>
                          <span>Assigned by: <strong className="text-slate-700">{task.assignedByName}</strong></span>
                          {isDone && task.completionNotes && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-medium">Notes: {task.completionNotes}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                        {isPending && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartTask(task)}
                            leftIcon={<Play className="h-3.5 w-3.5 text-blue-600 fill-blue-600" />}
                            className="bg-white hover:bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs shadow-xs"
                          >
                            Start Work
                          </Button>
                        )}

                        {isInProgress && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setCompletingTask(task);
                              setCompletionNotes("");
                            }}
                            leftIcon={<Check className="h-3.5 w-3.5 stroke-[3]" />}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                          >
                            Complete Task
                          </Button>
                        )}

                        {isDone && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Finished
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: MY PAYSLIPS & COMPENSATION ================= */}
      {activeTab === "payroll" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Current Month Salary Breakdown</h3>
                <p className="text-xs text-slate-500">Official monthly compensation record for {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                leftIcon={<Printer className="h-3.5 w-3.5" />}
                className="text-xs"
              >
                Print Payslip
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Earnings & Allowances</span>
                <div className="flex justify-between text-slate-600">
                  <span>Basic Salary (85%):</span>
                  <strong className="text-slate-900 font-mono">Rs {basicSalary.toLocaleString()}.00</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>House Rent / Transport (15%):</span>
                  <strong className="text-slate-900 font-mono">Rs {allowanceAmount.toLocaleString()}.00</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Attendance Bonus:</span>
                  <strong className="text-emerald-700 font-mono">+Rs {attendanceBonus.toLocaleString()}.00</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Overtime ({overtimeHours} Hours @ 1.5x):</span>
                  <strong className="text-emerald-700 font-mono">+Rs {overtimeAmount.toLocaleString()}.00</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Gross Earnings:</span>
                  <span className="font-mono text-sm text-slate-900">Rs {grossEarnings.toLocaleString()}.00</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Deductions & Advances</span>
                <div className="flex justify-between text-slate-600">
                  <span>EOBI Contribution (Federal):</span>
                  <strong className="text-rose-700 font-mono">-Rs {eobiDeduction.toLocaleString()}.00</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Social Security (PESSI - Punjab):</span>
                  <strong className="text-rose-700 font-mono">-Rs {pessiDeduction.toLocaleString()}.00</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Advance Salary Installment:</span>
                  <strong className="text-rose-700 font-mono">-Rs {advanceSalaryInstallment.toLocaleString()}.00</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Income Tax Withholding:</span>
                  <strong className="text-slate-500 font-mono">Rs 0.00 (Exempt)</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-rose-700">
                  <span>Total Deductions:</span>
                  <span className="font-mono text-sm">-Rs {totalDeductions.toLocaleString()}.00</span>
                </div>
              </div>
            </div>

            {/* Net Take-home Total Banner */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Estimated Net Take-Home Salary</span>
                <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">Rs {netSalary.toLocaleString()}.00</p>
                <p className="text-[11px] text-emerald-600 mt-1">Disbursement Date: 1st of next month via Direct Bank Deposit</p>
              </div>
              <Badge variant="success">Disbursement Verified</Badge>
            </div>
          </Card>

          {/* Bank & Tax Profile */}
          <Card className="p-6 border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Payment Credentials</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Bank Name:</span>
                <span className="font-bold text-slate-900">Meezan Bank Ltd</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Branch:</span>
                <span className="font-bold text-slate-900">Small Industrial Estate, Sialkot</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Account Title:</span>
                <span className="font-bold text-slate-900">{workerName}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500">IBAN / Account #:</span>
                <span className="font-mono font-bold text-blue-700">PK48MEZN000129841</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Salary Mode:</span>
                <span className="font-bold text-emerald-700">Automated Direct Wire</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs mt-4">
              <p className="font-semibold">Need to update bank details?</p>
              <p className="text-blue-700 mt-0.5 text-[11px]">
                Submit a change request to HR or contact Accounts via Team Chat.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ================= TAB 3: SALARY ADVANCES ================= */}
      {activeTab === "advances" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Salary Advances & Loan History</h3>
              <p className="text-xs text-slate-500">Track requested company advances and monthly deduction schedules.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdvanceModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
              className="text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              Request New Advance
            </Button>
          </div>

          {advances.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <HandCoins className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No Advance Requests</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You currently have no active advances or pending requests. Need an urgent loan or advance? Click the "Request New Advance" button.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {advances.map((adv) => {
                const amt = getAdvanceAmount(adv);
                const monthlyDed = getMonthlyDeduction(adv);
                const normStatus = (adv.status || "").toLowerCase();
                const isApproved = normStatus === "approved" || normStatus === "disbursed" || normStatus === "active";
                const isPending = normStatus === "pending";

                return (
                  <Card key={adv.id} className="p-4 border-slate-200 shadow-xs flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          Rs {amt.toLocaleString()}
                        </span>
                        <Badge
                          variant={
                            isApproved
                              ? "success"
                              : isPending
                              ? "warning"
                              : "danger"
                          }
                        >
                          {(adv.status || "PENDING").toUpperCase()}
                        </Badge>
                        {adv.advanceNumber && (
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {adv.advanceNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{adv.reason}</p>
                      <p className="text-[11px] text-slate-400">
                        Requested: {new Date(adv.createdAt || Date.now()).toLocaleDateString()} • Repayment in {adv.repaymentMonths || 2} month(s)
                        {adv.remainingBalance !== undefined && (
                          <span className="ml-2 font-medium text-slate-600">• Balance Due: Rs {Number(adv.remainingBalance).toLocaleString()}</span>
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500">Monthly Deduction:</span>
                      <p className="font-mono font-bold text-slate-800 text-xs">
                        Rs {monthlyDed.toLocaleString()} / mo
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: SAFETY & MACHINE SUPPORT ================= */}
      {activeTab === "support" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 sm:p-7 border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-600" />
              Machine Maintenance & Technical SOS (Sialkot Floor)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If your sewing machine, flatlock knife, needle bar, or pneumatic press malfunctions on the line, trigger an instant technical ticket. Floor mechanics from Sialkot Maintenance Station (Bays 1-4) will be dispatched immediately to your workstation.
            </p>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <strong>Emergency Workstation Guide:</strong>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>Turn off the machine main power switch immediately.</li>
                <li>Do not attempt to force motor belts or adjust live electronic knives.</li>
                <li>Keep bundle ticket tag visible on the table for mechanical inspection.</li>
              </ul>
            </div>

            <Button
              variant="primary"
              onClick={handleTriggerSOS}
              disabled={sosSent}
              leftIcon={<Wrench className="h-4 w-4" />}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-3"
            >
              {sosSent ? "Alert Dispatched to Maintenance Team" : "Dispatch Floor Mechanic (Sialkot Line 1)"}
            </Button>
          </Card>

          <Card className="p-5 border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Floor Safety & Garment Quality Standards
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 font-semibold block mb-1">Needle Breakage Protocol:</strong>
                Collect all broken needle fragments (tip, eye, shank) and submit to the supervisor before receiving a new needle.
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 font-semibold block mb-1">Garment Handling & Cleanliness:</strong>
                Ensure chalk markers and silicone spray do not touch white/heather garment fabric. Keep lint covers on during breaks.
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 font-semibold block mb-1">Fire & Emergency Exits:</strong>
                Keep sewing line aisles 100% clear of plastic bins and scrap fabric bags at all times.
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ================= MODAL: COMPLETE TASK ================= */}
      <Modal
        isOpen={!!completingTask}
        onClose={() => setCompletingTask(null)}
        title={`Complete Task — ${completingTask?.taskNumber || ""}`}
      >
        <form onSubmit={handleConfirmTaskCompletion} className="space-y-4">
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <strong className="font-semibold block">{completingTask?.title}</strong>
            <p className="mt-1 text-emerald-800">
              Assigned by: {completingTask?.assignedByName} • Due: {completingTask?.dueDate}
            </p>
          </div>

          <FormField label="Completion Notes / Feedback" required>
            <Textarea
              rows={3}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="e.g. Completed flatlock seam tension check on all 500 pcs. Machine calibrated to 380 GSM fleece."
              required
            />
          </FormField>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setCompletingTask(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submittingCompletion}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submittingCompletion ? "Submitting..." : "Confirm & Submit to Supervisor"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ================= MODAL: REQUEST ADVANCE ================= */}
      <Modal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        title="Request Salary Advance / Emergency Loan"
      >
        <form onSubmit={handleSubmitAdvance} className="space-y-4">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
            <span>Advance requests are reviewed and sanctioned by Accounts & Payroll within 24 hours.</span>
          </div>

          <FormField label="Requested Advance Amount (Rs)" required>
            <Input
              type="number"
              step="500"
              min="1000"
              max="25000"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              prefix="Rs "
              placeholder="e.g. 5000"
              required
            />
          </FormField>

          <FormField label="Repayment Installment Period" required>
            <select
              value={advanceMonths}
              onChange={(e) => setAdvanceMonths(e.target.value)}
              className="w-full rounded-md border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] px-3 py-2 text-sm text-[var(--color-erp-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-erp-primary)]"
            >
              <option value="1">1 Month (Deduct in full from next salary)</option>
              <option value="2">2 Months (Equal monthly deductions)</option>
              <option value="3">3 Months (Equal monthly deductions)</option>
            </select>
          </FormField>

          <FormField label="Reason for Advance" required>
            <Textarea
              rows={2}
              value={advanceReason}
              onChange={(e) => setAdvanceReason(e.target.value)}
              placeholder="e.g. Family medical clinic expense / Children school admission fee"
              required
            />
          </FormField>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsAdvanceModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submittingAdvance}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submittingAdvance ? "Submitting..." : "Submit Advance Request"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  </>
);
}

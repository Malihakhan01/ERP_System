"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Users,
  DollarSign,
  HandCoins,
  Receipt,
  FileCheck,
  Building2,
  Clock,
  Loader2,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import {
  PayrollRun,
  PayrollRecordItem,
  PAYROLL_STORAGE_KEY,
  processMonthlyPayrollRun,
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
} from "@/lib/services/payroll-service";
import { getEmployeesFromSupabase, updateEmployeeInSupabase } from "@/lib/services/employees-service";
import { getAdvancesFromSupabase, updateAdvanceInSupabase } from "@/lib/services/advances-service";

export default function PayrollPreviewPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Storage data states
  const [employees, setEmployees] = React.useState<EmployeeRecord[]>([]);
  const [advances, setAdvances] = React.useState<AdvanceRecord[]>([]);
  const [payrollRuns, setPayrollRuns] = React.useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Configuration Form State
  const [processMonth, setProcessMonth] = React.useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [processDept, setProcessDept] = React.useState("all");
  const [processWorkingDays, setProcessWorkingDays] = React.useState(26);

  // Helper to format Month into friendly string (e.g. August 2026)
  const formatMonthLong = (mStr: string) => {
    try {
      const [y, m] = mStr.split("-");
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch {
      return mStr;
    }
  };

  // Load Data on Mount
  React.useEffect(() => {
    // 1. LocalStorage
    try {
      const storedEmps = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (storedEmps) setEmployees(JSON.parse(storedEmps));

      const storedAdvs = localStorage.getItem(ADVANCE_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (storedAdvs) setAdvances(deduplicateAndFixAdvances(JSON.parse(storedAdvs)));

      const storedRuns = localStorage.getItem(PAYROLL_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (storedRuns) setPayrollRuns(JSON.parse(storedRuns));
    } catch (e) {
      console.error("Local storage error:", e);
    }

    // 2. Supabase DB Fetch
    Promise.all([
      getEmployeesFromSupabase().catch(() => []),
      getAdvancesFromSupabase().catch(() => []),
      getPayrollRunsFromSupabase().catch(() => []),
    ])
      .then(([dbEmps, dbAdvs, dbRuns]) => {
        if (dbEmps && dbEmps.length > 0) setEmployees(dbEmps);
        if (dbAdvs && dbAdvs.length > 0) setAdvances(deduplicateAndFixAdvances(dbAdvs));
        if (dbRuns && dbRuns.length > 0) setPayrollRuns(dbRuns);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Compute Live Real-time Payroll Preview
  const previewRun: PayrollRun = React.useMemo(() => {
    return processMonthlyPayrollRun({
      payrollMonth: processMonth,
      departmentFilter: processDept,
      employees,
      advancesList: advances,
      workingDays: processWorkingDays,
      existingRuns: payrollRuns,
    });
  }, [processMonth, processDept, processWorkingDays, employees, advances, payrollRuns]);

  // Check Duplicate Payroll Run
  const existingDuplicateRun = React.useMemo(() => {
    return payrollRuns.find(
      (r) =>
        r.payrollMonth === processMonth &&
        (processDept === "all" || r.departmentFilter === processDept || r.departmentFilter === "all")
    );
  }, [payrollRuns, processMonth, processDept]);

  // Execute Generation
  const handleConfirmGeneration = async () => {
    if (!previewRun || previewRun.records.length === 0) {
      toast({
        type: "warning",
        message: "No Eligible Employees",
        description: "No active employees found matching the selected criteria.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // 1. Update Payroll Runs List
      const existingRunIndex = payrollRuns.findIndex(
        (r) => r.payrollMonth === processMonth && r.departmentFilter === processDept
      );

      let updatedRuns: PayrollRun[];
      if (existingRunIndex >= 0) {
        updatedRuns = [...payrollRuns];
        updatedRuns[existingRunIndex] = previewRun;
      } else {
        updatedRuns = [previewRun, ...payrollRuns];
      }

      // 2. Update Advances Remaining Balances & Status
      const updatedAdvances = advances.map((adv) => {
        const deductionItem = previewRun.records.find(
          (r) => r.employeeId === adv.employeeId || r.employeeNumber === adv.employeeNumber || r.employeeNumber === adv.employeeId
        );
        if (
          deductionItem &&
          deductionItem.advanceDeduction > 0 &&
          (adv.status === "Approved" || adv.status === "Disbursed" || adv.status === "Recovering")
        ) {
          const totalAmt = adv.approvedAmount || adv.requestedAmount || 0;
          const newRemaining = Math.max(0, (adv.remainingBalance ?? totalAmt) - deductionItem.advanceDeduction);
          const updatedAdv: AdvanceRecord = {
            ...adv,
            remainingBalance: newRemaining,
            status: newRemaining <= 0 ? "Completed" : "Recovering",
            updatedAt: new Date().toISOString(),
          };
          updateAdvanceInSupabase(updatedAdv).catch(console.error);
          return updatedAdv;
        }
        return adv;
      });

      // 3. Update Employees with Payroll History Record
      const updatedEmployees = employees.map((emp) => {
        const record = previewRun.records.find((r) => r.employeeId === emp.id || r.employeeNumber === emp.employeeNumber);
        if (record) {
          const existingHistory = (emp.payrollRecords || []).filter((p) => p.monthYear !== processMonth);
          const updatedEmp: EmployeeRecord = {
            ...emp,
            payrollRecords: [
              ...existingHistory,
              {
                id: `ph_${Date.now()}_${emp.id}`,
                monthYear: processMonth,
                salaryType: record.salaryType,
                baseAmount: record.basicSalary || record.dailyWage || 0,
                allowances: record.allowances,
                overtimeAmount: record.overtimeAmount,
                pieceEarnings: record.pieceRateAmount,
                advanceDeduction: record.advanceDeduction,
                otherDeductions: record.taxDeduction + record.otherDeductions + record.absentDeduction,
                netPayable: record.netPayable,
                status: "Pending",
                paymentMethod: record.paymentMethod || "Bank Transfer",
              },
            ],
          };
          updateEmployeeInSupabase(updatedEmp).catch(console.error);
          return updatedEmp;
        }
        return emp;
      });

      // 4. Persist LocalStorage
      try {
        localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(updatedRuns));
        localStorage.setItem(ADVANCE_STORAGE_KEY, JSON.stringify(updatedAdvances));
        localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(updatedEmployees));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error("Local storage error:", e);
      }

      // 5. Persist Supabase Payroll Run
      await createPayrollRunInSupabase(previewRun).catch(console.error);

      toast({
        type: "success",
        message: existingDuplicateRun ? "Payroll Recalculated Successfully" : "Payroll Generated Successfully",
        description: `${previewRun.payrollNumber} (${formatMonthLong(processMonth)}) saved for ${previewRun.employeesCount} employees (${formatPKR(previewRun.totalNetPayable)}).`,
      });

      router.push("/salaries");
    } catch (err: any) {
      toast({
        type: "error",
        message: "Payroll Generation Failed",
        description: err.message || "An unexpected error occurred while generating payroll.",
      });
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <TopNav title="Generating Payroll Preview — FactoryOS ERP" />
        <div className="flex flex-col items-center justify-center min-h-[55vh] space-y-3">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading workforce credentials and loan schedules...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav title="Process Monthly Factory Payroll — Payroll Preview" />

      <div className="space-y-6 min-w-0 w-full p-4 lg:p-6 pb-28 animate-in fade-in-0 duration-200">
        {/* ========================================================= */}
        {/* 1. TOP HEADER ACTION BAR                                  */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/salaries")}
              className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Cancel and Back to Salaries"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Process Monthly Factory Payroll
                </h1>
                <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
                  {previewRun.payrollNumber}
                </span>
                <Badge variant={existingDuplicateRun ? "warning" : "default"} dot>
                  {existingDuplicateRun ? "Recalculation Preview" : "Preview Stage"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Full-page ERP payroll generator • Live wage breakdown, piece-rate earnings, OT and automated loan recoveries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button variant="ghost" onClick={() => router.push("/salaries")}>
              Back to Salaries
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmGeneration}
              disabled={isGenerating || previewRun.records.length === 0}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              {isGenerating
                ? "Processing..."
                : existingDuplicateRun
                ? "Recalculate Payroll"
                : `Generate Payroll (${previewRun.records.length} Slips)`}
            </Button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. PARAMETERS & CONFIGURATION CONTROLS                    */}
        {/* ========================================================= */}
        <Card className="p-4 border-slate-200/80 shadow-xs bg-white">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 flex-1">
              {/* Month Selector */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 min-w-[200px]">
                <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Payroll Month</span>
                  <input
                    type="month"
                    value={processMonth}
                    onChange={(e) => setProcessMonth(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer mt-0.5"
                  />
                </div>
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 min-w-[220px]">
                <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="flex flex-col w-full">
                  <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Target Department</span>
                  <select
                    value={processDept}
                    onChange={(e) => setProcessDept(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer mt-0.5"
                  >
                    <option value="all">All Departments (Entire Factory)</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d} Department
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Working Days */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 min-w-[170px]">
                <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="flex flex-col w-full">
                  <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Standard Working Days</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={processWorkingDays}
                    onChange={(e) => setProcessWorkingDays(Number(e.target.value) || 26)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer mt-0.5"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 self-end md:self-center">
              <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" style={{ animationDuration: "6s" }} />
              Live calculations synced with Attendance and Advances
            </div>
          </div>
        </Card>

        {/* Duplicate Payroll Warning Banner */}
        {existingDuplicateRun && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3 shadow-xs">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-sm">
                A payroll draft already exists for {formatMonthLong(processMonth)}. Generating again will replace the existing draft calculations. Continue?
              </strong>
              <p className="mt-1 text-amber-800">
                Existing Run ID: <span className="font-mono font-bold text-amber-950">{existingDuplicateRun.payrollNumber}</span> • Last processed on {existingDuplicateRun.processedAt ? new Date(existingDuplicateRun.processedAt).toLocaleDateString() : "earlier run"}. Click <strong>&quot;Recalculate Payroll&quot;</strong> to apply updated values.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. 5 CLEAN SAAS SUMMARY KPI CARDS                         */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Employees</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{previewRun.employeesCount} Workers</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Eligible on active roster</p>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Gross Payroll</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5 truncate">{formatPKR(previewRun.totalGross)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Gross earned wages</p>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Advance Recovery</span>
            <p className="text-lg font-bold text-purple-700 mt-0.5 truncate">{formatPKR(previewRun.totalAdvanceDeductions)}</p>
            <p className="text-[11px] text-purple-600 mt-0.5">Auto-recovered loan principal</p>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Deductions</span>
            <p className="text-lg font-bold text-rose-700 mt-0.5 truncate">{formatPKR(previewRun.totalDeductions)}</p>
            <p className="text-[11px] text-rose-600 mt-0.5">Advances & other deductions</p>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-blue-50/40 border-blue-200">
            <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Total Net Payable</span>
            <p className="text-xl font-extrabold text-blue-900 mt-0.5 truncate">{formatPKR(previewRun.totalNetPayable)}</p>
            <p className="text-[11px] text-blue-700 mt-0.5">Net factory payout required</p>
          </Card>
        </div>

        {/* ========================================================= */}
        {/* 4. SINGLE EMPLOYEE PAYROLL TABLE (NO HORIZONTAL SCROLL)   */}
        {/* ========================================================= */}
        <Card className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Workforce Remuneration & Wage Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Individual calculations for {previewRun.records.length} employees. Attendance is synchronized from the Attendance records module.
              </p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
              {formatMonthLong(processMonth)}
            </span>
          </div>

          {previewRun.records.length > 0 ? (
            <div className="w-full">
              <table className="w-full text-left text-xs border-collapse table-auto">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-2">Department</th>
                    <th className="py-3 px-2">Designation</th>
                    <th className="py-3 px-2">Wage Model</th>
                    <th className="py-3 px-2 text-right">Salary / Daily Rate</th>
                    <th className="py-3 px-2 text-center" title="Present days / Total working days (Read-only, synced with Attendance logs)">
                      <div className="flex items-center justify-center gap-1">
                        <span>Attendance</span>
                        <HelpCircle className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-2 text-right">Piece Earnings</th>
                    <th className="py-3 px-2 text-right">Overtime</th>
                    <th className="py-3 px-2 text-right text-purple-700">Advance Ded.</th>
                    <th className="py-3 px-2 text-right text-slate-500">Other Ded.</th>
                    <th className="py-3 px-2.5 text-right font-bold text-slate-900">Gross Wage</th>
                    <th className="py-3 px-3 text-right font-extrabold text-blue-700 bg-blue-50/50">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {previewRun.records.map((rec) => (
                    <tr key={rec.employeeId} className="hover:bg-slate-50/80 transition-colors">
                      {/* Employee */}
                      <td className="py-3 px-3">
                        <div className="font-sans font-semibold text-slate-900 leading-tight">
                          {rec.employeeName}
                        </div>
                        <div className="font-mono text-[10px] text-blue-600 font-semibold">
                          {rec.employeeNumber}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-2 font-sans text-slate-600 text-[11px]">
                        {rec.department}
                      </td>

                      {/* Designation */}
                      <td className="py-3 px-2 font-sans text-slate-500 text-[11px] truncate max-w-[120px]">
                        {rec.designation}
                      </td>

                      {/* Wage Model */}
                      <td className="py-3 px-2 font-sans text-[11px]">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                            rec.salaryType === "monthly"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : rec.salaryType === "daily"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {rec.salaryType === "monthly"
                            ? "Monthly Fixed"
                            : rec.salaryType === "daily"
                            ? "Daily Wage"
                            : "Piece Rate"}
                        </span>
                      </td>

                      {/* Salary / Daily Rate (Dynamic Display) */}
                      <td className="py-3 px-2 text-right">
                        {rec.salaryType === "monthly" ? (
                          <div>
                            <span className="text-[10px] font-sans text-slate-400 block leading-none">Monthly Salary</span>
                            <span className="text-xs font-semibold text-slate-800">{formatPKR(rec.basicSalary)}</span>
                          </div>
                        ) : rec.salaryType === "daily" ? (
                          <div>
                            <span className="text-[10px] font-sans text-slate-400 block leading-none">Daily Rate</span>
                            <span className="text-xs font-semibold text-slate-800">{formatPKR(rec.dailyWage)}<span className="text-[10px] font-sans text-slate-400">/day</span></span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] font-sans text-slate-400 block leading-none">Piece Rate</span>
                            <span className="text-xs font-semibold text-slate-800">Operation Based</span>
                          </div>
                        )}
                      </td>

                      {/* Attendance (Display-only: "26 / 26 Days") */}
                      <td className="py-3 px-2 text-center font-sans">
                        <span className="inline-block px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700">
                          {rec.presentDays} / {rec.workingDays} Days
                        </span>
                      </td>

                      {/* Piece Rate Earnings */}
                      <td className="py-3 px-2 text-right text-emerald-700 font-semibold">
                        {rec.pieceRateAmount > 0 ? formatPKR(rec.pieceRateAmount) : "PKR 0"}
                      </td>

                      {/* Overtime */}
                      <td className="py-3 px-2 text-right text-slate-700">
                        {rec.overtimeAmount > 0 ? formatPKR(rec.overtimeAmount) : "PKR 0"}
                      </td>

                      {/* Advance Deduction */}
                      <td className="py-3 px-2 text-right font-semibold text-purple-700">
                        {rec.advanceDeduction > 0 ? `-${formatPKR(rec.advanceDeduction)}` : "PKR 0"}
                      </td>

                      {/* Other Deductions */}
                      <td className="py-3 px-2 text-right text-slate-500">
                        {rec.otherDeductions > 0 ? `-${formatPKR(rec.otherDeductions)}` : "PKR 0"}
                      </td>

                      {/* Gross Wage */}
                      <td className="py-3 px-2.5 text-right font-bold text-slate-900">
                        {formatPKR(rec.grossSalary)}
                      </td>

                      {/* Net Payable */}
                      <td className="py-3 px-3 text-right font-extrabold text-blue-700 bg-blue-50/50">
                        {formatPKR(rec.netPayable)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Users className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700 text-sm">No Active Employees Found</p>
              <p className="text-slate-400">No workforce records matched the selected department and status criteria.</p>
            </div>
          )}
        </Card>

        {/* ========================================================= */}
        {/* 5. STICKY BOTTOM ACTION BAR                               */}
        {/* ========================================================= */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-slate-200/80 p-3.5 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600">
                Payroll slips ready for generation • Total:{" "}
                <strong className="text-blue-900 font-mono text-sm font-extrabold">{formatPKR(previewRun.totalNetPayable)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.push("/salaries")}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmGeneration}
                disabled={isGenerating || previewRun.records.length === 0}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                {isGenerating
                  ? "Processing..."
                  : existingDuplicateRun
                  ? "Recalculate Payroll"
                  : `Generate Payroll (${previewRun.records.length} Slips)`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

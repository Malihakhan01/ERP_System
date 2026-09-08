// lib/payroll-engine.ts
// Core Payroll Calculation Engine for FactoryOS Garment ERP
// Integrates Employees, Advances, Attendance, Piece Rate, and Overtime into comprehensive Monthly Wage Slips.

import type { EmployeeRecord, SalaryType, Department } from "./employees-engine";
import type { AdvanceRecord } from "./advances-engine";
import { getEmployeeAdvanceDeduction, getEmployeeActiveAdvance } from "./advances-engine";

export const PAYROLL_STORAGE_KEY = "factoryos_payroll_runs";
export const PAYROLL_RECORDS_STORAGE_KEY = "factoryos_payroll_records";

export type PayrollRunStatus = "Draft" | "Processing" | "Completed" | "Paid";
export type PayrollPaymentStatus = "Pending" | "Paid";

export interface PieceRateEarningDetail {
  operationName: string;
  pieces: number;
  ratePerPiece: number;
  totalAmount: number;
}

export interface PayrollRecordItem {
  id: string;
  payrollRunId?: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  department: Department | string;
  designation: string;
  payrollMonth: string; // e.g. "2026-08"
  salaryType: SalaryType;
  basicSalary: number;
  dailyWage: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  absentDeduction: number;
  overtimeHours: number;
  overtimeRatePerHour: number;
  overtimeAmount: number;
  pieceRateAmount: number;
  pieceRateDetails?: PieceRateEarningDetail[];
  allowances: number;
  allowancesBreakdown?: {
    houseRent?: number;
    conveyance?: number;
    medical?: number;
    attendanceBonus?: number;
    specialAllowance?: number;
  };
  
  // Gross Total
  grossSalary: number;
  
  // Deductions
  advanceDeduction: number; // Automated recovery from active advance loans
  remainingAdvanceBalance: number; // Balance after this deduction
  taxDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  
  // Net Payable
  netPayable: number;
  
  // Payment Status
  paymentStatus: PayrollPaymentStatus;
  paymentDate?: string;
  paymentMethod?: string;
  bankName?: string;
  accountNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  id: string;
  payrollNumber: string; // PAY-2026-001
  payrollMonth: string; // YYYY-MM e.g. "2026-08"
  departmentFilter: string; // "all" or specific department
  status: PayrollRunStatus;
  
  totalGross: number;
  totalDeductions: number;
  totalNetPayable: number;
  totalAdvanceDeductions: number;
  employeesCount: number;
  
  paidCount: number;
  pendingCount: number;
  
  processedBy: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  records: PayrollRecordItem[];
}

export interface PayrollPayment {
  id: string;
  payrollRecordId: string;
  employeeId: string;
  employeeName: string;
  payrollMonth: string;
  paymentMethod: string;
  bankReference?: string;
  paidAmount: number;
  paidBy: string;
  paidAt: string;
}

export interface PayrollDashboardMetrics {
  totalGrossPayroll: number;
  totalNetPayable: number;
  pendingDisbursementAmount: number;
  disbursedSalariesAmount: number;
  advanceLoansDeducted: number;
  totalEmployeesProcessed: number;
  paidEmployeesCount: number;
  pendingEmployeesCount: number;
}

/**
 * Format currency in PKR
 */
export function formatPKR(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "PKR 0";
  return `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
}

/**
 * Generate sequential Payroll Number: PAY-YYYY-NNN
 */
export function generateNextPayrollNumber(existingRuns: PayrollRun[], year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const yearPrefix = `PAY-${currentYear}-`;

  let maxNum = 0;
  for (const run of existingRuns) {
    if (run.payrollNumber && run.payrollNumber.startsWith(yearPrefix)) {
      const numPart = parseInt(run.payrollNumber.replace(yearPrefix, ""), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${yearPrefix}${String(nextNum).padStart(3, "0")}`;
}

/**
 * Calculate Overtime Rate per hour based on employee wage model
 * Standard factory standard: (Monthly Wage / 26 days / 8 hours) * 1.5x (or 2x)
 */
export function calculateOvertimeRate(
  salaryType: SalaryType,
  monthlySalary = 0,
  dailyRate = 0,
  multiplier = 1.5
): number {
  if (salaryType === "daily" && dailyRate > 0) {
    const hourlyBase = dailyRate / 8;
    return Math.round(hourlyBase * multiplier);
  }
  if (monthlySalary > 0) {
    const hourlyBase = monthlySalary / (26 * 8);
    return Math.round(hourlyBase * multiplier);
  }
  return 150; // Fallback floor rate PKR 150/hr
}

/**
 * Calculate Progressive Tax Deduction for Pakistan Wage Slabs (Simplified Annual to Monthly)
 * Slabs (Tax Year 2025-2026):
 * - Up to PKR 50,000/mo (600k/yr): 0%
 * - PKR 50,001 - 100,000/mo (600k - 1.2M/yr): 2.5% of amount exceeding 50,000
 * - PKR 100,001 - 183,333/mo (1.2M - 2.2M/yr): PKR 1,250 + 12.5% of amount exceeding 100,000
 * - PKR 183,334 - 266,667/mo (2.2M - 3.2M/yr): PKR 11,667 + 22.5% of amount exceeding 183,333
 * - Above PKR 266,667/mo: PKR 30,417 + 35% of amount exceeding 266,667
 */
export function calculatePakistanIncomeTax(monthlyGrossSalary: number): number {
  if (monthlyGrossSalary <= 50000) return 0;
  if (monthlyGrossSalary <= 100000) {
    return Math.round((monthlyGrossSalary - 50000) * 0.025);
  }
  if (monthlyGrossSalary <= 183333) {
    return Math.round(1250 + (monthlyGrossSalary - 100000) * 0.125);
  }
  if (monthlyGrossSalary <= 266667) {
    return Math.round(11667 + (monthlyGrossSalary - 183333) * 0.225);
  }
  return Math.round(30417 + (monthlyGrossSalary - 266667) * 0.35);
}

export interface EmployeePayrollInput {
  employee: EmployeeRecord;
  payrollMonth: string; // YYYY-MM
  advancesList?: AdvanceRecord[];
  workingDays?: number; // default 26
  presentDays?: number; // if omitted, uses attendance or defaults to workingDays
  absentDays?: number;
  overtimeHours?: number;
  pieceRateEarnings?: PieceRateEarningDetail[];
  allowances?: number;
  otherDeductions?: number;
  customTax?: number;
  notes?: string;
}

/**
 * Calculate Individual Employee Monthly Wage & Deductions
 */
export function calculateEmployeePayrollRecord(input: EmployeePayrollInput): PayrollRecordItem {
  const {
    employee,
    payrollMonth,
    advancesList = [],
    workingDays = 26,
    overtimeHours = 0,
    pieceRateEarnings = [],
    allowances = 0,
    otherDeductions = 0,
    notes = "",
  } = input;

  const salaryType = employee.salaryInfo.salaryType || "monthly";
  const basicSalary = employee.salaryInfo.monthlySalary || 0;
  const dailyWage = employee.salaryInfo.dailyRate || 0;

  // 1. Attendance Determination
  let presentDays = input.presentDays;
  let absentDays = input.absentDays;

  if (presentDays === undefined) {
    // If real attendance records exist for this month, sum them up
    if (employee.attendanceRecords && employee.attendanceRecords.length > 0) {
      const monthRecords = employee.attendanceRecords.filter((a) =>
        a.date.startsWith(payrollMonth)
      );
      if (monthRecords.length > 0) {
        presentDays = monthRecords.filter((a) => a.status === "Present" || a.status === "Late").length;
        absentDays = monthRecords.filter((a) => a.status === "Absent").length;
      } else {
        presentDays = workingDays;
        absentDays = 0;
      }
    } else {
      presentDays = workingDays;
      absentDays = 0;
    }
  }
  if (absentDays === undefined) {
    absentDays = Math.max(0, workingDays - presentDays);
  }

  // 2. Base Earned Wage Calculation
  let baseEarned = 0;
  let absentDeduction = 0;

  if (salaryType === "monthly") {
    if (absentDays > 0 && workingDays > 0) {
      const dayRate = basicSalary / workingDays;
      absentDeduction = Math.round(dayRate * absentDays);
      baseEarned = Math.max(0, basicSalary - absentDeduction);
    } else {
      absentDeduction = 0;
      baseEarned = basicSalary;
    }
  } else if (salaryType === "daily") {
    baseEarned = Math.round(dailyWage * presentDays);
    absentDeduction = 0;
  } else if (salaryType === "piece_rate") {
    baseEarned = basicSalary > 0 ? basicSalary : 0;
    absentDeduction = 0;
  }

  // 3. Piece Rate Earnings (Sum of completed operations)
  let totalPieceRateAmount = 0;
  if (pieceRateEarnings && pieceRateEarnings.length > 0) {
    totalPieceRateAmount = pieceRateEarnings.reduce((sum, item) => sum + item.totalAmount, 0);
  } else if (salaryType === "piece_rate" && employee.salaryInfo.pieceRateOperations) {
    totalPieceRateAmount = employee.salaryInfo.pieceRateOperations.reduce(
      (sum, op) => sum + (op.targetPcsPerHour ? op.targetPcsPerHour * 8 * (presentDays || 26) * op.ratePerPiece : 0),
      0
    );
  }

  // 4. Overtime Calculation
  const overtimeRate = calculateOvertimeRate(salaryType, basicSalary, dailyWage);
  const overtimeAmount = Math.round(overtimeHours * overtimeRate);

  // 5. Total Gross Salary (Sum of all earned components)
  const grossSalary = Math.round(baseEarned + totalPieceRateAmount + overtimeAmount + allowances);

  // 6. Advance Loan Recovery (Automated Integration with Advances Engine)
  const advanceResult = getEmployeeAdvanceDeduction(employee.id || employee.employeeNumber, payrollMonth, advancesList);
  const rawAdvanceDeduction = typeof advanceResult === "number" ? advanceResult : (advanceResult?.totalDeduction || 0);
  const advanceDeduction = Math.min(rawAdvanceDeduction, grossSalary);

  const activeLoan = getEmployeeActiveAdvance(employee.id || employee.employeeNumber, advancesList);
  const activeRemaining = activeLoan ? (activeLoan.remainingBalance ?? (activeLoan as any).remainingAmount ?? (activeLoan.approvedAmount || activeLoan.requestedAmount || 0)) : 0;
  const remainingAdvanceBalance = activeLoan
    ? Math.max(0, activeRemaining - advanceDeduction)
    : 0;

  // 7. Income Tax & Other Deductions
  const taxDeduction = input.customTax !== undefined ? input.customTax : 0;

  // 8. Total Deductions (Advance recovery + Tax + Other)
  const totalDeductions = Math.round(advanceDeduction + taxDeduction + otherDeductions);

  // 9. Net Payable (Gross - All Deductions)
  const netPayable = Math.max(0, grossSalary - totalDeductions);

  const now = new Date().toISOString();

  return {
    id: `payrec_${employee.id}_${payrollMonth.replace("-", "")}`,
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    employeeName: employee.personalInfo.fullName,
    department: employee.employmentInfo.department,
    designation: employee.employmentInfo.designation,
    payrollMonth,
    salaryType,
    basicSalary: salaryType === "monthly" ? basicSalary : 0,
    dailyWage: salaryType === "daily" ? dailyWage : 0,
    workingDays,
    presentDays,
    absentDays,
    absentDeduction,
    overtimeHours,
    overtimeRatePerHour: overtimeRate,
    overtimeAmount,
    pieceRateAmount: totalPieceRateAmount,
    pieceRateDetails: pieceRateEarnings,
    allowances,
    grossSalary,
    advanceDeduction,
    remainingAdvanceBalance,
    taxDeduction,
    otherDeductions,
    totalDeductions,
    netPayable,
    paymentStatus: "Pending",
    paymentMethod: employee.salaryInfo.paymentMode || "Bank Transfer",
    bankName: employee.salaryInfo.bankName,
    accountNumber: employee.salaryInfo.accountNumber,
    notes,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Process a complete Monthly Payroll Run across all active employees
 */
export function processMonthlyPayrollRun(params: {
  payrollMonth: string; // YYYY-MM
  departmentFilter?: string; // "all" or specific department
  employees: EmployeeRecord[];
  advancesList: AdvanceRecord[];
  existingRuns?: PayrollRun[];
  workingDays?: number;
  processedBy?: string;
  customInputs?: Record<string, Partial<EmployeePayrollInput>>;
}): PayrollRun {
  const {
    payrollMonth,
    departmentFilter = "all",
    employees,
    advancesList,
    existingRuns = [],
    workingDays = 26,
    processedBy = "HR Manager",
    customInputs = {},
  } = params;

  // Filter active employees
  const targetEmployees = employees.filter((emp) => {
    if (emp.isArchived || emp.employmentInfo.status === "Terminated" || emp.employmentInfo.status === "Resigned") {
      return false;
    }
    if (departmentFilter !== "all" && emp.employmentInfo.department !== departmentFilter) {
      return false;
    }
    return true;
  });

  const payrollNumber = generateNextPayrollNumber(existingRuns);
  const now = new Date().toISOString();
  const runId = `pr_${Date.now()}`;

  const records: PayrollRecordItem[] = targetEmployees.map((emp) => {
    const custom = customInputs[emp.id] || {};
    const calculated = calculateEmployeePayrollRecord({
      employee: emp,
      payrollMonth,
      advancesList,
      workingDays,
      ...custom,
    });
    return {
      ...calculated,
      payrollRunId: runId,
    };
  });

  // Calculate Aggregates
  const totalGross = records.reduce((sum, r) => sum + r.grossSalary, 0);
  const totalDeductions = records.reduce((sum, r) => sum + r.totalDeductions, 0);
  const totalNetPayable = records.reduce((sum, r) => sum + r.netPayable, 0);
  const totalAdvanceDeductions = records.reduce((sum, r) => sum + r.advanceDeduction, 0);
  const paidCount = records.filter((r) => r.paymentStatus === "Paid").length;
  const pendingCount = records.length - paidCount;

  return {
    id: runId,
    payrollNumber,
    payrollMonth,
    departmentFilter,
    status: records.length > 0 ? "Completed" : "Draft",
    totalGross,
    totalDeductions,
    totalNetPayable,
    totalAdvanceDeductions,
    employeesCount: records.length,
    paidCount,
    pendingCount,
    processedBy,
    processedAt: now,
    createdAt: now,
    updatedAt: now,
    records,
  };
}

/**
 * Mark a single payroll record as Paid / Disbursed
 */
export function markPayrollRecordPaid(
  record: PayrollRecordItem,
  paymentMethod = "Bank Transfer",
  bankReference?: string,
  paidBy = "Finance & Accounts"
): { updatedRecord: PayrollRecordItem; payment: PayrollPayment } {
  const now = new Date().toISOString();
  const updatedRecord: PayrollRecordItem = {
    ...record,
    paymentStatus: "Paid",
    paymentDate: now.split("T")[0],
    paymentMethod,
    updatedAt: now,
  };

  const payment: PayrollPayment = {
    id: `pay_${Date.now()}_${record.id}`,
    payrollRecordId: record.id,
    employeeId: record.employeeId,
    employeeName: record.employeeName,
    payrollMonth: record.payrollMonth,
    paymentMethod,
    bankReference: bankReference || `FT-${Date.now().toString().slice(-6)}`,
    paidAmount: record.netPayable,
    paidBy,
    paidAt: now,
  };

  return { updatedRecord, payment };
}

/**
 * Mark all records in a payroll run as Paid
 */
export function markPayrollRunPaid(run: PayrollRun, paidBy = "Finance & Accounts"): PayrollRun {
  const now = new Date().toISOString();
  const updatedRecords = run.records.map((r) => ({
    ...r,
    paymentStatus: "Paid" as PayrollPaymentStatus,
    paymentDate: now.split("T")[0],
    updatedAt: now,
  }));

  return {
    ...run,
    status: "Paid",
    paidCount: updatedRecords.length,
    pendingCount: 0,
    updatedAt: now,
    records: updatedRecords,
  };
}

/**
 * Compute KPI metrics across all payroll runs and records for dashboard
 */
export function computePayrollDashboardMetrics(
  runs: PayrollRun[],
  currentMonth?: string
): PayrollDashboardMetrics {
  const activeRuns = currentMonth
    ? runs.filter((r) => r.payrollMonth === currentMonth)
    : runs;

  let totalGrossPayroll = 0;
  let totalNetPayable = 0;
  let pendingDisbursementAmount = 0;
  let disbursedSalariesAmount = 0;
  let advanceLoansDeducted = 0;
  let totalEmployeesProcessed = 0;
  let paidEmployeesCount = 0;
  let pendingEmployeesCount = 0;

  for (const run of activeRuns) {
    totalGrossPayroll += run.totalGross || 0;
    totalNetPayable += run.totalNetPayable || 0;
    totalEmployeesProcessed += run.employeesCount || (run.records ? run.records.length : 0);

    if (run.records && run.records.length > 0) {
      for (const rec of run.records) {
        advanceLoansDeducted += rec.advanceDeduction || 0;
        if (rec.paymentStatus === "Paid") {
          disbursedSalariesAmount += rec.netPayable || 0;
          paidEmployeesCount++;
        } else {
          pendingDisbursementAmount += rec.netPayable || 0;
          pendingEmployeesCount++;
        }
      }
    } else if (run.totalAdvanceDeductions) {
      advanceLoansDeducted += run.totalAdvanceDeductions;
    }
  }

  return {
    totalGrossPayroll,
    totalNetPayable,
    pendingDisbursementAmount,
    disbursedSalariesAmount,
    advanceLoansDeducted,
    totalEmployeesProcessed,
    paidEmployeesCount,
    pendingEmployeesCount,
  };
}

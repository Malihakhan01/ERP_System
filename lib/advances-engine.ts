// lib/advances-engine.ts
// Core domain engine, validation, repayment scheduling, approval workflows & payroll hooks for FactoryOS Advances

import type { EmployeeRecord } from "./employees-engine";

export type AdvanceStatus =
  | "Pending"
  | "Approved"
  | "Disbursed"
  | "Recovering"
  | "Completed"
  | "Rejected"
  | "Archived";

export type AdvanceRepaymentStatus = "Pending" | "Paid" | "Skipped";

export interface AdvanceRepaymentItem {
  id: string;
  advanceId: string;
  employeeId: string;
  deductionMonth: string; // e.g. "Sep 2026"
  amount: number;
  balanceAfterDeduction: number;
  status: AdvanceRepaymentStatus;
  paidDate?: string;
  payrollRunId?: string;
  createdAt: string;
}

export interface AdvanceRecord {
  id: string;
  advanceNumber: string; // e.g. ADV-2026-001
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  department: string;
  designation: string;
  currentSalary: number;
  requestedAmount: number;
  approvedAmount: number;
  reason: string;
  repaymentMonths: number;
  monthlyDeduction: number;
  remainingBalance: number;
  status: AdvanceStatus;
  requestDate: string;
  approvedBy?: string;
  approvedDate?: string;
  disbursedDate?: string;
  disbursedBy?: string;
  notes?: string;
  repayments: AdvanceRepaymentItem[];
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ADVANCE_STORAGE_KEY = "factoryos_advances";

/**
 * Check if employee already has an active or pending advance loan
 */
export function getEmployeeActiveAdvance(
  employeeId: string,
  advances: AdvanceRecord[] = []
): AdvanceRecord | null {
  if (!employeeId || !advances || advances.length === 0) return null;
  const activeStatuses: AdvanceStatus[] = ["Pending", "Approved", "Disbursed", "Recovering"];
  return (
    advances.find((a) => {
      const isMatch =
        a.employeeId === employeeId ||
        a.employeeNumber === employeeId ||
        (a.employeeId && a.employeeId.toLowerCase() === employeeId.toLowerCase());
      const remaining = a.remainingBalance ?? (a as any).remainingAmount ?? (a.approvedAmount || a.requestedAmount || 0);
      return isMatch && !a.isArchived && activeStatuses.includes(a.status) && (a.status === "Pending" || remaining > 0);
    }) || null
  );
}

/**
 * Robust Sequential Advance ID generator: ADV-YYYY-NNN
 */
export function generateNextAdvanceNumber(existing: AdvanceRecord[], year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const pattern = new RegExp(`^ADV-${currentYear}-(\\d+)$`, "i");

  let maxNum = 0;
  for (const adv of existing) {
    if (adv.advanceNumber) {
      const match = adv.advanceNumber.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  return `ADV-${currentYear}-${String(nextNum).padStart(3, "0")}`;
}

/**
 * Deduplicate and sanitize existing advances array (fixes historical collisions)
 */
export function deduplicateAndFixAdvances(advances: AdvanceRecord[]): AdvanceRecord[] {
  const seenIds = new Set<string>();
  const seenNumbers = new Set<string>();
  const cleaned: AdvanceRecord[] = [];

  for (const adv of advances) {
    if (!adv || !adv.id || seenIds.has(adv.id)) continue;
    seenIds.add(adv.id);

    let advanceNumber = adv.advanceNumber;
    if (!advanceNumber || seenNumbers.has(advanceNumber)) {
      advanceNumber = generateNextAdvanceNumber(cleaned);
    }
    seenNumbers.add(advanceNumber);

    cleaned.push({
      ...adv,
      advanceNumber,
    });
  }

  return cleaned;
}

/**
 * Auto-calculate monthly deduction
 */
export function calculateMonthlyDeduction(amount: number, months: number): number {
  if (!amount || amount <= 0 || !months || months <= 0) return 0;
  return Math.ceil(amount / Math.max(1, months));
}

/**
 * Generate future repayment schedule month-by-month
 */
export function generateRepaymentSchedule(
  advanceId: string,
  employeeId: string,
  approvedAmount: number,
  months: number,
  startDate: Date = new Date()
): AdvanceRepaymentItem[] {
  const schedule: AdvanceRepaymentItem[] = [];
  const duration = Math.max(1, months);
  const monthlyAmount = Math.floor(approvedAmount / duration);
  const remainder = approvedAmount - monthlyAmount * duration;

  let currentBalance = approvedAmount;
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  for (let i = 0; i < duration; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + 1 + i, 1);
    const monthStr = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    const instAmount = i === 0 ? monthlyAmount + remainder : monthlyAmount;
    currentBalance = Math.max(0, currentBalance - instAmount);

    schedule.push({
      id: `rep_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
      advanceId,
      employeeId,
      deductionMonth: monthStr,
      amount: instAmount,
      balanceAfterDeduction: currentBalance,
      status: "Pending",
      createdAt: new Date().toISOString(),
    });
  }

  return schedule;
}

/**
 * Request a new advance
 */
export function createAdvanceRequest(
  employee: EmployeeRecord,
  requestedAmount: number,
  reason: string,
  repaymentMonths = 3,
  existingAdvances: AdvanceRecord[] = []
): AdvanceRecord {
  const now = new Date().toISOString();
  const salary =
    employee.salaryInfo.monthlySalary ||
    (employee.salaryInfo.dailyRate ? employee.salaryInfo.dailyRate * 26 : 35000);
  const monthlyDeduction = calculateMonthlyDeduction(requestedAmount, repaymentMonths);

  return {
    id: `adv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    advanceNumber: generateNextAdvanceNumber(existingAdvances),
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    employeeName: employee.personalInfo.fullName,
    department: employee.employmentInfo.department,
    designation: employee.employmentInfo.designation,
    currentSalary: salary,
    requestedAmount,
    approvedAmount: requestedAmount,
    reason: reason.trim(),
    repaymentMonths: Math.max(1, repaymentMonths),
    monthlyDeduction,
    remainingBalance: requestedAmount,
    status: "Pending",
    requestDate: new Date().toISOString().split("T")[0],
    repayments: [],
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Approve advance request
 */
export function approveAdvance(
  advance: AdvanceRecord,
  approvedAmount: number,
  approvedBy = "Factory HR Director",
  notes?: string
): AdvanceRecord {
  const now = new Date().toISOString();
  const finalApproved = Math.max(1, approvedAmount || advance.requestedAmount);
  const monthlyDeduction = calculateMonthlyDeduction(finalApproved, advance.repaymentMonths);

  return {
    ...advance,
    approvedAmount: finalApproved,
    monthlyDeduction,
    remainingBalance: finalApproved,
    approvedBy,
    approvedDate: now,
    notes: notes || advance.notes,
    status: "Approved",
    updatedAt: now,
  };
}

/**
 * Disburse advance loan
 */
export function disburseAdvance(
  advance: AdvanceRecord,
  disbursedBy = "Accounts Dept",
  startDate: Date = new Date()
): AdvanceRecord {
  const now = new Date().toISOString();
  const approvedAmt = advance.approvedAmount || advance.requestedAmount;
  const schedule = generateRepaymentSchedule(
    advance.id,
    advance.employeeId,
    approvedAmt,
    advance.repaymentMonths,
    startDate
  );

  return {
    ...advance,
    status: "Recovering",
    remainingBalance: approvedAmt,
    disbursedBy,
    disbursedDate: now,
    repayments: schedule,
    updatedAt: now,
  };
}

/**
 * Reject advance request
 */
export function rejectAdvance(
  advance: AdvanceRecord,
  reason: string,
  rejectedBy = "HR Admin"
): AdvanceRecord {
  const now = new Date().toISOString();
  return {
    ...advance,
    status: "Rejected",
    notes: `Rejected by ${rejectedBy}: ${reason}`,
    updatedAt: now,
  };
}

/**
 * Record monthly installment repayment
 */
export function recordRepaymentInstallment(
  advance: AdvanceRecord,
  deductionMonth: string,
  amountPaid: number,
  payrollRunId?: string
): AdvanceRecord {
  const now = new Date().toISOString();
  let remaining = advance.remainingBalance;

  const updatedRepayments = (advance.repayments || []).map((rep) => {
    if (rep.deductionMonth.toLowerCase() === deductionMonth.toLowerCase() && rep.status === "Pending") {
      const paidAmt = amountPaid || rep.amount;
      remaining = Math.max(0, remaining - paidAmt);
      return {
        ...rep,
        amount: paidAmt,
        status: "Paid" as const,
        paidDate: new Date().toISOString().split("T")[0],
        payrollRunId,
        balanceAfterDeduction: remaining,
      };
    }
    return rep;
  });

  const isFullyPaid = remaining <= 0;

  return {
    ...advance,
    remainingBalance: remaining,
    status: isFullyPaid ? "Completed" : "Recovering",
    repayments: updatedRepayments,
    updatedAt: now,
  };
}

/**
 * PAYROLL INTEGRATION HOOK
 * Automatically returns the exact deduction amount for an employee for a given month
 */
export function getEmployeeAdvanceDeduction(
  employeeId: string,
  monthYear: string,
  advances: AdvanceRecord[] = []
): { totalDeduction: number; activeAdvanceIds: string[]; deductionBreakdown: { advanceNumber: string; amount: number }[] } {
  let totalDeduction = 0;
  const activeAdvanceIds: string[] = [];
  const deductionBreakdown: { advanceNumber: string; amount: number }[] = [];

  if (!employeeId || !advances || advances.length === 0) {
    return { totalDeduction: 0, activeAdvanceIds: [], deductionBreakdown: [] };
  }

  for (const adv of advances) {
    const isEmpMatch =
      adv.employeeId === employeeId ||
      adv.employeeNumber === employeeId ||
      (adv.employeeId && adv.employeeId.toLowerCase() === employeeId.toLowerCase());

    const remaining = adv.remainingBalance ?? (adv as any).remainingAmount ?? (adv.approvedAmount || adv.requestedAmount || 0);
    const isValidStatus =
      adv.status === "Approved" ||
      adv.status === "Disbursed" ||
      adv.status === "Recovering";

    if (isEmpMatch && !adv.isArchived && remaining > 0 && isValidStatus) {
      // Find monthly installment
      const monthlyDeduction =
        adv.monthlyDeduction ??
        (adv as any).monthlyInstallment ??
        (adv as any).installmentAmount ??
        (adv.approvedAmount ? Math.round(adv.approvedAmount / (adv.repaymentMonths || 1)) : remaining);

      // Check if scheduled repayment exists for this month
      const rep = adv.repayments?.find(
        (r) => r.deductionMonth && (
          r.deductionMonth.toLowerCase() === monthYear.toLowerCase() ||
          r.deductionMonth.startsWith(monthYear)
        ) && r.status === "Pending"
      );

      const amountToDeduct = rep
        ? Math.min(rep.amount, remaining)
        : Math.min(monthlyDeduction || remaining, remaining);

      if (amountToDeduct > 0) {
        totalDeduction += amountToDeduct;
        activeAdvanceIds.push(adv.id);
        deductionBreakdown.push({ advanceNumber: adv.advanceNumber || "ADV", amount: amountToDeduct });
      }
    }
  }

  return {
    totalDeduction,
    activeAdvanceIds,
    deductionBreakdown,
  };
}

/**
 * Employee Profile Loan Summary (Used in Employees module profile Advances tab)
 */
export function getEmployeeLoanSummary(
  employeeId: string,
  advances: AdvanceRecord[]
): {
  totalTaken: number;
  recovered: number;
  remaining: number;
  activeLoansCount: number;
  employeeAdvances: AdvanceRecord[];
} {
  const employeeAdvances = advances.filter(
    (a) => a.employeeId === employeeId && !a.isArchived
  );

  let totalTaken = 0;
  let remaining = 0;
  let activeLoansCount = 0;

  for (const adv of employeeAdvances) {
    if (adv.status !== "Rejected") {
      const amt = adv.approvedAmount || adv.requestedAmount;
      totalTaken += amt;
      remaining += adv.remainingBalance;
      if (adv.status === "Recovering" || adv.status === "Disbursed" || adv.status === "Approved") {
        activeLoansCount++;
      }
    }
  }

  const recovered = Math.max(0, totalTaken - remaining);

  return {
    totalTaken,
    recovered,
    remaining,
    activeLoansCount,
    employeeAdvances,
  };
}

/**
 * Compute Dynamic Advance Dashboard KPIs
 */
export interface AdvanceKpiMetrics {
  totalAdvances: number;
  activeLoansCount: number;
  pendingApprovalCount: number;
  totalPrincipalExposure: number;
  recoveredThisMonth: number;
  completedLoansCount: number;
}

export function computeAdvanceMetrics(advances: AdvanceRecord[]): AdvanceKpiMetrics {
  const nonArchived = advances.filter((a) => !a.isArchived);

  let activeLoans = 0;
  let pending = 0;
  let totalExposure = 0;
  let recoveredThisMonth = 0;
  let completed = 0;

  const currentMonthStr = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }); // e.g. "Aug 2026"

  for (const adv of nonArchived) {
    const st = String(adv.status || "Pending").toLowerCase().trim();
    if (st === "pending") {
      pending++;
    } else if (st === "recovering" || st === "disbursed" || st === "active" || st === "approved") {
      activeLoans++;
      totalExposure += Number(adv.remainingBalance || adv.approvedAmount || adv.requestedAmount || 0);
    } else if (st === "completed" || st === "fully_deducted") {
      completed++;
    }

    // Calculate recoveries this month
    if (adv.repayments) {
      for (const rep of adv.repayments) {
        if (rep.status === "Paid" && rep.deductionMonth && rep.deductionMonth.toLowerCase() === currentMonthStr.toLowerCase()) {
          recoveredThisMonth += Number(rep.amount || 0);
        }
      }
    }
  }

  return {
    totalAdvances: nonArchived.length,
    activeLoansCount: activeLoans,
    pendingApprovalCount: pending,
    totalPrincipalExposure: totalExposure,
    recoveredThisMonth,
    completedLoansCount: completed,
  };
}

/**
 * Validate Advance Request Form
 */
export function validateAdvanceRequest(
  data: {
    employeeId: string;
    requestedAmount: number;
    reason: string;
    repaymentMonths: number;
  },
  employee?: EmployeeRecord | null,
  existingAdvances: AdvanceRecord[] = []
): { isValid: boolean; errors: Record<string, string>; warnings: string[] } {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (!data.employeeId || !data.employeeId.trim()) {
    errors.employeeId = "Please select an employee account.";
  } else {
    // Check if employee already has an active advance loan pending recovery
    const activeLoan = getEmployeeActiveAdvance(data.employeeId, existingAdvances);
    if (activeLoan) {
      errors.employeeId = `Existing advance pending recovery (${activeLoan.advanceNumber} — Status: ${activeLoan.status}, Remaining: PKR ${activeLoan.remainingBalance.toLocaleString()}). Only one active advance allowed per employee.`;
    }
  }

  if (!data.requestedAmount || data.requestedAmount <= 0) {
    errors.requestedAmount = "Requested amount must be greater than PKR 0.";
  }

  if (!data.reason || data.reason.trim().length < 3) {
    errors.reason = "Please provide a valid business or emergency reason for the advance.";
  }

  if (!data.repaymentMonths || data.repaymentMonths < 1 || data.repaymentMonths > 12) {
    errors.repaymentMonths = "Repayment duration must be between 1 and 12 months.";
  }

  if (employee) {
    const salary =
      employee.salaryInfo.monthlySalary ||
      (employee.salaryInfo.dailyRate ? employee.salaryInfo.dailyRate * 26 : 35000);

    if (data.requestedAmount > salary * 2) {
      errors.requestedAmount = `Advance cannot exceed 200% of monthly salary (Max PKR ${(salary * 2).toLocaleString()}).`;
    } else if (data.requestedAmount > salary) {
      warnings.push("Note: Advance exceeds 100% of employee monthly salary. Special Director approval required.");
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

// lib/services/payroll-service.ts
// MySQL Database Service Layer for FactoryOS Monthly Payroll & Wage Disbursements
// Provides full PostgreSQL persistence with seamless Local Storage fallback.

import type {
  PayrollRun,
  PayrollRecordItem,
  PayrollPayment,
  PayrollPaymentStatus,
} from "../payroll-engine";
import { PAYROLL_STORAGE_KEY } from "../payroll-engine";

/**
 * Check if real Database credentials exist
 */

/**
 * LocalStorage Helpers
 */
export function getLocalPayrollRuns(): PayrollRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PAYROLL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setLocalPayrollRuns(runs: PayrollRun[]): void {
  if (typeof window === "undefined") return;
  try {
    const seen = new Set<string>();
    const deduped = runs.filter((r) => {
      if (!r || !r.id) return false;
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(deduped));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Failed to save payroll runs locally", e);
  }
}

/**
 * Map PostgreSQL Payroll Record row to PayrollRecordItem
 */
export function mapRowToPayrollRecordItem(row: any): PayrollRecordItem {
  return {
    id: row.id,
    payrollRunId: row.payroll_run_id,
    employeeId: row.employee_id,
    employeeNumber: row.employee_number || "",
    employeeName: row.employee_name || "",
    department: row.department || "",
    designation: row.designation || "",
    payrollMonth: row.payroll_month || "",
    salaryType: row.salary_type || "monthly",
    basicSalary: Number(row.basic_salary || 0),
    dailyWage: Number(row.daily_wage || 0),
    workingDays: Number(row.working_days || 26),
    presentDays: Number(row.present_days || 26),
    absentDays: Number(row.absent_days || 0),
    absentDeduction: Number(row.absent_deduction || 0),
    overtimeHours: Number(row.overtime_hours || 0),
    overtimeRatePerHour: Number(row.overtime_rate_per_hour || 0),
    overtimeAmount: Number(row.overtime_amount || 0),
    pieceRateAmount: Number(row.piece_rate_amount || 0),
    pieceRateDetails: row.piece_rate_details || [],
    allowances: Number(row.allowances || 0),
    grossSalary: Number(row.gross_salary || 0),
    advanceDeduction: Number(row.advance_deduction || 0),
    remainingAdvanceBalance: Number(row.remaining_advance_balance || 0),
    taxDeduction: Number(row.tax_deduction || 0),
    otherDeductions: Number(row.other_deductions || 0),
    totalDeductions: Number(row.total_deductions || 0),
    netPayable: Number(row.net_payable || 0),
    paymentStatus: (row.payment_status as PayrollPaymentStatus) || "Pending",
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method || "Bank Transfer",
    bankName: row.bank_name,
    accountNumber: row.account_number,
    notes: row.notes || "",
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Map PostgreSQL Payroll Run row to PayrollRun
 */
export function mapRowToPayrollRun(row: any, records: any[] = []): PayrollRun {
  const mappedRecords = records.map(mapRowToPayrollRecordItem);
  const paidCount = mappedRecords.filter((r) => r.paymentStatus === "Paid").length;
  const pendingCount = mappedRecords.length - paidCount;

  return {
    id: row.id,
    payrollNumber: row.payroll_number,
    payrollMonth: row.payroll_month,
    departmentFilter: row.department_filter || "all",
    status: row.status || "Completed",
    totalGross: Number(row.total_gross || 0),
    totalDeductions: Number(row.total_deductions || 0),
    totalNetPayable: Number(row.total_net_payable || 0),
    totalAdvanceDeductions: Number(row.total_advance_deductions || 0),
    employeesCount: Number(row.employees_count || mappedRecords.length),
    paidCount,
    pendingCount,
    processedBy: row.processed_by || "HR Manager",
    processedAt: row.processed_at,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    records: mappedRecords,
  };
}

/**
 * Fetch all Payroll Runs from Database
 */
export async function getPayrollRunsFromDB(): Promise<PayrollRun[]> {
  try {
    const res = await fetch("/api/payroll");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      setLocalPayrollRuns(json.data);
      return json.data;
    }
  } catch (err) {
    console.error("Failed to fetch payroll runs from MySQL API:", err);
  }
  return getLocalPayrollRuns();
}

/**
 * Create a new Payroll Run in Database
 */
export async function createPayrollRunInDB(run: PayrollRun): Promise<PayrollRun> {
  const currentLocal = getLocalPayrollRuns();
  const filtered = currentLocal.filter((r) => r.id !== run.id && r.payrollNumber !== run.payrollNumber);
  const updatedLocal = [run, ...filtered];
  setLocalPayrollRuns(updatedLocal);

  try {
    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(run),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      run.id = String(json.data.id);
    }
  } catch (err) {
    console.error("MySQL API payroll run insert exception:", err);
  }

  return run;
}

/**
 * Mark a single payroll record as Paid in Database
 */
export async function updatePayrollRecordPaidInDB(
  record: PayrollRecordItem,
  payment: PayrollPayment
): Promise<boolean> {
  const currentLocal = getLocalPayrollRuns();
  const updatedLocal = currentLocal.map((run) => {
    const recIndex = run.records.findIndex((r) => r.id === record.id);
    if (recIndex === -1) return run;

    const updatedRecords = [...run.records];
    updatedRecords[recIndex] = { ...record, paymentStatus: "Paid", paymentDate: new Date().toISOString().split("T")[0] };
    const paidCount = updatedRecords.filter((r) => r.paymentStatus === "Paid").length;

    return {
      ...run,
      paidCount,
      pendingCount: updatedRecords.length - paidCount,
      status: paidCount === updatedRecords.length ? ("Paid" as const) : run.status,
      records: updatedRecords,
    };
  });
  setLocalPayrollRuns(updatedLocal);

  try {
    await fetch(`/api/payroll/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Paid", paymentMethod: payment.paymentMethod }),
    });
  } catch (err) {
    console.error("MySQL API update payroll payment exception:", err);
  }

  return true;
}

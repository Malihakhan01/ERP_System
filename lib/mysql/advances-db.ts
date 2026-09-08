/**
 * FactoryOS Garment ERP — Employee Advances MySQL 8 Repository
 * Connects /advances with live MySQL `employee_advances` table.
 */

import { executeQuery, MySQL } from "./db";
import type { AdvanceRecord } from "@/lib/advances-engine";

export async function getAdvancesFromMySQL(): Promise<AdvanceRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT a.*, e.employee_number, e.full_name as employee_name, e.department, e.designation, e.monthly_salary FROM `employee_advances` a LEFT JOIN `employees` e ON a.employee_id = e.id WHERE a.is_archived = 0 ORDER BY a.created_at DESC"
  );

  return rows.map((r) => ({
    id: String(r.id),
    advanceNumber: r.advance_number || `ADV-2026-${String(r.id).padStart(3, "0")}`,
    employeeId: String(r.employee_id),
    employeeNumber: r.employee_number || "EMP-2026",
    employeeName: r.employee_name || "Factory Worker",
    department: r.department || "Cutting Floor",
    designation: r.designation || "Operator",
    currentSalary: Number(r.monthly_salary || 35000),
    requestedAmount: Number(r.requested_amount || 0),
    approvedAmount: Number(r.approved_amount || 0),
    reason: r.reason || "Personal Loan / Medical Support",
    repaymentMonths: Number(r.repayment_months || 1),
    monthlyDeduction: Number(r.monthly_deduction || 0),
    remainingBalance: Number(r.remaining_balance || 0),
    status: (r.status || "Active") as any,
    requestDate: r.request_date ? new Date(r.request_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    approvedBy: "HR Director",
    approvedDate: r.approved_date ? new Date(r.approved_date).toISOString().split("T")[0] : undefined,
    disbursedDate: r.disbursed_date ? new Date(r.disbursed_date).toISOString().split("T")[0] : undefined,
    notes: r.notes || undefined,
    isArchived: Boolean(r.is_archived),
    repayments: [],
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  }));
}

export async function createAdvanceInMySQL(data: Partial<AdvanceRecord>): Promise<string> {
  const countRows = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `employee_advances`");
  const nextNum = (countRows[0]?.cnt || 0) + 1;
  const advNum = data.advanceNumber || `ADV-2026-${String(nextNum).padStart(3, "0")}`;

  const reqAmount = Number(data.requestedAmount) || 10000;
  const appAmount = Number(data.approvedAmount) || reqAmount;
  const months = Number(data.repaymentMonths) || 2;
  const deduction = Number(data.monthlyDeduction) || Math.round(appAmount / months);

  const insertId = await MySQL.insert("employee_advances", {
    uuid: crypto.randomUUID(),
    advance_number: advNum,
    employee_id: data.employeeId ? Number(data.employeeId) : 1,
    requested_amount: reqAmount,
    approved_amount: appAmount,
    monthly_deduction: deduction,
    remaining_balance: appAmount,
    repayment_months: months,
    reason: data.reason || "Personal Loan Assistance",
    status: data.status || "Active",
    request_date: data.requestDate || new Date().toISOString().split("T")[0],
    approved_date: data.approvedDate || new Date().toISOString().split("T")[0],
    disbursed_date: data.disbursedDate || new Date().toISOString().split("T")[0],
    is_archived: 0,
    notes: data.notes || null,
  });

  return String(insertId);
}

export async function updateAdvanceInMySQL(id: string, data: Partial<AdvanceRecord>): Promise<boolean> {
  const payload: Record<string, any> = {};

  if (data.status) payload.status = data.status;
  if (data.remainingBalance !== undefined) payload.remaining_balance = data.remainingBalance;
  if (data.monthlyDeduction !== undefined) payload.monthly_deduction = data.monthlyDeduction;
  if (data.isArchived !== undefined) payload.is_archived = data.isArchived ? 1 : 0;

  return MySQL.update("employee_advances", id, payload);
}

export async function deleteAdvanceInMySQL(id: string): Promise<boolean> {
  return MySQL.delete("employee_advances", id, true);
}

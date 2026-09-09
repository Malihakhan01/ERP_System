/**
 * FactoryOS Garment ERP — Employee Advances MySQL 8 Repository
 * Connects /advances with live MySQL `employee_advances` table.
 */

import { executeQuery, MySQL } from "./db";
import type { AdvanceRecord, AdvanceStatus } from "@/lib/advances-engine";

export async function getAdvancesFromMySQL(): Promise<AdvanceRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT a.*, e.employee_number, e.full_name as employee_name, e.department, e.designation, e.monthly_salary FROM `employee_advances` a LEFT JOIN `employees` e ON a.employee_id = e.id WHERE a.is_archived = 0 ORDER BY a.created_at DESC"
  );

  return rows.map((r) => {
    const rawStatus = (r.status || "Pending").trim();
    let status: AdvanceStatus = "Pending";
    if (rawStatus.toLowerCase() === "pending") status = "Pending";
    else if (rawStatus.toLowerCase() === "approved") status = "Approved";
    else if (rawStatus.toLowerCase() === "disbursed") status = "Disbursed";
    else if (rawStatus.toLowerCase() === "recovering" || rawStatus.toLowerCase() === "active") status = "Recovering";
    else if (rawStatus.toLowerCase() === "completed" || rawStatus.toLowerCase() === "fully_deducted") status = "Completed";
    else if (rawStatus.toLowerCase() === "rejected") status = "Rejected";
    else if (rawStatus.toLowerCase() === "archived") status = "Archived";

    const requestedAmount = Number(r.requested_amount || 0);
    const approvedAmount = Number(r.approved_amount || (status === "Pending" ? 0 : requestedAmount));
    const remainingBalance = Number(r.remaining_balance || (status === "Pending" ? 0 : approvedAmount));

    return {
      id: String(r.id),
      advanceNumber: r.advance_number || `ADV-2026-${String(r.id).padStart(3, "0")}`,
      employeeId: String(r.employee_id),
      employeeNumber: r.employee_number || "EMP-2026",
      employeeName: r.employee_name || "Factory Worker",
      department: r.department || "Cutting Floor",
      designation: r.designation || "Operator",
      currentSalary: Number(r.monthly_salary || 35000),
      requestedAmount,
      approvedAmount,
      reason: r.reason || "Personal Loan / Medical Support",
      repaymentMonths: Number(r.repayment_months || 1),
      monthlyDeduction: Number(r.monthly_deduction || 0),
      remainingBalance,
      status,
      requestDate: r.request_date ? new Date(r.request_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      approvedBy: r.approved_date ? "HR Director" : undefined,
      approvedDate: r.approved_date ? new Date(r.approved_date).toISOString().split("T")[0] : undefined,
      disbursedDate: r.disbursed_date ? new Date(r.disbursed_date).toISOString().split("T")[0] : undefined,
      notes: r.notes || undefined,
      isArchived: Boolean(r.is_archived),
      repayments: [],
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
    };
  });
}

export async function createAdvanceInMySQL(data: any): Promise<string> {
  const countRows = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `employee_advances`");
  const nextNum = (countRows[0]?.cnt || 0) + 1;
  const advNum = data.advanceNumber || `ADV-2026-${String(nextNum).padStart(3, "0")}`;

  const reqAmount = Number(data.requestedAmount || data.amount) || 10000;
  const status = data.status || "Pending";
  const isApproved = status === "Approved" || status === "Recovering" || status === "Disbursed" || status === "Active";
  const appAmount = isApproved ? (Number(data.approvedAmount) || reqAmount) : 0;
  const months = Number(data.repaymentMonths) || 2;
  const deduction = isApproved ? (Number(data.monthlyDeduction) || Math.round(appAmount / months)) : 0;
  const balance = isApproved ? (Number(data.remainingBalance) || appAmount) : 0;

  const insertId = await MySQL.insert("employee_advances", {
    uuid: crypto.randomUUID(),
    advance_number: advNum,
    employee_id: data.employeeId ? Number(data.employeeId) : 1,
    requested_amount: reqAmount,
    approved_amount: appAmount,
    monthly_deduction: deduction,
    remaining_balance: balance,
    repayment_months: months,
    reason: data.reason || "Personal Loan Assistance",
    status: status,
    request_date: data.requestDate || new Date().toISOString().split("T")[0],
    approved_date: isApproved ? (data.approvedDate || new Date().toISOString().split("T")[0]) : null,
    disbursed_date: (status === "Disbursed" || status === "Recovering") ? (data.disbursedDate || new Date().toISOString().split("T")[0]) : null,
    is_archived: 0,
    notes: data.notes || null,
  });

  return String(insertId);
}

export async function updateAdvanceInMySQL(id: string, data: any): Promise<boolean> {
  const payload: Record<string, any> = {};

  if (data.status) payload.status = data.status;
  if (data.approvedAmount !== undefined) payload.approved_amount = Number(data.approvedAmount);
  if (data.requestedAmount !== undefined) payload.requested_amount = Number(data.requestedAmount);
  if (data.approvedDate !== undefined) payload.approved_date = data.approvedDate;
  if (data.disbursedDate !== undefined) payload.disbursed_date = data.disbursedDate;
  if (data.remainingBalance !== undefined) payload.remaining_balance = Number(data.remainingBalance);
  if (data.monthlyDeduction !== undefined) payload.monthly_deduction = Number(data.monthlyDeduction);
  if (data.repaymentMonths !== undefined) payload.repayment_months = Number(data.repaymentMonths);
  if (data.reason !== undefined) payload.reason = data.reason;
  if (data.isArchived !== undefined) payload.is_archived = data.isArchived ? 1 : 0;
  if (data.notes !== undefined) payload.notes = data.notes;

  return MySQL.update("employee_advances", id, payload);
}

export async function deleteAdvanceInMySQL(id: string): Promise<boolean> {
  return MySQL.delete("employee_advances", id, true);
}

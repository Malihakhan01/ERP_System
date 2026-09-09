/**
 * FactoryOS Garment ERP — Employee Tasks MySQL 8 Repository
 * Operational task delegation, priority tracking, and floor workflows.
 */

import { executeQuery, executeStatement, MySQL } from "./db";
import crypto from "crypto";

export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "assigned" | "in_progress" | "completed" | "cancelled";
export type TaskType =
  | "stitching"
  | "cutting"
  | "qa_inspection"
  | "packing"
  | "maintenance"
  | "machine_setup"
  | "general";

export interface EmployeeTaskRecord {
  id: string;
  uuid: string;
  taskNumber: string;
  title: string;
  description?: string;
  taskType: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assignedToEmployeeId: string;
  assignedToName: string;
  assignedByUserId?: string;
  assignedByName: string;
  orderId?: string;
  orderNumber?: string;
  productionJobId?: string;
  productionJobNumber?: string;
  dueDate: string;
  dueTime?: string;
  completedAt?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getEmployeeTasksFromMySQL(filters?: {
  employeeId?: string;
  status?: string;
  priority?: string;
}): Promise<EmployeeTaskRecord[]> {
  let sql = `
    SELECT t.*, o.order_number, pj.job_number as production_job_number
    FROM \`employee_tasks\` t
    LEFT JOIN \`orders\` o ON t.order_id = o.id
    LEFT JOIN \`production_jobs\` pj ON t.production_job_id = pj.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.employeeId) {
    sql += " AND t.`assigned_to_employee_id` = ?";
    params.push(filters.employeeId);
  }

  if (filters?.status && filters.status !== "all") {
    sql += " AND t.`status` = ?";
    params.push(filters.status);
  }

  if (filters?.priority && filters.priority !== "all") {
    sql += " AND t.`priority` = ?";
    params.push(filters.priority);
  }

  sql += " ORDER BY CASE t.`priority` WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, t.`due_date` ASC";

  const rows = await executeQuery<any>(sql, params);

  return rows.map((r) => ({
    id: String(r.id),
    uuid: r.uuid,
    taskNumber: r.task_number,
    title: r.title,
    description: r.description || undefined,
    taskType: (r.task_type || "general") as TaskType,
    priority: (r.priority || "normal") as TaskPriority,
    status: (r.status || "assigned") as TaskStatus,
    assignedToEmployeeId: String(r.assigned_to_employee_id),
    assignedToName: r.assigned_to_name,
    assignedByUserId: r.assigned_by_user_id ? String(r.assigned_by_user_id) : undefined,
    assignedByName: r.assigned_by_name || "Factory Admin",
    orderId: r.order_id ? String(r.order_id) : undefined,
    orderNumber: r.order_number || undefined,
    productionJobId: r.production_job_id ? String(r.production_job_id) : undefined,
    productionJobNumber: r.production_job_number || undefined,
    dueDate: safeToIsoDate(r.due_date),
    dueTime: r.due_time || undefined,
    completedAt: safeToIsoDateTime(r.completed_at),
    completionNotes: r.completion_notes || undefined,
    createdAt: safeToIsoDateTime(r.created_at) || new Date().toISOString(),
    updatedAt: safeToIsoDateTime(r.updated_at) || new Date().toISOString(),
  }));
}

function safeToIsoDate(d: any): string {
  if (!d || d === "0000-00-00" || d === "0000-00-00 00:00:00") {
    return new Date().toISOString().split("T")[0];
  }
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? new Date().toISOString().split("T")[0] : dt.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

function safeToIsoDateTime(d: any): string | undefined {
  if (!d || d === "0000-00-00" || d === "0000-00-00 00:00:00") {
    return undefined;
  }
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? undefined : dt.toISOString();
  } catch {
    return undefined;
  }
}

export async function createEmployeeTaskInMySQL(data: {
  title: string;
  description?: string;
  taskType?: TaskType;
  priority?: TaskPriority;
  assignedToEmployeeId: string | number;
  assignedToName?: string;
  assignedByUserId?: string | number;
  assignedByName?: string;
  orderId?: string | number;
  productionJobId?: string | number;
  dueDate: string;
  dueTime?: string;
}): Promise<string> {
  let employeeName = data.assignedToName;
  if (!employeeName) {
    const [emp] = await executeQuery<any>(
      "SELECT full_name FROM `employees` WHERE `id` = ? LIMIT 1",
      [data.assignedToEmployeeId]
    );
    employeeName = emp?.full_name || "Factory Worker";
  }

  const [countRows] = await executeQuery<any>("SELECT COUNT(*) as count FROM `employee_tasks`");
  const nextNum = Number(countRows?.count || 0) + 1;
  const taskNumber = `TSK-2026-${String(nextNum).padStart(3, "0")}`;

  const insertId = await MySQL.insert("employee_tasks", {
    uuid: crypto.randomUUID(),
    task_number: taskNumber,
    title: data.title,
    description: data.description || null,
    task_type: data.taskType || "general",
    priority: data.priority || "normal",
    status: "assigned",
    assigned_to_employee_id: data.assignedToEmployeeId,
    assigned_to_name: employeeName,
    assigned_by_user_id: data.assignedByUserId || null,
    assigned_by_name: data.assignedByName || "Factory Admin",
    order_id: data.orderId || null,
    production_job_id: data.productionJobId || null,
    due_date: data.dueDate,
    due_time: data.dueTime || null,
  });

  // Audit log
  try {
    await executeStatement(
      "INSERT INTO `audit_logs` (`action`, `module`, `entity_id`, `details`) VALUES (?, ?, ?, ?)",
      ["ASSIGN_EMPLOYEE_TASK", "tasks", String(insertId), JSON.stringify({ taskNumber, employee: employeeName, title: data.title })]
    );
  } catch {}

  return String(insertId);
}

export async function updateEmployeeTaskStatusInMySQL(
  taskId: string | number,
  status: TaskStatus,
  completionNotes?: string
): Promise<boolean> {
  const updates: Record<string, any> = { status };
  if (status === "completed") {
    updates.completed_at = new Date();
    if (completionNotes) updates.completion_notes = completionNotes;
  }

  const res = await MySQL.update("employee_tasks", taskId, updates);

  // Audit log
  try {
    await executeStatement(
      "INSERT INTO `audit_logs` (`action`, `module`, `entity_id`, `details`) VALUES (?, ?, ?, ?)",
      ["UPDATE_TASK_STATUS", "tasks", String(taskId), JSON.stringify({ status, notes: completionNotes })]
    );
  } catch {}

  return res;
}

export async function deleteEmployeeTaskInMySQL(taskId: string | number): Promise<boolean> {
  return MySQL.delete("employee_tasks", taskId, false);
}

export async function getTaskMetricsFromMySQL() {
  const [totalRows] = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `employee_tasks`");
  const [assignedRows] = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `employee_tasks` WHERE `status` = 'assigned'");
  const [inProgressRows] = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `employee_tasks` WHERE `status` = 'in_progress'");
  const [completedRows] = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `employee_tasks` WHERE `status` = 'completed'");
  const [urgentRows] = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `employee_tasks` WHERE `priority` = 'urgent' AND `status` != 'completed'");

  return {
    total: Number(totalRows?.cnt || 0),
    assigned: Number(assignedRows?.cnt || 0),
    inProgress: Number(inProgressRows?.cnt || 0),
    completed: Number(completedRows?.cnt || 0),
    urgent: Number(urgentRows?.cnt || 0),
  };
}

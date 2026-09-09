// lib/services/tasks-service.ts
// Service layer for Employee Operational Tasks

import type {
  EmployeeTaskRecord,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/lib/mysql/tasks-db";

export type { EmployeeTaskRecord, TaskPriority, TaskStatus, TaskType };

export const TASK_STORAGE_KEY = "factoryos_employee_tasks";

export async function getEmployeeTasks(filters?: {
  employeeId?: string;
  status?: string;
  priority?: string;
}): Promise<EmployeeTaskRecord[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.set("employeeId", filters.employeeId);
    if (filters?.status && filters.status !== "all") params.set("status", filters.status);
    if (filters?.priority && filters.priority !== "all") params.set("priority", filters.priority);

    const url = `/api/tasks${params.toString() ? `?${params.toString()}` : ""}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      if (typeof window !== "undefined" && (!filters || Object.keys(filters).length === 0)) {
        localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(json.data));
      }
      return json.data;
    }
  } catch (err) {
    console.error("Error loading employee tasks:", err);
  }

  // Fallback to localStorage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(TASK_STORAGE_KEY);
      if (raw) {
        let list: EmployeeTaskRecord[] = JSON.parse(raw);
        if (filters?.employeeId) {
          list = list.filter((t) => t.assignedToEmployeeId === filters.employeeId);
        }
        if (filters?.status && filters.status !== "all") {
          list = list.filter((t) => t.status === filters.status);
        }
        if (filters?.priority && filters.priority !== "all") {
          list = list.filter((t) => t.priority === filters.priority);
        }
        return list;
      }
    } catch {}
  }

  return [];
}

export async function createEmployeeTask(data: {
  title: string;
  description?: string;
  taskType?: TaskType;
  priority?: TaskPriority;
  assignedToEmployeeId: string;
  assignedToName?: string;
  assignedByUserId?: string;
  assignedByName?: string;
  orderId?: string;
  productionJobId?: string;
  dueDate: string;
  dueTime?: string;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch (err) {
    console.error("Error creating employee task:", err);
    return false;
  }
}

export async function updateEmployeeTaskStatus(
  taskId: string,
  status: TaskStatus,
  completionNotes?: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, completionNotes }),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch (err) {
    console.error("Error updating task status:", err);
    return false;
  }
}

export async function deleteEmployeeTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch (err) {
    console.error("Error deleting task:", err);
    return false;
  }
}

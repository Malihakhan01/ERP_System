import { NextResponse } from "next/server";
import {
  getEmployeeTasksFromMySQL,
  createEmployeeTaskInMySQL,
  getTaskMetricsFromMySQL,
} from "@/lib/mysql/tasks-db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");

    if (view === "metrics") {
      const metrics = await getTaskMetricsFromMySQL();
      return NextResponse.json({ success: true, data: metrics });
    }

    const employeeId = searchParams.get("employeeId") || undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;

    const tasks = await getEmployeeTasksFromMySQL({ employeeId, status, priority });
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.title || !body.assignedToEmployeeId || !body.dueDate) {
      return NextResponse.json(
        { success: false, message: "Title, Assigned Employee, and Due Date are required." },
        { status: 400 }
      );
    }

    const id = await createEmployeeTaskInMySQL(body);
    return NextResponse.json(
      { success: true, message: "Task assigned successfully.", data: { id } },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to assign task" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import {
  updateEmployeeTaskStatusInMySQL,
  deleteEmployeeTaskInMySQL,
  getEmployeeTasksFromMySQL,
} from "@/lib/mysql/tasks-db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tasks = await getEmployeeTasksFromMySQL();
    const task = tasks.find((t) => t.id === id || t.taskNumber === id);
    if (!task) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const status = body.status;
    const completionNotes = body.completionNotes || body.notes;

    if (!status) {
      return NextResponse.json(
        { success: false, message: "Status is required." },
        { status: 400 }
      );
    }

    const success = await updateEmployeeTaskStatusInMySQL(id, status, completionNotes);
    return NextResponse.json({ success, message: `Task status updated to ${status}` });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteEmployeeTaskInMySQL(id);
    return NextResponse.json({ success, message: "Task removed" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete task" },
      { status: 500 }
    );
  }
}

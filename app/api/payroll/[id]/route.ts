import { NextResponse } from "next/server";
import { updatePayrollRecordPaidInMySQL } from "@/lib/mysql/payroll-db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const ok = await updatePayrollRecordPaidInMySQL(id, body.status || "Paid");
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

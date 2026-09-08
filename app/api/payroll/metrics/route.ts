import { NextResponse } from "next/server";
import { getPayrollMetricsFromMySQL } from "@/lib/mysql/payroll-db";

export async function GET() {
  try {
    const metrics = await getPayrollMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

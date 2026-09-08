import { NextResponse } from "next/server";
import { getEmployeeMetricsFromMySQL } from "@/lib/mysql/employees-db";

export async function GET() {
  try {
    const metrics = await getEmployeeMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

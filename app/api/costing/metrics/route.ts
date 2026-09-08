import { NextResponse } from "next/server";
import { getCostingMetricsFromMySQL } from "@/lib/mysql/costing-db";

export async function GET() {
  try {
    const metrics = await getCostingMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

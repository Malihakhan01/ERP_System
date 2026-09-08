import { NextResponse } from "next/server";
import { getDispatchMetricsFromMySQL } from "@/lib/mysql/dispatch-db";

export async function GET() {
  try {
    const metrics = await getDispatchMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

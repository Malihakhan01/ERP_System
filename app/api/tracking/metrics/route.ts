import { NextResponse } from "next/server";
import { getTrackingMetricsFromMySQL } from "@/lib/mysql/tracking-db";

export async function GET() {
  try {
    const metrics = await getTrackingMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

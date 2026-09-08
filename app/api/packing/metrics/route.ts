import { NextResponse } from "next/server";
import { getPackingMetricsFromMySQL } from "@/lib/mysql/packing-db";

export async function GET() {
  try {
    const metrics = await getPackingMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

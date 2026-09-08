import { NextResponse } from "next/server";
import { getMaterialMetricsFromMySQL } from "@/lib/mysql/materials-db";

export async function GET() {
  try {
    const metrics = await getMaterialMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

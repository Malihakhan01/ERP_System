import { NextResponse } from "next/server";
import { getQAMetricsFromMySQL } from "@/lib/mysql/qa-db";

export async function GET() {
  try {
    const metrics = await getQAMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

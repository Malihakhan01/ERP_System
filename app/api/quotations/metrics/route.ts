import { NextResponse } from "next/server";
import { getQuotationMetricsFromMySQL } from "@/lib/mysql/quotations-db";

export async function GET() {
  try {
    const metrics = await getQuotationMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

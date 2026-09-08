import { NextResponse } from "next/server";
import { getInvoiceMetricsFromMySQL } from "@/lib/mysql/invoices-db";

export async function GET() {
  try {
    const metrics = await getInvoiceMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

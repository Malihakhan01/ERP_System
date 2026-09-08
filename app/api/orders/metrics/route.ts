import { NextResponse } from "next/server";
import { getOrderMetricsFromMySQL } from "@/lib/mysql/orders-db";

export async function GET() {
  try {
    const metrics = await getOrderMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getInventoryMetricsFromMySQL } from "@/lib/mysql/inventory-db";

export async function GET() {
  try {
    const metrics = await getInventoryMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

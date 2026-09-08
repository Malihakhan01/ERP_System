import { NextResponse } from "next/server";
import { getClientMetricsFromMySQL } from "@/lib/mysql/clients-db";

export async function GET() {
  try {
    const metrics = await getClientMetricsFromMySQL();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

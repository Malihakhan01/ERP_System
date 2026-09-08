import { NextResponse } from "next/server";
import { executeCuttingPlanInMySQL } from "@/lib/mysql/production-db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await executeCuttingPlanInMySQL(body.cuttingPlanId, body.bundleSizePieces);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

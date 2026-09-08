import { NextResponse } from "next/server";
import { assignBundleInMySQL } from "@/lib/mysql/production-db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await assignBundleInMySQL(
      body.bundleId,
      body.employeeId,
      body.operationName,
      body.lineCode
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

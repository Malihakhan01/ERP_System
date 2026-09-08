import { NextResponse } from "next/server";
import { makeQADecisionInMySQL } from "@/lib/mysql/qa-db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await makeQADecisionInMySQL(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

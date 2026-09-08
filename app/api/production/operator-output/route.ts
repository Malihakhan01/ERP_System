import { NextResponse } from "next/server";
import { logOperatorOutputInMySQL, getOperatorLogsForJobFromMySQL } from "@/lib/mysql/production-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id");
    if (!jobId) return NextResponse.json({ success: false, message: "job_id is required" }, { status: 400 });
    const logs = await getOperatorLogsForJobFromMySQL(jobId);
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await logOperatorOutputInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

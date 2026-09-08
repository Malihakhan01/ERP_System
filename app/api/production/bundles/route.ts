import { NextResponse } from "next/server";
import { getBundlesForJobFromMySQL } from "@/lib/mysql/production-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id");
    if (!jobId) return NextResponse.json({ success: false, message: "job_id is required" }, { status: 400 });
    const bundles = await getBundlesForJobFromMySQL(jobId);
    return NextResponse.json({ success: true, data: bundles });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

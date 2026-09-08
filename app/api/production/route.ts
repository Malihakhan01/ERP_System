import { NextResponse } from "next/server";
import { getProductionJobsFromMySQL, createProductionJobInMySQL } from "@/lib/mysql/production-db";

export async function GET() {
  try {
    const jobs = await getProductionJobsFromMySQL();
    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createProductionJobInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

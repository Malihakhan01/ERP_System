import { NextResponse } from "next/server";
import { getPayrollRunsFromMySQL, createPayrollRunInMySQL } from "@/lib/mysql/payroll-db";

export async function GET() {
  try {
    const runs = await getPayrollRunsFromMySQL();
    return NextResponse.json({ success: true, data: runs });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createPayrollRunInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

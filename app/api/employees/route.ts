import { NextResponse } from "next/server";
import { getEmployeesFromMySQL, createEmployeeInMySQL } from "@/lib/mysql/employees-db";

export async function GET() {
  try {
    const employees = await getEmployeesFromMySQL();
    return NextResponse.json({ success: true, data: employees });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createEmployeeInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

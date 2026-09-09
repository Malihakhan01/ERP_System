import { NextResponse } from "next/server";
import { getEmployeesFromMySQL, createEmployeeInMySQL, getNextEmployeeNumberFromMySQL } from "@/lib/mysql/employees-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("action") === "next_id") {
      const nextId = await getNextEmployeeNumberFromMySQL();
      return NextResponse.json({ success: true, nextEmployeeNumber: nextId });
    }

    const employees = await getEmployeesFromMySQL();
    return NextResponse.json({ success: true, data: employees });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await createEmployeeInMySQL(body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

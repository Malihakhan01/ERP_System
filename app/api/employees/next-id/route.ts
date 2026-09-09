import { NextResponse } from "next/server";
import { getNextEmployeeNumberFromMySQL } from "@/lib/mysql/employees-db";

export async function GET() {
  try {
    const nextEmployeeNumber = await getNextEmployeeNumberFromMySQL();
    return NextResponse.json({ success: true, nextEmployeeNumber });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

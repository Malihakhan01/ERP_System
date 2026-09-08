import { NextResponse } from "next/server";
import { getQAInspectionsFromMySQL, createQAInspectionInMySQL } from "@/lib/mysql/qa-db";

export async function GET() {
  try {
    const inspections = await getQAInspectionsFromMySQL();
    return NextResponse.json({ success: true, data: inspections });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createQAInspectionInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getDefectsForInspectionFromMySQL, logQADefectInMySQL } from "@/lib/mysql/qa-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const inspectionId = searchParams.get("inspection_id");
    if (!inspectionId) return NextResponse.json({ success: false, message: "inspection_id is required" }, { status: 400 });
    const defects = await getDefectsForInspectionFromMySQL(inspectionId);
    return NextResponse.json({ success: true, data: defects });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await logQADefectInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

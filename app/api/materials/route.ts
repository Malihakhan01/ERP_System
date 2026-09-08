import { NextResponse } from "next/server";
import { getMaterialsFromMySQL, createMaterialInMySQL } from "@/lib/mysql/materials-db";

export async function GET() {
  try {
    const materials = await getMaterialsFromMySQL();
    return NextResponse.json({ success: true, data: materials });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createMaterialInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

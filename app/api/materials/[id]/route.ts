import { NextResponse } from "next/server";
import { getMaterialByIdFromMySQL, updateMaterialInMySQL, deleteMaterialInMySQL } from "@/lib/mysql/materials-db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const material = await getMaterialByIdFromMySQL(id);
    if (!material) {
      return NextResponse.json({ success: false, message: "Material not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: material });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const ok = await updateMaterialInMySQL(id, body);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await deleteMaterialInMySQL(id);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

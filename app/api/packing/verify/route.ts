import { NextResponse } from "next/server";
import { verifyCartonBarcodeInMySQL } from "@/lib/mysql/packing-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get("barcode");
    if (!barcode) return NextResponse.json({ success: false, message: "Barcode is required" }, { status: 400 });

    const carton = await verifyCartonBarcodeInMySQL(barcode);
    if (!carton) return NextResponse.json({ success: false, message: "Carton not found with this barcode" }, { status: 404 });

    return NextResponse.json({ success: true, data: carton });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

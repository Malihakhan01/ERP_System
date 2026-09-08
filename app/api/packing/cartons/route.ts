import { NextResponse } from "next/server";
import { getPackingCartonsFromMySQL, createMasterCartonInMySQL, updateCartonStatusInMySQL } from "@/lib/mysql/packing-db";

export async function GET() {
  try {
    const cartons = await getPackingCartonsFromMySQL();
    return NextResponse.json({ success: true, data: cartons });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createMasterCartonInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const success = await updateCartonStatusInMySQL(body.cartonId, body.status);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

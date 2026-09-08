import { NextResponse } from "next/server";
import { getDispatchNotesFromMySQL, createDispatchShipmentInMySQL } from "@/lib/mysql/dispatch-db";

export async function GET() {
  try {
    const records = await getDispatchNotesFromMySQL();
    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createDispatchShipmentInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getPackingCartonsFromMySQL, getPackingQueueFromMySQL, createMasterCartonInMySQL } from "@/lib/mysql/packing-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    if (view === "queue") {
      const queue = await getPackingQueueFromMySQL();
      return NextResponse.json({ success: true, data: queue });
    }

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

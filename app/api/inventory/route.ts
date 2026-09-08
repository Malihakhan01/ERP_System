import { NextResponse } from "next/server";
import { getInventoryFromMySQL, getStockMovementsFromMySQL, createInventoryItemInMySQL } from "@/lib/mysql/inventory-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "movements") {
      const movements = await getStockMovementsFromMySQL();
      return NextResponse.json({ success: true, data: movements });
    }

    const items = await getInventoryFromMySQL();
    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createInventoryItemInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

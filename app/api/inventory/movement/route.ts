import { NextResponse } from "next/server";
import { recordStockMovementInMySQL } from "@/lib/mysql/inventory-db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await recordStockMovementInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

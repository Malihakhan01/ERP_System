import { NextResponse } from "next/server";
import { getPurchasesFromMySQL, createPurchaseInMySQL } from "@/lib/mysql/purchases-db";

export async function GET() {
  try {
    const purchases = await getPurchasesFromMySQL();
    return NextResponse.json({ success: true, data: purchases });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createPurchaseInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

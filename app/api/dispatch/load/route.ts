import { NextResponse } from "next/server";
import { markCartonLoadedInMySQL } from "@/lib/mysql/dispatch-db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const success = await markCartonLoadedInMySQL(body.cartonBarcode);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { updateTrackingGateInMySQL } from "@/lib/mysql/tracking-db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const success = await updateTrackingGateInMySQL(body);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

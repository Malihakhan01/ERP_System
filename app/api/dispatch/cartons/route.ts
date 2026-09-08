import { NextResponse } from "next/server";
import { getReadyCartonsForDispatchFromMySQL } from "@/lib/mysql/dispatch-db";

export async function GET() {
  try {
    const cartons = await getReadyCartonsForDispatchFromMySQL();
    return NextResponse.json({ success: true, data: cartons });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

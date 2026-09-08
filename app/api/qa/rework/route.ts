import { NextResponse } from "next/server";
import { getQAReworkRecordsFromMySQL } from "@/lib/mysql/qa-db";

export async function GET() {
  try {
    const records = await getQAReworkRecordsFromMySQL();
    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

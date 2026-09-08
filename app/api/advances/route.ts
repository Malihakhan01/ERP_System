import { NextResponse } from "next/server";
import { getAdvancesFromMySQL, createAdvanceInMySQL } from "@/lib/mysql/advances-db";

export async function GET() {
  try {
    const advances = await getAdvancesFromMySQL();
    return NextResponse.json({ success: true, data: advances });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createAdvanceInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

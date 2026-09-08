import { NextResponse } from "next/server";
import { getQuotationsFromMySQL, createQuotationInMySQL } from "@/lib/mysql/quotations-db";

export async function GET() {
  try {
    const quotations = await getQuotationsFromMySQL();
    return NextResponse.json({ success: true, data: quotations });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createQuotationInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

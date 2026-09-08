import { NextResponse } from "next/server";
import { getInvoicesFromMySQL, createInvoiceInMySQL } from "@/lib/mysql/invoices-db";

export async function GET() {
  try {
    const invoices = await getInvoicesFromMySQL();
    return NextResponse.json({ success: true, data: invoices });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createInvoiceInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

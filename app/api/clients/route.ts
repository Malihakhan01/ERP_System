import { NextResponse } from "next/server";
import { getClientsFromMySQL, createClientInMySQL } from "@/lib/mysql/clients-db";

export async function GET() {
  try {
    const clients = await getClientsFromMySQL();
    return NextResponse.json({ success: true, data: clients });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createClientInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

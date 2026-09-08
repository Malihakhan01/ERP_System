import { NextResponse } from "next/server";
import { getCostEstimatesFromMySQL, createCostEstimateInMySQL } from "@/lib/mysql/costing-db";

export async function GET() {
  try {
    const estimates = await getCostEstimatesFromMySQL();
    return NextResponse.json({ success: true, data: estimates });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createCostEstimateInMySQL(body);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

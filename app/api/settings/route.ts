import { NextResponse } from "next/server";
import { getSystemSettingsFromMySQL, saveSystemSettingsInMySQL } from "@/lib/mysql/settings-db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || "company_profile";
    const settings = await getSystemSettingsFromMySQL(key);
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const key = body.key || "company_profile";
    const value = body.value || body;
    const updatedBy = body.updatedBy || "System Admin";

    await saveSystemSettingsInMySQL(key, value, updatedBy);
    return NextResponse.json({ success: true, message: "Settings saved successfully", data: value });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { apiKey: requestApiKey } = body as { apiKey?: string };

    const apiKey =
      requestApiKey?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.NEXT_PUBLIC_OPENAI_API_KEY?.trim();

    if (!apiKey || apiKey.includes("placeholder") || !apiKey.startsWith("sk-")) {
      return NextResponse.json(
        {
          success: false,
          error: "API key is missing or formatted incorrectly. Standard OpenAI keys start with 'sk-'.",
        },
        { status: 400 }
      );
    }

    // Fast verification against OpenAI models endpoint
    const testRes = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await testRes.json();

    if (!testRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data?.error?.message || `OpenAI returned status ${testRes.status}. Invalid credentials.`,
        },
        { status: testRes.status }
      );
    }

    const hasDalle = Array.isArray(data?.data)
      ? data.data.some((m: any) => m.id?.includes("dall-e"))
      : true;

    return NextResponse.json({
      success: true,
      message: "OpenAI API connection verified successfully. DALL-E 3 image synthesis is ready.",
      hasDalle,
      totalModels: data?.data?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to reach OpenAI server." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Server-side in-memory cache for AI Settings
let cachedServerAiSettings: {
  apiProvider?: string;
  openaiApiKey?: string;
  model?: string;
  imageQuality?: string;
  defaultResolution?: string;
  defaultStyle?: string;
  generationLimitPerUser?: number;
  enableAutoEnhancement?: boolean;
  updatedAt?: string;
} = {
  apiProvider: "OpenAI",
  model: "dall-e-3",
  imageQuality: "standard",
  defaultResolution: "1024x1024",
  defaultStyle: "Realistic Product Photography",
  generationLimitPerUser: 50,
  enableAutoEnhancement: true,
  openaiApiKey: process.env.OPENAI_API_KEY || "",
};

export async function GET() {
  const envKey = process.env.OPENAI_API_KEY || "";
  const activeKey = cachedServerAiSettings.openaiApiKey || envKey;

  return NextResponse.json({
    success: true,
    settings: {
      ...cachedServerAiSettings,
      openaiApiKey: activeKey,
      hasApiKey: Boolean(activeKey && !activeKey.includes("placeholder") && activeKey.startsWith("sk-")),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ success: false, error: "No settings provided." }, { status: 400 });
    }

    cachedServerAiSettings = {
      ...cachedServerAiSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    const newKey = settings.openaiApiKey?.trim();
    if (newKey) {
      process.env.OPENAI_API_KEY = newKey;

      // Also persist to .env.local if possible
      try {
        const envPath = path.join(process.cwd(), ".env.local");
        let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
        if (content.includes("OPENAI_API_KEY=")) {
          content = content.replace(/OPENAI_API_KEY=.*/g, `OPENAI_API_KEY=${newKey}`);
        } else {
          content += `\nOPENAI_API_KEY=${newKey}\n`;
        }
        fs.writeFileSync(envPath, content, "utf8");
      } catch (fsErr) {
        console.warn("Could not write OPENAI_API_KEY to .env.local file directly:", fsErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "AI settings saved successfully on server.",
      hasApiKey: Boolean(newKey && !newKey.includes("placeholder") && newKey.startsWith("sk-")),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to save AI settings." }, { status: 500 });
  }
}

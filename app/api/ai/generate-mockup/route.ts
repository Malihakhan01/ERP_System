import { NextRequest, NextResponse } from "next/server";
import {
  AiMockupConfig,
  enhanceAiPrompt,
} from "@/lib/ai-mockup-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      config,
      apiKey: requestApiKey,
      model = "dall-e-3",
      quality = "standard",
      size = "1024x1024",
    } = body as {
      config: AiMockupConfig;
      apiKey?: string;
      model?: "dall-e-3" | "dall-e-2";
      quality?: "standard" | "hd";
      size?: "1024x1024" | "1024x1792" | "1792x1024";
    };

    console.log(`[OpenAI Generation API] Step 1: Request received for product: "${config?.productName}" (${config?.category})`);

    if (!config || !config.category) {
      return NextResponse.json(
        { success: false, error: "Product Category and details are required." },
        { status: 400 }
      );
    }

    // 1. Build and enhance the prompt
    const enhancedPrompt = config.autoEnhance !== false
      ? enhanceAiPrompt(config)
      : config.additionalInstructions || `${config.productName || config.category} in ${config.style}`;

    console.log(`[OpenAI Generation API] Step 2: Enhanced Prompt Generated:\n"${enhancedPrompt}"`);

    // 2. Resolve OpenAI API Key
    const apiKey =
      requestApiKey?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.NEXT_PUBLIC_OPENAI_API_KEY?.trim();

    if (!apiKey || apiKey.includes("placeholder") || !apiKey.startsWith("sk-")) {
      console.warn("[OpenAI Generation API] Error: AI provider not configured (Missing or invalid OPENAI_API_KEY).");
      return NextResponse.json(
        {
          success: false,
          error: "AI provider not configured. Please add your OpenAI Secret API Key in Settings > AI (/settings/ai).",
          needsApiKey: true,
        },
        { status: 401 }
      );
    }

    // 3. Call OpenAI Images API
    console.log(`[OpenAI Generation API] Step 3: Calling OpenAI Image API (model: ${model}, quality: ${quality}, size: ${size})...`);

    const openAiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "dall-e-3",
        prompt: enhancedPrompt.slice(0, 4000),
        n: 1,
        size: size || "1024x1024",
        quality: quality || "standard",
        response_format: "url",
      }),
    });

    console.log(`[OpenAI Generation API] Step 4: OpenAI Response Status: ${openAiRes.status} ${openAiRes.statusText}`);

    const openAiData = await openAiRes.json();

    if (!openAiRes.ok) {
      const errorMsg =
        openAiData?.error?.message ||
        `OpenAI API returned error ${openAiRes.status}: ${openAiRes.statusText}`;
      console.error(`[OpenAI Generation API] Error from OpenAI:`, errorMsg);

      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
        },
        { status: openAiRes.status || 500 }
      );
    }

    const imageUrl = openAiData?.data?.[0]?.url;
    if (!imageUrl) {
      console.error("[OpenAI Generation API] Error: No image URL in OpenAI response data.");
      return NextResponse.json(
        { success: false, error: "OpenAI did not return an image URL." },
        { status: 500 }
      );
    }

    console.log(`[OpenAI Generation API] Step 5: Success! Real image URL received from OpenAI.`);

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt: enhancedPrompt,
      revisedPrompt: openAiData?.data?.[0]?.revised_prompt || enhancedPrompt,
      model: model || "dall-e-3",
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[OpenAI Generation API] Uncaught Exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error during image generation." },
      { status: 500 }
    );
  }
}

// lib/ai-mockup-engine.ts
// Core domain engine for FactoryOS AI Mockup & Garment Sample Generation

export type ProductCategory =
  | "T-Shirt"
  | "Hoodie"
  | "Tracksuit"
  | "Gloves"
  | "Shoes"
  | "Sportswear"
  | "Safety Wear"
  | "Surgical Products"
  | "Custom Product";

export type MockupStyle =
  | "Realistic Product Photography"
  | "3D Render"
  | "Lifestyle Model Shoot"
  | "Factory Catalog Image"
  | "E-commerce White Background"
  | "Luxury Brand Style";

export type MockupBackground =
  | "White Studio"
  | "Factory Floor"
  | "Sports Arena"
  | "Street Style"
  | "Minimalist Concrete"
  | "Custom";

export interface ColorPreset {
  name: string;
  hex: string;
}

export const PRODUCT_CATEGORIES: { label: ProductCategory; value: ProductCategory; icon: string; defaultMaterial: string }[] = [
  { label: "T-Shirt", value: "T-Shirt", icon: "Shirt", defaultMaterial: "100% Combed Cotton, 180 GSM Single Jersey" },
  { label: "Hoodie", value: "Hoodie", icon: "Layers", defaultMaterial: "350 GSM Heavyweight Fleece, Double Lined Hood" },
  { label: "Tracksuit", value: "Tracksuit", icon: "Activity", defaultMaterial: "Polyester Microfiber with Breathable Mesh Lining" },
  { label: "Gloves", value: "Gloves", icon: "Shield", defaultMaterial: "Genuine Cowhide Leather with Reinforced Wrist Strap" },
  { label: "Shoes", value: "Shoes", icon: "Footprints", defaultMaterial: "Knit Mesh Upper, Cushioned EVA Midsole" },
  { label: "Sportswear", value: "Sportswear", icon: "Flame", defaultMaterial: "Dry-Fit Moisture Wicking Spandex Blend" },
  { label: "Safety Wear", value: "Safety Wear", icon: "AlertTriangle", defaultMaterial: "High-Visibility Fluorescent Fabric with 3M Reflective Tapes" },
  { label: "Surgical Products", value: "Surgical Products", icon: "HeartPulse", defaultMaterial: "Non-Woven SMS Anti-Bacterial Sterilized Fabric" },
  { label: "Custom Product", value: "Custom Product", icon: "Sparkles", defaultMaterial: "Premium Industrial Grade Factory Material" },
];

export const MOCKUP_STYLES: { label: MockupStyle; value: MockupStyle; description: string }[] = [
  {
    label: "Realistic Product Photography",
    value: "Realistic Product Photography",
    description: "High-end commercial photo shoot with crisp studio lighting and true-to-life fabric textures.",
  },
  {
    label: "3D Render",
    value: "3D Render",
    description: "Octane/Blender style 3D photorealistic render with studio reflections and ambient occlusion.",
  },
  {
    label: "Lifestyle Model Shoot",
    value: "Lifestyle Model Shoot",
    description: "Worn by an athletic fashion model in natural outdoor/indoor lifestyle setting.",
  },
  {
    label: "Factory Catalog Image",
    value: "Factory Catalog Image",
    description: "Clean industrial OEM apparel spec shot showcasing technical stitching and seams.",
  },
  {
    label: "E-commerce White Background",
    value: "E-commerce White Background",
    description: "Crisp Amazon/Shopify ready clean cutout on pure white studio background with soft drop shadow.",
  },
  {
    label: "Luxury Brand Style",
    value: "Luxury Brand Style",
    description: "High-fashion editorial lighting, dramatic moody contrast, gold/metallic accents.",
  },
];

export const MOCKUP_BACKGROUNDS: { label: MockupBackground; value: MockupBackground; description: string }[] = [
  { label: "White Studio", value: "White Studio", description: "Pure seamless white cyc wall with diffused softbox lighting." },
  { label: "Factory Floor", value: "Factory Floor", description: "Modern garment manufacturing unit with industrial apparel ambiance." },
  { label: "Sports Arena", value: "Sports Arena", description: "Dynamic stadium or gym lighting with subtle athletic atmosphere." },
  { label: "Street Style", value: "Street Style", description: "Urban metropolitan city architecture and ambient natural light." },
  { label: "Minimalist Concrete", value: "Minimalist Concrete", description: "Sleek architectural concrete podium with directional spotlight." },
  { label: "Custom", value: "Custom", description: "Custom background specified in prompt instructions." },
];

export const POPULAR_COLORS: ColorPreset[] = [
  { name: "Jet Black", hex: "#0f172a" },
  { name: "Pure White", hex: "#ffffff" },
  { name: "Navy Blue", hex: "#1e3a8a" },
  { name: "Crimson Red", hex: "#dc2626" },
  { name: "Forest Green", hex: "#15803d" },
  { name: "Heather Grey", hex: "#64748b" },
  { name: "Camel Tan", hex: "#d97706" },
  { name: "Neon Lime", hex: "#84cc16" },
  { name: "Royal Purple", hex: "#7c3aed" },
];

export interface AiMockupConfig {
  productName: string;
  category: ProductCategory;
  style: MockupStyle;
  background: MockupBackground;
  colors: string[];
  additionalInstructions: string;
  referenceImageUrl?: string;
  autoEnhance?: boolean;
}

export interface AiGenerationRecord {
  id: string;
  userId?: string;
  productName: string;
  category: ProductCategory;
  style: MockupStyle;
  background: MockupBackground;
  colors: string[];
  prompt: string;
  enhancedPrompt: string;
  imageUrl: string;
  thumbnailUrl?: string;
  status: "Completed" | "Failed" | "Processing";
  tags: string[];
  isSaved?: boolean;
  createdAt: string;
}

export interface AiSettings {
  id: string;
  apiProvider: "OpenAI" | "Azure" | "Custom";
  openaiApiKey?: string;
  model: "dall-e-3" | "dall-e-2";
  imageQuality: "standard" | "hd";
  defaultResolution: "1024x1024" | "1024x1792" | "1792x1024";
  defaultStyle: MockupStyle;
  generationLimitPerUser: number;
  enableAutoEnhancement: boolean;
  createdAt: string;
  updatedAt: string;
}

export const AI_GENERATION_STORAGE_KEY = "factoryos_ai_generations";
export const AI_SETTINGS_STORAGE_KEY = "factoryos_ai_settings";

export const DEFAULT_AI_SETTINGS: AiSettings = {
  id: "ai_settings_default",
  apiProvider: "OpenAI",
  model: "dall-e-3",
  imageQuality: "standard",
  defaultResolution: "1024x1024",
  defaultStyle: "Realistic Product Photography",
  generationLimitPerUser: 50,
  enableAutoEnhancement: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Intelligent FactoryOS AI Prompt Enhancer
 * Takes simple user specifications and produces an ultra-detailed, commercial-grade image generation prompt.
 */
export function enhanceAiPrompt(config: AiMockupConfig): string {
  const {
    productName,
    category,
    style,
    background,
    colors = [],
    additionalInstructions = "",
  } = config;

  const categoryObj = PRODUCT_CATEGORIES.find((c) => c.value === category);
  const material = categoryObj?.defaultMaterial || "high-grade industrial textile";

  const colorStr =
    colors.length > 0
      ? `in ${colors.join(" and ")} colorway`
      : "in clean contemporary colorway";

  let styleModifier = "";
  switch (style) {
    case "Realistic Product Photography":
      styleModifier =
        "Professional commercial product photography, crisp 8k resolution, captured with Hasselblad 100MP camera, 85mm lens, f/8 aperture, softbox diffused studio lighting, ultra-detailed fabric micro-texture, visible precise stitching";
      break;
    case "3D Render":
      styleModifier =
        "3D photorealistic product render, Octane Render, ray-tracing, ambient occlusion, subtle glossy reflections, studio lighting rig, flawless topology and texture mapping";
      break;
    case "Lifestyle Model Shoot":
      styleModifier =
        "High-fashion commercial lookbook shot, worn by an athletic fashion model, candid dynamic posture, shallow depth of field, natural cinematic golden hour rim lighting, 50mm f/1.4 lens";
      break;
    case "Factory Catalog Image":
      styleModifier =
        "Technical factory spec catalog photography, orthographic front and 3/4 angle view, high contrast, clean industrial apparel presentation showing seam construction, hems, and material weave";
      break;
    case "E-commerce White Background":
      styleModifier =
        "Clean e-commerce product cutout, centered on pure clean white background (RGB 255, 255, 255), subtle natural contact shadow underneath, high key lighting, crisp sharp edges";
      break;
    case "Luxury Brand Style":
      styleModifier =
        "Ultra-luxury haute couture editorial visual, dramatic chiaroscuro lighting, dark slate and metallic accents, velvet and leather gloss, prestigious magazine cover aesthetic";
      break;
  }

  let backgroundModifier = "";
  switch (background) {
    case "White Studio":
      backgroundModifier = "placed on an immaculate seamless white studio cyclorama background";
      break;
    case "Factory Floor":
      backgroundModifier = "set inside a state-of-the-art clean modern garment manufacturing atelier with soft ambient industrial background blur";
      break;
    case "Sports Arena":
      backgroundModifier = "staged on polished athletic court flooring with stadium floodlight atmospheric haze in background";
      break;
    case "Street Style":
      backgroundModifier = "urban minimalist concrete architecture backdrop with warm directional city daylight";
      break;
    case "Minimalist Concrete":
      backgroundModifier = "displayed atop a geometric textured raw concrete podium with subtle dramatic shadow play";
      break;
    case "Custom":
      backgroundModifier = "";
      break;
  }

  const baseTitle = productName.trim() || `${category} Sample`;
  const extraDetails = additionalInstructions.trim() ? `Specific details: ${additionalInstructions.trim()}.` : "";

  const enhanced = [
    `A premium commercial mockup of ${baseTitle} (${category}) ${colorStr}.`,
    `Material: ${material}.`,
    styleModifier ? `${styleModifier}.` : "",
    backgroundModifier ? `${backgroundModifier}.` : "",
    extraDetails,
    "No watermarks, no distorted typography, no artifacts, masterpiece quality, commercial ready.",
  ]
    .filter(Boolean)
    .join(" ");

  return enhanced;
}

/**
 * Generate Dynamic High-Quality Visual Mockup SVG (Used for offline / instantaneous preview / fallback)
 */
export function generateMockupVisualSvg(config: AiMockupConfig): string {
  const color1 = config.colors[0] || "#1e293b";
  const color2 = config.colors[1] || "#3b82f6";
  const category = config.category;
  const name = config.productName || category;

  // Generate stylized SVG visual badge for mockups
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#e2e8f0"/>
      </linearGradient>
      <linearGradient id="prodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${color2}"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="20" stdDeviation="25" flood-color="#0f172a" flood-opacity="0.15"/>
      </filter>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" stroke-width="0.75" stroke-opacity="0.4"/>
      </pattern>
    </defs>

    <!-- Background -->
    <rect width="800" height="800" fill="url(#bgGrad)"/>
    <rect width="800" height="800" fill="url(#grid)"/>

    <!-- Ambient Studio Glow -->
    <circle cx="400" cy="380" r="280" fill="#ffffff" opacity="0.6" filter="blur(40px)"/>

    <!-- Product Display Pedestal / Shadow -->
    <ellipse cx="400" cy="620" rx="220" ry="24" fill="#0f172a" opacity="0.1" filter="blur(10px)"/>

    <!-- Central Product Graphic Representation -->
    <g filter="url(#shadow)" transform="translate(400, 380)">
      <!-- Outer Card Shape -->
      <rect x="-180" y="-180" width="360" height="360" rx="32" fill="url(#prodGrad)"/>
      
      <!-- Inner Design Lines / Stitching Details -->
      <rect x="-160" y="-160" width="320" height="320" rx="24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="8,6" opacity="0.35"/>
      
      <!-- FactoryOS Watermark / Badge -->
      <circle cx="0" cy="-30" r="64" fill="#ffffff" opacity="0.15"/>
      <path d="M-30,-20 L0,-60 L30,-20 L15,-20 L15,10 L-15,10 L-15,-20 Z" fill="#ffffff" opacity="0.9"/>
      
      <!-- Product Label Banner -->
      <rect x="-140" y="70" width="280" height="60" rx="14" fill="#ffffff" opacity="0.95"/>
      <text x="0" y="98" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" fill="#0f172a" text-anchor="middle" letter-spacing="0.5">${escapeXml(name.toUpperCase())}</text>
      <text x="0" y="118" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle" letter-spacing="1">${escapeXml(config.style.toUpperCase())}</text>
    </g>

    <!-- Top Badge -->
    <rect x="40" y="40" width="180" height="36" rx="18" fill="#ffffff" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"/>
    <circle cx="58" cy="58" r="6" fill="#10b981"/>
    <text x="74" y="63" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0f172a">FACTORYOS AI</text>

    <!-- Category Pill -->
    <rect x="580" y="40" width="180" height="36" rx="18" fill="#ffffff" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"/>
    <text x="670" y="63" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#2563eb" text-anchor="middle">${escapeXml(category)}</text>
  </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

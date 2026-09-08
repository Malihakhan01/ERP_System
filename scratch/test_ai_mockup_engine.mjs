import {
  enhanceAiPrompt,
  generateMockupVisualSvg,
  PRODUCT_CATEGORIES,
  MOCKUP_STYLES,
  MOCKUP_BACKGROUNDS,
} from "../lib/ai-mockup-engine.ts";

console.log("=================================================");
console.log(" FactoryOS AI Mockup Generator Engine Audit Test ");
console.log("=================================================");

let pass = 0;
let fail = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    pass++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    fail++;
  }
}

// Test 1: Category Prompt Enhancement for Sportswear
const sportPrompt = enhanceAiPrompt({
  productName: "Pro Soccer Jersey",
  category: "Sportswear",
  style: "Realistic Product Photography",
  background: "Sports Arena",
  colors: ["Navy Blue", "Pure White"],
  additionalInstructions: "Sublimated geometric pattern on chest",
});

assert(sportPrompt.includes("Pro Soccer Jersey"), "Includes product title in prompt");
assert(sportPrompt.includes("Sportswear"), "Includes category in prompt");
assert(sportPrompt.includes("Dry-Fit"), "Injects technical material specifications (Dry-Fit)");
assert(sportPrompt.includes("Navy Blue and Pure White"), "Injects selected colorway");
assert(sportPrompt.includes("Hasselblad"), "Includes professional camera parameters");
assert(sportPrompt.includes("athletic court flooring"), "Includes sports arena background lighting");

// Test 2: Gloves Category Prompt Enhancement
const glovePrompt = enhanceAiPrompt({
  productName: "Pro Fight Gloves",
  category: "Gloves",
  style: "Luxury Brand Style",
  background: "White Studio",
  colors: ["Jet Black", "Crimson Red"],
  additionalInstructions: "Gold foil logo and metallic lace holes",
});

assert(glovePrompt.includes("Cowhide Leather"), "Injects Cowhide Leather specification for gloves");
assert(glovePrompt.includes("haute couture"), "Injects luxury brand style modifiers");

// Test 3: Surgical Products Category
const surgPrompt = enhanceAiPrompt({
  productName: "Sterile Scrub Suit",
  category: "Surgical Products",
  style: "E-commerce White Background",
  background: "White Studio",
  colors: ["Sky Blue"],
  additionalInstructions: "Anti-fluid coating texture",
});

assert(surgPrompt.includes("Anti-Bacterial"), "Injects surgical fabric technical spec");
assert(surgPrompt.includes("e-commerce product cutout"), "Injects e-commerce white background parameters");

// Test 4: Visual Mockup SVG Generator
const svgData = generateMockupVisualSvg({
  productName: "Heavyweight Hoodie",
  category: "Hoodie",
  style: "Realistic Product Photography",
  background: "Factory Floor",
  colors: ["#0f172a", "#3b82f6"],
  additionalInstructions: "Embroidery on hood",
});

assert(typeof svgData === "string" && svgData.startsWith("data:image/svg+xml"), "Returns valid data URI SVG visual mockup");
assert(svgData.includes("HEAVYWEIGHT%20HOODIE"), "SVG includes encoded product title");

console.log("=================================================");
console.log(` Test Result: ${pass}/${pass + fail} Tests Passed successfully!`);
console.log("=================================================");

import {
  enhanceAiPrompt,
} from "../lib/ai-mockup-engine.ts";

console.log("=================================================");
console.log(" FactoryOS Production AI Integration Audit Test  ");
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

// Test 1: Boxing Gloves Production Prompt
const boxingConfig = {
  productName: "Boxing Gloves",
  category: "Gloves",
  style: "Realistic Product Photography",
  background: "Sports Arena",
  colors: ["Jet Black", "Crimson Red"],
  additionalInstructions: "Black and red professional boxing gloves, premium leather texture with detailed stitching.",
};

const prompt = enhanceAiPrompt(boxingConfig);

assert(prompt.includes("Boxing Gloves"), "Includes 'Boxing Gloves'");
assert(prompt.includes("Gloves"), "Includes category 'Gloves'");
assert(prompt.includes("Jet Black and Crimson Red"), "Includes exact colorway 'Jet Black and Crimson Red'");
assert(prompt.includes("Genuine Cowhide Leather"), "Injects material 'Genuine Cowhide Leather'");
assert(prompt.includes("Realistic Product Photography") || prompt.includes("Hasselblad"), "Includes realistic product photography parameters");
assert(prompt.includes("athletic court flooring") || prompt.includes("Sports Arena"), "Includes sports arena background lighting");

// Test 2: Verify No SVG/Fake generation in prompt
assert(!prompt.includes("<svg") && !prompt.includes("data:image/svg"), "Prompt is clean string without SVG artifacts");

console.log("=================================================");
console.log(` Test Result: ${pass}/${pass + fail} Tests Passed successfully!`);
console.log("=================================================");

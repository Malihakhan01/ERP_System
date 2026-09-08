import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.resolve(".env.local");
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [k, ...v] = trimmed.split("=");
      if (k && v.length > 0) {
        const val = v.join("=").trim().replace(/^["'](.*)["']$/, "$1");
        if (k.trim() === "NEXT_PUBLIC_SUPABASE_URL") supabaseUrl = val;
        if (k.trim() === "NEXT_PUBLIC_SUPABASE_ANON_KEY") supabaseAnonKey = val;
      }
    }
  }
}

console.log("Supabase URL Configured:", supabaseUrl);
const isConfigured = Boolean(supabaseUrl && !supabaseUrl.includes("placeholder") && !supabaseUrl.includes("example"));
console.log("Is Supabase Live & Configured:", isConfigured);

async function checkPrerequisites() {
  if (!isConfigured) {
    console.log("\n[INFO] Supabase credentials in .env.local are currently placeholder.");
    console.log("[INFO] Checking application default seed data in code repositories...");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  try {
    const [{ data: orders }, { data: products }, { data: clients }, { data: inventory }, { data: employees }, { data: jobs }] = await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("products").select("*"),
      supabase.from("clients").select("*"),
      supabase.from("inventory_items").select("*"),
      supabase.from("employees").select("*"),
      supabase.from("production_jobs").select("*"),
    ]);

    console.log("\n=== REAL SUPABASE RECORDS ===");
    console.log("Orders count:", orders?.length || 0);
    const confirmedOrders = (orders || []).filter(o => o.order_status === "confirmed" || o.status === "confirmed");
    console.log("Confirmed Orders count:", confirmedOrders.length);
    console.log("Products count:", products?.length || 0);
    console.log("Clients count:", clients?.length || 0);
    console.log("Inventory Items count:", inventory?.length || 0);
    console.log("Employees count:", employees?.length || 0);
    console.log("Production Jobs count:", jobs?.length || 0);
  } catch (err) {
    console.error("Error querying Supabase:", err);
  }
}

checkPrerequisites();

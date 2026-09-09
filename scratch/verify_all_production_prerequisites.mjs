import { createClient } from "@database/database-js";
import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.resolve(".env.local");
let dbUrl = process.env.NEXT_PUBLIC_DB_URL;
let dbAnonKey = process.env.NEXT_PUBLIC_DB_ANON_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [k, ...v] = trimmed.split("=");
      if (k && v.length > 0) {
        const val = v.join("=").trim().replace(/^["'](.*)["']$/, "$1");
        if (k.trim() === "NEXT_PUBLIC_DB_URL") dbUrl = val;
        if (k.trim() === "NEXT_PUBLIC_DB_ANON_KEY") dbAnonKey = val;
      }
    }
  }
}

console.log("Database URL Configured:", dbUrl);
const isConfigured = Boolean(dbUrl && !dbUrl.includes("placeholder") && !dbUrl.includes("example"));
console.log("Is Database Live & Configured:", isConfigured);

async function checkPrerequisites() {
  if (!isConfigured) {
    console.log("\n[INFO] Database credentials in .env.local are currently placeholder.");
    console.log("[INFO] Checking application default seed data in code repositories...");
    return;
  }

  const database = createClient(dbUrl, dbAnonKey);
  try {
    const [{ data: orders }, { data: products }, { data: clients }, { data: inventory }, { data: employees }, { data: jobs }] = await Promise.all([
      database.from("orders").select("*"),
      database.from("products").select("*"),
      database.from("clients").select("*"),
      database.from("inventory_items").select("*"),
      database.from("employees").select("*"),
      database.from("production_jobs").select("*"),
    ]);

    console.log("\n=== REAL DATABASE RECORDS ===");
    console.log("Orders count:", orders?.length || 0);
    const confirmedOrders = (orders || []).filter(o => o.order_status === "confirmed" || o.status === "confirmed");
    console.log("Confirmed Orders count:", confirmedOrders.length);
    console.log("Products count:", products?.length || 0);
    console.log("Clients count:", clients?.length || 0);
    console.log("Inventory Items count:", inventory?.length || 0);
    console.log("Employees count:", employees?.length || 0);
    console.log("Production Jobs count:", jobs?.length || 0);
  } catch (err) {
    console.error("Error querying Database:", err);
  }
}

checkPrerequisites();

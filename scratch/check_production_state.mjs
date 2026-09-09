import { createClient } from "@database/database-js";
import fs from "fs";
import path from "path";

// Load .env.local manually
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

const database = createClient(dbUrl, dbAnonKey);

async function checkState() {
  console.log("=== DATABASE PRODUCTION TABLES STATE CHECK ===");
  const [
    { data: jobs, error: jobsErr },
    { data: bundles, error: bndErr },
    { data: logs, error: logsErr },
    { data: lines, error: linesErr },
    { data: orders, error: ordErr },
    { data: employees, error: empErr }
  ] = await Promise.all([
    database.from("production_jobs").select("id, job_number, status, stage, planned_quantity, total_cut_quantity, total_stitched_quantity"),
    database.from("production_bundles").select("id, bundle_barcode, size, quantity, current_stage, status, passed_pieces, rejected_pieces, rework_pieces"),
    database.from("operator_production_logs").select("id, production_job_id, bundle_id, employee_name, operation_name, pieces_completed, pieces_rejected, pieces_rework, total_earnings, work_date"),
    database.from("production_lines").select("id, line_code, line_name, is_active"),
    database.from("orders").select("id, order_number, client_name, order_status, quantity"),
    database.from("employees").select("id, personal_info, employment_info, salary_info").eq("is_archived", false)
  ]);

  console.log("1. Production Jobs in Database:", jobs ? jobs.length : jobsErr);
  if (jobs && jobs.length > 0) console.log(JSON.stringify(jobs, null, 2));

  console.log("\n2. Production Bundles in Database:", bundles ? bundles.length : bndErr);
  if (bundles && bundles.length > 0) console.log(JSON.stringify(bundles.slice(0, 5), null, 2));

  console.log("\n3. Operator Output Logs in Database:", logs ? logs.length : logsErr);
  if (logs && logs.length > 0) console.log(JSON.stringify(logs.slice(0, 5), null, 2));

  console.log("\n4. Production Lines in Database:", lines ? lines.length : linesErr);
  if (lines && lines.length > 0) console.log(JSON.stringify(lines, null, 2));

  console.log("\n5. Confirmed Orders in Database:", orders ? orders.filter(o => o.order_status !== "draft").length : ordErr);
  if (orders) console.log(JSON.stringify(orders.filter(o => o.order_status !== "draft"), null, 2));

  console.log("\n6. Active Employees in Database:", employees ? employees.length : empErr);
}

checkState().catch(console.error);

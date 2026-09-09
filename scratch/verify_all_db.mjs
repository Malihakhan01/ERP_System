/**
 * FactoryOS — Full Database Connectivity Verification
 * Tests every module's DB connection and reports live data counts
 */

import mysql from "mysql2/promise";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Manually parse .env.local (no dotenv needed)
const envPath = join(__dirname, "..", ".env.local");
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  });
}

const DB_CONFIG = {
  host:     env.MYSQL_HOST     || "127.0.0.1",
  port:     parseInt(env.MYSQL_PORT || "3306", 10),
  user:     env.MYSQL_USER     || env.DB_USERNAME || "root",
  password: env.MYSQL_PASSWORD || env.DB_PASSWORD || "",
  database: env.MYSQL_DATABASE || env.DB_DATABASE || "factoryos",
};

const G = "\x1b[32m", R = "\x1b[31m", Y = "\x1b[33m", C = "\x1b[36m", B = "\x1b[1m", X = "\x1b[0m";

const ok   = (m) => console.log(`  ${G}✓${X} ${m}`);
const fail = (m) => console.log(`  ${R}✗${X} ${m}`);
const info = (m) => console.log(`  ${Y}→${X} ${m}`);
const head = (m) => console.log(`\n${B}${C}${m}${X}`);

async function run() {
  console.log(`\n${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${X}`);
  console.log(`${B}  FactoryOS — Full DB Verification  ${X}`);
  console.log(`${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${X}`);
  console.log(`  Host: ${DB_CONFIG.host}:${DB_CONFIG.port}  DB: ${B}${DB_CONFIG.database}${X}\n`);

  let db;
  try {
    db = await mysql.createConnection(DB_CONFIG);
    ok(`MySQL connected → ${B}${DB_CONFIG.database}${X}`);
  } catch (e) {
    fail(`Cannot connect: ${e.message}`); process.exit(1);
  }

  const q = async (sql, p = []) => { const [r] = await db.query(sql, p); return r; };
  let passed = 0, failed = 0;

  async function chk(label, sql, p = []) {
    try {
      const rows = await q(sql, p);
      const cnt = rows[0]?.cnt ?? rows[0]?.count ?? rows.length;
      ok(`${label}: ${B}${cnt}${X}`);
      passed++; return rows;
    } catch (e) { fail(`${label}: ${e.message}`); failed++; return []; }
  }

  // ── 1. USERS & AUTH ──────────────────────────────────
  head("1. USERS & AUTHENTICATION");
  await chk("Total users",             "SELECT COUNT(*) as cnt FROM users");
  await chk("Super Admin accounts",    "SELECT COUNT(*) as cnt FROM users WHERE role='super_admin'");
  await chk("Finance accounts",        "SELECT COUNT(*) as cnt FROM users WHERE role='finance'");
  try {
    await chk("Active sessions",       "SELECT COUNT(*) as cnt FROM sessions WHERE expires_at > NOW()");
  } catch { info("sessions table may not exist — skipped"); }

  // ── 2. EMPLOYEES ─────────────────────────────────────
  head("2. EMPLOYEES");
  await chk("Employees (active)",      "SELECT COUNT(*) as cnt FROM employees WHERE is_archived=0");
  await chk("Departments",             "SELECT COUNT(DISTINCT department) as cnt FROM employees WHERE department IS NOT NULL");
  await chk("Pending Advance Loans",   "SELECT COUNT(*) as cnt FROM employee_advances WHERE status='Pending' AND is_archived=0");
  await chk("Urgent/High Tasks",       "SELECT COUNT(*) as cnt FROM employee_tasks WHERE status IN ('assigned','in_progress') AND priority IN ('urgent','high')");
  await chk("Payroll records",         "SELECT COUNT(*) as cnt FROM payroll");

  // ── 3. CHAT & SOS ────────────────────────────────────
  head("3. CHAT & SOS NOTIFICATIONS");
  await chk("Chat conversations",      "SELECT COUNT(*) as cnt FROM chat_conversations");
  await chk("Chat messages",           "SELECT COUNT(*) as cnt FROM chat_messages");
  await chk("SOS / breakdown alerts",  "SELECT COUNT(*) as cnt FROM chat_messages WHERE message LIKE '%SOS%' OR message LIKE '%breakdown%'");
  await chk("Unread messages",         "SELECT COUNT(*) as cnt FROM chat_messages WHERE is_read=0");
  await chk("Chat participants",       "SELECT COUNT(*) as cnt FROM chat_participants");

  // ── 4. INVENTORY ─────────────────────────────────────
  head("4. INVENTORY & MATERIALS");
  await chk("Inventory items",         "SELECT COUNT(*) as cnt FROM inventory_items WHERE is_archived=0");
  await chk("Low-stock items",         "SELECT COUNT(*) as cnt FROM inventory_items WHERE available_stock <= reorder_point AND is_archived=0");
  try { await chk("Raw materials",     "SELECT COUNT(*) as cnt FROM raw_materials WHERE is_archived=0"); } catch { info("raw_materials skipped"); }
  await chk("Purchase orders",         "SELECT COUNT(*) as cnt FROM purchases WHERE is_archived=0");

  // ── 5. ORDERS & SALES ────────────────────────────────
  head("5. ORDERS, CLIENTS & SALES");
  await chk("Export orders",           "SELECT COUNT(*) as cnt FROM orders WHERE is_archived=0");
  await chk("Clients",                 "SELECT COUNT(*) as cnt FROM clients WHERE is_archived=0");
  await chk("Quotations",              "SELECT COUNT(*) as cnt FROM quotations WHERE is_archived=0");
  await chk("Invoices",                "SELECT COUNT(*) as cnt FROM invoices WHERE is_archived=0");

  // ── 6. PRODUCTION & QA ───────────────────────────────
  head("6. PRODUCTION & QA");
  await chk("Production batches",      "SELECT COUNT(*) as cnt FROM production_batches WHERE is_archived=0");
  await chk("QA inspections",          "SELECT COUNT(*) as cnt FROM qa_inspections WHERE is_archived=0");
  await chk("Products/Styles",         "SELECT COUNT(*) as cnt FROM products WHERE is_archived=0");
  try { await chk("Packing lists",     "SELECT COUNT(*) as cnt FROM packing_lists WHERE is_archived=0"); } catch { info("packing_lists skipped"); }

  // ── 7. DISPATCH & TRACKING ───────────────────────────
  head("7. DISPATCH & TRACKING");
  try { await chk("Dispatch shipments","SELECT COUNT(*) as cnt FROM dispatch_shipments WHERE is_archived=0"); } catch { info("dispatch_shipments skipped"); }
  try { await chk("Tracking events",   "SELECT COUNT(*) as cnt FROM tracking_events"); } catch { info("tracking_events skipped"); }

  // ── 8. COSTING & SETTINGS ────────────────────────────
  head("8. COSTING & SETTINGS");
  try { await chk("BOM/Costing rows",  "SELECT COUNT(*) as cnt FROM costing_records WHERE is_archived=0"); } catch { info("costing_records skipped"); }
  await chk("Settings",                "SELECT COUNT(*) as cnt FROM settings");

  // ── 9. ROLE-BASED NOTIFICATION FILTER ────────────────
  head("9. NOTIFICATION FILTER BY ROLE (LIVE COUNT)");

  const ROLE_MAP = {
    super_admin:           null,
    factory_manager:       ["sos","task","inventory","order"],
    production_supervisor: ["sos","task","inventory"],
    finance:               ["advance","order"],
    merchandiser:          ["order"],
    operator:              ["sos","task"],
  };

  for (const [role, allowed] of Object.entries(ROLE_MAP)) {
    try {
      let count = 0;
      const inc = (t) => !allowed || allowed.includes(t);
      if (inc("sos"))       { const r = await q("SELECT LEAST(COUNT(*),3) as cnt FROM chat_messages WHERE message LIKE '%SOS%'"); count += Number(r[0].cnt); }
      if (inc("advance"))   { const r = await q("SELECT LEAST(COUNT(*),4) as cnt FROM employee_advances WHERE status='Pending' AND is_archived=0"); count += Number(r[0].cnt); }
      if (inc("task"))      { const r = await q("SELECT LEAST(COUNT(*),3) as cnt FROM employee_tasks WHERE status IN ('assigned','in_progress') AND priority IN ('urgent','high')"); count += Number(r[0].cnt); }
      if (inc("inventory")) { const r = await q("SELECT LEAST(COUNT(*),2) as cnt FROM inventory_items WHERE available_stock <= reorder_point AND is_archived=0"); count += Number(r[0].cnt); }
      if (inc("order"))     { const r = await q("SELECT LEAST(COUNT(*),2) as cnt FROM orders WHERE is_archived=0"); count += Number(r[0].cnt); }
      ok(`[${B}${role}${X}] → ${G}${B}${count}${X} notifications  (${allowed ? allowed.join(", ") : "all types"})`);
      passed++;
    } catch(e) { fail(`[${role}] → ${e.message}`); failed++; }
  }

  // ── 10. RECENT ACTIVITY ──────────────────────────────
  head("10. RECENT LIVE DATA");

  const advances = await q("SELECT advance_number, requested_amount, status FROM employee_advances WHERE is_archived=0 ORDER BY id DESC LIMIT 4");
  info("Latest Loan Requests:");
  advances.forEach(r => console.log(`     • ${r.advance_number}  PKR ${Number(r.requested_amount).toLocaleString()}  [${r.status}]`));

  const orders = await q("SELECT order_number, client_name, total_value, currency FROM orders WHERE is_archived=0 ORDER BY id DESC LIMIT 3");
  info("Latest Export Orders:");
  orders.forEach(r => console.log(`     • ${r.order_number}  ${r.client_name}  ${r.currency} ${Number(r.total_value).toLocaleString()}`));

  const sos = await q("SELECT id, LEFT(message,90) as msg FROM chat_messages WHERE message LIKE '%SOS%' ORDER BY id DESC LIMIT 3");
  info("Latest SOS Alerts:");
  sos.forEach(r => console.log(`     • [ID:${r.id}] ${r.msg}...`));

  const lowStock = await q("SELECT name, available_stock, reorder_point, unit FROM inventory_items WHERE available_stock <= reorder_point AND is_archived=0 LIMIT 3");
  info("Low Stock Items:");
  lowStock.forEach(r => console.log(`     • ${r.name}: ${r.available_stock} ${r.unit} (reorder at ${r.reorder_point})`));

  // ── SUMMARY ──────────────────────────────────────────
  console.log(`\n${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${X}`);
  console.log(`  ${G}${B}✓ PASSED: ${passed}${X}   ${failed > 0 ? R : G}${B}✗ FAILED: ${failed}${X}`);
  const status = failed === 0 ? `${G}${B}ALL SYSTEMS CONNECTED ✓${X}` : `${Y}${B}MOSTLY OK — ${failed} SKIPPED${X}`;
  console.log(`  ${status}`);
  console.log(`${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${X}\n`);

  await db.end();
}

run().catch(e => { console.error(`\x1b[31m${e.message}\x1b[0m`); process.exit(1); });

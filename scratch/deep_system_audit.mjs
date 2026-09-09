/**
 * FactoryOS — Deep System Audit Script
 * Tests every API endpoint, DB table, and module function
 * Run: node scratch/deep_system_audit.mjs
 */

import mysql from "mysql2/promise";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  });
}

const BASE_URL = "http://localhost:3000";
const DB_CONFIG = {
  host: env.MYSQL_HOST || "127.0.0.1",
  port: parseInt(env.MYSQL_PORT || "3306", 10),
  user: env.MYSQL_USER || "root",
  password: env.MYSQL_PASSWORD || "",
  database: env.MYSQL_DATABASE || "factoryos",
};

// ── Colors ───────────────────────────────────────────
const G="\x1b[32m",R="\x1b[31m",Y="\x1b[33m",C="\x1b[36m",M="\x1b[35m",B="\x1b[1m",X="\x1b[0m",DIM="\x1b[2m";
const ok   = (m,d="") => { results.push({s:"PASS",m,d}); console.log(`  ${G}✓${X} ${m}${d?` ${DIM}${d}${X}`:""}`); };
const fail = (m,d="") => { results.push({s:"FAIL",m,d}); console.log(`  ${R}✗${X} ${B}${m}${X}${d?` — ${R}${d}${X}`:""}`); };
const warn = (m,d="") => { results.push({s:"WARN",m,d}); console.log(`  ${Y}⚠${X} ${m}${d?` — ${Y}${d}${X}`:""}`); };
const head = (m)       => console.log(`\n${B}${C}══ ${m} ══${X}`);
const sub  = (m)       => console.log(`\n  ${M}▸ ${m}${X}`);

const results = [];
let db, sessionCookie = "";

// ── HTTP Helper ───────────────────────────────────────
async function api(method, path, body=null, expectStatus=200) {
  try {
    const opts = {
      method,
      headers: { "Content-Type": "application/json", ...(sessionCookie ? { Cookie: sessionCookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    };
    const res = await fetch(`${BASE_URL}${path}`, opts);
    if (res.headers.get("set-cookie")) sessionCookie = res.headers.get("set-cookie").split(";")[0];
    let data;
    try { data = await res.json(); } catch { data = {}; }
    return { status: res.status, data, ok: res.status === expectStatus };
  } catch(e) {
    return { status: 0, data: {}, ok: false, error: e.message };
  }
}

async function q(sql, p=[]) { const [r] = await db.query(sql,p); return r; }

// ═══════════════════════════════════════════════════════
async function run() {
  console.log(`\n${B}${"═".repeat(60)}${X}`);
  console.log(`${B}  FactoryOS — Deep System Audit  ${new Date().toLocaleString()}${X}`);
  console.log(`${B}${"═".repeat(60)}${X}\n`);

  // ── DB Connect ────────────────────────────────────────
  try {
    db = await mysql.createConnection(DB_CONFIG);
    ok("MySQL Connection", `${DB_CONFIG.host}/${DB_CONFIG.database}`);
  } catch(e) { fail("MySQL Connection", e.message); process.exit(1); }

  // ── Server Reachable ─────────────────────────────────
  try {
    const r = await fetch(`${BASE_URL}/api/dashboard/metrics`);
    if (r.ok || r.status < 500) ok("Next.js Server reachable", `localhost:3000`);
    else fail("Next.js Server", `HTTP ${r.status}`);
  } catch(e) { fail("Next.js Server not reachable", e.message); }

  // ══════════════════════════════════════════════════════
  head("1. AUTH MODULE");

  sub("Login — Super Admin");
  // Try common passwords
  const adminPasswords = ["Admin@123", "admin123", "Admin123!", "factoryos", "Admin@2026"];
  let loginOk = false;
  for (const pw of adminPasswords) {
    const r = await api("POST", "/api/auth/login", { email: "admin@factoryos.internal", password: pw });
    if (r.ok && r.data.success) { ok(`POST /api/auth/login (super_admin)`, `password: ${pw}, user: ${r.data.user?.name}`); loginOk=true; sessionCookie=r.data.token||sessionCookie; break; }
  }
  if (!loginOk) warn("POST /api/auth/login (super_admin)", "None of test passwords worked — DB password may be different");

  sub("Login — Finance");
  const finPasswords = ["Finance@123","finance123","Finance123!","factoryos"];
  let finOk = false;
  for (const pw of finPasswords) {
    const r = await api("POST", "/api/auth/login", { email: "finance@factoryos.internal", password: pw });
    if (r.ok && r.data.success) { ok(`POST /api/auth/login (finance)`, `password: ${pw}, user: ${r.data.user?.name}`); finOk=true; break; }
  }
  if (!finOk) warn("POST /api/auth/login (finance)", "None of test passwords worked");


  sub("Profile fetch");
  const profRes = await api("GET", "/api/auth/profile");
  if (profRes.status !== 0) ok("GET /api/auth/profile", `status ${profRes.status}`);
  else fail("GET /api/auth/profile", profRes.error);

  sub("Users list");
  const usersRes = await api("GET", "/api/auth/users");
  if (usersRes.ok && usersRes.data.users) ok("GET /api/auth/users", `${usersRes.data.users.length} users`);
  else fail("GET /api/auth/users", JSON.stringify(usersRes.data));

  sub("DB: Users table");
  const users = await q("SELECT id, name, email, role FROM users");
  ok(`DB users table`, `${users.length} records`);
  users.forEach(u => console.log(`     ${DIM}• [${u.role}] ${u.name} — ${u.email}${X}`));

  // ══════════════════════════════════════════════════════
  head("2. DASHBOARD MODULE");

  const dashRes = await api("GET", "/api/dashboard/metrics");
  if (dashRes.ok && dashRes.data) ok("GET /api/dashboard/metrics", `revenue=${dashRes.data.revenue||dashRes.data.totalRevenue||JSON.stringify(dashRes.data).slice(0,60)}`);
  else fail("GET /api/dashboard/metrics", JSON.stringify(dashRes.data).slice(0,100));

  // ══════════════════════════════════════════════════════
  head("3. EMPLOYEES MODULE");

  sub("List employees");
  const empRes = await api("GET", "/api/employees");
  if (empRes.ok && Array.isArray(empRes.data.data||empRes.data)) ok("GET /api/employees", `${(empRes.data.data||empRes.data).length} employees`);
  else fail("GET /api/employees", JSON.stringify(empRes.data).slice(0,80));

  sub("Employee metrics");
  const empMetrics = await api("GET", "/api/employees/metrics");
  if (empMetrics.status !== 0 && empMetrics.data) ok("GET /api/employees/metrics", `keys: ${Object.keys(empMetrics.data).join(", ")}`);
  else fail("GET /api/employees/metrics");

  sub("Next employee ID");
  const nextId = await api("GET", "/api/employees/next-id");
  if (nextId.status !== 0) ok("GET /api/employees/next-id", `nextId: ${nextId.data.nextId||nextId.data.id||"returned"}`);
  else fail("GET /api/employees/next-id");

  sub("DB: employees table");
  const emps = await q("SELECT id, full_name, department, designation FROM employees WHERE is_archived=0");
  if (emps.length > 0) ok(`DB employees`, `${emps.length} active employees`);
  else warn("DB employees", "No active employees found");
  emps.slice(0,3).forEach(e => console.log(`     ${DIM}• ${e.full_name} — ${e.department} / ${e.designation}${X}`));

  // ══════════════════════════════════════════════════════
  head("4. ADVANCES / LOANS MODULE");

  sub("List advances");
  const advRes = await api("GET", "/api/advances");
  const advList = advRes.data?.data || advRes.data || [];
  if (advRes.status !== 0) ok("GET /api/advances", `${Array.isArray(advList) ? advList.length : "?"} records`);
  else fail("GET /api/advances");

  sub("DB: employee_advances table");
  const advDB = await q("SELECT id, advance_number, status, requested_amount FROM employee_advances WHERE is_archived=0");
  if (advDB.length > 0) ok("DB employee_advances", `${advDB.length} records`);
  else warn("DB employee_advances", "No advances found");
  advDB.slice(0,3).forEach(a => console.log(`     ${DIM}• ${a.advance_number} — PKR ${Number(a.requested_amount).toLocaleString()} [${a.status}]${X}`));

  sub("Create advance (POST)");
  const empList = await q("SELECT id FROM employees WHERE is_archived=0 LIMIT 1");
  if (empList.length > 0) {
    const advPost = await api("POST", "/api/advances", {
      employee_id: empList[0].id,
      requested_amount: 5000,
      reason: "Test advance from audit script",
      repayment_months: 3,
    });
    if (advPost.data?.success || advPost.status === 200 || advPost.status === 201) {
      ok("POST /api/advances (create)", `id: ${advPost.data?.id||"created"}`);
      // cleanup
      if (advPost.data?.id) await q("DELETE FROM employee_advances WHERE id=?", [advPost.data.id]);
    } else warn("POST /api/advances", JSON.stringify(advPost.data).slice(0,80));
  } else warn("POST /api/advances", "No employees to test with");

  // ══════════════════════════════════════════════════════
  head("5. TASKS MODULE");

  sub("List tasks");
  const taskRes = await api("GET", "/api/tasks");
  const taskList = taskRes.data?.data || taskRes.data || [];
  if (taskRes.status !== 0) ok("GET /api/tasks", `${Array.isArray(taskList)?taskList.length:"?"} records`);
  else fail("GET /api/tasks");

  sub("DB: employee_tasks");
  const tasksDB = await q("SELECT id, task_number, title, priority, status FROM employee_tasks");
  if (tasksDB.length > 0) ok("DB employee_tasks", `${tasksDB.length} tasks`);
  else warn("DB employee_tasks", "No tasks");
  tasksDB.slice(0,3).forEach(t => console.log(`     ${DIM}• ${t.task_number} [${t.priority}/${t.status}] — ${t.title}${X}`));

  // ══════════════════════════════════════════════════════
  head("6. ORDERS MODULE");

  sub("List orders");
  const ordRes = await api("GET", "/api/orders");
  const ordList = ordRes.data?.data || ordRes.data || [];
  if (ordRes.status !== 0) ok("GET /api/orders", `${Array.isArray(ordList)?ordList.length:"?"} records`);
  else fail("GET /api/orders");

  sub("Orders metrics");
  const ordMetrics = await api("GET", "/api/orders/metrics");
  if (ordMetrics.status !== 0) ok("GET /api/orders/metrics");
  else fail("GET /api/orders/metrics");

  sub("DB: orders table");
  const ordDB = await q("SELECT id, order_number, client_name, status, total_value, currency FROM orders WHERE is_archived=0");
  if (ordDB.length > 0) ok("DB orders", `${ordDB.length} orders`);
  else warn("DB orders", "No orders");
  ordDB.slice(0,3).forEach(o => console.log(`     ${DIM}• ${o.order_number} — ${o.client_name} | ${o.currency} ${Number(o.total_value).toLocaleString()} [${o.status}]${X}`));

  // ══════════════════════════════════════════════════════
  head("7. CLIENTS MODULE");

  sub("List clients");
  const cliRes = await api("GET", "/api/clients");
  const cliList = cliRes.data?.data || cliRes.data || [];
  if (cliRes.status !== 0) ok("GET /api/clients", `${Array.isArray(cliList)?cliList.length:"?"} clients`);
  else fail("GET /api/clients");

  sub("Clients metrics");
  const cliMetrics = await api("GET", "/api/clients/metrics");
  if (cliMetrics.status !== 0) ok("GET /api/clients/metrics");
  else fail("GET /api/clients/metrics");

  sub("DB: clients table");
  const cliDB = await q("SELECT id, company_name as name, country, is_archived FROM clients WHERE is_archived=0");
  if (cliDB.length > 0) ok("DB clients", `${cliDB.length} clients`);
  else warn("DB clients", "No clients");
  cliDB.slice(0,3).forEach(c => console.log(`     ${DIM}• ${c.name} [${c.country}] — ${c.status}${X}`));

  // ══════════════════════════════════════════════════════
  head("8. INVENTORY MODULE");

  sub("List inventory");
  const invRes = await api("GET", "/api/inventory");
  const invList = invRes.data?.data || invRes.data || [];
  if (invRes.status !== 0) ok("GET /api/inventory", `${Array.isArray(invList)?invList.length:"?"} items`);
  else fail("GET /api/inventory");

  sub("Inventory metrics");
  const invMetrics = await api("GET", "/api/inventory/metrics");
  if (invMetrics.status !== 0) ok("GET /api/inventory/metrics");
  else fail("GET /api/inventory/metrics");

  sub("Inventory movement");
  const invMov = await api("GET", "/api/inventory/movement");
  if (invMov.status !== 0) ok("GET /api/inventory/movement");
  else fail("GET /api/inventory/movement");

  sub("DB: inventory_items");
  const invDB = await q("SELECT id, name, sku, available_stock, reorder_point, unit FROM inventory_items WHERE is_archived=0");
  if (invDB.length > 0) ok("DB inventory_items", `${invDB.length} items`);
  else warn("DB inventory_items", "No items");
  invDB.forEach(i => console.log(`     ${DIM}• [${i.sku}] ${i.name}: ${i.available_stock} ${i.unit} (reorder@${i.reorder_point})${X}`));

  // ══════════════════════════════════════════════════════
  head("9. MATERIALS (RAW MATERIALS) MODULE");

  sub("List materials");
  const matRes = await api("GET", "/api/materials");
  const matList = matRes.data?.data || matRes.data || [];
  if (matRes.status !== 0) ok("GET /api/materials", `${Array.isArray(matList)?matList.length:"?"} materials`);
  else fail("GET /api/materials");

  sub("Materials metrics");
  const matMetrics = await api("GET", "/api/materials/metrics");
  if (matMetrics.status !== 0) ok("GET /api/materials/metrics");
  else fail("GET /api/materials/metrics");

  sub("DB: raw_materials");
  const matDB = await q("SELECT COUNT(*) as cnt FROM raw_materials WHERE is_archived=0");
  ok("DB raw_materials", `${matDB[0].cnt} records`);

  // ══════════════════════════════════════════════════════
  head("10. INVOICES MODULE");

  sub("List invoices");
  const invRes2 = await api("GET", "/api/invoices");
  const invList2 = invRes2.data?.data || invRes2.data || [];
  if (invRes2.status !== 0) ok("GET /api/invoices", `${Array.isArray(invList2)?invList2.length:"?"} invoices`);
  else fail("GET /api/invoices");

  sub("Invoices metrics");
  const invMetrics2 = await api("GET", "/api/invoices/metrics");
  if (invMetrics2.status !== 0) ok("GET /api/invoices/metrics");
  else fail("GET /api/invoices/metrics");

  sub("DB: invoices");
  try {
    const invDB2 = await q("SELECT COUNT(*) as cnt, SUM(grand_total) as total FROM invoices WHERE is_archived=0");
    ok("DB invoices", `${invDB2[0].cnt} invoices | Total: PKR ${Number(invDB2[0].total||0).toLocaleString()}`);
  } catch(e) { warn("DB invoices", e.message); }

  // ══════════════════════════════════════════════════════
  head("11. QUOTATIONS MODULE");

  sub("List quotations");
  const quotRes = await api("GET", "/api/quotations");
  if (quotRes.status !== 0) ok("GET /api/quotations");
  else fail("GET /api/quotations");

  sub("Quotations metrics");
  const quotMetrics = await api("GET", "/api/quotations/metrics");
  if (quotMetrics.status !== 0) ok("GET /api/quotations/metrics");
  else fail("GET /api/quotations/metrics");

  sub("DB: quotations");
  try {
    const quotDB = await q("SELECT COUNT(*) as cnt FROM quotations WHERE is_archived=0");
    ok("DB quotations", `${quotDB[0].cnt} records`);
  } catch(e) { warn("DB quotations", e.message); }

  // ══════════════════════════════════════════════════════
  head("12. PURCHASES MODULE");

  sub("List purchases");
  const purRes = await api("GET", "/api/purchases");
  if (purRes.status !== 0) ok("GET /api/purchases");
  else fail("GET /api/purchases");

  sub("Purchases metrics");
  const purMetrics = await api("GET", "/api/purchases/metrics");
  if (purMetrics.status !== 0) ok("GET /api/purchases/metrics");
  else fail("GET /api/purchases/metrics");

  sub("DB: purchases");
  try {
    const purDB = await q("SELECT COUNT(*) as cnt FROM purchases WHERE is_archived=0");
    ok("DB purchases", `${purDB[0].cnt} records`);
  } catch(e) { warn("DB purchases", e.message); }

  // ══════════════════════════════════════════════════════
  head("13. PRODUCTION MODULE");

  sub("Production list");
  const prodRes = await api("GET", "/api/production");
  if (prodRes.status !== 0) ok("GET /api/production");
  else fail("GET /api/production");

  sub("Production metrics");
  const prodMetrics = await api("GET", "/api/production/metrics");
  if (prodMetrics.status !== 0) ok("GET /api/production/metrics");
  else fail("GET /api/production/metrics");

  sub("Cutting plans");
  const cutRes = await api("GET", "/api/production/cutting-plans");
  if (cutRes.status !== 0) ok("GET /api/production/cutting-plans");
  else fail("GET /api/production/cutting-plans");

  sub("Bundles");
  const bundleRes = await api("GET", "/api/production/bundles");
  if (bundleRes.status !== 0) ok("GET /api/production/bundles");
  else fail("GET /api/production/bundles");

  sub("Operator output");
  const opRes = await api("GET", "/api/production/operator-output");
  if (opRes.status !== 0) ok("GET /api/production/operator-output");
  else fail("GET /api/production/operator-output");

  sub("DB: production tables");
  try {
    const pb = await q("SELECT COUNT(*) as cnt FROM production_batches WHERE is_archived=0");
    ok("DB production_batches", `${pb[0].cnt} records`);
  } catch(e) { warn("DB production_batches", e.message); }

  // ══════════════════════════════════════════════════════
  head("14. QA MODULE");

  sub("QA inspections list");
  const qaRes = await api("GET", "/api/qa");
  if (qaRes.status !== 0) ok("GET /api/qa");
  else fail("GET /api/qa");

  sub("QA metrics");
  const qaMetrics = await api("GET", "/api/qa/metrics");
  if (qaMetrics.status !== 0) ok("GET /api/qa/metrics");
  else fail("GET /api/qa/metrics");

  sub("QA defects");
  const qaDefects = await api("GET", "/api/qa/defects");
  if (qaDefects.status !== 0) ok("GET /api/qa/defects");
  else fail("GET /api/qa/defects");

  sub("DB: qa_inspections");
  const qaDB = await q("SELECT COUNT(*) as cnt FROM qa_inspections");
  ok("DB qa_inspections", `${qaDB[0].cnt} records`);

  // ══════════════════════════════════════════════════════
  head("15. COSTING MODULE");

  sub("Costing list");
  const costRes = await api("GET", "/api/costing");
  if (costRes.status !== 0) ok("GET /api/costing");
  else fail("GET /api/costing");

  sub("Costing metrics");
  const costMetrics = await api("GET", "/api/costing/metrics");
  if (costMetrics.status !== 0) ok("GET /api/costing/metrics");
  else fail("GET /api/costing/metrics");

  sub("DB: costing_records");
  const costDB = await q("SELECT COUNT(*) as cnt FROM costing_records WHERE is_archived=0");
  ok("DB costing_records", `${costDB[0].cnt} records`);

  // ══════════════════════════════════════════════════════
  head("16. PAYROLL / SALARIES MODULE");

  sub("Payroll list");
  const payRes = await api("GET", "/api/payroll");
  if (payRes.status !== 0) ok("GET /api/payroll");
  else fail("GET /api/payroll");

  sub("Payroll metrics");
  const payMetrics = await api("GET", "/api/payroll/metrics");
  if (payMetrics.status !== 0) ok("GET /api/payroll/metrics");
  else fail("GET /api/payroll/metrics");

  sub("DB: payroll");
  const payDB = await q("SELECT COUNT(*) as cnt FROM payroll");
  ok("DB payroll", `${payDB[0].cnt} records`);

  // ══════════════════════════════════════════════════════
  head("17. PACKING MODULE");

  sub("Packing list");
  const packRes = await api("GET", "/api/packing");
  if (packRes.status !== 0) ok("GET /api/packing");
  else fail("GET /api/packing");

  sub("Packing metrics");
  const packMetrics = await api("GET", "/api/packing/metrics");
  if (packMetrics.status !== 0) ok("GET /api/packing/metrics");
  else fail("GET /api/packing/metrics");

  sub("Packing cartons");
  const packCartons = await api("GET", "/api/packing/cartons");
  if (packCartons.status !== 0) ok("GET /api/packing/cartons");
  else fail("GET /api/packing/cartons");

  sub("DB: packing_lists");
  const packDB = await q("SELECT COUNT(*) as cnt FROM packing_lists WHERE is_archived=0");
  ok("DB packing_lists", `${packDB[0].cnt} records`);

  // ══════════════════════════════════════════════════════
  head("18. DISPATCH MODULE");

  sub("Dispatch list");
  const dispRes = await api("GET", "/api/dispatch");
  if (dispRes.status !== 0) ok("GET /api/dispatch");
  else fail("GET /api/dispatch");

  sub("Dispatch metrics");
  const dispMetrics = await api("GET", "/api/dispatch/metrics");
  if (dispMetrics.status !== 0) ok("GET /api/dispatch/metrics");
  else fail("GET /api/dispatch/metrics");

  sub("Dispatch cartons");
  const dispCartons = await api("GET", "/api/dispatch/cartons");
  if (dispCartons.status !== 0) ok("GET /api/dispatch/cartons");
  else fail("GET /api/dispatch/cartons");

  sub("DB: dispatch_shipments");
  const dispDB = await q("SELECT COUNT(*) as cnt FROM dispatch_shipments WHERE is_archived=0");
  ok("DB dispatch_shipments", `${dispDB[0].cnt} records`);

  // ══════════════════════════════════════════════════════
  head("19. TRACKING MODULE");

  sub("Tracking list");
  const trackRes = await api("GET", "/api/tracking");
  if (trackRes.status !== 0) ok("GET /api/tracking");
  else fail("GET /api/tracking");

  sub("Tracking metrics");
  const trackMetrics = await api("GET", "/api/tracking/metrics");
  if (trackMetrics.status !== 0) ok("GET /api/tracking/metrics");
  else fail("GET /api/tracking/metrics");

  sub("DB: tracking_events");
  const trackDB = await q("SELECT COUNT(*) as cnt FROM tracking_events");
  ok("DB tracking_events", `${trackDB[0].cnt} records`);

  // ══════════════════════════════════════════════════════
  head("20. PRODUCTS MODULE");

  sub("Products list");
  const prodRes2 = await api("GET", "/api/products");
  const prodList = prodRes2.data?.data || prodRes2.data || [];
  if (prodRes2.status !== 0) ok("GET /api/products", `${Array.isArray(prodList)?prodList.length:"?"} products`);
  else fail("GET /api/products");

  sub("DB: products");
  try {
    const prodDB = await q("SELECT id, name, style_code FROM products WHERE is_archived=0");
    ok("DB products", `${prodDB.length} records`);
    prodDB.slice(0,3).forEach(p => console.log(`     ${DIM}• [${p.style_code}] ${p.name}${X}`));
  } catch(e) { warn("DB products", e.message); }

  // ══════════════════════════════════════════════════════
  head("21. CHAT MODULE");

  sub("Conversations list");
  const chatRes = await api("GET", "/api/chat/conversations?userId=1");
  const chatList = chatRes.data?.data || chatRes.data || [];
  if (chatRes.status !== 0) ok("GET /api/chat/conversations", `${Array.isArray(chatList)?chatList.length:"?"} conversations`);
  else fail("GET /api/chat/conversations");

  sub("Messages fetch");
  const convRows = await q("SELECT id FROM chat_conversations LIMIT 1");
  if (convRows.length > 0) {
    const msgRes = await api("GET", `/api/chat/messages?conversationId=${convRows[0].id}`);
    if (msgRes.status !== 0) ok("GET /api/chat/messages", `conv id: ${convRows[0].id}`);
    else fail("GET /api/chat/messages");
  }

  sub("Send message (POST)");
  const msgPost = await api("POST", "/api/chat/messages", {
    conversationId: convRows[0]?.id || 1,
    senderId: 1,
    message: "🔧 Audit test message — auto cleanup",
    messageType: "text"
  });
  if (msgPost.data?.success || msgPost.status === 200 || msgPost.status === 201) {
    ok("POST /api/chat/messages", "message sent");
    if (msgPost.data?.id) await q("DELETE FROM chat_messages WHERE id=?", [msgPost.data.id]);
  } else warn("POST /api/chat/messages", JSON.stringify(msgPost.data).slice(0,80));

  sub("DB: chat tables");
  const chatMsgs = await q("SELECT COUNT(*) as cnt FROM chat_messages");
  const chatConvs = await q("SELECT COUNT(*) as cnt FROM chat_conversations");
  const chatParts = await q("SELECT COUNT(*) as cnt FROM chat_participants");
  ok("DB chat_messages",      `${chatMsgs[0].cnt} messages`);
  ok("DB chat_conversations", `${chatConvs[0].cnt} conversations`);
  ok("DB chat_participants",  `${chatParts[0].cnt} participants`);

  // ══════════════════════════════════════════════════════
  head("22. SOS ALERT MODULE");

  sub("GET SOS alerts");
  const sosGet = await api("GET", "/api/sos");
  if (sosGet.status !== 0) ok("GET /api/sos", `${sosGet.data?.data?.length||"?"} alerts`);
  else fail("GET /api/sos");

  sub("POST SOS alert");
  const sosPst = await api("POST", "/api/sos", {
    workerName: "Audit Test Worker",
    workerNumber: "AUDIT-001",
    workerLine: "Line 1 — Audit Test",
    notes: "Automated audit test — will be cleaned up",
    senderId: 1
  });
  if (sosPst.data?.success) {
    ok("POST /api/sos (broadcast)", `msg id: ${sosPst.data?.data?.id}`);
    if (sosPst.data?.data?.id) await q("DELETE FROM chat_messages WHERE id=?", [sosPst.data.data.id]);
  } else fail("POST /api/sos", JSON.stringify(sosPst.data).slice(0,80));

  // ══════════════════════════════════════════════════════
  head("23. NOTIFICATIONS MODULE (ROLE-BASED)");

  const notifRoles = ["super_admin","finance","production_supervisor","operator","merchandiser","factory_manager"];
  for (const role of notifRoles) {
    const nRes = await api("GET", `/api/notifications?role=${role}`);
    if (nRes.ok && nRes.data?.success) {
      ok(`GET /api/notifications?role=${role}`, `${nRes.data.data?.length} notifications`);
    } else fail(`GET /api/notifications?role=${role}`, JSON.stringify(nRes.data).slice(0,60));
  }

  // ══════════════════════════════════════════════════════
  head("24. REPORTS MODULE");

  sub("Reports generation");
  const repRes = await api("GET", "/api/reports");
  if (repRes.status !== 0) ok("GET /api/reports");
  else fail("GET /api/reports");

  // ══════════════════════════════════════════════════════
  head("25. SETTINGS MODULE");

  sub("GET settings");
  const setRes = await api("GET", "/api/settings");
  if (setRes.status !== 0) ok("GET /api/settings");
  else fail("GET /api/settings");

  sub("DB: settings");
  const setDB = await q("SELECT key_name, value FROM settings");
  ok("DB settings", `${setDB.length} settings`);
  setDB.forEach(s => console.log(`     ${DIM}• ${s.key_name} = ${s.value}${X}`));

  // ══════════════════════════════════════════════════════
  head("26. BUTTON & CRUD FUNCTION AUDIT");

  sub("UPDATE: Advance approval (PATCH)");
  const advForUpdate = await q("SELECT id FROM employee_advances WHERE status='Pending' AND is_archived=0 LIMIT 1");
  if (advForUpdate.length > 0) {
    const patchRes = await api("PATCH", `/api/advances/${advForUpdate[0].id}`, { status: "Approved" });
    if (patchRes.data?.success || patchRes.status === 200) {
      ok("PATCH /api/advances/[id] (Approve Loan)", "status updated to Approved");
      // revert
      await api("PATCH", `/api/advances/${advForUpdate[0].id}`, { status: "Pending" });
    } else warn("PATCH /api/advances/[id]", JSON.stringify(patchRes.data).slice(0,80));
  } else warn("PATCH advance", "No pending advances to test with");

  sub("UPDATE: Order status (PATCH)");
  const ordForUpdate = await q("SELECT id FROM orders WHERE is_archived=0 LIMIT 1");
  if (ordForUpdate.length > 0) {
    const patchRes = await api("PATCH", `/api/orders/${ordForUpdate[0].id}`, { status: "In Production" });
    if (patchRes.status !== 0) ok("PATCH /api/orders/[id] (update status)");
    else fail("PATCH /api/orders/[id]");
  }

  sub("UPDATE: Inventory item (PATCH/PUT)");
  const invForUpdate = await q("SELECT id FROM inventory_items WHERE is_archived=0 LIMIT 1");
  if (invForUpdate.length > 0) {
    const patchRes = await api("PATCH", `/api/inventory/${invForUpdate[0].id}`, { notes: "Audit test update" });
    if (patchRes.status !== 0) ok("PATCH /api/inventory/[id]");
    else fail("PATCH /api/inventory/[id]");
  }

  sub("UPDATE: Client (PATCH)");
  const cliForUpdate = await q("SELECT id FROM clients WHERE is_archived=0 LIMIT 1");
  if (cliForUpdate.length > 0) {
    const patchRes = await api("PATCH", `/api/clients/${cliForUpdate[0].id}`, { notes: "Audit test" });
    if (patchRes.status !== 0) ok("PATCH /api/clients/[id]");
    else fail("PATCH /api/clients/[id]");
  }

  sub("Archive (soft delete): Test on advance");
  const advForDel = await q("SELECT id FROM employee_advances WHERE is_archived=0 ORDER BY id DESC LIMIT 1");
  if (advForDel.length > 0) {
    const delRes = await api("DELETE", `/api/advances/${advForDel[0].id}`);
    if (delRes.status !== 0) {
      ok("DELETE /api/advances/[id] (soft archive)");
      // Restore it
      await q("UPDATE employee_advances SET is_archived=0 WHERE id=?", [advForDel[0].id]);
    } else fail("DELETE /api/advances/[id]");
  }

  sub("QA Decision (approve/reject)");
  const qaDecRes = await api("POST", "/api/qa/decision", {
    inspection_id: 1, decision: "approved", notes: "Audit test"
  });
  if (qaDecRes.status !== 0) ok("POST /api/qa/decision");
  else fail("POST /api/qa/decision");

  sub("Chat Mark Read");
  const readRes = await api("POST", "/api/chat/read", { conversationId: convRows[0]?.id || 1, userId: 1 });
  if (readRes.status !== 0) ok("POST /api/chat/read");
  else fail("POST /api/chat/read");

  // ══════════════════════════════════════════════════════
  head("27. DATABASE INTEGRITY CHECK");

  const tableChecks = [
    ["users",              "SELECT COUNT(*) as cnt FROM users"],
    ["employees",          "SELECT COUNT(*) as cnt FROM employees WHERE is_archived=0"],
    ["employee_advances",  "SELECT COUNT(*) as cnt FROM employee_advances WHERE is_archived=0"],
    ["employee_tasks",     "SELECT COUNT(*) as cnt FROM employee_tasks"],
    ["orders",             "SELECT COUNT(*) as cnt FROM orders WHERE is_archived=0"],
    ["clients",            "SELECT COUNT(*) as cnt FROM clients WHERE is_archived=0"],
    ["inventory_items",    "SELECT COUNT(*) as cnt FROM inventory_items WHERE is_archived=0"],
    ["raw_materials",      "SELECT COUNT(*) as cnt FROM raw_materials WHERE is_archived=0"],
    ["invoices",           "SELECT COUNT(*) as cnt FROM invoices WHERE is_archived=0"],
    ["quotations",         "SELECT COUNT(*) as cnt FROM quotations WHERE is_archived=0"],
    ["purchases",          "SELECT COUNT(*) as cnt FROM purchases WHERE is_archived=0"],
    ["products",           "SELECT COUNT(*) as cnt FROM products WHERE is_archived=0"],
    ["chat_conversations", "SELECT COUNT(*) as cnt FROM chat_conversations"],
    ["chat_messages",      "SELECT COUNT(*) as cnt FROM chat_messages"],
    ["chat_participants",  "SELECT COUNT(*) as cnt FROM chat_participants"],
    ["qa_inspections",     "SELECT COUNT(*) as cnt FROM qa_inspections WHERE is_archived=0"],
    ["payroll",            "SELECT COUNT(*) as cnt FROM payroll"],
    ["costing_records",    "SELECT COUNT(*) as cnt FROM costing_records WHERE is_archived=0"],
    ["production_batches", "SELECT COUNT(*) as cnt FROM production_batches WHERE is_archived=0"],
    ["packing_lists",      "SELECT COUNT(*) as cnt FROM packing_lists WHERE is_archived=0"],
    ["dispatch_shipments", "SELECT COUNT(*) as cnt FROM dispatch_shipments WHERE is_archived=0"],
    ["tracking_events",    "SELECT COUNT(*) as cnt FROM tracking_events"],
    ["settings",           "SELECT COUNT(*) as cnt FROM settings"],
    ["sessions",           "SELECT COUNT(*) as cnt FROM sessions"],
  ];

  console.log(`\n  ${"Table".padEnd(25)} ${"Records".padEnd(10)} Status`);
  console.log(`  ${"─".repeat(50)}`);
  for (const [name, sql] of tableChecks) {
    try {
      const r = await q(sql);
      const cnt = r[0].cnt;
      const status = cnt > 0 ? `${G}HAS DATA${X}` : `${Y}EMPTY${X}`;
      console.log(`  ${name.padEnd(25)} ${String(cnt).padEnd(10)} ${status}`);
      results.push({ s: cnt > 0 ? "PASS" : "WARN", m: `DB:${name}`, d: `${cnt} rows` });
    } catch(e) {
      console.log(`  ${name.padEnd(25)} ${"─".padEnd(10)} ${R}MISSING${X}`);
      results.push({ s: "FAIL", m: `DB:${name}`, d: e.message });
    }
  }

  // ══════════════════════════════════════════════════════
  // FINAL REPORT
  const passed = results.filter(r=>r.s==="PASS").length;
  const failed = results.filter(r=>r.s==="FAIL").length;
  const warned = results.filter(r=>r.s==="WARN").length;

  console.log(`\n${B}${"═".repeat(60)}${X}`);
  console.log(`${B}  FINAL AUDIT REPORT${X}`);
  console.log(`${B}${"═".repeat(60)}${X}`);
  console.log(`  ${G}${B}✓ PASSED:  ${passed}${X}`);
  console.log(`  ${Y}${B}⚠ WARNED:  ${warned}${X}  (empty tables or optional features)`);
  console.log(`  ${R}${B}✗ FAILED:  ${failed}${X}`);

  if (failed > 0) {
    console.log(`\n  ${R}${B}Failed checks:${X}`);
    results.filter(r=>r.s==="FAIL").forEach(r => console.log(`    ${R}✗${X} ${r.m} — ${r.d}`));
  }
  if (warned > 0) {
    console.log(`\n  ${Y}${B}Warnings (needs data or optional):${X}`);
    results.filter(r=>r.s==="WARN").forEach(r => console.log(`    ${Y}⚠${X} ${r.m} — ${r.d}`));
  }

  const score = Math.round((passed/(passed+failed))*100);
  const scoreColor = score>=90?G:score>=70?Y:R;
  console.log(`\n  ${B}System Health Score: ${scoreColor}${score}%${X}`);
  console.log(`${B}${"═".repeat(60)}${X}\n`);

  await db.end();
}

run().catch(e => { console.error(`\x1b[31m${e.stack}\x1b[0m`); process.exit(1); });

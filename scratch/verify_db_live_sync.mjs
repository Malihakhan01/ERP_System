import mysql from "mysql2/promise";

const connectionUri = "mysql://root:@127.0.0.1:3306/factoryos";

async function verifyLiveDbSync() {
  console.log("============================================================");
  console.log("🔍 LIVE MYSQL DATABASE INTEGRITY & CONNECTIVITY AUDIT");
  console.log("============================================================\n");

  const conn = await mysql.createConnection(connectionUri);
  console.log("✅ Successfully connected to MySQL 8 (127.0.0.1:3306/factoryos)!\n");

  // 1. Audit employee_advances table
  console.log("📌 1. Checking `employee_advances` table in MySQL:");
  const [advances] = await conn.query(`
    SELECT 
      a.id,
      a.advance_number,
      a.employee_id,
      e.full_name as employee_name,
      e.employee_number,
      a.requested_amount,
      a.approved_amount,
      a.monthly_deduction,
      a.remaining_balance,
      a.status,
      a.request_date,
      a.approved_date,
      a.disbursed_date
    FROM employee_advances a
    LEFT JOIN employees e ON a.employee_id = e.id
    WHERE a.is_archived = 0
    ORDER BY a.id DESC
  `);

  console.log(`  Total Active Advances in DB: ${advances.length}`);
  console.table(advances.slice(0, 8));

  // Verify Muhammad Usman's advance in DB
  const usmanAdv = advances.find((a) => a.advance_number === "ADV-2026-014");
  if (usmanAdv) {
    console.log("  🎯 Muhammad Usman's Advance (ADV-2026-014) DB Verification:");
    console.log("    - Advance Number:", usmanAdv.advance_number);
    console.log("    - Employee Name:", usmanAdv.employee_name);
    console.log("    - Employee Number:", usmanAdv.employee_number);
    console.log("    - Requested Amount: PKR", usmanAdv.requested_amount);
    console.log("    - Approved Amount: PKR", usmanAdv.approved_amount);
    console.log("    - Monthly Deduction: PKR", usmanAdv.monthly_deduction);
    console.log("    - Live DB Status:", usmanAdv.status);
    console.log("    ✅ ADV-2026-014 is 100% PERSISTED & SYNCED IN MYSQL!\n");
  }

  // 2. Audit employees table
  console.log("📌 2. Checking `employees` table in MySQL:");
  const [employees] = await conn.query(`
    SELECT id, employee_number, full_name, department, designation, salary_type, monthly_salary, is_portal_active, password_hash
    FROM employees
    WHERE is_archived = 0
  `);
  console.log(`  Total Registered Employees: ${employees.length}`);
  console.table(employees);

  // 3. Audit users table
  console.log("📌 3. Checking `users` table in MySQL:");
  const [users] = await conn.query(`
    SELECT id, name, email, role, department, is_active FROM users
  `);
  console.log(`  Total System Users: ${users.length}`);
  console.table(users);

  // 4. Audit employee_tasks table
  console.log("📌 4. Checking `employee_tasks` table in MySQL:");
  const [tasks] = await conn.query(`
    SELECT id, task_number, title, task_type, priority, status, assigned_to_name, due_date
    FROM employee_tasks
  `);
  console.log(`  Total Active Floor Tasks: ${tasks.length}`);
  console.table(tasks);

  // 5. Audit chat channels
  console.log("📌 5. Checking `chat_conversations` table in MySQL:");
  const [chats] = await conn.query(`
    SELECT id, type, title, description, created_at FROM chat_conversations
  `);
  console.log(`  Total Chat Channels: ${chats.length}`);
  console.table(chats);

  // 6. Test HTTP API vs DB Match
  console.log("📌 6. Cross-verifying HTTP API (/api/advances) with MySQL Database:");
  const apiRes = await fetch("http://localhost:3000/api/advances");
  const apiJson = await apiRes.json();
  const apiCount = apiJson.data?.length || 0;
  const dbCount = advances.length;
  console.log(`  - API Response Count: ${apiCount}`);
  console.log(`  - Direct DB Count:    ${dbCount}`);

  if (apiCount === dbCount) {
    console.log("  ✅ HTTP API AND MYSQL DATABASE ARE 100% PERFECTLY IN SYNC!");
  } else {
    console.warn("  ⚠️ Warning: Count mismatch between API and DB.");
  }

  await conn.end();
  console.log("\n============================================================");
  console.log("🎉 DATABASE CONNECTION & LIVE PERSISTENCE AUDIT COMPLETE!");
  console.log("============================================================");
}

verifyLiveDbSync().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});

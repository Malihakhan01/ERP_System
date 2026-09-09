import mysql from "mysql2/promise";

async function verifyDB() {
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "factoryos",
  });

  console.log("================ MySQL DATABASE VERIFICATION ================");

  // 1. SOS Alerts from chat_messages
  const [sos] = await conn.query(
    "SELECT id, conversation_id, message, created_at FROM chat_messages WHERE message LIKE '%SOS%' ORDER BY id DESC LIMIT 2"
  );
  console.log("\n1. Table `chat_messages` (Machine SOS Alerts):");
  console.table(sos);

  // 2. Pending Loans from employee_advances
  const [adv] = await conn.query(
    "SELECT id, advance_number, requested_amount, status, created_at FROM employee_advances WHERE status = 'Pending' ORDER BY id DESC LIMIT 3"
  );
  console.log("\n2. Table `employee_advances` (Pending Loan Requests):");
  console.table(adv);

  // 3. Urgent Tasks from employee_tasks
  const [tasks] = await conn.query(
    "SELECT id, task_number, title, priority, status FROM employee_tasks WHERE priority IN ('urgent', 'high') LIMIT 2"
  );
  console.log("\n3. Table `employee_tasks` (Urgent Floor Tasks):");
  console.table(tasks);

  await conn.end();
  console.log("==============================================================");
}

verifyDB().catch(console.error);

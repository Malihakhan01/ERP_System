// scratch/check_data.mjs
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "factoryos",
  });

  const [clients] = await conn.query("SELECT id, display_id, company_name, country FROM clients ORDER BY id DESC LIMIT 5");
  const [orders] = await conn.query("SELECT id, order_number, client_id, client_name, total_value FROM orders ORDER BY id DESC LIMIT 5");

  console.log("=== LATEST CLIENTS IN MYSQL ===");
  console.table(clients);

  console.log("\n=== LATEST ORDERS IN MYSQL ===");
  console.table(orders);

  await conn.end();
}

main().catch(console.error);

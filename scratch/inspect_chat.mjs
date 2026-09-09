import mysql from "mysql2/promise";

async function inspectChat() {
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "factoryos",
  });

  console.log("=== USERS IN DB ===");
  const [users] = await conn.query("SELECT id, name, email, role FROM users");
  console.table(users);

  console.log("\n=== CHAT CONVERSATIONS ===");
  const [convs] = await conn.query("SELECT id, uuid, type, title, created_by FROM chat_conversations");
  console.table(convs);

  console.log("\n=== CHAT PARTICIPANTS ===");
  const [parts] = await conn.query("SELECT conversation_id, user_id FROM chat_participants");
  console.table(parts);

  console.log("\n=== CHAT MESSAGES ===");
  const [msgs] = await conn.query("SELECT id, conversation_id, sender_id, message FROM chat_messages");
  console.table(msgs);

  await conn.end();
}

inspectChat().catch(console.error);

import mysql from "mysql2/promise";

const connectionUri = "mysql://root:@127.0.0.1:3306/factoryos";

async function migrateChat() {
  console.log("Connecting to MySQL 8 factoryos database...");
  const conn = await mysql.createConnection(connectionUri);

  console.log("Creating chat tables...");

  // 1. chat_conversations
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`chat_conversations\` (
      \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`uuid\` CHAR(36) NOT NULL UNIQUE,
      \`type\` ENUM('direct', 'channel') NOT NULL DEFAULT 'direct',
      \`title\` VARCHAR(150) NULL,
      \`description\` VARCHAR(255) NULL,
      \`created_by\` BIGINT UNSIGNED NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. chat_participants
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`chat_participants\` (
      \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`conversation_id\` BIGINT UNSIGNED NOT NULL,
      \`user_id\` BIGINT UNSIGNED NOT NULL,
      \`last_read_message_id\` BIGINT UNSIGNED NULL,
      \`last_read_at\` TIMESTAMP NULL,
      \`joined_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY \`uniq_conv_user\` (\`conversation_id\`, \`user_id\`),
      FOREIGN KEY (\`conversation_id\`) REFERENCES \`chat_conversations\` (\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. chat_messages
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`chat_messages\` (
      \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`uuid\` CHAR(36) NOT NULL UNIQUE,
      \`conversation_id\` BIGINT UNSIGNED NOT NULL,
      \`sender_id\` BIGINT UNSIGNED NOT NULL,
      \`message\` TEXT NOT NULL,
      \`message_type\` VARCHAR(20) NOT NULL DEFAULT 'text',
      \`attachment_url\` VARCHAR(255) NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_conv_created\` (\`conversation_id\`, \`created_at\`),
      FOREIGN KEY (\`conversation_id\`) REFERENCES \`chat_conversations\` (\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`sender_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("Chat tables successfully created!");

  // Seed default factory channels
  const [channels] = await conn.query("SELECT id, title FROM chat_conversations WHERE type = 'channel'");
  if (channels.length === 0) {
    console.log("Seeding default factory channels...");
    const [allUsers] = await conn.query("SELECT id FROM users");
    const userIds = allUsers.map((u) => u.id);

    const defaultChannels = [
      {
        uuid: "c1000000-0000-4000-8000-000000000001",
        title: "#general-announcements",
        description: "Factory-wide notices, shift schedules, and general operational alerts.",
      },
      {
        uuid: "c1000000-0000-4000-8000-000000000002",
        title: "#production-floor",
        description: "Sewing line updates, bundle progress, SMV targets, and machine downtime.",
      },
      {
        uuid: "c1000000-0000-4000-8000-000000000003",
        title: "#quality-alerts",
        description: "In-line QA findings, defect alerts, seam tolerance deviations.",
      },
      {
        uuid: "c1000000-0000-4000-8000-000000000004",
        title: "#accounts-commercial",
        description: "Commercial invoices, piece-rate payroll approvals, and vendor advances.",
      },
    ];

    for (const ch of defaultChannels) {
      const [res] = await conn.query(
        "INSERT INTO chat_conversations (uuid, type, title, description, created_by) VALUES (?, 'channel', ?, ?, 1)",
        [ch.uuid, ch.title, ch.description]
      );
      const convId = res.insertId;

      // Add all users to general channel, and at least admin and supervisor to others
      for (const uid of userIds) {
        await conn.query(
          "INSERT IGNORE INTO chat_participants (conversation_id, user_id) VALUES (?, ?)",
          [convId, uid]
        );
      }

      // Seed a welcome message
      await conn.query(
        "INSERT INTO chat_messages (uuid, conversation_id, sender_id, message, message_type) VALUES (UUID(), ?, 1, ?, 'system')",
        [convId, `Welcome to ${ch.title}. Channel created for FactoryOS collaboration.`]
      );
    }

    console.log("Default channels seeded!");
  } else {
    console.log("Channels already exist, skipping initial seed.");
  }

  await conn.end();
  console.log("Chat migration complete!");
}

migrateChat().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

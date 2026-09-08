import mysql from "mysql2/promise";
import crypto from "crypto";

async function seedUsers() {
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "factoryos",
  });

  console.log("Connected to MySQL database 'factoryos'...");

  // Ensure table exists
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`uuid\` CHAR(36) NOT NULL UNIQUE,
      \`name\` VARCHAR(150) NOT NULL,
      \`email\` VARCHAR(150) NOT NULL UNIQUE,
      \`password\` VARCHAR(255) NOT NULL,
      \`role\` VARCHAR(50) NOT NULL DEFAULT 'viewer',
      \`department\` VARCHAR(100) NULL,
      \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`remember_token\` VARCHAR(100) NULL,
      \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_users_role\` (\`role\`),
      INDEX \`idx_users_active\` (\`is_active\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const users = [
    {
      uuid: "e1a2b3c4-0001-4000-8000-000000000001",
      name: "Factory Admin",
      email: "admin@factoryos.internal",
      password: "factoryadmin2026",
      role: "super_admin",
      department: "Executive Management",
    },
    {
      uuid: "e1a2b3c4-0002-4000-8000-000000000002",
      name: "Tariq Mahmood",
      email: "supervisor@factoryos.internal",
      password: "supervisor2026",
      role: "production_supervisor",
      department: "Sewing & Finishing",
    },
    {
      uuid: "e1a2b3c4-0003-4000-8000-000000000003",
      name: "Ayesha Siddiqui",
      email: "finance@factoryos.internal",
      password: "finance2026",
      role: "finance",
      department: "Finance & Commercial",
    },
    {
      uuid: "e1a2b3c4-0004-4000-8000-000000000004",
      name: "Bilal Rasheed",
      email: "warehouse@factoryos.internal",
      password: "warehouse2026",
      role: "factory_manager",
      department: "Fabric & Material Storage",
    },
  ];

  for (const u of users) {
    await connection.execute(
      `INSERT INTO \`users\` (\`uuid\`, \`name\`, \`email\`, \`password\`, \`role\`, \`department\`, \`is_active\`)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
       \`name\` = VALUES(\`name\`),
       \`password\` = VALUES(\`password\`),
       \`role\` = VALUES(\`role\`),
       \`department\` = VALUES(\`department\`),
       \`is_active\` = 1`,
      [u.uuid, u.name, u.email, u.password, u.role, u.department]
    );
    console.log(`✓ Inserted/Updated user: ${u.name} (${u.email}) [Role: ${u.role}]`);
  }

  const [rows] = await connection.execute("SELECT id, uuid, name, email, role, department, is_active, created_at FROM users");
  console.log("\nCurrent records in 'users' table in MySQL:");
  console.table(rows);

  await connection.end();
}

seedUsers().catch(console.error);

import mysql from "mysql2/promise";

async function createTable() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "factoryos",
  });

  const sql = `
    CREATE TABLE IF NOT EXISTS \`raw_materials\` (
      \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
      \`uuid\` char(36) NOT NULL,
      \`material_code\` varchar(50) NOT NULL,
      \`name\` varchar(200) NOT NULL,
      \`category\` varchar(50) NOT NULL DEFAULT 'fabric',
      \`color\` varchar(100) NOT NULL DEFAULT 'Natural / Raw',
      \`uom\` varchar(20) NOT NULL DEFAULT 'kg',
      \`gsm\` varchar(50) DEFAULT NULL,
      \`unit_cost\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`reorder_point\` decimal(12,2) NOT NULL DEFAULT 100.00,
      \`location\` varchar(100) NOT NULL DEFAULT 'Main Warehouse Bay 1',
      \`current_stock\` decimal(12,2) NOT NULL DEFAULT 0.00,
      \`status\` varchar(50) NOT NULL DEFAULT 'normal',
      \`is_archived\` tinyint(1) NOT NULL DEFAULT 0,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`raw_materials_code_unique\` (\`material_code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await connection.execute(sql);
  console.log("✅ Table `raw_materials` verified/created successfully in MySQL `factoryos` database!");
  await connection.end();
}

createTable().catch(console.error);

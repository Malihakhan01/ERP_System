import mysql from 'mysql2/promise';

async function migrate() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'factoryos',
  });

  console.log('Connected to MySQL factoryos database.');

  // 1. Create system_settings table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`system_settings\` (
      \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`key\` VARCHAR(100) NOT NULL UNIQUE,
      \`value\` JSON NOT NULL,
      \`updated_by\` VARCHAR(150) NULL DEFAULT 'System Admin',
      \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_settings_key\` (\`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Created or verified table: system_settings');

  // Seed default company profile
  const defaultProfile = {
    companyName: "FactoryOS Garments Ltd.",
    ntnNumber: "8912401-7",
    strnNumber: "32-77-8912-401-19",
    currency: "PKR",
    shift1Time: "08:00 - 17:00",
    shift2Time: "17:00 - 01:00",
    activeLinesCount: "6",
    maxAdvancePercent: "200",
    maxRepaymentMonths: "12",
    invoicePrefix: "INV-2026-",
    quotationPrefix: "QTN-2026-",
    bankAccount: "Habib Bank Limited — A/C 019283746501"
  };

  await connection.query(`
    INSERT INTO \`system_settings\` (\`key\`, \`value\`)
    VALUES ('company_profile', ?)
    ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`updated_at\` = CURRENT_TIMESTAMP;
  `, [JSON.stringify(defaultProfile)]);
  console.log('Seeded company_profile into system_settings');

  // 2. Create audit_logs table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`audit_logs\` (
      \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`user_id\` BIGINT UNSIGNED NULL,
      \`user_email\` VARCHAR(150) NULL,
      \`action\` VARCHAR(100) NOT NULL,
      \`module\` VARCHAR(50) NOT NULL,
      \`entity_id\` VARCHAR(100) NULL,
      \`details\` JSON NULL,
      \`ip_address\` VARCHAR(45) NULL,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_audit_module\` (\`module\`),
      INDEX \`idx_audit_user\` (\`user_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Created or verified table: audit_logs');

  // 3. Verify system_documents table exists (from schema)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`system_documents\` (
      \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`uuid\` CHAR(36) NOT NULL UNIQUE,
      \`document_type\` VARCHAR(50) NOT NULL,
      \`entity_type\` VARCHAR(100) NOT NULL,
      \`entity_id\` BIGINT UNSIGNED NOT NULL,
      \`title\` VARCHAR(200) NOT NULL,
      \`file_name\` VARCHAR(255) NOT NULL,
      \`file_path\` VARCHAR(500) NOT NULL,
      \`file_size_bytes\` BIGINT UNSIGNED NOT NULL,
      \`mime_type\` VARCHAR(100) NOT NULL,
      \`uploaded_by\` VARCHAR(150) NOT NULL DEFAULT 'Admin',
      \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_docs_entity\` (\`entity_type\`, \`entity_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Verified table: system_documents');

  await connection.end();
  console.log('Migration completed successfully!');
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});

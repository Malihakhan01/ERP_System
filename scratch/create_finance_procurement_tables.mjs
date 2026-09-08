import mysql from "mysql2/promise";

async function createFinanceTables() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "factoryos",
  });

  // 1. quotations table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`quotations\` (
      \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
      \`uuid\` char(36) NOT NULL,
      \`quotation_number\` varchar(50) NOT NULL,
      \`client_id\` bigint(20) unsigned DEFAULT 1,
      \`client_display_id\` varchar(50) DEFAULT 'CLT-2026-001',
      \`client_name\` varchar(200) NOT NULL,
      \`client_country\` varchar(100) DEFAULT 'United Kingdom',
      \`client_contact\` varchar(150) DEFAULT NULL,
      \`client_email\` varchar(150) DEFAULT NULL,
      \`issue_date\` date DEFAULT NULL,
      \`valid_until\` date DEFAULT NULL,
      \`quotation_type\` varchar(100) DEFAULT 'Export Bulk Proposal',
      \`currency\` varchar(10) DEFAULT 'USD',
      \`status\` varchar(50) DEFAULT 'draft',
      \`style_code\` varchar(50) DEFAULT 'HD-001',
      \`style_name\` varchar(200) DEFAULT 'Heavyweight Hoodie',
      \`product_category\` varchar(100) DEFAULT 'Hoodies & Sweatshirts',
      \`fabric_details\` varchar(255) DEFAULT '100% Combed Cotton Fleece',
      \`target_gsm\` varchar(50) DEFAULT '320 GSM',
      \`colorway\` varchar(100) DEFAULT 'Black',
      \`quantity\` int(10) unsigned DEFAULT 1000,
      \`unit_price\` decimal(15,2) DEFAULT 14.50,
      \`subtotal\` decimal(15,2) DEFAULT 14500.00,
      \`discount\` decimal(15,2) DEFAULT 0.00,
      \`freight_charges\` decimal(15,2) DEFAULT 0.00,
      \`tax\` decimal(15,2) DEFAULT 0.00,
      \`grand_total\` decimal(15,2) DEFAULT 14500.00,
      \`payment_terms\` varchar(150) DEFAULT '30% Advance TT / 70% LC at Sight',
      \`incoterms\` varchar(100) DEFAULT 'FOB Sialkot / Karachi',
      \`converted_to_order_number\` varchar(50) DEFAULT NULL,
      \`notes\` text DEFAULT NULL,
      \`is_archived\` tinyint(1) NOT NULL DEFAULT 0,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`quotations_num_unique\` (\`quotation_number\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log("✅ Table `quotations` verified/created.");

  // 2. purchases table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`purchases\` (
      \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
      \`uuid\` char(36) NOT NULL,
      \`po_number\` varchar(50) NOT NULL,
      \`supplier\` varchar(200) NOT NULL,
      \`order_date\` date DEFAULT NULL,
      \`expected_date\` date DEFAULT NULL,
      \`material\` varchar(200) NOT NULL,
      \`material_id\` bigint(20) unsigned DEFAULT NULL,
      \`quantity\` decimal(12,2) NOT NULL DEFAULT 0.00,
      \`unit\` varchar(20) NOT NULL DEFAULT 'kg',
      \`rate\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`total_amount\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`paid_amount\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`balance\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`payment_terms\` varchar(50) DEFAULT 'adv_50',
      \`status\` varchar(50) DEFAULT 'draft',
      \`is_archived\` tinyint(1) NOT NULL DEFAULT 0,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`purchases_num_unique\` (\`po_number\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log("✅ Table `purchases` verified/created.");

  // 3. invoices table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`invoices\` (
      \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
      \`uuid\` char(36) NOT NULL,
      \`invoice_number\` varchar(50) NOT NULL,
      \`client_id\` bigint(20) unsigned DEFAULT 1,
      \`client_display_id\` varchar(50) DEFAULT 'CLT-2026-001',
      \`client_name\` varchar(200) NOT NULL,
      \`client_country\` varchar(100) DEFAULT 'United Kingdom',
      \`client_contact\` varchar(150) DEFAULT NULL,
      \`client_email\` varchar(150) DEFAULT NULL,
      \`order_id\` bigint(20) unsigned DEFAULT NULL,
      \`order_number\` varchar(50) DEFAULT NULL,
      \`issue_date\` date DEFAULT NULL,
      \`due_date\` date DEFAULT NULL,
      \`invoice_type\` varchar(100) DEFAULT 'Export Commercial Invoice',
      \`currency\` varchar(10) DEFAULT 'USD',
      \`payment_terms\` varchar(150) DEFAULT '30% Advance TT / 70% LC at Sight',
      \`incoterms\` varchar(100) DEFAULT 'FOB Sialkot / Karachi',
      \`style_code\` varchar(50) DEFAULT 'HD-001',
      \`style_name\` varchar(200) DEFAULT 'Heavyweight Hoodie',
      \`quantity\` int(10) unsigned DEFAULT 1000,
      \`unit_price\` decimal(15,2) DEFAULT 14.50,
      \`subtotal\` decimal(15,2) DEFAULT 14500.00,
      \`discount\` decimal(15,2) DEFAULT 0.00,
      \`freight_charges\` decimal(15,2) DEFAULT 0.00,
      \`tax\` decimal(15,2) DEFAULT 0.00,
      \`grand_total\` decimal(15,2) DEFAULT 14500.00,
      \`paid_amount\` decimal(15,2) DEFAULT 0.00,
      \`balance_due\` decimal(15,2) DEFAULT 14500.00,
      \`payment_status\` varchar(50) DEFAULT 'pending',
      \`status\` varchar(50) DEFAULT 'draft',
      \`notes\` text DEFAULT NULL,
      \`is_archived\` tinyint(1) NOT NULL DEFAULT 0,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`invoices_num_unique\` (\`invoice_number\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log("✅ Table `invoices` verified/created.");

  await connection.end();
}

createFinanceTables().catch(console.error);

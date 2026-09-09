/**
 * FactoryOS — Create Missing Tables & Fix Schema Issues
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

const DB_CONFIG = {
  host:     env.MYSQL_HOST     || "127.0.0.1",
  port:     parseInt(env.MYSQL_PORT || "3306", 10),
  user:     env.MYSQL_USER     || "root",
  password: env.MYSQL_PASSWORD || "",
  database: env.MYSQL_DATABASE || "factoryos",
  multipleStatements: true,
};

const G = "\x1b[32m", R = "\x1b[31m", B = "\x1b[1m", X = "\x1b[0m";
const ok   = (m) => console.log(`  ${G}✓${X} ${m}`);
const fail = (m) => console.log(`  ${R}✗${X} ${m}`);

async function run() {
  console.log(`\n${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${X}`);
  console.log(`${B}  FactoryOS — Create Missing Tables${X}`);
  console.log(`${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${X}\n`);

  const db = await mysql.createConnection(DB_CONFIG);
  ok("Connected to MySQL");

  const exec = async (label, sql) => {
    try {
      await db.query(sql);
      ok(label);
    } catch(e) {
      fail(`${label}: ${e.message}`);
    }
  };

  // 1. sessions table
  await exec("CREATE sessions table", `
    CREATE TABLE IF NOT EXISTS sessions (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      token      VARCHAR(255) NOT NULL UNIQUE,
      role       VARCHAR(50),
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT NOW(),
      INDEX idx_token (token),
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 2. payroll table
  await exec("CREATE payroll table", `
    CREATE TABLE IF NOT EXISTS payroll (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      employee_id     INT NOT NULL,
      payroll_number  VARCHAR(50) UNIQUE,
      month           VARCHAR(20),
      year            INT,
      basic_salary    DECIMAL(12,2) DEFAULT 0,
      allowances      DECIMAL(12,2) DEFAULT 0,
      deductions      DECIMAL(12,2) DEFAULT 0,
      net_salary      DECIMAL(12,2) DEFAULT 0,
      status          ENUM('Pending','Processed','Paid') DEFAULT 'Pending',
      is_archived     TINYINT(1) DEFAULT 0,
      created_at      DATETIME DEFAULT NOW(),
      updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 3. production_batches table
  await exec("CREATE production_batches table", `
    CREATE TABLE IF NOT EXISTS production_batches (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      batch_number    VARCHAR(50) UNIQUE,
      order_id        INT,
      product_id      INT,
      product_name    VARCHAR(255),
      quantity        INT DEFAULT 0,
      completed_qty   INT DEFAULT 0,
      status          ENUM('planned','in_progress','completed','on_hold') DEFAULT 'planned',
      start_date      DATE,
      end_date        DATE,
      line_number     VARCHAR(100),
      notes           TEXT,
      is_archived     TINYINT(1) DEFAULT 0,
      created_at      DATETIME DEFAULT NOW(),
      updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 4. packing_lists table
  await exec("CREATE packing_lists table", `
    CREATE TABLE IF NOT EXISTS packing_lists (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      packing_number  VARCHAR(50) UNIQUE,
      order_id        INT,
      batch_id        INT,
      total_cartons   INT DEFAULT 0,
      total_pieces    INT DEFAULT 0,
      status          ENUM('draft','packed','dispatched') DEFAULT 'draft',
      is_archived     TINYINT(1) DEFAULT 0,
      created_at      DATETIME DEFAULT NOW(),
      updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 5. dispatch_shipments table
  await exec("CREATE dispatch_shipments table", `
    CREATE TABLE IF NOT EXISTS dispatch_shipments (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      shipment_number VARCHAR(50) UNIQUE,
      order_id        INT,
      client_name     VARCHAR(255),
      carrier         VARCHAR(100),
      tracking_number VARCHAR(100),
      dispatch_date   DATE,
      eta_date        DATE,
      status          ENUM('preparing','dispatched','in_transit','delivered','returned') DEFAULT 'preparing',
      is_archived     TINYINT(1) DEFAULT 0,
      created_at      DATETIME DEFAULT NOW(),
      updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 6. tracking_events table
  await exec("CREATE tracking_events table", `
    CREATE TABLE IF NOT EXISTS tracking_events (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      shipment_id     INT,
      event_type      VARCHAR(100),
      location        VARCHAR(255),
      description     TEXT,
      event_time      DATETIME DEFAULT NOW(),
      created_at      DATETIME DEFAULT NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 7. costing_records table
  await exec("CREATE costing_records table", `
    CREATE TABLE IF NOT EXISTS costing_records (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      costing_number  VARCHAR(50) UNIQUE,
      order_id        INT,
      product_id      INT,
      fabric_cost     DECIMAL(12,2) DEFAULT 0,
      trim_cost       DECIMAL(12,2) DEFAULT 0,
      labour_cost     DECIMAL(12,2) DEFAULT 0,
      overhead_cost   DECIMAL(12,2) DEFAULT 0,
      total_cost      DECIMAL(12,2) DEFAULT 0,
      selling_price   DECIMAL(12,2) DEFAULT 0,
      profit_margin   DECIMAL(5,2)  DEFAULT 0,
      currency        VARCHAR(10) DEFAULT 'PKR',
      is_archived     TINYINT(1) DEFAULT 0,
      created_at      DATETIME DEFAULT NOW(),
      updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 8. settings table
  await exec("CREATE settings table", `
    CREATE TABLE IF NOT EXISTS settings (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      key_name    VARCHAR(100) NOT NULL UNIQUE,
      value       TEXT,
      label       VARCHAR(255),
      category    VARCHAR(100) DEFAULT 'general',
      updated_at  DATETIME DEFAULT NOW() ON UPDATE NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 9. Default settings rows
  await exec("Seed default settings", `
    INSERT IGNORE INTO settings (key_name, value, label, category) VALUES
    ('company_name',      'FactoryOS Garments',        'Company Name',          'general'),
    ('company_address',   'Sialkot, Punjab, Pakistan',  'Company Address',       'general'),
    ('default_currency',  'PKR',                        'Default Currency',      'finance'),
    ('sos_alert_email',   '',                            'SOS Alert Email',       'alerts'),
    ('low_stock_threshold','10',                         'Low Stock Threshold %', 'inventory'),
    ('payroll_day',       '25',                          'Payroll Processing Day','finance'),
    ('financial_year',    '2026',                        'Financial Year',        'finance');
  `);

  // 10. Fix chat_messages — add is_read if missing
  await exec("Add is_read column to chat_messages (if missing)", `
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_read TINYINT(1) DEFAULT 0;
  `);

  // 11. Fix qa_inspections — add is_archived if missing
  await exec("Add is_archived column to qa_inspections (if missing)", `
    ALTER TABLE qa_inspections ADD COLUMN IF NOT EXISTS is_archived TINYINT(1) DEFAULT 0;
  `);

  console.log(`\n${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${X}`);
  console.log(`  ${G}${B}All missing tables created & schema fixed ✓${X}`);
  console.log(`${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${X}\n`);

  await db.end();
}

run().catch(e => { console.error(`\x1b[31m${e.message}\x1b[0m`); process.exit(1); });

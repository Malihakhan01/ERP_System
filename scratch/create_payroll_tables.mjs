import mysql from "mysql2/promise";

async function createPayrollTables() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "factoryos",
  });

  // 1. payroll_runs table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`payroll_runs\` (
      \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
      \`uuid\` char(36) NOT NULL,
      \`payroll_run_number\` varchar(50) NOT NULL,
      \`payroll_month\` varchar(10) NOT NULL,
      \`total_employees\` int(10) unsigned NOT NULL DEFAULT 0,
      \`total_gross_wages\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`total_piece_rate\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`total_overtime\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`total_deductions\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`total_net_payable\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`status\` varchar(50) NOT NULL DEFAULT 'Processed',
      \`processed_by\` varchar(150) NOT NULL DEFAULT 'Payroll Officer',
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`payroll_runs_num_unique\` (\`payroll_run_number\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log("✅ Table `payroll_runs` verified/created.");

  // 2. employee_advances table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`employee_advances\` (
      \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
      \`uuid\` char(36) NOT NULL,
      \`advance_number\` varchar(50) NOT NULL,
      \`employee_id\` bigint(20) unsigned NOT NULL,
      \`requested_amount\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`approved_amount\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`monthly_deduction\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`remaining_balance\` decimal(15,2) NOT NULL DEFAULT 0.00,
      \`repayment_months\` int(10) unsigned NOT NULL DEFAULT 1,
      \`reason\` varchar(255) DEFAULT NULL,
      \`status\` varchar(50) NOT NULL DEFAULT 'Active',
      \`request_date\` date DEFAULT NULL,
      \`approved_date\` date DEFAULT NULL,
      \`disbursed_date\` date DEFAULT NULL,
      \`is_archived\` tinyint(1) NOT NULL DEFAULT 0,
      \`notes\` text DEFAULT NULL,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`advances_num_unique\` (\`advance_number\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log("✅ Table `employee_advances` verified/created.");

  await connection.end();
}

createPayrollTables().catch(console.error);

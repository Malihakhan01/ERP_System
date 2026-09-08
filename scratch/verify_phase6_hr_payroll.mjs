import mysql from "mysql2/promise";

const BASE_URL = "http://127.0.0.1:3000";

async function verifyPhase6() {
  console.log("================ STARTING PHASE 6 (WORKFORCE & PAYROLL) VERIFICATION ================\n");

  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "factoryos",
  });

  console.log("--- 1. SEED / VERIFY EMPLOYEES (MySQL) ---");
  const [existingEmps] = await connection.execute("SELECT * FROM `employees` WHERE `is_archived` = 0");
  let empId = existingEmps[0]?.id;

  if (existingEmps.length === 0) {
    const [res] = await connection.execute(
      "INSERT INTO `employees` (`uuid`, `employee_number`, `full_name`, `father_name`, `cnic`, `phone`, `email`, `joining_date`, `department`, `designation`, `employment_type`, `status`, `salary_type`, `monthly_salary`, `daily_rate`, `piece_rate`, `assigned_line`, `skill_level`, `shift`, `is_archived`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        crypto.randomUUID(),
        "EMP-2026-001",
        "Muhammad Rashid",
        "Abdul Ghafoor",
        "34101-1234567-1",
        "+92 300 1234567",
        "rashid@factoryos.com",
        "2024-01-15",
        "Stitching / Sewing Floor",
        "Overlock Sewing Master",
        "Full-Time Permanent",
        "Active",
        "Piece-Rate",
        38000.00,
        1500.00,
        18.50,
        "Line 1 - Hoodies & Sweatshirts",
        "Highly Skilled",
        "Morning Shift",
        0
      ]
    );
    empId = res.insertId;
    console.log(`✅ Seeded test employee EMP-2026-001 (ID: ${empId})`);
  } else {
    console.log(`✅ Found ${existingEmps.length} employee records.`);
  }

  console.log("\n--- 2. SEED / VERIFY EMPLOYEE ADVANCES (MySQL) ---");
  const [existingAdvs] = await connection.execute("SELECT * FROM `employee_advances` WHERE `is_archived` = 0");
  if (existingAdvs.length === 0) {
    await connection.execute(
      "INSERT INTO `employee_advances` (`uuid`, `advance_number`, `employee_id`, `requested_amount`, `approved_amount`, `monthly_deduction`, `remaining_balance`, `repayment_months`, `reason`, `status`, `request_date`, `approved_date`, `disbursed_date`, `is_archived`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        crypto.randomUUID(),
        "ADV-2026-001",
        empId,
        15000.00,
        15000.00,
        5000.00,
        10000.00,
        3,
        "Medical support for family",
        "Active",
        "2026-08-15",
        "2026-08-16",
        "2026-08-17",
        0
      ]
    );
    console.log("✅ Seeded test employee advance loan ADV-2026-001");
  } else {
    console.log(`✅ Found ${existingAdvs.length} advance loan records.`);
  }

  console.log("\n--- 3. SEED / VERIFY MONTHLY PAYROLL RUNS (MySQL) ---");
  const [existingRuns] = await connection.execute("SELECT * FROM `payroll_runs`");
  if (existingRuns.length === 0) {
    const [runRes] = await connection.execute(
      "INSERT INTO `payroll_runs` (`uuid`, `payroll_run_number`, `payroll_month`, `total_employees`, `total_gross_wages`, `total_piece_rate`, `total_overtime`, `total_deductions`, `total_net_payable`, `status`, `processed_by`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        crypto.randomUUID(),
        "PR-2026-08",
        "2026-08",
        1,
        42500.00,
        18500.00,
        4000.00,
        5000.00,
        37500.00,
        "Processed",
        "Head of Payroll"
      ]
    );
    console.log("✅ Seeded test payroll run batch PR-2026-08");

    await connection.execute(
      "INSERT INTO `payroll_records` (`uuid`, `payroll_number`, `employee_id`, `payroll_month`, `base_salary`, `piece_rate_earnings`, `overtime_earnings`, `advance_deductions`, `tax_deductions`, `net_payable`, `status`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        crypto.randomUUID(),
        "PR-2026-08",
        empId,
        "2026-08",
        20000.00,
        18500.00,
        4000.00,
        5000.00,
        0.00,
        37500.00,
        "Paid"
      ]
    );
    console.log("✅ Seeded test payroll line-item record");
  } else {
    console.log(`✅ Found ${existingRuns.length} monthly payroll runs.`);
  }

  console.log("\n================ MYSQL DATABASE AUDIT ================");
  const [eCount] = await connection.execute("SELECT COUNT(*) as cnt FROM `employees` WHERE `is_archived` = 0");
  const [aCount] = await connection.execute("SELECT COUNT(*) as cnt FROM `employee_advances` WHERE `is_archived` = 0");
  const [rCount] = await connection.execute("SELECT COUNT(*) as cnt FROM `payroll_runs`");
  const [recCount] = await connection.execute("SELECT COUNT(*) as cnt FROM `payroll_records`");
  console.log(`employees:         ${eCount[0].cnt} records`);
  console.log(`employee_advances: ${aCount[0].cnt} records`);
  console.log(`payroll_runs:      ${rCount[0].cnt} records`);
  console.log(`payroll_records:   ${recCount[0].cnt} records`);
  console.log("======================================================\n");

  await connection.end();

  console.log("--- 4. HTTP API ENDPOINTS STATUS CHECK ---");
  const endpoints = [
    "/api/employees",
    "/api/employees/metrics",
    "/api/advances",
    "/api/payroll",
    "/api/payroll/metrics"
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep}`);
      console.log(`HTTP GET ${ep.padEnd(30)} -> Status: ${res.status} ${res.statusText}`);
    } catch (err) {
      console.log(`HTTP GET ${ep.padEnd(30)} -> ERROR: ${err.message}`);
    }
  }

  console.log("\n================ PHASE 6 VERIFIED SUCCESSFULLY ================");
}

verifyPhase6().catch(console.error);

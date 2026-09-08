import mysql from "mysql2/promise";

async function verifyProduction() {
  console.log("Connecting to MySQL 'factoryos' to verify Production CRUD flow...");
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "factoryos",
  });

  // 0. Ensure at least one Employee exists for foreign key
  const [empRows] = await connection.query("SELECT id, full_name FROM `employees` LIMIT 1");
  let empId;
  if (empRows.length === 0) {
    const [empRes] = await connection.query(`
      INSERT INTO \`employees\` (\`uuid\`, \`employee_number\`, \`full_name\`, \`phone\`, \`joining_date\`, \`department\`, \`designation\`, \`salary_type\`, \`status\`) VALUES
      (UUID(), 'EMP-2026-001', 'Tariq Mahmood', '+92 300 1234567', '2026-01-01', 'Stitching', 'Master Stitcher', 'piece_rate', 'Active');
    `);
    empId = empRes.insertId;
    console.log(`✅ Seeded employee Tariq Mahmood (ID: ${empId})`);
  } else {
    empId = empRows[0].id;
    console.log(`✅ Found employee: ${empRows[0].full_name} (ID: ${empId})`);
  }

  // 1. Check or Insert a Production Job
  const [existingJobs] = await connection.query("SELECT * FROM `production_jobs` LIMIT 1");
  let jobId;
  if (existingJobs.length > 0) {
    jobId = existingJobs[0].id;
    console.log(`✅ Found existing production job: ${existingJobs[0].job_number} (ID: ${jobId})`);
  } else {
    const [orderRows] = await connection.query("SELECT * FROM `orders` LIMIT 1");
    const ord = orderRows[0];
    const [res] = await connection.query(`
      INSERT INTO \`production_jobs\` (
        \`uuid\`, \`job_number\`, \`order_id\`, \`client_id\`, \`order_number\`, \`client_name\`,
        \`style_code\`, \`style_name\`, \`planned_quantity\`, \`size_breakdown\`, \`colorways\`,
        \`target_start_date\`, \`target_end_date\`, \`stage\`, \`status\`, \`assigned_line\`
      ) VALUES (
        UUID(), 'PRD-2026-001', ${ord ? ord.id : 1}, 1, '${ord ? ord.order_number : 'ORD-2026-001'}', 'Nordic Apparel Group',
        'HD-380', 'Heavyweight Boxy Pullover Hoodie', 500, '{"S": 100, "M": 150, "L": 150, "XL": 100}', '["Black", "Heather Grey"]',
        '2026-09-01', '2026-10-15', 'planning', 'released', 'line_1'
      );
    `);
    jobId = res.insertId;
    console.log(`✅ Created test production job PRD-2026-001 (ID: ${jobId})`);
  }

  // 2. Check Cutting Plans
  const [plans] = await connection.query("SELECT * FROM `cutting_plans` WHERE `production_job_id` = ?", [jobId]);
  let planId;
  if (plans.length > 0) {
    planId = plans[0].id;
    console.log(`✅ Found cutting plan: ${plans[0].plan_number} (ID: ${planId})`);
  } else {
    const [planRes] = await connection.query(`
      INSERT INTO \`cutting_plans\` (\`uuid\`, \`plan_number\`, \`production_job_id\`, \`marker_name\`, \`marker_length_meters\`, \`marker_width_cm\`, \`fabric_type\`, \`fabric_gsm\`, \`plies_count\`, \`marker_efficiency_pct\`, \`status\`) VALUES
      (UUID(), 'CUT-001-01', ${jobId}, 'Marker-01 (Solid Ratio)', 6.25, 152, '100% Cotton Fleece', '380', 25, 88.50, 'approved');
    `);
    planId = planRes.insertId;
    console.log(`✅ Created test cutting plan CUT-001-01 (ID: ${planId})`);
  }

  // 3. Check QR Bundles
  const [bundles] = await connection.query("SELECT COUNT(*) as count FROM `production_bundles` WHERE `production_job_id` = ?", [jobId]);
  let bndId;
  if (bundles[0].count === 0) {
    const [bndRes] = await connection.query(`
      INSERT INTO \`production_bundles\` (\`uuid\`, \`bundle_barcode\`, \`production_job_id\`, \`bundle_number\`, \`size\`, \`colorway\`, \`quantity\`, \`current_stage\`, \`current_line\`, \`status\`) VALUES
      (UUID(), 'BND-001-S-001', ${jobId}, 1, 'S', 'Standard', 25, 'cutting', 'line_1', 'created');
    `);
    bndId = bndRes.insertId;
    console.log(`✅ Created test QR bundle (ID: ${bndId})`);
  } else {
    const [bndRow] = await connection.query("SELECT id FROM `production_bundles` WHERE `production_job_id` = ? LIMIT 1", [jobId]);
    bndId = bndRow[0].id;
    console.log(`✅ Found ${bundles[0].count} production bundles for job (Selected: ${bndId})`);
  }

  // 4. Check Operator Logs
  const [opLogs] = await connection.query("SELECT COUNT(*) as count FROM `operator_production_logs` WHERE `production_job_id` = ?", [jobId]);
  if (opLogs[0].count === 0) {
    await connection.query(`
      INSERT INTO \`operator_production_logs\` (\`uuid\`, \`production_job_id\`, \`bundle_id\`, \`employee_id\`, \`employee_name\`, \`operation_name\`, \`pieces_completed\`, \`rate_per_piece\`, \`total_earnings\`, \`work_date\`, \`payroll_month\`) VALUES
      (UUID(), ${jobId}, ${bndId}, ${empId}, 'Tariq Mahmood', 'Front Pocket Stitch', 25, 0.85, 21.25, CURDATE(), '2026-09');
    `);
    console.log("✅ Seeded test operator production log");
  } else {
    console.log(`✅ Found ${opLogs[0].count} operator production logs for job`);
  }

  // Summary counts
  const [totalJobs] = await connection.query("SELECT COUNT(*) as count FROM `production_jobs`");
  const [totalPlans] = await connection.query("SELECT COUNT(*) as count FROM `cutting_plans`");
  const [totalBundles] = await connection.query("SELECT COUNT(*) as count FROM `production_bundles`");
  const [totalLogs] = await connection.query("SELECT COUNT(*) as count FROM `operator_production_logs`");

  console.log("\n================ PRODUCTION DATABASE AUDIT ================");
  console.log(`production_jobs records: ${totalJobs[0].count}`);
  console.log(`cutting_plans records: ${totalPlans[0].count}`);
  console.log(`production_bundles records: ${totalBundles[0].count}`);
  console.log(`operator_production_logs records: ${totalLogs[0].count}`);
  console.log("===========================================================\n");

  await connection.end();
}

verifyProduction().catch(console.error);

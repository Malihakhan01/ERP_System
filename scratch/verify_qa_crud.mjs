import mysql from "mysql2/promise";

async function verifyQACRUD() {
  console.log("Connecting to MySQL 'factoryos' to verify QA CRUD flow...");
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "factoryos",
  });

  // 1. Get or Ensure Production Job
  const [jobRows] = await connection.query("SELECT id, job_number FROM `production_jobs` LIMIT 1");
  let jobId = jobRows.length > 0 ? jobRows[0].id : 1;

  // 2. Check or Insert QA Inspection
  const [existingInsp] = await connection.query("SELECT * FROM `qa_inspections` WHERE `production_job_id` = ? LIMIT 1", [jobId]);
  let inspId;
  if (existingInsp.length > 0) {
    inspId = existingInsp[0].id;
    console.log(`✅ Found existing QA inspection: ${existingInsp[0].inspection_number} (ID: ${inspId})`);
  } else {
    const [res] = await connection.query(`
      INSERT INTO \`qa_inspections\` (
        \`uuid\`, \`inspection_number\`, \`production_job_id\`, \`inspection_stage\`,
        \`inspection_level\`, \`aql_level\`, \`lot_size\`, \`sample_size\`,
        \`passed_pieces\`, \`failed_pieces\`, \`rework_pieces\`,
        \`critical_defects_found\`, \`major_defects_found\`, \`minor_defects_found\`,
        \`inspection_result\`, \`status\`, \`inspector_name\`
      ) VALUES (
        UUID(), 'QA-2026-001', ${jobId}, 'end_of_line',
        'Level II (Standard Normal)', 'AQL 2.5 Major / 4.0 Minor', 500, 50,
        48, 0, 2, 0, 2, 1, 'rework_required', 'in_progress', 'QA Lead Inspector'
      );
    `);
    inspId = res.insertId;
    console.log(`✅ Created test QA inspection QA-2026-001 (ID: ${inspId})`);
  }

  // 3. Log Defect Detail
  const [defRows] = await connection.query("SELECT COUNT(*) as count FROM `qa_defect_details` WHERE `qa_inspection_id` = ?", [inspId]);
  if (defRows[0].count === 0) {
    await connection.query(`
      INSERT INTO \`qa_defect_details\` (
        \`qa_inspection_id\`, \`defect_code\`, \`defect_name\`, \`defect_category\`,
        \`defect_count\`, \`responsible_operation\`, \`corrective_action\`
      ) VALUES (
        ${inspId}, 'DEF-ST-01', 'Broken Stitching on Pocket Corner', 'major', 2,
        'Pocket Attachment', 'Restitch pocket hem and adjust upper tension'
      );
    `);
    console.log("✅ Seeded test QA defect detail");
  } else {
    console.log(`✅ Found ${defRows[0].count} defects for QA inspection`);
  }

  // 4. Check Rework Record
  const [rwkRows] = await connection.query("SELECT COUNT(*) as count FROM `qa_rework_records` WHERE `qa_inspection_id` = ?", [inspId]);
  if (rwkRows[0].count === 0) {
    await connection.query(`
      INSERT INTO \`qa_rework_records\` (
        \`uuid\`, \`rework_number\`, \`qa_inspection_id\`, \`production_job_id\`,
        \`rework_quantity\`, \`defect_summary\`, \`assigned_line\`, \`status\`
      ) VALUES (
        UUID(), 'RWK-2026-001', ${inspId}, ${jobId}, 2,
        'Pocket Corner restitching & clean thread trims', 'line_1', 'in_progress'
      );
    `);
    console.log("✅ Seeded test QA rework record");
  } else {
    console.log(`✅ Found ${rwkRows[0].count} rework records for inspection`);
  }

  // Summary counts
  const [totalInsp] = await connection.query("SELECT COUNT(*) as count FROM `qa_inspections`");
  const [totalDefects] = await connection.query("SELECT COUNT(*) as count FROM `qa_defect_details`");
  const [totalRework] = await connection.query("SELECT COUNT(*) as count FROM `qa_rework_records`");

  console.log("\n================ QA DATABASE AUDIT ================");
  console.log(`qa_inspections records: ${totalInsp[0].count}`);
  console.log(`qa_defect_details records: ${totalDefects[0].count}`);
  console.log(`qa_rework_records records: ${totalRework[0].count}`);
  console.log("===================================================\n");

  await connection.end();
}

verifyQACRUD().catch(console.error);

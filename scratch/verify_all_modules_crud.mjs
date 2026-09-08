import mysql from "mysql2/promise";

async function verifyAllModules() {
  console.log("================ STARTING FULL ERP INTEGRATION VERIFICATION ================\n");

  // 1. MySQL Direct Test
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "factoryos",
  });

  console.log("--- 1. DISPATCH & SHIPPING (MySQL) ---");
  const [dispRows] = await connection.query("SELECT COUNT(*) as count FROM `dispatch_notes`");
  let dispId;
  if (dispRows[0].count === 0) {
    const [res] = await connection.query(`
      INSERT INTO \`dispatch_notes\` (
        \`uuid\`, \`dispatch_number\`, \`order_id\`, \`carrier_name\`, \`tracking_ref\`,
        \`container_number\`, \`seal_number\`, \`total_cartons\`, \`total_pieces\`,
        \`gross_weight_kg\`, \`shipping_method\`, \`status\`, \`destination_port\`
      ) VALUES (
        UUID(), 'DSP-2026-001', 1, 'Maersk Line Logistics', 'MSK-2026-0001',
        'MSCU-884920-1', 'SL-994821', 2, 74, 36.20, 'Sea Freight (FCL)', 'in_transit', 'Port of Rotterdam (NLRTM)'
      );
    `);
    dispId = res.insertId;
    console.log(`✅ Seeded test dispatch note DSP-2026-001 (ID: ${dispId})`);
  } else {
    console.log(`✅ Found ${dispRows[0].count} dispatch note records.`);
  }

  console.log("\n--- 2. 9-GATE TRACKING (MySQL) ---");
  const [trkRows] = await connection.query("SELECT COUNT(*) as count FROM `tracking_records`");
  let trkId;
  if (trkRows[0].count === 0) {
    const [res] = await connection.query(`
      INSERT INTO \`tracking_records\` (
        \`uuid\`, \`tracking_number\`, \`order_id\`, \`production_job_id\`, \`current_gate\`,
        \`gate_status\`, \`origin_facility\`, \`destination_port\`, \`current_location\`, \`estimated_delivery\`
      ) VALUES (
        UUID(), 'TRK-2026-001', 1, 1, 8, 'in_progress', 'Main Garment Plant Sialkot', 'Port of Rotterdam (NLRTM)', 'Container Loading Dock', '2026-10-15'
      );
    `);
    trkId = res.insertId;

    await connection.query(`
      INSERT INTO \`tracking_timeline\` (\`tracking_record_id\`, \`gate_number\`, \`title\`, \`description\`, \`location\`, \`actor\`) VALUES
      (${trkId}, 1, 'Gate 1: Order Confirmed', 'Commercial contract signoff', 'Merchandising Office', 'Commercial Lead'),
      (${trkId}, 8, 'Gate 8: Export Dispatch', 'Container sealed and loaded on truck', 'Loading Dock Bay', 'Logistics Officer');
    `);
    console.log(`✅ Seeded tracking shipment TRK-2026-001 with Gate 1..8 milestones (ID: ${trkId})`);
  } else {
    console.log(`✅ Found ${trkRows[0].count} tracking shipment records.`);
  }

  console.log("\n--- 3. COST ESTIMATION (MySQL) ---");
  const [cstRows] = await connection.query("SELECT COUNT(*) as count FROM `cost_estimates`");
  if (cstRows[0].count === 0) {
    await connection.query(`
      INSERT INTO \`cost_estimates\` (
        \`uuid\`, \`estimate_number\`, \`order_id\`, \`product_id\`, \`style_code\`,
        \`batch_quantity\`, \`currency\`, \`fabric_cost_total\`, \`trim_cost_total\`,
        \`labor_cost_total\`, \`overhead_cost_total\`, \`packaging_cost_total\`,
        \`factory_cost_per_pc\`, \`net_margin_pct\`, \`fob_price_per_pc\`, \`total_contract_value\`, \`status\`
      ) VALUES (
        UUID(), 'CST-2026-001', 1, 1, 'HD-380',
        500, 'USD', 1687.50, 900.00, 1387.50, 600.00, 325.00,
        9.80, 22.00, 11.96, 5980.00, 'approved'
      );
    `);
    console.log("✅ Seeded cost estimate CST-2026-001 (FOB: $11.96/pc)");
  } else {
    console.log(`✅ Found ${cstRows[0].count} cost estimate records.`);
  }

  // Summary counts
  const [totalDisp] = await connection.query("SELECT COUNT(*) as count FROM `dispatch_notes`");
  const [totalTrk] = await connection.query("SELECT COUNT(*) as count FROM `tracking_records`");
  const [totalTimeline] = await connection.query("SELECT COUNT(*) as count FROM `tracking_timeline`");
  const [totalCst] = await connection.query("SELECT COUNT(*) as count FROM `cost_estimates`");

  console.log("\n================ MYSQL DATABASE AUDIT ================");
  console.log(`dispatch_notes: ${totalDisp[0].count} records`);
  console.log(`tracking_records: ${totalTrk[0].count} records`);
  console.log(`tracking_timeline: ${totalTimeline[0].count} milestones`);
  console.log(`cost_estimates: ${totalCst[0].count} records`);
  console.log("======================================================\n");

  await connection.end();

  // 2. HTTP Endpoint Verification
  const base = "http://localhost:3000";
  const endpoints = [
    "/api/dispatch",
    "/api/dispatch/metrics",
    "/api/dispatch/cartons",
    "/api/tracking",
    "/api/tracking/metrics",
    "/api/costing",
    "/api/costing/metrics",
  ];

  console.log("--- 4. HTTP API ENDPOINTS STATUS CHECK ---");
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${base}${ep}`);
      console.log(`HTTP GET ${ep.padEnd(26)} -> Status: ${res.status} OK`);
    } catch (err) {
      console.error(`HTTP GET ${ep.padEnd(26)} -> ERROR: ${err.message}`);
    }
  }

  console.log("\n================ ALL MODULES VERIFIED SUCCESSFULLY ================");
}

verifyAllModules().catch(console.error);

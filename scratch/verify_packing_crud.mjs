import mysql from "mysql2/promise";

async function verifyPackingCRUD() {
  console.log("Connecting to MySQL 'factoryos' to verify Packing CRUD flow...");
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "factoryos",
  });

  // 1. Get Production Job
  const [jobRows] = await connection.query("SELECT id, job_number FROM `production_jobs` LIMIT 1");
  let jobId = jobRows.length > 0 ? jobRows[0].id : 1;

  // 2. Check or Create Master Carton
  const [existingCartons] = await connection.query("SELECT * FROM `packing_cartons` WHERE `production_job_id` = ? LIMIT 1", [jobId]);
  let cartonId;
  if (existingCartons.length > 0) {
    cartonId = existingCartons[0].id;
    console.log(`✅ Found existing master carton: ${existingCartons[0].carton_number} (Barcode: ${existingCartons[0].carton_barcode}, ID: ${cartonId})`);
  } else {
    const [res] = await connection.query(`
      INSERT INTO \`packing_cartons\` (
        \`uuid\`, \`carton_number\`, \`production_job_id\`, \`carton_index\`,
        \`carton_barcode\`, \`packing_type\`, \`total_units_in_carton\`,
        \`gross_weight_kg\`, \`net_weight_kg\`, \`length_cm\`, \`width_cm\`, \`height_cm\`,
        \`status\`, \`packed_by\`
      ) VALUES (
        UUID(), 'CTN-2026-001-001', ${jobId}, 1,
        'PKG-2026-0001', 'Master Solid Carton', 24,
        12.50, 11.20, 60.00, 40.00, 35.00,
        'staged_for_dispatch', 'Packing Floor Lead'
      );
    `);
    cartonId = res.insertId;
    console.log(`✅ Created test master carton CTN-2026-001-001 (Barcode: PKG-2026-0001, ID: ${cartonId})`);
  }

  // 3. Check or Create Carton Items
  const [itemRows] = await connection.query("SELECT COUNT(*) as count FROM `packing_carton_items` WHERE `carton_id` = ?", [cartonId]);
  if (itemRows[0].count === 0) {
    await connection.query(`
      INSERT INTO \`packing_carton_items\` (\`carton_id\`, \`size\`, \`colorway\`, \`quantity\`) VALUES
      (${cartonId}, 'S', 'Standard', 6),
      (${cartonId}, 'M', 'Standard', 12),
      (${cartonId}, 'L', 'Standard', 6);
    `);
    console.log("✅ Seeded test carton items (S:6, M:12, L:6)");
  } else {
    console.log(`✅ Found ${itemRows[0].count} item lines for master carton`);
  }

  // Summary counts
  const [totalCartons] = await connection.query("SELECT COUNT(*) as count FROM `packing_cartons`");
  const [totalItems] = await connection.query("SELECT COUNT(*) as count FROM `packing_carton_items`");

  console.log("\n================ PACKING DATABASE AUDIT ================");
  console.log(`packing_cartons records: ${totalCartons[0].count}`);
  console.log(`packing_carton_items records: ${totalItems[0].count}`);
  console.log("========================================================\n");

  await connection.end();
}

verifyPackingCRUD().catch(console.error);

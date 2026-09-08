import mysql from "mysql2/promise";

async function verifyFullPackingFlow() {
  console.log("Connecting to MySQL 'factoryos' to verify Full Packing & Cartons Flow...");
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "factoryos",
  });

  // 1. Get Production Job
  const [jobRows] = await connection.query("SELECT id, job_number, client_name, style_code FROM `production_jobs` LIMIT 1");
  const job = jobRows[0];
  console.log(`✅ Production Job: ${job.job_number} (${job.style_code} - ${job.client_name})`);

  // 2. Count Existing Cartons
  const [initialCartons] = await connection.query("SELECT COUNT(*) as count FROM `packing_cartons`");
  console.log(`Current Cartons in MySQL: ${initialCartons[0].count}`);

  // 3. Create a 2nd Master Carton
  const index = Number(initialCartons[0].count) + 1;
  const cartonNo = `CTN-2026-001-${String(index).padStart(3, "0")}`;
  const barcode = `PKG-2026-${String(index).padStart(4, "0")}`;

  const [res] = await connection.query(`
    INSERT INTO \`packing_cartons\` (
      \`uuid\`, \`carton_number\`, \`production_job_id\`, \`carton_index\`,
      \`carton_barcode\`, \`packing_type\`, \`total_units_in_carton\`,
      \`gross_weight_kg\`, \`net_weight_kg\`, \`length_cm\`, \`width_cm\`, \`height_cm\`,
      \`status\`, \`packed_by\`
    ) VALUES (
      UUID(), '${cartonNo}', ${job.id}, ${index},
      '${barcode}', 'Assorted Ratio Carton', 50,
      23.70, 22.50, 60.00, 40.00, 35.00,
      'staged_for_dispatch', 'Packing Lead Worker'
    );
  `);
  const newCartonId = res.insertId;
  console.log(`✅ Created Master Carton: ${cartonNo} (Barcode: ${barcode}, ID: ${newCartonId})`);

  // 4. Insert Carton Items for this 2nd Carton
  await connection.query(`
    INSERT INTO \`packing_carton_items\` (\`carton_id\`, \`size\`, \`colorway\`, \`quantity\`) VALUES
    (${newCartonId}, 'S', 'Standard', 10),
    (${newCartonId}, 'M', 'Standard', 20),
    (${newCartonId}, 'L', 'Standard', 20);
  `);
  console.log("✅ Seeded 3 item breakdown lines (S:10, M:20, L:20 = 50 pcs)");

  // 5. Update Production Job total_packed_quantity
  await connection.query(
    "UPDATE `production_jobs` SET `total_packed_quantity` = `total_packed_quantity` + 50 WHERE `id` = ?",
    [job.id]
  );
  console.log("✅ Updated production_jobs total_packed_quantity (+50 pcs)");

  // 6. Verification Summary
  const [totalCartons] = await connection.query("SELECT COUNT(*) as count FROM `packing_cartons`");
  const [totalItems] = await connection.query("SELECT COUNT(*) as count FROM `packing_carton_items`");
  const [totalPacked] = await connection.query("SELECT SUM(`total_units_in_carton`) as total_pieces FROM `packing_cartons`");

  console.log("\n================ LIVE PACKING VERIFICATION ================");
  console.log(`Total Master Cartons: ${totalCartons[0].count}`);
  console.log(`Total Carton Item Rows: ${totalItems[0].count}`);
  console.log(`Total Packaged Pieces: ${totalPacked[0].total_pieces} Pcs`);
  console.log("===========================================================\n");

  await connection.end();
}

verifyFullPackingFlow().catch(console.error);

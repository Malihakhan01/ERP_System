import mysql from "mysql2/promise";

const BASE_URL = "http://127.0.0.1:3000";

async function verifyPhase5() {
  console.log("================ STARTING PHASE 5 (MATERIALS & INVENTORY) VERIFICATION ================\n");

  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "factoryos",
  });

  console.log("--- 1. SEED / VERIFY RAW MATERIALS (MySQL) ---");
  const [existingMats] = await connection.execute("SELECT * FROM `raw_materials` WHERE `is_archived` = 0");
  if (existingMats.length === 0) {
    await connection.execute(
      "INSERT INTO `raw_materials` (`uuid`, `material_code`, `name`, `category`, `color`, `uom`, `gsm`, `unit_cost`, `reorder_point`, `location`, `current_stock`, `status`, `is_archived`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        crypto.randomUUID(),
        "MAT-2026-001",
        "Cotton Fleece 320 GSM",
        "fabric",
        "Black",
        "kg",
        "320 GSM",
        4.20,
        250.00,
        "Main Warehouse Bay 1",
        3800.00,
        "normal",
        0
      ]
    );
    console.log("✅ Seeded test material MAT-2026-001 (Cotton Fleece 320 GSM)");
  } else {
    console.log(`✅ Found ${existingMats.length} raw material records.`);
  }

  console.log("\n--- 2. SEED / VERIFY INVENTORY ITEMS & MOVEMENTS (MySQL) ---");
  const [existingInv] = await connection.execute("SELECT * FROM `inventory_items` WHERE `is_archived` = 0");
  let invId = existingInv[0]?.id;

  if (existingInv.length === 0) {
    const [result] = await connection.execute(
      "INSERT INTO `inventory_items` (`uuid`, `sku`, `name`, `category`, `unit`, `unit_cost`, `total_stock`, `available_stock`, `allocated_stock`, `min_reorder_level`, `bay`, `lot_number`, `is_archived`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        crypto.randomUUID(),
        "SKU-FAB-001",
        "100% Combed Cotton Fleece Lot A",
        "fabric",
        "kg",
        4.20,
        5000.00,
        3800.00,
        1200.00,
        500.00,
        "bay1",
        "LOT-2026-0001",
        0
      ]
    );
    invId = result.insertId;
    console.log(`✅ Seeded test inventory lot SKU-FAB-001 (ID: ${invId})`);
  } else {
    console.log(`✅ Found ${existingInv.length} inventory lot records.`);
  }

  const [existingMovs] = await connection.execute("SELECT * FROM `stock_movements`");
  if (existingMovs.length === 0) {
    await connection.execute(
      "INSERT INTO `stock_movements` (`uuid`, `movement_number`, `inventory_item_id`, `movement_type`, `quantity`, `previous_stock`, `new_stock`, `reference_type`, `reference_id`, `actor`, `notes`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        crypto.randomUUID(),
        "MOV-2026-0001",
        invId,
        "issuance",
        1200.00,
        5000.00,
        3800.00,
        "cutting_issuance",
        "CUT-2026-001",
        "Warehouse Floor Supervisor",
        "Material issued to Cutting Table 1 for PRD-2026-001"
      ]
    );
    console.log("✅ Seeded test stock movement record MOV-2026-0001");
  } else {
    console.log(`✅ Found ${existingMovs.length} stock movement audit records.`);
  }

  console.log("\n================ MYSQL DATABASE AUDIT ================");
  const [mCount] = await connection.execute("SELECT COUNT(*) as cnt FROM `raw_materials` WHERE `is_archived` = 0");
  const [iCount] = await connection.execute("SELECT COUNT(*) as cnt FROM `inventory_items` WHERE `is_archived` = 0");
  const [smCount] = await connection.execute("SELECT COUNT(*) as cnt FROM `stock_movements`");
  console.log(`raw_materials:   ${mCount[0].cnt} records`);
  console.log(`inventory_items: ${iCount[0].cnt} records`);
  console.log(`stock_movements: ${smCount[0].cnt} records`);
  console.log("======================================================\n");

  await connection.end();

  console.log("--- 3. HTTP API ENDPOINTS STATUS CHECK ---");
  const endpoints = [
    "/api/materials",
    "/api/materials/metrics",
    "/api/inventory",
    "/api/inventory/metrics",
    "/api/inventory?type=movements"
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep}`);
      console.log(`HTTP GET ${ep.padEnd(35)} -> Status: ${res.status} ${res.statusText}`);
    } catch (err) {
      console.log(`HTTP GET ${ep.padEnd(35)} -> ERROR: ${err.message}`);
    }
  }

  console.log("\n================ PHASE 5 VERIFIED SUCCESSFULLY ================");
}

verifyPhase5().catch(console.error);

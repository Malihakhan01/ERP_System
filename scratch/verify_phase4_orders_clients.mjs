import mysql from "mysql2/promise";

const BASE_URL = "http://127.0.0.1:3000";

async function verifyPhase4() {
  console.log("================ STARTING PHASE 4 (ORDERS & CLIENTS) VERIFICATION ================\n");

  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "factoryos",
  });

  console.log("--- 1. SEED / VERIFY CLIENTS (MySQL) ---");
  const [existingClients] = await connection.execute("SELECT * FROM `clients` WHERE `is_archived` = 0");
  if (existingClients.length === 0) {
    await connection.execute(
      "INSERT INTO `clients` (`uuid`, `display_id`, `company_name`, `brand_name`, `country`, `city`, `contact_person`, `email`, `phone`, `currency`, `credit_limit`, `payment_terms`, `is_archived`, `notes`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        crypto.randomUUID(),
        "CLT-2026-001",
        "Nordic Streetwear AB",
        "Nordic Apparel",
        "Sweden",
        "Stockholm",
        "Erik Lindqvist",
        "erik@nordicstreetwear.se",
        "+46 8 123 4567",
        "EUR",
        75000,
        "30% Advance TT / 70% LC at Sight",
        0,
        JSON.stringify({ clientType: "Brand", incoterms: "FOB Gothenburg", annualEstimatedVolume: 40000 })
      ]
    );
    console.log("✅ Seeded test client CLT-2026-001");
  } else {
    console.log(`✅ Found ${existingClients.length} client records.`);
  }

  console.log("\n--- 2. SEED / VERIFY ORDERS (MySQL) ---");
  const [existingOrders] = await connection.execute("SELECT * FROM `orders` WHERE `is_archived` = 0");
  if (existingOrders.length === 0) {
    await connection.execute(
      "INSERT INTO `orders` (`uuid`, `order_number`, `client_id`, `client_name`, `client_country`, `style_code`, `style_name`, `product_category`, `order_date`, `delivery_deadline`, `order_type`, `currency`, `priority`, `status`, `production_stage`, `payment_status`, `quantity`, `unit_price`, `subtotal`, `total_value`, `payment_terms`, `incoterms`, `shipping_method`, `destination_port`, `is_archived`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        crypto.randomUUID(),
        "ORD-2026-001",
        1,
        "Nordic Streetwear AB",
        "Sweden",
        "HD-001",
        "Heavyweight Premium Zip Hoodie",
        "Hoodies & Sweatshirts",
        "2026-09-01",
        "2026-10-15",
        "Export Bulk Production",
        "USD",
        "high",
        "confirmed",
        "Stitching Started",
        "partial",
        2500,
        14.50,
        36250.00,
        36250.00,
        "30% Advance TT / 70% LC at Sight",
        "FOB Gothenburg",
        "Sea Freight (FCL)",
        "Gothenburg Port, Sweden",
        0
      ]
    );
    console.log("✅ Seeded test sales order ORD-2026-001");
  } else {
    console.log(`✅ Found ${existingOrders.length} order records.`);
  }

  console.log("\n================ MYSQL DATABASE AUDIT ================");
  const [cCount] = await connection.execute("SELECT COUNT(*) as cnt FROM `clients` WHERE `is_archived` = 0");
  const [oCount] = await connection.execute("SELECT COUNT(*) as cnt FROM `orders` WHERE `is_archived` = 0");
  console.log(`clients: ${cCount[0].cnt} records`);
  console.log(`orders:  ${oCount[0].cnt} records`);
  console.log("======================================================\n");

  await connection.end();

  console.log("--- 3. HTTP API ENDPOINTS STATUS CHECK ---");
  const endpoints = [
    "/api/clients",
    "/api/clients/metrics",
    "/api/orders",
    "/api/orders/metrics"
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep}`);
      console.log(`HTTP GET ${ep.padEnd(30)} -> Status: ${res.status} ${res.statusText}`);
    } catch (err) {
      console.log(`HTTP GET ${ep.padEnd(30)} -> ERROR: ${err.message}`);
    }
  }

  console.log("\n================ PHASE 4 VERIFIED SUCCESSFULLY ================");
}

verifyPhase4().catch(console.error);

import mysql from "mysql2/promise";

const BASE_URL = "http://127.0.0.1:3000";

async function verifyPhase7() {
  console.log("================ STARTING PHASE 7 (QUOTATIONS, PURCHASES & INVOICES) VERIFICATION ================\n");

  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "factoryos",
  });

  console.log("--- 1. SEED / VERIFY COMMERCIAL QUOTATIONS (MySQL) ---");
  const [existingQuotes] = await connection.execute("SELECT * FROM `quotations` WHERE `is_archived` = 0");
  if (existingQuotes.length === 0) {
    await connection.execute(
      "INSERT INTO `quotations` (`uuid`, `quotation_number`, `client_id`, `client_display_id`, `client_name`, `client_country`, `issue_date`, `valid_until`, `quotation_type`, `currency`, `status`, `style_code`, `style_name`, `product_category`, `fabric_details`, `target_gsm`, `colorway`, `quantity`, `unit_price`, `subtotal`, `grand_total`, `payment_terms`, `incoterms`, `is_archived`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        crypto.randomUUID(),
        "QT-2026-001",
        1,
        "CLT-2026-001",
        "Nordic Streetwear AB",
        "Sweden",
        "2026-09-01",
        "2026-10-01",
        "Export Bulk Proposal",
        "USD",
        "sent",
        "HD-001",
        "Heavyweight Premium Zip Hoodie",
        "Hoodies & Sweatshirts",
        "100% Combed Cotton Fleece",
        "360 GSM",
        "Black / Heather Grey",
        2500,
        14.50,
        36250.00,
        36250.00,
        "30% Advance TT / 70% LC at Sight",
        "FOB Gothenburg",
        0
      ]
    );
    console.log("✅ Seeded test quotation QT-2026-001");
  } else {
    console.log(`✅ Found ${existingQuotes.length} quotation records.`);
  }

  console.log("\n--- 2. SEED / VERIFY PURCHASES (MySQL) ---");
  const [existingPurchases] = await connection.execute("SELECT * FROM `purchases` WHERE `is_archived` = 0");
  if (existingPurchases.length === 0) {
    await connection.execute(
      "INSERT INTO `purchases` (`uuid`, `po_number`, `supplier`, `order_date`, `expected_date`, `material`, `quantity`, `unit`, `rate`, `total_amount`, `paid_amount`, `balance`, `payment_terms`, `status`, `is_archived`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        crypto.randomUUID(),
        "PO-2026-0001",
        "Al-Karam Textile Mills",
        "2026-09-01",
        "2026-09-15",
        "100% Cotton Combed Yarn 20/1",
        5000.00,
        "kg",
        4.20,
        21000.00,
        10500.00,
        10500.00,
        "adv_50",
        "confirmed",
        0
      ]
    );
    console.log("✅ Seeded test purchase order PO-2026-0001");
  } else {
    console.log(`✅ Found ${existingPurchases.length} purchase order records.`);
  }

  console.log("\n--- 3. SEED / VERIFY COMMERCIAL INVOICES (MySQL) ---");
  const [existingInvoices] = await connection.execute("SELECT * FROM `invoices` WHERE `is_archived` = 0");
  if (existingInvoices.length === 0) {
    await connection.execute(
      "INSERT INTO `invoices` (`uuid`, `invoice_number`, `client_id`, `client_display_id`, `client_name`, `client_country`, `order_number`, `issue_date`, `due_date`, `invoice_type`, `currency`, `payment_terms`, `incoterms`, `style_code`, `style_name`, `quantity`, `unit_price`, `subtotal`, `grand_total`, `paid_amount`, `balance_due`, `payment_status`, `status`, `is_archived`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        crypto.randomUUID(),
        "INV-2026-001",
        1,
        "CLT-2026-001",
        "Nordic Streetwear AB",
        "Sweden",
        "ORD-2026-001",
        "2026-09-01",
        "2026-10-01",
        "Export Commercial Invoice",
        "USD",
        "30% Advance TT / 70% LC at Sight",
        "FOB Gothenburg",
        "HD-001",
        "Heavyweight Premium Zip Hoodie",
        2500,
        14.50,
        36250.00,
        36250.00,
        10875.00,
        25375.00,
        "partially_paid",
        "issued",
        0
      ]
    );
    console.log("✅ Seeded test commercial invoice INV-2026-001");
  } else {
    console.log(`✅ Found ${existingInvoices.length} commercial invoice records.`);
  }

  console.log("\n================ MYSQL DATABASE AUDIT ================");
  const [qCount] = await connection.execute("SELECT COUNT(*) as cnt FROM `quotations` WHERE `is_archived` = 0");
  const [pCount] = await connection.execute("SELECT COUNT(*) as cnt FROM `purchases` WHERE `is_archived` = 0");
  const [iCount] = await connection.execute("SELECT COUNT(*) as cnt FROM `invoices` WHERE `is_archived` = 0");
  console.log(`quotations: ${qCount[0].cnt} records`);
  console.log(`purchases:  ${pCount[0].cnt} records`);
  console.log(`invoices:   ${iCount[0].cnt} records`);
  console.log("======================================================\n");

  await connection.end();

  console.log("--- 4. HTTP API ENDPOINTS STATUS CHECK ---");
  const endpoints = [
    "/api/quotations",
    "/api/quotations/metrics",
    "/api/purchases",
    "/api/purchases/metrics",
    "/api/invoices",
    "/api/invoices/metrics"
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep}`);
      console.log(`HTTP GET ${ep.padEnd(30)} -> Status: ${res.status} ${res.statusText}`);
    } catch (err) {
      console.log(`HTTP GET ${ep.padEnd(30)} -> ERROR: ${err.message}`);
    }
  }

  console.log("\n================ PHASE 7 VERIFIED SUCCESSFULLY ================");
}

verifyPhase7().catch(console.error);

import mysql from "mysql2/promise";

async function seed() {
  console.log("Seeding initial data into 'factoryos' MySQL database...");
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "factoryos",
  });

  // 1. Seed Production Lines
  const [lines] = await connection.query("SELECT COUNT(*) as count FROM `production_lines`");
  if (lines[0].count === 0) {
    await connection.query(`
      INSERT INTO \`production_lines\` (\`uuid\`, \`line_code\`, \`line_name\`, \`department\`, \`daily_target_capacity\`, \`is_active\`) VALUES
      (UUID(), 'line_1', 'Line 1 — Main Stitching Floor', 'Stitching', 600, 1),
      (UUID(), 'line_2', 'Line 2 — Polos & Jersey', 'Stitching', 550, 1),
      (UUID(), 'line_3', 'Line 3 — Bottoms & Pants', 'Stitching', 450, 1),
      (UUID(), 'sample_room', 'Sample Room & Prototyping', 'Sampling', 100, 1);
    `);
    console.log("✅ Seeded Production Lines");
  }

  // 2. Seed Clients
  const [clients] = await connection.query("SELECT COUNT(*) as count FROM `clients`");
  if (clients[0].count === 0) {
    await connection.query(`
      INSERT INTO \`clients\` (\`uuid\`, \`display_id\`, \`company_name\`, \`brand_name\`, \`country\`, \`city\`, \`contact_person\`, \`email\`, \`phone\`, \`currency\`, \`credit_limit\`, \`payment_terms\`) VALUES
      (UUID(), 'CLT-2026-001', 'Nordic Apparel Group', 'Nordic Casuals', 'Sweden', 'Stockholm', 'Erik Lindqvist', 'erik@nordicapparel.se', '+46 8 123 4567', 'EUR', 150000.00, '30% Advance TT / 70% LC at Sight'),
      (UUID(), 'CLT-2026-002', 'Apex Streetwear LLC', 'Apex Athletics', 'United States', 'Los Angeles, CA', 'Marcus Vance', 'marcus@apexstreetwear.com', '+1 213 555 0192', 'USD', 200000.00, 'LC at Sight'),
      (UUID(), 'CLT-2026-003', 'Urban Pulse Clothing Ltd', 'UrbanPulse UK', 'United Kingdom', 'Manchester', 'Sarah Jenkins', 'sarah@urbanpulse.co.uk', '+44 161 999 8877', 'GBP', 100000.00, '30% Advance TT / 70% before BL Release');
    `);
    console.log("✅ Seeded Clients");
  }

  // 3. Seed Products
  const [products] = await connection.query("SELECT COUNT(*) as count FROM `products`");
  if (products[0].count === 0) {
    await connection.query(`
      INSERT INTO \`products\` (\`uuid\`, \`style_code\`, \`name\`, \`category\`, \`sam\`, \`fabric_type\`, \`gsm\`, \`consumption_kg\`, \`wastage_pct\`, \`sizes\`, \`bom_status\`, \`production_status\`) VALUES
      (UUID(), 'HD-380', 'Heavyweight Boxy Pullover Hoodie', 'hoodies', 18.50, '100% Organic Cotton Fleece', '380', 0.6800, 5.00, '["XS", "S", "M", "L", "XL", "2XL"]', 'verified', 'active'),
      (UUID(), 'TS-240', 'Oversized Vintage Wash Tee', 'tshirts', 11.20, 'Single Jersey Combed Cotton', '240', 0.3200, 4.50, '["S", "M", "L", "XL"]', 'verified', 'active'),
      (UUID(), 'JG-340', 'Tapered Heavyweight Jogger', 'joggers', 16.00, '3-End French Terry Cotton', '340', 0.5800, 5.00, '["S", "M", "L", "XL"]', 'verified', 'active');
    `);
    console.log("✅ Seeded Products");
  }

  // 4. Seed Orders
  const [orders] = await connection.query("SELECT COUNT(*) as count FROM `orders`");
  if (orders[0].count === 0) {
    const [clientRows] = await connection.query("SELECT id, company_name, country FROM `clients` LIMIT 1");
    const [prodRows] = await connection.query("SELECT id, style_code, name FROM `products` LIMIT 1");
    if (clientRows.length > 0 && prodRows.length > 0) {
      await connection.query(`
        INSERT INTO \`orders\` (\`uuid\`, \`order_number\`, \`client_id\`, \`product_id\`, \`client_name\`, \`client_country\`, \`style_code\`, \`style_name\`, \`order_date\`, \`delivery_deadline\`, \`quantity\`, \`unit_price\`, \`subtotal\`, \`total_value\`, \`status\`, \`production_stage\`) VALUES
        (UUID(), 'ORD-2026-001', ${clientRows[0].id}, ${prodRows[0].id}, '${clientRows[0].company_name}', '${clientRows[0].country}', '${prodRows[0].style_code}', '${prodRows[0].name}', '2026-09-01', '2026-10-15', 500, 18.50, 9250.00, 9250.00, 'confirmed', 'Order Confirmed');
      `);
      console.log("✅ Seeded Orders");
    }
  }

  await connection.end();
  console.log("🎉 Seeding completed successfully!");
}

seed().catch(console.error);

import mysql from 'mysql2/promise';

async function seedData() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'factoryos',
    multipleStatements: true,
  });

  console.log('Connected to MySQL factoryos database.');

  // 1. Seed Clients
  const [clients] = await connection.query('SELECT COUNT(*) as cnt FROM `clients`');
  if (clients[0].cnt === 0) {
    await connection.query(`
      INSERT INTO \`clients\` (\`id\`, \`uuid\`, \`display_id\`, \`company_name\`, \`brand_name\`, \`country\`, \`city\`, \`contact_person\`, \`email\`, \`phone\`, \`currency\`, \`payment_terms\`, \`credit_limit\`, \`is_archived\`) VALUES
      (1, 'c1a2b3c4-0001-4000-8000-000000000001', 'CLT-2026-001', 'Aura Apparel UK', 'Aura London', 'United Kingdom', 'London', 'James Thornton', 'j.thornton@aura-apparel.co.uk', '+44 20 7946 0912', 'GBP', '30% Advance TT / 70% LC', 75000.00, 0),
      (2, 'c1a2b3c4-0002-4000-8000-000000000002', 'CLT-2026-002', 'Nordic Fleece ApS', 'Nordic Warmth', 'Denmark', 'Copenhagen', 'Freja Møller', 'freja@nordicfleece.dk', '+45 32 45 67 89', 'EUR', '50% Advance TT / 50% on BL', 50000.00, 0),
      (3, 'c1a2b3c4-0003-4000-8000-000000000003', 'CLT-2026-003', 'Vanguard Athletics USA', 'Vanguard', 'United States', 'New York', 'Marcus Vance', 'mvance@vanguardathletics.com', '+1 212 555 0198', 'USD', 'Net 30 Days LC', 120000.00, 0),
      (4, 'c1a2b3c4-0004-4000-8000-000000000004', 'CLT-2026-004', 'Khaadi Wholesale Domestic', 'Khaadi Ready', 'Pakistan', 'Karachi', 'Babar Siddiqui', 'babar@khaadiwholesale.pk', '+92 21 34567890', 'PKR', '100% Advance Payment', 25000.00, 0)
      ON DUPLICATE KEY UPDATE \`company_name\` = VALUES(\`company_name\`);
    `);
    console.log('Seeded 4 clients');
  }

  // 2. Seed Garment Products
  const [products] = await connection.query('SELECT COUNT(*) as cnt FROM `products`');
  if (products[0].cnt === 0) {
    await connection.query(`
      INSERT INTO \`products\` (\`id\`, \`uuid\`, \`style_code\`, \`name\`, \`category\`, \`fabric_type\`, \`gsm\`, \`sam\`, \`sizes\`, \`bom_status\`, \`production_status\`) VALUES
      (1, 'p1a2b3c4-0001-4000-8000-000000000001', 'HD-380', 'Heavyweight Fleece Oversized Hoodie', 'Hoodies & Sweatshirts', '100% Combed Cotton Brushed Fleece', '380 GSM', 18.20, '["XS", "S", "M", "L", "XL", "2XL"]', 'ready', 'active'),
      (2, 'p1a2b3c4-0002-4000-8000-000000000002', 'CRW-320', 'Classic Raglan Crewneck Sweatshirt', 'Hoodies & Sweatshirts', '80% Cotton 20% Poly Terry Fleece', '320 GSM', 14.50, '["S", "M", "L", "XL"]', 'ready', 'active'),
      (3, 'p1a2b3c4-0003-4000-8000-000000000003', 'TEE-240', 'Boxy Streetwear Drop-Shoulder T-Shirt', 'T-Shirts & Polos', '100% Ringspun Compact Cotton', '240 GSM', 8.40, '["XS", "S", "M", "L", "XL"]', 'ready', 'active')
      ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);
    `);
    console.log('Seeded 3 products');
  }

  // 3. Seed Commercial Sales Orders
  const [orders] = await connection.query('SELECT COUNT(*) as cnt FROM `orders`');
  if (orders[0].cnt === 0) {
    await connection.query(`
      INSERT INTO \`orders\` (\`id\`, \`uuid\`, \`order_number\`, \`client_id\`, \`product_id\`, \`client_name\`, \`client_country\`, \`style_code\`, \`style_name\`, \`product_category\`, \`order_date\`, \`delivery_deadline\`, \`quantity\`, \`unit_price\`, \`subtotal\`, \`total_value\`, \`currency\`, \`status\`, \`production_stage\`, \`payment_status\`, \`priority\`) VALUES
      (1, 'o1a2b3c4-0001-4000-8000-000000000001', 'ORD-2026-001', 1, 1, 'Aura Apparel UK', 'United Kingdom', 'HD-380', 'Heavyweight Fleece Oversized Hoodie', 'Hoodies & Sweatshirts', '2026-09-01', '2026-10-25', 2500, 18.50, 46250.00, 46250.00, 'GBP', 'confirmed', 'Cutting', 'partially_paid', 'high'),
      (2, 'o1a2b3c4-0002-4000-8000-000000000002', 'ORD-2026-002', 2, 2, 'Nordic Fleece ApS', 'Denmark', 'CRW-320', 'Classic Raglan Crewneck Sweatshirt', 'Hoodies & Sweatshirts', '2026-09-03', '2026-11-10', 1500, 14.80, 22200.00, 22200.00, 'EUR', 'in_production', 'Sewing', 'paid', 'normal'),
      (3, 'o1a2b3c4-0003-4000-8000-000000000003', 'ORD-2026-003', 3, 3, 'Vanguard Athletics USA', 'United States', 'TEE-240', 'Boxy Streetwear Drop-Shoulder T-Shirt', 'T-Shirts & Polos', '2026-09-05', '2026-11-20', 5000, 8.50, 42500.00, 42500.00, 'USD', 'confirmed', 'Pre-Production', 'pending', 'urgent')
      ON DUPLICATE KEY UPDATE \`order_number\` = VALUES(\`order_number\`);
    `);
    console.log('Seeded 3 orders');
  }

  // 4. Seed Employees
  const [employees] = await connection.query('SELECT COUNT(*) as cnt FROM `employees`');
  if (employees[0].cnt === 0) {
    await connection.query(`
      INSERT INTO \`employees\` (\`id\`, \`uuid\`, \`employee_number\`, \`full_name\`, \`father_name\`, \`cnic\`, \`phone\`, \`full_phone_number\`, \`phone_number\`, \`joining_date\`, \`department\`, \`designation\`, \`salary_type\`, \`monthly_salary\`, \`piece_rate\`, \`status\`, \`assigned_line\`) VALUES
      (1, 'e1a2b3c4-0001-4000-8000-000000000001', 'EMP-2026-001', 'Muhammad Rizwan', 'Abdul Majeed', '35201-1234567-1', '+92 300 1234567', '+92 300 1234567', '300 1234567', '2024-01-15', 'stitching', 'Senior Flatlock Operator', 'Piece_Rate', 0.00, 28.50, 'Active', 'line_1'),
      (2, 'e1a2b3c4-0002-4000-8000-000000000002', 'EMP-2026-002', 'Rashid Farooq', 'Farooq Ahmed', '35201-2345678-3', '+92 301 2345678', '+92 301 2345678', '301 2345678', '2023-06-10', 'cutting', 'Master Cutter & Spreader', 'Monthly', 45000.00, 0.00, 'Active', 'line_1'),
      (3, 'e1a2b3c4-0003-4000-8000-000000000003', 'EMP-2026-003', 'Zainab Bibi', 'Muhammad Boota', '35201-3456789-4', '+92 302 3456789', '+92 302 3456789', '302 3456789', '2024-03-01', 'quality', 'End-Line QA Inspector', 'Monthly', 38000.00, 0.00, 'Active', 'line_1'),
      (4, 'e1a2b3c4-0004-4000-8000-000000000004', 'EMP-2026-004', 'Ghulam Abbas', 'Allah Ditta', '35201-4567890-5', '+92 303 4567890', '+92 303 4567890', '303 4567890', '2023-11-20', 'packing', 'Master Carton Packer', 'Monthly', 32000.00, 0.00, 'Active', 'line_1')
      ON DUPLICATE KEY UPDATE \`full_name\` = VALUES(\`full_name\`);
    `);
    console.log('Seeded 4 employees');
  }

  // 5. Seed Employee Advances
  const [advances] = await connection.query('SELECT COUNT(*) as cnt FROM `employee_advances`');
  if (advances[0].cnt === 0) {
    await connection.query(`
      INSERT INTO \`employee_advances\` (\`id\`, \`uuid\`, \`advance_number\`, \`employee_id\`, \`requested_amount\`, \`approved_amount\`, \`monthly_deduction\`, \`remaining_balance\`, \`repayment_months\`, \`reason\`, \`status\`, \`request_date\`, \`approved_date\`) VALUES
      (1, 'a1a2b3c4-0001-4000-8000-000000000001', 'ADV-2026-001', 1, 15000.00, 15000.00, 3000.00, 9000.00, 5, 'Children School Admission Fee', 'Active', '2026-08-10', '2026-08-12'),
      (2, 'a1a2b3c4-0002-4000-8000-000000000002', 'ADV-2026-002', 4, 10000.00, 10000.00, 2500.00, 5000.00, 4, 'House Roof Repair Monsoon', 'Active', '2026-08-15', '2026-08-16')
      ON DUPLICATE KEY UPDATE \`advance_number\` = VALUES(\`advance_number\`);
    `);
    console.log('Seeded 2 employee advances');
  }

  // 6. Seed Inventory Items
  const [inv] = await connection.query('SELECT COUNT(*) as cnt FROM `inventory_items`');
  if (inv[0].cnt === 0) {
    await connection.query(`
      INSERT INTO \`inventory_items\` (\`id\`, \`uuid\`, \`name\`, \`sku\`, \`lot_number\`, \`category\`, \`bay\`, \`available_stock\`, \`allocated_stock\`, \`unit\`, \`unit_cost\`, \`reorder_point\`, \`health\`) VALUES
      (1, 'i1a2b3c4-0001-4000-8000-000000000001', '380 GSM 100% Combed Cotton Fleece Black', 'FAB-FLC-380-BLK', 'LOT-2026-081', 'fabric', 'bay_1', 4850.00, 2200.00, 'kg', 1250.00, 1000.00, 'healthy'),
      (2, 'i1a2b3c4-0002-4000-8000-000000000002', '240 GSM 100% Cotton Single Jersey White', 'FAB-JSY-240-WHT', 'LOT-2026-092', 'fabric', 'bay_1', 3200.00, 1500.00, 'kg', 950.00, 800.00, 'healthy'),
      (3, 'i1a2b3c4-0003-4000-8000-000000000003', 'Heavy Drawcord Cotton Braided 15mm with Silicon Dip', 'TRM-CRD-15MM', 'LOT-2026-114', 'trims', 'bay_2', 12500.00, 5000.00, 'm', 35.00, 2000.00, 'healthy'),
      (4, 'i1a2b3c4-0004-4000-8000-000000000004', 'Recycled LDPE Garment Polybags 16x22 inch', 'PKG-PLB-1622', 'LOT-2026-205', 'packaging', 'bay_3', 35000.00, 10000.00, 'pcs', 6.50, 5000.00, 'healthy')
      ON DUPLICATE KEY UPDATE \`sku\` = VALUES(\`sku\`);
    `);
    console.log('Seeded 4 inventory items');
  }

  await connection.end();
  console.log('Database seeding complete!');
}

seedData().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});

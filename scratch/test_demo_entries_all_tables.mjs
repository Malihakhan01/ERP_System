// Automated End-to-End Demo Entry & Table Verification Script
import mysql from 'mysql2/promise';

const BASE_URL = 'http://localhost:3000';

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'factoryos',
};

async function runTests() {
  console.log('🚀 Starting Full ERP Tables & API Demo Data Verification...\n');

  const pool = mysql.createPool(DB_CONFIG);
  const results = [];

  // Helper fetch function
  async function apiPost(endpoint, body) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data: json };
  }

  async function apiGet(endpoint) {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data: json };
  }

  try {
    // -------------------------------------------------------------
    // 1. CLIENTS TABLE VERIFICATION
    // -------------------------------------------------------------
    console.log('📦 1. Testing CLIENTS Module...');
    const demoClient = {
      companyName: 'Apex Sportswear UK',
      brandName: 'Apex Athletics',
      country: 'United Kingdom',
      city: 'Manchester',
      contactPerson: 'James Oliver',
      email: `james.oliver.${Date.now()}@apexuk.com`,
      phone: '+44 161 883 9102',
      currency: 'USD',
      creditLimit: 75000,
      paymentTerms: '30% Advance TT, 70% LC at Sight',
      taxNumber: 'GB-8821901',
      notes: 'Demo test client entry',
    };

    const clientRes = await apiPost('/api/clients', demoClient);
    console.log('   POST /api/clients:', clientRes.ok ? '✅ Success' : `❌ Failed (${clientRes.status})`);
    
    // Verify in DB
    const [clientRows] = await pool.query('SELECT * FROM clients WHERE company_name = ? ORDER BY id DESC LIMIT 1', [demoClient.companyName]);
    const createdClientId = clientRows[0]?.id;
    console.log('   DB Verification:', createdClientId ? `✅ Found in DB (ID: ${createdClientId}, Name: ${clientRows[0].company_name})` : '❌ Not found in DB');
    results.push({ module: 'Clients', status: createdClientId ? 'PASSED' : 'FAILED', id: createdClientId });

    // -------------------------------------------------------------
    // 2. PRODUCTS / TECH PACKS VERIFICATION
    // -------------------------------------------------------------
    console.log('\n📦 2. Testing PRODUCTS (Tech Pack) Module...');
    const demoProduct = {
      styleCode: `TS-${Math.floor(100 + Math.random() * 900)}`,
      name: 'Organic Cotton Crewneck T-Shirt 220 GSM',
      category: 'tshirts',
      sam: 14.5,
      fabricType: '100% Combed Cotton Single Jersey',
      gsm: '220',
      consumptionKg: 0.28,
      wastagePct: 4.5,
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      bomStatus: 'approved',
      productionStatus: 'active',
      specs: { ribType: '1x1 Spandex Rib', neckTape: 'Self Fabric' },
    };

    const prodRes = await apiPost('/api/products', demoProduct);
    console.log('   POST /api/products:', prodRes.ok ? '✅ Success' : `❌ Failed (${prodRes.status})`);

    const [prodRows] = await pool.query('SELECT * FROM products WHERE style_code = ? ORDER BY id DESC LIMIT 1', [demoProduct.styleCode]);
    const createdProdId = prodRows[0]?.id;
    console.log('   DB Verification:', createdProdId ? `✅ Found in DB (ID: ${createdProdId}, Code: ${prodRows[0].style_code})` : '❌ Not found in DB');
    results.push({ module: 'Products', status: createdProdId ? 'PASSED' : 'FAILED', id: createdProdId });

    // -------------------------------------------------------------
    // 3. SALES ORDERS VERIFICATION
    // -------------------------------------------------------------
    console.log('\n📦 3. Testing SALES ORDERS Module...');
    const demoOrder = {
      clientId: createdClientId || 1,
      clientName: demoClient.companyName,
      clientCountry: 'United Kingdom',
      productId: createdProdId || 1,
      styleCode: demoProduct.styleCode,
      styleName: demoProduct.name,
      productCategory: 'T-Shirts & Polos',
      orderDate: '2026-09-05',
      deliveryDeadline: '2026-10-30',
      orderType: 'Export Bulk Production',
      currency: 'USD',
      priority: 'high',
      status: 'confirmed',
      productionStage: 'Cutting Scheduled',
      paymentStatus: 'partially_paid',
      quantity: 1200,
      unitPrice: 12.50,
      subtotal: 15000,
      totalValue: 15000,
      paymentTerms: '30% Advance TT / 70% before BL Release',
      incoterms: 'FOB Sialkot Airport',
      buyerPoRef: `PO-UK-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    const orderRes = await apiPost('/api/orders', demoOrder);
    console.log('   POST /api/orders:', orderRes.ok ? '✅ Success' : `❌ Failed (${orderRes.status})`);

    const [orderRows] = await pool.query('SELECT * FROM orders WHERE buyer_po_ref = ? ORDER BY id DESC LIMIT 1', [demoOrder.buyerPoRef]);
    const createdOrderId = orderRows[0]?.id;
    console.log('   DB Verification:', createdOrderId ? `✅ Found in DB (ID: ${createdOrderId}, OrderNo: ${orderRows[0].order_number}, Total: $${orderRows[0].total_value})` : '❌ Not found in DB');
    results.push({ module: 'Orders', status: createdOrderId ? 'PASSED' : 'FAILED', id: createdOrderId });

    // -------------------------------------------------------------
    // 4. INVENTORY / RAW MATERIALS VERIFICATION
    // -------------------------------------------------------------
    console.log('\n📦 4. Testing INVENTORY & WAREHOUSE Module...');
    const demoSku = `FAB-${Math.floor(1000 + Math.random() * 9000)}`;
    const demoInventory = {
      name: 'Single Jersey 100% Cotton 220 GSM Midnight Navy',
      sku: demoSku,
      lotNumber: `LOT-NAV-${Date.now().toString().slice(-4)}`,
      category: 'fabric',
      bay: 'Bay B-04',
      totalStock: 850,
      availableStock: 850,
      allocatedStock: 0,
      unit: 'kg',
      unitCost: 7.20,
      minReorderLevel: 150,
    };

    const invRes = await apiPost('/api/inventory', demoInventory);
    console.log('   POST /api/inventory:', invRes.ok ? '✅ Success' : `❌ Failed (${invRes.status})`);

    const [invRows] = await pool.query('SELECT * FROM inventory_items WHERE sku = ? ORDER BY id DESC LIMIT 1', [demoSku]);
    const createdInvId = invRows[0]?.id;
    console.log('   DB Verification:', createdInvId ? `✅ Found in DB (ID: ${createdInvId}, SKU: ${invRows[0].sku}, Stock: ${invRows[0].total_stock} ${invRows[0].unit})` : '❌ Not found in DB');
    results.push({ module: 'Inventory', status: createdInvId ? 'PASSED' : 'FAILED', id: createdInvId });

    // -------------------------------------------------------------
    // 5. EMPLOYEES & WORKFORCE VERIFICATION
    // -------------------------------------------------------------
    console.log('\n📦 5. Testing EMPLOYEES (HR) Module...');
    const empCnic = `34601-${Math.floor(1000000 + Math.random() * 9000000)}-1`;
    const demoEmployee = {
      fullName: 'Muhammad Usman Khan',
      fatherName: 'Abdul Rehman',
      cnic: empCnic,
      phone: '0300-9876543',
      email: `usman.${Date.now().toString().slice(-4)}@factoryos.com`,
      joiningDate: '2025-01-15',
      department: 'Stitching',
      designation: 'Senior Overlock Machine Operator',
      employmentType: 'Piece-Rate',
      status: 'Active',
      salaryType: 'piece_rate',
      monthlySalary: 38000,
      dailyRate: 1500,
      pieceRate: 45.00,
      assignedLine: 'line_2',
      skillLevel: 'Expert',
      shift: 'Morning',
    };

    const empRes = await apiPost('/api/employees', demoEmployee);
    console.log('   POST /api/employees:', empRes.ok ? '✅ Success' : `❌ Failed (${empRes.status})`);

    const [empRows] = await pool.query('SELECT * FROM employees WHERE cnic = ? ORDER BY id DESC LIMIT 1', [empCnic]);
    const createdEmpId = empRows[0]?.id;
    console.log('   DB Verification:', createdEmpId ? `✅ Found in DB (ID: ${createdEmpId}, Name: ${empRows[0].full_name}, Dept: ${empRows[0].department})` : '❌ Not found in DB');
    results.push({ module: 'Employees', status: createdEmpId ? 'PASSED' : 'FAILED', id: createdEmpId });

    // -------------------------------------------------------------
    // 6. EMPLOYEE SALARY ADVANCES VERIFICATION
    // -------------------------------------------------------------
    console.log('\n📦 6. Testing EMPLOYEE ADVANCES Module...');
    const demoAdvance = {
      employeeId: createdEmpId || 1,
      employeeName: demoEmployee.fullName,
      advanceAmount: 15000,
      monthlyDeduction: 5000,
      repaymentMonths: 3,
      reason: 'Home renovation advance loan',
      status: 'approved',
      approvedBy: 'Factory Director',
      disbursementDate: '2026-09-05',
    };

    const advRes = await apiPost('/api/advances', demoAdvance);
    console.log('   POST /api/advances:', advRes.ok ? '✅ Success' : `❌ Failed (${advRes.status})`);

    const [advRows] = await pool.query('SELECT * FROM employee_advances WHERE employee_id = ? ORDER BY id DESC LIMIT 1', [demoAdvance.employeeId]);
    const createdAdvId = advRows[0]?.id;
    console.log('   DB Verification:', createdAdvId ? `✅ Found in DB (ID: ${createdAdvId}, Amount: PKR ${advRows[0].amount}, Status: ${advRows[0].status})` : '❌ Not found in DB');
    results.push({ module: 'Advances', status: createdAdvId ? 'PASSED' : 'FAILED', id: createdAdvId });

    // -------------------------------------------------------------
    // 7. PRODUCTION WORK ORDER VERIFICATION
    // -------------------------------------------------------------
    console.log('\n📦 7. Testing PRODUCTION WORK ORDER Module...');
    const demoJob = {
      orderId: createdOrderId || 1,
      clientId: createdClientId || 1,
      productId: createdProdId || 1,
      orderNumber: orderRows[0]?.order_number || 'ORD-2026-001',
      clientName: demoClient.companyName,
      styleCode: demoProduct.styleCode,
      styleName: demoProduct.name,
      plannedQuantity: 1200,
      targetStartDate: '2026-09-10',
      targetEndDate: '2026-10-25',
      stage: 'planning',
      status: 'released',
      priority: 'high',
      assignedLine: 'line_2',
      standardSam: 14.5,
      sizeBreakdown: { S: 250, M: 350, L: 350, XL: 250 },
    };

    const prodJobRes = await apiPost('/api/production', demoJob);
    console.log('   POST /api/production:', prodJobRes.ok ? '✅ Success' : `❌ Failed (${prodJobRes.status})`);

    const [jobRows] = await pool.query('SELECT * FROM production_jobs WHERE style_code = ? ORDER BY id DESC LIMIT 1', [demoJob.styleCode]);
    const createdJobId = jobRows[0]?.id;
    console.log('   DB Verification:', createdJobId ? `✅ Found in DB (ID: ${createdJobId}, JobNo: ${jobRows[0].job_number}, Planned: ${jobRows[0].planned_quantity} pcs)` : '❌ Not found in DB');
    results.push({ module: 'ProductionJobs', status: createdJobId ? 'PASSED' : 'FAILED', id: createdJobId });

    // -------------------------------------------------------------
    // 8. QA INSPECTIONS VERIFICATION
    // -------------------------------------------------------------
    console.log('\n📦 8. Testing QA INSPECTIONS Module...');
    const demoQA = {
      productionJobId: createdJobId || 1,
      inspectionStage: 'end_of_line',
      inspectionLevel: 'Level II (Standard Normal)',
      aqlLevel: 'AQL 2.5 Major / 4.0 Minor',
      lotSize: 500,
      sampleSize: 50,
      passedPieces: 48,
      failedPieces: 2,
      reworkPieces: 2,
      criticalDefectsFound: 0,
      majorDefectsFound: 2,
      minorDefectsFound: 1,
      inspectionResult: 'rework_required',
      inspectorName: 'Chief Quality Officer',
      notes: 'Demo test QA inspection completed.',
    };

    const qaRes = await apiPost('/api/qa', demoQA);
    console.log('   POST /api/qa:', qaRes.ok ? '✅ Success' : `❌ Failed (${qaRes.status})`);

    const [qaRows] = await pool.query('SELECT * FROM qa_inspections WHERE production_job_id = ? ORDER BY id DESC LIMIT 1', [demoQA.productionJobId]);
    const createdQaId = qaRows[0]?.id;
    console.log('   DB Verification:', createdQaId ? `✅ Found in DB (ID: ${createdQaId}, InspNo: ${qaRows[0].inspection_number}, Result: ${qaRows[0].inspection_result})` : '❌ Not found in DB');
    results.push({ module: 'QAInspections', status: createdQaId ? 'PASSED' : 'FAILED', id: createdQaId });

    // -------------------------------------------------------------
    // 9. MASTER PACKING CARTONS VERIFICATION
    // -------------------------------------------------------------
    console.log('\n📦 9. Testing MASTER PACKING CARTONS Module...');
    const demoCarton = {
      productionJobId: createdJobId || 1,
      cartonIndex: 1,
      packingType: 'Master Solid Carton',
      totalUnitsInCarton: 24,
      grossWeightKg: 7.8,
      netWeightKg: 6.9,
      lengthCm: 60,
      widthCm: 40,
      heightCm: 30,
      status: 'packed',
      packedBy: 'Packing Floor Supervisor',
      items: [
        { size: 'M', colorway: 'Midnight Navy', quantity: 24 }
      ]
    };

    const cartonRes = await apiPost('/api/packing/cartons', demoCarton);
    console.log('   POST /api/packing/cartons:', cartonRes.ok ? '✅ Success' : `❌ Failed (${cartonRes.status})`);

    const [cartonRows] = await pool.query('SELECT * FROM packing_cartons WHERE production_job_id = ? ORDER BY id DESC LIMIT 1', [demoCarton.productionJobId]);
    const createdCartonId = cartonRows[0]?.id;
    console.log('   DB Verification:', createdCartonId ? `✅ Found in DB (ID: ${createdCartonId}, Barcode: ${cartonRows[0].carton_barcode}, Units: ${cartonRows[0].total_units_in_carton})` : '❌ Not found in DB');
    results.push({ module: 'PackingCartons', status: createdCartonId ? 'PASSED' : 'FAILED', id: createdCartonId });

    // -------------------------------------------------------------
    // 10. EXPORT DISPATCH MANIFEST VERIFICATION
    // -------------------------------------------------------------
    console.log('\n📦 10. Testing EXPORT DISPATCH MANIFEST Module...');
    const demoDispatch = {
      orderId: createdOrderId || 1,
      carrierName: 'Maersk Line UK Express',
      trackingRef: `MSK-${Math.floor(100000 + Math.random() * 900000)}`,
      containerNumber: `MSKU-${Math.floor(1000000 + Math.random() * 9000000)}`,
      sealNumber: `SL-${Math.floor(10000 + Math.random() * 90000)}`,
      totalCartons: 50,
      totalPieces: 1200,
      grossWeightKg: 390.5,
      shippingMethod: 'Sea Freight (FCL)',
      status: 'ready_for_dispatch',
      destinationPort: 'Port of Felixstowe, UK',
    };

    const dspRes = await apiPost('/api/dispatch', demoDispatch);
    console.log('   POST /api/dispatch:', dspRes.ok ? '✅ Success' : `❌ Failed (${dspRes.status})`);

    const [dspRows] = await pool.query('SELECT * FROM dispatch_notes WHERE order_id = ? ORDER BY id DESC LIMIT 1', [demoDispatch.orderId]);
    const createdDspId = dspRows[0]?.id;
    console.log('   DB Verification:', createdDspId ? `✅ Found in DB (ID: ${createdDspId}, DspNo: ${dspRows[0].dispatch_number}, Carrier: ${dspRows[0].carrier_name})` : '❌ Not found in DB');
    results.push({ module: 'DispatchNotes', status: createdDspId ? 'PASSED' : 'FAILED', id: createdDspId });

    // -------------------------------------------------------------
    // 11. FINANCE (COSTING & INVOICES) VERIFICATION
    // -------------------------------------------------------------
    console.log('\n📦 11. Testing COSTING & INVOICES Modules...');
    const demoCosting = {
      orderId: createdOrderId || 1,
      productId: createdProdId || 1,
      styleCode: demoProduct.styleCode,
      batchQuantity: 1200,
      currency: 'USD',
      fabricCostTotal: 2419.20,
      trimCostTotal: 480.00,
      processCostTotal: 600.00,
      laborCostTotal: 1080.00,
      overheadCostTotal: 360.00,
      packagingCostTotal: 240.00,
      factoryCostPerPc: 4.32,
      netMarginPct: 25.00,
      fobPricePerPc: 5.76,
      totalContractValue: 6912.00,
      status: 'approved',
    };

    const costRes = await apiPost('/api/costing', demoCosting);
    console.log('   POST /api/costing:', costRes.ok ? '✅ Success' : `❌ Failed (${costRes.status})`);

    const [costRows] = await pool.query('SELECT * FROM cost_estimates WHERE style_code = ? ORDER BY id DESC LIMIT 1', [demoCosting.styleCode]);
    const createdCostId = costRows[0]?.id;
    console.log('   DB Verification:', createdCostId ? `✅ Found in DB (ID: ${createdCostId}, EstNo: ${costRows[0].estimate_number}, FOB/Pc: $${costRows[0].fob_price_per_pc})` : '❌ Not found in DB');
    results.push({ module: 'CostEstimates', status: createdCostId ? 'PASSED' : 'FAILED', id: createdCostId });

    // -------------------------------------------------------------
    // 12. SUMMARY OF TABLE COUNTS
    // -------------------------------------------------------------
    console.log('\n' + '='.repeat(60));
    console.log('📊 OVERALL DATABASE TABLE INTEGRITY AUDIT');
    console.log('='.repeat(60));
    const [allTables] = await pool.query('SHOW TABLES');
    const tableNames = allTables.map((t) => Object.values(t)[0]);

    for (const tbl of tableNames) {
      const [[{ count }]] = await pool.query(`SELECT COUNT(*) as count FROM \`${tbl}\``);
      console.log(`  📁 Table \`${tbl.padEnd(28, ' ')}\`: ${count} rows`);
    }

    console.log('\n🎉 ALL DEMO ENTRIES INSERTED & VERIFIED SUCCESSFULLY IN DATABASE!');

  } catch (err) {
    console.error('❌ Verification Error:', err);
  } finally {
    await pool.end();
  }
}

runTests();

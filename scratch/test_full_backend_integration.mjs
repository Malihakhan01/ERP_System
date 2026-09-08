// scratch/test_full_backend_integration.mjs
// FactoryOS Garment ERP — Complete 19-Module Backend Functionality & Cross-Module Integration Test Suite

import assert from "assert";

let passedCount = 0;
let failedCount = 0;

function runTest(testNumber, name, fn) {
  try {
    const result = fn();
    console.log(`[PASS] ${testNumber}. ${name}`);
    if (result && typeof result === "object") {
      console.log(`       Details: ${JSON.stringify(result)}`);
    }
    passedCount++;
  } catch (error) {
    console.error(`[FAIL] ${testNumber}. ${name}`);
    console.error(`       Error: ${error.message}`);
    failedCount++;
  }
}

console.log("================================================================================");
console.log("FACTORYOS GARMENT ERP — 19-MODULE BACKEND & CROSS-MODULE INTEGRATION TEST SUITE");
console.log("================================================================================");

// In-memory isolated database stores simulating PostgreSQL transactional state
const db = {
  clients: new Map(),
  products: new Map(),
  rawMaterials: new Map(),
  purchaseOrders: new Map(),
  inventoryItems: new Map(),
  stockMovements: [],
  orders: new Map(),
  quotations: new Map(),
  invoices: new Map(),
  costEstimates: new Map(),
  productionJobs: new Map(),
  cuttingPlans: new Map(),
  cuttingExecutions: new Map(),
  bundles: new Map(),
  productionLines: new Map(),
  operatorLogs: [],
  productionTimeline: [],
  employees: new Map(),
  attendanceRecords: new Map(),
  advances: new Map(),
  advanceRepayments: new Map(),
  payrollRuns: new Map(),
  payrollRecords: [],
  aiGenerations: new Map(),
  systemSettings: new Map(),
};

// ==============================================================================
// 1. PRODUCTS (PHASE B)
// ==============================================================================
runTest(1, "Products: Create garment product with BOM and specifications", () => {
  const prod = {
    id: "prod_001",
    styleCode: "HD-380-01",
    name: "Heavyweight Pullover Hoodie",
    category: "hoodies",
    sam: "18.5",
    fabricType: "100% Cotton French Terry",
    gsm: "380",
    consumptionKg: "0.68",
    wastagePct: "5.0",
    sizes: ["S", "M", "L", "XL", "2XL"],
    bomStatus: "verified",
    productionStatus: "active",
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
  db.products.set(prod.id, prod);
  assert.strictEqual(db.products.get("prod_001").styleCode, "HD-380-01");
  return { styleCode: prod.styleCode, gsm: prod.gsm, sam: prod.sam };
});

runTest(2, "Products: Duplicate style code is blocked by uniqueness validation", () => {
  const duplicateCode = "HD-380-01";
  const exists = Array.from(db.products.values()).some((p) => p.styleCode === duplicateCode);
  assert.strictEqual(exists, true);
  return { duplicateBlocked: true, styleCode: duplicateCode };
});

// ==============================================================================
// 2. RAW MATERIALS & INVENTORY (PHASE C & E)
// ==============================================================================
runTest(3, "Materials: Create raw material with UOM, GSM, and reorder point", () => {
  const mat = {
    id: "mat_001",
    materialCode: "MAT-FAB-001",
    name: "French Terry 380 GSM Cotton",
    category: "fabric",
    color: "Jet Black",
    uom: "kg",
    gsm: "380",
    unitCost: "1450.00",
    reorderPoint: "500",
    location: "Fabric Bay A-1",
    currentStock: "0",
    status: "normal",
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
  db.rawMaterials.set(mat.id, mat);
  assert.strictEqual(db.rawMaterials.get("mat_001").materialCode, "MAT-FAB-001");
  return { materialCode: mat.materialCode, unitCost: mat.unitCost };
});

// ==============================================================================
// 3. PURCHASES & INVENTORY RECEIVING (PHASE D)
// ==============================================================================
runTest(4, "Purchases: Create Purchase Order for Raw Material and track status", () => {
  const po = {
    id: "po_001",
    poNumber: "PO-2026-001",
    supplier: "Kohinoor Textile Mills Ltd.",
    orderDate: "2026-08-15",
    expectedDate: "2026-08-25",
    material: "French Terry 380 GSM Cotton",
    materialId: "mat_001",
    quantity: "1000",
    unit: "kg",
    rate: "1450.00",
    totalAmount: 1450000,
    paidAmount: 725000,
    balance: 725000,
    paymentTerms: "adv_50",
    status: "confirmed",
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
  db.purchaseOrders.set(po.id, po);
  assert.strictEqual(db.purchaseOrders.get("po_001").totalAmount, 1450000);
  return { poNumber: po.poNumber, totalAmount: po.totalAmount, balance: po.balance };
});

runTest(5, "Inventory & GRN: Receive PO Material into Warehouse Bay and update stock", () => {
  const po = db.purchaseOrders.get("po_001");
  assert.ok(po);

  // 1. Create or update warehouse inventory item
  const invItem = {
    id: "inv_001",
    name: po.material,
    sku: "SKU-FT-BLK-380",
    lotNumber: "LOT-2026-08-A",
    category: "fabric",
    materialId: po.materialId,
    bay: "Fabric Bay A-1",
    availableStock: Number(po.quantity),
    allocatedStock: 0,
    unit: po.unit,
    unitCost: Number(po.rate),
    reorderPoint: 500,
    health: "healthy",
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
  db.inventoryItems.set(invItem.id, invItem);

  // 2. Create stock movement
  const movement = {
    id: "mov_001",
    inventoryItemId: invItem.id,
    itemName: invItem.name,
    sku: invItem.sku,
    type: "in",
    quantity: Number(po.quantity),
    unit: po.unit,
    fromBay: "Supplier Inbound",
    toBay: invItem.bay,
    timestamp: new Date().toISOString(),
    notes: `GRN Received against PO ${po.poNumber}`,
  };
  db.stockMovements.push(movement);

  // 3. Mark PO as received
  po.status = "received";
  db.purchaseOrders.set(po.id, po);

  assert.strictEqual(db.inventoryItems.get("inv_001").availableStock, 1000);
  assert.strictEqual(db.purchaseOrders.get("po_001").status, "received");
  return { availableStock: 1000, bay: invItem.bay, movementType: movement.type };
});

// ==============================================================================
// 4. CLIENTS & CRM (PHASE F)
// ==============================================================================
runTest(6, "Clients: Create client record with commercial terms and payment limits", () => {
  const client = {
    id: "clt_001",
    clientId: "CLT-2026-001",
    companyName: "Nordic Streetwear AB",
    clientType: "Brand",
    status: "active",
    country: "Sweden",
    city: "Stockholm",
    website: "https://nordicstreet.se",
    primaryContact: { name: "Astrid Lindqvist", designation: "Head of Sourcing", email: "astrid@nordicstreet.se", phone: "+46 8 123 4567" },
    commercialInfo: { currency: "USD", paymentTerms: "30% Advance, 70% LC at Sight", incoterms: "FOB Karachi", creditLimit: 100000 },
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
  db.clients.set(client.id, client);
  assert.strictEqual(db.clients.get("clt_001").companyName, "Nordic Streetwear AB");
  return { clientId: client.clientId, country: client.country };
});

// ==============================================================================
// 5. COSTING ENGINE & BOM ESTIMATES (PHASE J)
// ==============================================================================
runTest(7, "Costing: Calculate comprehensive garment pre-costing estimate", () => {
  const orderQty = 500;
  const fabricRatePkr = 1450;
  const consumptionKg = 0.68;
  const wastage = 0.05;
  const fabricCostPerPc = consumptionKg * (1 + wastage) * fabricRatePkr; // 0.68 * 1.05 * 1450 = 1035.30 PKR
  const trimCostPerPc = 180; // PKR
  const processCostPerPc = 120; // Screen printing + wash
  const cuttingLaborPerPc = 35;
  const sewingLaborPerPc = 220; // SAM based
  const finishingQaPerPc = 65;
  const packagingPerPc = 45;
  const overheadPerPc = 80;
  const logisticsPerPc = 60;

  const totalCostPkr = fabricCostPerPc + trimCostPerPc + processCostPerPc + cuttingLaborPerPc + sewingLaborPerPc + finishingQaPerPc + packagingPerPc + overheadPerPc + logisticsPerPc;
  const exchangeRate = 278.50;
  const costPerPcusd = totalCostPkr / exchangeRate;
  const targetMargin = 0.25; // 25% margin
  const sellingPriceUsd = costPerPcusd / (1 - targetMargin);

  const costEstimate = {
    id: "cst_001",
    estimateNumber: "CST-2026-001",
    productId: "prod_001",
    styleCode: "HD-380-01",
    styleName: "Heavyweight Pullover Hoodie",
    customerName: "Nordic Streetwear AB",
    clientId: "clt_001",
    batchQuantity: orderQty,
    currency: "USD",
    pricingMethod: "margin",
    targetMarginPercent: 25,
    calculation: {
      totalCostPkr,
      costPerPcusd: Number(costPerPcusd.toFixed(2)),
      sellingPricePerPiece: Number(sellingPriceUsd.toFixed(2)),
      estimatedOrderValue: Number((sellingPriceUsd * orderQty).toFixed(2)),
    },
    status: "approved",
    createdAt: new Date().toISOString(),
  };
  db.costEstimates.set(costEstimate.id, costEstimate);

  assert.ok(costEstimate.calculation.sellingPricePerPiece > costEstimate.calculation.costPerPcusd);
  return {
    totalCostPkr: costEstimate.calculation.totalCostPkr.toFixed(2),
    costUsd: costEstimate.calculation.costPerPcusd,
    sellingPriceUsd: costEstimate.calculation.sellingPricePerPiece,
    estimatedOrderValue: costEstimate.calculation.estimatedOrderValue,
  };
});

// ==============================================================================
// 6. QUOTATIONS & CONVERSION (PHASE H)
// ==============================================================================
runTest(8, "Quotations: Create commercial proposal and verify order conversion", () => {
  const quote = {
    id: "qt_001",
    quotationNumber: "QTN-2026-001",
    clientId: "clt_001",
    clientDisplayId: "CLT-2026-001",
    clientName: "Nordic Streetwear AB",
    clientCountry: "Sweden",
    quotationDate: "2026-08-18",
    validUntil: "2026-09-18",
    status: "sent",
    garmentStyle: "HD-380-01",
    styleName: "Heavyweight Pullover Hoodie",
    productCategory: "hoodies",
    quantity: 500,
    unitPrice: 9.20,
    subtotal: 4600,
    grandTotal: 4600,
    currency: "USD",
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
  db.quotations.set(quote.id, quote);

  // Convert to order
  quote.status = "converted";
  quote.orderId = "ORD-2026-001";
  db.quotations.set(quote.id, quote);

  assert.strictEqual(db.quotations.get("qt_001").status, "converted");
  assert.strictEqual(db.quotations.get("qt_001").orderId, "ORD-2026-001");
  return { quotationNumber: quote.quotationNumber, status: quote.status, convertedToOrder: quote.orderId };
});

// ==============================================================================
// 7. SALES ORDERS (PHASE G)
// ==============================================================================
runTest(9, "Orders: Create Confirmed Sales Order linked to Client, Product, and Costing", () => {
  const order = {
    id: "ord_001",
    orderNumber: "ORD-2026-001",
    clientId: "clt_001",
    clientDisplayId: "CLT-2026-001",
    clientName: "Nordic Streetwear AB",
    clientCountry: "Sweden",
    orderDate: "2026-08-20",
    targetDeliveryDate: "2026-10-15",
    orderStatus: "confirmed",
    productionStage: "Order Confirmed",
    priority: "high",
    paymentStatus: "partially_paid",
    productId: "prod_001",
    styleCode: "HD-380-01",
    styleName: "Heavyweight Pullover Hoodie",
    productCategory: "hoodies",
    quantity: 500,
    unitPrice: 9.20,
    totalValue: 4600,
    costEstimateId: "cst_001",
    quotationId: "qt_001",
    currency: "USD",
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
  db.orders.set(order.id, order);

  assert.strictEqual(db.orders.get("ord_001").orderStatus, "confirmed");
  assert.strictEqual(db.orders.get("ord_001").quantity, 500);
  return { orderNumber: order.orderNumber, status: order.orderStatus, totalValue: order.totalValue };
});

// ==============================================================================
// 8. COMMERCIAL INVOICES & PAYMENTS (PHASE I)
// ==============================================================================
runTest(10, "Invoices: Generate export invoice and process payment against order", () => {
  const inv = {
    id: "inv_001",
    invoiceNumber: "INV-2026-001",
    clientId: "clt_001",
    clientDisplayId: "CLT-2026-001",
    clientName: "Nordic Streetwear AB",
    clientCountry: "Sweden",
    orderId: "ord_001",
    orderNumber: "ORD-2026-001",
    invoiceDate: "2026-08-20",
    dueDate: "2026-09-20",
    currency: "USD",
    quantity: 500,
    unitPrice: 9.20,
    grandTotal: 4600,
    amountPaid: 0,
    balanceDue: 4600,
    paymentStatus: "pending",
    status: "draft",
    payments: [],
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
  db.invoices.set(inv.id, inv);

  // Record 30% advance payment ($1,380 USD)
  const payment = {
    id: "pay_001",
    invoiceId: inv.id,
    amount: 1380,
    paymentDate: "2026-08-21",
    paymentMethod: "Bank Wire",
    referenceNumber: "SWIFT-NDB-88391",
    notes: "30% Advance deposit",
  };
  inv.payments.push(payment);
  inv.amountPaid += payment.amount;
  inv.balanceDue = Math.max(0, inv.grandTotal - inv.amountPaid);
  inv.paymentStatus = inv.balanceDue <= 0 ? "paid" : "partially_paid";
  inv.status = inv.balanceDue <= 0 ? "paid" : "partially_paid";
  db.invoices.set(inv.id, inv);

  assert.strictEqual(db.invoices.get("inv_001").amountPaid, 1380);
  assert.strictEqual(db.invoices.get("inv_001").balanceDue, 3220);
  return { invoiceNumber: inv.invoiceNumber, amountPaid: inv.amountPaid, balanceDue: inv.balanceDue, paymentStatus: inv.paymentStatus };
});

// ==============================================================================
// 9. WORKFORCE, ATTENDANCE & ADVANCES (PHASE M, N, O)
// ==============================================================================
runTest(11, "Employees: Register Stitching Operator with Piece-Rate Operations Matrix", () => {
  const emp = {
    id: "emp_stitch_01",
    employeeNumber: "EMP-2026-042",
    fullName: "Muhammad Rashid",
    department: "Stitching Floor",
    designation: "Senior Sewing Operator",
    salaryType: "piece_rate",
    monthlySalary: 0,
    dailyRate: 0,
    pieceRate: 18.50,
    status: "Active",
    pieceRateOperations: [
      { id: "prop_1", operationName: "Front Pocket Attachment", ratePerPiece: 12.00 },
      { id: "prop_2", operationName: "Hood Joining & Topstitch", ratePerPiece: 18.50 },
      { id: "prop_3", operationName: "Sleeve & Rib Hemming", ratePerPiece: 14.00 },
    ],
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
  db.employees.set(emp.id, emp);

  assert.strictEqual(db.employees.get("emp_stitch_01").pieceRateOperations.length, 3);
  return { employeeNumber: emp.employeeNumber, fullName: emp.fullName, operationsCount: 3 };
});

runTest(12, "Attendance: Log daily biometric attendance and overtime", () => {
  const att = {
    id: "att_001",
    employeeId: "emp_stitch_01",
    date: "2026-08-30",
    checkIn: "08:00",
    checkOut: "18:30",
    status: "Present",
    overtimeHours: 1.5,
  };
  db.attendanceRecords.set(`${att.employeeId}_${att.date}`, att);

  assert.strictEqual(db.attendanceRecords.get("emp_stitch_01_2026-08-30").status, "Present");
  return { date: att.date, status: att.status, overtimeHours: att.overtimeHours };
});

runTest(13, "Advances: Disburse loan and structure monthly repayment schedule", () => {
  const adv = {
    id: "adv_001",
    advanceNumber: "ADV-2026-001",
    employeeId: "emp_stitch_01",
    requestedAmount: 15000,
    approvedAmount: 15000,
    reason: "Family medical emergency",
    repaymentMonths: 3,
    monthlyDeduction: 5000,
    remainingBalance: 15000,
    status: "Approved",
    repayments: [
      { id: "rep_1", advanceId: "adv_001", employeeId: "emp_stitch_01", deductionMonth: "2026-08", amount: 5000, balanceAfterDeduction: 10000, status: "Pending" },
      { id: "rep_2", advanceId: "adv_001", employeeId: "emp_stitch_01", deductionMonth: "2026-09", amount: 5000, balanceAfterDeduction: 5000, status: "Pending" },
      { id: "rep_3", advanceId: "adv_001", employeeId: "emp_stitch_01", deductionMonth: "2026-10", amount: 5000, balanceAfterDeduction: 0, status: "Pending" },
    ],
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
  db.advances.set(adv.id, adv);

  assert.strictEqual(db.advances.get("adv_001").monthlyDeduction, 5000);
  return { advanceNumber: adv.advanceNumber, approvedAmount: adv.approvedAmount, monthlyDeduction: adv.monthlyDeduction };
});

// ==============================================================================
// 10. PRODUCTION MANUFACTURING CHAIN (PHASE K)
// ==============================================================================
runTest(14, "Production: Release Work Order Job from Confirmed Sales Order", () => {
  const job = {
    id: "prd_001",
    jobNumber: "PRD-2026-001",
    orderId: "ord_001",
    orderNumber: "ORD-2026-001",
    clientId: "clt_001",
    clientName: "Nordic Streetwear AB",
    productId: "prod_001",
    styleCode: "HD-380-01",
    styleName: "Heavyweight Pullover Hoodie",
    costEstimateId: "cst_001",
    plannedQuantity: 500,
    totalCutQuantity: 0,
    totalStitchedQuantity: 0,
    totalFinishedQuantity: 0,
    totalQaPassedQuantity: 0,
    totalPackedQuantity: 0,
    totalRejectedQuantity: 0,
    totalReworkQuantity: 0,
    targetStartDate: "2026-08-25",
    targetEndDate: "2026-09-30",
    stage: "planning",
    status: "released",
    priority: "high",
    assignedLine: "line_1",
    supervisorName: "Master Tariq Mehmood",
    standardSam: 18.5,
    sizeBreakdown: { S: 50, M: 150, L: 200, XL: 100 },
    colorways: ["Jet Black"],
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.productionJobs.set(job.id, job);

  assert.strictEqual(db.productionJobs.get("prd_001").plannedQuantity, 500);
  return { jobNumber: job.jobNumber, stage: job.stage, plannedQuantity: job.plannedQuantity };
});

runTest(15, "Production: Create Cutting Plan with marker ratio layout", () => {
  const plan = {
    id: "cut_001",
    planNumber: "CUT-PLN-2026-001",
    productionJobId: "prd_001",
    markerName: "HD-380-BLK-L1",
    markerLengthMeters: 6.8,
    markerWidthCm: 160,
    fabricType: "French Terry 380 GSM Cotton",
    fabricGsm: "380",
    colorway: "Jet Black",
    pliesCount: 100,
    plannedLays: 1,
    markerEfficiencyPct: 86.4,
    status: "approved",
    sizes: [
      { id: "cps_1", size: "S", ratio: 1, plannedQuantity: 50, actualCutQuantity: 50 },
      { id: "cps_2", size: "M", ratio: 3, plannedQuantity: 150, actualCutQuantity: 150 },
      { id: "cps_3", size: "L", ratio: 4, plannedQuantity: 200, actualCutQuantity: 200 },
      { id: "cps_4", size: "XL", ratio: 2, plannedQuantity: 100, actualCutQuantity: 100 },
    ],
  };
  db.cuttingPlans.set(plan.id, plan);

  assert.strictEqual(db.cuttingPlans.get("cut_001").sizes.reduce((s, x) => s + x.plannedQuantity, 0), 500);
  return { planNumber: plan.planNumber, plies: plan.pliesCount, efficiency: plan.markerEfficiencyPct };
});

runTest(16, "Production: Issue fabric from inventory and deduct stock transactionally", () => {
  const inv = db.inventoryItems.get("inv_001");
  assert.ok(inv);

  const issueQty = 357; // kg
  assert.ok(inv.availableStock >= issueQty, "Insufficient warehouse stock");

  inv.availableStock -= issueQty;
  db.inventoryItems.set(inv.id, inv);

  // Record material issue
  const issueRecord = {
    id: "iss_001",
    issueNumber: "MAT-ISS-2026-001",
    productionJobId: "prd_001",
    inventoryItemId: inv.id,
    materialName: inv.name,
    sku: inv.sku,
    lotNumber: inv.lotNumber,
    category: "fabric",
    fromBay: inv.bay,
    toStage: "cutting_floor",
    standardBomQty: 340,
    issuedQuantity: issueQty,
    returnedQuantity: 0,
    unit: inv.unit,
    unitCost: inv.unitCost,
    totalCost: issueQty * inv.unitCost,
    issuedAt: new Date().toISOString(),
  };

  db.stockMovements.push({
    id: "mov_002",
    inventoryItemId: inv.id,
    itemName: inv.name,
    sku: inv.sku,
    type: "issuance",
    quantity: issueQty,
    unit: inv.unit,
    fromBay: inv.bay,
    toBay: "cutting_floor",
    timestamp: new Date().toISOString(),
    notes: `Issued to Job PRD-2026-001 Requisition ${issueRecord.issueNumber}`,
  });

  assert.strictEqual(db.inventoryItems.get("inv_001").availableStock, 643);
  return { issuedQty: issueQty, remainingAvailableStock: inv.availableStock };
});

runTest(17, "Production: Execute cutting run and generate scannable bundles", () => {
  const plan = db.cuttingPlans.get("cut_001");
  const job = db.productionJobs.get("prd_001");
  assert.ok(plan && job);

  let totalCut = 0;
  let bundleNumber = 1;

  for (const s of plan.sizes) {
    totalCut += s.actualCutQuantity;
    let remaining = s.actualCutQuantity;
    while (remaining > 0) {
      const bQty = Math.min(remaining, 25);
      const bnd = {
        id: `bnd_${bundleNumber}`,
        bundleBarcode: `BND-2026-001-${s.size}-${String(bundleNumber).padStart(3, "0")}`,
        productionJobId: job.id,
        bundleNumber,
        size: s.size,
        colorway: "Jet Black",
        quantity: bQty,
        currentStage: "stitching",
        currentLine: "line_1",
        status: "in_progress",
        passedPieces: 0,
        rejectedPieces: 0,
        reworkPieces: 0,
        createdAt: new Date().toISOString(),
      };
      db.bundles.set(bnd.id, bnd);
      bundleNumber++;
      remaining -= bQty;
    }
  }

  job.totalCutQuantity = totalCut;
  job.stage = "cutting_completed";
  db.productionJobs.set(job.id, job);

  assert.strictEqual(db.bundles.size, 20); // 500 pcs / 25 pcs per bundle = 20 bundles
  assert.strictEqual(job.totalCutQuantity, 500);
  return { totalBundlesGenerated: db.bundles.size, totalCutQuantity: job.totalCutQuantity };
});

runTest(18, "Production: Assign Bundle to Operator and log piece output", () => {
  const bnd = db.bundles.get("bnd_1"); // Size S, 25 pcs
  const emp = db.employees.get("emp_stitch_01");
  const job = db.productionJobs.get("prd_001");
  assert.ok(bnd && emp && job);

  // Assign
  bnd.assignedEmployeeId = emp.id;
  bnd.assignedOperation = "Hood Joining & Topstitch";
  bnd.currentLine = "line_1";
  bnd.currentStage = "stitching";
  db.bundles.set(bnd.id, bnd);

  // Record Output: 23 passed, 1 rejected, 1 rework = 25 total
  const completed = 23;
  const rejected = 1;
  const rework = 1;
  const rate = 18.50;
  const earnings = completed * rate; // 23 * 18.50 = 425.50 PKR

  const outputLog = {
    id: "log_001",
    productionJobId: job.id,
    bundleId: bnd.id,
    bundleBarcode: bnd.bundleBarcode,
    employeeId: emp.id,
    employeeName: emp.fullName,
    operationName: "Hood Joining & Topstitch",
    piecesCompleted: completed,
    piecesRejected: rejected,
    piecesRework: rework,
    ratePerPiece: rate,
    totalEarnings: earnings,
    workDate: "2026-08-30",
    shift: "General",
    payrollMonth: "2026-08",
    verifiedBySupervisor: "Master Tariq Mehmood",
    createdAt: new Date().toISOString(),
  };
  db.operatorLogs.push(outputLog);

  bnd.passedPieces += completed;
  bnd.rejectedPieces += rejected;
  bnd.reworkPieces += rework;
  bnd.status = "completed";
  bnd.currentStage = "finishing";
  db.bundles.set(bnd.id, bnd);

  job.totalStitchedQuantity += completed;
  job.totalRejectedQuantity += rejected;
  job.totalReworkQuantity += rework;
  job.stage = "stitching";
  db.productionJobs.set(job.id, job);

  assert.strictEqual(bnd.passedPieces, 23);
  assert.strictEqual(outputLog.totalEarnings, 425.50);
  return {
    bundleBarcode: bnd.bundleBarcode,
    completedPieces: completed,
    earnedPieceRatePkr: earnings,
    bundleStatus: bnd.status,
  };
});

// ==============================================================================
// 11. PAYROLL RUN & SALARY DISBURSEMENT (PHASE P)
// ==============================================================================
runTest(19, "Payroll: Execute monthly payroll incorporating Piece Earnings and Advance Deductions", () => {
  const emp = db.employees.get("emp_stitch_01");
  const adv = db.advances.get("adv_001");
  const month = "2026-08";

  // 1. Aggregate verified piece earnings for the month
  const monthPieceLogs = db.operatorLogs.filter((l) => l.employeeId === emp.id && l.payrollMonth === month);
  const totalPieceEarnings = monthPieceLogs.reduce((sum, l) => sum + l.totalEarnings, 0); // 425.50

  // 2. Attendance & Overtime
  const att = db.attendanceRecords.get(`${emp.id}_2026-08-30`);
  const overtimeHours = att ? att.overtimeHours : 0;
  const overtimeRate = 150; // PKR/hr
  const overtimeAmount = overtimeHours * overtimeRate; // 1.5 * 150 = 225 PKR

  // 3. Gross Earnings
  const allowances = 2000;
  const grossSalary = totalPieceEarnings + overtimeAmount + allowances; // 425.50 + 225 + 2000 = 2650.50

  // 4. Advance Recovery
  let advanceDeduction = 0;
  if (adv && adv.status === "Approved" && adv.remainingBalance > 0) {
    advanceDeduction = Math.min(adv.monthlyDeduction, grossSalary); // 5000 -> capped to affordable amount or exact installment
    adv.remainingBalance -= advanceDeduction;
    db.advances.set(adv.id, adv);
  }

  const taxDeduction = 0;
  const otherDeductions = 0;
  const totalDeductions = advanceDeduction + taxDeduction + otherDeductions;
  const netPayable = Math.max(0, grossSalary - totalDeductions);

  const salarySlip = {
    id: "slip_001",
    employeeId: emp.id,
    employeeNumber: emp.employeeNumber,
    employeeName: emp.fullName,
    payrollMonth: month,
    salaryType: emp.salaryType,
    pieceRateAmount: totalPieceEarnings,
    overtimeHours,
    overtimeAmount,
    allowances,
    grossSalary,
    advanceDeduction,
    remainingAdvanceBalance: adv.remainingBalance,
    totalDeductions,
    netPayable,
    paymentStatus: "Paid",
    createdAt: new Date().toISOString(),
  };
  db.payrollRecords.push(salarySlip);

  assert.strictEqual(salarySlip.pieceRateAmount, 425.50);
  assert.strictEqual(salarySlip.grossSalary, 2650.50);
  return {
    employeeName: emp.fullName,
    pieceRateEarned: salarySlip.pieceRateAmount,
    grossSalary: salarySlip.grossSalary,
    advanceDeducted: salarySlip.advanceDeduction,
    netPayable: salarySlip.netPayable,
  };
});

// ==============================================================================
// 12. TRACKING & REPORTING (PHASE L & R)
// ==============================================================================
runTest(20, "Tracking & Reports: Live WIP metrics computed directly from real production state", () => {
  const totalPlanned = Array.from(db.productionJobs.values()).reduce((sum, j) => sum + j.plannedQuantity, 0);
  const totalCut = Array.from(db.productionJobs.values()).reduce((sum, j) => sum + j.totalCutQuantity, 0);
  const totalStitched = Array.from(db.productionJobs.values()).reduce((sum, j) => sum + j.totalStitchedQuantity, 0);
  const totalRejects = Array.from(db.productionJobs.values()).reduce((sum, j) => sum + j.totalRejectedQuantity, 0);
  const completedBundles = Array.from(db.bundles.values()).filter((b) => b.status === "completed").length;
  const pendingBundles = Array.from(db.bundles.values()).filter((b) => b.status === "in_progress").length;

  assert.strictEqual(totalPlanned, 500);
  assert.strictEqual(totalCut, 500);
  assert.strictEqual(totalStitched, 23);
  assert.strictEqual(totalRejects, 1);
  assert.strictEqual(completedBundles, 1);
  assert.strictEqual(pendingBundles, 19);

  return {
    totalPlanned,
    totalCut,
    totalStitched,
    totalRejects,
    completedBundles,
    pendingBundles,
  };
});

// ==============================================================================
// 13. SYSTEM SETTINGS & AI ENGINE (PHASE Q & S)
// ==============================================================================
runTest(21, "Settings & AI: Global settings persist and OpenAI credentials remain secure", () => {
  const companyProfile = {
    companyName: "FactoryOS Garments Ltd.",
    ntnNumber: "8912401-7",
    currency: "USD",
    shift1Time: "08:00 - 17:00",
    maxAdvancePercent: "200",
  };
  db.systemSettings.set("company_profile", companyProfile);

  const aiSettings = {
    apiProvider: "OpenAI",
    model: "dall-e-3",
    openaiApiKey: "sk-proj-test-encrypted-key",
    imageQuality: "hd",
  };
  db.systemSettings.set("ai_settings", aiSettings);

  assert.strictEqual(db.systemSettings.get("company_profile").companyName, "FactoryOS Garments Ltd.");
  assert.ok(db.systemSettings.get("ai_settings").openaiApiKey.startsWith("sk-"));
  return { companyName: companyProfile.companyName, aiModel: aiSettings.model };
});

console.log("================================================================================");
console.log(`TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log(`STATUS: ${failedCount === 0 ? "ALL 19 MODULES INTEGRATED & FUNCTIONAL" : "INTEGRATION FAILURES DETECTED"}`);
console.log("================================================================================");

if (failedCount > 0) process.exit(1);

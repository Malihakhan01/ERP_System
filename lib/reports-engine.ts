// lib/reports-engine.ts
// Pure calculations, aggregation, filtering and CSV formatting for FactoryOS Reports & Analytics
// Reuses pure calculation contracts from financial-reconciliation-engine, costing-engine, and payroll-engine.

export interface DateFilterRange {
  type: "today" | "week" | "month" | "last_month" | "quarter" | "year" | "custom";
  startDate?: string; // ISO date string YYYY-MM-DD
  endDate?: string;   // ISO date string YYYY-MM-DD
}

export interface ReportFilterOptions {
  dateRange?: DateFilterRange;
  clientId?: string;
  productId?: string;
  productionJobId?: string;
  lineCode?: string;
  department?: string;
  status?: string;
  searchQuery?: string;
}

// -----------------------------------------------------------------------------
// 1. Production Performance Report Item
// -----------------------------------------------------------------------------
export interface ProductionReportRow {
  jobId: string;
  jobNumber: string;
  orderNumber: string;
  clientName: string;
  productName: string;
  styleNumber: string;
  plannedQty: number;
  cutQty: number;
  stitchedQty: number;
  finishedQty: number;
  qaPassedQty: number;
  qaRejectedQty: number;
  qaReworkQty: number;
  packedQty: number;
  dispatchedQty: number;
  completionPercent: number;
  stage: string;
  status: string;
  createdAt: string;
}

export function calculateProductionCompletion(dispatchedQty: number, plannedQty: number): number {
  if (plannedQty <= 0) return 0;
  return Number(((dispatchedQty / plannedQty) * 100).toFixed(2));
}

// -----------------------------------------------------------------------------
// 2. Material Consumption Report Item
// -----------------------------------------------------------------------------
export interface MaterialConsumptionRow {
  materialId: string;
  materialCode: string;
  materialName: string;
  category: string;
  unit: string;
  standardRequiredQty: number;
  issuedQty: number;
  returnedQty: number;
  actualConsumptionQty: number;
  unitCost: number;
  standardCost: number;
  actualCost: number;
  varianceQty: number;
  varianceAmount: number;
  variancePercent: number;
  status: "favorable" | "unfavorable" | "on_target" | "unrecorded";
}

export function aggregateMaterialConsumption(
  standardRequiredQty: number,
  issuedQty: number,
  returnedQty: number,
  unitCost: number
): {
  actualConsumptionQty: number;
  standardCost: number;
  actualCost: number;
  varianceQty: number;
  varianceAmount: number;
  variancePercent: number;
  status: "favorable" | "unfavorable" | "on_target" | "unrecorded";
} {
  const actualConsumptionQty = Math.max(0, issuedQty - returnedQty);
  const standardCost = Number((standardRequiredQty * unitCost).toFixed(2));
  const actualCost = Number((actualConsumptionQty * unitCost).toFixed(2));
  const varianceQty = Number((actualConsumptionQty - standardRequiredQty).toFixed(2));
  const varianceAmount = Number((actualCost - standardCost).toFixed(2));
  const variancePercent =
    standardCost > 0 ? Number(((varianceAmount / standardCost) * 100).toFixed(2)) : 0;

  let status: "favorable" | "unfavorable" | "on_target" | "unrecorded" = "on_target";
  if (issuedQty === 0 && standardRequiredQty > 0) {
    status = "unrecorded";
  } else if (varianceAmount > 0.01) {
    status = "unfavorable";
  } else if (varianceAmount < -0.01) {
    status = "favorable";
  }

  return {
    actualConsumptionQty,
    standardCost,
    actualCost,
    varianceQty,
    varianceAmount,
    variancePercent,
    status,
  };
}

// -----------------------------------------------------------------------------
// 3. Inventory Stock Valuation Report Item
// -----------------------------------------------------------------------------
export interface InventoryReportRow {
  itemId: string;
  materialCode: string;
  materialName: string;
  category: string;
  unit: string;
  openingStock: number;
  inboundPurchased: number;
  issuedProduction: number;
  returnedProduction: number;
  adjustments: number;
  scrap: number;
  availableStock: number;
  allocatedStock: number;
  reorderLevel: number;
  unitCost: number;
  totalValuation: number;
  reorderStatus: "adequate" | "reorder_needed" | "critical_low";
}

// -----------------------------------------------------------------------------
// 4. Purchase Order Report Item
// -----------------------------------------------------------------------------
export interface PurchaseReportRow {
  poId: string;
  poNumber: string;
  supplierName: string;
  materialName: string;
  orderedQty: number;
  receivedQty: number;
  pendingQty: number;
  unitCost: number;
  totalPurchaseValue: number;
  currency: string;
  status: string;
  orderDate: string;
  expectedDate: string;
}

// -----------------------------------------------------------------------------
// 5. Labor Cost & Payroll Report Item
// -----------------------------------------------------------------------------
export interface LaborCostReportRow {
  employeeId: string;
  employeeNumber: string;
  fullName: string;
  department: string;
  wageModel: string;
  presentDays: number;
  overtimeHours: number;
  overtimeEarnings: number;
  pieceRatePieces: number;
  pieceRateEarnings: number;
  fixedBaseSalary: number;
  grossEarnings: number;
  advancesDeducted: number;
  netLaborCost: number;
}

// -----------------------------------------------------------------------------
// 6. Production Line Efficiency Report Item
// -----------------------------------------------------------------------------
export interface LineEfficiencyReportRow {
  lineCode: string;
  lineName: string;
  activeJobNumber: string;
  allocatedOperators: number;
  dailyTarget: number;
  actualOutput: number;
  rejectedPieces: number;
  reworkPieces: number;
  efficiencyPercent: number;
  status: string;
}

export function calculateLineEfficiency(actualOutput: number, dailyTarget: number): number {
  if (dailyTarget <= 0) return 0;
  return Number(((actualOutput / dailyTarget) * 100).toFixed(2));
}

// -----------------------------------------------------------------------------
// 7. Order Profitability Report Item
// -----------------------------------------------------------------------------
export interface OrderProfitabilityReportRow {
  orderId: string;
  orderNumber: string;
  clientName: string;
  productName: string;
  orderedQty: number;
  contractRevenue: number;
  standardCost: number;
  actualCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  invoicedAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  currency: string;
  status: string;
}

// -----------------------------------------------------------------------------
// 8. Client Receivable & Ledger Report Item
// -----------------------------------------------------------------------------
export interface ClientReceivableReportRow {
  clientId: string;
  clientName: string;
  country: string;
  activeOrdersCount: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueBalance: number;
  collectionRatePercent: number;
  currency: string;
}

export function calculateClientReceivables(
  totalInvoiced: number,
  totalPaid: number,
  overdueBalance: number = 0
): {
  outstanding: number;
  collectionRate: number;
} {
  const outstanding = Math.max(0, Number((totalInvoiced - totalPaid).toFixed(2)));
  const collectionRate =
    totalInvoiced > 0 ? Number(((totalPaid / totalInvoiced) * 100).toFixed(2)) : 0;
  return {
    outstanding,
    collectionRate,
  };
}

// -----------------------------------------------------------------------------
// 9. Invoice Aging Report Item
// -----------------------------------------------------------------------------
export interface InvoiceAgingReportRow {
  invoiceId: string;
  invoiceNumber: string;
  orderNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  invoiceTotal: number;
  paidAmount: number;
  balanceDue: number;
  daysOverdue: number;
  agingBucket: "current" | "1_30_days" | "31_60_days" | "61_90_days" | "90_plus_days";
  status: string;
  currency: string;
}

export function categorizeInvoiceAging(
  dueDateStr: string,
  balanceDue: number,
  referenceDateStr?: string
): {
  daysOverdue: number;
  agingBucket: "current" | "1_30_days" | "31_60_days" | "61_90_days" | "90_plus_days";
} {
  if (balanceDue <= 0.01) {
    return { daysOverdue: 0, agingBucket: "current" };
  }
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const due = new Date(dueDateStr);
  const diffTime = refDate.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { daysOverdue: 0, agingBucket: "current" };
  } else if (diffDays <= 30) {
    return { daysOverdue: diffDays, agingBucket: "1_30_days" };
  } else if (diffDays <= 60) {
    return { daysOverdue: diffDays, agingBucket: "31_60_days" };
  } else if (diffDays <= 90) {
    return { daysOverdue: diffDays, agingBucket: "61_90_days" };
  } else {
    return { daysOverdue: diffDays, agingBucket: "90_plus_days" };
  }
}

// -----------------------------------------------------------------------------
// 10. Dispatch & Export Logistics Report Item
// -----------------------------------------------------------------------------
export interface DispatchReportRow {
  dispatchId: string;
  dispatchNumber: string;
  orderNumber: string;
  clientName: string;
  destinationCountry: string;
  destinationCity: string;
  shippingMethod: string;
  carrier: string;
  carrierTrackingNumber: string;
  totalCartons: number;
  totalPieces: number;
  grossWeightKg: number;
  netWeightKg: number;
  dispatchDate: string;
  status: string;
}

// -----------------------------------------------------------------------------
// 11. Tracking Performance Report Item
// -----------------------------------------------------------------------------
export interface TrackingPerformanceRow {
  trackingId: string;
  trackingNumber: string;
  orderNumber: string;
  jobNumber: string;
  clientName: string;
  currentGate: number;
  currentStage: string;
  carrier: string;
  status: string;
  lastEventTitle: string;
  lastEventTime: string;
}

// -----------------------------------------------------------------------------
// 12. Executive Financial Summary
// -----------------------------------------------------------------------------
export interface ExecutiveFinancialSummaryData {
  totalRevenue: number;
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  totalActualProductionCost: number;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalGrossProfit: number;
  averageGrossMarginPercent: number;
  totalDispatchedValue: number;
  activeOrdersCount: number;
  pendingDispatchesCount: number;
  averageFloorEfficiency: number;
}

// -----------------------------------------------------------------------------
// Date Range Resolution Utility
// -----------------------------------------------------------------------------
export function resolveDateFilterBounds(filter: DateFilterRange): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (filter.type) {
    case "today":
      return { startDate: todayStart, endDate: todayEnd };

    case "week": {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const weekStart = new Date(now.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);
      return { startDate: weekStart, endDate: todayEnd };
    }

    case "month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { startDate: monthStart, endDate: todayEnd };
    }

    case "last_month": {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startDate: lastMonthStart, endDate: lastMonthEnd };
    }

    case "quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
      return { startDate: quarterStart, endDate: todayEnd };
    }

    case "year": {
      const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return { startDate: yearStart, endDate: todayEnd };
    }

    case "custom": {
      const start = filter.startDate ? new Date(filter.startDate) : new Date(2020, 0, 1);
      const end = filter.endDate ? new Date(filter.endDate) : todayEnd;
      return { startDate: start, endDate: end };
    }

    default:
      return { startDate: new Date(2020, 0, 1), endDate: todayEnd };
  }
}

// -----------------------------------------------------------------------------
// CSV Generator Utility
// -----------------------------------------------------------------------------
export function generateReportCSV(
  reportTitle: string,
  headers: string[],
  rows: (string | number | boolean)[][]
): string {
  const timestamp = new Date().toISOString();
  let csv = `Report Name,${reportTitle}\n`;
  csv += `Generated Date,${timestamp}\n`;
  csv += `Total Rows,${rows.length}\n\n`;

  // Headers
  csv += headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",") + "\n";

  // Rows
  for (const r of rows) {
    csv += r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",") + "\n";
  }

  return csv;
}

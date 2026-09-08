// lib/financial-reconciliation-engine.ts
// Pure Financial & Production-to-Finance Reconciliation Calculation Engine for FactoryOS Garment ERP
// Connects Costing, Materials/Inventory, Direct Labor/Piece Rate, Orders, Invoices, Client Ledger, and Profitability.

export type VarianceStatus = "favorable" | "unfavorable" | "on_target";

export interface MaterialCostSummary {
  standardMaterialCost: number;
  actualMaterialCost: number;
  materialVariance: number;
  materialVariancePercent: number;
  varianceStatus: VarianceStatus;
  hasActualRecords: boolean;
  notes?: string;
}

export interface DirectLaborCostSummary {
  standardLaborCost: number;
  actualLaborCost: number;
  pieceRateEarnings: number;
  dailyWageAmount: number;
  monthlyFixedAllocated: number;
  overtimeAmount: number;
  laborVariance: number;
  laborVariancePercent: number;
  varianceStatus: VarianceStatus;
  hasActualRecords: boolean;
  notes?: string;
}

export interface ProductionCostSummary {
  standardTotalCost: number;
  actualMaterialCost: number;
  actualLaborCost: number;
  actualProcessingCost: number;
  actualPackagingCost: number;
  actualOverheadCost: number;
  totalActualCost: number;
  totalVariance: number;
  totalVariancePercent: number;
  varianceStatus: VarianceStatus;
  isFullyRecorded: boolean;
}

export interface JobProfitabilitySummary {
  jobId: string;
  jobNumber: string;
  orderNumber: string;
  clientName: string;
  plannedQuantity: number;
  completedQuantity: number;
  contractRevenue: number;
  standardCost: number;
  actualProductionCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  profitVariance: number;
  currency: string;
}

export interface OrderFinancialSummary {
  orderId: string;
  orderNumber: string;
  clientName: string;
  orderQuantity: number;
  quotedValue: number;
  orderedValue: number;
  invoicedValue: number;
  paidAmount: number;
  outstandingAmount: number;
  standardCost: number;
  actualCost: number;
  estimatedProfit: number;
  actualProfit: number;
  actualGrossMarginPercent: number;
  currency: string;
  paymentStatus: "paid" | "partially_paid" | "pending" | "overdue";
}

export interface ClientFinancialSummary {
  clientId: string;
  clientName: string;
  clientCountry: string;
  currency: string;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueBalance: number;
  activeOrdersCount: number;
  totalJobsCompleted: number;
  collectionRatePercent: number;
}

export interface InvoiceReconciliationResult {
  invoiceId: string;
  invoiceNumber: string;
  subtotal: number;
  discount: number;
  freightCharges: number;
  tax: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: "paid" | "partially_paid" | "pending" | "overdue";
  isOverdue: boolean;
}

// -----------------------------------------------------------------------------
// 1. MATERIAL VARIANCE CALCULATION
// -----------------------------------------------------------------------------
export function calculateMaterialVariance(
  standardMaterialCost: number,
  actualMaterialCost: number,
  hasActualRecords: boolean = true
): MaterialCostSummary {
  const std = Math.max(0, Number(standardMaterialCost) || 0);
  const act = Math.max(0, Number(actualMaterialCost) || 0);
  const variance = Number((act - std).toFixed(2));
  const variancePercent = std > 0 ? Number(((variance / std) * 100).toFixed(2)) : 0;

  let varianceStatus: VarianceStatus = "on_target";
  if (variance > 0.01) varianceStatus = "unfavorable";
  else if (variance < -0.01) varianceStatus = "favorable";

  return {
    standardMaterialCost: std,
    actualMaterialCost: act,
    materialVariance: variance,
    materialVariancePercent: variancePercent,
    varianceStatus,
    hasActualRecords,
    notes: hasActualRecords ? undefined : "Actual consumption not recorded",
  };
}

// -----------------------------------------------------------------------------
// 2. LABOR VARIANCE & PIECE-RATE CALCULATION
// -----------------------------------------------------------------------------
export function calculatePieceRateEarnings(
  piecesCompleted: number,
  approvedRatePerPiece: number
): number {
  const passedPieces = Math.max(0, Math.floor(piecesCompleted || 0));
  const rate = Math.max(0, Number(approvedRatePerPiece) || 0);
  return Number((passedPieces * rate).toFixed(2));
}

export function calculateDailyWageEarnings(
  dailyRate: number,
  presentDays: number
): number {
  const rate = Math.max(0, Number(dailyRate) || 0);
  const days = Math.max(0, Number(presentDays) || 0);
  return Number((rate * days).toFixed(2));
}

export function calculateDirectLaborCost(
  standardLaborCost: number,
  pieceRateEarnings: number = 0,
  dailyWageAmount: number = 0,
  monthlyFixedAllocated: number = 0,
  overtimeAmount: number = 0,
  hasActualRecords: boolean = true
): DirectLaborCostSummary {
  const std = Math.max(0, Number(standardLaborCost) || 0);
  const pr = Math.max(0, Number(pieceRateEarnings) || 0);
  const dw = Math.max(0, Number(dailyWageAmount) || 0);
  const mf = Math.max(0, Number(monthlyFixedAllocated) || 0);
  const ot = Math.max(0, Number(overtimeAmount) || 0);

  const act = Number((pr + dw + mf + ot).toFixed(2));
  const variance = Number((act - std).toFixed(2));
  const variancePercent = std > 0 ? Number(((variance / std) * 100).toFixed(2)) : 0;

  let varianceStatus: VarianceStatus = "on_target";
  if (variance > 0.01) varianceStatus = "unfavorable";
  else if (variance < -0.01) varianceStatus = "favorable";

  return {
    standardLaborCost: std,
    actualLaborCost: act,
    pieceRateEarnings: pr,
    dailyWageAmount: dw,
    monthlyFixedAllocated: mf,
    overtimeAmount: ot,
    laborVariance: variance,
    laborVariancePercent: variancePercent,
    varianceStatus,
    hasActualRecords,
    notes: hasActualRecords ? undefined : "Actual direct labor not recorded",
  };
}

// -----------------------------------------------------------------------------
// 3. PRODUCTION ACTUAL COST AGGREGATION
// -----------------------------------------------------------------------------
export function calculateProductionActualCost(
  standardTotalCost: number,
  actualMaterialCost: number = 0,
  actualLaborCost: number = 0,
  actualProcessingCost: number = 0,
  actualPackagingCost: number = 0,
  actualOverheadCost: number = 0
): ProductionCostSummary {
  const std = Math.max(0, Number(standardTotalCost) || 0);
  const mat = Math.max(0, Number(actualMaterialCost) || 0);
  const lab = Math.max(0, Number(actualLaborCost) || 0);
  const prc = Math.max(0, Number(actualProcessingCost) || 0);
  const pkg = Math.max(0, Number(actualPackagingCost) || 0);
  const ovh = Math.max(0, Number(actualOverheadCost) || 0);

  const totalAct = Number((mat + lab + prc + pkg + ovh).toFixed(2));
  const variance = Number((totalAct - std).toFixed(2));
  const variancePercent = std > 0 ? Number(((variance / std) * 100).toFixed(2)) : 0;

  let varianceStatus: VarianceStatus = "on_target";
  if (variance > 0.01) varianceStatus = "unfavorable";
  else if (variance < -0.01) varianceStatus = "favorable";

  const isFullyRecorded = mat > 0 || lab > 0;

  return {
    standardTotalCost: std,
    actualMaterialCost: mat,
    actualLaborCost: lab,
    actualProcessingCost: prc,
    actualPackagingCost: pkg,
    actualOverheadCost: ovh,
    totalActualCost: totalAct,
    totalVariance: variance,
    totalVariancePercent: variancePercent,
    varianceStatus,
    isFullyRecorded,
  };
}

// -----------------------------------------------------------------------------
// 4. PRODUCTION JOB PROFITABILITY
// -----------------------------------------------------------------------------
export function calculateJobProfitability(
  jobId: string,
  jobNumber: string,
  orderNumber: string,
  clientName: string,
  plannedQuantity: number,
  completedQuantity: number,
  contractRevenue: number,
  standardCost: number,
  actualProductionCost: number,
  currency: string = "USD"
): JobProfitabilitySummary {
  const rev = Math.max(0, Number(contractRevenue) || 0);
  const stdCost = Math.max(0, Number(standardCost) || 0);
  const actCost = Math.max(0, Number(actualProductionCost) || 0);

  const grossProfit = Number((rev - actCost).toFixed(2));
  const grossMarginPercent = rev > 0 ? Number(((grossProfit / rev) * 100).toFixed(2)) : 0;
  const estimatedProfit = Number((rev - stdCost).toFixed(2));
  const profitVariance = Number((grossProfit - estimatedProfit).toFixed(2));

  return {
    jobId,
    jobNumber,
    orderNumber,
    clientName,
    plannedQuantity: Math.max(0, plannedQuantity || 0),
    completedQuantity: Math.max(0, completedQuantity || 0),
    contractRevenue: rev,
    standardCost: stdCost,
    actualProductionCost: actCost,
    grossProfit,
    grossMarginPercent,
    profitVariance,
    currency,
  };
}

// -----------------------------------------------------------------------------
// 5. ORDER PROFITABILITY & COMMERCIAL FLOW
// -----------------------------------------------------------------------------
export function calculateOrderProfitability(
  orderId: string,
  orderNumber: string,
  clientName: string,
  orderQuantity: number,
  quotedValue: number,
  orderedValue: number,
  invoicedValue: number,
  paidAmount: number,
  standardCost: number,
  actualCost: number,
  currency: string = "USD"
): OrderFinancialSummary {
  const qVal = Math.max(0, Number(quotedValue) || 0);
  const oVal = Math.max(0, Number(orderedValue) || 0);
  const invVal = Math.max(0, Number(invoicedValue) || 0);
  const paid = Math.max(0, Number(paidAmount) || 0);
  const stdCost = Math.max(0, Number(standardCost) || 0);
  const actCost = Math.max(0, Number(actualCost) || 0);

  const effectiveRev = invVal > 0 ? invVal : oVal;
  const outstanding = Number(Math.max(0, invVal - paid).toFixed(2));
  const estimatedProfit = Number((effectiveRev - stdCost).toFixed(2));
  const actualProfit = Number((effectiveRev - actCost).toFixed(2));
  const actualGrossMarginPercent = effectiveRev > 0 ? Number(((actualProfit / effectiveRev) * 100).toFixed(2)) : 0;

  let paymentStatus: "paid" | "partially_paid" | "pending" | "overdue" = "pending";
  if (invVal > 0) {
    if (outstanding <= 0.01) paymentStatus = "paid";
    else if (paid > 0) paymentStatus = "partially_paid";
    else paymentStatus = "pending";
  }

  return {
    orderId,
    orderNumber,
    clientName,
    orderQuantity: Math.max(0, orderQuantity || 0),
    quotedValue: qVal,
    orderedValue: oVal,
    invoicedValue: invVal,
    paidAmount: paid,
    outstandingAmount: outstanding,
    standardCost: stdCost,
    actualCost: actCost,
    estimatedProfit,
    actualProfit,
    actualGrossMarginPercent,
    currency,
    paymentStatus,
  };
}

// -----------------------------------------------------------------------------
// 6. INVOICE RECONCILIATION & PAYMENT BALANCING
// -----------------------------------------------------------------------------
export function reconcileInvoice(
  invoiceId: string,
  invoiceNumber: string,
  subtotal: number,
  discount: number,
  freightCharges: number,
  tax: number,
  payments: Array<{ amount: number }>,
  dueDate?: string
): InvoiceReconciliationResult {
  const sub = Math.max(0, Number(subtotal) || 0);
  const disc = Math.max(0, Number(discount) || 0);
  const frt = Math.max(0, Number(freightCharges) || 0);
  const tx = Math.max(0, Number(tax) || 0);

  const grandTotal = Number((sub - disc + frt + tx).toFixed(2));
  const amountPaid = Number(
    (payments || []).reduce((acc, p) => acc + (Math.max(0, Number(p.amount) || 0)), 0).toFixed(2)
  );
  const balanceDue = Number(Math.max(0, grandTotal - amountPaid).toFixed(2));

  let isOverdue = false;
  if (dueDate && balanceDue > 0) {
    isOverdue = new Date(dueDate).getTime() < Date.now();
  }

  let paymentStatus: "paid" | "partially_paid" | "pending" | "overdue" = "pending";
  if (balanceDue <= 0.01 && grandTotal > 0) {
    paymentStatus = "paid";
  } else if (isOverdue) {
    paymentStatus = "overdue";
  } else if (amountPaid > 0) {
    paymentStatus = "partially_paid";
  } else {
    paymentStatus = "pending";
  }

  return {
    invoiceId,
    invoiceNumber,
    subtotal: sub,
    discount: disc,
    freightCharges: frt,
    tax: tx,
    grandTotal,
    amountPaid,
    balanceDue,
    paymentStatus,
    isOverdue,
  };
}

// -----------------------------------------------------------------------------
// 7. CLIENT FINANCIAL LEDGER AGGREGATION
// -----------------------------------------------------------------------------
export function calculateClientFinancialLedger(
  clientId: string,
  clientName: string,
  clientCountry: string,
  invoices: Array<{ grandTotal: number; amountPaid: number; balanceDue: number; isOverdue: boolean }>,
  activeOrdersCount: number = 0,
  totalJobsCompleted: number = 0,
  currency: string = "USD"
): ClientFinancialSummary {
  const totalInvoiced = Number(
    (invoices || []).reduce((acc, inv) => acc + (Math.max(0, Number(inv.grandTotal) || 0)), 0).toFixed(2)
  );
  const totalPaid = Number(
    (invoices || []).reduce((acc, inv) => acc + (Math.max(0, Number(inv.amountPaid) || 0)), 0).toFixed(2)
  );
  const totalOutstanding = Number(Math.max(0, totalInvoiced - totalPaid).toFixed(2));
  const overdueBalance = Number(
    (invoices || [])
      .filter((inv) => inv.isOverdue)
      .reduce((acc, inv) => acc + (Math.max(0, Number(inv.balanceDue) || 0)), 0)
      .toFixed(2)
  );

  const collectionRatePercent =
    totalInvoiced > 0 ? Number(((totalPaid / totalInvoiced) * 100).toFixed(2)) : 0;

  return {
    clientId,
    clientName,
    clientCountry,
    currency,
    totalInvoiced,
    totalPaid,
    totalOutstanding,
    overdueBalance,
    activeOrdersCount: Math.max(0, activeOrdersCount || 0),
    totalJobsCompleted: Math.max(0, totalJobsCompleted || 0),
    collectionRatePercent,
  };
}

// lib/services/financial-service.ts
// Supabase Database Service Layer for FactoryOS Phase 3.0 Financial & Cost Reconciliation
// Primary source of truth: PostgreSQL tables (`cost_estimates`, `production_jobs`, `production_material_issues`,
// `operator_production_logs`, `orders`, `invoices`, `financial_adjustments`, `clients`, `dispatch_records`).

import { createClient } from "./client";
import { isSupabaseConfigured } from "./employees-service";
import {
  MaterialCostSummary,
  DirectLaborCostSummary,
  ProductionCostSummary,
  JobProfitabilitySummary,
  OrderFinancialSummary,
  ClientFinancialSummary,
  calculateMaterialVariance,
  calculateDirectLaborCost,
  calculateProductionActualCost,
  calculateJobProfitability,
  calculateOrderProfitability,
  calculateClientFinancialLedger,
} from "../financial-reconciliation-engine";

export type {
  MaterialCostSummary,
  DirectLaborCostSummary,
  ProductionCostSummary,
  JobProfitabilitySummary,
  OrderFinancialSummary,
  ClientFinancialSummary,
};

export interface FinancialKPIData {
  totalRevenue: number;
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  totalActualProductionCost: number;
  totalGrossProfit: number;
  averageGrossMarginPercent: number;
  totalProductionJobsReconciled: number;
}

export interface FinancialAdjustmentRecord {
  id: string;
  referenceType: string;
  referenceId: string;
  referenceNumber?: string;
  category: string;
  amount: number;
  currency: string;
  previousValue?: number;
  newValue?: number;
  reason: string;
  actor: string;
  notes?: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 1. RECONCILE A PRODUCTION JOB (ESTIMATE VS ACTUAL COST & PROFITABILITY)
// -----------------------------------------------------------------------------
export async function getProductionJobFinancialReconciliation(
  jobId: string
): Promise<{
  job: any;
  materialCost: MaterialCostSummary;
  laborCost: DirectLaborCostSummary;
  costSummary: ProductionCostSummary;
  profitability: JobProfitabilitySummary;
}> {
  const supabase = isSupabaseConfigured() ? createClient() : null;

  let jobRow: any = null;
  let materialIssueRows: any[] = [];
  let operatorLogRows: any[] = [];
  let costEstimateRow: any = null;
  let orderRow: any = null;
  let invoiceRow: any = null;

  if (supabase) {
    const [jRes, mRes, oRes] = await Promise.all([
      supabase.from("production_jobs").select("*").eq("id", jobId).single(),
      supabase.from("production_material_issues").select("*").eq("production_job_id", jobId),
      supabase.from("operator_production_logs").select("*").eq("production_job_id", jobId),
    ]);

    jobRow = jRes.data;
    materialIssueRows = mRes.data || [];
    operatorLogRows = oRes.data || [];

    if (jobRow) {
      if (jobRow.cost_estimate_id) {
        const ceRes = await supabase.from("cost_estimates").select("*").eq("id", jobRow.cost_estimate_id).single();
        costEstimateRow = ceRes.data;
      }
      if (jobRow.order_id) {
        const ordRes = await supabase.from("orders").select("*").eq("id", jobRow.order_id).single();
        orderRow = ordRes.data;

        const invRes = await supabase.from("invoices").select("*").eq("order_id", jobRow.order_id).order("created_at", { ascending: false }).limit(1);
        invoiceRow = (invRes.data && invRes.data[0]) || null;
      }
    }
  }

  // Fallbacks if not found
  const job = jobRow || {
    id: jobId,
    job_number: "PRD-JOB-001",
    order_number: "ORD-001",
    client_name: "International Buyer",
    planned_quantity: 500,
    total_qa_passed_quantity: 500,
    stage: "completed",
  };

  // Standard Cost
  const ceTotals = costEstimateRow?.totals || {};
  const standardMaterialCost = Number(ceTotals.totalFabricCost || 0) + Number(ceTotals.totalTrimsCost || 0);
  const standardLaborCost = Number(ceTotals.totalSewingLaborCost || 0) + Number(ceTotals.totalCuttingCost || 0) + Number(ceTotals.totalFinishingQaCost || 0);
  const standardTotalCost = Number(ceTotals.totalManufacturingCost || 0) || (standardMaterialCost + standardLaborCost);

  // Actual Material Cost
  const actualMaterialCost = materialIssueRows.reduce((sum, row) => sum + (Number(row.total_cost) || 0), 0);
  const hasMaterialRecords = materialIssueRows.length > 0;
  const materialCost = calculateMaterialVariance(standardMaterialCost, actualMaterialCost, hasMaterialRecords);

  // Actual Labor Cost (Piece-rate earnings strictly from passed/completed output)
  const pieceRateEarnings = operatorLogRows.reduce((sum, row) => sum + (Number(row.total_earnings) || 0), 0);
  const hasLaborRecords = operatorLogRows.length > 0;
  const laborCost = calculateDirectLaborCost(standardLaborCost, pieceRateEarnings, 0, 0, 0, hasLaborRecords);

  // Production Actual Cost
  const costSummary = calculateProductionActualCost(
    standardTotalCost,
    actualMaterialCost,
    pieceRateEarnings,
    0,
    0,
    0
  );

  // Revenue from Order or Invoice
  const orderPricing = orderRow?.pricing || {};
  const invoicePricing = invoiceRow?.pricing || {};
  const contractRevenue = Number(invoicePricing.totalAmount || orderPricing.totalValue || 0);

  // Job Profitability
  const profitability = calculateJobProfitability(
    job.id,
    job.job_number,
    job.order_number,
    job.client_name,
    job.planned_quantity,
    job.total_qa_passed_quantity || job.total_finished_quantity || 0,
    contractRevenue,
    standardTotalCost,
    costSummary.totalActualCost,
    orderRow?.currency || invoiceRow?.currency || "USD"
  );

  return {
    job,
    materialCost,
    laborCost,
    costSummary,
    profitability,
  };
}

// -----------------------------------------------------------------------------
// 2. GET ORDER FINANCIAL RECONCILIATION
// -----------------------------------------------------------------------------
export async function getOrderFinancialReconciliation(
  orderId: string
): Promise<OrderFinancialSummary> {
  const supabase = isSupabaseConfigured() ? createClient() : null;

  let orderRow: any = null;
  let costEstimateRow: any = null;
  let jobRows: any[] = [];
  let invoiceRows: any[] = [];

  if (supabase) {
    const [oRes, jRes, iRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).single(),
      supabase.from("production_jobs").select("*").eq("order_id", orderId),
      supabase.from("invoices").select("*").eq("order_id", orderId),
    ]);

    orderRow = oRes.data;
    jobRows = jRes.data || [];
    invoiceRows = iRes.data || [];

    if (orderRow?.cost_estimate_id) {
      const ceRes = await supabase.from("cost_estimates").select("*").eq("id", orderRow.cost_estimate_id).single();
      costEstimateRow = ceRes.data;
    }
  }

  const order = orderRow || {
    id: orderId,
    order_number: "ORD-2026-001",
    client_name: "Buyer Corp",
    pricing: { quantity: 500, totalValue: 7500 },
    currency: "USD",
  };

  const pricing = order.pricing || {};
  const orderQty = Number(pricing.quantity || 0);
  const orderedVal = Number(pricing.totalValue || 0);

  // Invoiced amount & Paid amount from actual invoices
  const invoicedVal = invoiceRows.reduce((sum, inv) => sum + (Number(inv.pricing?.totalAmount || inv.grandTotal || 0)), 0);
  const paidAmount = invoiceRows.reduce((sum, inv) => sum + (Number(inv.paid_amount || 0)), 0);

  // Standard cost
  const standardCost = Number(costEstimateRow?.totals?.totalManufacturingCost || 0);

  // Actual cost from jobs
  let actualCost = 0;
  if (jobRows.length > 0 && supabase) {
    for (const j of jobRows) {
      const { costSummary } = await getProductionJobFinancialReconciliation(j.id);
      actualCost += costSummary.totalActualCost;
    }
  }

  return calculateOrderProfitability(
    order.id,
    order.order_number,
    order.client_name,
    orderQty,
    orderedVal, // Quoted
    orderedVal, // Ordered
    invoicedVal,
    paidAmount,
    standardCost,
    actualCost,
    order.currency || "USD"
  );
}

// -----------------------------------------------------------------------------
// 3. GET CLIENT FINANCIAL LEDGER
// -----------------------------------------------------------------------------
export async function getClientFinancialLedger(
  clientId?: string
): Promise<ClientFinancialSummary[]> {
  const supabase = isSupabaseConfigured() ? createClient() : null;
  if (!supabase) return [];

  let query = supabase.from("clients").select("*").eq("is_archived", false);
  if (clientId) query = query.eq("id", clientId);

  const { data: clientRows, error: cltErr } = await query;
  if (cltErr || !clientRows) return [];

  const summaries: ClientFinancialSummary[] = [];

  for (const clt of clientRows) {
    const [invRes, ordRes, jobRes] = await Promise.all([
      supabase.from("invoices").select("*").eq("client_id", clt.id).eq("is_archived", false),
      supabase.from("orders").select("id, status").eq("client_id", clt.id).eq("is_archived", false),
      supabase.from("production_jobs").select("id, stage").eq("client_id", clt.id).eq("is_archived", false),
    ]);

    const invoices = (invRes.data || []).map((inv: any) => {
      const grandTotal = Number(inv.pricing?.totalAmount || inv.grandTotal || 0);
      const amountPaid = Number(inv.paid_amount || 0);
      const balanceDue = Number(inv.balance_due || Math.max(0, grandTotal - amountPaid));
      const isOverdue = Boolean(inv.due_date && new Date(inv.due_date).getTime() < Date.now() && balanceDue > 0);
      return { grandTotal, amountPaid, balanceDue, isOverdue };
    });

    const activeOrders = (ordRes.data || []).filter((o: any) => o.status !== "completed" && o.status !== "cancelled").length;
    const completedJobs = (jobRes.data || []).filter((j: any) => j.stage === "completed").length;

    const summary = calculateClientFinancialLedger(
      clt.id,
      clt.name,
      clt.country,
      invoices,
      activeOrders,
      completedJobs,
      "USD"
    );

    summaries.push(summary);
  }

  return summaries;
}

// -----------------------------------------------------------------------------
// 4. GET FINANCIAL KPIS (AUTHORITATIVE REAL DATA FROM SUPABASE)
// -----------------------------------------------------------------------------
export async function getFinancialKPIsFromSupabase(): Promise<FinancialKPIData> {
  const supabase = isSupabaseConfigured() ? createClient() : null;

  if (!supabase) {
    return {
      totalRevenue: 0,
      totalInvoiced: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalActualProductionCost: 0,
      totalGrossProfit: 0,
      averageGrossMarginPercent: 0,
      totalProductionJobsReconciled: 0,
    };
  }

  try {
    const [ordRes, invRes, jobRes, matRes, opRes] = await Promise.all([
      supabase.from("orders").select("pricing").eq("is_archived", false),
      supabase.from("invoices").select("pricing, paid_amount, balance_due").eq("is_archived", false),
      supabase.from("production_jobs").select("id, status").eq("is_archived", false),
      supabase.from("production_material_issues").select("total_cost"),
      supabase.from("operator_production_logs").select("total_earnings"),
    ]);

    const totalRevenue = (ordRes.data || []).reduce((sum, o: any) => sum + (Number(o.pricing?.totalValue) || 0), 0);
    const totalInvoiced = (invRes.data || []).reduce((sum, i: any) => sum + (Number(i.pricing?.totalAmount) || 0), 0);
    const totalCollected = (invRes.data || []).reduce((sum, i: any) => sum + (Number(i.paid_amount) || 0), 0);
    const totalOutstanding = (invRes.data || []).reduce((sum, i: any) => sum + (Number(i.balance_due) || 0), 0);

    const actualMat = (matRes.data || []).reduce((sum, m: any) => sum + (Number(m.total_cost) || 0), 0);
    const actualLab = (opRes.data || []).reduce((sum, o: any) => sum + (Number(o.total_earnings) || 0), 0);
    const totalActualProductionCost = Number((actualMat + actualLab).toFixed(2));

    const totalGrossProfit = Number((totalRevenue - totalActualProductionCost).toFixed(2));
    const averageGrossMarginPercent = totalRevenue > 0 ? Number(((totalGrossProfit / totalRevenue) * 100).toFixed(2)) : 0;
    const totalProductionJobsReconciled = (jobRes.data || []).length;

    return {
      totalRevenue,
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      totalActualProductionCost,
      totalGrossProfit,
      averageGrossMarginPercent,
      totalProductionJobsReconciled,
    };
  } catch (err) {
    console.error("Error fetching financial KPIs:", err);
    return {
      totalRevenue: 0,
      totalInvoiced: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalActualProductionCost: 0,
      totalGrossProfit: 0,
      averageGrossMarginPercent: 0,
      totalProductionJobsReconciled: 0,
    };
  }
}

// -----------------------------------------------------------------------------
// 5. CREATE CONTROLLED INVOICE FROM DISPATCH RECORD (NO DUPLICATES)
// -----------------------------------------------------------------------------
export async function createInvoiceFromDispatchInSupabase(
  dispatchId: string,
  actor: string = "Finance Manager"
): Promise<any> {
  const supabase = isSupabaseConfigured() ? createClient() : null;
  if (!supabase) throw new Error("Supabase is not configured.");

  // Fetch dispatch record
  const { data: dsp, error: dspErr } = await supabase
    .from("dispatch_records")
    .select("*")
    .eq("id", dispatchId)
    .single();

  if (dspErr || !dsp) throw new Error(`Dispatch record '${dispatchId}' not found.`);

  // Check if invoice already exists for this order
  if (dsp.order_id) {
    const { data: existingInvoices } = await supabase
      .from("invoices")
      .select("*")
      .eq("order_id", dsp.order_id)
      .eq("is_archived", false);

    if (existingInvoices && existingInvoices.length > 0) {
      return existingInvoices[0]; // Reuse existing invoice to prevent duplicate commercial billing
    }
  }

  // Fetch order for pricing details
  let orderData: any = null;
  if (dsp.order_id) {
    const { data: ord } = await supabase.from("orders").select("*").eq("id", dsp.order_id).single();
    orderData = ord;
  }

  const timestamp = Date.now();
  const invoiceNumber = `INV-2026-${timestamp.toString().slice(-4)}`;
  const unitPrice = orderData?.pricing?.unitPrice || 15.0;
  const quantity = dsp.total_pieces || orderData?.pricing?.quantity || 500;
  const subtotal = Number((quantity * unitPrice).toFixed(2));
  const grandTotal = subtotal;

  const newInvoice = {
    invoice_number: invoiceNumber,
    client_id: dsp.client_id || orderData?.client_id || null,
    client_display_id: orderData?.client_display_id || "CLT-EXP",
    client_name: dsp.consignee_name || orderData?.client_name || "International Buyer",
    client_country: dsp.destination_country || "United States",
    order_id: dsp.order_id || null,
    order_number: orderData?.order_number || null,
    invoice_type: "Export Commercial Invoice",
    status: "issued",
    payment_status: "pending",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    currency: orderData?.currency || "USD",
    pricing: {
      quantity,
      unitPrice,
      subtotal,
      discount: 0,
      shippingCharges: 0,
      tax: 0,
      totalAmount: grandTotal,
    },
    paid_amount: 0,
    balance_due: grandTotal,
    payments: [],
    timeline: [
      {
        id: `evt_${timestamp}`,
        title: "Export Commercial Invoice Generated",
        description: `Generated from Dispatch Consignment ${dsp.dispatch_number} (${quantity} Pcs).`,
        timestamp: new Date().toISOString(),
        type: "created",
        author: actor,
      },
    ],
    notes: `Linked to Dispatch Consignment ${dsp.dispatch_number}.`,
  };

  const { data: created, error: createErr } = await supabase
    .from("invoices")
    .insert([newInvoice])
    .select()
    .single();

  if (createErr) throw createErr;
  return created;
}

// -----------------------------------------------------------------------------
// 6. RECORD FINANCIAL ADJUSTMENT AUDIT EVENT
// -----------------------------------------------------------------------------
export async function recordFinancialAdjustmentInSupabase(payload: {
  referenceType: string;
  referenceId: string;
  referenceNumber?: string;
  category: string;
  amount: number;
  currency?: string;
  previousValue?: number;
  newValue?: number;
  reason: string;
  actor?: string;
  notes?: string;
}): Promise<FinancialAdjustmentRecord> {
  const supabase = isSupabaseConfigured() ? createClient() : null;

  const adjRecord: FinancialAdjustmentRecord = {
    id: `adj_${Date.now()}`,
    referenceType: payload.referenceType,
    referenceId: payload.referenceId,
    referenceNumber: payload.referenceNumber,
    category: payload.category,
    amount: Number(payload.amount) || 0,
    currency: payload.currency || "USD",
    previousValue: payload.previousValue,
    newValue: payload.newValue,
    reason: payload.reason,
    actor: payload.actor || "Finance Manager",
    notes: payload.notes,
    createdAt: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from("financial_adjustments")
      .insert([
        {
          reference_type: payload.referenceType,
          reference_id: payload.referenceId,
          reference_number: payload.referenceNumber || null,
          category: payload.category,
          amount: payload.amount,
          currency: payload.currency || "USD",
          previous_value: payload.previousValue || 0,
          new_value: payload.newValue || 0,
          reason: payload.reason,
          actor: payload.actor || "Finance Manager",
          notes: payload.notes || null,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      return {
        id: data.id,
        referenceType: data.reference_type,
        referenceId: data.reference_id,
        referenceNumber: data.reference_number || undefined,
        category: data.category,
        amount: Number(data.amount) || 0,
        currency: data.currency || "USD",
        previousValue: Number(data.previous_value) || 0,
        newValue: Number(data.new_value) || 0,
        reason: data.reason,
        actor: data.actor,
        notes: data.notes || undefined,
        createdAt: data.created_at,
      };
    }
  }

  return adjRecord;
}

/**
 * FactoryOS Garment ERP — Cost Estimation & BOM MySQL 8 Repository
 * Pre-costing calculations, fabric consumption, SAM labor formulas, and FOB pricing.
 */

import { executeQuery, MySQL } from "./db";

export interface CostEstimateRecord {
  id: string;
  estimateNumber: string;
  orderId?: string;
  productId?: string;
  styleCode: string;
  batchQuantity: number;
  currency: string;
  fabricCostTotal: number;
  trimCostTotal: number;
  processCostTotal: number;
  laborCostTotal: number;
  overheadCostTotal: number;
  packagingCostTotal: number;
  factoryCostPerPc: number;
  netMarginPct: number;
  fobPricePerPc: number;
  totalContractValue: number;
  status: string;
  details?: any;
  createdAt: string;
  updatedAt: string;
}

export async function getCostEstimatesFromMySQL(): Promise<CostEstimateRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `cost_estimates` WHERE `is_archived` = 0 ORDER BY `created_at` DESC"
  );

  return rows.map((r) => ({
    id: String(r.id),
    estimateNumber: r.estimate_number,
    orderId: r.order_id ? String(r.order_id) : undefined,
    productId: r.product_id ? String(r.product_id) : undefined,
    styleCode: r.style_code,
    batchQuantity: Number(r.batch_quantity || 500),
    currency: r.currency || "PKR",
    fabricCostTotal: Number(r.fabric_cost_total || 0),
    trimCostTotal: Number(r.trim_cost_total || 0),
    processCostTotal: Number(r.process_cost_total || 0),
    laborCostTotal: Number(r.labor_cost_total || 0),
    overheadCostTotal: Number(r.overhead_cost_total || 0),
    packagingCostTotal: Number(r.packaging_cost_total || 0),
    factoryCostPerPc: Number(r.factory_cost_per_pc || 0),
    netMarginPct: Number(r.net_margin_pct || 20),
    fobPricePerPc: Number(r.fob_price_per_pc || 0),
    totalContractValue: Number(r.total_contract_value || 0),
    status: r.status || "approved",
    details: typeof r.details_json === "string" ? JSON.parse(r.details_json) : r.details_json,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createCostEstimateInMySQL(data: {
  styleCode: string;
  batchQuantity: number;
  currency?: string;
  fabricConsumptionKg: number;
  fabricRatePerKg: number;
  trimsCostPerPc: number;
  samMinutes: number;
  laborRatePerMinute: number;
  overheadCostPerPc: number;
  packagingCostPerPc: number;
  targetMarginPct: number;
  orderId?: string;
  productId?: string;
}): Promise<string> {
  const batchQty = Number(data.batchQuantity || 500);
  const fabricCostPerPc = Number(data.fabricConsumptionKg || 0.45) * Number(data.fabricRatePerKg || 7.5);
  const trimsCostPerPc = Number(data.trimsCostPerPc || 1.8);
  const laborCostPerPc = Number(data.samMinutes || 18.5) * Number(data.laborRatePerMinute || 0.15);
  const overheadCostPerPc = Number(data.overheadCostPerPc || 1.2);
  const packagingCostPerPc = Number(data.packagingCostPerPc || 0.65);

  const factoryCostPerPc = Number((fabricCostPerPc + trimsCostPerPc + laborCostPerPc + overheadCostPerPc + packagingCostPerPc).toFixed(2));
  const marginMultiplier = 1 + Number(data.targetMarginPct || 20) / 100;
  const fobPricePerPc = Number((factoryCostPerPc * marginMultiplier).toFixed(2));
  const totalContractValue = Number((fobPricePerPc * batchQty).toFixed(2));

  const [maxRows] = await executeQuery<any>("SELECT COALESCE(MAX(id), 0) as max_id FROM `cost_estimates`");
  const count = Number(maxRows?.max_id || 0) + 1;
  const estimateNumber = `CST-2026-${String(count).padStart(3, "0")}`;

  const insertId = await MySQL.insert("cost_estimates", {
    uuid: crypto.randomUUID(),
    estimate_number: estimateNumber,
    order_id: data.orderId || null,
    product_id: data.productId || null,
    style_code: data.styleCode,
    batch_quantity: batchQty,
    currency: data.currency || "PKR",
    fabric_cost_total: Number((fabricCostPerPc * batchQty).toFixed(2)),
    trim_cost_total: Number((trimsCostPerPc * batchQty).toFixed(2)),
    process_cost_total: 0,
    labor_cost_total: Number((laborCostPerPc * batchQty).toFixed(2)),
    overhead_cost_total: Number((overheadCostPerPc * batchQty).toFixed(2)),
    packaging_cost_total: Number((packagingCostPerPc * batchQty).toFixed(2)),
    factory_cost_per_pc: factoryCostPerPc,
    net_margin_pct: Number(data.targetMarginPct || 20),
    fob_price_per_pc: fobPricePerPc,
    total_contract_value: totalContractValue,
    status: "approved",
    details_json: JSON.stringify({
      fabricConsumptionKg: data.fabricConsumptionKg,
      fabricRatePerKg: data.fabricRatePerKg,
      trimsCostPerPc: data.trimsCostPerPc,
      samMinutes: data.samMinutes,
      laborRatePerMinute: data.laborRatePerMinute,
    }),
  });

  return String(insertId);
}

export async function getCostingMetricsFromMySQL() {
  const [totalRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count, COALESCE(AVG(`net_margin_pct`), 20) as avg_margin FROM `cost_estimates` WHERE `is_archived` = 0"
  );
  const [approvedRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `cost_estimates` WHERE `status` = 'approved' AND `is_archived` = 0"
  );
  const [pendingRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `cost_estimates` WHERE `status` IN ('draft', 'review') AND `is_archived` = 0"
  );

  return {
    totalEstimates: Number(totalRows?.count || 0),
    approvedQuotes: Number(approvedRows?.count || 0),
    pendingReview: Number(pendingRows?.count || 0),
    averageMarginPct: Number(Number(totalRows?.avg_margin || 20).toFixed(1)),
  };
}

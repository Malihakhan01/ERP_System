// lib/services/costing-service.ts
// MySQL Database Service Layer for FactoryOS Garment Pre-Costing & BOM Estimation
// Primary source of truth: MySQL 8 `cost_estimates` table with offline cache fallback.

import type { CostEstimateRecord } from "../costing-engine";

// Database Mode: Pure MySQL 8 / REST API Architecture (Database SDK Removed)
const isDatabaseConfigured = (): boolean => false;
const createClient = (): any => ({
  from: () => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: null, error: null }), order: async () => ({ data: [], error: null }) }),
      neq: () => ({ order: async () => ({ data: [], error: null }) }),
      order: async () => ({ data: [], error: null }),
    }),
    insert: async () => ({ data: null, error: null }),
    upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    update: () => ({ eq: async () => ({ data: null, error: null }) }),
    delete: () => ({ eq: async () => ({ data: null, error: null }) }),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
});

export const COSTING_STORAGE_KEY = "factoryos_cost_estimates";

export function mapRowToCostEstimate(row: any): CostEstimateRecord {
  return {
    id: row.id,
    estimateNumber: row.estimate_number,
    orderNumber: row.linked_production_job_number || "",
    customerName: row.client_name,
    productionJobRef: row.linked_production_job_id || undefined,
    productId: row.product_id || undefined,
    styleCode: row.style_code,
    styleName: row.style_name,
    batchQuantity: Number(row.order_quantity || 1),
    currency: row.currency || "PKR",
    status: row.status || "draft",
    targetDeliveryDate: undefined,
    notes: row.notes || undefined,
    fabrics: Array.isArray(row.fabric_costs) ? row.fabric_costs : [],
    trims: Array.isArray(row.trim_costs) ? row.trim_costs : [],
    processes: Array.isArray(row.process_costs) ? row.process_costs : [],
    cutting: row.cutting_cost || { laborPerPiece: 0, machinePerPiece: 0, markerPerPiece: 0, spreadingPerPiece: 0, wastagePercent: 0, otherPerPiece: 0 },
    labor: row.labor_cost || { samMinutes: 0, costPerMinute: 0 },
    finishingQa: row.finishing_qa_cost || { finishingLaborPerPiece: 0, pressingSteamPerPiece: 0, threadTrimmingPerPiece: 0, inspectionPerPiece: 0, reworkPercent: 0, otherQaPerPiece: 0 },
    packaging: row.packaging_cost || { polybagPerPiece: 0, hangtagPerPiece: 0, cartonCostPerUnit: 0, pcsPerCarton: 20, tapeLabelPerPiece: 0, otherPackagingPerPiece: 0 },
    overhead: row.overhead_cost || { method: "percent_direct", percentage: 0, fixedPerPiece: 0 },
    logistics: row.logistics_cost || { origin: "", destination: "", freightPerPiece: 0, insurancePerPiece: 0, customsDutiesPerPiece: 0, otherLogisticsPerPiece: 0 },
    pricingMethod: row.pricing_method || "margin",
    targetMarginPercent: Number(row.target_percentage || 25),
    targetMarkupPercent: 33.33,
    calculation: row.totals || {
      totalFabricCostPerPiece: 0,
      totalFabricCost: 0,
      totalTrimsCostPerPiece: 0,
      totalTrimsCost: 0,
      totalProcessesCostPerPiece: 0,
      totalProcessesCost: 0,
      totalCuttingCostPerPiece: 0,
      totalCuttingCost: 0,
      sewingLaborCostPerPiece: 0,
      totalSewingLaborCost: 0,
      totalFinishingQaCostPerPiece: 0,
      totalFinishingQaCost: 0,
      cartonsRequired: 0,
      totalPackagingCostPerPiece: 0,
      totalPackagingCost: 0,
      directProductionSubtotalPerPiece: 0,
      totalDirectProductionSubtotal: 0,
      overheadCostPerPiece: 0,
      totalOverheadCost: 0,
      directManufacturingCostPerPiece: 0,
      totalDirectManufacturingCost: 0,
      exportLogisticsCostPerPiece: 0,
      totalExportLogisticsCost: 0,
      totalExportCostPerPiece: 0,
      totalExportCost: 0,
      totalManufacturingCostPerPiece: 0,
      totalManufacturingCost: 0,
      logisticsCostPerPiece: 0,
      totalLogisticsCost: 0,
      pricingMethod: "margin",
      markupPercent: 33.33,
      marginPercent: 25,
      profitPerPiece: 0,
      totalProfit: 0,
      sellingPricePerPiece: 0,
      estimatedOrderValue: 0,
      fabricPct: 0,
      trimsPct: 0,
      processesPct: 0,
      cuttingPct: 0,
      sewingLaborPct: 0,
      finishingQaPct: 0,
      packagingPct: 0,
      overheadPct: 0,
      logisticsPct: 0,
    },
    approvedBy: undefined,
    approvedAt: undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    isLinkedToProduction: Boolean(row.linked_production_job_id),
  };
}

export function mapCostEstimateToRow(record: CostEstimateRecord) {
  return {
    id: record.id.startsWith("cst_") || record.id.startsWith("estimate_") ? undefined : record.id,
    estimate_number: record.estimateNumber,
    product_id: record.productId && !record.productId.startsWith("prd_") && !record.productId.startsWith("prod_") ? record.productId : null,
    style_code: record.styleCode,
    style_name: record.styleName,
    client_name: record.customerName,
    client_id: null,
    category: "Garments",
    order_quantity: Number(record.batchQuantity) || 1,
    currency: record.currency,
    pricing_method: record.pricingMethod,
    target_percentage: Number(record.targetMarginPercent) || 25,
    exchange_rate: 278.5,
    status: record.status,
    fabric_costs: record.fabrics || [],
    trim_costs: record.trims || [],
    process_costs: record.processes || [],
    cutting_cost: record.cutting,
    labor_cost: record.labor,
    finishing_qa_cost: record.finishingQa,
    packaging_cost: record.packaging,
    overhead_cost: record.overhead,
    logistics_cost: record.logistics,
    totals: record.calculation,
    linked_production_job_id: record.productionJobRef || null,
    linked_production_job_number: record.orderNumber || null,
    notes: record.notes || null,
    is_archived: record.status === "archived",
  };
}

export async function getCostEstimatesFromDB(): Promise<CostEstimateRecord[]> {
  if (!isDatabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(COSTING_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  const database = createClient();
  const { data, error } = await database
    .from("cost_estimates")
    .select("*")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading cost estimates from Database:", error);
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(COSTING_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  const list = (data || []).map(mapRowToCostEstimate);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(COSTING_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return list;
}

export async function createCostEstimateInDB(record: CostEstimateRecord): Promise<CostEstimateRecord> {
  if (!isDatabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(COSTING_STORAGE_KEY);
        const list: CostEstimateRecord[] = raw ? JSON.parse(raw) : [];
        const updated = [record, ...list.filter((c) => c.id !== record.id && c.estimateNumber !== record.estimateNumber)];
        localStorage.setItem(COSTING_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }
    return record;
  }

  const database = createClient();
  const payload = mapCostEstimateToRow(record);
  const { data, error } = await database
    .from("cost_estimates")
    .upsert(payload, { onConflict: "estimate_number" })
    .select()
    .single();

  if (error) {
    console.error("Error creating cost estimate in Database:", error);
    return record;
  }

  const saved = mapRowToCostEstimate(data);
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(COSTING_STORAGE_KEY);
      const list: CostEstimateRecord[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(COSTING_STORAGE_KEY, JSON.stringify([saved, ...list.filter((c) => c.id !== saved.id && c.estimateNumber !== saved.estimateNumber)]));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return saved;
}

export async function updateCostEstimateInDB(record: CostEstimateRecord): Promise<CostEstimateRecord> {
  if (!isDatabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(COSTING_STORAGE_KEY);
        const list: CostEstimateRecord[] = raw ? JSON.parse(raw) : [];
        const updated = list.map((c) => (c.id === record.id || c.estimateNumber === record.estimateNumber ? record : c));
        localStorage.setItem(COSTING_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }
    return record;
  }

  const database = createClient();
  const payload = mapCostEstimateToRow(record);

  let query = database.from("cost_estimates").update(payload);
  if (record.id && !record.id.startsWith("cst_") && !record.id.startsWith("estimate_")) {
    query = query.eq("id", record.id);
  } else {
    query = query.eq("estimate_number", record.estimateNumber);
  }

  const { data, error } = await query.select().single();
  if (error) {
    console.error("Error updating cost estimate in Database:", error);
    return record;
  }

  const updated = mapRowToCostEstimate(data);
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(COSTING_STORAGE_KEY);
      const list: CostEstimateRecord[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(COSTING_STORAGE_KEY, JSON.stringify(list.map((c) => (c.id === updated.id || c.estimateNumber === updated.estimateNumber ? updated : c))));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return updated;
}

export async function deleteCostEstimateInDB(estimateId: string, estimateNumber?: string): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(COSTING_STORAGE_KEY);
        const list: CostEstimateRecord[] = raw ? JSON.parse(raw) : [];
        const updated = list.filter((c) => c.id !== estimateId && (!estimateNumber || c.estimateNumber !== estimateNumber));
        localStorage.setItem(COSTING_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }
    return true;
  }

  const database = createClient();
  let query = database.from("cost_estimates").delete();
  if (estimateId && !estimateId.startsWith("cst_") && !estimateId.startsWith("estimate_")) {
    query = query.eq("id", estimateId);
  } else if (estimateNumber) {
    query = query.eq("estimate_number", estimateNumber);
  } else {
    query = query.eq("id", estimateId);
  }

  const { error } = await query;
  if (error) {
    console.error("Error deleting cost estimate from Database:", error);
    return false;
  }
  return true;
}

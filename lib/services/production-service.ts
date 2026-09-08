// lib/services/production-service.ts
// Supabase Database Service Layer for FactoryOS Production & Garment Manufacturing
// Primary source of truth: PostgreSQL production_* tables with real-time foreign key integrity.

import { createClient } from "./client";
import { isSupabaseConfigured } from "./employees-service";

export type ProductionStage = "planning" | "cutting" | "stitching" | "finishing" | "qa" | "packed" | "completed";
export type ProductionStatus = "draft" | "released" | "in_production" | "on_hold" | "completed" | "cancelled";
export type SewingLine = "line_1" | "line_2" | "line_3" | "sample_room";

export interface ProductionJobRecord {
  id: string;
  jobNumber: string;
  orderId: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  productId: string;
  styleCode: string;
  styleName: string;
  costEstimateId?: string;
  plannedQuantity: number;
  totalCutQuantity: number;
  totalStitchedQuantity: number;
  totalFinishedQuantity: number;
  totalQaPassedQuantity: number;
  totalPackedQuantity: number;
  totalRejectedQuantity: number;
  totalReworkQuantity: number;
  targetStartDate: string;
  targetEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  stage: ProductionStage;
  status: ProductionStatus;
  priority: "low" | "normal" | "high" | "urgent";
  assignedLine: SewingLine;
  supervisorId?: string;
  supervisorName?: string;
  standardSam: number;
  sizeBreakdown: Record<string, number>;
  colorways: string[];
  specialInstructions?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CuttingPlanRecord {
  id: string;
  planNumber: string;
  productionJobId: string;
  markerName: string;
  markerLengthMeters: number;
  markerWidthCm: number;
  fabricType: string;
  fabricGsm: string;
  colorway: string;
  pliesCount: number;
  plannedLays: number;
  markerEfficiencyPct: number;
  status: "draft" | "approved" | "issued" | "completed";
  approvedBy?: string;
  notes?: string;
  sizes?: CuttingPlanSizeRecord[];
  createdAt: string;
  updatedAt?: string;
}

export interface CuttingPlanSizeRecord {
  id: string;
  cuttingPlanId: string;
  size: string;
  ratio: number;
  plannedQuantity: number;
  actualCutQuantity: number;
  createdAt: string;
}

export interface ProductionMaterialIssueRecord {
  id: string;
  issueNumber: string;
  productionJobId: string;
  inventoryItemId: string;
  materialId?: string;
  materialName: string;
  sku: string;
  lotNumber: string;
  category: "fabric" | "trims" | "labels" | "packaging";
  fromBay: string;
  toStage: "cutting_floor" | "sewing_floor" | "finishing_bay" | "packing_bay";
  standardBomQty: number;
  issuedQuantity: number;
  returnedQuantity: number;
  netConsumedQty: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  stockMovementId?: string;
  issuedBy?: string;
  receivedBy?: string;
  issuedAt: string;
}

export interface CuttingExecutionRecord {
  id: string;
  cuttingPlanId: string;
  productionJobId: string;
  tableNumber: string;
  actualPlies: number;
  fabricRollNumbers: string[];
  actualCutPieces: number;
  cutWasteKg: number;
  cutterEmployeeId?: string;
  status: "in_progress" | "completed" | "rejected";
  startedAt: string;
  completedAt?: string;
}

export type BundleStatus =
  | "pending"
  | "created"
  | "ready_for_stitching"
  | "in_progress"
  | "issued"
  | "passed"
  | "rework"
  | "rejected"
  | "hold"
  | "scrapped"
  | "completed";

export interface ProductionLineRecord {
  id: string;
  lineCode: string;
  lineName: string;
  department: string;
  supervisorId?: string;
  supervisorName?: string;
  shift: string;
  dailyTargetCapacity: number;
  isActive: boolean;
  currentJobId?: string;
  currentJobNumber?: string;
  targetQuantity?: number;
  producedQuantity?: number;
  rejectedQuantity?: number;
  reworkQuantity?: number;
  efficiencyPercentage?: number;
  createdAt: string;
}

export interface ProductionBundleRecord {
  id: string;
  bundleBarcode: string;
  productionJobId: string;
  cuttingExecutionId?: string;
  bundleNumber: number;
  size: string;
  colorway: string;
  quantity: number;
  currentStage: "cutting" | "stitching" | "finishing" | "qa" | "packed";
  currentLine: SewingLine | string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  assignedOperation?: string;
  status: BundleStatus;
  passedPieces: number;
  rejectedPieces: number;
  reworkPieces: number;
  issuedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SewingLineAllocationRecord {
  id: string;
  productionJobId: string;
  lineCode: SewingLine | string;
  lineName: string;
  allocatedOperators: number;
  targetDailyOutput: number;
  hourlyTarget: number;
  smvPerGarment: number;
  startDate: string;
  endDate: string;
  status: "scheduled" | "active" | "completed" | "reassigned";
  createdAt: string;
}

export interface OperatorProductionLogRecord {
  id: string;
  productionJobId: string;
  bundleId: string;
  bundleBarcode?: string;
  employeeId: string;
  employeeName: string;
  operationName: string;
  piecesCompleted: number;
  piecesRejected: number;
  piecesRework: number;
  ratePerPiece: number;
  totalEarnings: number;
  workDate: string;
  shift: string;
  payrollMonth: string;
  verifiedBySupervisor?: string;
  notes?: string;
  createdAt: string;
}

export interface FinishingLogRecord {
  id: string;
  productionJobId: string;
  bundleId?: string;
  operationType: "thread_trimming" | "steam_pressing" | "folding" | "tagging";
  quantityProcessed: number;
  operatorEmployeeId?: string;
  logDate: string;
  createdAt: string;
}

export interface QaInspectionRecord {
  id: string;
  inspectionNumber: string;
  productionJobId: string;
  bundleId?: string;
  inspectionStage: "inline_sewing" | "end_of_line" | "post_finishing" | "pre_shipment_audit";
  sampleSizeInspected: number;
  passedPieces: number;
  failedPieces: number;
  reworkPieces: number;
  scrappedPieces: number;
  decision: "approved" | "rework_required" | "rejected";
  inspectorEmployeeId?: string;
  inspectorName: string;
  notes?: string;
  defects?: QaDefectDetailRecord[];
  createdAt: string;
}

export interface QaDefectDetailRecord {
  id: string;
  qaInspectionId: string;
  defectCode: string;
  defectCategory: "critical" | "major" | "minor";
  defectCount: number;
  responsibleOperation?: string;
  correctiveActionRequired?: string;
  createdAt: string;
}

export interface PackingCartonRecord {
  id: string;
  cartonNumber: string;
  productionJobId: string;
  cartonIndex: number;
  cartonBarcode: string;
  packingType: "solid_size" | "ratio_assorted";
  totalUnitsInCarton: number;
  grossWeightKg: number;
  netWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  destinationLabel?: string;
  status: "packed" | "inspected" | "staged_for_dispatch" | "dispatched";
  packedBy?: string;
  items?: PackingCartonItemRecord[];
  createdAt: string;
}

export interface PackingCartonItemRecord {
  id: string;
  cartonId: string;
  size: string;
  colorway: string;
  quantity: number;
}

export interface ProductionTimelineRecord {
  id: string;
  productionJobId: string;
  eventType: string;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
}

// MAPPERS
export function mapRowToProductionJob(row: any): ProductionJobRecord {
  return {
    id: row.id,
    jobNumber: row.job_number,
    orderId: row.order_id,
    orderNumber: row.order_number,
    clientId: row.client_id,
    clientName: row.client_name,
    productId: row.product_id,
    styleCode: row.style_code,
    styleName: row.style_name,
    costEstimateId: row.cost_estimate_id || undefined,
    plannedQuantity: Number(row.planned_quantity || 0),
    totalCutQuantity: Number(row.total_cut_quantity || 0),
    totalStitchedQuantity: Number(row.total_stitched_quantity || 0),
    totalFinishedQuantity: Number(row.total_finished_quantity || 0),
    totalQaPassedQuantity: Number(row.total_qa_passed_quantity || 0),
    totalPackedQuantity: Number(row.total_packed_quantity || 0),
    totalRejectedQuantity: Number(row.total_rejected_quantity || 0),
    totalReworkQuantity: Number(row.total_rework_quantity || 0),
    targetStartDate: row.target_start_date,
    targetEndDate: row.target_end_date,
    actualStartDate: row.actual_start_date || undefined,
    actualEndDate: row.actual_end_date || undefined,
    stage: row.stage || "planning",
    status: row.status || "draft",
    priority: row.priority || "normal",
    assignedLine: row.assigned_line || "line_1",
    supervisorId: row.supervisor_id || undefined,
    supervisorName: row.supervisor_name || undefined,
    standardSam: Number(row.standard_sam || 0),
    sizeBreakdown: row.size_breakdown || {},
    colorways: Array.isArray(row.colorways) ? row.colorways : [],
    specialInstructions: row.special_instructions || undefined,
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapProductionJobToRow(job: ProductionJobRecord) {
  return {
    id: job.id.startsWith("prd_") || job.id.startsWith("job_") ? undefined : job.id,
    job_number: job.jobNumber,
    order_id: job.orderId,
    order_number: job.orderNumber,
    client_id: job.clientId,
    client_name: job.clientName,
    product_id: job.productId,
    style_code: job.styleCode,
    style_name: job.styleName,
    cost_estimate_id: job.costEstimateId && !job.costEstimateId.startsWith("cst_") ? job.costEstimateId : null,
    planned_quantity: job.plannedQuantity,
    total_cut_quantity: job.totalCutQuantity,
    total_stitched_quantity: job.totalStitchedQuantity,
    total_finished_quantity: job.totalFinishedQuantity,
    total_qa_passed_quantity: job.totalQaPassedQuantity,
    total_packed_quantity: job.totalPackedQuantity,
    total_rejected_quantity: job.totalRejectedQuantity,
    total_rework_quantity: job.totalReworkQuantity,
    target_start_date: job.targetStartDate,
    target_end_date: job.targetEndDate,
    actual_start_date: job.actualStartDate || null,
    actual_end_date: job.actualEndDate || null,
    stage: job.stage,
    status: job.status,
    priority: job.priority,
    assigned_line: job.assignedLine,
    supervisor_id: job.supervisorId && !job.supervisorId.startsWith("emp_") ? job.supervisorId : null,
    supervisor_name: job.supervisorName || null,
    standard_sam: job.standardSam,
    size_breakdown: job.sizeBreakdown,
    colorways: job.colorways,
    special_instructions: job.specialInstructions || null,
    is_archived: Boolean(job.isArchived),
  };
}

// -----------------------------------------------------------------------------
// REPOSITORY METHODS
// -----------------------------------------------------------------------------

export const PRODUCTION_JOBS_STORAGE_KEY = "factoryos_production_jobs";
export const CUTTING_PLANS_STORAGE_KEY = "factoryos_cutting_plans";
export const MATERIAL_ISSUES_STORAGE_KEY = "factoryos_production_material_issues";
export const BUNDLES_STORAGE_KEY = "factoryos_production_bundles";
export const OPERATOR_LOGS_STORAGE_KEY = "factoryos_operator_production_logs";
export const TIMELINE_STORAGE_KEY = "factoryos_production_timeline";
export const PRODUCTION_LINES_STORAGE_KEY = "factoryos_production_lines";
export const SEWING_LINE_ALLOCATIONS_STORAGE_KEY = "factoryos_sewing_line_allocations";

export async function getProductionJobsFromSupabase(): Promise<ProductionJobRecord[]> {
  try {
    const res = await fetch("/api/production");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(PRODUCTION_JOBS_STORAGE_KEY, JSON.stringify(json.data));
      }
      return json.data;
    }
  } catch (err) {}

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PRODUCTION_JOBS_STORAGE_KEY);
      const list: ProductionJobRecord[] = raw ? JSON.parse(raw) : [];
      return list.filter((j) => !j.isArchived);
    } catch {
      return [];
    }
  }
  return [];
}

export async function getProductionJobByIdFromSupabase(id: string): Promise<ProductionJobRecord | null> {
  if (!isSupabaseConfigured()) {
    const jobs = await getProductionJobsFromSupabase();
    return jobs.find((j) => j.id === id) || null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("production_jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Error fetching production job by ID:", error);
    const jobs = await getProductionJobsFromSupabase();
    return jobs.find((j) => j.id === id) || null;
  }

  return data ? mapRowToProductionJob(data) : null;
}

export async function createProductionJobInSupabase(job: ProductionJobRecord): Promise<ProductionJobRecord> {
  try {
    const res = await fetch("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      job.id = String(json.data.id);
    }
  } catch (err) {}

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PRODUCTION_JOBS_STORAGE_KEY);
      const list: ProductionJobRecord[] = raw ? JSON.parse(raw) : [];
      const updated = [job, ...list.filter((j) => j.id !== job.id)];
      localStorage.setItem(PRODUCTION_JOBS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error(e);
    }
  }
  return job;
}



export async function updateProductionJobInSupabase(
  jobOrId: ProductionJobRecord | string,
  partialUpdates?: Partial<ProductionJobRecord>
): Promise<ProductionJobRecord> {
  let job: ProductionJobRecord;

  if (typeof jobOrId === "string") {
    const existing = await getProductionJobByIdFromSupabase(jobOrId);
    if (!existing) throw new Error(`Production job '${jobOrId}' not found.`);
    job = { ...existing, ...(partialUpdates || {}), updatedAt: new Date().toISOString() };
  } else {
    job = jobOrId;
  }

  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(PRODUCTION_JOBS_STORAGE_KEY);
        const list: ProductionJobRecord[] = raw ? JSON.parse(raw) : [];
        const updated = list.map((j) => (j.id === job.id ? job : j));
        localStorage.setItem(PRODUCTION_JOBS_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }
    return job;
  }

  const supabase = createClient();
  const row = mapProductionJobToRow(job);
  const { data, error } = await supabase
    .from("production_jobs")
    .update(row)
    .eq("id", job.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating production job in Supabase:", error);
    throw error;
  }

  const updated = mapRowToProductionJob(data);
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PRODUCTION_JOBS_STORAGE_KEY);
      const list: ProductionJobRecord[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(PRODUCTION_JOBS_STORAGE_KEY, JSON.stringify(list.map((j) => (j.id === updated.id ? updated : j))));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return updated;
}

export async function deleteProductionJobInSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(PRODUCTION_JOBS_STORAGE_KEY);
        const list: ProductionJobRecord[] = raw ? JSON.parse(raw) : [];
        const updated = list.map((j) => (j.id === id ? { ...j, isArchived: true } : j));
        localStorage.setItem(PRODUCTION_JOBS_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }
    return true;
  }

  const supabase = createClient();

  // Safety verification: check if material has already been issued
  const { count: issueCount } = await supabase
    .from("production_material_issues")
    .select("id", { count: "exact", head: true })
    .eq("production_job_id", id);

  if (issueCount && issueCount > 0) {
    throw new Error("Cannot delete production job: Material has already been issued from inventory. Archive the job instead.");
  }

  // Soft archive to protect audit trail
  const { error } = await supabase
    .from("production_jobs")
    .update({ is_archived: true })
    .eq("id", id);

  if (error) {
    console.error("Error archiving production job in Supabase:", error);
    throw error;
  }

  return true;
}

// -----------------------------------------------------------------------------
// CUTTING PLANS
// -----------------------------------------------------------------------------

export async function getCuttingPlansForJob(productionJobId: string): Promise<CuttingPlanRecord[]> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(CUTTING_PLANS_STORAGE_KEY);
        const list: CuttingPlanRecord[] = raw ? JSON.parse(raw) : [];
        return list.filter((p) => p.productionJobId === productionJobId);
      } catch {
        return [];
      }
    }
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("cutting_plans")
    .select("*, sizes:cutting_plan_sizes(*)")
    .eq("production_job_id", productionJobId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching cutting plans:", error);
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(CUTTING_PLANS_STORAGE_KEY);
        const list: CuttingPlanRecord[] = raw ? JSON.parse(raw) : [];
        return list.filter((p) => p.productionJobId === productionJobId);
      } catch {
        return [];
      }
    }
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    planNumber: row.plan_number,
    productionJobId: row.production_job_id,
    markerName: row.marker_name,
    markerLengthMeters: Number(row.marker_length_meters || 0),
    markerWidthCm: Number(row.marker_width_cm || 0),
    fabricType: row.fabric_type,
    fabricGsm: row.fabric_gsm,
    colorway: row.colorway,
    pliesCount: Number(row.plies_count || 1),
    plannedLays: Number(row.planned_lays || 1),
    markerEfficiencyPct: Number(row.marker_efficiency_pct || 0),
    status: row.status,
    approvedBy: row.approved_by || undefined,
    notes: row.notes || undefined,
    sizes: (row.sizes || []).map((s: any) => ({
      id: s.id,
      cuttingPlanId: s.cutting_plan_id,
      size: s.size,
      ratio: Number(s.ratio || 1),
      plannedQuantity: Number(s.planned_quantity || 0),
      actualCutQuantity: Number(s.actual_cut_quantity || 0),
      createdAt: s.created_at,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createCuttingPlan(
  plan: Omit<CuttingPlanRecord, "id" | "createdAt">,
  sizes: Omit<CuttingPlanSizeRecord, "id" | "cuttingPlanId" | "createdAt">[]
): Promise<CuttingPlanRecord> {
  if (!isSupabaseConfigured()) {
    const planId = "cut_" + Date.now();
    const newPlan: CuttingPlanRecord = {
      id: planId,
      planNumber: plan.planNumber,
      productionJobId: plan.productionJobId,
      markerName: plan.markerName,
      markerLengthMeters: plan.markerLengthMeters,
      markerWidthCm: plan.markerWidthCm,
      fabricType: plan.fabricType,
      fabricGsm: plan.fabricGsm,
      colorway: plan.colorway,
      pliesCount: plan.pliesCount,
      plannedLays: plan.plannedLays,
      markerEfficiencyPct: plan.markerEfficiencyPct,
      status: plan.status,
      notes: plan.notes,
      sizes: sizes.map((s, idx) => ({
        id: "cps_" + Date.now() + "_" + idx,
        cuttingPlanId: planId,
        size: s.size,
        ratio: s.ratio,
        plannedQuantity: s.plannedQuantity,
        actualCutQuantity: s.actualCutQuantity || 0,
        createdAt: new Date().toISOString(),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(CUTTING_PLANS_STORAGE_KEY);
        const list: CuttingPlanRecord[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(CUTTING_PLANS_STORAGE_KEY, JSON.stringify([...list, newPlan]));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }
    return newPlan;
  }

  const supabase = createClient();
  const { data: planData, error: planError } = await supabase
    .from("cutting_plans")
    .insert([
      {
        plan_number: plan.planNumber,
        production_job_id: plan.productionJobId,
        marker_name: plan.markerName,
        marker_length_meters: plan.markerLengthMeters,
        marker_width_cm: plan.markerWidthCm,
        fabric_type: plan.fabricType,
        fabric_gsm: plan.fabricGsm,
        colorway: plan.colorway,
        plies_count: plan.pliesCount,
        planned_lays: plan.plannedLays,
        marker_efficiency_pct: plan.markerEfficiencyPct,
        status: plan.status,
        notes: plan.notes || null,
      },
    ])
    .select()
    .single();

  if (planError) throw planError;

  if (sizes.length > 0) {
    const sizeRows = sizes.map((s) => ({
      cutting_plan_id: planData.id,
      size: s.size,
      ratio: s.ratio,
      planned_quantity: s.plannedQuantity,
      actual_cut_quantity: s.actualCutQuantity || 0,
    }));

    const { error: sizeError } = await supabase.from("cutting_plan_sizes").insert(sizeRows);
    if (sizeError) throw sizeError;
  }

  return (await getCuttingPlansForJob(plan.productionJobId)).find((p) => p.id === planData.id)!;
}

// -----------------------------------------------------------------------------
// MATERIAL ISSUANCE WITH TRANSACTIONAL STOCK MOVEMENT
// -----------------------------------------------------------------------------

export async function issueMaterialToProduction(
  issue: Omit<ProductionMaterialIssueRecord, "id" | "issuedAt" | "netConsumedQty" | "totalCost" | "stockMovementId">
): Promise<ProductionMaterialIssueRecord> {
  if (!isSupabaseConfigured()) {
    const newIssue: ProductionMaterialIssueRecord = {
      id: "iss_" + Date.now(),
      issueNumber: issue.issueNumber,
      productionJobId: issue.productionJobId,
      inventoryItemId: issue.inventoryItemId,
      materialId: issue.materialId,
      materialName: issue.materialName,
      sku: issue.sku,
      lotNumber: issue.lotNumber,
      category: issue.category,
      fromBay: issue.fromBay,
      toStage: issue.toStage,
      standardBomQty: issue.standardBomQty,
      issuedQuantity: issue.issuedQuantity,
      returnedQuantity: issue.returnedQuantity || 0,
      netConsumedQty: issue.issuedQuantity,
      unit: issue.unit,
      unitCost: issue.unitCost,
      totalCost: issue.issuedQuantity * issue.unitCost,
      issuedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(MATERIAL_ISSUES_STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        localStorage.setItem(MATERIAL_ISSUES_STORAGE_KEY, JSON.stringify([...list, newIssue]));

        // Decrement inventory stock
        const invRaw = localStorage.getItem("factoryos_inventory_items");
        if (invRaw) {
          const invList = JSON.parse(invRaw);
          const updatedInv = invList.map((item: any) =>
            item.id === issue.inventoryItemId
              ? { ...item, availableStock: Math.max(0, Number(item.availableStock || 0) - issue.issuedQuantity) }
              : item
          );
          localStorage.setItem("factoryos_inventory_items", JSON.stringify(updatedInv));
        }

        // Record stock movement
        const moveRaw = localStorage.getItem("factoryos_stock_movements");
        const moveList = moveRaw ? JSON.parse(moveRaw) : [];
        moveList.push({
          id: "mov_" + Date.now(),
          itemId: issue.inventoryItemId,
          inventoryItemId: issue.inventoryItemId,
          itemName: issue.materialName,
          sku: issue.sku,
          type: "issuance",
          quantity: issue.issuedQuantity,
          unit: issue.unit,
          fromBay: issue.fromBay,
          toBay: issue.toStage,
          timestamp: new Date().toISOString(),
          notes: `Production Requisition ${issue.issueNumber} for Job ${issue.productionJobId}`,
        });
        localStorage.setItem("factoryos_stock_movements", JSON.stringify(moveList));

        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }

    await addProductionTimelineEvent(
      issue.productionJobId,
      "material_issued",
      "Fabric & Materials Issued",
      `Issued ${issue.issuedQuantity} ${issue.unit} of ${issue.materialName} (${issue.sku}, Lot: ${issue.lotNumber}) from ${issue.fromBay} to ${issue.toStage}.`,
      "Store Manager"
    );

    return newIssue;
  }

  const supabase = createClient();

  // 1. Validate Available Stock
  const { data: invItem, error: fetchError } = await supabase
    .from("inventory_items")
    .select("available_stock, allocated_stock, bay, name")
    .eq("id", issue.inventoryItemId)
    .single();

  if (fetchError || !invItem) {
    throw new Error(`Inventory item ${issue.sku} not found in database.`);
  }

  const currentAvailable = Number(invItem.available_stock || 0);
  if (issue.issuedQuantity > currentAvailable) {
    throw new Error(
      `Insufficient inventory in ${invItem.bay || issue.fromBay}: Requested ${issue.issuedQuantity} ${issue.unit}, but only ${currentAvailable} ${issue.unit} available.`
    );
  }

  // 2. Create Stock Movement audit log
  const { data: moveData, error: moveError } = await supabase
    .from("stock_movements")
    .insert([
      {
        inventory_item_id: issue.inventoryItemId,
        item_name: issue.materialName,
        sku: issue.sku,
        movement_type: "issuance",
        quantity: issue.issuedQuantity,
        unit: issue.unit,
        from_bay: issue.fromBay,
        to_bay: issue.toStage,
        notes: `Production Requisition ${issue.issueNumber} for Job ${issue.productionJobId}`,
      },
    ])
    .select()
    .single();

  if (moveError) {
    console.error("Error creating stock movement for material issue:", moveError);
    throw moveError;
  }

  // 3. Decrement available stock from inventory_items
  const newStock = Math.max(0, currentAvailable - issue.issuedQuantity);
  await supabase
    .from("inventory_items")
    .update({ available_stock: newStock })
    .eq("id", issue.inventoryItemId);

  // 4. Insert Production Material Issue Record
  const { data: issueData, error: issueError } = await supabase
    .from("production_material_issues")
    .insert([
      {
        issue_number: issue.issueNumber,
        production_job_id: issue.productionJobId,
        inventory_item_id: issue.inventoryItemId,
        material_id: issue.materialId || null,
        material_name: issue.materialName,
        sku: issue.sku,
        lot_number: issue.lotNumber,
        category: issue.category,
        from_bay: issue.fromBay,
        to_stage: issue.toStage,
        standard_bom_qty: issue.standardBomQty,
        issued_quantity: issue.issuedQuantity,
        returned_quantity: issue.returnedQuantity || 0,
        unit: issue.unit,
        unit_cost: issue.unitCost,
        stock_movement_id: moveData.id,
      },
    ])
    .select()
    .single();

  if (issueError) throw issueError;

  // 5. Advance production job stage if in planning
  const { data: jobData } = await supabase
    .from("production_jobs")
    .select("stage, status, job_number")
    .eq("id", issue.productionJobId)
    .single();

  if (jobData && (jobData.stage === "planning" || jobData.status === "draft")) {
    await supabase
      .from("production_jobs")
      .update({ stage: "cutting", status: "in_production" })
      .eq("id", issue.productionJobId);
  }

  // 6. Log Timeline Event with duplicate prevention
  await addProductionTimelineEvent(
    issue.productionJobId,
    "material_issued",
    "Fabric & Materials Issued",
    `Issued ${issue.issuedQuantity} ${issue.unit} of ${issue.materialName} (${issue.sku}, Lot: ${issue.lotNumber}) from ${issue.fromBay} to ${issue.toStage}.`,
    "Store Manager"
  );

  return {
    id: issueData.id,
    issueNumber: issueData.issue_number,
    productionJobId: issueData.production_job_id,
    inventoryItemId: issueData.inventory_item_id,
    materialId: issueData.material_id || undefined,
    materialName: issueData.material_name,
    sku: issueData.sku,
    lotNumber: issueData.lot_number,
    category: issueData.category,
    fromBay: issueData.from_bay,
    toStage: issueData.to_stage,
    standardBomQty: Number(issueData.standard_bom_qty),
    issuedQuantity: Number(issueData.issued_quantity),
    returnedQuantity: Number(issueData.returned_quantity),
    netConsumedQty: Number(issueData.net_consumed_qty || issueData.issued_quantity),
    unit: issueData.unit,
    unitCost: Number(issueData.unit_cost),
    totalCost: Number(issueData.total_cost || 0),
    stockMovementId: issueData.stock_movement_id || undefined,
    issuedAt: issueData.issued_at,
  };
}

export async function addProductionTimelineEvent(
  jobId: string,
  eventType: string,
  title: string,
  description: string,
  actor: string = "System"
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(TIMELINE_STORAGE_KEY);
        const list: ProductionTimelineRecord[] = raw ? JSON.parse(raw) : [];
        const newEvt: ProductionTimelineRecord = {
          id: "evt_" + Date.now(),
          productionJobId: jobId,
          eventType,
          title,
          description,
          actor,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify([newEvt, ...list]));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }
    return true;
  }

  const supabase = createClient();

  // Prevent duplicate events within 5 seconds for the same title and job
  const fiveSecsAgo = new Date(Date.now() - 5000).toISOString();
  const { data: existing } = await supabase
    .from("production_timeline")
    .select("id")
    .eq("production_job_id", jobId)
    .eq("title", title)
    .gte("timestamp", fiveSecsAgo)
    .limit(1);

  if (existing && existing.length > 0) {
    return true; // deduplicated
  }

  const { error } = await supabase.from("production_timeline").insert([
    {
      production_job_id: jobId,
      event_type: eventType,
      title,
      description,
      actor,
      timestamp: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error("Error adding timeline event:", error);
    return false;
  }

  return true;
}

export async function logCuttingExecution(params: {
  cuttingPlanId: string;
  productionJobId: string;
  tableNumber: string;
  actualPlies: number;
  fabricRollNumbers: string[];
  actualCutPieces: number;
  cutWasteKg: number;
  cutterEmployeeId?: string;
  cutterName?: string;
  sizeUpdates: { id: string; size: string; actualCutQuantity: number }[];
}): Promise<CuttingExecutionRecord> {
  if (!isSupabaseConfigured()) {
    const execRecord: CuttingExecutionRecord = {
      id: "exec_" + Date.now(),
      cuttingPlanId: params.cuttingPlanId,
      productionJobId: params.productionJobId,
      tableNumber: params.tableNumber,
      actualPlies: params.actualPlies,
      fabricRollNumbers: params.fabricRollNumbers,
      actualCutPieces: params.actualCutPieces,
      cutWasteKg: params.cutWasteKg,
      cutterEmployeeId: params.cutterEmployeeId,
      status: "completed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      try {
        // 1. Update cutting plan
        const plansRaw = localStorage.getItem(CUTTING_PLANS_STORAGE_KEY);
        if (plansRaw) {
          const plans: CuttingPlanRecord[] = JSON.parse(plansRaw);
          const updatedPlans = plans.map((p) => {
            if (p.id === params.cuttingPlanId) {
              const updatedSizes = (p.sizes || []).map((s) => {
                const match = params.sizeUpdates.find((u) => u.id === s.id || u.size === s.size);
                return match ? { ...s, actualCutQuantity: match.actualCutQuantity } : s;
              });
              return { ...p, status: "completed" as const, sizes: updatedSizes };
            }
            return p;
          });
          localStorage.setItem(CUTTING_PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
        }

        // 2. Generate scannable bundles
        const bundlesRaw = localStorage.getItem(BUNDLES_STORAGE_KEY);
        const currentBundles: ProductionBundleRecord[] = bundlesRaw ? JSON.parse(bundlesRaw) : [];
        let bundleIdx = currentBundles.length + 1;
        const newBundles: ProductionBundleRecord[] = [];

        for (const s of params.sizeUpdates) {
          let remaining = s.actualCutQuantity;
          const bundleSize = 25;
          while (remaining > 0) {
            const bQty = Math.min(remaining, bundleSize);
            const barcode = `BND-${params.productionJobId.replace("prd_", "")}-${s.size}-${String(bundleIdx).padStart(3, "0")}`;
            newBundles.push({
              id: "bnd_" + Date.now() + "_" + bundleIdx,
              bundleBarcode: barcode,
              productionJobId: params.productionJobId,
              cuttingExecutionId: execRecord.id,
              bundleNumber: bundleIdx,
              size: s.size,
              colorway: "Standard",
              quantity: bQty,
              currentStage: "cutting",
              currentLine: "line_1",
              status: "in_progress",
              passedPieces: 0,
              rejectedPieces: 0,
              reworkPieces: 0,
              createdAt: new Date().toISOString(),
            });
            bundleIdx++;
            remaining -= bQty;
          }
        }

        localStorage.setItem(BUNDLES_STORAGE_KEY, JSON.stringify([...currentBundles, ...newBundles]));

        // 3. Update job totalCutQuantity & stage
        const jobsRaw = localStorage.getItem(PRODUCTION_JOBS_STORAGE_KEY);
        if (jobsRaw) {
          const jobs: ProductionJobRecord[] = JSON.parse(jobsRaw);
          const updatedJobs = jobs.map((j) => {
            if (j.id === params.productionJobId) {
              const newTotalCut = (j.totalCutQuantity || 0) + params.actualCutPieces;
              const newStage = newTotalCut >= j.plannedQuantity ? ("cutting_completed" as const) : ("cutting" as const);
              return { ...j, totalCutQuantity: newTotalCut, stage: newStage, status: "in_production" as const };
            }
            return j;
          });
          localStorage.setItem(PRODUCTION_JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
        }

        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }

    await addProductionTimelineEvent(
      params.productionJobId,
      "cutting_completed",
      "Cutting Run Completed",
      `Cut ${params.actualCutPieces} pieces on Table ${params.tableNumber} (${params.actualPlies} plies, Waste: ${params.cutWasteKg} kg). Generated scannable bundles.`,
      params.cutterName || "Cutting Master"
    );

    return execRecord;
  }

  const supabase = createClient();

  // 1. Insert cutting execution
  const { data: execData, error: execError } = await supabase
    .from("cutting_executions")
    .insert([
      {
        cutting_plan_id: params.cuttingPlanId,
        production_job_id: params.productionJobId,
        table_number: params.tableNumber,
        actual_plies: params.actualPlies,
        fabric_roll_numbers: params.fabricRollNumbers,
        actual_cut_pieces: params.actualCutPieces,
        cut_waste_kg: params.cutWasteKg,
        cutter_employee_id: params.cutterEmployeeId && !params.cutterEmployeeId.startsWith("emp_") ? params.cutterEmployeeId : null,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (execError) throw execError;

  // 2. Update size cut quantities in cutting_plan_sizes
  for (const s of params.sizeUpdates) {
    await supabase
      .from("cutting_plan_sizes")
      .update({ actual_cut_quantity: s.actualCutQuantity })
      .eq("id", s.id);
  }

  // 3. Mark plan as completed
  await supabase
    .from("cutting_plans")
    .update({ status: "completed" })
    .eq("id", params.cuttingPlanId);

  // 4. Update Production Job total cut quantity
  const { data: allExecs } = await supabase
    .from("cutting_executions")
    .select("actual_cut_pieces")
    .eq("production_job_id", params.productionJobId);

  const totalCut = (allExecs || []).reduce((sum, e) => sum + Number(e.actual_cut_pieces || 0), 0);

  const { data: job } = await supabase
    .from("production_jobs")
    .select("planned_quantity, stage, job_number")
    .eq("id", params.productionJobId)
    .single();

  const newStage = totalCut >= Number(job?.planned_quantity || 0) ? "cutting_completed" : "cutting";

  await supabase
    .from("production_jobs")
    .update({
      total_cut_quantity: totalCut,
      stage: newStage,
      status: "in_production",
    })
    .eq("id", params.productionJobId);

  // 5. Generate bundles automatically for the newly cut pieces
  let bundleIdx = 1;
  const bundleRows = [];
  for (const s of params.sizeUpdates) {
    let remaining = s.actualCutQuantity;
    const bundleSize = 25; // 25 pcs per bundle
    while (remaining > 0) {
      const bQty = Math.min(remaining, bundleSize);
      const barcode = `BND-${job?.job_number || "JOB"}-${s.size}-${String(bundleIdx).padStart(3, "0")}`;
      bundleRows.push({
        bundle_barcode: barcode,
        production_job_id: params.productionJobId,
        cutting_execution_id: execData.id,
        bundle_number: bundleIdx,
        size: s.size,
        colorway: "Standard",
        quantity: bQty,
        current_stage: "cutting",
        current_line: "line_1",
        status: "in_progress",
      });
      bundleIdx++;
      remaining -= bQty;
    }
  }

  if (bundleRows.length > 0) {
    await supabase.from("production_bundles").insert(bundleRows);
  }

  // 6. Log Timeline Event
  await addProductionTimelineEvent(
    params.productionJobId,
    "cutting_completed",
    "Cutting Run Completed",
    `Cut ${params.actualCutPieces} pieces on Table ${params.tableNumber} (${params.actualPlies} plies, Waste: ${params.cutWasteKg} kg). Generated ${bundleRows.length} bundles.`,
    params.cutterName || "Cutting Master"
  );

  return {
    id: execData.id,
    cuttingPlanId: execData.cutting_plan_id,
    productionJobId: execData.production_job_id,
    tableNumber: execData.table_number,
    actualPlies: execData.actual_plies,
    fabricRollNumbers: execData.fabric_roll_numbers,
    actualCutPieces: execData.actual_cut_pieces,
    cutWasteKg: Number(execData.cut_waste_kg),
    cutterEmployeeId: execData.cutter_employee_id || undefined,
    status: execData.status,
    startedAt: execData.started_at,
    completedAt: execData.completed_at || undefined,
  };
}

export async function getMaterialIssuesForJob(productionJobId: string): Promise<ProductionMaterialIssueRecord[]> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(MATERIAL_ISSUES_STORAGE_KEY);
        const list: ProductionMaterialIssueRecord[] = raw ? JSON.parse(raw) : [];
        return list.filter((m) => m.productionJobId === productionJobId);
      } catch {
        return [];
      }
    }
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("production_material_issues")
    .select("*")
    .eq("production_job_id", productionJobId)
    .order("issued_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    issueNumber: r.issue_number,
    productionJobId: r.production_job_id,
    inventoryItemId: r.inventory_item_id,
    materialId: r.material_id || undefined,
    materialName: r.material_name,
    sku: r.sku,
    lotNumber: r.lot_number,
    category: r.category,
    fromBay: r.from_bay,
    toStage: r.to_stage,
    standardBomQty: Number(r.standard_bom_qty),
    issuedQuantity: Number(r.issued_quantity),
    returnedQuantity: Number(r.returned_quantity),
    netConsumedQty: Number(r.net_consumed_qty || r.issued_quantity),
    unit: r.unit,
    unitCost: Number(r.unit_cost),
    totalCost: Number(r.total_cost || 0),
    stockMovementId: r.stock_movement_id || undefined,
    issuedAt: r.issued_at,
  }));
}

// -----------------------------------------------------------------------------
// PRODUCTION LINES & MASTER SETUP (PHASE 2.4)
// -----------------------------------------------------------------------------

export async function getProductionLinesFromSupabase(): Promise<ProductionLineRecord[]> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(PRODUCTION_LINES_STORAGE_KEY);
        const lines: ProductionLineRecord[] = raw ? JSON.parse(raw) : [];
        return lines;
      } catch {
        return [];
      }
    }
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("production_lines")
    .select("*")
    .order("line_code", { ascending: true });

  if (error) {
    console.error("Error fetching production lines:", error);
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(PRODUCTION_LINES_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    lineCode: r.line_code,
    lineName: r.line_name,
    department: r.department || "Stitching",
    supervisorId: r.supervisor_id || undefined,
    supervisorName: r.supervisor_name || undefined,
    shift: r.shift || "Morning",
    dailyTargetCapacity: Number(r.daily_target_capacity || 600),
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
  }));
}

export async function getProductionLineByIdFromSupabase(lineId: string): Promise<ProductionLineRecord | null> {
  const lines = await getProductionLinesFromSupabase();
  return lines.find((l) => l.id === lineId || l.lineCode === lineId) || null;
}

export async function createProductionLineInSupabase(
  line: Omit<ProductionLineRecord, "id" | "createdAt">
): Promise<ProductionLineRecord> {
  const normalizedCode = (line.lineCode || "").trim().toLowerCase();
  const normalizedName = (line.lineName || "").trim().toLowerCase();

  if (!normalizedCode || !normalizedName) {
    throw new Error("Line code and line name are required.");
  }

  // Duplicate Check
  const existingLines = await getProductionLinesFromSupabase();
  const isDuplicate = existingLines.some(
    (l) => (l.lineCode || "").toLowerCase() === normalizedCode || (l.lineName || "").toLowerCase() === normalizedName
  );

  if (isDuplicate) {
    throw new Error(`Duplicate line identifier: A stitching line with code '${line.lineCode}' or name '${line.lineName}' already exists.`);
  }

  if (!isSupabaseConfigured()) {
    const newLine: ProductionLineRecord = {
      id: "line_" + Date.now(),
      lineCode: line.lineCode.trim(),
      lineName: line.lineName.trim(),
      department: line.department || "Stitching",
      supervisorId: line.supervisorId,
      supervisorName: line.supervisorName,
      shift: line.shift || "Morning",
      dailyTargetCapacity: line.dailyTargetCapacity || 600,
      isActive: line.isActive !== false,
      createdAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(PRODUCTION_LINES_STORAGE_KEY);
        const list: ProductionLineRecord[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(PRODUCTION_LINES_STORAGE_KEY, JSON.stringify([...list, newLine]));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }
    return newLine;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("production_lines")
    .insert([
      {
        line_code: line.lineCode.trim(),
        line_name: line.lineName.trim(),
        department: line.department || "Stitching",
        supervisor_id: line.supervisorId && !line.supervisorId.startsWith("emp_") ? line.supervisorId : null,
        supervisor_name: line.supervisorName || null,
        shift: line.shift || "Morning",
        daily_target_capacity: line.dailyTargetCapacity || 600,
        is_active: line.isActive !== false,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    lineCode: data.line_code,
    lineName: data.line_name,
    department: data.department,
    supervisorId: data.supervisor_id || undefined,
    supervisorName: data.supervisor_name || undefined,
    shift: data.shift,
    dailyTargetCapacity: Number(data.daily_target_capacity),
    isActive: Boolean(data.is_active),
    createdAt: data.created_at,
  };
}

export async function updateProductionLineInSupabase(
  id: string,
  updates: Partial<ProductionLineRecord>
): Promise<ProductionLineRecord> {
  if (!isSupabaseConfigured()) {
    let updated: ProductionLineRecord | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(PRODUCTION_LINES_STORAGE_KEY);
        const list: ProductionLineRecord[] = raw ? JSON.parse(raw) : [];
        const modified = list.map((l) => {
          if (l.id === id) {
            updated = { ...l, ...updates };
            return updated;
          }
          return l;
        });
        localStorage.setItem(PRODUCTION_LINES_STORAGE_KEY, JSON.stringify(modified));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }
    if (!updated) throw new Error("Production line not found.");
    return updated;
  }

  const supabase = createClient();
  const updatePayload: Record<string, any> = {};
  if (updates.lineName !== undefined) updatePayload.line_name = updates.lineName;
  if (updates.department !== undefined) updatePayload.department = updates.department;
  if (updates.supervisorId !== undefined) updatePayload.supervisor_id = updates.supervisorId;
  if (updates.supervisorName !== undefined) updatePayload.supervisor_name = updates.supervisorName;
  if (updates.shift !== undefined) updatePayload.shift = updates.shift;
  if (updates.dailyTargetCapacity !== undefined) updatePayload.daily_target_capacity = updates.dailyTargetCapacity;
  if (updates.isActive !== undefined) updatePayload.is_active = updates.isActive;

  const { data, error } = await supabase
    .from("production_lines")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    lineCode: data.line_code,
    lineName: data.line_name,
    department: data.department,
    supervisorId: data.supervisor_id || undefined,
    supervisorName: data.supervisor_name || undefined,
    shift: data.shift,
    dailyTargetCapacity: Number(data.daily_target_capacity),
    isActive: Boolean(data.is_active),
    createdAt: data.created_at,
  };
}

export async function toggleProductionLineStatusInSupabase(
  id: string,
  isActive: boolean
): Promise<ProductionLineRecord> {
  return updateProductionLineInSupabase(id, { isActive });
}

export async function assignSupervisorToLineInSupabase(
  lineId: string,
  supervisorId: string,
  supervisorName: string
): Promise<ProductionLineRecord> {
  return updateProductionLineInSupabase(lineId, { supervisorId, supervisorName });
}

export async function allocateJobToLineInSupabase(params: {
  productionJobId: string;
  lineCode: string;
  lineName?: string;
  allocatedOperators: number;
  targetDailyOutput: number;
  hourlyTarget?: number;
  smvPerGarment?: number;
  startDate: string;
  endDate: string;
  supervisorId?: string;
  supervisorName?: string;
}): Promise<SewingLineAllocationRecord> {
  // 1. Verify line exists and is active
  const lines = await getProductionLinesFromSupabase();
  const matchedLine = lines.find((l) => l.lineCode === params.lineCode || l.id === params.lineCode);
  if (matchedLine && !matchedLine.isActive) {
    throw new Error(`Cannot allocate job to inactive stitching line ${matchedLine.lineName} (${matchedLine.lineCode}).`);
  }

  // 2. Verify job exists
  const job = await getProductionJobByIdFromSupabase(params.productionJobId);
  if (!job) {
    throw new Error(`Production job with ID ${params.productionJobId} not found.`);
  }

  const lineName = params.lineName || matchedLine?.lineName || params.lineCode;

  if (!isSupabaseConfigured()) {
    const allocation: SewingLineAllocationRecord = {
      id: "alloc_" + Date.now(),
      productionJobId: params.productionJobId,
      lineCode: params.lineCode as SewingLine,
      lineName,
      allocatedOperators: params.allocatedOperators,
      targetDailyOutput: params.targetDailyOutput,
      hourlyTarget: params.hourlyTarget || Math.round(params.targetDailyOutput / 8),
      smvPerGarment: params.smvPerGarment || job.standardSam || 18.5,
      startDate: params.startDate,
      endDate: params.endDate,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(SEWING_LINE_ALLOCATIONS_STORAGE_KEY);
        const list: SewingLineAllocationRecord[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(SEWING_LINE_ALLOCATIONS_STORAGE_KEY, JSON.stringify([...list, allocation]));

        // Update Job stage and assigned line
        const jobsRaw = localStorage.getItem(PRODUCTION_JOBS_STORAGE_KEY);
        if (jobsRaw) {
          const jobs: ProductionJobRecord[] = JSON.parse(jobsRaw);
          const updatedJobs = jobs.map((j) => {
            if (j.id === params.productionJobId) {
              return {
                ...j,
                stage: "stitching" as const,
                status: "in_production" as const,
                assignedLine: params.lineCode as SewingLine,
                supervisorId: params.supervisorId || j.supervisorId,
                supervisorName: params.supervisorName || j.supervisorName,
              };
            }
            return j;
          });
          localStorage.setItem(PRODUCTION_JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
        }

        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }

    await addProductionTimelineEvent(
      params.productionJobId,
      "job_allocated_to_line",
      "Job Allocated to Stitching Line",
      `Allocated Work Order ${job.jobNumber} to ${lineName} with ${params.allocatedOperators} operators (Daily Target: ${params.targetDailyOutput} pcs).`,
      params.supervisorName || "Production Manager"
    );

    return allocation;
  }

  const supabase = createClient();

  // 1. Insert sewing line allocation
  const { data: allocData, error: allocError } = await supabase
    .from("sewing_line_allocations")
    .insert([
      {
        production_job_id: params.productionJobId,
        line_code: params.lineCode,
        line_name: lineName,
        allocated_operators: params.allocatedOperators,
        target_daily_output: params.targetDailyOutput,
        hourly_target: params.hourlyTarget || Math.round(params.targetDailyOutput / 8),
        smv_per_garment: params.smvPerGarment || job.standardSam || 18.5,
        start_date: params.startDate,
        end_date: params.endDate,
        status: "active",
      },
    ])
    .select()
    .single();

  if (allocError) throw allocError;

  // 2. Update production job status, stage and line
  const jobUpdates: Record<string, any> = {
    stage: "stitching",
    status: "in_production",
    assigned_line: params.lineCode,
  };
  if (params.supervisorId && !params.supervisorId.startsWith("emp_")) {
    jobUpdates.supervisor_id = params.supervisorId;
  }
  if (params.supervisorName) {
    jobUpdates.supervisor_name = params.supervisorName;
  }

  await supabase
    .from("production_jobs")
    .update(jobUpdates)
    .eq("id", params.productionJobId);

  // 3. Log timeline event
  await addProductionTimelineEvent(
    params.productionJobId,
    "job_allocated_to_line",
    "Job Allocated to Stitching Line",
    `Allocated Work Order ${job.jobNumber} to ${lineName} with ${params.allocatedOperators} operators (Daily Target: ${params.targetDailyOutput} pcs).`,
    params.supervisorName || "Production Manager"
  );

  return {
    id: allocData.id,
    productionJobId: allocData.production_job_id,
    lineCode: allocData.line_code,
    lineName: allocData.line_name,
    allocatedOperators: Number(allocData.allocated_operators),
    targetDailyOutput: Number(allocData.target_daily_output),
    hourlyTarget: Number(allocData.hourly_target),
    smvPerGarment: Number(allocData.smv_per_garment),
    startDate: allocData.start_date,
    endDate: allocData.end_date,
    status: allocData.status,
    createdAt: allocData.created_at,
  };
}

export async function deallocateJobFromLineInSupabase(
  allocationId: string,
  productionJobId: string,
  lineCode: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(SEWING_LINE_ALLOCATIONS_STORAGE_KEY);
        const list: SewingLineAllocationRecord[] = raw ? JSON.parse(raw) : [];
        const updated = list.map((a) => (a.id === allocationId ? { ...a, status: "completed" as const } : a));
        localStorage.setItem(SEWING_LINE_ALLOCATIONS_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }
    await addProductionTimelineEvent(
      productionJobId,
      "job_line_deallocated",
      "Stitching Line Allocation Concluded",
      `Line allocation for ${lineCode} marked as completed.`,
      "Production Supervisor"
    );
    return true;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("sewing_line_allocations")
    .update({ status: "completed" })
    .eq("id", allocationId);

  if (error) throw error;

  await addProductionTimelineEvent(
    productionJobId,
    "job_line_deallocated",
    "Stitching Line Allocation Concluded",
    `Line allocation for ${lineCode} marked as completed.`,
    "Production Supervisor"
  );

  return true;
}

export async function getActiveLineAllocations(): Promise<SewingLineAllocationRecord[]> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(SEWING_LINE_ALLOCATIONS_STORAGE_KEY);
        const list: SewingLineAllocationRecord[] = raw ? JSON.parse(raw) : [];
        return list.filter((a) => a.status === "active");
      } catch {
        return [];
      }
    }
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("sewing_line_allocations")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    productionJobId: r.production_job_id,
    lineCode: r.line_code,
    lineName: r.line_name,
    allocatedOperators: Number(r.allocated_operators),
    targetDailyOutput: Number(r.target_daily_output),
    hourlyTarget: Number(r.hourly_target),
    smvPerGarment: Number(r.smv_per_garment),
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function getLineAllocationsForJob(productionJobId: string): Promise<SewingLineAllocationRecord[]> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(SEWING_LINE_ALLOCATIONS_STORAGE_KEY);
        const list: SewingLineAllocationRecord[] = raw ? JSON.parse(raw) : [];
        return list.filter((a) => a.productionJobId === productionJobId);
      } catch {
        return [];
      }
    }
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("sewing_line_allocations")
    .select("*")
    .eq("production_job_id", productionJobId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    productionJobId: r.production_job_id,
    lineCode: r.line_code,
    lineName: r.line_name,
    allocatedOperators: Number(r.allocated_operators),
    targetDailyOutput: Number(r.target_daily_output),
    hourlyTarget: Number(r.hourly_target),
    smvPerGarment: Number(r.smv_per_garment),
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    createdAt: r.created_at,
  }));
}

// -----------------------------------------------------------------------------
// BUNDLE LIFECYCLE & OPERATOR PIECE-RATE LOGGING (PHASE 2.4)
// -----------------------------------------------------------------------------

export function isValidBundleTransition(currentStatus: string, targetStatus: string): boolean {
  const normCurrent = (currentStatus || "").toLowerCase();
  const normTarget = (targetStatus || "").toLowerCase();

  if (normCurrent === normTarget) return true;

  // Final immutable states
  if (normCurrent === "completed" || normCurrent === "passed") return false;
  if (normCurrent === "rejected" || normCurrent === "scrapped") return false;

  const validTransitions: Record<string, string[]> = {
    pending: ["ready_for_stitching", "in_progress", "issued", "hold", "rework", "rejected"],
    created: ["ready_for_stitching", "in_progress", "issued", "hold", "rework", "rejected"],
    ready_for_stitching: ["in_progress", "issued", "hold", "rework", "rejected"],
    issued: ["in_progress", "completed", "passed", "rework", "rejected", "hold"],
    in_progress: ["completed", "passed", "rework", "rejected", "hold"],
    rework: ["in_progress", "issued", "completed", "passed", "rejected", "hold"],
    hold: ["pending", "ready_for_stitching", "in_progress", "issued", "rework", "rejected"],
  };

  const allowed = validTransitions[normCurrent] || [];
  return allowed.includes(normTarget);
}

export async function getAllActiveBundles(): Promise<ProductionBundleRecord[]> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(BUNDLES_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("production_bundles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    bundleBarcode: r.bundle_barcode,
    productionJobId: r.production_job_id,
    cuttingExecutionId: r.cutting_execution_id || undefined,
    bundleNumber: Number(r.bundle_number),
    size: r.size,
    colorway: r.colorway,
    quantity: Number(r.quantity),
    currentStage: r.current_stage,
    currentLine: r.current_line,
    assignedEmployeeId: r.assigned_employee_id || undefined,
    assignedOperation: r.assigned_operation || undefined,
    status: r.status,
    passedPieces: Number(r.passed_pieces || 0),
    rejectedPieces: Number(r.rejected_pieces || 0),
    reworkPieces: Number(r.rework_pieces || 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getBundlesForJob(productionJobId: string): Promise<ProductionBundleRecord[]> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(BUNDLES_STORAGE_KEY);
        const list: ProductionBundleRecord[] = raw ? JSON.parse(raw) : [];
        return list.filter((b) => b.productionJobId === productionJobId);
      } catch {
        return [];
      }
    }
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("production_bundles")
    .select("*")
    .eq("production_job_id", productionJobId)
    .order("bundle_number", { ascending: true });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    bundleBarcode: r.bundle_barcode,
    productionJobId: r.production_job_id,
    cuttingExecutionId: r.cutting_execution_id || undefined,
    bundleNumber: Number(r.bundle_number),
    size: r.size,
    colorway: r.colorway,
    quantity: Number(r.quantity),
    currentStage: r.current_stage,
    currentLine: r.current_line,
    assignedEmployeeId: r.assigned_employee_id || undefined,
    assignedOperation: r.assigned_operation || undefined,
    status: r.status,
    passedPieces: Number(r.passed_pieces || 0),
    rejectedPieces: Number(r.rejected_pieces || 0),
    reworkPieces: Number(r.rework_pieces || 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getBundleById(bundleId: string): Promise<ProductionBundleRecord | null> {
  const bundles = await getAllActiveBundles();
  return bundles.find((b) => b.id === bundleId || b.bundleBarcode === bundleId) || null;
}

export async function updateBundleStatus(
  bundleId: string,
  newStatus: BundleStatus,
  reason?: string
): Promise<ProductionBundleRecord> {
  const currentBundle = await getBundleById(bundleId);
  if (!currentBundle) {
    throw new Error(`Bundle with ID ${bundleId} not found.`);
  }

  if (!isValidBundleTransition(currentBundle.status, newStatus)) {
    throw new Error(
      `Invalid bundle lifecycle transition: Cannot change status from '${currentBundle.status}' to '${newStatus}'.`
    );
  }

  if (!isSupabaseConfigured()) {
    let updated: ProductionBundleRecord | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(BUNDLES_STORAGE_KEY);
        const bundles: ProductionBundleRecord[] = raw ? JSON.parse(raw) : [];
        const modified = bundles.map((b) => {
          if (b.id === bundleId || b.bundleBarcode === bundleId) {
            updated = { ...b, status: newStatus, updatedAt: new Date().toISOString() };
            return updated;
          }
          return b;
        });
        localStorage.setItem(BUNDLES_STORAGE_KEY, JSON.stringify(modified));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }

    if (newStatus === "rework" || newStatus === "rejected") {
      await addProductionTimelineEvent(
        currentBundle.productionJobId,
        `bundle_${newStatus}`,
        `Bundle Marked as ${newStatus.toUpperCase()}`,
        `Bundle ${currentBundle.bundleBarcode} set to ${newStatus}.${reason ? ` Reason: ${reason}` : ""}`,
        "Quality Auditor"
      );
    }

    return updated || { ...currentBundle, status: newStatus };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("production_bundles")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", currentBundle.id)
    .select()
    .single();

  if (error) throw error;

  if (newStatus === "rework" || newStatus === "rejected") {
    await addProductionTimelineEvent(
      currentBundle.productionJobId,
      `bundle_${newStatus}`,
      `Bundle Marked as ${newStatus.toUpperCase()}`,
      `Bundle ${currentBundle.bundleBarcode} set to ${newStatus}.${reason ? ` Reason: ${reason}` : ""}`,
      "Quality Auditor"
    );
  }

  return {
    id: data.id,
    bundleBarcode: data.bundle_barcode,
    productionJobId: data.production_job_id,
    cuttingExecutionId: data.cutting_execution_id || undefined,
    bundleNumber: Number(data.bundle_number),
    size: data.size,
    colorway: data.colorway,
    quantity: Number(data.quantity),
    currentStage: data.current_stage,
    currentLine: data.current_line,
    assignedEmployeeId: data.assigned_employee_id || undefined,
    assignedOperation: data.assigned_operation || undefined,
    status: data.status,
    passedPieces: Number(data.passed_pieces || 0),
    rejectedPieces: Number(data.rejected_pieces || 0),
    reworkPieces: Number(data.rework_pieces || 0),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function assignBundleToOperator(params: {
  bundleId: string;
  productionJobId: string;
  employeeId: string;
  employeeName: string;
  operationName: string;
  lineCode: string;
  supervisorName?: string;
}): Promise<ProductionBundleRecord> {
  return issueBundleToOperator(params);
}

export async function issueBundleToOperator(params: {
  bundleId: string;
  productionJobId: string;
  employeeId: string;
  employeeName: string;
  operationName: string;
  lineCode: string;
  supervisorName?: string;
}): Promise<ProductionBundleRecord> {
  if (!isSupabaseConfigured()) {
    let updatedBnd: ProductionBundleRecord | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(BUNDLES_STORAGE_KEY);
        const bundles: ProductionBundleRecord[] = raw ? JSON.parse(raw) : [];
        const updated = bundles.map((b) => {
          if (b.id === params.bundleId || b.bundleBarcode === params.bundleId) {
            if (b.status === "completed" || b.status === "passed") {
              throw new Error(`Bundle ${b.bundleBarcode} is already completed.`);
            }
            const mod: ProductionBundleRecord = {
              ...b,
              assignedEmployeeId: params.employeeId,
              assignedEmployeeName: params.employeeName,
              assignedOperation: params.operationName,
              currentLine: params.lineCode as SewingLine,
              currentStage: "stitching" as const,
              status: "in_progress" as const,
              issuedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            updatedBnd = mod;
            return mod;
          }
          return b;
        });
        localStorage.setItem(BUNDLES_STORAGE_KEY, JSON.stringify(updated));

        // Advance job stage to stitching
        const jobsRaw = localStorage.getItem(PRODUCTION_JOBS_STORAGE_KEY);
        if (jobsRaw) {
          const jobs: ProductionJobRecord[] = JSON.parse(jobsRaw);
          const updatedJobs = jobs.map((j) => (j.id === params.productionJobId ? { ...j, stage: "stitching" as const, status: "in_production" as const } : j));
          localStorage.setItem(PRODUCTION_JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
        }

        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }

    await addProductionTimelineEvent(
      params.productionJobId,
      "bundle_assigned",
      "Bundle Issued to Operator",
      `Issued Bundle to ${params.employeeName} for Operation: ${params.operationName} on ${params.lineCode}.`,
      params.supervisorName || "Floor Supervisor"
    );

    return (
      updatedBnd || {
        id: params.bundleId,
        bundleBarcode: "BND-" + params.bundleId,
        productionJobId: params.productionJobId,
        bundleNumber: 1,
        size: "M",
        colorway: "Standard",
        quantity: 25,
        currentStage: "stitching",
        currentLine: params.lineCode as SewingLine,
        assignedEmployeeId: params.employeeId,
        assignedEmployeeName: params.employeeName,
        assignedOperation: params.operationName,
        status: "in_progress",
        passedPieces: 0,
        rejectedPieces: 0,
        reworkPieces: 0,
        createdAt: new Date().toISOString(),
      }
    );
  }

  const supabase = createClient();

  // 1. Verify bundle exists and is eligible
  const { data: bnd, error: bndErr } = await supabase
    .from("production_bundles")
    .select("*")
    .or(`id.eq.${params.bundleId},bundle_barcode.eq.${params.bundleId}`)
    .single();

  if (bndErr || !bnd) throw new Error("Bundle not found.");
  if (bnd.status === "completed" || bnd.status === "passed") {
    throw new Error(`Bundle ${bnd.bundle_barcode} is already completed.`);
  }

  // 2. Update bundle assignment
  const { data: updatedBnd, error: updateErr } = await supabase
    .from("production_bundles")
    .update({
      assigned_employee_id: params.employeeId && !params.employeeId.startsWith("emp_") ? params.employeeId : null,
      assigned_operation: params.operationName,
      current_line: params.lineCode,
      current_stage: "stitching",
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bnd.id)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // 3. Update job stage to stitching
  await supabase
    .from("production_jobs")
    .update({
      stage: "stitching",
      status: "in_production",
    })
    .eq("id", params.productionJobId);

  // 4. Log timeline event
  await addProductionTimelineEvent(
    params.productionJobId,
    "bundle_assigned",
    "Bundle Issued to Operator",
    `Issued Bundle ${bnd.bundle_barcode} (${bnd.quantity} Pcs, Size ${bnd.size}) to ${params.employeeName} for Operation: ${params.operationName} on ${params.lineCode}.`,
    params.supervisorName || "Floor Supervisor"
  );

  return {
    id: updatedBnd.id,
    bundleBarcode: updatedBnd.bundle_barcode,
    productionJobId: updatedBnd.production_job_id,
    cuttingExecutionId: updatedBnd.cutting_execution_id || undefined,
    bundleNumber: Number(updatedBnd.bundle_number),
    size: updatedBnd.size,
    colorway: updatedBnd.colorway,
    quantity: Number(updatedBnd.quantity),
    currentStage: updatedBnd.current_stage,
    currentLine: updatedBnd.current_line,
    assignedEmployeeId: updatedBnd.assigned_employee_id || undefined,
    assignedOperation: updatedBnd.assigned_operation || undefined,
    status: updatedBnd.status,
    passedPieces: Number(updatedBnd.passed_pieces || 0),
    rejectedPieces: Number(updatedBnd.rejected_pieces || 0),
    reworkPieces: Number(updatedBnd.rework_pieces || 0),
    createdAt: updatedBnd.created_at,
    updatedAt: updatedBnd.updated_at,
  };
}

export async function recordOperatorProductionOutput(params: {
  productionJobId: string;
  bundleId: string;
  employeeId: string;
  employeeName: string;
  operationName: string;
  piecesCompleted: number;
  piecesRejected: number;
  piecesRework: number;
  ratePerPiece: number;
  workDate: string;
  shift: string;
  payrollMonth: string;
  verifiedBySupervisor?: string;
  notes?: string;
}): Promise<OperatorProductionLogRecord> {
  if (params.piecesCompleted < 0 || params.piecesRejected < 0 || params.piecesRework < 0) {
    throw new Error("Production quantities cannot be negative.");
  }
  const totalAttempt = params.piecesCompleted + params.piecesRejected + params.piecesRework;
  if (totalAttempt <= 0) {
    throw new Error("Total output pieces (completed + rejected + rework) must be greater than 0.");
  }

  if (!isSupabaseConfigured()) {
    const totalEarned = params.piecesCompleted * params.ratePerPiece;
    const newLog: OperatorProductionLogRecord = {
      id: "log_" + Date.now(),
      productionJobId: params.productionJobId,
      bundleId: params.bundleId,
      bundleBarcode: "BND-" + params.bundleId.substring(0, 8),
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      operationName: params.operationName,
      piecesCompleted: params.piecesCompleted,
      piecesRejected: params.piecesRejected,
      piecesRework: params.piecesRework,
      ratePerPiece: params.ratePerPiece,
      totalEarnings: totalEarned,
      workDate: params.workDate,
      shift: params.shift,
      payrollMonth: params.payrollMonth,
      verifiedBySupervisor: params.verifiedBySupervisor,
      notes: params.notes,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      try {
        // 1. Validate bundle capacity
        const bndsRaw = localStorage.getItem(BUNDLES_STORAGE_KEY);
        if (bndsRaw) {
          const bundles: ProductionBundleRecord[] = JSON.parse(bndsRaw);
          const targetBundle = bundles.find((b) => b.id === params.bundleId || b.bundleBarcode === params.bundleId);
          if (targetBundle) {
            const currentTotal = Number(targetBundle.passedPieces || 0) + Number(targetBundle.rejectedPieces || 0) + Number(targetBundle.reworkPieces || 0);
            if (currentTotal + totalAttempt > targetBundle.quantity) {
              throw new Error(
                `Cannot record output: Total processed (${currentTotal + totalAttempt} pcs) exceeds bundle capacity (${targetBundle.quantity} pcs).`
              );
            }
          }
        }

        // 2. Save log
        const logsRaw = localStorage.getItem(OPERATOR_LOGS_STORAGE_KEY);
        const logs: OperatorProductionLogRecord[] = logsRaw ? JSON.parse(logsRaw) : [];
        localStorage.setItem(OPERATOR_LOGS_STORAGE_KEY, JSON.stringify([newLog, ...logs]));

        // 3. Update bundle pieces
        if (bndsRaw) {
          const bundles: ProductionBundleRecord[] = JSON.parse(bndsRaw);
          const updatedBnds = bundles.map((b) => {
            if (b.id === params.bundleId || b.bundleBarcode === params.bundleId) {
              newLog.bundleBarcode = b.bundleBarcode;
              const newPassed = b.passedPieces + params.piecesCompleted;
              const newRejected = b.rejectedPieces + params.piecesRejected;
              const newRework = b.reworkPieces + params.piecesRework;
              const isFinished = newPassed + newRejected + newRework >= b.quantity;
              return {
                ...b,
                passedPieces: newPassed,
                rejectedPieces: newRejected,
                reworkPieces: newRework,
                status: isFinished ? ("completed" as const) : ("in_progress" as const),
                currentStage: isFinished ? ("finishing" as const) : ("stitching" as const),
                completedAt: isFinished ? new Date().toISOString() : undefined,
              };
            }
            return b;
          });
          localStorage.setItem(BUNDLES_STORAGE_KEY, JSON.stringify(updatedBnds));
        }

        // 4. Update job stitched counts
        const jobsRaw = localStorage.getItem(PRODUCTION_JOBS_STORAGE_KEY);
        if (jobsRaw) {
          const jobs: ProductionJobRecord[] = JSON.parse(jobsRaw);
          const updatedJobs = jobs.map((j) => {
            if (j.id === params.productionJobId) {
              return {
                ...j,
                totalStitchedQuantity: (j.totalStitchedQuantity || 0) + params.piecesCompleted,
                totalRejectedQuantity: (j.totalRejectedQuantity || 0) + params.piecesRejected,
                totalReworkQuantity: (j.totalReworkQuantity || 0) + params.piecesRework,
              };
            }
            return j;
          });
          localStorage.setItem(PRODUCTION_JOBS_STORAGE_KEY, JSON.stringify(updatedJobs));
        }

        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error(e);
      }
    }

    await addProductionTimelineEvent(
      params.productionJobId,
      "production_output_recorded",
      "Stitching Output Recorded",
      `${params.employeeName} completed ${params.piecesCompleted} pcs (${params.piecesRejected} rejected, ${params.piecesRework} rework) for ${params.operationName}. Verified Piece Earnings: PKR ${totalEarned.toFixed(2)}.`,
      "Stitching Floor Supervisor"
    );

    return newLog;
  }

  const supabase = createClient();

  // 1. Fetch bundle to check capacity
  const { data: bnd, error: bndErr } = await supabase
    .from("production_bundles")
    .select("*")
    .or(`id.eq.${params.bundleId},bundle_barcode.eq.${params.bundleId}`)
    .single();

  if (bndErr || !bnd) throw new Error("Bundle not found.");

  const currentTotal = Number(bnd.passed_pieces || 0) + Number(bnd.rejected_pieces || 0) + Number(bnd.rework_pieces || 0);

  if (currentTotal + totalAttempt > Number(bnd.quantity)) {
    throw new Error(
      `Cannot record output: Total processed (${currentTotal + totalAttempt} pcs) exceeds bundle capacity (${bnd.quantity} pcs).`
    );
  }

  // 2. Insert into operator_production_logs
  const { data: logData, error: logErr } = await supabase
    .from("operator_production_logs")
    .insert([
      {
        production_job_id: params.productionJobId,
        bundle_id: bnd.id,
        employee_id: params.employeeId && !params.employeeId.startsWith("emp_") ? params.employeeId : null,
        employee_name: params.employeeName,
        operation_name: params.operationName,
        pieces_completed: params.piecesCompleted,
        pieces_rejected: params.piecesRejected,
        pieces_rework: params.piecesRework,
        rate_per_piece: params.ratePerPiece,
        work_date: params.workDate,
        shift: params.shift,
        payroll_month: params.payrollMonth,
        verified_by_supervisor: params.verifiedBySupervisor || null,
        notes: params.notes || null,
      },
    ])
    .select()
    .single();

  if (logErr) throw logErr;

  // 3. Update bundle counts
  const newPassed = Number(bnd.passed_pieces || 0) + params.piecesCompleted;
  const newRejected = Number(bnd.rejected_pieces || 0) + params.piecesRejected;
  const newRework = Number(bnd.rework_pieces || 0) + params.piecesRework;
  const isBundleFinished = newPassed + newRejected + newRework >= Number(bnd.quantity);

  await supabase
    .from("production_bundles")
    .update({
      passed_pieces: newPassed,
      rejected_pieces: newRejected,
      rework_pieces: newRework,
      status: isBundleFinished ? "completed" : "in_progress",
      current_stage: isBundleFinished ? "finishing" : "stitching",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bnd.id);

  // 4. Update production job aggregated counts
  const { data: allJobLogs } = await supabase
    .from("operator_production_logs")
    .select("pieces_completed, pieces_rejected, pieces_rework")
    .eq("production_job_id", params.productionJobId);

  const totalStitched = (allJobLogs || []).reduce((sum, l) => sum + Number(l.pieces_completed || 0), 0);
  const totalRejected = (allJobLogs || []).reduce((sum, l) => sum + Number(l.pieces_rejected || 0), 0);
  const totalRework = (allJobLogs || []).reduce((sum, l) => sum + Number(l.pieces_rework || 0), 0);

  await supabase
    .from("production_jobs")
    .update({
      total_stitched_quantity: totalStitched,
      total_rejected_quantity: totalRejected,
      total_rework_quantity: totalRework,
      stage: "stitching",
      status: "in_production",
    })
    .eq("id", params.productionJobId);

  // 5. Log timeline event
  const totalEarnings = params.piecesCompleted * params.ratePerPiece;
  await addProductionTimelineEvent(
    params.productionJobId,
    "production_output_recorded",
    "Stitching Output Recorded",
    `${params.employeeName} completed ${params.piecesCompleted} pcs (${params.piecesRejected} rejected, ${params.piecesRework} rework) for ${params.operationName} on Bundle ${bnd.bundle_barcode}. Verified Piece Earnings: PKR ${totalEarnings.toFixed(2)}.`,
    "Stitching Floor Supervisor"
  );

  return {
    id: logData.id,
    productionJobId: logData.production_job_id,
    bundleId: logData.bundle_id,
    bundleBarcode: bnd.bundle_barcode,
    employeeId: logData.employee_id,
    employeeName: logData.employee_name,
    operationName: logData.operation_name,
    piecesCompleted: Number(logData.pieces_completed),
    piecesRejected: Number(logData.pieces_rejected || 0),
    piecesRework: Number(logData.pieces_rework || 0),
    ratePerPiece: Number(logData.rate_per_piece),
    totalEarnings: Number(logData.total_earnings || totalEarnings),
    workDate: logData.work_date,
    shift: logData.shift,
    payrollMonth: logData.payroll_month,
    verifiedBySupervisor: logData.verified_by_supervisor || undefined,
    notes: logData.notes || undefined,
    createdAt: logData.created_at,
  };
}

export async function getOperatorProductionLogsForJob(
  productionJobId: string
): Promise<OperatorProductionLogRecord[]> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(OPERATOR_LOGS_STORAGE_KEY);
        const list: OperatorProductionLogRecord[] = raw ? JSON.parse(raw) : [];
        return list.filter((l) => l.productionJobId === productionJobId);
      } catch {
        return [];
      }
    }
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("operator_production_logs")
    .select("*, bundle:production_bundles(bundle_barcode)")
    .eq("production_job_id", productionJobId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    productionJobId: r.production_job_id,
    bundleId: r.bundle_id,
    bundleBarcode: r.bundle?.bundle_barcode || undefined,
    employeeId: r.employee_id,
    employeeName: r.employee_name,
    operationName: r.operation_name,
    piecesCompleted: Number(r.pieces_completed),
    piecesRejected: Number(r.pieces_rejected || 0),
    piecesRework: Number(r.pieces_rework || 0),
    ratePerPiece: Number(r.rate_per_piece),
    totalEarnings: Number(r.total_earnings),
    workDate: r.work_date,
    shift: r.shift,
    payrollMonth: r.payroll_month,
    verifiedBySupervisor: r.verified_by_supervisor || undefined,
    notes: r.notes || undefined,
    createdAt: r.created_at,
  }));
}

export async function getOperatorProductionLogsByEmployee(
  employeeId: string
): Promise<OperatorProductionLogRecord[]> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(OPERATOR_LOGS_STORAGE_KEY);
        const list: OperatorProductionLogRecord[] = raw ? JSON.parse(raw) : [];
        return list.filter((l) => l.employeeId === employeeId);
      } catch {
        return [];
      }
    }
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("operator_production_logs")
    .select("*, bundle:production_bundles(bundle_barcode)")
    .eq("employee_id", employeeId)
    .order("work_date", { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    productionJobId: r.production_job_id,
    bundleId: r.bundle_id,
    bundleBarcode: r.bundle?.bundle_barcode || undefined,
    employeeId: r.employee_id,
    employeeName: r.employee_name,
    operationName: r.operation_name,
    piecesCompleted: Number(r.pieces_completed),
    piecesRejected: Number(r.pieces_rejected || 0),
    piecesRework: Number(r.pieces_rework || 0),
    ratePerPiece: Number(r.rate_per_piece),
    totalEarnings: Number(r.total_earnings),
    workDate: r.work_date,
    shift: r.shift,
    payrollMonth: r.payroll_month,
    verifiedBySupervisor: r.verified_by_supervisor || undefined,
    notes: r.notes || undefined,
    createdAt: r.created_at,
  }));
}

export async function getOperatorProductionEarningsForMonth(
  employeeId: string,
  payrollMonth: string
): Promise<{
  totalPieceEarnings: number;
  totalCompletedPieces: number;
  details: { operationName: string; pieces: number; ratePerPiece: number; totalAmount: number }[];
  logs: OperatorProductionLogRecord[];
}> {
  let logs: OperatorProductionLogRecord[] = [];

  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(OPERATOR_LOGS_STORAGE_KEY);
        const allLogs: OperatorProductionLogRecord[] = raw ? JSON.parse(raw) : [];
        logs = allLogs.filter((l) => l.employeeId === employeeId && l.payrollMonth === payrollMonth);
      } catch {
        logs = [];
      }
    }
  } else {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("operator_production_logs")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("payroll_month", payrollMonth);

    if (!error && data) {
      logs = data.map((r: any) => ({
        id: r.id,
        productionJobId: r.production_job_id,
        bundleId: r.bundle_id,
        employeeId: r.employee_id,
        employeeName: r.employee_name,
        operationName: r.operation_name,
        piecesCompleted: Number(r.pieces_completed),
        piecesRejected: Number(r.pieces_rejected || 0),
        piecesRework: Number(r.pieces_rework || 0),
        ratePerPiece: Number(r.rate_per_piece),
        totalEarnings: Number(r.total_earnings),
        workDate: r.work_date,
        shift: r.shift,
        payrollMonth: r.payroll_month,
        verifiedBySupervisor: r.verified_by_supervisor || undefined,
        notes: r.notes || undefined,
        createdAt: r.created_at,
      }));
    }
  }

  // Aggregate by operation
  const opMap = new Map<string, { pieces: number; ratePerPiece: number; totalAmount: number }>();
  let totalPieceEarnings = 0;
  let totalCompletedPieces = 0;

  for (const log of logs) {
    totalPieceEarnings += log.totalEarnings;
    totalCompletedPieces += log.piecesCompleted;

    const opKey = log.operationName || "Standard Sewing";
    const existing = opMap.get(opKey) || { pieces: 0, ratePerPiece: log.ratePerPiece, totalAmount: 0 };
    existing.pieces += log.piecesCompleted;
    existing.totalAmount += log.totalEarnings;
    opMap.set(opKey, existing);
  }

  const details = Array.from(opMap.entries()).map(([operationName, val]) => ({
    operationName,
    pieces: val.pieces,
    ratePerPiece: val.ratePerPiece,
    totalAmount: val.totalAmount,
  }));

  return {
    totalPieceEarnings,
    totalCompletedPieces,
    details,
    logs,
  };
}

export async function getFloorMetricsFromSupabase() {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const today = new Date().toISOString().split("T")[0];
        const bndsRaw = localStorage.getItem(BUNDLES_STORAGE_KEY);
        const logsRaw = localStorage.getItem(OPERATOR_LOGS_STORAGE_KEY);
        const linesRaw = localStorage.getItem(PRODUCTION_LINES_STORAGE_KEY);
        const jobsRaw = localStorage.getItem(PRODUCTION_JOBS_STORAGE_KEY);

        const bundles: ProductionBundleRecord[] = bndsRaw ? JSON.parse(bndsRaw) : [];
        const logs: OperatorProductionLogRecord[] = logsRaw ? JSON.parse(logsRaw) : [];
        const lines: ProductionLineRecord[] = linesRaw ? JSON.parse(linesRaw) : [];
        const jobs: ProductionJobRecord[] = jobsRaw ? JSON.parse(jobsRaw) : [];

        const todayLogs = logs.filter((l) => l.workDate === today);
        const activeLinesCount = lines.filter((l) => l.isActive).length;
        const jobsInStitchingCount = jobs.filter((j) => j.stage === "stitching" && j.status === "in_production").length;

        const completedPiecesToday = todayLogs.reduce((sum, l) => sum + Number(l.piecesCompleted || 0), 0);
        const rejectedPiecesToday = todayLogs.reduce((sum, l) => sum + Number(l.piecesRejected || 0), 0);
        const reworkPiecesToday = todayLogs.reduce((sum, l) => sum + Number(l.piecesRework || 0), 0);

        // Efficiency calculation: Target capacity vs Actual pieces
        const totalTargetCapacity = lines.filter((l) => l.isActive).reduce((sum, l) => sum + (l.dailyTargetCapacity || 600), 0);
        const lineEfficiency = totalTargetCapacity > 0 ? Math.min(100, Math.round((completedPiecesToday / totalTargetCapacity) * 100)) : 0;

        return {
          activeLines: activeLinesCount,
          jobsInStitching: jobsInStitchingCount,
          bundlesPending: bundles.filter((b) => b.status === "pending" || b.status === "created" || b.currentStage === "cutting").length,
          bundlesInStitching: bundles.filter((b) => b.currentStage === "stitching" && (b.status === "in_progress" || b.status === "issued")).length,
          completedPiecesToday,
          rejectedPiecesToday,
          reworkPiecesToday,
          activeOperators: new Set(todayLogs.map((l) => l.employeeId)).size,
          lineEfficiency,
        };
      } catch {
        return {
          activeLines: 0,
          jobsInStitching: 0,
          bundlesPending: 0,
          bundlesInStitching: 0,
          completedPiecesToday: 0,
          rejectedPiecesToday: 0,
          reworkPiecesToday: 0,
          activeOperators: 0,
          lineEfficiency: 0,
        };
      }
    }
    return {
      activeLines: 0,
      jobsInStitching: 0,
      bundlesPending: 0,
      bundlesInStitching: 0,
      completedPiecesToday: 0,
      rejectedPiecesToday: 0,
      reworkPiecesToday: 0,
      activeOperators: 0,
      lineEfficiency: 0,
    };
  }

  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: bundles }, { data: todayLogs }, { data: lines }, { data: jobs }] = await Promise.all([
    supabase.from("production_bundles").select("status, current_stage"),
    supabase.from("operator_production_logs").select("pieces_completed, pieces_rejected, pieces_rework, employee_id").eq("work_date", today),
    supabase.from("production_lines").select("id, daily_target_capacity").eq("is_active", true),
    supabase.from("production_jobs").select("id, stage, status").eq("stage", "stitching").eq("status", "in_production"),
  ]);

  const bundlesPending = (bundles || []).filter((b) => b.status === "pending" || b.status === "created" || b.current_stage === "cutting").length;
  const bundlesInStitching = (bundles || []).filter((b) => b.current_stage === "stitching" && (b.status === "in_progress" || b.status === "issued")).length;

  const completedPiecesToday = (todayLogs || []).reduce((sum, l) => sum + Number(l.pieces_completed || 0), 0);
  const rejectedPiecesToday = (todayLogs || []).reduce((sum, l) => sum + Number(l.pieces_rejected || 0), 0);
  const reworkPiecesToday = (todayLogs || []).reduce((sum, l) => sum + Number(l.pieces_rework || 0), 0);
  const activeOperators = new Set((todayLogs || []).map((l) => l.employee_id)).size;

  const totalTargetCapacity = (lines || []).reduce((sum, l) => sum + Number(l.daily_target_capacity || 600), 0);
  const lineEfficiency = totalTargetCapacity > 0 ? Math.min(100, Math.round((completedPiecesToday / totalTargetCapacity) * 100)) : 0;

  return {
    activeLines: lines ? lines.length : 0,
    jobsInStitching: jobs ? jobs.length : 0,
    bundlesPending,
    bundlesInStitching,
    completedPiecesToday,
    rejectedPiecesToday,
    reworkPiecesToday,
    activeOperators,
    lineEfficiency,
  };
}

// -----------------------------------------------------------------------------
// QA INSPECTIONS & PACKING CARTONS
// -----------------------------------------------------------------------------

export async function getQaInspectionsForJob(productionJobId: string): Promise<QaInspectionRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("qa_inspections")
    .select("*, defects:qa_defect_details(*)")
    .eq("production_job_id", productionJobId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    inspectionNumber: r.inspection_number,
    productionJobId: r.production_job_id,
    bundleId: r.bundle_id || undefined,
    inspectionStage: r.inspection_stage,
    sampleSizeInspected: Number(r.sample_size_inspected),
    passedPieces: Number(r.passed_pieces || 0),
    failedPieces: Number(r.failed_pieces || 0),
    reworkPieces: Number(r.rework_pieces || 0),
    scrappedPieces: Number(r.scrapped_pieces || 0),
    decision: r.decision,
    inspectorEmployeeId: r.inspector_employee_id || undefined,
    inspectorName: r.inspector_name,
    notes: r.notes || undefined,
    defects: (r.defects || []).map((d: any) => ({
      id: d.id,
      qaInspectionId: d.qa_inspection_id,
      defectCode: d.defect_code,
      defectCategory: d.defect_category,
      defectCount: Number(d.defect_count),
      responsibleOperation: d.responsible_operation || undefined,
      correctiveActionRequired: d.corrective_action_required || undefined,
      createdAt: d.created_at,
    })),
    createdAt: r.created_at,
  }));
}

export async function getPackingCartonsForJob(productionJobId: string): Promise<PackingCartonRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("packing_cartons")
    .select("*, items:packing_carton_items(*)")
    .eq("production_job_id", productionJobId)
    .order("carton_index", { ascending: true });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    cartonNumber: r.carton_number,
    productionJobId: r.production_job_id,
    cartonIndex: Number(r.carton_index),
    cartonBarcode: r.carton_barcode,
    packingType: r.packing_type,
    totalUnitsInCarton: Number(r.total_units_in_carton),
    grossWeightKg: Number(r.gross_weight_kg),
    netWeightKg: Number(r.net_weight_kg),
    lengthCm: Number(r.length_cm),
    widthCm: Number(r.width_cm),
    heightCm: Number(r.height_cm),
    destinationLabel: r.destination_label || undefined,
    status: r.status,
    packedBy: r.packed_by || undefined,
    items: (r.items || []).map((it: any) => ({
      id: it.id,
      cartonId: it.carton_id,
      size: it.size,
      colorway: it.colorway,
      quantity: Number(it.quantity),
    })),
    createdAt: r.created_at,
  }));
}

export async function getProductionTimelineForJob(productionJobId: string): Promise<ProductionTimelineRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("production_timeline")
    .select("*")
    .eq("production_job_id", productionJobId)
    .order("timestamp", { ascending: true });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    productionJobId: r.production_job_id,
    eventType: r.event_type,
    title: r.title,
    description: r.description,
    actor: r.actor,
    timestamp: r.timestamp,
  }));
}


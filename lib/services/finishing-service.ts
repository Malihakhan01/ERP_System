// lib/services/finishing-service.ts
// FactoryOS PostgreSQL Database Repository for Garment Finishing, Washing & Steam Pressing Module

import {
  getProductionJobByIdFromDB,
  updateProductionJobInDB,
  addProductionTimelineEvent,
} from "./production-service";

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

export type FinishingProcessType =
  | "thread_trimming"
  | "washing"
  | "drying"
  | "garment_dyeing"
  | "softener_treatment"
  | "brushing"
  | "ironing"
  | "steam_press"
  | "folding"
  | "final_finishing";

export type FinishingStatus = "pending" | "in_progress" | "completed" | "on_hold";

export type FinishingDefectCategory =
  | "stain"
  | "uneven_press"
  | "thread_issue"
  | "measurement_issue"
  | "fabric_damage"
  | "washing_issue"
  | "color_shade_issue"
  | "packaging_prep"
  | "other";

export interface FinishingOperationRecord {
  id: string;
  operationNumber: string;
  productionJobId: string;
  bundleId?: string;
  operationType: FinishingProcessType;
  receivedQuantity: number;
  processedQuantity: number;
  passedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  status: FinishingStatus;
  operatorEmployeeId?: string;
  operatorName?: string;
  notes?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinishingInspectionRecord {
  id: string;
  inspectionNumber: string;
  productionJobId: string;
  finishingOperationId?: string;
  bundleId?: string;
  inspectedQuantity: number;
  passedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  defectCategory?: FinishingDefectCategory;
  defectNotes?: string;
  inspectorEmployeeId?: string;
  inspectorName: string;
  remarks?: string;
  createdAt: string;
}

export interface FinishingFloorMetrics {
  jobsAwaitingFinishing: number;
  jobsInFinishing: number;
  piecesReceived: number;
  piecesProcessed: number;
  piecesPassed: number;
  piecesRework: number;
  piecesRejected: number;
  finishingEfficiency: number;
  jobsReadyForQa: number;
}

// -----------------------------------------------------------------------------
// LOCALSTORAGE DUAL-PATH FALLBACK REPOSITORY
// -----------------------------------------------------------------------------
const FINISHING_OPS_STORAGE_KEY = "factoryos_finishing_operations";
const FINISHING_INSPS_STORAGE_KEY = "factoryos_finishing_inspections";

function getLocalFinishingOperations(): FinishingOperationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FINISHING_OPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read local finishing operations:", err);
    return [];
  }
}

function setLocalFinishingOperations(ops: FinishingOperationRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FINISHING_OPS_STORAGE_KEY, JSON.stringify(ops));
  } catch (err) {
    console.error("Failed to save local finishing operations:", err);
  }
}

function getLocalFinishingInspections(): FinishingInspectionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FINISHING_INSPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read local finishing inspections:", err);
    return [];
  }
}

function setLocalFinishingInspections(insps: FinishingInspectionRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FINISHING_INSPS_STORAGE_KEY, JSON.stringify(insps));
  } catch (err) {
    console.error("Failed to save local finishing inspections:", err);
  }
}

// -----------------------------------------------------------------------------
// ROW MAPPERS
// -----------------------------------------------------------------------------
function mapRowToFinishingOp(row: any): FinishingOperationRecord {
  return {
    id: row.id,
    operationNumber: row.operation_number,
    productionJobId: row.production_job_id,
    bundleId: row.bundle_id || undefined,
    operationType: (row.operation_type as FinishingProcessType) || "final_finishing",
    receivedQuantity: Number(row.received_quantity || 0),
    processedQuantity: Number(row.processed_quantity || 0),
    passedQuantity: Number(row.passed_quantity || 0),
    rejectedQuantity: Number(row.rejected_quantity || 0),
    reworkQuantity: Number(row.rework_quantity || 0),
    status: (row.status as FinishingStatus) || "in_progress",
    operatorEmployeeId: row.operator_employee_id || undefined,
    operatorName: row.operator_name || undefined,
    notes: row.notes || undefined,
    startedAt: row.started_at,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOpToRow(op: Partial<FinishingOperationRecord>): any {
  const row: any = {};
  if (op.id) row.id = op.id;
  if (op.operationNumber) row.operation_number = op.operationNumber;
  if (op.productionJobId) row.production_job_id = op.productionJobId;
  if (op.bundleId !== undefined) row.bundle_id = op.bundleId || null;
  if (op.operationType) row.operation_type = op.operationType;
  if (op.receivedQuantity !== undefined) row.received_quantity = op.receivedQuantity;
  if (op.processedQuantity !== undefined) row.processed_quantity = op.processedQuantity;
  if (op.passedQuantity !== undefined) row.passed_quantity = op.passedQuantity;
  if (op.rejectedQuantity !== undefined) row.rejected_quantity = op.rejectedQuantity;
  if (op.reworkQuantity !== undefined) row.rework_quantity = op.reworkQuantity;
  if (op.status) row.status = op.status;
  if (op.operatorEmployeeId !== undefined) row.operator_employee_id = op.operatorEmployeeId || null;
  if (op.operatorName !== undefined) row.operator_name = op.operatorName || null;
  if (op.notes !== undefined) row.notes = op.notes || null;
  if (op.startedAt) row.started_at = op.startedAt;
  if (op.completedAt !== undefined) row.completed_at = op.completedAt || null;
  return row;
}

function mapRowToFinishingInsp(row: any): FinishingInspectionRecord {
  return {
    id: row.id,
    inspectionNumber: row.inspection_number,
    productionJobId: row.production_job_id,
    finishingOperationId: row.finishing_operation_id || undefined,
    bundleId: row.bundle_id || undefined,
    inspectedQuantity: Number(row.inspected_quantity || 0),
    passedQuantity: Number(row.passed_quantity || 0),
    rejectedQuantity: Number(row.rejected_quantity || 0),
    reworkQuantity: Number(row.rework_quantity || 0),
    defectCategory: (row.defect_category as FinishingDefectCategory) || undefined,
    defectNotes: row.defect_notes || undefined,
    inspectorEmployeeId: row.inspector_employee_id || undefined,
    inspectorName: row.inspector_name,
    remarks: row.remarks || undefined,
    createdAt: row.created_at,
  };
}

function mapInspToRow(insp: Partial<FinishingInspectionRecord>): any {
  const row: any = {};
  if (insp.id) row.id = insp.id;
  if (insp.inspectionNumber) row.inspection_number = insp.inspectionNumber;
  if (insp.productionJobId) row.production_job_id = insp.productionJobId;
  if (insp.finishingOperationId !== undefined) row.finishing_operation_id = insp.finishingOperationId || null;
  if (insp.bundleId !== undefined) row.bundle_id = insp.bundleId || null;
  if (insp.inspectedQuantity !== undefined) row.inspected_quantity = insp.inspectedQuantity;
  if (insp.passedQuantity !== undefined) row.passed_quantity = insp.passedQuantity;
  if (insp.rejectedQuantity !== undefined) row.rejected_quantity = insp.rejectedQuantity;
  if (insp.reworkQuantity !== undefined) row.rework_quantity = insp.reworkQuantity;
  if (insp.defectCategory !== undefined) row.defect_category = insp.defectCategory || null;
  if (insp.defectNotes !== undefined) row.defect_notes = insp.defectNotes || null;
  if (insp.inspectorEmployeeId !== undefined) row.inspector_employee_id = insp.inspectorEmployeeId || null;
  if (insp.inspectorName) row.inspector_name = insp.inspectorName;
  if (insp.remarks !== undefined) row.remarks = insp.remarks || null;
  return row;
}

// -----------------------------------------------------------------------------
// REPOSITORY METHODS
// -----------------------------------------------------------------------------

/**
 * Fetch all Finishing Operations from Database PostgreSQL
 */
export async function getFinishingOperationsFromDB(): Promise<FinishingOperationRecord[]> {
  if (!isDatabaseConfigured()) {
    return getLocalFinishingOperations();
  }

  try {
    const database = createClient();
    const { data, error } = await database
      .from("finishing_operations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Database fetch error for finishing_operations, using fallback:", error.message);
      return getLocalFinishingOperations();
    }

    const domain = (data || []).map(mapRowToFinishingOp);
    setLocalFinishingOperations(domain);
    return domain;
  } catch (err) {
    console.error("Failed to query finishing_operations from Database:", err);
    return getLocalFinishingOperations();
  }
}

/**
 * Fetch single Finishing Operation by ID
 */
export async function getFinishingOperationByIdFromDB(id: string): Promise<FinishingOperationRecord | null> {
  const all = await getFinishingOperationsFromDB();
  return all.find((o) => o.id === id) || null;
}

/**
 * Create a new Finishing Operation (Receives stitched quantity into Finishing)
 */
export async function createFinishingOperationInDB(payload: {
  productionJobId: string;
  bundleId?: string;
  operationType: FinishingProcessType;
  receivedQuantity: number;
  operatorEmployeeId?: string;
  operatorName?: string;
  notes?: string;
}): Promise<FinishingOperationRecord> {
  if (payload.receivedQuantity < 0) {
    throw new Error("Received quantity cannot be negative.");
  }

  // Verify parent Production Job & available stitched quantity
  const job = await getProductionJobByIdFromDB(payload.productionJobId);
  if (!job) {
    throw new Error(`Production Job with ID '${payload.productionJobId}' not found.`);
  }

  // Validate job is in stitching or ready for finishing
  const validStages = ["stitching", "cutting_completed", "ready_for_stitching", "finishing"];
  if (!validStages.includes(job.stage) && job.totalStitchedQuantity <= 0) {
    throw new Error(`Job ${job.jobNumber} is at stage '${job.stage}' and cannot be received into finishing.`);
  }

  // Calculate previously received quantity across finishing operations for this job
  const existingOps = await getFinishingForProductionJob(payload.productionJobId);
  const alreadyReceived = existingOps.reduce((sum, op) => sum + op.receivedQuantity, 0);
  const maxAvailable = Math.max(job.totalStitchedQuantity, job.plannedQuantity);

  if (alreadyReceived + payload.receivedQuantity > maxAvailable && maxAvailable > 0) {
    throw new Error(
      `Received quantity (${payload.receivedQuantity}) exceeds available stitched capacity (Available: ${maxAvailable - alreadyReceived} Pcs).`
    );
  }

  const opNumber = `FIN-${Date.now().toString().slice(-6)}`;
  const nowIso = new Date().toISOString();

  const newOp: FinishingOperationRecord = {
    id: `fin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    operationNumber: opNumber,
    productionJobId: payload.productionJobId,
    bundleId: payload.bundleId,
    operationType: payload.operationType,
    receivedQuantity: payload.receivedQuantity,
    processedQuantity: 0,
    passedQuantity: 0,
    rejectedQuantity: 0,
    reworkQuantity: 0,
    status: "in_progress",
    operatorEmployeeId: payload.operatorEmployeeId,
    operatorName: payload.operatorName,
    notes: payload.notes,
    startedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const currentLocal = getLocalFinishingOperations();
  setLocalFinishingOperations([newOp, ...currentLocal]);

  // Update Production Job stage to 'finishing'
  await updateProductionJobInDB(payload.productionJobId, {
    stage: "finishing",
    status: "in_production",
  });

  // Append timeline event
  await addProductionTimelineEvent(
    payload.productionJobId,
    "finishing_received",
    "Received at Finishing Floor",
    `Received ${payload.receivedQuantity} pcs for ${payload.operationType.replace("_", " ").toUpperCase()} by ${payload.operatorName || "Finishing Operator"}.`,
    "Finishing Supervisor"
  );

  if (!isDatabaseConfigured()) {
    return newOp;
  }

  try {
    const database = createClient();
    const row = mapOpToRow(newOp);
    delete row.id;

    const { data, error } = await database
      .from("finishing_operations")
      .insert(row)
      .select()
      .single();

    if (error || !data) {
      console.warn("Database insert error for finishing_operations, saved locally:", error?.message);
      return newOp;
    }

    return mapRowToFinishingOp(data);
  } catch (err) {
    console.error("Failed to insert finishing_operation in Database:", err);
    return newOp;
  }
}

/**
 * Update an existing Finishing Operation
 */
export async function updateFinishingOperationInDB(
  id: string,
  updates: Partial<FinishingOperationRecord>
): Promise<FinishingOperationRecord> {
  const current = getLocalFinishingOperations();
  const index = current.findIndex((o) => o.id === id);
  let updatedRecord: FinishingOperationRecord;

  if (index !== -1) {
    updatedRecord = {
      ...current[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    current[index] = updatedRecord;
    setLocalFinishingOperations(current);
  } else {
    throw new Error(`Finishing operation with ID '${id}' not found.`);
  }

  if (!isDatabaseConfigured()) {
    return updatedRecord;
  }

  try {
    const database = createClient();
    const rowUpdates = mapOpToRow(updates);
    rowUpdates.updated_at = new Date().toISOString();

    const { data, error } = await database
      .from("finishing_operations")
      .update(rowUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.warn("Database update error for finishing_operations:", error?.message);
      return updatedRecord;
    }

    return mapRowToFinishingOp(data);
  } catch (err) {
    console.error("Failed to update finishing_operation in Database:", err);
    return updatedRecord;
  }
}

/**
 * Complete a Finishing Operation and reconcile quantities into QA stage
 */
export async function completeFinishingOperationInDB(payload: {
  operationId: string;
  processedQuantity: number;
  passedQuantity: number;
  rejectedQuantity?: number;
  reworkQuantity?: number;
  notes?: string;
  actor?: string;
}): Promise<FinishingOperationRecord> {
  const op = await getFinishingOperationByIdFromDB(payload.operationId);
  if (!op) {
    throw new Error(`Finishing operation '${payload.operationId}' not found.`);
  }

  if (op.status === "completed") {
    throw new Error(`Finishing operation '${op.operationNumber}' is already completed.`);
  }

  const passed = Math.max(0, payload.passedQuantity);
  const rejected = Math.max(0, payload.rejectedQuantity || 0);
  const rework = Math.max(0, payload.reworkQuantity || 0);
  const processed = Math.max(0, payload.processedQuantity);

  if (passed + rejected + rework > op.receivedQuantity) {
    throw new Error(
      `Total accounted pieces (${passed + rejected + rework}) cannot exceed received batch quantity (${op.receivedQuantity}).`
    );
  }

  const nowIso = new Date().toISOString();
  const updatedOp = await updateFinishingOperationInDB(payload.operationId, {
    processedQuantity: processed,
    passedQuantity: passed,
    rejectedQuantity: rejected,
    reworkQuantity: rework,
    status: "completed",
    completedAt: nowIso,
    notes: payload.notes || op.notes,
  });

  // Reconcile total_finished_quantity in parent Production Job
  const job = await getProductionJobByIdFromDB(op.productionJobId);
  if (job) {
    const newTotalFinished = (job.totalFinishedQuantity || 0) + passed;
    const shouldAdvanceToQa = newTotalFinished >= job.plannedQuantity || passed > 0;

    await updateProductionJobInDB(op.productionJobId, {
      totalFinishedQuantity: newTotalFinished,
      totalRejectedQuantity: (job.totalRejectedQuantity || 0) + rejected,
      totalReworkQuantity: (job.totalReworkQuantity || 0) + rework,
      stage: shouldAdvanceToQa ? "qa" : "finishing",
    });

    // Append timeline event
    await addProductionTimelineEvent(
      op.productionJobId,
      "finishing_completed",
      "Finishing Process Completed",
      `Completed ${op.operationType.replace("_", " ").toUpperCase()}: ${passed} passed, ${rework} rework, ${rejected} rejected. Ready for QA Inspection.`,
      payload.actor || "Finishing Supervisor"
    );
  }

  return updatedOp;
}

/**
 * Record a formal Finishing Inspection & Defect Classification
 */
export async function createFinishingInspectionInDB(payload: {
  productionJobId: string;
  finishingOperationId?: string;
  bundleId?: string;
  inspectedQuantity: number;
  passedQuantity: number;
  rejectedQuantity?: number;
  reworkQuantity?: number;
  defectCategory?: FinishingDefectCategory;
  defectNotes?: string;
  inspectorEmployeeId?: string;
  inspectorName: string;
  remarks?: string;
}): Promise<FinishingInspectionRecord> {
  const inspected = payload.inspectedQuantity;
  const passed = payload.passedQuantity;
  const rejected = payload.rejectedQuantity || 0;
  const rework = payload.reworkQuantity || 0;

  if (inspected <= 0) {
    throw new Error("Inspected quantity must be greater than zero.");
  }

  if (passed < 0 || rejected < 0 || rework < 0) {
    throw new Error("Quantities cannot be negative.");
  }

  if (passed + rejected + rework > inspected) {
    throw new Error(
      `Sum of passed (${passed}), rejected (${rejected}), and rework (${rework}) exceeds inspected quantity (${inspected}).`
    );
  }

  const inspNumber = `FIN-INS-${Date.now().toString().slice(-6)}`;
  const nowIso = new Date().toISOString();

  const newInsp: FinishingInspectionRecord = {
    id: `fin_insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    inspectionNumber: inspNumber,
    productionJobId: payload.productionJobId,
    finishingOperationId: payload.finishingOperationId,
    bundleId: payload.bundleId,
    inspectedQuantity: inspected,
    passedQuantity: passed,
    rejectedQuantity: rejected,
    reworkQuantity: rework,
    defectCategory: payload.defectCategory,
    defectNotes: payload.defectNotes,
    inspectorEmployeeId: payload.inspectorEmployeeId,
    inspectorName: payload.inspectorName,
    remarks: payload.remarks,
    createdAt: nowIso,
  };

  const currentLocal = getLocalFinishingInspections();
  setLocalFinishingInspections([newInsp, ...currentLocal]);

  // Log timeline event
  await addProductionTimelineEvent(
    payload.productionJobId,
    "finishing_inspection",
    "Finishing QA Inspection Logged",
    `Inspected ${inspected} pcs by ${payload.inspectorName}: ${passed} Passed, ${rework} Rework (${payload.defectCategory || "None"}), ${rejected} Rejected.`,
    payload.inspectorName
  );

  if (!isDatabaseConfigured()) {
    return newInsp;
  }

  try {
    const database = createClient();
    const row = mapInspToRow(newInsp);
    delete row.id;

    const { data, error } = await database
      .from("finishing_inspections")
      .insert(row)
      .select()
      .single();

    if (error || !data) {
      console.warn("Database insert error for finishing_inspections, saved locally:", error?.message);
      return newInsp;
    }

    return mapRowToFinishingInsp(data);
  } catch (err) {
    console.error("Failed to insert finishing_inspection in Database:", err);
    return newInsp;
  }
}

/**
 * Fetch all Finishing Inspections from Database PostgreSQL
 */
export async function getFinishingInspectionsFromDB(
  productionJobId?: string
): Promise<FinishingInspectionRecord[]> {
  if (!isDatabaseConfigured()) {
    const local = getLocalFinishingInspections();
    return productionJobId ? local.filter((i) => i.productionJobId === productionJobId) : local;
  }

  try {
    const database = createClient();
    let query = database.from("finishing_inspections").select("*").order("created_at", { ascending: false });
    if (productionJobId) {
      query = query.eq("production_job_id", productionJobId);
    }
    const { data, error } = await query;

    if (error) {
      console.warn("Database fetch error for finishing_inspections:", error.message);
      const local = getLocalFinishingInspections();
      return productionJobId ? local.filter((i) => i.productionJobId === productionJobId) : local;
    }

    const domain = (data || []).map(mapRowToFinishingInsp);
    return domain;
  } catch (err) {
    console.error("Failed to query finishing_inspections from Database:", err);
    const local = getLocalFinishingInspections();
    return productionJobId ? local.filter((i) => i.productionJobId === productionJobId) : local;
  }
}

/**
 * Fetch all finishing operations for a specific production job
 */
export async function getFinishingForProductionJob(jobId: string): Promise<FinishingOperationRecord[]> {
  const all = await getFinishingOperationsFromDB();
  return all.filter((o) => o.productionJobId === jobId);
}

/**
 * Record a finishing rework request with defect traceability
 */
export async function recordFinishingReworkInDB(payload: {
  operationId: string;
  reworkQuantity: number;
  defectCategory: FinishingDefectCategory;
  notes: string;
  inspectorName: string;
}): Promise<FinishingInspectionRecord> {
  const op = await getFinishingOperationByIdFromDB(payload.operationId);
  if (!op) throw new Error("Finishing operation not found.");

  return createFinishingInspectionInDB({
    productionJobId: op.productionJobId,
    finishingOperationId: op.id,
    bundleId: op.bundleId,
    inspectedQuantity: payload.reworkQuantity,
    passedQuantity: 0,
    reworkQuantity: payload.reworkQuantity,
    rejectedQuantity: 0,
    defectCategory: payload.defectCategory,
    defectNotes: payload.notes,
    inspectorName: payload.inspectorName,
    remarks: `Rework routed back to Finishing Floor: ${payload.notes}`,
  });
}

/**
 * Record finishing scrap / rejection
 */
export async function recordFinishingRejectInDB(payload: {
  operationId: string;
  rejectQuantity: number;
  defectCategory: FinishingDefectCategory;
  notes: string;
  inspectorName: string;
}): Promise<FinishingInspectionRecord> {
  const op = await getFinishingOperationByIdFromDB(payload.operationId);
  if (!op) throw new Error("Finishing operation not found.");

  return createFinishingInspectionInDB({
    productionJobId: op.productionJobId,
    finishingOperationId: op.id,
    bundleId: op.bundleId,
    inspectedQuantity: payload.rejectQuantity,
    passedQuantity: 0,
    reworkQuantity: 0,
    rejectedQuantity: payload.rejectQuantity,
    defectCategory: payload.defectCategory,
    defectNotes: payload.notes,
    inspectorName: payload.inspectorName,
    remarks: `Permanent Reject / Scrap: ${payload.notes}`,
  });
}

/**
 * Calculate live Finishing Floor KPIs from Database PostgreSQL
 */
export async function getFinishingMetricsFromDB(): Promise<FinishingFloorMetrics> {
  const [ops, insps] = await Promise.all([
    getFinishingOperationsFromDB(),
    getFinishingInspectionsFromDB(),
  ]);

  if (ops.length === 0 && insps.length === 0) {
    return {
      jobsAwaitingFinishing: 0,
      jobsInFinishing: 0,
      piecesReceived: 0,
      piecesProcessed: 0,
      piecesPassed: 0,
      piecesRework: 0,
      piecesRejected: 0,
      finishingEfficiency: 0,
      jobsReadyForQa: 0,
    };
  }

  const jobsInFinishing = new Set(ops.filter((o) => o.status === "in_progress").map((o) => o.productionJobId)).size;
  const jobsReadyForQa = new Set(ops.filter((o) => o.status === "completed" && o.passedQuantity > 0).map((o) => o.productionJobId)).size;

  const piecesReceived = ops.reduce((sum, o) => sum + o.receivedQuantity, 0);
  const piecesProcessed = ops.reduce((sum, o) => sum + o.processedQuantity, 0);
  const piecesPassed = ops.reduce((sum, o) => sum + o.passedQuantity, 0);
  const piecesRework = ops.reduce((sum, o) => sum + o.reworkQuantity, 0);
  const piecesRejected = ops.reduce((sum, o) => sum + o.rejectedQuantity, 0);

  const finishingEfficiency = piecesReceived > 0 ? Math.min(100, Math.round((piecesPassed / piecesReceived) * 100)) : 0;

  return {
    jobsAwaitingFinishing: 0,
    jobsInFinishing,
    piecesReceived,
    piecesProcessed,
    piecesPassed,
    piecesRework,
    piecesRejected,
    finishingEfficiency,
    jobsReadyForQa,
  };
}

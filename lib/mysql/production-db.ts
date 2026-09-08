/**
 * FactoryOS Garment ERP — Production MySQL 8 Repository
 * Complete MES CRUD against MySQL database.
 */

import { executeQuery, MySQL } from "./db";
import type {
  ProductionJobRecord,
  CuttingPlanRecord,
  CuttingPlanSizeRecord,
  ProductionBundleRecord,
  OperatorProductionLogRecord,
  ProductionMaterialIssueRecord,
  ProductionLineRecord,
} from "@/lib/services/production-service";
import type { FinishingOperationRecord } from "@/lib/services/finishing-service";

export async function getProductionJobsFromMySQL(): Promise<ProductionJobRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `production_jobs` WHERE `is_archived` = 0 ORDER BY `created_at` DESC"
  );

  return rows.map((r) => ({
    id: String(r.id),
    jobNumber: r.job_number,
    orderId: String(r.order_id),
    clientId: String(r.client_id),
    productId: r.product_id ? String(r.product_id) : "",
    orderNumber: r.order_number,
    clientName: r.client_name,
    styleCode: r.style_code,
    styleName: r.style_name,
    plannedQuantity: Number(r.planned_quantity || 0),
    totalCutQuantity: Number(r.total_cut_quantity || 0),
    totalStitchedQuantity: Number(r.total_stitched_quantity || 0),
    totalFinishedQuantity: Number(r.total_finished_quantity || 0),
    totalQaPassedQuantity: Number(r.total_qa_passed_quantity || 0),
    totalPackedQuantity: Number(r.total_packed_quantity || 0),
    totalRejectedQuantity: Number(r.total_rejected_quantity || 0),
    totalReworkQuantity: Number(r.total_rework_quantity || 0),
    targetStartDate: r.target_start_date || "",
    targetEndDate: r.target_end_date || "",
    actualStartDate: r.actual_start_date || undefined,
    actualEndDate: r.actual_end_date || undefined,
    stage: r.stage || "planning",
    status: r.status || "released",
    priority: r.priority || "normal",
    assignedLine: r.assigned_line || "line_1",
    supervisorId: r.supervisor_id ? String(r.supervisor_id) : undefined,
    supervisorName: r.supervisor_name || undefined,
    standardSam: Number(r.standard_sam || 18.5),
    sizeBreakdown: typeof r.size_breakdown === "string" ? JSON.parse(r.size_breakdown) : r.size_breakdown || {},
    colorways: typeof r.colorways === "string" ? JSON.parse(r.colorways) : r.colorways || [],
    specialInstructions: r.special_instructions || undefined,
    isArchived: Boolean(r.is_archived),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createProductionJobInMySQL(data: Partial<ProductionJobRecord>): Promise<string> {
  const maxRows = await executeQuery<any>("SELECT COALESCE(MAX(id), 0) as max_id FROM `production_jobs`");
  const nextNum = (maxRows[0]?.max_id || 0) + 1;
  const jobNumber = data.jobNumber || `PRD-2026-${String(nextNum).padStart(3, "0")}`;

  const insertId = await MySQL.insert("production_jobs", {
    uuid: crypto.randomUUID(),
    job_number: jobNumber,
    order_id: data.orderId,
    client_id: data.clientId,
    product_id: data.productId || null,
    order_number: data.orderNumber,
    client_name: data.clientName,
    style_code: data.styleCode,
    style_name: data.styleName,
    planned_quantity: data.plannedQuantity,
    total_cut_quantity: data.totalCutQuantity || 0,
    total_stitched_quantity: data.totalStitchedQuantity || 0,
    total_finished_quantity: data.totalFinishedQuantity || 0,
    total_qa_passed_quantity: data.totalQaPassedQuantity || 0,
    total_packed_quantity: data.totalPackedQuantity || 0,
    total_rejected_quantity: data.totalRejectedQuantity || 0,
    total_rework_quantity: data.totalReworkQuantity || 0,
    target_start_date: data.targetStartDate,
    target_end_date: data.targetEndDate,
    actual_start_date: data.actualStartDate || null,
    actual_end_date: data.actualEndDate || null,
    stage: data.stage || "planning",
    status: data.status || "released",
    priority: data.priority || "normal",
    assigned_line: data.assignedLine || "line_1",
    supervisor_id: data.supervisorId || null,
    supervisor_name: data.supervisorName || null,
    standard_sam: data.standardSam || 18.5,
    size_breakdown: data.sizeBreakdown || {},
    colorways: data.colorways || [],
    special_instructions: data.specialInstructions || null,
    is_archived: 0,
  });

  return String(insertId);
}

export async function deleteProductionJobInMySQL(id: string): Promise<boolean> {
  return MySQL.delete("production_jobs", id, true);
}

export async function getProductionFloorMetricsFromMySQL() {
  const [activeLinesRows] = await executeQuery<any>(
    "SELECT COUNT(DISTINCT `assigned_line`) as count FROM `production_jobs` WHERE `status` = 'in_production' AND `is_archived` = 0"
  );
  const [stitchingBundlesRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `production_bundles` WHERE `current_stage` = 'stitching' AND `status` IN ('in_progress', 'created')"
  );
  const [pendingBundlesRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `production_bundles` WHERE `status` = 'pending' OR `status` = 'created'"
  );
  const [stitchedTodayRows] = await executeQuery<any>(
    "SELECT COALESCE(SUM(`pieces_completed`), 0) as total FROM `operator_production_logs` WHERE DATE(`work_date`) = CURDATE()"
  );
  const [rejectedTodayRows] = await executeQuery<any>(
    "SELECT COALESCE(SUM(`pieces_rejected`), 0) as total FROM `operator_production_logs` WHERE DATE(`work_date`) = CURDATE()"
  );
  const [activeOpsRows] = await executeQuery<any>(
    "SELECT COUNT(DISTINCT `employee_id`) as count FROM `operator_production_logs` WHERE DATE(`work_date`) = CURDATE()"
  );

  return {
    activeLines: Number(activeLinesRows?.count || 0),
    bundlesInStitching: Number(stitchingBundlesRows?.count || 0),
    bundlesPending: Number(pendingBundlesRows?.count || 0),
    completedPiecesToday: Number(stitchedTodayRows?.total || 0),
    rejectedPiecesToday: Number(rejectedTodayRows?.total || 0),
    activeOperators: Number(activeOpsRows?.count || 0),
  };
}

export async function getProductionLinesFromMySQL(): Promise<ProductionLineRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `production_lines` WHERE `is_active` = 1 ORDER BY `line_code` ASC"
  );
  return rows.map((r) => ({
    id: String(r.id),
    lineCode: r.line_code,
    lineName: r.line_name,
    department: r.department || "Stitching",
    dailyTargetCapacity: Number(r.daily_target_capacity || 600),
    shift: "General",
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
  }));
}

export async function getCuttingPlansForJobFromMySQL(jobId: string): Promise<CuttingPlanRecord[]> {
  const plans = await executeQuery<any>(
    "SELECT * FROM `cutting_plans` WHERE `production_job_id` = ? ORDER BY `created_at` DESC",
    [jobId]
  );

  const result: CuttingPlanRecord[] = [];
  for (const p of plans) {
    const sizes = await executeQuery<any>(
      "SELECT * FROM `cutting_plan_sizes` WHERE `cutting_plan_id` = ?",
      [p.id]
    );

    result.push({
      id: String(p.id),
      planNumber: p.plan_number,
      productionJobId: String(p.production_job_id),
      markerName: p.marker_name,
      markerLengthMeters: Number(p.marker_length_meters || 0),
      markerWidthCm: Number(p.marker_width_cm || 0),
      fabricType: p.fabric_type,
      fabricGsm: p.fabric_gsm,
      colorway: p.colorway || "Standard",
      pliesCount: Number(p.plies_count || 0),
      plannedLays: Number(p.planned_lays || 1),
      markerEfficiencyPct: Number(p.marker_efficiency_pct || 88.5),
      status: p.status,
      notes: p.notes,
      createdAt: p.created_at,
      sizes: sizes.map((s) => ({
        id: String(s.id),
        cuttingPlanId: String(s.cutting_plan_id),
        size: s.size,
        ratio: Number(s.ratio || 1),
        plannedQuantity: Number(s.planned_quantity || 0),
        actualCutQuantity: Number(s.actual_cut_quantity || 0),
        createdAt: s.created_at || new Date().toISOString(),
      })),
    });
  }

  return result;
}

export async function createCuttingPlanInMySQL(data: {
  productionJobId: string;
  markerName: string;
  markerLengthMeters: number;
  markerWidthCm: number;
  fabricType: string;
  fabricGsm: string;
  pliesCount: number;
  markerEfficiencyPct?: number;
  sizes: Array<{ size: string; ratio: number; plannedQuantity: number }>;
}): Promise<string> {
  const [jobRows] = await executeQuery<any>(
    "SELECT `job_number` FROM `production_jobs` WHERE `id` = ? LIMIT 1",
    [data.productionJobId]
  );
  const jobNumber = jobRows?.job_number || "PRD-2026-001";
  const [existingPlans] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `cutting_plans` WHERE `production_job_id` = ?",
    [data.productionJobId]
  );
  const count = Number(existingPlans?.count || 0) + 1;
  const planNumber = `CUT-${jobNumber.replace("PRD-", "")}-${String(count).padStart(2, "0")}`;

  const insertId = await MySQL.insert("cutting_plans", {
    uuid: crypto.randomUUID(),
    plan_number: planNumber,
    production_job_id: data.productionJobId,
    marker_name: data.markerName,
    marker_length_meters: data.markerLengthMeters,
    marker_width_cm: data.markerWidthCm,
    fabric_type: data.fabricType,
    fabric_gsm: data.fabricGsm,
    colorway: "Standard",
    plies_count: data.pliesCount,
    planned_lays: 1,
    marker_efficiency_pct: data.markerEfficiencyPct || 88.5,
    status: "approved",
  });

  for (const s of data.sizes) {
    await MySQL.insert("cutting_plan_sizes", {
      cutting_plan_id: insertId,
      size: s.size,
      ratio: s.ratio,
      planned_quantity: s.plannedQuantity,
      actual_cut_quantity: 0,
    });
  }

  return String(insertId);
}

export async function executeCuttingPlanInMySQL(cuttingPlanId: string, bundlePieces = 25) {
  const [plan] = await executeQuery<any>(
    "SELECT * FROM `cutting_plans` WHERE `id` = ? LIMIT 1",
    [cuttingPlanId]
  );
  if (!plan) throw new Error("Cutting plan not found.");

  const sizes = await executeQuery<any>(
    "SELECT * FROM `cutting_plan_sizes` WHERE `cutting_plan_id` = ?",
    [cuttingPlanId]
  );
  const [job] = await executeQuery<any>(
    "SELECT * FROM `production_jobs` WHERE `id` = ? LIMIT 1",
    [plan.production_job_id]
  );

  let totalCut = 0;
  let bundlesGenerated = 0;
  const [existingBundles] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `production_bundles` WHERE `production_job_id` = ?",
    [plan.production_job_id]
  );
  let bundleIndex = Number(existingBundles?.count || 0) + 1;

  for (const s of sizes) {
    const qty = Number(s.planned_quantity || 0);
    totalCut += qty;
    await executeQuery(
      "UPDATE `cutting_plan_sizes` SET `actual_cut_quantity` = ? WHERE `id` = ?",
      [qty, s.id]
    );

    let remaining = qty;
    while (remaining > 0) {
      const thisBundleQty = Math.min(remaining, bundlePieces);
      const barcode = `BND-${job.job_number.replace("PRD-", "")}-${s.size}-${String(bundleIndex).padStart(3, "0")}`;

      await MySQL.insert("production_bundles", {
        uuid: crypto.randomUUID(),
        bundle_barcode: barcode,
        production_job_id: plan.production_job_id,
        bundle_number: bundleIndex,
        size: s.size,
        colorway: "Standard",
        quantity: thisBundleQty,
        current_stage: "cutting",
        current_line: job.assigned_line || "line_1",
        status: "created",
        passed_pieces: 0,
        rejected_pieces: 0,
        rework_pieces: 0,
      });

      bundleIndex++;
      bundlesGenerated++;
      remaining -= thisBundleQty;
    }
  }

  // Update Production Job and Cutting Plan
  await executeQuery(
    "UPDATE `production_jobs` SET `total_cut_quantity` = `total_cut_quantity` + ?, `stage` = 'cutting', `status` = 'in_production' WHERE `id` = ?",
    [totalCut, plan.production_job_id]
  );
  await executeQuery(
    "UPDATE `cutting_plans` SET `status` = 'completed' WHERE `id` = ?",
    [cuttingPlanId]
  );

  return { totalCut, bundlesGenerated };
}

export async function getBundlesForJobFromMySQL(jobId: string): Promise<ProductionBundleRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `production_bundles` WHERE `production_job_id` = ? ORDER BY `bundle_number` ASC",
    [jobId]
  );

  return rows.map((r) => ({
    id: String(r.id),
    bundleBarcode: r.bundle_barcode,
    productionJobId: String(r.production_job_id),
    bundleNumber: Number(r.bundle_number || 0),
    size: r.size,
    colorway: r.colorway || "Standard",
    quantity: Number(r.quantity || 0),
    currentStage: r.current_stage || "cutting",
    currentLine: r.current_line || "line_1",
    assignedEmployeeId: r.assigned_employee_id ? String(r.assigned_employee_id) : undefined,
    assignedEmployeeName: r.assigned_employee_name || undefined,
    assignedOperation: r.assigned_operation || undefined,
    status: r.status || "created",
    passedPieces: Number(r.passed_pieces || 0),
    rejectedPieces: Number(r.rejected_pieces || 0),
    reworkPieces: Number(r.rework_pieces || 0),
    createdAt: r.created_at,
  }));
}

export async function assignBundleInMySQL(bundleId: string, employeeId: string, operationName: string, lineCode?: string) {
  const [emp] = await executeQuery<any>(
    "SELECT `full_name` FROM `employees` WHERE `id` = ? LIMIT 1",
    [employeeId]
  );
  const empName = emp?.full_name || "Assigned Worker";

  await executeQuery(
    "UPDATE `production_bundles` SET `assigned_employee_id` = ?, `assigned_employee_name` = ?, `assigned_operation` = ?, `current_stage` = 'stitching', `status` = 'in_progress' WHERE `id` = ?",
    [employeeId, empName, operationName, bundleId]
  );

  return true;
}

export async function logOperatorOutputInMySQL(data: {
  productionJobId: string;
  bundleId: string;
  employeeId: string;
  operationName: string;
  piecesCompleted: number;
  piecesRejected: number;
  piecesRework: number;
  ratePerPiece: number;
  workDate: string;
  shift?: string;
}) {
  const [emp] = await executeQuery<any>(
    "SELECT `full_name` FROM `employees` WHERE `id` = ? LIMIT 1",
    [data.employeeId]
  );
  const empName = emp?.full_name || "Operator";
  const totalEarnings = data.piecesCompleted * data.ratePerPiece;
  const payrollMonth = data.workDate.substring(0, 7);

  const insertId = await MySQL.insert("operator_production_logs", {
    uuid: crypto.randomUUID(),
    production_job_id: data.productionJobId,
    bundle_id: data.bundleId,
    employee_id: data.employeeId,
    employee_name: empName,
    operation_name: data.operationName,
    pieces_completed: data.piecesCompleted,
    pieces_rejected: data.piecesRejected || 0,
    pieces_rework: data.piecesRework || 0,
    rate_per_piece: data.ratePerPiece,
    total_earnings: totalEarnings,
    work_date: data.workDate,
    shift: data.shift || "Morning",
    payroll_month: payrollMonth,
  });

  // Update Bundle pieces
  await executeQuery(
    "UPDATE `production_bundles` SET `passed_pieces` = `passed_pieces` + ?, `rejected_pieces` = `rejected_pieces` + ?, `rework_pieces` = `rework_pieces` + ? WHERE `id` = ?",
    [data.piecesCompleted, data.piecesRejected || 0, data.piecesRework || 0, data.bundleId]
  );

  // Update Job Total Stitched
  await executeQuery(
    "UPDATE `production_jobs` SET `total_stitched_quantity` = `total_stitched_quantity` + ?, `total_rejected_quantity` = `total_rejected_quantity` + ?, `total_rework_quantity` = `total_rework_quantity` + ? WHERE `id` = ?",
    [data.piecesCompleted, data.piecesRejected || 0, data.piecesRework || 0, data.productionJobId]
  );

  return String(insertId);
}

export async function getOperatorLogsForJobFromMySQL(jobId: string): Promise<OperatorProductionLogRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `operator_production_logs` WHERE `production_job_id` = ? ORDER BY `work_date` DESC, `created_at` DESC",
    [jobId]
  );

  return rows.map((r) => ({
    id: String(r.id),
    productionJobId: String(r.production_job_id),
    bundleId: String(r.bundle_id),
    employeeId: String(r.employee_id),
    employeeName: r.employee_name,
    operationName: r.operation_name,
    piecesCompleted: Number(r.pieces_completed || 0),
    piecesRejected: Number(r.pieces_rejected || 0),
    piecesRework: Number(r.pieces_rework || 0),
    ratePerPiece: Number(r.rate_per_piece || 0),
    totalEarnings: Number(r.total_earnings || 0),
    workDate: r.work_date,
    shift: r.shift || "Morning",
    payrollMonth: r.payroll_month,
    notes: r.notes,
    createdAt: r.created_at,
  }));
}

export async function getMaterialIssuesForJobFromMySQL(jobId: string): Promise<ProductionMaterialIssueRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `production_material_issues` WHERE `production_job_id` = ? ORDER BY `created_at` DESC",
    [jobId]
  );

  return rows.map((r) => ({
    id: String(r.id),
    issueNumber: r.issue_number,
    productionJobId: String(r.production_job_id),
    inventoryItemId: String(r.inventory_item_id),
    materialName: r.material_name,
    sku: r.sku,
    lotNumber: r.lot_number,
    category: r.category as any,
    fromBay: r.from_bay,
    toStage: r.to_stage as any,
    standardBomQty: Number(r.standard_bom_qty || 0),
    issuedQuantity: Number(r.issued_quantity || 0),
    returnedQuantity: Number(r.returned_quantity || 0),
    netConsumedQty: Number(r.issued_quantity || 0) - Number(r.returned_quantity || 0),
    unit: r.unit,
    unitCost: Number(r.unit_cost || 0),
    totalCost: Number(r.total_cost || 0),
    issuedAt: r.created_at,
  }));
}

export async function getFinishingOperationsForJobFromMySQL(jobId: string): Promise<FinishingOperationRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `finishing_operations` WHERE `production_job_id` = ? ORDER BY `created_at` DESC",
    [jobId]
  );

  return rows.map((r) => ({
    id: String(r.id),
    operationNumber: r.operation_number,
    productionJobId: String(r.production_job_id),
    operationType: r.operation_type,
    receivedQuantity: Number(r.received_quantity || 0),
    processedQuantity: Number(r.processed_quantity || 0),
    passedQuantity: Number(r.passed_quantity || 0),
    rejectedQuantity: Number(r.rejected_quantity || 0),
    reworkQuantity: Number(r.rework_quantity || 0),
    status: r.status,
    operatorId: r.operator_id ? String(r.operator_id) : undefined,
    operatorName: r.operator_name,
    startedAt: r.created_at,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

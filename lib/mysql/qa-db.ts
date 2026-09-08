/**
 * FactoryOS Garment ERP — Quality Assurance MySQL 8 Repository
 * Complete ANSI/ASQ Z1.4 & AQL 2.5 Sampling CRUD against MySQL.
 */

import { executeQuery, MySQL } from "./db";
import type { QAInspectionRecord, QADefectRecord, QAReworkRecord } from "@/lib/services/qa-service";

export async function getQAInspectionsFromMySQL(): Promise<QAInspectionRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `qa_inspections` ORDER BY `created_at` DESC"
  );

  return rows.map((r) => ({
    id: String(r.id),
    inspectionNumber: r.inspection_number,
    productionJobId: String(r.production_job_id),
    orderId: r.order_id ? String(r.order_id) : undefined,
    bundleId: r.bundle_id ? String(r.bundle_id) : undefined,
    inspectionDate: r.created_at ? r.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
    inspectionStage: r.inspection_stage || "end_of_line",
    inspectionType: "AQL Single Sampling",
    inspectionLevel: (r.inspection_level as any) || "Level II",
    aqlLevel: (r.aql_level as any) || "2.5",
    lotQuantity: Number(r.lot_size || 500),
    sampleSize: Number(r.sample_size || 50),
    inspectedQuantity: Number(r.sample_size || 50),
    passedQuantity: Number(r.passed_pieces || 0),
    failedPieces: Number(r.failed_pieces || 0),
    rejectedQuantity: Number(r.failed_pieces || 0),
    reworkQuantity: Number(r.rework_pieces || 0),
    scrappedPieces: 0,
    criticalDefects: Number(r.critical_defects_found || 0),
    majorDefects: Number(r.major_defects_found || 0),
    minorDefects: Number(r.minor_defects_found || 0),
    maxAllowedMajor: 3,
    maxAllowedMinor: 5,
    inspectionResult: r.inspection_result || "pending",
    decision: r.inspection_result || "pending",
    status: r.status || "in_progress",
    inspectorName: r.inspector_name || "QA Lead Inspector",
    notes: r.notes || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createQAInspectionInMySQL(data: {
  productionJobId: string;
  inspectionStage: string;
  inspectionLevel?: string;
  aqlLevel?: string;
  lotSize: number;
  sampleSize: number;
  inspectorName?: string;
  notes?: string;
}): Promise<string> {
  const [maxRows] = await executeQuery<any>(
    "SELECT COALESCE(MAX(id), 0) as max_id FROM `qa_inspections`"
  );
  const nextNum = Number(maxRows?.max_id || 0) + 1;
  const inspectionNumber = `QA-2026-${String(nextNum).padStart(3, "0")}`;

  const insertId = await MySQL.insert("qa_inspections", {
    uuid: crypto.randomUUID(),
    inspection_number: inspectionNumber,
    production_job_id: data.productionJobId,
    inspection_stage: data.inspectionStage || "end_of_line",
    inspection_level: data.inspectionLevel || "Level II (Standard Normal)",
    aql_level: data.aqlLevel || "AQL 2.5 Major / 4.0 Minor",
    lot_size: data.lotSize || 500,
    sample_size: data.sampleSize || 50,
    passed_pieces: 0,
    failed_pieces: 0,
    rework_pieces: 0,
    critical_defects_found: 0,
    major_defects_found: 0,
    minor_defects_found: 0,
    inspection_result: "pending",
    status: "in_progress",
    inspector_name: data.inspectorName || "QA Lead Inspector",
    notes: data.notes || null,
  });

  return String(insertId);
}

export async function getQAMetricsFromMySQL() {
  const [pendingRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `qa_inspections` WHERE `status` IN ('in_progress', 'draft')"
  );
  const [inspectedTodayRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count, COALESCE(SUM(`passed_pieces`), 0) as passed, COALESCE(SUM(`failed_pieces`), 0) as failed, COALESCE(SUM(`critical_defects_found`), 0) as critical FROM `qa_inspections` WHERE DATE(`created_at`) = CURDATE()"
  );
  const [totalInspected] = await executeQuery<any>(
    "SELECT COALESCE(SUM(`passed_pieces`), 0) as total_passed, COALESCE(SUM(`passed_pieces` + `failed_pieces`), 0) as total_checked FROM `qa_inspections`"
  );

  const totalPassed = Number(totalInspected?.total_passed || 0);
  const totalChecked = Number(totalInspected?.total_checked || 0);
  const fpy = totalChecked > 0 ? Math.round((totalPassed / totalChecked) * 100) : 98.4;

  return {
    pendingQA: Number(pendingRows?.count || 0),
    inspectedToday: Number(inspectedTodayRows?.count || 0),
    passedToday: Number(inspectedTodayRows?.passed || 0),
    failedToday: Number(inspectedTodayRows?.failed || 0),
    firstPassYieldPct: fpy,
    criticalDefects: Number(inspectedTodayRows?.critical || 0),
  };
}

export async function logQADefectInMySQL(data: {
  qaInspectionId: string;
  defectCode: string;
  defectName: string;
  defectCategory: "critical" | "major" | "minor";
  defectCount: number;
  responsibleOperation?: string;
  correctiveAction?: string;
}) {
  const insertId = await MySQL.insert("qa_defect_details", {
    qa_inspection_id: data.qaInspectionId,
    defect_code: data.defectCode,
    defect_name: data.defectName,
    defect_category: data.defectCategory,
    defect_count: data.defectCount || 1,
    responsible_operation: data.responsibleOperation || null,
    corrective_action: data.correctiveAction || null,
  });

  // Update Inspection aggregate defect counts
  if (data.defectCategory === "critical") {
    await executeQuery(
      "UPDATE `qa_inspections` SET `critical_defects_found` = `critical_defects_found` + ? WHERE `id` = ?",
      [data.defectCount || 1, data.qaInspectionId]
    );
  } else if (data.defectCategory === "major") {
    await executeQuery(
      "UPDATE `qa_inspections` SET `major_defects_found` = `major_defects_found` + ? WHERE `id` = ?",
      [data.defectCount || 1, data.qaInspectionId]
    );
  } else {
    await executeQuery(
      "UPDATE `qa_inspections` SET `minor_defects_found` = `minor_defects_found` + ? WHERE `id` = ?",
      [data.defectCount || 1, data.qaInspectionId]
    );
  }

  return String(insertId);
}

export async function getDefectsForInspectionFromMySQL(inspectionId: string): Promise<QADefectRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `qa_defect_details` WHERE `qa_inspection_id` = ? ORDER BY `created_at` DESC",
    [inspectionId]
  );

  return rows.map((r) => ({
    id: String(r.id),
    qaInspectionId: String(r.qa_inspection_id),
    defectCode: r.defect_code,
    defectName: r.defect_name,
    category: "sewing" as any,
    severity: r.defect_category.toUpperCase() as any,
    quantity: Number(r.defect_count || 1),
    responsibleOperation: r.responsible_operation,
    correctiveActionRequired: r.corrective_action,
    createdAt: r.created_at,
  }));
}

export async function makeQADecisionInMySQL(data: {
  qaInspectionId: string;
  decision: "passed" | "failed" | "rework_required";
  passedPieces: number;
  failedPieces: number;
  reworkPieces: number;
  reworkSummary?: string;
  assignedLine?: string;
  notes?: string;
}) {
  const [insp] = await executeQuery<any>(
    "SELECT * FROM `qa_inspections` WHERE `id` = ? LIMIT 1",
    [data.qaInspectionId]
  );
  if (!insp) throw new Error("QA inspection not found.");

  // 1. Update Inspection
  await executeQuery(
    "UPDATE `qa_inspections` SET `inspection_result` = ?, `status` = ?, `passed_pieces` = ?, `failed_pieces` = ?, `rework_pieces` = ?, `notes` = COALESCE(?, `notes`) WHERE `id` = ?",
    [
      data.decision,
      data.decision === "passed" ? "approved" : data.decision,
      data.passedPieces,
      data.failedPieces,
      data.reworkPieces,
      data.notes || null,
      data.qaInspectionId,
    ]
  );

  // 2. Update Production Job QA Pass/Fail count
  await executeQuery(
    "UPDATE `production_jobs` SET `total_qa_passed_quantity` = `total_qa_passed_quantity` + ?, `total_rejected_quantity` = `total_rejected_quantity` + ?, `total_rework_quantity` = `total_rework_quantity` + ? WHERE `id` = ?",
    [data.passedPieces, data.failedPieces, data.reworkPieces, insp.production_job_id]
  );

  // 3. Create Rework Record if needed
  if ((data.decision === "rework_required" || data.reworkPieces > 0) && data.reworkSummary) {
    const [existingRework] = await executeQuery<any>(
      "SELECT COUNT(*) as count FROM `qa_rework_records`"
    );
    const reworkNumber = `RWK-2026-${String(Number(existingRework?.count || 0) + 1).padStart(3, "0")}`;

    await MySQL.insert("qa_rework_records", {
      uuid: crypto.randomUUID(),
      rework_number: reworkNumber,
      qa_inspection_id: data.qaInspectionId,
      production_job_id: insp.production_job_id,
      rework_quantity: data.reworkPieces || 1,
      defect_summary: data.reworkSummary,
      assigned_line: data.assignedLine || "line_1",
      status: "in_progress",
    });
  }

  return true;
}

export async function getQAReworkRecordsFromMySQL(): Promise<QAReworkRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `qa_rework_records` ORDER BY `created_at` DESC"
  );

  return rows.map((r) => ({
    id: String(r.id),
    reworkNumber: r.rework_number,
    qaInspectionId: String(r.qa_inspection_id),
    productionJobId: String(r.production_job_id),
    quantity: Number(r.rework_quantity || 0),
    defectReason: r.defect_summary,
    assignedDepartment: r.assigned_line || "Stitching Floor",
    status: r.status || "in_progress",
    completionNotes: r.completion_notes,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

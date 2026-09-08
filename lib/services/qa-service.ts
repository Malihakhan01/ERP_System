// lib/services/qa-service.ts
// FactoryOS PostgreSQL Supabase Repository for Quality Assurance & AQL Inspection Module
// Authoritative ANSI/ASQ Z1.4 & ISO 2859-1 Single Sampling Quality Engine

import {
  getProductionJobsFromSupabase,
  getProductionJobByIdFromSupabase,
  updateProductionJobInSupabase,
  addProductionTimelineEvent,
  ProductionJobRecord,
} from "./production-service";

// Database Mode: Pure MySQL 8 / REST API Architecture (Supabase SDK Removed)
const isSupabaseConfigured = (): boolean => false;
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

export type InspectionStatus =
  | "draft"
  | "in_progress"
  | "passed"
  | "failed"
  | "rework_required"
  | "approved";

export type InspectionResult = "pending" | "passed" | "failed" | "rework_required";

export type DefectSeverity = "CRITICAL" | "MAJOR" | "MINOR";

export type DefectCategory =
  | "sewing"
  | "measurement"
  | "fabric"
  | "stain"
  | "hole"
  | "color_shade"
  | "print_embroidery"
  | "finishing"
  | "label_packaging"
  | "other";

export type InspectionLevel = "Level I" | "Level II" | "Level III" | "S-1" | "S-2" | "S-3" | "S-4";

export type AQLLevel = "1.0" | "1.5" | "2.5" | "4.0" | "6.5";

export interface QADefectRecord {
  id: string;
  qaInspectionId: string;
  defectCode: string;
  defectName: string;
  category: DefectCategory;
  severity: DefectSeverity;
  quantity: number;
  responsibleOperation?: string;
  correctiveActionRequired?: string;
  notes?: string;
  createdAt: string;
}

export interface QAReworkRecord {
  id: string;
  reworkNumber: string;
  qaInspectionId: string;
  productionJobId: string;
  bundleId?: string;
  quantity: number;
  defectReason: string;
  assignedDepartment: string;
  dueDate?: string;
  status: "pending" | "in_progress" | "completed" | "scrapped";
  completionNotes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QAInspectionRecord {
  id: string;
  inspectionNumber: string;
  productionJobId: string;
  orderId?: string;
  clientId?: string;
  bundleId?: string;
  inspectionDate: string;
  inspectionStage: string;
  inspectionType: string;
  inspectionLevel: InspectionLevel;
  aqlLevel: AQLLevel;
  lotQuantity: number;
  sampleSize: number;
  inspectedQuantity: number;
  passedQuantity: number;
  failedPieces: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  scrappedPieces: number;
  criticalDefects: number;
  majorDefects: number;
  minorDefects: number;
  maxAllowedMajor: number;
  maxAllowedMinor: number;
  inspectionResult: InspectionResult;
  status: InspectionStatus;
  decision: string;
  inspectorEmployeeId?: string;
  inspectorName: string;
  notes?: string;
  defects?: QADefectRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface QAQueueItem {
  productionJob: ProductionJobRecord;
  lotQuantity: number;
  finishedQuantity: number;
  suggestedSampleSize: number;
  maxAllowedMajor: number;
  maxAllowedMinor: number;
  existingInspection?: QAInspectionRecord;
}

export interface QAKPIData {
  pendingQA: number;
  inspectedToday: number;
  passedToday: number;
  failedToday: number;
  reworkRequired: number;
  firstPassYield: number;
  criticalDefects: number;
  majorDefects: number;
  minorDefects: number;
  totalInspections: number;
}

// -----------------------------------------------------------------------------
// ANSI/ASQ Z1.4 / ISO 2859-1 SINGLE SAMPLING AQL TABLES (NORMAL INSPECTION)
// -----------------------------------------------------------------------------

interface AQLSampleCode {
  minLot: number;
  maxLot: number;
  codeI: string;
  codeII: string;
  codeIII: string;
}

const LOT_SIZE_CODE_LETTERS: AQLSampleCode[] = [
  { minLot: 2, maxLot: 8, codeI: "A", codeII: "A", codeIII: "B" },
  { minLot: 9, maxLot: 15, codeI: "A", codeII: "B", codeIII: "C" },
  { minLot: 16, maxLot: 25, codeI: "B", codeII: "C", codeIII: "D" },
  { minLot: 26, maxLot: 50, codeI: "C", codeII: "D", codeIII: "E" },
  { minLot: 51, maxLot: 90, codeI: "C", codeII: "E", codeIII: "F" },
  { minLot: 91, maxLot: 150, codeI: "D", codeII: "F", codeIII: "G" },
  { minLot: 151, maxLot: 280, codeI: "E", codeII: "G", codeIII: "H" },
  { minLot: 281, maxLot: 500, codeI: "F", codeII: "H", codeIII: "J" },
  { minLot: 501, maxLot: 1200, codeI: "G", codeII: "J", codeIII: "K" },
  { minLot: 1201, maxLot: 3200, codeI: "H", codeII: "K", codeIII: "L" },
  { minLot: 3201, maxLot: 10000, codeI: "J", codeII: "L", codeIII: "M" },
  { minLot: 10001, maxLot: 35000, codeI: "K", codeII: "M", codeIII: "N" },
  { minLot: 35001, maxLot: 150000, codeI: "L", codeII: "N", codeIII: "P" },
  { minLot: 150001, maxLot: 500000, codeI: "M", codeII: "P", codeIII: "Q" },
  { minLot: 500001, maxLot: Infinity, codeI: "N", codeII: "Q", codeIII: "R" },
];

const CODE_LETTER_SAMPLE_SIZES: Record<string, number> = {
  A: 2,
  B: 3,
  C: 5,
  D: 8,
  E: 13,
  F: 20,
  G: 32,
  H: 50,
  J: 80,
  K: 125,
  L: 200,
  M: 315,
  N: 500,
  P: 800,
  Q: 1250,
  R: 2000,
};

// Accept / Reject limits (Ac, Re) for given sample size and AQL level
// Key: `${sampleSize}_${aql}`
const AQL_LIMITS_MAP: Record<string, { ac: number; re: number }> = {
  "2_1.0": { ac: 0, re: 1 },
  "2_1.5": { ac: 0, re: 1 },
  "2_2.5": { ac: 0, re: 1 },
  "2_4.0": { ac: 0, re: 1 },
  "3_1.0": { ac: 0, re: 1 },
  "3_1.5": { ac: 0, re: 1 },
  "3_2.5": { ac: 0, re: 1 },
  "3_4.0": { ac: 0, re: 1 },
  "5_1.0": { ac: 0, re: 1 },
  "5_1.5": { ac: 0, re: 1 },
  "5_2.5": { ac: 0, re: 1 },
  "5_4.0": { ac: 0, re: 1 },
  "8_1.0": { ac: 0, re: 1 },
  "8_1.5": { ac: 0, re: 1 },
  "8_2.5": { ac: 0, re: 1 },
  "8_4.0": { ac: 1, re: 2 },
  "13_1.0": { ac: 0, re: 1 },
  "13_1.5": { ac: 0, re: 1 },
  "13_2.5": { ac: 1, re: 2 },
  "13_4.0": { ac: 1, re: 2 },
  "20_1.0": { ac: 0, re: 1 },
  "20_1.5": { ac: 1, re: 2 },
  "20_2.5": { ac: 1, re: 2 },
  "20_4.0": { ac: 2, re: 3 },
  "32_1.0": { ac: 1, re: 2 },
  "32_1.5": { ac: 1, re: 2 },
  "32_2.5": { ac: 2, re: 3 },
  "32_4.0": { ac: 3, re: 4 },
  "50_1.0": { ac: 1, re: 2 },
  "50_1.5": { ac: 2, re: 3 },
  "50_2.5": { ac: 3, re: 4 },
  "50_4.0": { ac: 5, re: 6 },
  "80_1.0": { ac: 2, re: 3 },
  "80_1.5": { ac: 3, re: 4 },
  "80_2.5": { ac: 5, re: 6 },
  "80_4.0": { ac: 7, re: 8 },
  "125_1.0": { ac: 3, re: 4 },
  "125_1.5": { ac: 5, re: 6 },
  "125_2.5": { ac: 7, re: 8 },
  "125_4.0": { ac: 10, re: 11 },
  "200_1.0": { ac: 5, re: 6 },
  "200_1.5": { ac: 7, re: 8 },
  "200_2.5": { ac: 10, re: 11 },
  "200_4.0": { ac: 14, re: 15 },
  "315_1.0": { ac: 7, re: 8 },
  "315_1.5": { ac: 10, re: 11 },
  "315_2.5": { ac: 14, re: 15 },
  "315_4.0": { ac: 21, re: 22 },
  "500_1.0": { ac: 10, re: 11 },
  "500_1.5": { ac: 14, re: 15 },
  "500_2.5": { ac: 21, re: 22 },
  "500_4.0": { ac: 21, re: 22 },
};

/**
 * Deterministic AQL Sampling Plan Calculator
 */
export function calculateAQLSamplingPlan(
  lotSize: number,
  inspectionLevel: InspectionLevel = "Level II",
  aqlMajor: AQLLevel = "2.5",
  aqlMinor: AQLLevel = "4.0"
): { sampleSize: number; maxAllowedMajor: number; maxAllowedMinor: number; codeLetter: string } {
  const safeLot = Math.max(1, lotSize);
  const entry = LOT_SIZE_CODE_LETTERS.find((e) => safeLot >= e.minLot && safeLot <= e.maxLot) || LOT_SIZE_CODE_LETTERS[LOT_SIZE_CODE_LETTERS.length - 1];

  let codeLetter = entry.codeII;
  if (inspectionLevel === "Level I") codeLetter = entry.codeI;
  else if (inspectionLevel === "Level III") codeLetter = entry.codeIII;

  const sampleSize = Math.min(safeLot, CODE_LETTER_SAMPLE_SIZES[codeLetter] || 80);

  const majorKey = `${sampleSize}_${aqlMajor}`;
  const minorKey = `${sampleSize}_${aqlMinor}`;

  const maxAllowedMajor = AQL_LIMITS_MAP[majorKey]?.ac ?? Math.max(0, Math.floor(sampleSize * 0.05));
  const maxAllowedMinor = AQL_LIMITS_MAP[minorKey]?.ac ?? Math.max(0, Math.floor(sampleSize * 0.08));

  return {
    sampleSize,
    maxAllowedMajor,
    maxAllowedMinor,
    codeLetter,
  };
}

/**
 * Standard Garment Industry Defect Catalog
 */
export const STANDARD_DEFECT_CATALOG: { code: string; name: string; category: DefectCategory; defaultSeverity: DefectSeverity }[] = [
  { code: "SEW-001", name: "Broken / Skipped Stitch", category: "sewing", defaultSeverity: "MAJOR" },
  { code: "SEW-002", name: "Open Seam / Unraveling", category: "sewing", defaultSeverity: "CRITICAL" },
  { code: "SEW-003", name: "Uneven Hem / Puckering", category: "sewing", defaultSeverity: "MINOR" },
  { code: "SEW-004", name: "Wrong Needle Tension / Looping", category: "sewing", defaultSeverity: "MAJOR" },
  { code: "MEA-001", name: "Chest / Width Out of Spec", category: "measurement", defaultSeverity: "MAJOR" },
  { code: "MEA-002", name: "Body Length Out of Spec", category: "measurement", defaultSeverity: "MAJOR" },
  { code: "MEA-003", name: "Sleeve Length Deviation", category: "measurement", defaultSeverity: "MINOR" },
  { code: "FAB-001", name: "Hole / Tear in Fabric", category: "hole", defaultSeverity: "CRITICAL" },
  { code: "FAB-002", name: "Fabric Snag / Slub / Knot", category: "fabric", defaultSeverity: "MINOR" },
  { code: "STN-001", name: "Machine Oil / Grease Stain", category: "stain", defaultSeverity: "MAJOR" },
  { code: "STN-002", name: "Dust / Dirt Mark (Washable)", category: "stain", defaultSeverity: "MINOR" },
  { code: "COL-001", name: "Shade Variation Between Panels", category: "color_shade", defaultSeverity: "CRITICAL" },
  { code: "PRN-001", name: "Screen Print Smudge / Misalignment", category: "print_embroidery", defaultSeverity: "MAJOR" },
  { code: "FIN-001", name: "Uneven Steam Press / Shine Mark", category: "finishing", defaultSeverity: "MINOR" },
  { code: "FIN-002", name: "Excess Loose Threads Untrimmed", category: "finishing", defaultSeverity: "MINOR" },
  { code: "LBL-001", name: "Wrong Care / Size Label", category: "label_packaging", defaultSeverity: "CRITICAL" },
  { code: "LBL-002", name: "Barcode / Hangtag Mismatch", category: "label_packaging", defaultSeverity: "MAJOR" },
];

// -----------------------------------------------------------------------------
// LOCALSTORAGE DUAL-PATH FALLBACK REPOSITORY
// -----------------------------------------------------------------------------
const QA_INSPECTIONS_STORAGE_KEY = "factoryos_qa_inspections";
const QA_DEFECTS_STORAGE_KEY = "factoryos_qa_defects";
const QA_REWORK_STORAGE_KEY = "factoryos_qa_rework";

function getLocalQAInspections(): QAInspectionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QA_INSPECTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalQAInspections(list: QAInspectionRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QA_INSPECTIONS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Local QA save error:", err);
  }
}

function getLocalQADefects(): QADefectRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QA_DEFECTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalQADefects(list: QADefectRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QA_DEFECTS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Local Defect save error:", err);
  }
}

function getLocalQARework(): QAReworkRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QA_REWORK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalQARework(list: QAReworkRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QA_REWORK_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Local Rework save error:", err);
  }
}

// -----------------------------------------------------------------------------
// ROW MAPPERS
// -----------------------------------------------------------------------------
function mapRowToQAInspection(row: any): QAInspectionRecord {
  return {
    id: row.id,
    inspectionNumber: row.inspection_number,
    productionJobId: row.production_job_id,
    orderId: row.order_id || undefined,
    clientId: row.client_id || undefined,
    bundleId: row.bundle_id || undefined,
    inspectionDate: row.inspection_date || row.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
    inspectionStage: row.inspection_stage || "aql_audit",
    inspectionType: row.inspection_type || "AQL 2.5 Normal",
    inspectionLevel: (row.inspection_level as InspectionLevel) || "Level II",
    aqlLevel: (row.aql_level as AQLLevel) || "2.5",
    lotQuantity: Number(row.lot_quantity || 0),
    sampleSize: Number(row.sample_size || 0),
    inspectedQuantity: Number(row.inspected_quantity || 0),
    passedQuantity: Number(row.passed_quantity || 0),
    failedPieces: Number(row.failed_pieces || 0),
    rejectedQuantity: Number(row.rejected_quantity || 0),
    reworkQuantity: Number(row.rework_quantity || 0),
    scrappedPieces: Number(row.scrapped_pieces || 0),
    criticalDefects: Number(row.critical_defects || 0),
    majorDefects: Number(row.major_defects || 0),
    minorDefects: Number(row.minor_defects || 0),
    maxAllowedMajor: Number(row.max_allowed_major || 0),
    maxAllowedMinor: Number(row.max_allowed_minor || 0),
    inspectionResult: (row.inspection_result as InspectionResult) || "pending",
    status: (row.status as InspectionStatus) || "in_progress",
    decision: row.decision || "pending",
    inspectorEmployeeId: row.inspector_employee_id || undefined,
    inspectorName: row.inspector_name || "QA Inspector",
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQAInspectionToRow(insp: Partial<QAInspectionRecord>): any {
  const row: any = {};
  if (insp.id) row.id = insp.id;
  if (insp.inspectionNumber) row.inspection_number = insp.inspectionNumber;
  if (insp.productionJobId) row.production_job_id = insp.productionJobId;
  if (insp.orderId !== undefined) row.order_id = insp.orderId || null;
  if (insp.clientId !== undefined) row.client_id = insp.clientId || null;
  if (insp.bundleId !== undefined) row.bundle_id = insp.bundleId || null;
  if (insp.inspectionDate) row.inspection_date = insp.inspectionDate;
  if (insp.inspectionStage) row.inspection_stage = insp.inspectionStage;
  if (insp.inspectionType) row.inspection_type = insp.inspectionType;
  if (insp.inspectionLevel) row.inspection_level = insp.inspectionLevel;
  if (insp.aqlLevel) row.aql_level = insp.aqlLevel;
  if (insp.lotQuantity !== undefined) row.lot_quantity = insp.lotQuantity;
  if (insp.sampleSize !== undefined) row.sample_size = insp.sampleSize;
  if (insp.inspectedQuantity !== undefined) row.inspected_quantity = insp.inspectedQuantity;
  if (insp.passedQuantity !== undefined) row.passed_quantity = insp.passedQuantity;
  if (insp.failedPieces !== undefined) row.failed_pieces = insp.failedPieces;
  if (insp.rejectedQuantity !== undefined) row.rejected_quantity = insp.rejectedQuantity;
  if (insp.reworkQuantity !== undefined) row.rework_quantity = insp.reworkQuantity;
  if (insp.scrappedPieces !== undefined) row.scrapped_pieces = insp.scrappedPieces;
  if (insp.criticalDefects !== undefined) row.critical_defects = insp.criticalDefects;
  if (insp.majorDefects !== undefined) row.major_defects = insp.majorDefects;
  if (insp.minorDefects !== undefined) row.minor_defects = insp.minorDefects;
  if (insp.maxAllowedMajor !== undefined) row.max_allowed_major = insp.maxAllowedMajor;
  if (insp.maxAllowedMinor !== undefined) row.max_allowed_minor = insp.maxAllowedMinor;
  if (insp.inspectionResult) row.inspection_result = insp.inspectionResult;
  if (insp.status) row.status = insp.status;
  if (insp.decision) row.decision = insp.decision;
  if (insp.inspectorEmployeeId !== undefined) row.inspector_employee_id = insp.inspectorEmployeeId || null;
  if (insp.inspectorName) row.inspector_name = insp.inspectorName;
  if (insp.notes !== undefined) row.notes = insp.notes || null;
  return row;
}

function mapRowToQADefect(row: any): QADefectRecord {
  return {
    id: row.id,
    qaInspectionId: row.qa_inspection_id,
    defectCode: row.defect_code,
    defectName: row.defect_name,
    category: (row.category as DefectCategory) || "other",
    severity: (row.severity as DefectSeverity) || "MAJOR",
    quantity: Number(row.quantity || 1),
    responsibleOperation: row.responsible_operation || undefined,
    correctiveActionRequired: row.corrective_action_required || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

function mapQADefectToRow(def: Partial<QADefectRecord>): any {
  const row: any = {};
  if (def.id) row.id = def.id;
  if (def.qaInspectionId) row.qa_inspection_id = def.qaInspectionId;
  if (def.defectCode) row.defect_code = def.defectCode;
  if (def.defectName) row.defect_name = def.defectName;
  if (def.category) row.category = def.category;
  if (def.severity) row.severity = def.severity;
  if (def.quantity !== undefined) row.quantity = def.quantity;
  if (def.responsibleOperation !== undefined) row.responsible_operation = def.responsibleOperation || null;
  if (def.correctiveActionRequired !== undefined) row.corrective_action_required = def.correctiveActionRequired || null;
  if (def.notes !== undefined) row.notes = def.notes || null;
  return row;
}

function mapRowToQARework(row: any): QAReworkRecord {
  return {
    id: row.id,
    reworkNumber: row.rework_number,
    qaInspectionId: row.qa_inspection_id,
    productionJobId: row.production_job_id,
    bundleId: row.bundle_id || undefined,
    quantity: Number(row.quantity || 0),
    defectReason: row.defect_reason,
    assignedDepartment: row.assigned_department || "Finishing",
    dueDate: row.due_date || undefined,
    status: row.status || "pending",
    completionNotes: row.completion_notes || undefined,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQAReworkToRow(rwk: Partial<QAReworkRecord>): any {
  const row: any = {};
  if (rwk.id) row.id = rwk.id;
  if (rwk.reworkNumber) row.rework_number = rwk.reworkNumber;
  if (rwk.qaInspectionId) row.qa_inspection_id = rwk.qaInspectionId;
  if (rwk.productionJobId) row.production_job_id = rwk.productionJobId;
  if (rwk.bundleId !== undefined) row.bundle_id = rwk.bundleId || null;
  if (rwk.quantity !== undefined) row.quantity = rwk.quantity;
  if (rwk.defectReason) row.defect_reason = rwk.defectReason;
  if (rwk.assignedDepartment) row.assigned_department = rwk.assignedDepartment;
  if (rwk.dueDate !== undefined) row.due_date = rwk.dueDate || null;
  if (rwk.status) row.status = rwk.status;
  if (rwk.completionNotes !== undefined) row.completion_notes = rwk.completionNotes || null;
  if (rwk.completedAt !== undefined) row.completed_at = rwk.completedAt || null;
  return row;
}

// -----------------------------------------------------------------------------
// REPOSITORY METHODS
// -----------------------------------------------------------------------------

/**
 * Fetch all QA Inspections from Supabase PostgreSQL
 */
export async function getQAInspectionsFromSupabase(): Promise<QAInspectionRecord[]> {
  try {
    const res = await fetch("/api/qa");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      setLocalQAInspections(json.data);
      return json.data;
    }
  } catch (err) {
    console.error("Failed to load QA inspections from MySQL API:", err);
  }

  const list = getLocalQAInspections();
  const defects = getLocalQADefects();
  return list.map((insp) => ({
    ...insp,
    defects: defects.filter((d) => d.qaInspectionId === insp.id),
  }));
}

/**
 * Fetch single QA Inspection by ID
 */
export async function getQAInspectionByIdFromSupabase(id: string): Promise<QAInspectionRecord | null> {
  const all = await getQAInspectionsFromSupabase();
  return all.find((i) => i.id === id) || null;
}

/**
 * Create a new QA Inspection record
 */
export async function createQAInspectionInSupabase(payload: {
  productionJobId: string;
  orderId?: string;
  clientId?: string;
  bundleId?: string;
  inspectionType?: string;
  inspectionLevel?: InspectionLevel;
  aqlLevel?: AQLLevel;
  lotQuantity: number;
  sampleSize?: number;
  inspectorEmployeeId?: string;
  inspectorName: string;
  notes?: string;
}): Promise<QAInspectionRecord> {
  if (payload.lotQuantity < 0) {
    throw new Error("Lot quantity cannot be negative.");
  }

  const job = await getProductionJobByIdFromSupabase(payload.productionJobId);
  if (!job) {
    throw new Error(`Production Job '${payload.productionJobId}' not found.`);
  }

  const inspectionLevel = payload.inspectionLevel || "Level II";
  const aqlLevel = payload.aqlLevel || "2.5";
  const sampling = calculateAQLSamplingPlan(payload.lotQuantity, inspectionLevel, aqlLevel, "4.0");

  const sampleSize = payload.sampleSize || sampling.sampleSize;
  const inspNumber = `QA-2026-${Date.now().toString().slice(-4)}`;
  const nowIso = new Date().toISOString();

  const newInsp: QAInspectionRecord = {
    id: `qa_insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    inspectionNumber: inspNumber,
    productionJobId: payload.productionJobId,
    orderId: payload.orderId || job.orderId,
    clientId: payload.clientId || job.clientId,
    bundleId: payload.bundleId,
    inspectionDate: nowIso.split("T")[0],
    inspectionStage: "aql_audit",
    inspectionType: payload.inspectionType || `AQL ${aqlLevel} Normal`,
    inspectionLevel,
    aqlLevel,
    lotQuantity: payload.lotQuantity,
    sampleSize,
    inspectedQuantity: 0,
    passedQuantity: 0,
    failedPieces: 0,
    rejectedQuantity: 0,
    reworkQuantity: 0,
    scrappedPieces: 0,
    criticalDefects: 0,
    majorDefects: 0,
    minorDefects: 0,
    maxAllowedMajor: sampling.maxAllowedMajor,
    maxAllowedMinor: sampling.maxAllowedMinor,
    inspectionResult: "pending",
    status: "in_progress",
    decision: "pending",
    inspectorEmployeeId: payload.inspectorEmployeeId,
    inspectorName: payload.inspectorName,
    notes: payload.notes,
    defects: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const local = getLocalQAInspections();
  setLocalQAInspections([newInsp, ...local]);

  // Update Production Job stage to 'qa' if currently in finishing
  if (job.stage === "finishing" || job.stage === "stitching") {
    await updateProductionJobInSupabase(payload.productionJobId, { stage: "qa", status: "in_production" });
  }

  // Audit timeline event
  await addProductionTimelineEvent(
    payload.productionJobId,
    "qa_inspection_created",
    "QA AQL Audit Initiated",
    `QA inspection ${newInsp.inspectionNumber} started by ${payload.inspectorName}. Lot: ${payload.lotQuantity}, Sample: ${sampleSize} (AQL ${aqlLevel}).`,
    payload.inspectorName
  );

  try {
    const res = await fetch("/api/qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productionJobId: newInsp.productionJobId,
        inspectionStage: newInsp.inspectionStage,
        inspectionLevel: newInsp.inspectionLevel,
        aqlLevel: newInsp.aqlLevel,
        lotSize: newInsp.lotQuantity,
        sampleSize: newInsp.sampleSize,
        inspectorName: newInsp.inspectorName,
        notes: newInsp.notes,
      }),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      newInsp.id = String(json.data.id);
    }
  } catch (err) {
    console.error("Failed to insert QA inspection via MySQL API:", err);
  }

  return newInsp;
}

/**
 * Add a classified defect to a QA Inspection
 */
export async function addDefectToQAInspectionInSupabase(payload: {
  qaInspectionId: string;
  defectCode: string;
  defectName: string;
  category: DefectCategory;
  severity: DefectSeverity;
  quantity: number;
  responsibleOperation?: string;
  correctiveActionRequired?: string;
  notes?: string;
}): Promise<QADefectRecord> {
  if (payload.quantity <= 0) {
    throw new Error("Defect quantity must be greater than zero.");
  }

  const insp = await getQAInspectionByIdFromSupabase(payload.qaInspectionId);
  if (!insp) {
    throw new Error(`QA Inspection '${payload.qaInspectionId}' not found.`);
  }

  const newDefect: QADefectRecord = {
    id: `def_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    qaInspectionId: payload.qaInspectionId,
    defectCode: payload.defectCode,
    defectName: payload.defectName,
    category: payload.category,
    severity: payload.severity,
    quantity: payload.quantity,
    responsibleOperation: payload.responsibleOperation,
    correctiveActionRequired: payload.correctiveActionRequired,
    notes: payload.notes,
    createdAt: new Date().toISOString(),
  };

  const localDefs = getLocalQADefects();
  setLocalQADefects([newDefect, ...localDefs]);

  // Update inspection defect counters
  let crit = insp.criticalDefects;
  let maj = insp.majorDefects;
  let min = insp.minorDefects;

  if (payload.severity === "CRITICAL") crit += payload.quantity;
  else if (payload.severity === "MAJOR") maj += payload.quantity;
  else min += payload.quantity;

  await updateQAInspectionInSupabase(payload.qaInspectionId, {
    criticalDefects: crit,
    majorDefects: maj,
    minorDefects: min,
  });

  if (!isSupabaseConfigured()) {
    return newDefect;
  }

  try {
    const supabase = createClient();
    const row = mapQADefectToRow(newDefect);
    delete row.id;

    const { data, error } = await supabase.from("qa_defects").insert(row).select().single();
    if (error || !data) {
      console.warn("Supabase defect insert warning:", error?.message);
      return newDefect;
    }

    return mapRowToQADefect(data);
  } catch (err) {
    console.error("Failed to insert defect in Supabase:", err);
    return newDefect;
  }
}

/**
 * Update QA Inspection
 */
export async function updateQAInspectionInSupabase(
  id: string,
  updates: Partial<QAInspectionRecord>
): Promise<QAInspectionRecord> {
  const current = getLocalQAInspections();
  const index = current.findIndex((i) => i.id === id);
  let updatedRecord: QAInspectionRecord;

  if (index !== -1) {
    updatedRecord = {
      ...current[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    current[index] = updatedRecord;
    setLocalQAInspections(current);
  } else {
    throw new Error(`QA inspection '${id}' not found.`);
  }

  if (!isSupabaseConfigured()) {
    return updatedRecord;
  }

  try {
    const supabase = createClient();
    const rowUpdates = mapQAInspectionToRow(updates);
    rowUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("qa_inspections")
      .update(rowUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.warn("Supabase update error for qa_inspections:", error?.message);
      return updatedRecord;
    }

    return mapRowToQAInspection(data);
  } catch (err) {
    console.error("Failed to update qa_inspection in Supabase:", err);
    return updatedRecord;
  }
}

/**
 * Submit & evaluate final QA Inspection AQL decision
 */
export async function submitQAInspectionInSupabase(payload: {
  inspectionId: string;
  inspectedQuantity: number;
  passedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  notes?: string;
  actor?: string;
}): Promise<QAInspectionRecord> {
  const insp = await getQAInspectionByIdFromSupabase(payload.inspectionId);
  if (!insp) {
    throw new Error(`QA Inspection '${payload.inspectionId}' not found.`);
  }

  const inspected = payload.inspectedQuantity;
  const passed = payload.passedQuantity;
  const rejected = payload.rejectedQuantity;
  const rework = payload.reworkQuantity;

  if (inspected <= 0) {
    throw new Error("Inspected sample quantity must be greater than zero.");
  }

  if (passed < 0 || rejected < 0 || rework < 0) {
    throw new Error("Quantities cannot be negative.");
  }

  if (passed + rejected + rework > inspected) {
    throw new Error(
      `Sum of passed (${passed}), rejected (${rejected}), and rework (${rework}) exceeds inspected sample (${inspected}).`
    );
  }

  // Deterministic AQL Rule Engine
  let result: InspectionResult = "passed";
  let decision = "approved";

  if (insp.criticalDefects > 0) {
    result = "failed";
    decision = "rejected";
  } else if (insp.majorDefects > insp.maxAllowedMajor || insp.minorDefects > insp.maxAllowedMinor) {
    if (rework > 0 || insp.majorDefects <= insp.maxAllowedMajor * 2) {
      result = "rework_required";
      decision = "rework_required";
    } else {
      result = "failed";
      decision = "rejected";
    }
  } else if (rejected > 0 && passed === 0) {
    result = "failed";
    decision = "rejected";
  }

  const finalStatus: InspectionStatus = result === "passed" ? "passed" : result === "rework_required" ? "rework_required" : "failed";

  const updatedInsp = await updateQAInspectionInSupabase(payload.inspectionId, {
    inspectedQuantity: inspected,
    passedQuantity: passed,
    rejectedQuantity: rejected,
    reworkQuantity: rework,
    failedPieces: rejected + rework,
    inspectionResult: result,
    status: finalStatus,
    decision,
    notes: payload.notes || insp.notes,
  });

  // If rework required, generate traceable rework record
  if (rework > 0 || result === "rework_required") {
    await createQAReworkRecordInSupabase({
      qaInspectionId: insp.id,
      productionJobId: insp.productionJobId,
      quantity: rework || 1,
      defectReason: `AQL Quality Defect: ${insp.majorDefects} Major, ${insp.minorDefects} Minor. ${payload.notes || ""}`,
      assignedDepartment: "Finishing",
    });
  }

  // Audit timeline event
  await addProductionTimelineEvent(
    insp.productionJobId,
    `qa_inspection_${result}`,
    `QA Inspection Result: ${result.toUpperCase()}`,
    `Audited ${inspected} pcs: ${passed} Passed, ${rework} Rework, ${rejected} Rejected (Critical: ${insp.criticalDefects}, Major: ${insp.majorDefects}/${insp.maxAllowedMajor}, Minor: ${insp.minorDefects}/${insp.maxAllowedMinor}).`,
    payload.actor || insp.inspectorName
  );

  return updatedInsp;
}

/**
 * Approve QA Inspection and advance Production Job to 'packed' stage
 */
export async function approveQAInspectionInSupabase(
  inspectionId: string,
  actor: string = "QA Manager"
): Promise<QAInspectionRecord> {
  const insp = await getQAInspectionByIdFromSupabase(inspectionId);
  if (!insp) throw new Error("QA inspection not found.");

  if (insp.criticalDefects > 0) {
    throw new Error("Cannot approve QA inspection with open Critical defects.");
  }

  const updatedInsp = await updateQAInspectionInSupabase(inspectionId, {
    status: "approved",
    decision: "approved",
    inspectionResult: "passed",
  });

  // Advance parent Production Job to 'packed'
  const job = await getProductionJobByIdFromSupabase(insp.productionJobId);
  if (job) {
    await updateProductionJobInSupabase(insp.productionJobId, {
      stage: "packed",
      status: "in_production",
      totalQaPassedQuantity: (job.totalQaPassedQuantity || 0) + (insp.passedQuantity || job.plannedQuantity),
    });

    // Timeline event
    await addProductionTimelineEvent(
      insp.productionJobId,
      "qa_approved",
      "QA Approval Granted",
      `QA inspection ${insp.inspectionNumber} approved by ${actor}. Stage advanced to PACKING & CARTONING.`,
      actor
    );
  }

  return updatedInsp;
}

/**
 * Fail QA Inspection permanently
 */
export async function failQAInspectionInSupabase(
  inspectionId: string,
  actor: string = "QA Manager",
  reason: string = "Defects exceeded AQL acceptance limits."
): Promise<QAInspectionRecord> {
  const insp = await getQAInspectionByIdFromSupabase(inspectionId);
  if (!insp) throw new Error("QA inspection not found.");

  const updatedInsp = await updateQAInspectionInSupabase(inspectionId, {
    status: "failed",
    decision: "rejected",
    inspectionResult: "failed",
    notes: `${insp.notes ? `${insp.notes} • ` : ""}FAILED: ${reason}`,
  });

  // Hold parent Production Job
  await updateProductionJobInSupabase(insp.productionJobId, {
    status: "on_hold",
  });

  await addProductionTimelineEvent(
    insp.productionJobId,
    "qa_failed",
    "QA Inspection FAILED",
    `QA inspection ${insp.inspectionNumber} marked FAILED by ${actor}: ${reason}`,
    actor
  );

  return updatedInsp;
}

/**
 * Create QA Rework Record
 */
export async function createQAReworkRecordInSupabase(payload: {
  qaInspectionId: string;
  productionJobId: string;
  bundleId?: string;
  quantity: number;
  defectReason: string;
  assignedDepartment?: string;
  dueDate?: string;
}): Promise<QAReworkRecord> {
  const rwkNumber = `RWK-${Date.now().toString().slice(-6)}`;
  const nowIso = new Date().toISOString();

  const newRework: QAReworkRecord = {
    id: `rwk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    reworkNumber: rwkNumber,
    qaInspectionId: payload.qaInspectionId,
    productionJobId: payload.productionJobId,
    bundleId: payload.bundleId,
    quantity: payload.quantity,
    defectReason: payload.defectReason,
    assignedDepartment: payload.assignedDepartment || "Finishing",
    dueDate: payload.dueDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "pending",
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const local = getLocalQARework();
  setLocalQARework([newRework, ...local]);

  if (!isSupabaseConfigured()) {
    return newRework;
  }

  try {
    const supabase = createClient();
    const row = mapQAReworkToRow(newRework);
    delete row.id;

    const { data, error } = await supabase.from("qa_rework_records").insert(row).select().single();
    if (error || !data) {
      console.warn("Supabase rework insert warning:", error?.message);
      return newRework;
    }

    return mapRowToQARework(data);
  } catch (err) {
    console.error("Failed to insert rework in Supabase:", err);
    return newRework;
  }
}

/**
 * Fetch all QA Rework records
 */
export async function getQAReworkRecordsFromSupabase(productionJobId?: string): Promise<QAReworkRecord[]> {
  if (!isSupabaseConfigured()) {
    const local = getLocalQARework();
    return productionJobId ? local.filter((r) => r.productionJobId === productionJobId) : local;
  }

  try {
    const supabase = createClient();
    let query = supabase.from("qa_rework_records").select("*").order("created_at", { ascending: false });
    if (productionJobId) query = query.eq("production_job_id", productionJobId);

    const { data, error } = await query;
    if (error) {
      console.warn("Supabase rework fetch warning:", error.message);
      const local = getLocalQARework();
      return productionJobId ? local.filter((r) => r.productionJobId === productionJobId) : local;
    }

    return (data || []).map(mapRowToQARework);
  } catch (err) {
    console.error("Failed to query qa_rework_records:", err);
    const local = getLocalQARework();
    return productionJobId ? local.filter((r) => r.productionJobId === productionJobId) : local;
  }
}

/**
 * Update QA Rework Record (e.g. Complete rework)
 */
export async function updateQAReworkRecordInSupabase(
  id: string,
  updates: Partial<QAReworkRecord>
): Promise<QAReworkRecord> {
  const current = getLocalQARework();
  const index = current.findIndex((r) => r.id === id);
  let updatedRecord: QAReworkRecord;

  if (index !== -1) {
    updatedRecord = {
      ...current[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    current[index] = updatedRecord;
    setLocalQARework(current);
  } else {
    throw new Error(`QA Rework record '${id}' not found.`);
  }

  if (!isSupabaseConfigured()) {
    return updatedRecord;
  }

  try {
    const supabase = createClient();
    const rowUpdates = mapQAReworkToRow(updates);
    rowUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("qa_rework_records")
      .update(rowUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.warn("Supabase rework update warning:", error?.message);
      return updatedRecord;
    }

    return mapRowToQARework(data);
  } catch (err) {
    console.error("Failed to update qa_rework_records:", err);
    return updatedRecord;
  }
}

/**
 * Fetch QA Queue: active jobs ready for or currently in QA
 */
export async function getQAQueueFromSupabase(): Promise<QAQueueItem[]> {
  const [jobs, inspections] = await Promise.all([
    getProductionJobsFromSupabase(),
    getQAInspectionsFromSupabase(),
  ]);

  const candidateJobs = jobs.filter((j) => !j.isArchived && (j.stage === "qa" || j.stage === "finishing" || j.totalFinishedQuantity > 0));

  return candidateJobs.map((job) => {
    const lotQuantity = Math.max(job.totalFinishedQuantity || job.totalStitchedQuantity || job.plannedQuantity, 1);
    const sampling = calculateAQLSamplingPlan(lotQuantity, "Level II", "2.5", "4.0");
    const existingInspection = inspections.find((i) => i.productionJobId === job.id);

    return {
      productionJob: job,
      lotQuantity,
      finishedQuantity: job.totalFinishedQuantity || job.totalStitchedQuantity,
      suggestedSampleSize: sampling.sampleSize,
      maxAllowedMajor: sampling.maxAllowedMajor,
      maxAllowedMinor: sampling.maxAllowedMinor,
      existingInspection,
    };
  });
}

/**
 * Calculate live QA Floor KPIs strictly from database
 */
export async function getQAKPIsFromSupabase(): Promise<QAKPIData> {
  const [inspections, reworkList] = await Promise.all([
    getQAInspectionsFromSupabase(),
    getQAReworkRecordsFromSupabase(),
  ]);

  if (inspections.length === 0) {
    return {
      pendingQA: 0,
      inspectedToday: 0,
      passedToday: 0,
      failedToday: 0,
      reworkRequired: 0,
      firstPassYield: 0,
      criticalDefects: 0,
      majorDefects: 0,
      minorDefects: 0,
      totalInspections: 0,
    };
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const todayInspections = inspections.filter((i) => i.inspectionDate === todayStr || i.createdAt?.startsWith(todayStr));

  const pendingQA = inspections.filter((i) => i.status === "in_progress" || i.status === "draft").length;
  const passedToday = todayInspections.filter((i) => i.status === "passed" || i.status === "approved").length;
  const failedToday = todayInspections.filter((i) => i.status === "failed").length;
  const reworkRequired = reworkList.filter((r) => r.status === "pending" || r.status === "in_progress").length;

  const totalEvaluated = inspections.filter((i) => i.status !== "draft" && i.status !== "in_progress").length;
  const totalPassed = inspections.filter((i) => i.status === "passed" || i.status === "approved").length;
  const firstPassYield = totalEvaluated > 0 ? Math.min(100, Math.round((totalPassed / totalEvaluated) * 100)) : 0;

  const criticalDefects = inspections.reduce((sum, i) => sum + i.criticalDefects, 0);
  const majorDefects = inspections.reduce((sum, i) => sum + i.majorDefects, 0);
  const minorDefects = inspections.reduce((sum, i) => sum + i.minorDefects, 0);

  return {
    pendingQA,
    inspectedToday: todayInspections.length,
    passedToday,
    failedToday,
    reworkRequired,
    firstPassYield,
    criticalDefects,
    majorDefects,
    minorDefects,
    totalInspections: inspections.length,
  };
}

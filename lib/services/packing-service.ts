// lib/services/packing-service.ts
// FactoryOS PostgreSQL Database Repository for Packing, Cartonization & Packing List Module
// Authoritative Garment Factory Polybagging, Cartonization & Dispatch Staging Engine

import {
  getProductionJobsFromDB,
  getProductionJobByIdFromDB,
  updateProductionJobInDB,
  addProductionTimelineEvent,
  ProductionJobRecord,
} from "./production-service";
import {
  getTrackingRecordsFromDB,
  updateTrackingGateInDB,
  TrackingShipmentRecord,
} from "./tracking-service";

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

export type PackingStatus = "in_progress" | "packed" | "completed" | "dispatch_ready";
export type CartonStatus = "packed" | "inspected" | "staged_for_dispatch" | "dispatched";
export type PackingType = "solid_size" | "ratio_assorted";

export interface SizeBreakdown {
  [size: string]: number;
}

export interface PackingCartonRecord {
  id: string;
  packingRecordId: string;
  cartonNumber: string;
  productionJobId: string;
  orderId?: string;
  clientId?: string;
  cartonIndex: number;
  cartonBarcode: string;
  packingType: PackingType;
  totalUnitsInCarton: number;
  sizeBreakdown: SizeBreakdown;
  grossWeightKg: number;
  netWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  destinationLabel?: string;
  status: CartonStatus;
  packedBy?: string;
  packerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackingRecord {
  id: string;
  packingNumber: string;
  productionJobId: string;
  orderId?: string;
  clientId?: string;
  productId?: string;
  qaApprovedQuantity: number;
  packedQuantity: number;
  pendingQuantity: number;
  totalCartons: number;
  packingStatus: PackingStatus;
  packingDate: string;
  packerEmployeeId?: string;
  packerName?: string;
  packingMethod: string;
  polybagType?: string;
  hangtagVerified: boolean;
  careLabelVerified: boolean;
  barcodeStickerVerified: boolean;
  notes?: string;
  cartons?: PackingCartonRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PackingQueueItem {
  productionJob: ProductionJobRecord;
  qaApprovedQuantity: number;
  alreadyPackedQuantity: number;
  pendingQuantity: number;
  existingPackingRecord?: PackingRecord;
}

export interface PackingKPIData {
  pendingPacking: number;
  packingToday: number;
  packedPieces: number;
  cartonsCreated: number;
  pendingPieces: number;
  packingCompletionPct: number;
  dispatchReady: number;
}

// -----------------------------------------------------------------------------
// LOCALSTORAGE DUAL-PATH FALLBACK REPOSITORY
// -----------------------------------------------------------------------------
const PACKING_RECORDS_STORAGE_KEY = "factoryos_packing_records";
const PACKING_CARTONS_STORAGE_KEY = "factoryos_packing_cartons";

function getLocalPackingRecords(): PackingRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PACKING_RECORDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalPackingRecords(list: PackingRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PACKING_RECORDS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Local Packing save error:", err);
  }
}

function getLocalPackingCartons(): PackingCartonRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PACKING_CARTONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalPackingCartons(list: PackingCartonRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PACKING_CARTONS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Local Carton save error:", err);
  }
}

// -----------------------------------------------------------------------------
// ROW MAPPERS
// -----------------------------------------------------------------------------
function mapRowToPackingRecord(row: any): PackingRecord {
  return {
    id: row.id,
    packingNumber: row.packing_number,
    productionJobId: row.production_job_id,
    orderId: row.order_id || undefined,
    clientId: row.client_id || undefined,
    productId: row.product_id || undefined,
    qaApprovedQuantity: Number(row.qa_approved_quantity || 0),
    packedQuantity: Number(row.packed_quantity || 0),
    pendingQuantity: Number(row.pending_quantity || 0),
    totalCartons: Number(row.total_cartons || 0),
    packingStatus: (row.packing_status as PackingStatus) || "in_progress",
    packingDate: row.packing_date || row.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
    packerEmployeeId: row.packer_employee_id || undefined,
    packerName: row.packer_name || "Packing Operator",
    packingMethod: row.packing_method || "single_polybag_master_carton",
    polybagType: row.polybag_type || undefined,
    hangtagVerified: row.hangtag_verified ?? true,
    careLabelVerified: row.care_label_verified ?? true,
    barcodeStickerVerified: row.barcode_sticker_verified ?? true,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPackingRecordToRow(rec: Partial<PackingRecord>): any {
  const row: any = {};
  if (rec.id) row.id = rec.id;
  if (rec.packingNumber) row.packing_number = rec.packingNumber;
  if (rec.productionJobId) row.production_job_id = rec.productionJobId;
  if (rec.orderId !== undefined) row.order_id = rec.orderId || null;
  if (rec.clientId !== undefined) row.client_id = rec.clientId || null;
  if (rec.productId !== undefined) row.product_id = rec.productId || null;
  if (rec.qaApprovedQuantity !== undefined) row.qa_approved_quantity = rec.qaApprovedQuantity;
  if (rec.packedQuantity !== undefined) row.packed_quantity = rec.packedQuantity;
  if (rec.pendingQuantity !== undefined) row.pending_quantity = rec.pendingQuantity;
  if (rec.totalCartons !== undefined) row.total_cartons = rec.totalCartons;
  if (rec.packingStatus) row.packing_status = rec.packingStatus;
  if (rec.packingDate) row.packing_date = rec.packingDate;
  if (rec.packerEmployeeId !== undefined) row.packer_employee_id = rec.packerEmployeeId || null;
  if (rec.packerName) row.packer_name = rec.packerName;
  if (rec.packingMethod) row.packing_method = rec.packingMethod;
  if (rec.polybagType !== undefined) row.polybag_type = rec.polybagType || null;
  if (rec.hangtagVerified !== undefined) row.hangtag_verified = rec.hangtagVerified;
  if (rec.careLabelVerified !== undefined) row.care_label_verified = rec.careLabelVerified;
  if (rec.barcodeStickerVerified !== undefined) row.barcode_sticker_verified = rec.barcodeStickerVerified;
  if (rec.notes !== undefined) row.notes = rec.notes || null;
  return row;
}

function mapRowToPackingCarton(row: any): PackingCartonRecord {
  return {
    id: row.id,
    packingRecordId: row.packing_record_id,
    cartonNumber: row.carton_number,
    productionJobId: row.production_job_id,
    orderId: row.order_id || undefined,
    clientId: row.client_id || undefined,
    cartonIndex: Number(row.carton_index || 1),
    cartonBarcode: row.carton_barcode,
    packingType: (row.packing_type as PackingType) || "solid_size",
    totalUnitsInCarton: Number(row.total_units_in_carton || 0),
    sizeBreakdown: row.size_breakdown || {},
    grossWeightKg: Number(row.gross_weight_kg || 0),
    netWeightKg: Number(row.net_weight_kg || 0),
    lengthCm: Number(row.length_cm || 60),
    widthCm: Number(row.width_cm || 40),
    heightCm: Number(row.height_cm || 35),
    destinationLabel: row.destination_label || undefined,
    status: (row.status as CartonStatus) || "packed",
    packedBy: row.packed_by || undefined,
    packerName: row.packer_name || "Packing Operator",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPackingCartonToRow(ctn: Partial<PackingCartonRecord>): any {
  const row: any = {};
  if (ctn.id) row.id = ctn.id;
  if (ctn.packingRecordId) row.packing_record_id = ctn.packingRecordId;
  if (ctn.cartonNumber) row.carton_number = ctn.cartonNumber;
  if (ctn.productionJobId) row.production_job_id = ctn.productionJobId;
  if (ctn.orderId !== undefined) row.order_id = ctn.orderId || null;
  if (ctn.clientId !== undefined) row.client_id = ctn.clientId || null;
  if (ctn.cartonIndex !== undefined) row.carton_index = ctn.cartonIndex;
  if (ctn.cartonBarcode) row.carton_barcode = ctn.cartonBarcode;
  if (ctn.packingType) row.packing_type = ctn.packingType;
  if (ctn.totalUnitsInCarton !== undefined) row.total_units_in_carton = ctn.totalUnitsInCarton;
  if (ctn.sizeBreakdown) row.size_breakdown = ctn.sizeBreakdown;
  if (ctn.grossWeightKg !== undefined) row.gross_weight_kg = ctn.grossWeightKg;
  if (ctn.netWeightKg !== undefined) row.net_weight_kg = ctn.netWeightKg;
  if (ctn.lengthCm !== undefined) row.length_cm = ctn.lengthCm;
  if (ctn.widthCm !== undefined) row.width_cm = ctn.widthCm;
  if (ctn.heightCm !== undefined) row.height_cm = ctn.heightCm;
  if (ctn.destinationLabel !== undefined) row.destination_label = ctn.destinationLabel || null;
  if (ctn.status) row.status = ctn.status;
  if (ctn.packedBy !== undefined) row.packed_by = ctn.packedBy || null;
  if (ctn.packerName) row.packer_name = ctn.packerName;
  return row;
}

// -----------------------------------------------------------------------------
// REPOSITORY METHODS
// -----------------------------------------------------------------------------

/**
 * Fetch all Packing Records from Database PostgreSQL
 */
export async function getPackingRecordsFromDB(): Promise<PackingRecord[]> {
  if (!isDatabaseConfigured()) {
    const list = getLocalPackingRecords();
    const cartons = getLocalPackingCartons();
    return list.map((rec) => ({
      ...rec,
      cartons: cartons.filter((c) => c.packingRecordId === rec.id),
    }));
  }

  try {
    const database = createClient();
    const { data, error } = await database
      .from("packing_records")
      .select("*, cartons:packing_cartons(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Database fetch error for packing_records, using fallback:", error.message);
      return getLocalPackingRecords();
    }

    const domain = (data || []).map((r: any) => {
      const mapped = mapRowToPackingRecord(r);
      mapped.cartons = (r.cartons || []).map(mapRowToPackingCarton);
      return mapped;
    });

    setLocalPackingRecords(domain);
    return domain;
  } catch (err) {
    console.error("Failed to query packing_records from Database:", err);
    return getLocalPackingRecords();
  }
}

/**
 * Fetch single Packing Record by ID
 */
export async function getPackingRecordByIdFromDB(id: string): Promise<PackingRecord | null> {
  const all = await getPackingRecordsFromDB();
  return all.find((p) => p.id === id) || null;
}

/**
 * Fetch Packing Record for a specific production job
 */
export async function getPackingRecordForJobFromDB(productionJobId: string): Promise<PackingRecord | null> {
  const all = await getPackingRecordsFromDB();
  return all.find((p) => p.productionJobId === productionJobId) || null;
}

/**
 * Create a new Packing Record for a QA-approved Production Job
 */
export async function createPackingRecordInDB(payload: {
  productionJobId: string;
  orderId?: string;
  clientId?: string;
  productId?: string;
  qaApprovedQuantity: number;
  packingMethod?: string;
  polybagType?: string;
  packerEmployeeId?: string;
  packerName: string;
  notes?: string;
}): Promise<PackingRecord> {
  if (payload.qaApprovedQuantity <= 0) {
    throw new Error("QA approved quantity must be greater than zero to initialize packing.");
  }

  const job = await getProductionJobByIdFromDB(payload.productionJobId);
  if (!job) {
    throw new Error(`Production Job '${payload.productionJobId}' not found.`);
  }

  // Verify eligibility: Job must have passed QA or be in stage qa/finishing
  const isEligible = job.stage === "packed" || job.stage === "qa" || job.totalQaPassedQuantity > 0 || job.totalFinishedQuantity > 0;
  if (!isEligible) {
    throw new Error(`Job ${job.jobNumber} is not ready for packing. QA inspection must be completed first.`);
  }

  const packingNumber = `PCK-2026-${Date.now().toString().slice(-4)}`;
  const nowIso = new Date().toISOString();

  const newRecord: PackingRecord = {
    id: `pck_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    packingNumber,
    productionJobId: payload.productionJobId,
    orderId: payload.orderId || job.orderId,
    clientId: payload.clientId || job.clientId,
    productId: payload.productId || job.productId,
    qaApprovedQuantity: payload.qaApprovedQuantity,
    packedQuantity: 0,
    pendingQuantity: payload.qaApprovedQuantity,
    totalCartons: 0,
    packingStatus: "in_progress",
    packingDate: nowIso.split("T")[0],
    packerEmployeeId: payload.packerEmployeeId,
    packerName: payload.packerName || "Packing Lead",
    packingMethod: payload.packingMethod || "single_polybag_master_carton",
    polybagType: payload.polybagType || "Recycled LDPE Polybag with Warning",
    hangtagVerified: true,
    careLabelVerified: true,
    barcodeStickerVerified: true,
    notes: payload.notes,
    cartons: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const local = getLocalPackingRecords();
  setLocalPackingRecords([newRecord, ...local]);

  // Update Tracking Gate 7 to Active / In Progress
  const trackingShipments = await getTrackingRecordsFromDB();
  const matchedTracking = trackingShipments.find(
    (t: TrackingShipmentRecord) => t.productionJobId === payload.productionJobId || (payload.orderId && t.orderId === payload.orderId)
  );
  if (matchedTracking && matchedTracking.currentGate < 7) {
    await updateTrackingGateInDB(
      matchedTracking.id,
      7,
      "packed",
      `Gate 7 Initiated: Packing job ${packingNumber} created. Polybagging and carton packing active.`,
      payload.packerName || "Packing Supervisor"
    );
  }

  // Audit timeline event
  await addProductionTimelineEvent(
    payload.productionJobId,
    "packing_initiated",
    "Packing & Polybagging Initiated",
    `Packing session ${packingNumber} started by ${payload.packerName}. QA Approved Lot: ${payload.qaApprovedQuantity} Pcs.`,
    payload.packerName
  );

  if (!isDatabaseConfigured()) {
    return newRecord;
  }

  try {
    const database = createClient();
    const row = mapPackingRecordToRow(newRecord);
    delete row.id;

    const { data, error } = await database.from("packing_records").insert(row).select().single();
    if (error || !data) {
      console.warn("Database packing_records insert error, using local:", error?.message);
      return newRecord;
    }

    return mapRowToPackingRecord(data);
  } catch (err) {
    console.error("Failed to insert packing_record in Database:", err);
    return newRecord;
  }
}

/**
 * Update Packing Record
 */
export async function updatePackingRecordInDB(
  id: string,
  updates: Partial<PackingRecord>
): Promise<PackingRecord> {
  const current = getLocalPackingRecords();
  const index = current.findIndex((p) => p.id === id);
  let updatedRecord: PackingRecord;

  if (index !== -1) {
    updatedRecord = {
      ...current[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    current[index] = updatedRecord;
    setLocalPackingRecords(current);
  } else {
    throw new Error(`Packing record '${id}' not found.`);
  }

  if (!isDatabaseConfigured()) {
    return updatedRecord;
  }

  try {
    const database = createClient();
    const rowUpdates = mapPackingRecordToRow(updates);
    rowUpdates.updated_at = new Date().toISOString();

    const { data, error } = await database
      .from("packing_records")
      .update(rowUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.warn("Database update error for packing_records:", error?.message);
      return updatedRecord;
    }

    return mapRowToPackingRecord(data);
  } catch (err) {
    console.error("Failed to update packing_record in Database:", err);
    return updatedRecord;
  }
}

/**
 * Create and register a new master carton with size breakdown
 */
export async function createPackingCartonInDB(payload: {
  packingRecordId: string;
  productionJobId: string;
  orderId?: string;
  clientId?: string;
  packingType?: PackingType;
  totalUnitsInCarton: number;
  sizeBreakdown: SizeBreakdown;
  grossWeightKg?: number;
  netWeightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  destinationLabel?: string;
  packedBy?: string;
  packerName?: string;
}): Promise<PackingCartonRecord> {
  if (payload.totalUnitsInCarton <= 0) {
    throw new Error("Carton cannot be empty. Total units in carton must be greater than zero.");
  }

  // Validate size breakdown sum
  const breakdownSum = Object.values(payload.sizeBreakdown || {}).reduce((sum, qty) => sum + Number(qty || 0), 0);
  if (breakdownSum > 0 && breakdownSum !== payload.totalUnitsInCarton) {
    throw new Error(
      `Size breakdown total (${breakdownSum}) does not match total units in carton (${payload.totalUnitsInCarton}).`
    );
  }

  const packingRec = await getPackingRecordByIdFromDB(payload.packingRecordId);
  if (!packingRec) {
    throw new Error(`Packing record '${payload.packingRecordId}' not found.`);
  }

  // Over-packing guard: new packed total cannot exceed QA approved quantity
  const newPackedTotal = packingRec.packedQuantity + payload.totalUnitsInCarton;
  if (newPackedTotal > packingRec.qaApprovedQuantity) {
    throw new Error(
      `Over-packing error: Adding ${payload.totalUnitsInCarton} pcs would result in ${newPackedTotal} packed pcs, which exceeds QA approved quantity (${packingRec.qaApprovedQuantity}).`
    );
  }

  const cartonIndex = packingRec.totalCartons + 1;
  const cartonNumber = `CTN-2026-${Date.now().toString().slice(-4)}-${String(cartonIndex).padStart(3, "0")}`;
  const cartonBarcode = `BAR-CTN-${Date.now().toString().slice(-6)}-${String(cartonIndex).padStart(3, "0")}`;
  const nowIso = new Date().toISOString();

  const newCarton: PackingCartonRecord = {
    id: `ctn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    packingRecordId: payload.packingRecordId,
    cartonNumber,
    productionJobId: payload.productionJobId,
    orderId: payload.orderId || packingRec.orderId,
    clientId: payload.clientId || packingRec.clientId,
    cartonIndex,
    cartonBarcode,
    packingType: payload.packingType || "solid_size",
    totalUnitsInCarton: payload.totalUnitsInCarton,
    sizeBreakdown: payload.sizeBreakdown || {},
    grossWeightKg: payload.grossWeightKg || parseFloat((payload.totalUnitsInCarton * 0.28 + 1.2).toFixed(2)),
    netWeightKg: payload.netWeightKg || parseFloat((payload.totalUnitsInCarton * 0.25).toFixed(2)),
    lengthCm: payload.lengthCm || 60,
    widthCm: payload.widthCm || 40,
    heightCm: payload.heightCm || 35,
    destinationLabel: payload.destinationLabel || "Standard Export Warehouse Bay",
    status: "packed",
    packedBy: payload.packedBy,
    packerName: payload.packerName || packingRec.packerName || "Packing Operator",
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const localCartons = getLocalPackingCartons();
  setLocalPackingCartons([newCarton, ...localCartons]);

  // Update parent packing record totals
  await updatePackingRecordInDB(payload.packingRecordId, {
    packedQuantity: newPackedTotal,
    pendingQuantity: Math.max(0, packingRec.qaApprovedQuantity - newPackedTotal),
    totalCartons: cartonIndex,
    packingStatus: newPackedTotal >= packingRec.qaApprovedQuantity ? "packed" : "in_progress",
  });

  // Timeline audit event
  await addProductionTimelineEvent(
    payload.productionJobId,
    "carton_created",
    `Master Carton Created (${newCarton.cartonNumber})`,
    `Carton #${cartonIndex} packed with ${newCarton.totalUnitsInCarton} pcs. Barcode: ${newCarton.cartonBarcode}. Gross Wt: ${newCarton.grossWeightKg} kg.`,
    newCarton.packerName
  );

  try {
    const res = await fetch("/api/packing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productionJobId: newCarton.productionJobId,
        cartonIndex: newCarton.cartonIndex,
        packingType: newCarton.packingType,
        totalUnits: newCarton.totalUnitsInCarton,
        grossWeight: newCarton.grossWeightKg,
        netWeight: newCarton.netWeightKg,
        length: newCarton.lengthCm,
        width: newCarton.widthCm,
        height: newCarton.heightCm,
        status: newCarton.status,
        packedBy: newCarton.packerName,
      }),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      newCarton.id = String(json.data.id);
    }
  } catch (err) {
    console.error("Failed to insert carton via MySQL API:", err);
  }

  return newCarton;
}

/**
 * Complete packing session and advance stage to dispatch-ready
 */
export async function completePackingInDB(
  packingRecordId: string,
  actor: string = "Packing Supervisor"
): Promise<PackingRecord> {
  const packingRec = await getPackingRecordByIdFromDB(packingRecordId);
  if (!packingRec) {
    throw new Error(`Packing record '${packingRecordId}' not found.`);
  }

  if (packingRec.packedQuantity <= 0) {
    throw new Error("Cannot complete packing: Zero cartons or pieces packed.");
  }

  const updatedRec = await updatePackingRecordInDB(packingRecordId, {
    packingStatus: "completed",
    pendingQuantity: 0,
  });

  // Advance Production Job stage
  const job = await getProductionJobByIdFromDB(packingRec.productionJobId);
  if (job) {
    await updateProductionJobInDB(packingRec.productionJobId, {
      stage: "packed",
      status: "in_production",
    });
  }

  // Update Tracking Gate 7 to Completed & Gate 8 (Dispatch Ready)
  const trackingShipments = await getTrackingRecordsFromDB();
  const matchedTracking = trackingShipments.find(
    (t: TrackingShipmentRecord) => t.productionJobId === packingRec.productionJobId || (packingRec.orderId && t.orderId === packingRec.orderId)
  );
  if (matchedTracking) {
    await updateTrackingGateInDB(
      matchedTracking.id,
      7,
      "packed",
      `Gate 7 Completed: All ${packingRec.totalCartons} master cartons sealed and verified (${packingRec.packedQuantity} Pcs). Ready for Dispatch.`,
      actor
    );
  }

  // Audit timeline event
  await addProductionTimelineEvent(
    packingRec.productionJobId,
    "packing_completed",
    "Packing & Cartonization Completed",
    `Packing session ${packingRec.packingNumber} finalized by ${actor}. Total: ${packingRec.totalCartons} Cartons, ${packingRec.packedQuantity} Pcs. Ready for Dispatch.`,
    actor
  );

  return updatedRec;
}

/**
 * Fetch master cartons for a packing record or job
 */
export async function getPackingCartonsFromDB(
  packingRecordId?: string,
  productionJobId?: string
): Promise<PackingCartonRecord[]> {
  if (!isDatabaseConfigured()) {
    let local = getLocalPackingCartons();
    if (packingRecordId) local = local.filter((c) => c.packingRecordId === packingRecordId);
    if (productionJobId) local = local.filter((c) => c.productionJobId === productionJobId);
    return local;
  }

  try {
    const database = createClient();
    let query = database.from("packing_cartons").select("*").order("carton_index", { ascending: true });
    if (packingRecordId) query = query.eq("packing_record_id", packingRecordId);
    if (productionJobId) query = query.eq("production_job_id", productionJobId);

    const { data, error } = await query;
    if (error) {
      console.warn("Database carton fetch error, using local:", error.message);
      let local = getLocalPackingCartons();
      if (packingRecordId) local = local.filter((c) => c.packingRecordId === packingRecordId);
      if (productionJobId) local = local.filter((c) => c.productionJobId === productionJobId);
      return local;
    }

    return (data || []).map(mapRowToPackingCarton);
  } catch (err) {
    console.error("Failed to query packing_cartons:", err);
    let local = getLocalPackingCartons();
    if (packingRecordId) local = local.filter((c) => c.packingRecordId === packingRecordId);
    if (productionJobId) local = local.filter((c) => c.productionJobId === productionJobId);
    return local;
  }
}

/**
 * Barcode resolver: resolves a carton barcode back to its full hierarchy
 */
export async function resolveCartonBarcode(barcode: string): Promise<{
  carton: PackingCartonRecord;
  packingRecord?: PackingRecord;
  productionJob?: ProductionJobRecord;
} | null> {
  const allCartons = await getPackingCartonsFromDB();
  const carton = allCartons.find((c) => c.cartonBarcode === barcode || c.cartonNumber === barcode);
  if (!carton) return null;

  const packingRecord = await getPackingRecordByIdFromDB(carton.packingRecordId);
  const productionJob = await getProductionJobByIdFromDB(carton.productionJobId);

  return {
    carton,
    packingRecord: packingRecord || undefined,
    productionJob: productionJob || undefined,
  };
}

/**
 * Fetch Packing Queue: jobs ready for packing (QA passed or in stage qa/packed)
 */
export async function getPackingQueueFromDB(): Promise<PackingQueueItem[]> {
  const [jobs, packingRecords] = await Promise.all([
    getProductionJobsFromDB(),
    getPackingRecordsFromDB(),
  ]);

  const candidateJobs = jobs.filter(
    (j) => !j.isArchived && (j.stage === "packed" || j.stage === "qa" || j.totalQaPassedQuantity > 0 || j.totalFinishedQuantity > 0)
  );

  return candidateJobs.map((job) => {
    const qaApproved = Math.max(job.totalQaPassedQuantity || job.totalFinishedQuantity || job.plannedQuantity, 1);
    const existingRec = packingRecords.find((p) => p.productionJobId === job.id);
    const alreadyPacked = existingRec ? existingRec.packedQuantity : 0;

    return {
      productionJob: job,
      qaApprovedQuantity: qaApproved,
      alreadyPackedQuantity: alreadyPacked,
      pendingQuantity: Math.max(0, qaApproved - alreadyPacked),
      existingPackingRecord: existingRec,
    };
  });
}

/**
 * Calculate live Packing Floor KPIs strictly from database
 */
export async function getPackingKPIsFromDB(): Promise<PackingKPIData> {
  const [records, cartons, queue] = await Promise.all([
    getPackingRecordsFromDB(),
    getPackingCartonsFromDB(),
    getPackingQueueFromDB(),
  ]);

  if (records.length === 0 && cartons.length === 0) {
    return {
      pendingPacking: queue.length,
      packingToday: 0,
      packedPieces: 0,
      cartonsCreated: 0,
      pendingPieces: 0,
      packingCompletionPct: 0,
      dispatchReady: 0,
    };
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const todayCartons = cartons.filter((c) => c.createdAt?.startsWith(todayStr));

  const totalPacked = cartons.reduce((sum, c) => sum + c.totalUnitsInCarton, 0);
  const totalApproved = records.reduce((sum, r) => sum + r.qaApprovedQuantity, 0);
  const pendingPieces = Math.max(0, totalApproved - totalPacked);
  const completionPct = totalApproved > 0 ? Math.min(100, Math.round((totalPacked / totalApproved) * 100)) : 0;
  const dispatchReady = records.filter((r) => r.packingStatus === "completed" || r.packingStatus === "dispatch_ready").length;

  return {
    pendingPacking: queue.filter((q) => q.pendingQuantity > 0).length,
    packingToday: todayCartons.length,
    packedPieces: totalPacked,
    cartonsCreated: cartons.length,
    pendingPieces,
    packingCompletionPct: completionPct,
    dispatchReady,
  };
}

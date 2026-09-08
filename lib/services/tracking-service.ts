// lib/services/tracking-service.ts
// FactoryOS PostgreSQL Supabase Repository for Logistics & Production Tracking Module

import { ProductionTimelineRecord, addProductionTimelineEvent } from "./production-service";

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

export type MilestoneGate = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type TrackingStatus =
  | "in_production"
  | "quality_audit"
  | "packed"
  | "dispatched"
  | "in_transit"
  | "delivered"
  | "delayed"
  | "archived";

export type ExceptionType =
  | "production_delay"
  | "fabric_shortage"
  | "qa_hold"
  | "rework_required"
  | "packing_delay"
  | "dispatch_delay"
  | "shipment_delay"
  | "customs_hold";

export interface TrackingException {
  id: string;
  type: ExceptionType;
  affectedGate: MilestoneGate;
  reason: string;
  reportedAt: string;
  reportedBy: string;
  status: "open" | "resolved";
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface TrackingShipmentRecord {
  id: string;
  trackingNumber: string;
  orderId: string;
  orderNumber: string;
  productionJobId?: string;
  productionJobNumber?: string;
  clientId?: string;
  clientName: string;
  styleCode?: string;
  styleName?: string;
  carrier: string;
  carrierTrackingRef?: string;
  origin: string;
  destination: string;
  currentGate: MilestoneGate;
  status: TrackingStatus;
  batchQuantity: number;
  cartonCount: number;
  estimatedDelivery: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  carrierPayload?: Record<string, any>;
  exceptions: TrackingException[];
  notes?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BundleTrackingResolution {
  bundleId: string;
  barcode: string;
  bundleNumber: number;
  size: string;
  colorway: string;
  quantity: number;
  passedPieces: number;
  rejectedPieces: number;
  reworkPieces: number;
  currentStage: string;
  currentLine: string;
  status: string;
  assignedEmployeeName?: string;
  assignedOperation?: string;
  productionJobId: string;
  jobNumber?: string;
  orderNumber?: string;
  clientName?: string;
  styleCode?: string;
}

// -----------------------------------------------------------------------------
// EXTERNAL CARRIER ADAPTER ABSTRACTION (UNCONFIGURED PLACEHOLDER FOR FUTURE PLUGINS)
// -----------------------------------------------------------------------------
export interface CarrierTrackingAdapter {
  providerName: string;
  isConfigured: boolean;
  trackShipment(carrierRef: string): Promise<{
    externalStatus: string;
    normalizedGate: MilestoneGate;
    location?: string;
    estimatedDelivery?: string;
    events: Array<{ timestamp: string; location: string; description: string }>;
  }>;
}

export const unconfiguredCarrierAdapter: CarrierTrackingAdapter = {
  providerName: "Unconfigured Generic Carrier Adapter",
  isConfigured: false,
  async trackShipment(_carrierRef: string) {
    throw new Error("External Carrier API is not currently configured in FactoryOS.");
  },
};

// -----------------------------------------------------------------------------
// DETERMINISTIC GATE MAPPING
// -----------------------------------------------------------------------------
export function mapStageToMilestoneGate(stage: string): MilestoneGate {
  const norm = (stage || "").toLowerCase().trim();
  switch (norm) {
    case "planning":
      return 1;
    case "fabric_sourced":
    case "fabric_inspection":
      return 2;
    case "cutting":
    case "cutting_completed":
      return 3;
    case "stitching":
    case "sewing":
      return 4;
    case "finishing":
    case "washing":
    case "pressing":
      return 5;
    case "qa":
    case "quality_audit":
    case "inspection":
      return 6;
    case "packed":
    case "packing":
      return 7;
    case "dispatched":
    case "in_transit":
      return 8;
    case "delivered":
    case "completed":
      return 9;
    default:
      return 1;
  }
}

export function mapMilestoneGateToStage(gate: MilestoneGate): string {
  switch (gate) {
    case 1:
      return "planning";
    case 2:
      return "planning";
    case 3:
      return "cutting";
    case 4:
      return "stitching";
    case 5:
      return "finishing";
    case 6:
      return "qa";
    case 7:
      return "packed";
    case 8:
      return "dispatched";
    case 9:
      return "completed";
    default:
      return "planning";
  }
}

// -----------------------------------------------------------------------------
// LOCALSTORAGE DUAL-PATH FALLBACK REPOSITORY
// -----------------------------------------------------------------------------
const TRACKING_STORAGE_KEY = "factoryos_tracking_shipments";

function getLocalTrackingRecords(): TrackingShipmentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRACKING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read local tracking records:", err);
    return [];
  }
}

function setLocalTrackingRecords(records: TrackingShipmentRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error("Failed to save local tracking records:", err);
  }
}

// -----------------------------------------------------------------------------
// SUPABASE REPOSITORY METHODS
// -----------------------------------------------------------------------------

function mapRowToTrackingRecord(row: any): TrackingShipmentRecord {
  return {
    id: row.id,
    trackingNumber: row.tracking_number,
    orderId: row.order_id,
    orderNumber: row.order_number,
    productionJobId: row.production_job_id || undefined,
    productionJobNumber: row.production_job_number || undefined,
    clientId: row.client_id || undefined,
    clientName: row.client_name,
    styleCode: row.style_code || undefined,
    styleName: row.style_name || undefined,
    carrier: row.carrier || "Factory Fleet (Domestic Trucking)",
    carrierTrackingRef: row.carrier_tracking_ref || undefined,
    origin: row.origin || "Factory Sialkot — Export Terminal",
    destination: row.destination,
    currentGate: (row.current_gate as MilestoneGate) || 1,
    status: (row.status as TrackingStatus) || "in_production",
    batchQuantity: row.batch_quantity || 0,
    cartonCount: row.carton_count || 0,
    estimatedDelivery: row.estimated_delivery,
    dispatchedAt: row.dispatched_at || undefined,
    deliveredAt: row.delivered_at || undefined,
    carrierPayload: row.carrier_payload || {},
    exceptions: Array.isArray(row.exceptions) ? row.exceptions : [],
    notes: row.notes || undefined,
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecordToRow(record: Partial<TrackingShipmentRecord>): any {
  const row: any = {};
  if (record.id) row.id = record.id;
  if (record.trackingNumber) row.tracking_number = record.trackingNumber;
  if (record.orderId) row.order_id = record.orderId;
  if (record.orderNumber) row.order_number = record.orderNumber;
  if (record.productionJobId !== undefined) row.production_job_id = record.productionJobId || null;
  if (record.productionJobNumber !== undefined) row.production_job_number = record.productionJobNumber || null;
  if (record.clientId !== undefined) row.client_id = record.clientId || null;
  if (record.clientName) row.client_name = record.clientName;
  if (record.carrier) row.carrier = record.carrier;
  if (record.carrierTrackingRef !== undefined) row.carrier_tracking_ref = record.carrierTrackingRef || null;
  if (record.origin) row.origin = record.origin;
  if (record.destination) row.destination = record.destination;
  if (record.currentGate !== undefined) row.current_gate = record.currentGate;
  if (record.status) row.status = record.status;
  if (record.batchQuantity !== undefined) row.batch_quantity = record.batchQuantity;
  if (record.cartonCount !== undefined) row.carton_count = record.cartonCount;
  if (record.estimatedDelivery) row.estimated_delivery = record.estimatedDelivery;
  if (record.dispatchedAt !== undefined) row.dispatched_at = record.dispatchedAt || null;
  if (record.deliveredAt !== undefined) row.delivered_at = record.deliveredAt || null;
  if (record.carrierPayload !== undefined) row.carrier_payload = record.carrierPayload;
  if (record.exceptions !== undefined) row.exceptions = record.exceptions;
  if (record.notes !== undefined) row.notes = record.notes || null;
  if (record.isArchived !== undefined) row.is_archived = record.isArchived;
  return row;
}

/**
 * Fetch all active tracking records from Supabase PostgreSQL
 */
export async function getTrackingRecordsFromSupabase(): Promise<TrackingShipmentRecord[]> {
  if (!isSupabaseConfigured()) {
    return getLocalTrackingRecords().filter((r) => !r.isArchived);
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tracking_shipments")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetch error for tracking_shipments, using fallback:", error.message);
      return getLocalTrackingRecords().filter((r) => !r.isArchived);
    }

    const domain = (data || []).map(mapRowToTrackingRecord);
    setLocalTrackingRecords(domain);
    return domain;
  } catch (err) {
    console.error("Failed to query tracking_shipments from Supabase:", err);
    return getLocalTrackingRecords().filter((r) => !r.isArchived);
  }
}

/**
 * Fetch single tracking record by ID
 */
export async function getTrackingRecordByIdFromSupabase(id: string): Promise<TrackingShipmentRecord | null> {
  const records = await getTrackingRecordsFromSupabase();
  return records.find((r) => r.id === id) || null;
}

/**
 * Create a new Tracking Shipment in Supabase
 */
export async function createTrackingRecordInSupabase(
  payload: Omit<TrackingShipmentRecord, "id" | "createdAt" | "updatedAt">
): Promise<TrackingShipmentRecord> {
  // Validate unique tracking number
  const current = await getTrackingRecordsFromSupabase();
  if (current.some((r) => r.trackingNumber.toUpperCase() === payload.trackingNumber.trim().toUpperCase())) {
    throw new Error(`Tracking Number '${payload.trackingNumber}' already exists.`);
  }

  const newRecord: TrackingShipmentRecord = {
    ...payload,
    id: `trk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedLocal = [newRecord, ...current];
  setLocalTrackingRecords(updatedLocal);

  if (!isSupabaseConfigured()) {
    return newRecord;
  }

  try {
    const supabase = createClient();
    const row = mapRecordToRow(newRecord);
    delete row.id; // Allow PostgreSQL UUID generation

    const { data, error } = await supabase
      .from("tracking_shipments")
      .insert(row)
      .select()
      .single();

    if (error || !data) {
      console.warn("Supabase insert error for tracking_shipments, saved locally:", error?.message);
      return newRecord;
    }

    const created = mapRowToTrackingRecord(data);

    // If linked to production job, append creation event to production_timeline
    if (created.productionJobId) {
      await addProductionTimelineEvent(
        created.productionJobId,
        "tracking_shipment_created",
        "Shipment Tracking Released",
        `Shipment ${created.trackingNumber} initiated via ${created.carrier} to ${created.destination}.`,
        "Logistics Dispatcher"
      );
    }

    return created;
  } catch (err) {
    console.error("Failed to insert tracking_shipment in Supabase:", err);
    return newRecord;
  }
}

/**
 * Update an existing tracking record in Supabase
 */
export async function updateTrackingRecordInSupabase(
  id: string,
  updates: Partial<TrackingShipmentRecord>
): Promise<TrackingShipmentRecord> {
  const current = getLocalTrackingRecords();
  const index = current.findIndex((r) => r.id === id);
  let updatedRecord: TrackingShipmentRecord;

  if (index !== -1) {
    updatedRecord = {
      ...current[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    current[index] = updatedRecord;
    setLocalTrackingRecords(current);
  } else {
    throw new Error(`Tracking record with ID '${id}' not found.`);
  }

  if (!isSupabaseConfigured()) {
    return updatedRecord;
  }

  try {
    const supabase = createClient();
    const rowUpdates = mapRecordToRow(updates);
    rowUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("tracking_shipments")
      .update(rowUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.warn("Supabase update error for tracking_shipments:", error?.message);
      return updatedRecord;
    }

    return mapRowToTrackingRecord(data);
  } catch (err) {
    console.error("Failed to update tracking_shipment in Supabase:", err);
    return updatedRecord;
  }
}

/**
 * Advance or update milestone gate for a shipment with auditable timeline logging
 */
export async function updateTrackingGateInSupabase(
  id: string,
  targetGate: MilestoneGate,
  status: TrackingStatus,
  notes?: string,
  actor: string = "Floor Supervisor"
): Promise<TrackingShipmentRecord> {
  const current = await getTrackingRecordByIdFromSupabase(id);
  if (!current) throw new Error("Tracking record not found.");

  const updates: Partial<TrackingShipmentRecord> = {
    currentGate: targetGate,
    status,
    notes: notes || current.notes,
  };

  if (targetGate === 8 && !current.dispatchedAt) {
    updates.dispatchedAt = new Date().toISOString();
  }
  if (targetGate === 9 && !current.deliveredAt) {
    updates.deliveredAt = new Date().toISOString();
  }

  const updated = await updateTrackingRecordInSupabase(id, updates);

  // If production job is linked, record timeline event in Supabase
  if (updated.productionJobId) {
    await addProductionTimelineEvent(
      updated.productionJobId,
      `milestone_gate_${targetGate}`,
      `Milestone Gate ${targetGate} Updated`,
      `Shipment ${updated.trackingNumber} advanced to Gate ${targetGate} (${status.toUpperCase()}). ${notes || ""}`,
      actor
    );
  }

  return updated;
}

/**
 * Soft-delete / archive a tracking record in Supabase
 */
export async function archiveTrackingRecordInSupabase(id: string): Promise<boolean> {
  await updateTrackingRecordInSupabase(id, { isArchived: true });
  return true;
}

/**
 * Hard delete a tracking record from Supabase
 */
export async function deleteTrackingRecordInSupabase(id: string): Promise<boolean> {
  const current = getLocalTrackingRecords().filter((r) => r.id !== id);
  setLocalTrackingRecords(current);

  if (!isSupabaseConfigured()) return true;

  try {
    const supabase = createClient();
    const { error } = await supabase.from("tracking_shipments").delete().eq("id", id);
    if (error) console.warn("Supabase delete error:", error.message);
    return true;
  } catch (err) {
    console.error("Failed to delete tracking shipment in Supabase:", err);
    return false;
  }
}

/**
 * Get tracking records for a specific Production Job
 */
export async function getTrackingForProductionJob(jobId: string): Promise<TrackingShipmentRecord[]> {
  const records = await getTrackingRecordsFromSupabase();
  return records.filter((r) => r.productionJobId === jobId);
}

/**
 * Get tracking records for a specific Sales Order
 */
export async function getTrackingForOrder(orderId: string): Promise<TrackingShipmentRecord[]> {
  const records = await getTrackingRecordsFromSupabase();
  return records.filter((r) => r.orderId === orderId);
}

/**
 * Get unified production timeline from PostgreSQL
 */
export async function getTrackingTimelineFromSupabase(productionJobId: string): Promise<ProductionTimelineRecord[]> {
  if (!productionJobId) return [];
  try {
    if (!isSupabaseConfigured()) {
      return [];
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("production_timeline")
      .select("*")
      .eq("production_job_id", productionJobId)
      .order("timestamp", { ascending: false });

    if (error) {
      console.warn("Supabase timeline fetch error:", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      productionJobId: row.production_job_id,
      eventType: row.event_type,
      title: row.title,
      description: row.description,
      actor: row.actor,
      timestamp: row.timestamp,
    }));
  } catch (err) {
    console.error("Failed to fetch production timeline:", err);
    return [];
  }
}

/**
 * Resolve Cut Bundle barcode directly from Supabase with parent Job and Order metadata
 */
export async function resolveBundleBarcode(barcode: string): Promise<BundleTrackingResolution | null> {
  const cleanBarcode = (barcode || "").trim().toUpperCase();
  if (!cleanBarcode) return null;

  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = createClient();
    const { data: bundleData, error: bundleError } = await supabase
      .from("production_bundles")
      .select("*")
      .ilike("bundle_barcode", cleanBarcode)
      .single();

    if (bundleError || !bundleData) {
      return null;
    }

    // Resolve parent Job metadata
    let jobNumber: string | undefined;
    let orderNumber: string | undefined;
    let clientName: string | undefined;
    let styleCode: string | undefined;

    if (bundleData.production_job_id) {
      const { data: jobData } = await supabase
        .from("production_jobs")
        .select("job_number, order_number, client_name, style_code")
        .eq("id", bundleData.production_job_id)
        .single();

      if (jobData) {
        jobNumber = jobData.job_number;
        orderNumber = jobData.order_number;
        clientName = jobData.client_name;
        styleCode = jobData.style_code;
      }
    }

    return {
      bundleId: bundleData.id,
      barcode: bundleData.bundle_barcode,
      bundleNumber: bundleData.bundle_number,
      size: bundleData.size,
      colorway: bundleData.colorway,
      quantity: bundleData.quantity,
      passedPieces: bundleData.passed_pieces || 0,
      rejectedPieces: bundleData.rejected_pieces || 0,
      reworkPieces: bundleData.rework_pieces || 0,
      currentStage: bundleData.current_stage,
      currentLine: bundleData.current_line,
      status: bundleData.status,
      assignedEmployeeName: bundleData.assigned_employee_name || undefined,
      assignedOperation: bundleData.assigned_operation || undefined,
      productionJobId: bundleData.production_job_id,
      jobNumber,
      orderNumber,
      clientName,
      styleCode,
    };
  } catch (err) {
    console.error("Failed to resolve bundle barcode:", err);
    return null;
  }
}

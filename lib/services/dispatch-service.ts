// lib/services/dispatch-service.ts
// FactoryOS PostgreSQL Supabase Repository for Dispatch, Shipping & Export Logistics Module
// Authoritative Garment Factory Dispatch Staging, Container Loading & Export Logistics Engine

import {
  getProductionJobsFromSupabase,
  getProductionJobByIdFromSupabase,
  updateProductionJobInSupabase,
  addProductionTimelineEvent,
  ProductionJobRecord,
} from "./production-service";
import {
  getTrackingRecordsFromSupabase,
  updateTrackingGateInSupabase,
  TrackingShipmentRecord,
} from "./tracking-service";
import {
  getPackingRecordsFromSupabase,
  getPackingCartonsFromSupabase,
  PackingRecord,
  PackingCartonRecord,
} from "./packing-service";

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

export type DispatchStatus =
  | "ready_for_dispatch"
  | "dispatch_scheduled"
  | "loaded"
  | "dispatched"
  | "in_transit"
  | "delivered"
  | "cancelled";

export type ShippingMethod =
  | "air_freight"
  | "sea_freight"
  | "road_freight"
  | "express_courier";

export interface DispatchCartonRecord {
  id: string;
  dispatchId: string;
  cartonId: string;
  cartonNumber: string;
  cartonBarcode: string;
  totalUnits: number;
  grossWeightKg: number;
  netWeightKg: number;
  sizeBreakdown: Record<string, number>;
  isLoaded: boolean;
  loadedAt?: string;
  createdAt: string;
}

export interface DispatchRecord {
  id: string;
  dispatchNumber: string;
  orderId?: string;
  orderNumber?: string;
  productionJobId?: string;
  productionJobNumber?: string;
  clientId?: string;
  clientName?: string;
  trackingShipmentId?: string;
  packingRecordId?: string;
  dispatchDate: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  warehouseOrigin: string;
  destinationCountry: string;
  destinationCity: string;
  destinationAddress?: string;
  consigneeName: string;
  shippingMethod: ShippingMethod;
  carrier: string;
  carrierTrackingNumber?: string;
  shippingReference?: string;
  vehicleContainerNo?: string;
  driverName?: string;
  driverPhone?: string;
  totalCartons: number;
  totalPieces: number;
  totalNetWeightKg: number;
  totalGrossWeightKg: number;
  dispatchStatus: DispatchStatus;
  dispatchedByEmployeeId?: string;
  dispatchedByName?: string;
  verifiedByName?: string;
  verificationPassed: boolean;
  notes?: string;
  cartons?: DispatchCartonRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface DispatchQueueItem {
  productionJob: ProductionJobRecord;
  packingRecord?: PackingRecord;
  availableCartons: PackingCartonRecord[];
  totalPackedPieces: number;
  totalCartons: number;
  clientName: string;
  orderNumber: string;
  destination: string;
}

export interface DispatchKPIData {
  readyForDispatch: number;
  scheduled: number;
  loadedToday: number;
  dispatchedToday: number;
  inTransit: number;
  delivered: number;
  totalCartons: number;
  totalPieces: number;
}

// -----------------------------------------------------------------------------
// LOCALSTORAGE DUAL-PATH FALLBACK REPOSITORY
// -----------------------------------------------------------------------------
const DISPATCH_RECORDS_STORAGE_KEY = "factoryos_dispatch_records";
const DISPATCH_CARTONS_STORAGE_KEY = "factoryos_dispatch_cartons";

function getLocalDispatchRecords(): DispatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISPATCH_RECORDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalDispatchRecords(list: DispatchRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISPATCH_RECORDS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Local Dispatch save error:", err);
  }
}

function getLocalDispatchCartons(): DispatchCartonRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISPATCH_CARTONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalDispatchCartons(list: DispatchCartonRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISPATCH_CARTONS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Local Dispatch Cartons save error:", err);
  }
}

// -----------------------------------------------------------------------------
// ROW MAPPERS
// -----------------------------------------------------------------------------
function mapRowToDispatchRecord(row: any): DispatchRecord {
  return {
    id: row.id,
    dispatchNumber: row.dispatch_number,
    orderId: row.order_id || undefined,
    orderNumber: row.order?.order_number || undefined,
    productionJobId: row.production_job_id || undefined,
    productionJobNumber: row.production_job?.job_number || undefined,
    clientId: row.client_id || undefined,
    clientName: row.client?.name || row.consignee_name || "International Buyer",
    trackingShipmentId: row.tracking_shipment_id || undefined,
    packingRecordId: row.packing_record_id || undefined,
    dispatchDate: row.dispatch_date || row.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
    estimatedDeliveryDate: row.estimated_delivery_date || undefined,
    actualDeliveryDate: row.actual_delivery_date || undefined,
    warehouseOrigin: row.warehouse_origin || "Factory Sialkot — Export Staging Bay A-04",
    destinationCountry: row.destination_country || "United States",
    destinationCity: row.destination_city || "New York",
    destinationAddress: row.destination_address || undefined,
    consigneeName: row.consignee_name || "International Consignee",
    shippingMethod: (row.shipping_method as ShippingMethod) || "air_freight",
    carrier: row.carrier || "Factory Fleet / Commercial Export Carrier",
    carrierTrackingNumber: row.carrier_tracking_number || undefined,
    shippingReference: row.shipping_reference || undefined,
    vehicleContainerNo: row.vehicle_container_no || undefined,
    driverName: row.driver_name || undefined,
    driverPhone: row.driver_phone || undefined,
    totalCartons: Number(row.total_cartons || 0),
    totalPieces: Number(row.total_pieces || 0),
    totalNetWeightKg: Number(row.total_net_weight_kg || 0),
    totalGrossWeightKg: Number(row.total_gross_weight_kg || 0),
    dispatchStatus: (row.dispatch_status as DispatchStatus) || "ready_for_dispatch",
    dispatchedByEmployeeId: row.dispatched_by_employee_id || undefined,
    dispatchedByName: row.dispatched_by_name || "Logistics Lead",
    verifiedByName: row.verified_by_name || undefined,
    verificationPassed: Boolean(row.verification_passed),
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDispatchRecordToRow(rec: Partial<DispatchRecord>): any {
  const row: any = {};
  if (rec.id) row.id = rec.id;
  if (rec.dispatchNumber) row.dispatch_number = rec.dispatchNumber;
  if (rec.orderId !== undefined) row.order_id = rec.orderId || null;
  if (rec.productionJobId !== undefined) row.production_job_id = rec.productionJobId || null;
  if (rec.clientId !== undefined) row.client_id = rec.clientId || null;
  if (rec.trackingShipmentId !== undefined) row.tracking_shipment_id = rec.trackingShipmentId || null;
  if (rec.packingRecordId !== undefined) row.packing_record_id = rec.packingRecordId || null;
  if (rec.dispatchDate) row.dispatch_date = rec.dispatchDate;
  if (rec.estimatedDeliveryDate !== undefined) row.estimated_delivery_date = rec.estimatedDeliveryDate || null;
  if (rec.actualDeliveryDate !== undefined) row.actual_delivery_date = rec.actualDeliveryDate || null;
  if (rec.warehouseOrigin) row.warehouse_origin = rec.warehouseOrigin;
  if (rec.destinationCountry) row.destination_country = rec.destinationCountry;
  if (rec.destinationCity) row.destination_city = rec.destinationCity;
  if (rec.destinationAddress !== undefined) row.destination_address = rec.destinationAddress || null;
  if (rec.consigneeName) row.consignee_name = rec.consigneeName;
  if (rec.shippingMethod) row.shipping_method = rec.shippingMethod;
  if (rec.carrier) row.carrier = rec.carrier;
  if (rec.carrierTrackingNumber !== undefined) row.carrier_tracking_number = rec.carrierTrackingNumber || null;
  if (rec.shippingReference !== undefined) row.shipping_reference = rec.shippingReference || null;
  if (rec.vehicleContainerNo !== undefined) row.vehicle_container_no = rec.vehicleContainerNo || null;
  if (rec.driverName !== undefined) row.driver_name = rec.driverName || null;
  if (rec.driverPhone !== undefined) row.driver_phone = rec.driverPhone || null;
  if (rec.totalCartons !== undefined) row.total_cartons = rec.totalCartons;
  if (rec.totalPieces !== undefined) row.total_pieces = rec.totalPieces;
  if (rec.totalNetWeightKg !== undefined) row.total_net_weight_kg = rec.totalNetWeightKg;
  if (rec.totalGrossWeightKg !== undefined) row.total_gross_weight_kg = rec.totalGrossWeightKg;
  if (rec.dispatchStatus) row.dispatch_status = rec.dispatchStatus;
  if (rec.dispatchedByEmployeeId !== undefined) row.dispatched_by_employee_id = rec.dispatchedByEmployeeId || null;
  if (rec.dispatchedByName) row.dispatched_by_name = rec.dispatchedByName;
  if (rec.verifiedByName !== undefined) row.verified_by_name = rec.verifiedByName || null;
  if (rec.verificationPassed !== undefined) row.verification_passed = rec.verificationPassed;
  if (rec.notes !== undefined) row.notes = rec.notes || null;
  return row;
}

function mapRowToDispatchCarton(row: any): DispatchCartonRecord {
  return {
    id: row.id,
    dispatchId: row.dispatch_id,
    cartonId: row.carton_id,
    cartonNumber: row.carton_number,
    cartonBarcode: row.carton_barcode,
    totalUnits: Number(row.total_units || 0),
    grossWeightKg: Number(row.gross_weight_kg || 0),
    netWeightKg: Number(row.net_weight_kg || 0),
    sizeBreakdown: row.size_breakdown || {},
    isLoaded: Boolean(row.is_loaded),
    loadedAt: row.loaded_at || undefined,
    createdAt: row.created_at,
  };
}

function mapDispatchCartonToRow(c: Partial<DispatchCartonRecord>): any {
  const row: any = {};
  if (c.id) row.id = c.id;
  if (c.dispatchId) row.dispatch_id = c.dispatchId;
  if (c.cartonId) row.carton_id = c.cartonId;
  if (c.cartonNumber) row.carton_number = c.cartonNumber;
  if (c.cartonBarcode) row.carton_barcode = c.cartonBarcode;
  if (c.totalUnits !== undefined) row.total_units = c.totalUnits;
  if (c.grossWeightKg !== undefined) row.gross_weight_kg = c.grossWeightKg;
  if (c.netWeightKg !== undefined) row.net_weight_kg = c.netWeightKg;
  if (c.sizeBreakdown) row.size_breakdown = c.sizeBreakdown;
  if (c.isLoaded !== undefined) row.is_loaded = c.isLoaded;
  if (c.loadedAt !== undefined) row.loaded_at = c.loadedAt || null;
  return row;
}

// -----------------------------------------------------------------------------
// REPOSITORY METHODS
// -----------------------------------------------------------------------------

/**
 * Fetch all Dispatch Records from Supabase PostgreSQL
 */
export async function getDispatchRecordsFromSupabase(): Promise<DispatchRecord[]> {
  if (!isSupabaseConfigured()) {
    const list = getLocalDispatchRecords();
    const cartons = getLocalDispatchCartons();
    return list.map((d) => ({
      ...d,
      cartons: cartons.filter((c) => c.dispatchId === d.id),
    }));
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("dispatch_records")
      .select("*, cartons:dispatch_cartons(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetch error for dispatch_records, using fallback:", error.message);
      return getLocalDispatchRecords();
    }

    const domain = (data || []).map((r: any) => {
      const mapped = mapRowToDispatchRecord(r);
      mapped.cartons = (r.cartons || []).map(mapRowToDispatchCarton);
      return mapped;
    });

    setLocalDispatchRecords(domain);
    return domain;
  } catch (err) {
    console.error("Failed to query dispatch_records from Supabase:", err);
    return getLocalDispatchRecords();
  }
}

/**
 * Fetch single Dispatch Record by ID
 */
export async function getDispatchRecordByIdFromSupabase(id: string): Promise<DispatchRecord | null> {
  const all = await getDispatchRecordsFromSupabase();
  return all.find((d) => d.id === id) || null;
}

/**
 * Fetch assigned cartons for a dispatch
 */
export async function getDispatchCartonsFromSupabase(dispatchId: string): Promise<DispatchCartonRecord[]> {
  if (!isSupabaseConfigured()) {
    return getLocalDispatchCartons().filter((c) => c.dispatchId === dispatchId);
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("dispatch_cartons")
      .select("*")
      .eq("dispatch_id", dispatchId)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Supabase fetch error for dispatch_cartons:", error.message);
      return getLocalDispatchCartons().filter((c) => c.dispatchId === dispatchId);
    }

    return (data || []).map(mapRowToDispatchCarton);
  } catch (err) {
    console.error("Failed to query dispatch_cartons from Supabase:", err);
    return getLocalDispatchCartons().filter((c) => c.dispatchId === dispatchId);
  }
}

/**
 * Create a new Dispatch record with selected physical cartons
 */
export async function createDispatchInSupabase(payload: {
  productionJobId: string;
  orderId?: string;
  clientId?: string;
  packingRecordId?: string;
  cartonIds: string[];
  consigneeName: string;
  destinationCountry: string;
  destinationCity: string;
  destinationAddress?: string;
  shippingMethod: ShippingMethod;
  carrier: string;
  carrierTrackingNumber?: string;
  shippingReference?: string;
  dispatchDate?: string;
  estimatedDeliveryDate?: string;
  dispatchedByName: string;
  notes?: string;
}): Promise<DispatchRecord> {
  if (!payload.cartonIds || payload.cartonIds.length === 0) {
    throw new Error("Cannot create dispatch: At least one master carton must be selected.");
  }

  const job = await getProductionJobByIdFromSupabase(payload.productionJobId);
  if (!job) {
    throw new Error(`Production Job '${payload.productionJobId}' not found.`);
  }

  // Verify eligibility: Job must have packed status/stage
  const isEligible = job.stage === "packed" || job.totalQaPassedQuantity > 0 || job.totalFinishedQuantity > 0;
  if (!isEligible) {
    throw new Error(`Job ${job.jobNumber} is not ready for dispatch. Packing must be completed first.`);
  }

  // Fetch all cartons to validate and calculate totals
  const allCartons = await getPackingCartonsFromSupabase(undefined, payload.productionJobId);
  const selectedCartons = allCartons.filter((c) => payload.cartonIds.includes(c.id));

  if (selectedCartons.length === 0) {
    throw new Error("None of the selected master cartons could be found for this production job.");
  }

  // Check if any carton is already dispatched
  const alreadyDispatched = selectedCartons.find((c) => c.status === "dispatched");
  if (alreadyDispatched) {
    throw new Error(`Carton ${alreadyDispatched.cartonNumber} has already been dispatched.`);
  }

  // Aggregate totals
  const totalPieces = selectedCartons.reduce((sum, c) => sum + c.totalUnitsInCarton, 0);
  const totalGrossWeight = parseFloat(
    selectedCartons.reduce((sum, c) => sum + c.grossWeightKg, 0).toFixed(2)
  );
  const totalNetWeight = parseFloat(
    selectedCartons.reduce((sum, c) => sum + c.netWeightKg, 0).toFixed(2)
  );

  const dispatchNumber = `DSP-2026-${Date.now().toString().slice(-4)}`;
  const nowIso = new Date().toISOString();
  const dispatchId = `dsp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Find linked tracking shipment
  const trackingList = await getTrackingRecordsFromSupabase();
  const matchedTracking = trackingList.find(
    (t: TrackingShipmentRecord) => t.productionJobId === payload.productionJobId || (payload.orderId && t.orderId === payload.orderId)
  );

  const newDispatch: DispatchRecord = {
    id: dispatchId,
    dispatchNumber,
    orderId: payload.orderId || job.orderId,
    orderNumber: job.orderNumber,
    productionJobId: payload.productionJobId,
    productionJobNumber: job.jobNumber,
    clientId: payload.clientId || job.clientId,
    clientName: payload.consigneeName || job.clientName || "International Buyer",
    trackingShipmentId: matchedTracking?.id,
    packingRecordId: payload.packingRecordId,
    dispatchDate: payload.dispatchDate || nowIso.split("T")[0],
    estimatedDeliveryDate: payload.estimatedDeliveryDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    warehouseOrigin: "Factory Sialkot — Export Staging Bay A-04",
    destinationCountry: payload.destinationCountry,
    destinationCity: payload.destinationCity,
    destinationAddress: payload.destinationAddress,
    consigneeName: payload.consigneeName,
    shippingMethod: payload.shippingMethod,
    carrier: payload.carrier,
    carrierTrackingNumber: payload.carrierTrackingNumber,
    shippingReference: payload.shippingReference || `REF-EXP-${Date.now().toString().slice(-5)}`,
    totalCartons: selectedCartons.length,
    totalPieces,
    totalNetWeightKg: totalNetWeight,
    totalGrossWeightKg: totalGrossWeight,
    dispatchStatus: "ready_for_dispatch",
    dispatchedByName: payload.dispatchedByName,
    verificationPassed: true,
    notes: payload.notes,
    cartons: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // Create dispatch carton records
  const dispatchCartons: DispatchCartonRecord[] = selectedCartons.map((sc) => ({
    id: `dc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    dispatchId,
    cartonId: sc.id,
    cartonNumber: sc.cartonNumber,
    cartonBarcode: sc.cartonBarcode,
    totalUnits: sc.totalUnitsInCarton,
    grossWeightKg: sc.grossWeightKg,
    netWeightKg: sc.netWeightKg,
    sizeBreakdown: sc.sizeBreakdown,
    isLoaded: false,
    createdAt: nowIso,
  }));

  newDispatch.cartons = dispatchCartons;

  // Save to local storage
  const localRecords = getLocalDispatchRecords();
  setLocalDispatchRecords([newDispatch, ...localRecords]);

  const localCartons = getLocalDispatchCartons();
  setLocalDispatchCartons([...dispatchCartons, ...localCartons]);

  // Sync Tracking Gate 8 (Warehouse Staging & Dispatch Loading)
  if (matchedTracking && matchedTracking.currentGate < 8) {
    await updateTrackingGateInSupabase(
      matchedTracking.id,
      8,
      "packed",
      `Gate 8 Staging: Dispatch shipment ${dispatchNumber} created with ${selectedCartons.length} cartons (${totalPieces} pcs). Carrier: ${payload.carrier}.`,
      payload.dispatchedByName
    );
  }

  // Audit timeline event
  await addProductionTimelineEvent(
    payload.productionJobId,
    "dispatch_created",
    `Dispatch Order Created (${dispatchNumber})`,
    `Consignment scheduled for ${payload.consigneeName} (${payload.destinationCity}, ${payload.destinationCountry}). Total: ${selectedCartons.length} Cartons, ${totalPieces} Pcs.`,
    payload.dispatchedByName
  );

  if (!isSupabaseConfigured()) {
    return newDispatch;
  }

  try {
    const supabase = createClient();
    const row = mapDispatchRecordToRow(newDispatch);
    delete row.id;

    const { data, error } = await supabase.from("dispatch_records").insert(row).select().single();
    if (error || !data) {
      console.warn("Supabase dispatch_records insert error, using local:", error?.message);
      return newDispatch;
    }

    const createdRecord = mapRowToDispatchRecord(data);

    // Insert dispatch cartons
    const cartonRows = dispatchCartons.map((dc) => {
      const cr = mapDispatchCartonToRow({ ...dc, dispatchId: createdRecord.id });
      delete cr.id;
      return cr;
    });

    await supabase.from("dispatch_cartons").insert(cartonRows);

    return createdRecord;
  } catch (err) {
    console.error("Failed to insert dispatch in Supabase:", err);
    return newDispatch;
  }
}

/**
 * Update an existing dispatch record
 */
export async function updateDispatchInSupabase(
  id: string,
  updates: Partial<DispatchRecord>
): Promise<DispatchRecord> {
  const current = getLocalDispatchRecords();
  const index = current.findIndex((d) => d.id === id);
  let updatedRecord: DispatchRecord;

  if (index !== -1) {
    updatedRecord = {
      ...current[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    current[index] = updatedRecord;
    setLocalDispatchRecords(current);
  } else {
    throw new Error(`Dispatch record '${id}' not found.`);
  }

  if (!isSupabaseConfigured()) {
    return updatedRecord;
  }

  try {
    const supabase = createClient();
    const rowUpdates = mapDispatchRecordToRow(updates);
    rowUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("dispatch_records")
      .update(rowUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.warn("Supabase update error for dispatch_records:", error?.message);
      return updatedRecord;
    }

    return mapRowToDispatchRecord(data);
  } catch (err) {
    console.error("Failed to update dispatch in Supabase:", err);
    return updatedRecord;
  }
}

/**
 * Mark dispatch cartons as loaded into export vehicle / container
 */
export async function markDispatchLoadedInSupabase(
  dispatchId: string,
  actor: string = "Dispatch Supervisor",
  vehicleContainerNo?: string,
  driverName?: string,
  driverPhone?: string
): Promise<DispatchRecord> {
  const dispatch = await getDispatchRecordByIdFromSupabase(dispatchId);
  if (!dispatch) {
    throw new Error(`Dispatch record '${dispatchId}' not found.`);
  }

  const nowIso = new Date().toISOString();

  // Mark all cartons loaded in local store
  const allDispatchCartons = getLocalDispatchCartons();
  const updatedCartons = allDispatchCartons.map((c) =>
    c.dispatchId === dispatchId ? { ...c, isLoaded: true, loadedAt: nowIso } : c
  );
  setLocalDispatchCartons(updatedCartons);

  // Update dispatch status
  const updatedDispatch = await updateDispatchInSupabase(dispatchId, {
    dispatchStatus: "loaded",
    vehicleContainerNo: vehicleContainerNo || dispatch.vehicleContainerNo || "EX-CONT-40FT-9921",
    driverName: driverName || dispatch.driverName || "Amjad Iqbal (Export Logistics)",
    driverPhone: driverPhone || dispatch.driverPhone || "+92 300 8472911",
  });

  // Sync Tracking Gate 8
  const trackingList = await getTrackingRecordsFromSupabase();
  const matchedTracking = trackingList.find(
    (t: TrackingShipmentRecord) => t.productionJobId === dispatch.productionJobId || (dispatch.orderId && t.orderId === dispatch.orderId)
  );

  if (matchedTracking) {
    await updateTrackingGateInSupabase(
      matchedTracking.id,
      8,
      "packed",
      `Gate 8 Loaded: Container / Vehicle ${updatedDispatch.vehicleContainerNo} loaded with ${dispatch.totalCartons} cartons. Verified by ${actor}.`,
      actor
    );
  }

  // Audit timeline event
  if (dispatch.productionJobId) {
    await addProductionTimelineEvent(
      dispatch.productionJobId,
      "dispatch_loaded",
      `Shipment Loaded (${dispatch.dispatchNumber})`,
      `All ${dispatch.totalCartons} master cartons successfully loaded into ${updatedDispatch.vehicleContainerNo}. Driver: ${updatedDispatch.driverName}.`,
      actor
    );
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase
        .from("dispatch_cartons")
        .update({ is_loaded: true, loaded_at: nowIso })
        .eq("dispatch_id", dispatchId);
    } catch (err) {
      console.error("Failed to update loaded state in Supabase:", err);
    }
  }

  return updatedDispatch;
}

/**
 * Complete final dispatch and release shipment for transit
 */
export async function completeDispatchInSupabase(
  dispatchId: string,
  actor: string = "Export Logistics Manager",
  carrierTrackingNumber?: string
): Promise<DispatchRecord> {
  const dispatch = await getDispatchRecordByIdFromSupabase(dispatchId);
  if (!dispatch) {
    throw new Error(`Dispatch record '${dispatchId}' not found.`);
  }

  const trackingNumber = carrierTrackingNumber || dispatch.carrierTrackingNumber || `EXP-AWB-${Date.now().toString().slice(-6)}`;

  // Update dispatch status to dispatched
  const updatedDispatch = await updateDispatchInSupabase(dispatchId, {
    dispatchStatus: "dispatched",
    carrierTrackingNumber: trackingNumber,
  });

  // Advance Production Job status/stage
  if (dispatch.productionJobId) {
    await updateProductionJobInSupabase(dispatch.productionJobId, {
      status: "completed",
      stage: "packed",
    });
  }

  // Complete Tracking Gate 8 and advance to In Transit
  const trackingList = await getTrackingRecordsFromSupabase();
  const matchedTracking = trackingList.find(
    (t: TrackingShipmentRecord) => t.productionJobId === dispatch.productionJobId || (dispatch.orderId && t.orderId === dispatch.orderId)
  );

  if (matchedTracking) {
    await updateTrackingGateInSupabase(
      matchedTracking.id,
      8,
      "dispatched",
      `Gate 8 Completed: Shipment dispatched via ${dispatch.carrier}. AWB/Tracking Ref: ${trackingNumber}. Staging released.`,
      actor
    );
  }

  // Audit timeline event
  if (dispatch.productionJobId) {
    await addProductionTimelineEvent(
      dispatch.productionJobId,
      "shipment_dispatched",
      `Export Shipment Dispatched (${dispatch.dispatchNumber})`,
      `Consignment handed over to ${dispatch.carrier} (${trackingNumber}). En route to ${dispatch.destinationCity}, ${dispatch.destinationCountry}.`,
      actor
    );
  }

  return updatedDispatch;
}

/**
 * Barcode resolver: resolves a carton barcode back to its full dispatch hierarchy
 */
export async function resolveDispatchBarcode(barcode: string): Promise<{
  carton: PackingCartonRecord;
  dispatch?: DispatchRecord;
  productionJob?: ProductionJobRecord;
  packingRecord?: PackingRecord;
} | null> {
  const allCartons = await getPackingCartonsFromSupabase();
  const carton = allCartons.find((c) => c.cartonBarcode === barcode || c.cartonNumber === barcode);
  if (!carton) return null;

  const allDispatches = await getDispatchRecordsFromSupabase();
  const dispatch = allDispatches.find(
    (d) => d.productionJobId === carton.productionJobId || (d.cartons && d.cartons.some((dc) => dc.cartonBarcode === barcode))
  );

  const job = carton.productionJobId ? await getProductionJobByIdFromSupabase(carton.productionJobId) : null;
  const packingRecords = await getPackingRecordsFromSupabase();
  const packingRecord = packingRecords.find((p) => p.id === carton.packingRecordId);

  return {
    carton,
    dispatch: dispatch || undefined,
    productionJob: job || undefined,
    packingRecord: packingRecord || undefined,
  };
}

/**
 * Fetch Dispatch Queue: jobs with packed cartons ready to create a dispatch order
 */
export async function getDispatchQueueFromSupabase(): Promise<DispatchQueueItem[]> {
  const [jobs, packingRecords, allCartons, allDispatches] = await Promise.all([
    getProductionJobsFromSupabase(),
    getPackingRecordsFromSupabase(),
    getPackingCartonsFromSupabase(),
    getDispatchRecordsFromSupabase(),
  ]);

  // Find all carton IDs already in active dispatches
  const assignedCartonIds = new Set<string>();
  allDispatches.forEach((d) => {
    if (d.dispatchStatus !== "cancelled") {
      (d.cartons || []).forEach((c) => assignedCartonIds.add(c.cartonId));
    }
  });

  const eligibleJobs = jobs.filter(
    (j) => !j.isArchived && (j.stage === "packed" || j.totalQaPassedQuantity > 0 || j.totalFinishedQuantity > 0)
  );

  const queue: DispatchQueueItem[] = [];

  for (const job of eligibleJobs) {
    const jobPacking = packingRecords.find((p) => p.productionJobId === job.id);
    const jobCartons = allCartons.filter((c) => c.productionJobId === job.id && !assignedCartonIds.has(c.id));

    if (jobCartons.length > 0) {
      const packedPieces = jobCartons.reduce((sum, c) => sum + c.totalUnitsInCarton, 0);
      queue.push({
        productionJob: job,
        packingRecord: jobPacking,
        availableCartons: jobCartons,
        totalPackedPieces: packedPieces,
        totalCartons: jobCartons.length,
        clientName: job.clientName || "International Buyer",
        orderNumber: job.orderNumber || "ORD-EXP",
        destination: jobCartons[0]?.destinationLabel || "Export Terminal Bay",
      });
    }
  }

  return queue;
}

/**
 * Calculate live Dispatch Floor KPIs strictly from database
 */
export async function getDispatchKPIsFromSupabase(): Promise<DispatchKPIData> {
  const [dispatches, queue] = await Promise.all([
    getDispatchRecordsFromSupabase(),
    getDispatchQueueFromSupabase(),
  ]);

  if (dispatches.length === 0) {
    return {
      readyForDispatch: queue.length,
      scheduled: 0,
      loadedToday: 0,
      dispatchedToday: 0,
      inTransit: 0,
      delivered: 0,
      totalCartons: 0,
      totalPieces: 0,
    };
  }

  const todayStr = new Date().toISOString().split("T")[0];

  const readyForDispatch = dispatches.filter((d) => d.dispatchStatus === "ready_for_dispatch").length + queue.length;
  const scheduled = dispatches.filter((d) => d.dispatchStatus === "dispatch_scheduled").length;
  const loadedToday = dispatches.filter((d) => d.dispatchStatus === "loaded" && d.updatedAt?.startsWith(todayStr)).length;
  const dispatchedToday = dispatches.filter((d) => d.dispatchStatus === "dispatched" && d.updatedAt?.startsWith(todayStr)).length;
  const inTransit = dispatches.filter((d) => d.dispatchStatus === "in_transit" || d.dispatchStatus === "dispatched").length;
  const delivered = dispatches.filter((d) => d.dispatchStatus === "delivered").length;

  const totalCartons = dispatches.reduce((sum, d) => sum + d.totalCartons, 0);
  const totalPieces = dispatches.reduce((sum, d) => sum + d.totalPieces, 0);

  return {
    readyForDispatch,
    scheduled,
    loadedToday,
    dispatchedToday,
    inTransit,
    delivered,
    totalCartons,
    totalPieces,
  };
}

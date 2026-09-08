/**
 * FactoryOS Garment ERP — 9-Gate Milestone Tracking MySQL 8 Repository
 * Complete Gate 1 to Gate 9 Logistics and Production Lifecycle Engine.
 */

import { executeQuery, MySQL } from "./db";

export interface TrackingTimelineEvent {
  id: string;
  trackingRecordId: string;
  gate: number;
  title: string;
  description: string;
  location: string;
  actor: string;
  timestamp: string;
}

export interface TrackingShipmentRecord {
  id: string;
  trackingNumber: string;
  orderId: string;
  orderNumber: string;
  productionJobId?: string;
  clientName: string;
  productName: string;
  styleCode: string;
  currentGate: number;
  gateStatus: string;
  originFacility: string;
  destinationPort: string;
  currentLocation: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  isDelayed: boolean;
  timeline: TrackingTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface TrackingKPIData {
  activeShipments: number;
  atProductionGate: number;
  atQAGate: number;
  atPackingGate: number;
  atDispatchGate: number;
  delivered: number;
  delayedShipments: number;
  onTimeDeliveryRatePct: number;
}

export const GATE_DEFINITIONS = [
  { gate: 1, name: "Order Confirmed", department: "Commercial & Merchandising" },
  { gate: 2, name: "Fabric Approved", department: "Material Warehouse & Lab" },
  { gate: 3, name: "Cutting Started", department: "CAD & Automated Cutting Bay" },
  { gate: 4, name: "Stitching Started", department: "Sewing Floor Lines" },
  { gate: 5, name: "Finishing & Pressing", department: "Ironing & Finishing Floor" },
  { gate: 6, name: "QA Passed", department: "Quality Assurance AQL 2.5" },
  { gate: 7, name: "Packing Completed", department: "Cartonization & Polybag Floor" },
  { gate: 8, name: "Export Dispatch", department: "Container Logistics & Customs" },
  { gate: 9, name: "Port Delivered", department: "Destination Consignee Port" },
];

export async function getTrackingRecordsFromMySQL(): Promise<TrackingShipmentRecord[]> {
  const rows = await executeQuery<any>(
    `SELECT t.*, o.order_number, c.company_name as client_name, p.name as product_name, p.style_code
     FROM \`tracking_records\` t
     LEFT JOIN \`orders\` o ON t.order_id = o.id
     LEFT JOIN \`clients\` c ON o.client_id = c.id
     LEFT JOIN \`products\` p ON o.product_id = p.id
     ORDER BY t.\`updated_at\` DESC`
  );

  const records: TrackingShipmentRecord[] = [];

  for (const r of rows) {
    const timelineRows = await executeQuery<any>(
      "SELECT * FROM `tracking_timeline` WHERE `tracking_record_id` = ? ORDER BY `gate_number` ASC",
      [r.id]
    );

    const timeline: TrackingTimelineEvent[] = timelineRows.map((tl) => ({
      id: String(tl.id),
      trackingRecordId: String(tl.tracking_record_id),
      gate: Number(tl.gate_number || 1),
      title: tl.title,
      description: tl.description,
      location: tl.location,
      actor: tl.actor,
      timestamp: tl.timestamp,
    }));

    records.push({
      id: String(r.id),
      trackingNumber: r.tracking_number,
      orderId: String(r.order_id),
      orderNumber: r.order_number || "ORD-2026-001",
      productionJobId: r.production_job_id ? String(r.production_job_id) : undefined,
      clientName: r.client_name || "Nordic Apparel Group",
      productName: r.product_name || "Heavyweight Hoodie",
      styleCode: r.style_code || "HD-380",
      currentGate: Number(r.current_gate || 1),
      gateStatus: r.gate_status || "in_progress",
      originFacility: r.origin_facility || "Main Garment Plant Sialkot",
      destinationPort: r.destination_port || "Port of Rotterdam (NLRTM)",
      currentLocation: r.current_location || "Factory Floor",
      estimatedDelivery: r.estimated_delivery ? String(r.estimated_delivery).split("T")[0] : "2026-10-15",
      actualDelivery: r.actual_delivery ? String(r.actual_delivery).split("T")[0] : undefined,
      isDelayed: Boolean(r.is_delayed),
      timeline,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  }

  return records;
}

export async function createTrackingRecordInMySQL(data: {
  orderId?: string;
  productionJobId?: string;
  destinationPort?: string;
  estimatedDelivery?: string;
}) {
  let orderId = data.orderId;
  if (!orderId) {
    const [ord] = await executeQuery<any>("SELECT id FROM `orders` LIMIT 1");
    orderId = ord ? String(ord.id) : "1";
  }

  const [existing] = await executeQuery<any>("SELECT COUNT(*) as count FROM `tracking_records`");
  const count = Number(existing?.count || 0) + 1;
  const trackingNumber = `TRK-2026-${String(count).padStart(3, "0")}`;

  const insertId = await MySQL.insert("tracking_records", {
    uuid: crypto.randomUUID(),
    tracking_number: trackingNumber,
    order_id: orderId,
    production_job_id: data.productionJobId || 1,
    current_gate: 1,
    gate_status: "in_progress",
    origin_facility: "Main Garment Plant Sialkot",
    destination_port: data.destinationPort || "Port of Rotterdam (NLRTM)",
    current_location: "Factory Merchandising Floor",
    estimated_delivery: data.estimatedDelivery || "2026-10-15",
    is_delayed: 0,
  });

  // Seed Gate 1 Timeline Event
  await MySQL.insert("tracking_timeline", {
    tracking_record_id: insertId,
    gate_number: 1,
    title: "Gate 1: Order Confirmed & Released to Floor",
    description: "Buyer LC confirmed and tech pack issued to planning.",
    location: "Commercial Merchandising Office",
    actor: "Commercial Lead Officer",
  });

  return String(insertId);
}

export async function updateTrackingGateInMySQL(data: {
  trackingRecordId: string;
  gateNumber: number;
  gateStatus?: string;
  location?: string;
  notes?: string;
  actor?: string;
}) {
  const gateDef = GATE_DEFINITIONS.find((g) => g.gate === data.gateNumber) || {
    gate: data.gateNumber,
    name: `Gate ${data.gateNumber}`,
    department: "Factory Operations",
  };

  // 1. Update Tracking Record
  await executeQuery(
    "UPDATE `tracking_records` SET `current_gate` = ?, `gate_status` = ?, `current_location` = COALESCE(?, `current_location`) WHERE `id` = ?",
    [
      data.gateNumber,
      data.gateStatus || "in_progress",
      data.location || gateDef.department,
      data.trackingRecordId,
    ]
  );

  // 2. Add Timeline Event
  await MySQL.insert("tracking_timeline", {
    tracking_record_id: data.trackingRecordId,
    gate_number: data.gateNumber,
    title: `Gate ${data.gateNumber}: ${gateDef.name}`,
    description: data.notes || `Milestone reached at ${gateDef.department}.`,
    location: data.location || gateDef.department,
    actor: data.actor || "Floor Milestone Controller",
  });

  return true;
}

export async function getTrackingMetricsFromMySQL(): Promise<TrackingKPIData> {
  const [activeRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `tracking_records` WHERE `current_gate` < 9"
  );
  const [prodRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `tracking_records` WHERE `current_gate` BETWEEN 3 AND 5"
  );
  const [qaRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `tracking_records` WHERE `current_gate` = 6"
  );
  const [packingRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `tracking_records` WHERE `current_gate` = 7"
  );
  const [readyRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `tracking_records` WHERE `current_gate` = 8"
  );
  const [delivRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `tracking_records` WHERE `current_gate` = 9"
  );

  return {
    activeShipments: Number(activeRows?.count || 0),
    atProductionGate: Number(prodRows?.count || 0),
    atQAGate: Number(qaRows?.count || 0),
    atPackingGate: Number(packingRows?.count || 0),
    atDispatchGate: Number(readyRows?.count || 0),
    delivered: Number(delivRows?.count || 0),
    delayedShipments: 0,
    onTimeDeliveryRatePct: 100,
  };
}

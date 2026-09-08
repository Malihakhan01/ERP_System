/**
 * FactoryOS Garment ERP — Packing & Cartons MySQL 8 Repository
 * Complete Master Cartonization, Barcoding, and Dispatch Staging against MySQL.
 */

import { executeQuery, MySQL } from "./db";
import type { PackingCartonRecord, PackingQueueItem, PackingKPIData } from "@/lib/services/packing-service";
import { getProductionJobsFromMySQL } from "./production-db";

export async function getPackingCartonsFromMySQL(): Promise<PackingCartonRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `packing_cartons` ORDER BY `created_at` DESC"
  );

  const cartons: PackingCartonRecord[] = [];

  for (const r of rows) {
    const items = await executeQuery<any>(
      "SELECT * FROM `packing_carton_items` WHERE `carton_id` = ?",
      [r.id]
    );

    const sizeBreakdown: Record<string, number> = {};
    for (const item of items) {
      sizeBreakdown[item.size] = Number(item.quantity || 0);
    }

    cartons.push({
      id: String(r.id),
      packingRecordId: String(r.id),
      cartonNumber: r.carton_number,
      productionJobId: String(r.production_job_id),
      cartonIndex: Number(r.carton_index || 1),
      cartonBarcode: r.carton_barcode,
      packingType: (r.packing_type as any) || "solid_size",
      totalUnitsInCarton: Number(r.total_units_in_carton || 24),
      sizeBreakdown,
      grossWeightKg: Number(r.gross_weight_kg || 12.5),
      netWeightKg: Number(r.net_weight_kg || 11.2),
      lengthCm: Number(r.length_cm || 60),
      widthCm: Number(r.width_cm || 40),
      heightCm: Number(r.height_cm || 35),
      status: r.status || "packed",
      packedBy: r.packed_by,
      packerName: r.packed_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  }

  return cartons;
}

export async function getPackingQueueFromMySQL(): Promise<PackingQueueItem[]> {
  const jobs = await getProductionJobsFromMySQL();

  return jobs.map((job) => {
    const qaApproved = Number(job.totalQaPassedQuantity || job.plannedQuantity || 0);
    const packed = Number(job.totalPackedQuantity || 0);
    const pending = Math.max(0, qaApproved - packed);

    return {
      productionJob: job,
      qaApprovedQuantity: qaApproved,
      alreadyPackedQuantity: packed,
      pendingQuantity: pending,
    };
  });
}

export async function createMasterCartonInMySQL(data: {
  productionJobId: string;
  packingType?: string;
  totalUnitsInCarton: number;
  grossWeightKg: number;
  netWeightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  packedBy?: string;
  items: Array<{ size: string; colorway?: string; quantity: number }>;
}): Promise<string> {
  const [jobRows] = await executeQuery<any>(
    "SELECT `job_number` FROM `production_jobs` WHERE `id` = ? LIMIT 1",
    [data.productionJobId]
  );
  const jobNumber = jobRows?.job_number || "PRD-2026-001";

  const [existingCartons] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `packing_cartons` WHERE `production_job_id` = ?",
    [data.productionJobId]
  );
  const index = Number(existingCartons?.count || 0) + 1;
  const cartonNumber = `CTN-${jobNumber.replace("PRD-", "")}-${String(index).padStart(3, "0")}`;

  const [maxCarton] = await executeQuery<any>(
    "SELECT COALESCE(MAX(id), 0) as max_id FROM `packing_cartons`"
  );
  const globalCartonId = Number(maxCarton?.max_id || 0) + 1;
  const barcode = `PKG-${new Date().getFullYear()}-${String(globalCartonId).padStart(5, "0")}`;

  const insertId = await MySQL.insert("packing_cartons", {
    uuid: crypto.randomUUID(),
    carton_number: cartonNumber,
    production_job_id: data.productionJobId,
    carton_index: index,
    carton_barcode: barcode,
    packing_type: data.packingType || "Master Solid Carton",
    total_units_in_carton: data.totalUnitsInCarton,
    gross_weight_kg: data.grossWeightKg,
    net_weight_kg: data.netWeightKg,
    length_cm: data.lengthCm || 60,
    width_cm: data.widthCm || 40,
    height_cm: data.heightCm || 35,
    status: "packed",
    packed_by: data.packedBy || "Packing Floor Lead",
  });

  for (const item of data.items) {
    await MySQL.insert("packing_carton_items", {
      carton_id: insertId,
      size: item.size,
      colorway: item.colorway || "Standard",
      quantity: item.quantity,
    });
  }

  // Update Production Job Total Packed Quantity
  await executeQuery(
    "UPDATE `production_jobs` SET `total_packed_quantity` = `total_packed_quantity` + ? WHERE `id` = ?",
    [data.totalUnitsInCarton, data.productionJobId]
  );

  return String(insertId);
}

export async function updateCartonStatusInMySQL(cartonId: string, status: string): Promise<boolean> {
  return MySQL.update("packing_cartons", cartonId, { status });
}

export async function getPackingMetricsFromMySQL(): Promise<PackingKPIData> {
  const [cartonRows] = await executeQuery<any>(
    "SELECT COUNT(*) as total_cartons, COALESCE(SUM(`total_units_in_carton`), 0) as total_units FROM `packing_cartons`"
  );
  const [todayRows] = await executeQuery<any>(
    "SELECT COALESCE(SUM(`total_units_in_carton`), 0) as today_units FROM `packing_cartons` WHERE DATE(`created_at`) = CURDATE()"
  );
  const [dispatchReadyRows] = await executeQuery<any>(
    "SELECT COUNT(*) as count FROM `packing_cartons` WHERE `status` IN ('packed', 'inspected', 'staged_for_dispatch')"
  );
  const [jobRows] = await executeQuery<any>(
    "SELECT COALESCE(SUM(`planned_quantity`), 0) as total_planned, COALESCE(SUM(`total_packed_quantity`), 0) as total_packed, COALESCE(SUM(`total_qa_passed_quantity`), 0) as total_qa FROM `production_jobs` WHERE `is_archived` = 0"
  );

  const totalPlanned = Number(jobRows?.total_planned || 0);
  const totalPacked = Number(jobRows?.total_packed || cartonRows?.total_units || 0);
  const totalQa = Number(jobRows?.total_qa || 0);
  const pendingPacking = Math.max(0, totalQa - totalPacked);
  const pendingPieces = Math.max(0, totalPlanned - totalPacked);
  const completionPct = totalPlanned > 0 ? Math.round((totalPacked / totalPlanned) * 100) : 0;

  return {
    pendingPacking,
    packingToday: Number(todayRows?.today_units || 0),
    packedPieces: totalPacked,
    cartonsCreated: Number(cartonRows?.total_cartons || 0),
    pendingPieces,
    packingCompletionPct: completionPct,
    dispatchReady: Number(dispatchReadyRows?.count || 0),
  };
}

export async function verifyCartonBarcodeInMySQL(barcode: string) {
  const [carton] = await executeQuery<any>(
    "SELECT * FROM `packing_cartons` WHERE `carton_barcode` = ? OR `carton_number` = ? LIMIT 1",
    [barcode, barcode]
  );
  if (!carton) return null;

  const items = await executeQuery<any>(
    "SELECT * FROM `packing_carton_items` WHERE `carton_id` = ?",
    [carton.id]
  );

  return {
    ...carton,
    items,
  };
}

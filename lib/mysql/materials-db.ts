/**
 * FactoryOS Garment ERP — Raw Materials MySQL 8 Repository
 * Connects /materials with live MySQL `raw_materials` table.
 */

import { executeQuery, MySQL } from "./db";
import type { RawMaterial } from "@/lib/services/materials-service";

export async function getMaterialsFromMySQL(): Promise<RawMaterial[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `raw_materials` WHERE `is_archived` = 0 ORDER BY `created_at` DESC"
  );

  return rows.map((r) => ({
    id: String(r.id),
    materialCode: r.material_code,
    name: r.name,
    category: (r.category || "fabric") as any,
    color: r.color || "Natural / Raw",
    uom: (r.uom || "kg") as any,
    gsm: r.gsm || undefined,
    unitCost: String(r.unit_cost || "0"),
    reorderPoint: String(r.reorder_point || "100"),
    location: r.location || "Main Warehouse Bay 1",
    currentStock: String(r.current_stock || "0"),
    status: (r.status || "normal") as any,
    isArchived: Boolean(r.is_archived),
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  }));
}

export async function getMaterialByIdFromMySQL(id: string): Promise<RawMaterial | null> {
  const rows = await executeQuery<any>("SELECT * FROM `raw_materials` WHERE `id` = ?", [id]);
  if (!rows || rows.length === 0) return null;
  const materials = await getMaterialsFromMySQL();
  return materials.find((m) => m.id === String(id)) || null;
}

export async function createMaterialInMySQL(data: Partial<RawMaterial>): Promise<string> {
  const countRows = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `raw_materials`");
  const nextNum = (countRows[0]?.cnt || 0) + 1;
  const materialCode = data.materialCode || `MAT-2026-${String(nextNum).padStart(3, "0")}`;

  const currentStock = Number(data.currentStock) || 0;
  const reorderPoint = Number(data.reorderPoint) || 100;
  let status: "normal" | "low" | "critical" = "normal";
  if (currentStock <= 0) status = "critical";
  else if (currentStock <= reorderPoint) status = "low";

  const insertId = await MySQL.insert("raw_materials", {
    uuid: crypto.randomUUID(),
    material_code: materialCode,
    name: data.name || "Cotton Fleece Fabric",
    category: data.category || "fabric",
    color: data.color || "Natural / Raw",
    uom: data.uom || "kg",
    gsm: data.gsm || "320 GSM",
    unit_cost: Number(data.unitCost) || 0,
    reorder_point: reorderPoint,
    location: data.location || "Main Warehouse Bay 1",
    current_stock: currentStock,
    status,
    is_archived: 0,
  });

  return String(insertId);
}

export async function updateMaterialInMySQL(id: string, data: Partial<RawMaterial>): Promise<boolean> {
  const payload: Record<string, any> = {};

  if (data.name) payload.name = data.name;
  if (data.category) payload.category = data.category;
  if (data.color) payload.color = data.color;
  if (data.uom) payload.uom = data.uom;
  if (data.gsm !== undefined) payload.gsm = data.gsm;
  if (data.unitCost !== undefined) payload.unit_cost = Number(data.unitCost);
  if (data.reorderPoint !== undefined) payload.reorder_point = Number(data.reorderPoint);
  if (data.location) payload.location = data.location;
  if (data.currentStock !== undefined) {
    const stock = Number(data.currentStock);
    payload.current_stock = stock;
    const reorder = data.reorderPoint !== undefined ? Number(data.reorderPoint) : 100;
    if (stock <= 0) payload.status = "critical";
    else if (stock <= reorder) payload.status = "low";
    else payload.status = "normal";
  }
  if (data.status) payload.status = data.status;
  if (data.isArchived !== undefined) payload.is_archived = data.isArchived ? 1 : 0;

  return MySQL.update("raw_materials", id, payload);
}

export async function deleteMaterialInMySQL(id: string): Promise<boolean> {
  return MySQL.delete("raw_materials", id, true);
}

export async function getMaterialMetricsFromMySQL() {
  const materials = await getMaterialsFromMySQL();
  const totalMaterialsCount = materials.length;
  const fabricStockKg = materials
    .filter((m) => m.category === "fabric")
    .reduce((acc, m) => acc + (Number(m.currentStock) || 0), 0);
  const trimsUnitsCount = materials
    .filter((m) => m.category !== "fabric")
    .reduce((acc, m) => acc + (Number(m.currentStock) || 0), 0);
  const lowStockCount = materials.filter((m) => m.status === "low" || m.status === "critical").length;

  return {
    totalMaterialsCount,
    fabricStockKg,
    trimsUnitsCount,
    lowStockCount,
  };
}

/**
 * FactoryOS Garment ERP — Products MySQL 8 Repository
 * Replaces products-db.ts with MySQL CRUD.
 */

import { executeQuery, MySQL } from "./db";
import { GarmentProduct } from "@/lib/services/products-service";

export async function getProductsFromMySQL(): Promise<GarmentProduct[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `products` WHERE `is_archived` = 0 ORDER BY `created_at` DESC"
  );

  return rows.map((r) => ({
    id: String(r.id),
    styleCode: r.style_code,
    name: r.name,
    category: r.category,
    sam: String(r.sam || "0"),
    fabricType: r.fabric_type,
    gsm: r.gsm,
    consumptionKg: String(r.consumption_kg || "0"),
    wastagePct: String(r.wastage_pct || "0"),
    sizes: typeof r.sizes === "string" ? JSON.parse(r.sizes) : Array.isArray(r.sizes) ? r.sizes : [],
    bomStatus: r.bom_status || "draft",
    productionStatus: r.production_status || "active",
    specs: typeof r.specs === "string" ? JSON.parse(r.specs) : r.specs || {},
    isArchived: Boolean(r.is_archived),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createProductInMySQL(data: Omit<GarmentProduct, "id" | "createdAt">): Promise<string> {
  const insertId = await MySQL.insert("products", {
    uuid: crypto.randomUUID(),
    style_code: data.styleCode,
    name: data.name,
    category: data.category,
    sam: Number(data.sam || 0),
    fabric_type: data.fabricType,
    gsm: data.gsm,
    consumption_kg: Number(data.consumptionKg || 0),
    wastage_pct: Number(data.wastagePct || 0),
    sizes: data.sizes,
    bom_status: data.bomStatus || "draft",
    production_status: data.productionStatus || "active",
    specs: data.specs || {},
    is_archived: 0,
  });

  return String(insertId);
}

export async function updateProductInMySQL(id: string, data: Partial<GarmentProduct>): Promise<boolean> {
  const payload: Record<string, any> = {};
  if (data.styleCode !== undefined) payload.style_code = data.styleCode;
  if (data.name !== undefined) payload.name = data.name;
  if (data.category !== undefined) payload.category = data.category;
  if (data.sam !== undefined) payload.sam = Number(data.sam);
  if (data.fabricType !== undefined) payload.fabric_type = data.fabricType;
  if (data.gsm !== undefined) payload.gsm = data.gsm;
  if (data.consumptionKg !== undefined) payload.consumption_kg = Number(data.consumptionKg);
  if (data.wastagePct !== undefined) payload.wastage_pct = Number(data.wastagePct);
  if (data.sizes !== undefined) payload.sizes = data.sizes;
  if (data.bomStatus !== undefined) payload.bom_status = data.bomStatus;
  if (data.productionStatus !== undefined) payload.production_status = data.productionStatus;
  if (data.specs !== undefined) payload.specs = data.specs;

  return MySQL.update("products", id, payload);
}

export async function deleteProductInMySQL(id: string): Promise<boolean> {
  return MySQL.delete("products", id, true);
}

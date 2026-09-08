/**
 * FactoryOS Garment ERP — Inventory & Stock Movements MySQL 8 Repository
 * Connects /inventory with live MySQL `inventory_items` and `stock_movements` tables.
 */

import { executeQuery, MySQL } from "./db";
import type { InventoryItem, StockMovementRecord } from "@/lib/services/inventory-service";

export async function getInventoryFromMySQL(): Promise<InventoryItem[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `inventory_items` WHERE `is_archived` = 0 ORDER BY `created_at` DESC"
  );

  return rows.map((r) => {
    const avail = Number(r.available_stock || 0);
    const reorder = Number(r.min_reorder_level || 100);
    let health: "healthy" | "low" | "critical" = "healthy";
    if (avail <= 0) health = "critical";
    else if (avail <= reorder) health = "low";

    return {
      id: String(r.id),
      name: r.name,
      sku: r.sku,
      lotNumber: r.lot_number || `LOT-${String(r.id).padStart(4, "0")}`,
      category: (r.category || "fabric") as any,
      materialId: undefined,
      bay: r.bay || "bay1",
      availableStock: avail,
      allocatedStock: Number(r.allocated_stock || 0),
      unit: r.unit || "kg",
      unitCost: Number(r.unit_cost || 0),
      reorderPoint: reorder,
      health,
      isArchived: Boolean(r.is_archived),
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
    };
  });
}

export async function getStockMovementsFromMySQL(): Promise<StockMovementRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT m.*, i.name as item_name, i.sku as item_sku, i.unit as item_unit FROM `stock_movements` m LEFT JOIN `inventory_items` i ON m.inventory_item_id = i.id ORDER BY m.created_at DESC LIMIT 100"
  );

  return rows.map((r) => ({
    id: String(r.id),
    itemId: String(r.inventory_item_id),
    inventoryItemId: String(r.inventory_item_id),
    itemName: r.item_name || "Material Lot",
    sku: r.item_sku || "SKU",
    type: (r.movement_type || "in") as any,
    quantity: Number(r.quantity || 0),
    unit: r.item_unit || "kg",
    fromBay: r.reference_type === "bay_transfer" ? (r.notes?.split(" -> ")[0] || "bay1") : undefined,
    toBay: r.reference_type === "bay_transfer" ? (r.notes?.split(" -> ")[1] || "bay2") : "bay1",
    timestamp: r.created_at ? new Date(r.created_at).toISOString().replace("T", " ").substring(0, 19) : new Date().toISOString().replace("T", " ").substring(0, 19),
    notes: r.notes || undefined,
  }));
}

export async function createInventoryItemInMySQL(data: Partial<InventoryItem>): Promise<string> {
  const countRows = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `inventory_items`");
  const nextNum = (countRows[0]?.cnt || 0) + 1;
  const sku = data.sku || `SKU-${String(nextNum).padStart(4, "0")}`;
  const lotNumber = data.lotNumber || `LOT-2026-${String(nextNum).padStart(4, "0")}`;

  const availableStock = Number(data.availableStock) || 0;
  const allocatedStock = Number(data.allocatedStock) || 0;
  const totalStock = availableStock + allocatedStock;

  const insertId = await MySQL.insert("inventory_items", {
    uuid: crypto.randomUUID(),
    sku,
    name: data.name || "Cotton Fleece Lot",
    category: data.category || "fabric",
    unit: data.unit || "kg",
    unit_cost: Number(data.unitCost) || 0,
    total_stock: totalStock,
    available_stock: availableStock,
    allocated_stock: allocatedStock,
    min_reorder_level: Number(data.reorderPoint) || 100,
    bay: data.bay || "bay1",
    lot_number: lotNumber,
    is_archived: 0,
  });

  return String(insertId);
}

export async function updateInventoryItemInMySQL(id: string, data: Partial<InventoryItem>): Promise<boolean> {
  const payload: Record<string, any> = {};

  if (data.name) payload.name = data.name;
  if (data.sku) payload.sku = data.sku;
  if (data.lotNumber) payload.lot_number = data.lotNumber;
  if (data.category) payload.category = data.category;
  if (data.unit) payload.unit = data.unit;
  if (data.unitCost !== undefined) payload.unit_cost = Number(data.unitCost);
  if (data.bay) payload.bay = data.bay;
  if (data.reorderPoint !== undefined) payload.min_reorder_level = Number(data.reorderPoint);

  if (data.availableStock !== undefined || data.allocatedStock !== undefined) {
    const rows = await executeQuery<any>("SELECT * FROM `inventory_items` WHERE `id` = ?", [id]);
    const current = rows[0] || {};
    const avail = data.availableStock !== undefined ? Number(data.availableStock) : Number(current.available_stock || 0);
    const alloc = data.allocatedStock !== undefined ? Number(data.allocatedStock) : Number(current.allocated_stock || 0);
    payload.available_stock = avail;
    payload.allocated_stock = alloc;
    payload.total_stock = avail + alloc;
  }

  if (data.isArchived !== undefined) payload.is_archived = data.isArchived ? 1 : 0;

  return MySQL.update("inventory_items", id, payload);
}

export async function deleteInventoryItemInMySQL(id: string): Promise<boolean> {
  return MySQL.delete("inventory_items", id, true);
}

export async function recordStockMovementInMySQL(movement: {
  inventoryItemId: string;
  type: string; // "in" | "transfer" | "scrap" | "correction" | "issuance"
  quantity: number;
  bay?: string;
  toBay?: string;
  notes?: string;
  actor?: string;
}): Promise<string> {
  const rows = await executeQuery<any>("SELECT * FROM `inventory_items` WHERE `id` = ?", [movement.inventoryItemId]);
  const item = rows[0];

  const prevStock = item ? Number(item.available_stock || 0) : 0;
  const qty = Number(movement.quantity) || 0;
  let newStock = prevStock;

  if (movement.type === "in") {
    newStock = prevStock + qty;
  } else if (movement.type === "issuance" || movement.type === "scrap") {
    newStock = Math.max(0, prevStock - qty);
  } else if (movement.type === "correction") {
    newStock = qty;
  }

  // Update item stock in inventory_items
  if (item) {
    const payload: Record<string, any> = {
      available_stock: newStock,
      total_stock: newStock + Number(item.allocated_stock || 0),
    };
    if (movement.toBay) payload.bay = movement.toBay;
    await MySQL.update("inventory_items", movement.inventoryItemId, payload);
  }

  // Insert movement record
  const countRows = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `stock_movements`");
  const movNum = `MOV-2026-${String((countRows[0]?.cnt || 0) + 1).padStart(4, "0")}`;

  const insertId = await MySQL.insert("stock_movements", {
    uuid: crypto.randomUUID(),
    movement_number: movNum,
    inventory_item_id: Number(movement.inventoryItemId),
    movement_type: movement.type,
    quantity: qty,
    previous_stock: prevStock,
    new_stock: newStock,
    reference_type: movement.type === "transfer" ? "bay_transfer" : "stock_adjustment",
    reference_id: movNum,
    actor: movement.actor || "Warehouse Manager",
    notes: movement.notes || `${movement.type.toUpperCase()}: ${qty} units processed.`,
  });

  return String(insertId);
}

export async function getInventoryMetricsFromMySQL() {
  const items = await getInventoryFromMySQL();
  const totalStockValuation = items.reduce((acc, i) => acc + (i.availableStock * (i.unitCost || 0)), 0);
  const fabricStockOnHandKg = items
    .filter((i) => i.category === "fabric")
    .reduce((acc, i) => acc + (i.availableStock || 0), 0);
  const allocatedToCuttingKg = items
    .filter((i) => i.category === "fabric")
    .reduce((acc, i) => acc + (i.allocatedStock || 0), 0);
  const lowStockCount = items.filter((i) => i.health === "low" || i.health === "critical").length;

  return {
    totalStockValuation,
    fabricStockOnHandKg,
    allocatedToCuttingKg,
    lowStockCount,
  };
}

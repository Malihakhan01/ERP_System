// lib/services/inventory-service.ts
// MySQL 8 Database Service Layer for FactoryOS Warehouse & Inventory

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  lotNumber: string;
  category: "fabric" | "trims" | "packaging";
  materialId?: string;
  bay: string;
  availableStock: number;
  allocatedStock: number;
  unit: string;
  unitCost: number;
  reorderPoint: number;
  health: "healthy" | "low" | "critical";
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface StockMovementRecord {
  id: string;
  itemId?: string;
  inventoryItemId?: string;
  itemName: string;
  sku: string;
  type: "in" | "transfer" | "scrap" | "correction" | "issuance" | "issue";
  quantity: number;
  unit: string;
  fromBay?: string;
  toBay: string;
  timestamp: string;
  notes?: string;
}

export const INVENTORY_STORAGE_KEY = "factoryos_inventory_items";
export const MOVEMENTS_STORAGE_KEY = "factoryos_stock_movements";

export async function getInventoryFromSupabase(): Promise<InventoryItem[]> {
  try {
    const res = await fetch("/api/inventory");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(json.data));
      }
      return json.data;
    }
  } catch (err) {
    console.error("Error loading inventory from MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return [];
}

export async function getStockMovementsFromSupabase(): Promise<StockMovementRecord[]> {
  try {
    const res = await fetch("/api/inventory?type=movements");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(json.data));
      }
      return json.data;
    }
  } catch (err) {
    console.error("Error loading stock movements from MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return [];
}

export async function createInventoryItemInSupabase(item: InventoryItem): Promise<InventoryItem> {
  try {
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      item.id = String(json.data.id);
    }
  } catch (err) {
    console.error("Error creating inventory item via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
      const list: InventoryItem[] = raw ? JSON.parse(raw) : [];
      const updated = [item, ...list.filter((i) => i.id !== item.id && i.sku !== item.sku)];
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return item;
}

export async function updateInventoryItemInSupabase(item: InventoryItem): Promise<InventoryItem> {
  try {
    await fetch(`/api/inventory/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
  } catch (err) {
    console.error("Error updating inventory item via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
      const list: InventoryItem[] = raw ? JSON.parse(raw) : [];
      const updated = list.map((i) => (i.id === item.id || i.sku === item.sku ? item : i));
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return item;
}

export async function recordStockMovementInSupabase(movement: StockMovementRecord): Promise<StockMovementRecord> {
  try {
    const res = await fetch("/api/inventory/movement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inventoryItemId: movement.inventoryItemId || movement.itemId,
        type: movement.type,
        quantity: movement.quantity,
        toBay: movement.toBay,
        notes: movement.notes,
      }),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      movement.id = String(json.data.id);
    }
  } catch (err) {
    console.error("Error recording stock movement via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
      const list: StockMovementRecord[] = raw ? JSON.parse(raw) : [];
      const updated = [movement, ...list.filter((m) => m.id !== movement.id)];
      localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return movement;
}

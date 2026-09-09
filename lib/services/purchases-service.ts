// lib/services/purchases-service.ts
// MySQL 8 Database Service Layer for FactoryOS Procurement & Purchase Orders

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  orderDate: string;
  expectedDate: string;
  material: string;
  materialId?: string;
  quantity: string;
  unit: string;
  rate: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  paymentTerms: "adv_50" | "net_30" | "cod" | "full_advance";
  status: "draft" | "confirmed" | "partial" | "received";
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const PURCHASES_STORAGE_KEY = "factoryos_purchase_orders";

export async function getPurchasesFromDB(): Promise<PurchaseOrder[]> {
  try {
    const res = await fetch("/api/purchases");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(json.data));
      }
      return json.data;
    }
  } catch (err) {
    console.error("Error loading purchases from MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PURCHASES_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return [];
}

export async function createPurchaseInDB(po: PurchaseOrder): Promise<PurchaseOrder> {
  try {
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(po),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      po.id = String(json.data.id);
    }
  } catch (err) {
    console.error("Error creating purchase via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PURCHASES_STORAGE_KEY);
      const list: PurchaseOrder[] = raw ? JSON.parse(raw) : [];
      const updated = [po, ...list.filter((p) => p.id !== po.id && p.poNumber !== po.poNumber)];
      localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return po;
}

export async function updatePurchaseInDB(po: PurchaseOrder): Promise<PurchaseOrder> {
  try {
    await fetch(`/api/purchases/${po.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(po),
    });
  } catch (err) {
    console.error("Error updating purchase via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PURCHASES_STORAGE_KEY);
      const list: PurchaseOrder[] = raw ? JSON.parse(raw) : [];
      const updated = list.map((p) => (p.id === po.id || p.poNumber === po.poNumber ? po : p));
      localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return po;
}

export async function deletePurchaseInDB(id: string, poNumber?: string): Promise<boolean> {
  try {
    await fetch(`/api/purchases/${id}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Error deleting purchase via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PURCHASES_STORAGE_KEY);
      const list: PurchaseOrder[] = raw ? JSON.parse(raw) : [];
      const updated = list.filter((p) => p.id !== id && (poNumber ? p.poNumber !== poNumber : true));
      localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return true;
}

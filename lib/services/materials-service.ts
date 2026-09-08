// lib/services/materials-service.ts
// MySQL 8 Database Service Layer for FactoryOS Raw Materials

export interface RawMaterial {
  id: string;
  materialCode: string;
  name: string;
  category: "fabric" | "trims" | "labels" | "packaging";
  color: string;
  uom: "kg" | "meters" | "pieces" | "gross" | "rolls";
  gsm?: string;
  unitCost: string;
  reorderPoint: string;
  location: string;
  currentStock: string;
  status: "normal" | "low" | "critical";
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const MATERIALS_STORAGE_KEY = "factoryos_raw_materials";

export async function getMaterialsFromSupabase(): Promise<RawMaterial[]> {
  try {
    const res = await fetch("/api/materials");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(json.data));
      }
      return json.data;
    }
  } catch (err) {
    console.error("Error loading materials from MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(MATERIALS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return [];
}

export async function createMaterialInSupabase(material: RawMaterial): Promise<RawMaterial> {
  try {
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(material),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      material.id = String(json.data.id);
    }
  } catch (err) {
    console.error("Error creating material via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(MATERIALS_STORAGE_KEY);
      const list: RawMaterial[] = raw ? JSON.parse(raw) : [];
      const updated = [material, ...list.filter((m) => m.id !== material.id && m.materialCode !== material.materialCode)];
      localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return material;
}

export async function updateMaterialInSupabase(material: RawMaterial): Promise<RawMaterial> {
  try {
    await fetch(`/api/materials/${material.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(material),
    });
  } catch (err) {
    console.error("Error updating material via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(MATERIALS_STORAGE_KEY);
      const list: RawMaterial[] = raw ? JSON.parse(raw) : [];
      const updated = list.map((m) => (m.id === material.id || m.materialCode === material.materialCode ? material : m));
      localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return material;
}

export async function deleteMaterialInSupabase(id: string, materialCode?: string): Promise<boolean> {
  try {
    await fetch(`/api/materials/${id}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Error deleting material via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(MATERIALS_STORAGE_KEY);
      const list: RawMaterial[] = raw ? JSON.parse(raw) : [];
      const updated = list.filter((m) => m.id !== id && (materialCode ? m.materialCode !== materialCode : true));
      localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return true;
}

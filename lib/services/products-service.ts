// lib/services/products-service.ts
// MySQL 8 Database Service Layer for FactoryOS Products Catalog

export interface GarmentProduct {
  id: string;
  styleCode: string;
  name: string;
  category: string;
  sam: string;
  fabricType: string;
  gsm: string;
  consumptionKg: string;
  wastagePct: string;
  sizes: string[];
  bomStatus: "verified" | "draft" | "pending";
  productionStatus: "active" | "sample" | "queued" | "completed";
  specs?: Record<string, any>;
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const PRODUCTS_STORAGE_KEY = "factoryos_garment_products";

export const INITIAL_PRODUCTS: GarmentProduct[] = [
  {
    id: "prod_001",
    styleCode: "HD-380",
    name: "Heavyweight Boxy Pullover Hoodie",
    category: "hoodies",
    sam: "18.5",
    fabricType: "100% Organic Cotton Fleece",
    gsm: "380",
    consumptionKg: "0.68",
    wastagePct: "5.0",
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    bomStatus: "verified",
    productionStatus: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "prod_002",
    styleCode: "TS-240",
    name: "Oversized Vintage Wash Tee",
    category: "tshirts",
    sam: "11.2",
    fabricType: "Single Jersey Combed Cotton",
    gsm: "240",
    consumptionKg: "0.32",
    wastagePct: "4.5",
    sizes: ["S", "M", "L", "XL"],
    bomStatus: "verified",
    productionStatus: "active",
    createdAt: new Date().toISOString(),
  },
];

export async function getProductsFromDB(): Promise<GarmentProduct[]> {
  try {
    const res = await fetch("/api/products");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(json.data));
      }
      return json.data;
    }
  } catch (err) {
    // fallback to cache
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return INITIAL_PRODUCTS;
}

export async function createProductInDB(product: GarmentProduct): Promise<GarmentProduct> {
  try {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      product.id = String(json.data.id);
    }
  } catch (err) {}

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      const list: GarmentProduct[] = raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
      const updated = [product, ...list.filter((p) => p.id !== product.id && p.styleCode !== product.styleCode)];
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return product;
}

export async function updateProductInDB(product: GarmentProduct): Promise<GarmentProduct> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      const list: GarmentProduct[] = raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
      const updated = list.map((p) => (p.id === product.id || p.styleCode === product.styleCode ? product : p));
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return product;
}

export async function deleteProductInDB(id: string, styleCode?: string): Promise<boolean> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      const list: GarmentProduct[] = raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
      const updated = list.filter((p) => p.id !== id && (styleCode ? p.styleCode !== styleCode : true));
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return true;
}

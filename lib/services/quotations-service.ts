// lib/services/quotations-service.ts
// MySQL 8 Database Service Layer for FactoryOS Commercial Quotations

import type { QuotationRecord } from "../quotations-engine";
import { QUOTATION_STORAGE_KEY, INITIAL_QUOTATIONS } from "../quotations-engine";

export async function getQuotationsFromSupabase(): Promise<QuotationRecord[]> {
  try {
    const res = await fetch("/api/quotations");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(json.data));
      }
      return json.data;
    }
  } catch (err) {
    console.error("Error loading quotations from MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(QUOTATION_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return INITIAL_QUOTATIONS;
}

export async function createQuotationInSupabase(quotation: QuotationRecord): Promise<QuotationRecord> {
  try {
    const res = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quotation),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      quotation.id = String(json.data.id);
    }
  } catch (err) {
    console.error("Error creating quotation via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(QUOTATION_STORAGE_KEY);
      const list: QuotationRecord[] = raw ? JSON.parse(raw) : INITIAL_QUOTATIONS;
      const updated = [quotation, ...list.filter((q) => q.id !== quotation.id && q.quotationNumber !== quotation.quotationNumber)];
      localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return quotation;
}

export async function updateQuotationInSupabase(quotation: QuotationRecord): Promise<QuotationRecord> {
  try {
    await fetch(`/api/quotations/${quotation.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quotation),
    });
  } catch (err) {
    console.error("Error updating quotation via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(QUOTATION_STORAGE_KEY);
      const list: QuotationRecord[] = raw ? JSON.parse(raw) : INITIAL_QUOTATIONS;
      const updated = list.map((q) => (q.id === quotation.id || q.quotationNumber === quotation.quotationNumber ? quotation : q));
      localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return quotation;
}

export async function deleteQuotationInSupabase(id: string, quotationNumber?: string): Promise<boolean> {
  try {
    await fetch(`/api/quotations/${id}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Error deleting quotation via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(QUOTATION_STORAGE_KEY);
      const list: QuotationRecord[] = raw ? JSON.parse(raw) : INITIAL_QUOTATIONS;
      const updated = list.filter((q) => q.id !== id && (quotationNumber ? q.quotationNumber !== quotationNumber : true));
      localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return true;
}

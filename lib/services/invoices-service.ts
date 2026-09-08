// lib/services/invoices-service.ts
// MySQL 8 Database Service Layer for FactoryOS Commercial Invoices & Billing

import type { InvoiceRecord, PaymentRecord } from "../invoices-engine";
import { INVOICE_STORAGE_KEY, INITIAL_INVOICES } from "../invoices-engine";

export async function getInvoicesFromSupabase(): Promise<InvoiceRecord[]> {
  try {
    const res = await fetch("/api/invoices");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(json.data));
      }
      return json.data;
    }
  } catch (err) {
    console.error("Error loading invoices from MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(INVOICE_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return INITIAL_INVOICES;
}

export async function createInvoiceInSupabase(invoice: InvoiceRecord): Promise<InvoiceRecord> {
  try {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoice),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      invoice.id = String(json.data.id);
    }
  } catch (err) {
    console.error("Error creating invoice via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(INVOICE_STORAGE_KEY);
      const list: InvoiceRecord[] = raw ? JSON.parse(raw) : INITIAL_INVOICES;
      const updated = [invoice, ...list.filter((i) => i.id !== invoice.id && i.invoiceNumber !== invoice.invoiceNumber)];
      localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return invoice;
}

export async function updateInvoiceInSupabase(invoice: InvoiceRecord): Promise<InvoiceRecord> {
  try {
    await fetch(`/api/invoices/${invoice.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoice),
    });
  } catch (err) {
    console.error("Error updating invoice via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(INVOICE_STORAGE_KEY);
      const list: InvoiceRecord[] = raw ? JSON.parse(raw) : INITIAL_INVOICES;
      const updated = list.map((i) => (i.id === invoice.id || i.invoiceNumber === invoice.invoiceNumber ? invoice : i));
      localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return invoice;
}

export async function recordInvoicePaymentInSupabase(
  invoiceId: string,
  payment: PaymentRecord,
  updatedInvoice: InvoiceRecord
): Promise<boolean> {
  try {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedInvoice),
    });
  } catch (err) {
    console.error("Error recording invoice payment via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(INVOICE_STORAGE_KEY);
      const list: InvoiceRecord[] = raw ? JSON.parse(raw) : INITIAL_INVOICES;
      const updated = list.map((i) => (i.id === invoiceId || i.invoiceNumber === updatedInvoice.invoiceNumber ? updatedInvoice : i));
      localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return true;
}

export async function archiveInvoiceInSupabase(id: string): Promise<boolean> {
  try {
    await fetch(`/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: true }),
    });
  } catch (err) {
    console.error("Error archiving invoice via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(INVOICE_STORAGE_KEY);
      const list: InvoiceRecord[] = raw ? JSON.parse(raw) : INITIAL_INVOICES;
      const updated = list.map((i) => (i.id === id ? { ...i, isArchived: true } : i));
      localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return true;
}

export async function deleteInvoiceInSupabase(id: string, invoiceNumber?: string): Promise<boolean> {
  try {
    await fetch(`/api/invoices/${id}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Error deleting invoice via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(INVOICE_STORAGE_KEY);
      const list: InvoiceRecord[] = raw ? JSON.parse(raw) : INITIAL_INVOICES;
      const updated = list.filter((i) => i.id !== id && (invoiceNumber ? i.invoiceNumber !== invoiceNumber : true));
      localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return true;
}

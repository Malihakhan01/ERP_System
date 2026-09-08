/**
 * FactoryOS Garment ERP — Commercial Invoices MySQL 8 Repository
 * Connects /invoices with live MySQL `invoices` table.
 */

import { executeQuery, MySQL } from "./db";
import type { InvoiceRecord, InvoiceStatus, PaymentStatus, InvoiceType } from "@/lib/invoices-engine";
import type { CommercialCurrency } from "@/lib/orders-engine";

export async function getInvoicesFromMySQL(): Promise<InvoiceRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `invoices` WHERE `is_archived` = 0 ORDER BY `created_at` DESC"
  );

  return rows.map((r) => {
    let payments: any[] = [];
    try {
      if (r.notes && r.notes.startsWith("{")) {
        const parsed = JSON.parse(r.notes);
        if (parsed.payments) payments = parsed.payments;
      }
    } catch {}

    const total = Number(r.grand_total || 0);
    const paid = Number(r.paid_amount || 0);
    const balance = Number(r.balance_due ?? (total - paid));

    return {
      id: String(r.id),
      invoiceNumber: r.invoice_number,
      clientId: String(r.client_id || 1),
      clientDisplayId: r.client_display_id || `CLT-2026-${String(r.client_id || 1).padStart(3, "0")}`,
      clientName: r.client_name,
      clientCountry: r.client_country || "United Kingdom",
      clientContact: r.client_contact || undefined,
      clientEmail: r.client_email || undefined,
      orderId: r.order_id ? String(r.order_id) : undefined,
      orderNumber: r.order_number || undefined,
      invoiceDate: r.issue_date ? new Date(r.issue_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      dueDate: r.due_date ? new Date(r.due_date).toISOString().split("T")[0] : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      invoiceType: (r.invoice_type || "Export Commercial Invoice") as InvoiceType,
      currency: (r.currency || "USD") as CommercialCurrency,
      paymentTerms: r.payment_terms || "30% Advance TT / 70% LC at Sight",
      incoterms: r.incoterms || "FOB Sialkot / Karachi",
      garmentStyle: r.style_code || "HD-001",
      styleName: r.style_name || "Heavyweight Hoodie",
      description: "Export Garment Manufacturing & Supply",
      quantity: Number(r.quantity || 0),
      unitPrice: Number(r.unit_price || 0),
      subtotal: Number(r.subtotal || 0),
      discount: Number(r.discount || 0),
      freightCharges: Number(r.freight_charges || 0),
      tax: Number(r.tax || 0),
      grandTotal: total,
      amountPaid: paid,
      balanceDue: balance,
      paymentStatus: (r.payment_status || "pending") as PaymentStatus,
      status: (r.status || "draft") as InvoiceStatus,
      payments,
      notes: r.notes && !r.notes.startsWith("{") ? r.notes : undefined,
      timeline: [
        {
          id: `evt_inv_${r.id}`,
          title: "Commercial Invoice Registered",
          description: `Invoice ${r.invoice_number} created for ${r.client_name}.`,
          timestamp: new Date(r.created_at || Date.now()).toISOString().replace("T", " ").substring(0, 19),
          type: "created",
        },
      ],
      isArchived: Boolean(r.is_archived),
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
    };
  });
}

export async function getInvoiceByIdFromMySQL(id: string): Promise<InvoiceRecord | null> {
  const rows = await executeQuery<any>("SELECT * FROM `invoices` WHERE `id` = ?", [id]);
  if (!rows || rows.length === 0) return null;
  const list = await getInvoicesFromMySQL();
  return list.find((inv) => inv.id === String(id)) || null;
}

export async function createInvoiceInMySQL(data: Partial<InvoiceRecord>): Promise<string> {
  const countRows = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `invoices`");
  const nextNum = (countRows[0]?.cnt || 0) + 1;
  const invNum = data.invoiceNumber || `INV-2026-${String(nextNum).padStart(3, "0")}`;

  const quantity = Number(data.quantity) || 1000;
  const unitPrice = Number(data.unitPrice) || 14.5;
  const subtotal = quantity * unitPrice;
  const discount = Number(data.discount) || 0;
  const freight = Number(data.freightCharges) || 0;
  const tax = Number(data.tax) || 0;
  const grandTotal = data.grandTotal || (subtotal - discount + freight + tax);
  const amountPaid = Number(data.amountPaid) || 0;
  const balanceDue = grandTotal - amountPaid;

  const insertId = await MySQL.insert("invoices", {
    uuid: crypto.randomUUID(),
    invoice_number: invNum,
    client_id: data.clientId ? Number(data.clientId) : 1,
    client_display_id: data.clientDisplayId || "CLT-2026-001",
    client_name: data.clientName || "Nordic Streetwear AB",
    client_country: data.clientCountry || "Sweden",
    client_contact: data.clientContact || null,
    client_email: data.clientEmail || null,
    order_id: data.orderId ? Number(data.orderId) : null,
    order_number: data.orderNumber || null,
    issue_date: data.invoiceDate || new Date().toISOString().split("T")[0],
    due_date: data.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    invoice_type: data.invoiceType || "Export Commercial Invoice",
    currency: data.currency || "USD",
    payment_terms: data.paymentTerms || "30% Advance TT / 70% LC at Sight",
    incoterms: data.incoterms || "FOB Sialkot / Karachi",
    style_code: data.garmentStyle || "HD-001",
    style_name: data.styleName || "Heavyweight Hoodie",
    quantity,
    unit_price: unitPrice,
    subtotal,
    discount,
    freight_charges: freight,
    tax,
    grand_total: grandTotal,
    paid_amount: amountPaid,
    balance_due: balanceDue,
    payment_status: data.paymentStatus || (amountPaid >= grandTotal ? "paid" : amountPaid > 0 ? "partially_paid" : "pending"),
    status: data.status || "issued",
    notes: data.notes || null,
    is_archived: 0,
  });

  return String(insertId);
}

export async function updateInvoiceInMySQL(id: string, data: Partial<InvoiceRecord>): Promise<boolean> {
  const payload: Record<string, any> = {};

  if (data.status) payload.status = data.status;
  if (data.paymentStatus) payload.payment_status = data.paymentStatus;
  if (data.amountPaid !== undefined) {
    payload.paid_amount = data.amountPaid;
    if (data.grandTotal !== undefined) {
      payload.balance_due = data.grandTotal - data.amountPaid;
    }
  }
  if (data.grandTotal !== undefined) payload.grand_total = data.grandTotal;
  if (data.dueDate) payload.due_date = data.dueDate;
  if (data.isArchived !== undefined) payload.is_archived = data.isArchived ? 1 : 0;

  return MySQL.update("invoices", id, payload);
}

export async function deleteInvoiceInMySQL(id: string): Promise<boolean> {
  return MySQL.delete("invoices", id, true);
}

export async function getInvoiceMetricsFromMySQL() {
  const invoices = await getInvoicesFromMySQL();
  const totalInvoices = invoices.length;
  const totalInvoicedAmount = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const totalPaidRevenue = invoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);
  const totalReceivablesDue = invoices.reduce((acc, inv) => acc + (inv.balanceDue || 0), 0);
  const pendingInvoicesCount = invoices.filter((inv) => inv.paymentStatus !== "paid").length;

  return {
    totalInvoices,
    totalInvoicedAmount,
    totalPaidRevenue,
    totalReceivablesDue,
    pendingInvoicesCount,
  };
}

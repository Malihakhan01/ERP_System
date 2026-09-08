/**
 * FactoryOS Garment ERP — Commercial Quotations MySQL 8 Repository
 * Connects /quotations with live MySQL `quotations` table.
 */

import { executeQuery, MySQL } from "./db";
import type { QuotationRecord, QuotationStatus, QuotationType, CommercialCurrency } from "@/lib/quotations-engine";

export async function getQuotationsFromMySQL(): Promise<QuotationRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `quotations` WHERE `is_archived` = 0 ORDER BY `created_at` DESC"
  );

  return rows.map((r) => ({
    id: String(r.id),
    quotationNumber: r.quotation_number,
    clientId: String(r.client_id || 1),
    clientDisplayId: r.client_display_id || `CLT-2026-${String(r.client_id || 1).padStart(3, "0")}`,
    clientName: r.client_name,
    clientCountry: r.client_country || "United Kingdom",
    clientContact: r.client_contact || undefined,
    clientEmail: r.client_email || undefined,
    quotationDate: r.issue_date ? new Date(r.issue_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    validUntil: r.valid_until ? new Date(r.valid_until).toISOString().split("T")[0] : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    quotationType: (r.quotation_type || "Export Bulk Proposal") as QuotationType,
    currency: (r.currency || "USD") as CommercialCurrency,
    status: (r.status || "draft") as QuotationStatus,
    garmentStyle: r.style_code || "HD-001",
    styleName: r.style_name || "Heavyweight Premium Hoodie",
    productCategory: r.product_category || "Hoodies & Sweatshirts",
    fabric: r.fabric_details || "100% Combed Cotton Fleece",
    gsm: r.target_gsm || "320 GSM",
    color: r.colorway || "Black",
    quantity: Number(r.quantity || 0),
    unitPrice: Number(r.unit_price || 0),
    subtotal: Number(r.subtotal || 0),
    discount: Number(r.discount || 0),
    freightCharges: Number(r.freight_charges || 0),
    tax: Number(r.tax || 0),
    grandTotal: Number(r.grand_total || 0),
    paymentTerms: r.payment_terms || "30% Advance TT / 70% LC at Sight",
    incoterms: r.incoterms || "FOB Sialkot / Karachi",
    orderId: r.converted_to_order_number || undefined,
    internalNotes: r.notes || undefined,
    timeline: [
      {
        id: `evt_qt_${r.id}`,
        title: "Price Proposal Created",
        description: `Quotation ${r.quotation_number} generated for ${r.client_name}.`,
        timestamp: new Date(r.created_at || Date.now()).toISOString().replace("T", " ").substring(0, 19),
        type: "created",
      },
    ],
    isArchived: Boolean(r.is_archived),
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  }));
}

export async function getQuotationByIdFromMySQL(id: string): Promise<QuotationRecord | null> {
  const rows = await executeQuery<any>("SELECT * FROM `quotations` WHERE `id` = ?", [id]);
  if (!rows || rows.length === 0) return null;
  const list = await getQuotationsFromMySQL();
  return list.find((q) => q.id === String(id)) || null;
}

export async function createQuotationInMySQL(data: Partial<QuotationRecord>): Promise<string> {
  const countRows = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `quotations`");
  const nextNum = (countRows[0]?.cnt || 0) + 1;
  const quoteNum = data.quotationNumber || `QT-2026-${String(nextNum).padStart(3, "0")}`;

  const quantity = Number(data.quantity) || 1000;
  const unitPrice = Number(data.unitPrice) || 14.5;
  const subtotal = quantity * unitPrice;
  const discount = Number(data.discount) || 0;
  const freight = Number(data.freightCharges) || 0;
  const tax = Number(data.tax) || 0;
  const grandTotal = data.grandTotal || (subtotal - discount + freight + tax);

  const insertId = await MySQL.insert("quotations", {
    uuid: crypto.randomUUID(),
    quotation_number: quoteNum,
    client_id: data.clientId ? Number(data.clientId) : 1,
    client_display_id: data.clientDisplayId || "CLT-2026-001",
    client_name: data.clientName || "Nordic Streetwear AB",
    client_country: data.clientCountry || "Sweden",
    client_contact: data.clientContact || null,
    client_email: data.clientEmail || null,
    issue_date: data.quotationDate || new Date().toISOString().split("T")[0],
    valid_until: data.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    quotation_type: data.quotationType || "Export Bulk Proposal",
    currency: data.currency || "USD",
    status: data.status || "draft",
    style_code: data.garmentStyle || "HD-001",
    style_name: data.styleName || "Heavyweight Premium Hoodie",
    product_category: data.productCategory || "Hoodies & Sweatshirts",
    fabric_details: data.fabric || "100% Combed Cotton Fleece",
    target_gsm: data.gsm || "320 GSM",
    colorway: data.color || "Black",
    quantity,
    unit_price: unitPrice,
    subtotal,
    discount,
    freight_charges: freight,
    tax,
    grand_total: grandTotal,
    payment_terms: data.paymentTerms || "30% Advance TT / 70% LC at Sight",
    incoterms: data.incoterms || "FOB Sialkot / Karachi",
    notes: data.internalNotes || null,
    is_archived: 0,
  });

  return String(insertId);
}

export async function updateQuotationInMySQL(id: string, data: Partial<QuotationRecord>): Promise<boolean> {
  const payload: Record<string, any> = {};

  if (data.status) payload.status = data.status;
  if (data.quantity !== undefined) payload.quantity = data.quantity;
  if (data.unitPrice !== undefined) payload.unit_price = data.unitPrice;
  if (data.grandTotal !== undefined) payload.grand_total = data.grandTotal;
  if (data.orderId) payload.converted_to_order_number = data.orderId;
  if (data.isArchived !== undefined) payload.is_archived = data.isArchived ? 1 : 0;

  return MySQL.update("quotations", id, payload);
}

export async function deleteQuotationInMySQL(id: string): Promise<boolean> {
  return MySQL.delete("quotations", id, true);
}

export async function getQuotationMetricsFromMySQL() {
  const quotations = await getQuotationsFromMySQL();
  const totalQuotations = quotations.length;
  const openProposals = quotations.filter((q) => q.status === "sent" || q.status === "under_review").length;
  const acceptedValue = quotations.filter((q) => q.status === "accepted").reduce((acc, q) => acc + (q.grandTotal || 0), 0);
  const totalProposalValue = quotations.reduce((acc, q) => acc + (q.grandTotal || 0), 0);

  return {
    totalQuotations,
    openProposals,
    acceptedValue,
    totalProposalValue,
  };
}

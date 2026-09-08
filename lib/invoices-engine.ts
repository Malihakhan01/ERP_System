// lib/invoices-engine.ts
// Domain interfaces, deterministic calculation formulas, payment reconciliation, and cross-module synchronization for FactoryOS Invoices Module

import { ClientRecord, CLIENT_STORAGE_KEY } from "./clients-engine";
import { CommercialCurrency } from "./orders-engine";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "on_hold";

export type InvoiceType =
  | "Export Commercial Invoice"
  | "Proforma Invoice"
  | "Sample Development Invoice"
  | "Debit Note"
  | "Credit Settlement";

export interface PaymentRecord {
  paymentId: string;
  paymentDate: string; // YYYY-MM-DD
  amount: number;
  currency: CommercialCurrency;
  paymentMethod: string;
  referenceNumber: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface InvoiceTimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type:
    | "created"
    | "issued"
    | "updated"
    | "payment"
    | "status_change"
    | "overdue"
    | "archived"
    | "cancelled";
  author?: string;
  reference?: string;
}

export interface InvoicePricingBreakdown {
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  freightCharges: number;
  tax: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
}

export interface InvoiceRecord {
  id: string; // Immutable internal ID, e.g. "inv_001"
  invoiceNumber: string; // Read-only auto-generated display ID, e.g. "INV-2026-001"
  clientId: string; // Authoritative internal client foreign key
  clientDisplayId: string; // e.g. "CLT-2026-001"
  clientName: string;
  clientCountry: string;
  clientContact?: string;
  clientEmail?: string;

  orderId?: string; // Internal Order ID, e.g. "ord_001"
  orderNumber?: string; // Display Order Number, e.g. "ORD-2026-001"
  quotationId?: string; // Internal Quotation ID, e.g. "qt_001"
  quotationNumber?: string; // Display Quotation Number, e.g. "QT-2026-001"

  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  invoiceType: InvoiceType;
  currency: CommercialCurrency;
  paymentTerms: string;
  incoterms?: string;
  buyerPoRef?: string;

  // Commercial Items
  garmentStyle?: string;
  styleName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  freightCharges: number;
  tax: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;

  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  payments: PaymentRecord[];
  notes?: string;

  timeline: InvoiceTimelineEvent[];
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
}

export const INVOICE_STORAGE_KEY = "factoryos_invoices";

// Deterministic pricing calculation with safety guards against NaN, Infinity, negative values
export function calculateInvoicePricing(
  quantityRaw: number | string,
  unitPriceRaw: number | string,
  discountRaw: number | string = 0,
  freightChargesRaw: number | string = 0,
  taxRaw: number | string = 0,
  amountPaidRaw: number | string = 0
): InvoicePricingBreakdown {
  const qtyNum = typeof quantityRaw === "number" ? quantityRaw : parseFloat(String(quantityRaw).trim());
  const priceNum = typeof unitPriceRaw === "number" ? unitPriceRaw : parseFloat(String(unitPriceRaw).trim());
  const discNum = typeof discountRaw === "number" ? discountRaw : parseFloat(String(discountRaw).trim() || "0");
  const freightNum =
    typeof freightChargesRaw === "number" ? freightChargesRaw : parseFloat(String(freightChargesRaw).trim() || "0");
  const taxNum = typeof taxRaw === "number" ? taxRaw : parseFloat(String(taxRaw).trim() || "0");
  const paidNum = typeof amountPaidRaw === "number" ? amountPaidRaw : parseFloat(String(amountPaidRaw).trim() || "0");

  const quantity = isNaN(qtyNum) || !isFinite(qtyNum) || qtyNum < 0 ? 0 : Math.floor(qtyNum);
  const unitPrice = isNaN(priceNum) || !isFinite(priceNum) || priceNum < 0 ? 0 : Number(priceNum.toFixed(2));
  const subtotal = Number((quantity * unitPrice).toFixed(2));

  const validDiscount =
    isNaN(discNum) || !isFinite(discNum) || discNum < 0 ? 0 : Math.min(Number(discNum.toFixed(2)), subtotal);
  const validFreight = isNaN(freightNum) || !isFinite(freightNum) || freightNum < 0 ? 0 : Number(freightNum.toFixed(2));
  const validTax = isNaN(taxNum) || !isFinite(taxNum) || taxNum < 0 ? 0 : Number(taxNum.toFixed(2));

  const grandTotal = Number((subtotal - validDiscount + validFreight + validTax).toFixed(2));
  const safePaid = isNaN(paidNum) || !isFinite(paidNum) || paidNum < 0 ? 0 : Math.min(Number(paidNum.toFixed(2)), grandTotal);
  const balanceDue = Number(Math.max(0, grandTotal - safePaid).toFixed(2));

  return {
    quantity,
    unitPrice,
    subtotal,
    discount: validDiscount,
    freightCharges: validFreight,
    tax: validTax,
    grandTotal,
    amountPaid: safePaid,
    balanceDue,
  };
}

// Safety helper: Check if invoice has active financial or transactional history preventing hard deletion
export function hasInvoiceTransactionalLinks(invoice: InvoiceRecord): boolean {
  const hasPayments = Array.isArray(invoice.payments) && invoice.payments.length > 0;
  const hasPaidAmount = (invoice.amountPaid || 0) > 0;
  const hasOrder = Boolean(invoice.orderId || invoice.orderNumber);
  const hasQuotation = Boolean(invoice.quotationId || invoice.quotationNumber);
  const isIssuedOrPaid = invoice.status === "issued" || invoice.status === "partially_paid" || invoice.status === "paid";

  return hasPayments || hasPaidAmount || hasOrder || hasQuotation || isIssuedOrPaid;
}

// Evaluate overdue condition dynamically based on due date and balance due
export function evaluateInvoiceOverdue(invoice: InvoiceRecord, todayStr?: string): InvoiceRecord {
  const today = todayStr || new Date().toISOString().split("T")[0];
  if (invoice.isArchived || invoice.status === "cancelled" || invoice.status === "draft" || invoice.status === "paid") {
    return invoice;
  }

  if (invoice.balanceDue > 0 && invoice.dueDate && today > invoice.dueDate) {
    return {
      ...invoice,
      status: "overdue",
      paymentStatus: "overdue",
    };
  }

  return invoice;
}

// Synchronize Client CRM billing summary with active non-archived non-draft invoices
export function syncClientWithInvoices(invoices: InvoiceRecord[]) {
  if (typeof window === "undefined") return;
  try {
    const rawClients = localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!rawClients) return;
    const clients: ClientRecord[] = JSON.parse(rawClients);

    // Non-archived, non-cancelled invoices update client invoice history
    const activeInvoices = invoices.filter(
      (inv) => !inv.isArchived && inv.status !== "cancelled"
    );

    const updatedClients = clients.map((client) => {
      const clientInvoices = activeInvoices.filter(
        (inv) => inv.clientId === client.id || inv.clientDisplayId === client.clientId
      );

      const clientInvoiceRecords = clientInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        orderNumber: inv.orderNumber || "Direct Billing",
        amount: inv.grandTotal,
        paidAmount: inv.amountPaid,
        currency: (inv.currency || "USD") as "USD" | "EUR" | "GBP" | "PKR" | "AED",
        dueDate: inv.dueDate || inv.invoiceDate,
        issueDate: inv.invoiceDate,
        status: (inv.status === "paid"
          ? "Paid"
          : inv.status === "partially_paid"
          ? "Partially Paid"
          : inv.status === "overdue"
          ? "Overdue"
          : "Unpaid") as "Paid" | "Partially Paid" | "Unpaid" | "Overdue",
      }));

      return {
        ...client,
        invoices: clientInvoiceRecords,
        updatedAt: new Date().toISOString(),
      };
    });

    localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(updatedClients));
    window.dispatchEvent(new Event("storage"));
  } catch (err) {
    console.error("Failed to sync clients with invoices:", err);
  }
}

// Record a Payment against an Invoice
export function recordInvoicePayment(
  invoice: InvoiceRecord,
  payment: {
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string;
    notes?: string;
    recordedBy: string;
  }
): { success: boolean; invoice?: InvoiceRecord; error?: string } {
  if (invoice.status === "cancelled" || invoice.isArchived) {
    return { success: false, error: "Cannot record payment on a cancelled or archived invoice." };
  }

  const paymentAmount = Number(payment.amount.toFixed(2));
  if (isNaN(paymentAmount) || !isFinite(paymentAmount) || paymentAmount <= 0) {
    return { success: false, error: "Payment amount must be greater than zero." };
  }

  if (paymentAmount > invoice.balanceDue + 0.001) {
    return {
      success: false,
      error: `Payment amount (${paymentAmount.toFixed(2)}) cannot exceed remaining balance due (${invoice.balanceDue.toFixed(2)}).`,
    };
  }

  const newTotalPaid = Number((invoice.amountPaid + paymentAmount).toFixed(2));
  const newBalanceDue = Number(Math.max(0, invoice.grandTotal - newTotalPaid).toFixed(2));

  const newStatus: InvoiceStatus = newBalanceDue <= 0 ? "paid" : "partially_paid";
  const newPaymentStatus: PaymentStatus = newBalanceDue <= 0 ? "paid" : "partially_paid";

  const newPaymentRecord: PaymentRecord = {
    paymentId: "pay_" + Date.now(),
    paymentDate: payment.paymentDate,
    amount: paymentAmount,
    currency: invoice.currency,
    paymentMethod: payment.paymentMethod,
    referenceNumber: payment.referenceNumber.trim(),
    notes: payment.notes?.trim() || undefined,
    recordedBy: payment.recordedBy.trim() || "Finance Desk",
    createdAt: new Date().toISOString(),
  };

  const nowReadable = new Date().toLocaleString("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const updatedInvoice: InvoiceRecord = {
    ...invoice,
    amountPaid: newTotalPaid,
    balanceDue: newBalanceDue,
    status: newStatus,
    paymentStatus: newPaymentStatus,
    payments: [newPaymentRecord, ...(invoice.payments || [])],
    updatedAt: new Date().toISOString(),
    timeline: [
      {
        id: "evt_" + Date.now(),
        title: `Payment Recorded: ${invoice.currency} ${paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        description: `Received payment via ${payment.paymentMethod} (Ref: ${payment.referenceNumber}). Remaining balance: ${invoice.currency} ${newBalanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
        timestamp: nowReadable,
        type: "payment",
        author: payment.recordedBy || "Finance Desk",
        reference: payment.referenceNumber,
      },
      ...(invoice.timeline || []),
    ],
  };

  return { success: true, invoice: updatedInvoice };
}

// Initial realistic seed dataset for Commercial Invoices
export const INITIAL_INVOICES: InvoiceRecord[] = [
  {
    id: "inv_001",
    invoiceNumber: "INV-2026-001",
    clientId: "clt_001",
    clientDisplayId: "CLT-2026-001",
    clientName: "Urban Luxe Apparel",
    clientCountry: "United Kingdom",
    clientContact: "Sarah Jenkins",
    clientEmail: "s.jenkins@urbanluxe.co.uk",
    orderId: "ord_001",
    orderNumber: "ORD-2026-001",
    quotationId: "qt_001",
    quotationNumber: "QT-2026-001",
    invoiceDate: "2026-08-19",
    dueDate: "2026-09-19",
    invoiceType: "Export Commercial Invoice",
    currency: "USD",
    paymentTerms: "30% Advance TT / 70% before BL Release",
    incoterms: "FOB Sialkot",
    buyerPoRef: "PO-UK-88219",
    garmentStyle: "HD-380",
    styleName: "HD-380 — 380 GSM Heavyweight Hoodie",
    description: "Export commercial invoice for 500 pcs HD-380 Heavyweight Hoodie.",
    quantity: 500,
    unitPrice: 21.09,
    subtotal: 10545.0,
    discount: 0,
    freightCharges: 0,
    tax: 0,
    grandTotal: 10545.0,
    amountPaid: 3163.5,
    balanceDue: 7381.5,
    paymentStatus: "partially_paid",
    status: "partially_paid",
    payments: [
      {
        paymentId: "pay_001",
        paymentDate: "2026-08-20",
        amount: 3163.5,
        currency: "USD",
        paymentMethod: "Bank Wire (TT)",
        referenceNumber: "TT-88219-ADV",
        notes: "30% initial contract advance received via Standard Chartered.",
        recordedBy: "Zainab Raza",
        createdAt: "2026-08-20T11:00:00.000Z",
      },
    ],
    notes: "30% advance received. 70% balance due upon issuance of shipping bill of lading.",
    timeline: [
      {
        id: "evt_inv_1",
        title: "Commercial Invoice Issued",
        description: "Issued commercial billing for ORD-2026-001 totaling $10,545.00.",
        timestamp: "2026-08-19 11:00 AM",
        type: "issued",
        author: "Zainab Raza",
      },
      {
        id: "evt_inv_2",
        title: "Payment Recorded: USD 3,163.50",
        description: "Received 30% advance TT payment (Ref: TT-88219-ADV). Balance: $7,381.50.",
        timestamp: "2026-08-20 02:30 PM",
        type: "payment",
        author: "Zainab Raza",
        reference: "TT-88219-ADV",
      },
    ],
    createdAt: "2026-08-19T11:00:00.000Z",
    updatedAt: "2026-08-20T14:30:00.000Z",
  },
  {
    id: "inv_002",
    invoiceNumber: "INV-2026-002",
    clientId: "clt_002",
    clientDisplayId: "CLT-2026-002",
    clientName: "Nordic Athletic",
    clientCountry: "Sweden",
    clientContact: "Erik Lindqvist",
    clientEmail: "e.lindqvist@nordicathletic.se",
    orderId: "ord_002",
    orderNumber: "ORD-2026-002",
    quotationId: "qt_002",
    quotationNumber: "QT-2026-002",
    invoiceDate: "2026-08-15",
    dueDate: "2026-09-15",
    invoiceType: "Export Commercial Invoice",
    currency: "USD",
    paymentTerms: "Net 30 Days after Port Clearance",
    incoterms: "CIF Gothenburg",
    buyerPoRef: "PO-SE-44910",
    garmentStyle: "TS-240",
    styleName: "TS-240 — 240 GSM Boxy Heavy T-Shirt",
    description: "Export commercial invoice for 1,200 pcs TS-240 Boxy Heavy T-Shirt.",
    quantity: 1200,
    unitPrice: 10.71,
    subtotal: 12852.0,
    discount: 0,
    freightCharges: 0,
    tax: 0,
    grandTotal: 12852.0,
    amountPaid: 0,
    balanceDue: 12852.0,
    paymentStatus: "pending",
    status: "issued",
    payments: [],
    notes: "Commercial invoice issued under Net 30 terms.",
    timeline: [
      {
        id: "evt_inv_21",
        title: "Commercial Invoice Issued",
        description: "Issued commercial billing for ORD-2026-002 totaling $12,852.00.",
        timestamp: "2026-08-15 09:30 AM",
        type: "issued",
        author: "Zainab Raza",
      },
    ],
    createdAt: "2026-08-15T09:30:00.000Z",
    updatedAt: "2026-08-15T09:30:00.000Z",
  },
  {
    id: "inv_004",
    invoiceNumber: "INV-2026-004",
    clientId: "clt_004",
    clientDisplayId: "CLT-2026-004",
    clientName: "Highland Outdoor",
    clientCountry: "Germany",
    clientContact: "Klaus Weber",
    clientEmail: "k.weber@highlandoutdoor.de",
    orderId: "ord_004",
    orderNumber: "ORD-2026-004",
    quotationId: "qt_004",
    quotationNumber: "QT-2026-004",
    invoiceDate: "2026-08-05",
    dueDate: "2026-09-05",
    invoiceType: "Export Commercial Invoice",
    currency: "EUR",
    paymentTerms: "30% Advance TT / 70% after AQL Passed",
    incoterms: "CIF Hamburg",
    buyerPoRef: "PO-DE-10928",
    garmentStyle: "HD-380",
    styleName: "HD-380 — 380 GSM Heavyweight Hoodie",
    description: "Export commercial invoice for 450 pcs HD-380 Heavyweight Hoodie (European Outdoor Edition).",
    quantity: 450,
    unitPrice: 21.09,
    subtotal: 9490.5,
    discount: 0,
    freightCharges: 0,
    tax: 0,
    grandTotal: 9490.5,
    amountPaid: 9490.5,
    balanceDue: 0,
    paymentStatus: "paid",
    status: "paid",
    payments: [
      {
        paymentId: "pay_004_1",
        paymentDate: "2026-08-06",
        amount: 2847.15,
        currency: "EUR",
        paymentMethod: "Bank Wire (TT)",
        referenceNumber: "TT-DE-ADV-88",
        notes: "30% Advance deposit.",
        recordedBy: "Hamza Tariq",
        createdAt: "2026-08-06T10:00:00.000Z",
      },
      {
        paymentId: "pay_004_2",
        paymentDate: "2026-08-27",
        amount: 6643.35,
        currency: "EUR",
        paymentMethod: "Bank Wire (TT)",
        referenceNumber: "TT-DE-FINAL-99",
        notes: "70% final settlement post-AQL pass.",
        recordedBy: "Hamza Tariq",
        createdAt: "2026-08-27T16:00:00.000Z",
      },
    ],
    notes: "Invoice fully settled. Batch cleared for air cargo dispatch.",
    timeline: [
      {
        id: "evt_inv_41",
        title: "Commercial Invoice Issued",
        description: "Issued commercial billing for ORD-2026-004 totaling €9,490.50.",
        timestamp: "2026-08-05 10:00 AM",
        type: "issued",
        author: "Hamza Tariq",
      },
      {
        id: "evt_inv_42",
        title: "Payment Recorded: EUR 2,847.15",
        description: "Received 30% advance deposit via TT.",
        timestamp: "2026-08-06 10:00 AM",
        type: "payment",
        author: "Hamza Tariq",
      },
      {
        id: "evt_inv_43",
        title: "Payment Recorded: EUR 6,643.35",
        description: "Received 70% final settlement. Invoice fully paid.",
        timestamp: "2026-08-27 04:00 PM",
        type: "payment",
        author: "Hamza Tariq",
      },
    ],
    createdAt: "2026-08-05T10:00:00.000Z",
    updatedAt: "2026-08-27T16:00:00.000Z",
  },
];

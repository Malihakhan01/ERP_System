// lib/quotations-engine.ts
// Domain interfaces, calculation logic, relational synchronization, and persistence utilities for FactoryOS Quotations Module

import { ClientRecord, CLIENT_STORAGE_KEY } from "./clients-engine";
import { OrderRecord, calculateOrderPricing } from "./orders-engine";

export type QuotationStatus =
  | "draft"
  | "sent"
  | "under_review"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export type QuotationType =
  | "Export Bulk Proposal"
  | "Sampling Quote"
  | "Repeat Order Quotation"
  | "Wholesale Price List"
  | "Fast-Track Special";

export type CommercialCurrency = "USD" | "EUR" | "GBP" | "PKR" | "AED";

export interface QuotationPricingBreakdown {
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  freightCharges: number;
  tax: number;
  grandTotal: number;
}

export interface QuotationTimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type:
    | "created"
    | "updated"
    | "sent"
    | "accepted"
    | "rejected"
    | "expired"
    | "converted"
    | "archived";
  author?: string;
  reference?: string;
}

export interface QuotationRecord {
  id: string; // Immutable internal ID, e.g. "qt_001"
  quotationNumber: string; // Auto-generated display ID, e.g. "QT-2026-001" (Read-only)
  clientId: string; // Authoritative internal client foreign key
  clientDisplayId: string; // e.g. "CLT-2026-001"
  clientName: string;
  clientCountry: string;
  clientContact?: string;
  clientEmail?: string;

  quotationDate: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  quotationType: QuotationType;
  currency: CommercialCurrency;
  status: QuotationStatus;

  // Garment Product Details
  garmentStyle: string; // e.g. "HD-380"
  styleName: string; // e.g. "HD-380 — 380 GSM Heavyweight Hoodie"
  productCategory: string;
  description?: string;
  fabric: string;
  gsm?: string;
  color?: string;
  sizeRange?: string;
  customizationNotes?: string;

  // Pricing
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  freightCharges: number;
  tax: number;
  grandTotal: number;

  // Commercial & Shipping Terms
  paymentTerms: string;
  incoterms: string;
  shippingMethod?: string;
  destinationPort?: string;
  buyerPoRef?: string;

  // Relational Links
  costEstimateId?: string; // e.g. "CST-2026-001"
  orderId?: string; // e.g. "ORD-2026-001" when converted
  internalNotes?: string;
  buyerNotes?: string;

  timeline: QuotationTimelineEvent[];
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
}

export const QUOTATION_STORAGE_KEY = "factoryos_quotations";

// Calculation Formula for Quotation Commercial Pricing
export function calculateQuotationPricing(
  quantityRaw: number | string,
  unitPriceRaw: number | string,
  discountRaw: number | string = 0,
  freightChargesRaw: number | string = 0,
  taxRaw: number | string = 0
): QuotationPricingBreakdown {
  const qtyNum = typeof quantityRaw === "number" ? quantityRaw : parseFloat(String(quantityRaw).trim());
  const priceNum = typeof unitPriceRaw === "number" ? unitPriceRaw : parseFloat(String(unitPriceRaw).trim());
  const discNum = typeof discountRaw === "number" ? discountRaw : parseFloat(String(discountRaw).trim() || "0");
  const freightNum =
    typeof freightChargesRaw === "number" ? freightChargesRaw : parseFloat(String(freightChargesRaw).trim() || "0");
  const taxNum = typeof taxRaw === "number" ? taxRaw : parseFloat(String(taxRaw).trim() || "0");

  const quantity = isNaN(qtyNum) || !isFinite(qtyNum) || qtyNum < 0 ? 0 : Math.floor(qtyNum);
  const unitPrice = isNaN(priceNum) || !isFinite(priceNum) || priceNum < 0 ? 0 : Number(priceNum.toFixed(2));
  const subtotal = Number((quantity * unitPrice).toFixed(2));

  const validDiscount =
    isNaN(discNum) || !isFinite(discNum) || discNum < 0 ? 0 : Math.min(Number(discNum.toFixed(2)), subtotal);
  const validFreight = isNaN(freightNum) || !isFinite(freightNum) || freightNum < 0 ? 0 : Number(freightNum.toFixed(2));
  const validTax = isNaN(taxNum) || !isFinite(taxNum) || taxNum < 0 ? 0 : Number(taxNum.toFixed(2));

  const grandTotal = Number((subtotal - validDiscount + validFreight + validTax).toFixed(2));

  return {
    quantity,
    unitPrice,
    subtotal,
    discount: validDiscount,
    freightCharges: validFreight,
    tax: validTax,
    grandTotal,
  };
}

// Safety helper: Check if quotation has active transactional links preventing hard deletion
export function hasQuotationTransactionalLinks(quotation: QuotationRecord): boolean {
  const hasOrder = Boolean(quotation.orderId);
  const isAcceptedOrSent = quotation.status === "accepted" || quotation.status === "sent" || quotation.status === "under_review";
  const hasCost = Boolean(quotation.costEstimateId);
  return hasOrder || isAcceptedOrSent || hasCost;
}

// Sync Quotations into Client CRM profile
export function syncClientWithQuotations(quotations: QuotationRecord[]) {
  if (typeof window === "undefined") return;
  try {
    const rawClients = localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!rawClients) return;
    const clients: ClientRecord[] = JSON.parse(rawClients);

    const activeQuotes = quotations.filter((q) => !q.isArchived);

    const updatedClients = clients.map((client) => {
      const clientQuotes = activeQuotes.filter((q) => q.clientId === client.id || q.clientDisplayId === client.clientId);

      const mappedQuotes = clientQuotes.map((q) => ({
        id: q.id,
        quoteNumber: q.quotationNumber,
        styleName: q.styleName,
        quantity: q.quantity,
        totalValue: q.grandTotal,
        currency: q.currency,
        status: (q.status === "draft"
          ? "Draft"
          : q.status === "sent"
          ? "Sent"
          : q.status === "under_review"
          ? "Negotiation"
          : q.status === "accepted"
          ? "Accepted"
          : q.status === "rejected"
          ? "Rejected"
          : q.status === "expired"
          ? "Expired"
          : "Draft") as "Draft" | "Sent" | "Negotiation" | "Accepted" | "Rejected" | "Expired",
        validUntil: q.validUntil,
        createdAt: q.quotationDate,
      }));

      return {
        ...client,
        quotations: mappedQuotes,
        updatedAt: new Date().toISOString(),
      };
    });

    localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(updatedClients));
    window.dispatchEvent(new Event("storage"));
  } catch (err) {
    console.error("Failed to sync clients with quotations:", err);
  }
}

// Convert Accepted Quotation to Sales Order
export function convertQuotationToOrder(
  quotation: QuotationRecord,
  existingOrders: OrderRecord[],
  saveOrders: (records: OrderRecord[]) => void
): { success: boolean; orderNumber?: string; error?: string } {
  if (quotation.status !== "accepted") {
    return { success: false, error: "Only Accepted quotations can be converted into Sales Orders." };
  }

  if (quotation.orderId) {
    return {
      success: false,
      error: `This quotation was already converted into Sales Order ${quotation.orderId}.`,
    };
  }

  const currentYear = new Date().getFullYear();
  const currentMax = existingOrders.reduce((max, o) => {
    const match = o.orderNumber.match(/ORD-\d{4}-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);
  const nextNum = currentMax + 1;
  const newOrderNumber = `ORD-${currentYear}-${String(nextNum).padStart(3, "0")}`;
  const newInternalId = "ord_" + Date.now();
  const today = new Date().toISOString().split("T")[0];
  const targetDelivery = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const nowIso = new Date().toISOString();
  const nowReadable = new Date().toLocaleString("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const pricing = calculateOrderPricing(
    quotation.quantity,
    quotation.unitPrice,
    quotation.discount,
    quotation.freightCharges,
    quotation.tax
  );

  const newOrder: OrderRecord = {
    id: newInternalId,
    orderNumber: newOrderNumber,
    clientId: quotation.clientId,
    clientDisplayId: quotation.clientDisplayId,
    clientName: quotation.clientName,
    clientCountry: quotation.clientCountry,
    clientContact: quotation.clientContact,
    clientEmail: quotation.clientEmail,
    orderDate: today,
    targetDeliveryDate: targetDelivery,
    requestedShipDate: targetDelivery,
    productionStartDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    orderType: "Export Bulk Production",
    currency: quotation.currency,
    priority: "normal",
    orderStatus: "confirmed",
    productionStage: "Order Confirmed",
    paymentStatus: "pending",
    styleCode: quotation.garmentStyle,
    styleName: quotation.styleName,
    productCategory: quotation.productCategory,
    description: quotation.description,
    fabric: quotation.fabric,
    gsm: quotation.gsm,
    color: quotation.color,
    sizeRange: quotation.sizeRange,
    customizationNotes: quotation.customizationNotes,
    quantity: pricing.quantity,
    unitPrice: pricing.unitPrice,
    subtotal: pricing.subtotal,
    discount: pricing.discount,
    additionalCharges: pricing.additionalCharges,
    tax: pricing.tax,
    totalValue: pricing.totalValue,
    paymentTerms: quotation.paymentTerms,
    incoterms: quotation.incoterms,
    shippingMethod: quotation.shippingMethod || "Air Cargo",
    destinationPort: quotation.destinationPort,
    buyerPoRef: quotation.buyerPoRef,
    costEstimateId: quotation.costEstimateId,
    quotationId: quotation.quotationNumber,
    productionJobId: `PRD-${currentYear}-${String(nextNum).padStart(3, "0")}`,
    timeline: [
      {
        id: "evt_" + Date.now(),
        title: "Converted from Quotation",
        description: `Sales order booked from accepted proposal ${quotation.quotationNumber} (${pricing.quantity.toLocaleString()} pcs @ ${pricing.unitPrice.toFixed(2)} ${quotation.currency}).`,
        timestamp: nowReadable,
        type: "created",
        author: "Export Merchandising Desk",
      },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const updatedOrders = [newOrder, ...existingOrders];
  saveOrders(updatedOrders);

  return { success: true, orderNumber: newOrderNumber };
}

// Initial realistic seed dataset for Commercial Quotations
export const INITIAL_QUOTATIONS: QuotationRecord[] = [
  {
    id: "qt_001",
    quotationNumber: "QT-2026-001",
    clientId: "clt_001",
    clientDisplayId: "CLT-2026-001",
    clientName: "Urban Luxe Apparel",
    clientCountry: "United Kingdom",
    clientContact: "Sarah Jenkins",
    clientEmail: "s.jenkins@urbanluxe.co.uk",
    quotationDate: "2026-08-18",
    validUntil: "2026-09-18",
    quotationType: "Export Bulk Proposal",
    currency: "USD",
    status: "accepted",
    garmentStyle: "HD-380",
    styleName: "HD-380 — 380 GSM Heavyweight Hoodie",
    productCategory: "Hoodies & Sweatshirts",
    description: "Export grade heavyweight fleece pullover with embroidered tonal chest insignia.",
    fabric: "380 GSM 100% Combed Cotton Fleece, 2x2 Spandex Rib",
    gsm: "380 GSM",
    color: "Washed Black / Vintage Olive",
    sizeRange: "S, M, L, XL, XXL",
    customizationNotes: "Silicone garment wash handle + high-density woven damask neck tags.",
    quantity: 500,
    unitPrice: 21.09,
    subtotal: 10545.0,
    discount: 0,
    freightCharges: 0,
    tax: 0,
    grandTotal: 10545.0,
    paymentTerms: "30% Advance TT / 70% before BL Release",
    incoterms: "FOB Sialkot",
    shippingMethod: "Air Cargo",
    destinationPort: "London Heathrow Logistics Hub",
    buyerPoRef: "PO-UK-88219",
    costEstimateId: "CST-2026-001",
    orderId: "ORD-2026-001",
    internalNotes: "Pre-costing approved at 25% gross margin. Target confirmed for delivery.",
    buyerNotes: "Confirmed pricing accepted by Sarah Jenkins on 18th August.",
    timeline: [
      {
        id: "evt_qt_1",
        title: "Quotation Proposal Issued",
        description: "Commercial proposal QT-2026-001 issued for 500 pcs HD-380 @ $21.09/pc.",
        timestamp: "2026-08-18 10:00 AM",
        type: "sent",
        author: "Hamza Tariq",
      },
      {
        id: "evt_qt_2",
        title: "Quotation Accepted",
        description: "Client accepted terms and confirmed 30% advance TT release.",
        timestamp: "2026-08-18 03:15 PM",
        type: "accepted",
        author: "Sarah Jenkins",
      },
      {
        id: "evt_qt_3",
        title: "Converted to Order",
        description: "Converted to Sales Order contract ORD-2026-001.",
        timestamp: "2026-08-18 04:00 PM",
        type: "converted",
        author: "Export Merchandising Desk",
      },
    ],
    createdAt: "2026-08-18T10:00:00.000Z",
    updatedAt: "2026-08-18T16:00:00.000Z",
  },
  {
    id: "qt_002",
    quotationNumber: "QT-2026-002",
    clientId: "clt_002",
    clientDisplayId: "CLT-2026-002",
    clientName: "Nordic Athletic",
    clientCountry: "Sweden",
    clientContact: "Erik Lindqvist",
    clientEmail: "e.lindqvist@nordicathletic.se",
    quotationDate: "2026-08-14",
    validUntil: "2026-09-14",
    quotationType: "Export Bulk Proposal",
    currency: "USD",
    status: "accepted",
    garmentStyle: "TS-240",
    styleName: "TS-240 — 240 GSM Boxy Heavy T-Shirt",
    productCategory: "T-Shirts",
    description: "Scandinavian boxy fit heavyweight organic cotton jersey tee.",
    fabric: "240 GSM Organic Cotton Jersey, Spandex Collar Rib",
    gsm: "240 GSM",
    color: "Chalk White / Charcoal",
    sizeRange: "XS, S, M, L, XL",
    customizationNotes: "Tagless heat transfer neck print + GOTS certified organic fabric labels.",
    quantity: 1200,
    unitPrice: 10.71,
    subtotal: 12852.0,
    discount: 0,
    freightCharges: 0,
    tax: 0,
    grandTotal: 12852.0,
    paymentTerms: "Net 30 Days after Port Clearance",
    incoterms: "CIF Gothenburg",
    shippingMethod: "Sea Freight (FCL)",
    destinationPort: "Port of Gothenburg Logistics Terminal",
    buyerPoRef: "PO-SE-44910",
    costEstimateId: "CST-2026-002",
    orderId: "ORD-2026-002",
    internalNotes: "Annual contract price model.",
    buyerNotes: "Accepted CIF terms.",
    timeline: [
      {
        id: "evt_qt_21",
        title: "Quotation Proposal Sent",
        description: "Formal quotation sent for 1,200 pcs @ $10.71/pc CIF Gothenburg.",
        timestamp: "2026-08-14 11:30 AM",
        type: "sent",
        author: "Zainab Raza",
      },
      {
        id: "evt_qt_22",
        title: "Quotation Accepted & Converted",
        description: "Accepted and booked as ORD-2026-002.",
        timestamp: "2026-08-14 05:00 PM",
        type: "converted",
        author: "Zainab Raza",
      },
    ],
    createdAt: "2026-08-14T11:30:00.000Z",
    updatedAt: "2026-08-14T17:00:00.000Z",
  },
  {
    id: "qt_003",
    quotationNumber: "QT-2026-003",
    clientId: "clt_003",
    clientDisplayId: "CLT-2026-003",
    clientName: "Coastal Threads",
    clientCountry: "United States",
    clientContact: "Marcus Vance",
    clientEmail: "m.vance@coastalthreadsla.com",
    quotationDate: "2026-08-20",
    validUntil: "2026-09-20",
    quotationType: "Export Bulk Proposal",
    currency: "USD",
    status: "under_review",
    garmentStyle: "JG-320",
    styleName: "JG-320 — French Terry Cuffed Joggers",
    productCategory: "Joggers & Bottoms",
    description: "Premium French Terry joggers with flatlock seam detailing.",
    fabric: "320 GSM 100% Organic Cotton French Terry",
    gsm: "320 GSM",
    color: "Heather Grey / Forest Green",
    sizeRange: "S, M, L, XL",
    customizationNotes: "Custom dyed drawstrings with dipped silicone tips.",
    quantity: 800,
    unitPrice: 16.9,
    subtotal: 13520.0,
    discount: 0,
    freightCharges: 0,
    tax: 0,
    grandTotal: 13520.0,
    paymentTerms: "Letter of Credit (LC at Sight)",
    incoterms: "FOB Karachi / Sialkot",
    shippingMethod: "Sea Freight (FCL)",
    destinationPort: "Port of Long Beach, California",
    buyerPoRef: "PO-US-99120",
    costEstimateId: "CST-2026-003",
    internalNotes: "Buyer reviewing LC terms with Wells Fargo.",
    timeline: [
      {
        id: "evt_qt_31",
        title: "Quotation Proposal Dispatched",
        description: "Dispatched price quotation for 800 pcs JG-320.",
        timestamp: "2026-08-20 02:00 PM",
        type: "sent",
        author: "Hamza Tariq",
      },
    ],
    createdAt: "2026-08-20T14:00:00.000Z",
    updatedAt: "2026-08-20T14:00:00.000Z",
  },
  {
    id: "qt_004",
    quotationNumber: "QT-2026-004",
    clientId: "clt_004",
    clientDisplayId: "CLT-2026-004",
    clientName: "Highland Outdoor",
    clientCountry: "Germany",
    clientContact: "Klaus Weber",
    clientEmail: "k.weber@highlandoutdoor.de",
    quotationDate: "2026-08-01",
    validUntil: "2026-08-31",
    quotationType: "Export Bulk Proposal",
    currency: "EUR",
    status: "accepted",
    garmentStyle: "HD-380",
    styleName: "HD-380 — 380 GSM Heavyweight Hoodie",
    productCategory: "Hoodies & Sweatshirts",
    description: "European outdoor heavyweight hoodie with waterproof bonded zipper pockets.",
    fabric: "380 GSM Combed Cotton Fleece, Taslan Nylon Trim",
    gsm: "380 GSM",
    color: "Alpine Olive",
    sizeRange: "M, L, XL, XXL",
    customizationNotes: "Reflective transfer print on sleeve.",
    quantity: 450,
    unitPrice: 21.09,
    subtotal: 9490.5,
    discount: 0,
    freightCharges: 0,
    tax: 0,
    grandTotal: 9490.5,
    paymentTerms: "30% Advance TT / 70% after AQL Passed",
    incoterms: "CIF Hamburg",
    shippingMethod: "Air Cargo",
    destinationPort: "Munich Air Cargo Terminal",
    buyerPoRef: "PO-DE-10928",
    orderId: "ORD-2026-004",
    timeline: [
      {
        id: "evt_qt_41",
        title: "Quotation Proposal Accepted",
        description: "Accepted and converted into production order ORD-2026-004.",
        timestamp: "2026-08-01 10:00 AM",
        type: "converted",
        author: "Hamza Tariq",
      },
    ],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "qt_005",
    quotationNumber: "QT-2026-005",
    clientId: "clt_005",
    clientDisplayId: "CLT-2026-005",
    clientName: "Desert Activewear",
    clientCountry: "UAE",
    clientContact: "Tariq Al-Mansoor",
    clientEmail: "tariq@desertactive.ae",
    quotationDate: "2026-08-26",
    validUntil: "2026-09-26",
    quotationType: "Sampling Quote",
    currency: "USD",
    status: "sent",
    garmentStyle: "JK-450",
    styleName: "JK-450 — Technical Windbreaker Jacket",
    productCategory: "Jackets & Outerwear",
    description: "Middle East marathon runner windbreaker jacket.",
    fabric: "Micro-Polyester Interlock, UPF 50+ Lycra",
    gsm: "160 GSM",
    color: "Desert Sand / Neon Coral",
    sizeRange: "S, M, L, XL",
    customizationNotes: "Bilingual wash care label Arabic/English.",
    quantity: 300,
    unitPrice: 32.67,
    subtotal: 9801.0,
    discount: 1.0,
    freightCharges: 0,
    tax: 0,
    grandTotal: 9800.0,
    paymentTerms: "50% Advance TT / 50% upon Cargo Departure",
    incoterms: "CIF Jebel Ali",
    shippingMethod: "Sea Freight (FCL)",
    destinationPort: "Jebel Ali Free Zone Port",
    buyerPoRef: "PO-UAE-3301",
    timeline: [
      {
        id: "evt_qt_51",
        title: "Quotation Proposal Dispatched",
        description: "Sent commercial quotation for 300 pcs sample batch.",
        timestamp: "2026-08-26 09:30 AM",
        type: "sent",
        author: "Zainab Raza",
      },
    ],
    createdAt: "2026-08-26T09:30:00.000Z",
    updatedAt: "2026-08-26T09:30:00.000Z",
  },
];

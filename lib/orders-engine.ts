// lib/orders-engine.ts
// Core domain interfaces, calculation formulas, and state utilities for FactoryOS Sales Orders module

import { ClientRecord, CLIENT_STORAGE_KEY, ClientOrderRecord } from "./clients-engine";

export type OrderStatus =
  | "draft"
  | "confirmed"
  | "pre_production"
  | "in_production"
  | "qa"
  | "packed"
  | "ready_to_ship"
  | "shipped"
  | "completed"
  | "cancelled";

export type OrderType =
  | "Export Bulk Production"
  | "Sample Development"
  | "Repeat Order"
  | "Wholesale Contract"
  | "Urgent / Fast-Track";

export type ProductionStage =
  | "Order Confirmed"
  | "Pre-Production"
  | "Cutting"
  | "Sewing"
  | "Finishing"
  | "Quality Assurance"
  | "Packed"
  | "Ready to Ship"
  | "Shipped"
  | "Completed"
  | "Cancelled";

export type OrderPriority = "low" | "normal" | "high" | "urgent";

export type PaymentStatus = "pending" | "partially_paid" | "paid" | "overdue" | "on_hold";

export type CommercialCurrency = "USD" | "EUR" | "GBP" | "PKR" | "AED";

export interface OrderPricingBreakdown {
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  additionalCharges: number;
  tax: number;
  totalValue: number;
}

export interface OrderTimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type:
    | "created"
    | "updated"
    | "costing_linked"
    | "quote_linked"
    | "production_linked"
    | "stage_change"
    | "payment_change"
    | "invoice_linked"
    | "status_change"
    | "archived";
  author?: string;
  reference?: string;
}

export interface OrderRecord {
  id: string; // Immutable internal ID, e.g. "ord_001"
  orderNumber: string; // Auto-generated display ID, e.g. "ORD-2026-001" (Read-only)
  clientId: string; // Immutable internal client ID foreign key (e.g. "clt_001")
  clientDisplayId: string; // e.g. "CLT-2026-001"
  clientName: string;
  clientCountry: string;
  clientCity?: string;
  clientContact?: string;
  clientEmail?: string;
  
  orderDate: string;
  targetDeliveryDate: string;
  requestedShipDate?: string;
  productionStartDate?: string;
  orderType: OrderType;
  currency: CommercialCurrency;
  priority: OrderPriority;
  orderStatus: OrderStatus;
  productionStage: ProductionStage;
  paymentStatus: PaymentStatus;

  // Garment Product Details (Relational link to Products catalog + natural styleCode)
  productId?: string; // Foreign key referencing Product UUID
  styleCode: string;
  styleName: string;
  productCategory: string;
  description?: string;
  fabric?: string;
  gsm?: string;
  color?: string;
  sizeRange?: string;
  customizationNotes?: string;

  // Pricing & Quantities
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  additionalCharges: number;
  tax: number;
  totalValue: number;

  // Commercial & Shipping Terms
  paymentTerms: string;
  incoterms: string;
  shippingMethod?: string;
  destinationPort?: string;
  buyerPoRef?: string;

  // Relational Links (Using stable IDs)
  costEstimateId?: string; // e.g. "cst_1" or "CST-2026-001"
  quotationId?: string; // e.g. "qt_1" or "QT-2026-001"
  productionJobId?: string; // e.g. "prd_001" or "PRD-2026-001"
  invoiceIds?: string[];
  trackingNumber?: string;

  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
}

export const ORDER_STORAGE_KEY = "factoryos_orders";

// Calculation Formula for Sales Order Pricing
export function calculateOrderPricing(
  quantityRaw: number | string,
  unitPriceRaw: number | string,
  discountRaw: number | string = 0,
  additionalChargesRaw: number | string = 0,
  taxRaw: number | string = 0
): OrderPricingBreakdown {
  const qtyNum = typeof quantityRaw === "number" ? quantityRaw : parseFloat(String(quantityRaw).trim());
  const priceNum = typeof unitPriceRaw === "number" ? unitPriceRaw : parseFloat(String(unitPriceRaw).trim());
  const discNum = typeof discountRaw === "number" ? discountRaw : parseFloat(String(discountRaw).trim() || "0");
  const addNum = typeof additionalChargesRaw === "number" ? additionalChargesRaw : parseFloat(String(additionalChargesRaw).trim() || "0");
  const taxNum = typeof taxRaw === "number" ? taxRaw : parseFloat(String(taxRaw).trim() || "0");

  const quantity = isNaN(qtyNum) || !isFinite(qtyNum) || qtyNum < 0 ? 0 : Math.floor(qtyNum);
  const unitPrice = isNaN(priceNum) || !isFinite(priceNum) || priceNum < 0 ? 0 : Number(priceNum.toFixed(2));
  const subtotal = Number((quantity * unitPrice).toFixed(2));

  const validDiscount = isNaN(discNum) || !isFinite(discNum) || discNum < 0 ? 0 : Math.min(Number(discNum.toFixed(2)), subtotal);
  const validAdditional = isNaN(addNum) || !isFinite(addNum) || addNum < 0 ? 0 : Number(addNum.toFixed(2));
  const validTax = isNaN(taxNum) || !isFinite(taxNum) || taxNum < 0 ? 0 : Number(taxNum.toFixed(2));

  const totalValue = Number((subtotal - validDiscount + validAdditional + validTax).toFixed(2));

  return {
    quantity,
    unitPrice,
    subtotal,
    discount: validDiscount,
    additionalCharges: validAdditional,
    tax: validTax,
    totalValue,
  };
}

// Helper to check if order has active transactional dependencies that prevent hard deletion
export function hasOrderTransactionalLinks(order: OrderRecord): boolean {
  const hasCost = Boolean(order.costEstimateId);
  const hasQuote = Boolean(order.quotationId);
  const hasProd = Boolean(order.productionJobId);
  const hasInvoices = Array.isArray(order.invoiceIds) && order.invoiceIds.length > 0;
  const hasTracking = Boolean(order.trackingNumber);
  const inAdvancedStage =
    order.orderStatus !== "draft" &&
    order.orderStatus !== "cancelled" &&
    order.productionStage !== "Order Confirmed" &&
    order.productionStage !== "Cancelled";

  return hasCost || hasQuote || hasProd || hasInvoices || hasTracking || inAdvancedStage;
}

// Synchronize Client Profile when orders change (Two-way relational consistency)
export function syncClientWithOrders(orders: OrderRecord[]) {
  if (typeof window === "undefined") return;
  try {
    const rawClients = localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!rawClients) return;
    const clients: ClientRecord[] = JSON.parse(rawClients);

    // Only confirmed active orders count for client history & KPIs (drafts are not confirmed contracts)
    const confirmedActiveOrders = orders.filter((o) => !o.isArchived && o.orderStatus !== "draft");

    const updatedClients = clients.map((client) => {
      // Find all confirmed orders assigned to this client (by immutable client ID or display ID)
      const clientOrders = confirmedActiveOrders.filter(
        (o) => o.clientId === client.id || o.clientDisplayId === client.clientId
      );

      const mappedOrderRecords: ClientOrderRecord[] = clientOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        styleCode: o.styleCode,
        styleName: o.styleName,
        productCategory: o.productCategory,
        quantity: o.quantity,
        orderValue: o.totalValue,
        currency: o.currency,
        status: (o.orderStatus === "in_production"
          ? "production"
          : o.orderStatus === "qa"
          ? "quality_check"
          : o.orderStatus === "ready_to_ship"
          ? "packed"
          : o.orderStatus) as ClientOrderRecord["status"],
        orderDate: o.orderDate,
        deliveryDate: o.targetDeliveryDate,
      }));

      return {
        ...client,
        orders: mappedOrderRecords,
        updatedAt: new Date().toISOString(),
      };
    });

    localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(updatedClients));
    window.dispatchEvent(new Event("storage"));
  } catch (err) {
    console.error("Failed to sync clients with orders:", err);
  }
}

// Initial realistic seed dataset for Orders
export const INITIAL_ORDERS: OrderRecord[] = [
  {
    id: "ord_001",
    orderNumber: "ORD-2026-001",
    clientId: "clt_001",
    clientDisplayId: "CLT-2026-001",
    clientName: "Urban Luxe Apparel",
    clientCountry: "United Kingdom",
    clientCity: "London",
    clientContact: "Sarah Jenkins",
    clientEmail: "s.jenkins@urbanluxe.co.uk",
    orderDate: "2026-08-15",
    targetDeliveryDate: "2026-09-12",
    requestedShipDate: "2026-09-10",
    productionStartDate: "2026-08-20",
    orderType: "Export Bulk Production",
    currency: "USD",
    priority: "high",
    orderStatus: "in_production",
    productionStage: "Sewing",
    paymentStatus: "partially_paid",
    styleCode: "HD-380",
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
    additionalCharges: 0,
    tax: 0,
    totalValue: 10545.0,
    paymentTerms: "30% Advance TT / 70% before BL Release",
    incoterms: "FOB Sialkot",
    shippingMethod: "Air Cargo",
    destinationPort: "London Heathrow Logistics Hub",
    buyerPoRef: "PO-UK-88219",
    costEstimateId: "CST-2026-001",
    quotationId: "QT-2026-001",
    productionJobId: "PRD-2026-001",
    invoiceIds: ["INV-2026-001"],
    trackingNumber: "TRK-2026-001",
    timeline: [
      {
        id: "evt_ord_1",
        title: "Sales Order Booked",
        description: "Confirmed commercial contract booked for 500 pcs HD-380 @ $21.09/pc.",
        timestamp: "2026-08-15 10:00 AM",
        type: "created",
        author: "Hamza Tariq",
      },
      {
        id: "evt_ord_2",
        title: "Cost Sheet CST-2026-001 Linked",
        description: "Pre-costing BOM approved with 25% gross margin ($15.82 cost / $21.09 FOB).",
        timestamp: "2026-08-20 11:30 AM",
        type: "costing_linked",
        author: "Tariq Mahmood",
      },
      {
        id: "evt_ord_3",
        title: "Advance Deposit Settled",
        description: "30% advance TT received ($3,163.50) against INV-2026-001.",
        timestamp: "2026-08-20 02:00 PM",
        type: "payment_change",
        author: "Finance Desk",
      },
      {
        id: "evt_ord_4",
        title: "Production Stage: Sewing",
        description: "Cutting completed. 500 units staged on Sewing Line 1.",
        timestamp: "2026-08-22 09:00 AM",
        type: "stage_change",
        author: "Floor Supervisor",
      },
    ],
    createdAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-22T09:00:00.000Z",
  },
  {
    id: "ord_002",
    orderNumber: "ORD-2026-002",
    clientId: "clt_002",
    clientDisplayId: "CLT-2026-002",
    clientName: "Nordic Athletic",
    clientCountry: "Sweden",
    clientCity: "Stockholm",
    clientContact: "Erik Lindqvist",
    clientEmail: "e.lindqvist@nordicathletic.se",
    orderDate: "2026-08-12",
    targetDeliveryDate: "2026-09-05",
    requestedShipDate: "2026-09-02",
    productionStartDate: "2026-08-16",
    orderType: "Export Bulk Production",
    currency: "USD",
    priority: "normal",
    orderStatus: "qa",
    productionStage: "Quality Assurance",
    paymentStatus: "pending",
    styleCode: "TS-240",
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
    additionalCharges: 0,
    tax: 0,
    totalValue: 12852.0,
    paymentTerms: "Net 30 Days after Port Clearance",
    incoterms: "CIF Gothenburg",
    shippingMethod: "Sea Freight (FCL)",
    destinationPort: "Port of Gothenburg Logistics Terminal",
    buyerPoRef: "PO-SE-44910",
    costEstimateId: "CST-2026-002",
    quotationId: "QT-2026-002",
    productionJobId: "PRD-2026-002",
    invoiceIds: ["INV-2026-002"],
    trackingNumber: "TRK-2026-002",
    timeline: [
      {
        id: "evt_ord_21",
        title: "Order Contract Created",
        description: "1,200 pcs booked @ $10.71/pc under CIF Gothenburg terms.",
        timestamp: "2026-08-12 11:00 AM",
        type: "created",
        author: "Zainab Raza",
      },
      {
        id: "evt_ord_22",
        title: "Production Stage: QA Inspection",
        description: "Sewing finished. Batch transferred to AQL 2.5 quality assurance station.",
        timestamp: "2026-08-24 02:00 PM",
        type: "stage_change",
        author: "Floor Supervisor",
      },
    ],
    createdAt: "2026-08-12T11:00:00.000Z",
    updatedAt: "2026-08-24T14:00:00.000Z",
  },
  {
    id: "ord_003",
    orderNumber: "ORD-2026-003",
    clientId: "clt_003",
    clientDisplayId: "CLT-2026-003",
    clientName: "Coastal Threads",
    clientCountry: "United States",
    clientCity: "Los Angeles",
    clientContact: "Marcus Vance",
    clientEmail: "m.vance@coastalthreadsla.com",
    orderDate: "2026-08-16",
    targetDeliveryDate: "2026-09-28",
    requestedShipDate: "2026-09-24",
    productionStartDate: "2026-08-25",
    orderType: "Export Bulk Production",
    currency: "USD",
    priority: "normal",
    orderStatus: "in_production",
    productionStage: "Cutting",
    paymentStatus: "pending",
    styleCode: "JG-320",
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
    additionalCharges: 0,
    tax: 0,
    totalValue: 13520.0,
    paymentTerms: "Letter of Credit (LC at Sight)",
    incoterms: "FOB Karachi / Sialkot",
    shippingMethod: "Sea Freight (FCL)",
    destinationPort: "Port of Long Beach, California",
    buyerPoRef: "PO-US-99120",
    costEstimateId: "CST-2026-003",
    quotationId: "QT-2026-003",
    productionJobId: "PRD-2026-003",
    timeline: [
      {
        id: "evt_ord_31",
        title: "Order Contract Created",
        description: "800 pcs JG-320 confirmed under LC at Sight.",
        timestamp: "2026-08-16 02:30 PM",
        type: "created",
        author: "Hamza Tariq",
      },
      {
        id: "evt_ord_32",
        title: "Production Stage: Cutting",
        description: "Marker CAD finalized. 800 pcs fabric lay spread on cutting table.",
        timestamp: "2026-08-25 10:00 AM",
        type: "stage_change",
        author: "Cutting Lead",
      },
    ],
    createdAt: "2026-08-16T14:30:00.000Z",
    updatedAt: "2026-08-25T10:00:00.000Z",
  },
  {
    id: "ord_004",
    orderNumber: "ORD-2026-004",
    clientId: "clt_004",
    clientDisplayId: "CLT-2026-004",
    clientName: "Highland Outdoor",
    clientCountry: "Germany",
    clientCity: "Munich",
    clientContact: "Klaus Weber",
    clientEmail: "k.weber@highlandoutdoor.de",
    orderDate: "2026-08-01",
    targetDeliveryDate: "2026-08-30",
    requestedShipDate: "2026-08-28",
    productionStartDate: "2026-08-05",
    orderType: "Export Bulk Production",
    currency: "EUR",
    priority: "high",
    orderStatus: "packed",
    productionStage: "Packed",
    paymentStatus: "paid",
    styleCode: "HD-380",
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
    additionalCharges: 0,
    tax: 0,
    totalValue: 9490.5,
    paymentTerms: "30% Advance TT / 70% after AQL Passed",
    incoterms: "CIF Hamburg",
    shippingMethod: "Air Cargo",
    destinationPort: "Munich Air Cargo Terminal",
    buyerPoRef: "PO-DE-10928",
    productionJobId: "PRD-2026-004",
    invoiceIds: ["INV-2026-004"],
    timeline: [
      {
        id: "evt_ord_41",
        title: "Order Contract Created",
        description: "450 units booked for European Fall season.",
        timestamp: "2026-08-01 09:00 AM",
        type: "created",
        author: "Hamza Tariq",
      },
      {
        id: "evt_ord_42",
        title: "Packed & Staged",
        description: "AQL inspection passed 0 defects. 23 master export cartons sealed.",
        timestamp: "2026-08-27 04:00 PM",
        type: "stage_change",
        author: "Warehouse Supervisor",
      },
      {
        id: "evt_ord_43",
        title: "Full Settlement Received",
        description: "Final invoice INV-2026-004 settled in full (€9,490.50).",
        timestamp: "2026-08-27 05:00 PM",
        type: "payment_change",
        author: "Finance Desk",
      },
    ],
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-27T17:00:00.000Z",
  },
  {
    id: "ord_005",
    orderNumber: "ORD-2026-005",
    clientId: "clt_005",
    clientDisplayId: "CLT-2026-005",
    clientName: "Desert Activewear",
    clientCountry: "UAE",
    clientCity: "Dubai",
    clientContact: "Tariq Al-Mansoor",
    clientEmail: "tariq@desertactive.ae",
    orderDate: "2026-08-26",
    targetDeliveryDate: "2026-09-30",
    requestedShipDate: "2026-09-28",
    productionStartDate: "2026-09-01",
    orderType: "Sample Development",
    currency: "USD",
    priority: "urgent",
    orderStatus: "confirmed",
    productionStage: "Order Confirmed",
    paymentStatus: "pending",
    styleCode: "JK-450",
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
    additionalCharges: 0,
    tax: 0,
    totalValue: 9800.0,
    paymentTerms: "50% Advance TT / 50% upon Cargo Departure",
    incoterms: "CIF Jebel Ali",
    shippingMethod: "Sea Freight (FCL)",
    destinationPort: "Jebel Ali Free Zone Port",
    buyerPoRef: "PO-UAE-3301",
    quotationId: "QT-2026-005",
    productionJobId: "PRD-2026-005",
    timeline: [
      {
        id: "evt_ord_51",
        title: "Order Contract Created",
        description: "Confirmed sample run for 300 pcs JK-450 Track Jackets.",
        timestamp: "2026-08-26 11:30 AM",
        type: "created",
        author: "Zainab Raza",
      },
    ],
    createdAt: "2026-08-26T11:30:00.000Z",
    updatedAt: "2026-08-26T11:30:00.000Z",
  },
];

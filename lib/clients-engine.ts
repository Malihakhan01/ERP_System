// lib/clients-engine.ts
// Core domain interfaces and helper utilities for FactoryOS Clients CRM module

export type ClientStatus = "active" | "prospect" | "on_hold" | "inactive";

export type ClientType =
  | "Brand"
  | "Retailer"
  | "Wholesaler"
  | "Manufacturer"
  | "Importer"
  | "Distributor"
  | "Agent";

export type ClientCountry =
  | "United Kingdom"
  | "United States"
  | "Sweden"
  | "Germany"
  | "UAE"
  | "Saudi Arabia"
  | "Canada"
  | "Australia"
  | "Other";

export type ClientCurrency = "USD" | "EUR" | "GBP" | "PKR" | "AED";

export interface PrimaryContact {
  name: string;
  designation: string;
  email: string;
  phone: string;
  whatsApp?: string;
}

export interface SecondaryContact {
  name?: string;
  designation?: string;
  email?: string;
  phone?: string;
}

export interface BusinessInfo {
  industry: string;
  buyerCategory: string;
  annualEstimatedVolume?: number; // Pcs/year
  preferredProductCategories?: string[];
}

export interface CommercialInfo {
  currency: ClientCurrency;
  paymentTerms: string;
  incoterms: string;
  creditLimit: number; // In currency
  taxVatId?: string;
  preferredShippingMethod?: string;
  defaultShippingDestination?: string;
}

export interface ManufacturingPreferences {
  preferredFabrics?: string;
  preferredGsmRange?: string;
  preferredMoq?: number;
  qualityRequirements?: string;
  packagingRequirements?: string;
  labelingRequirements?: string;
}

export interface ClientOrderRecord {
  id: string;
  orderNumber: string;
  styleCode: string;
  styleName: string;
  productCategory: string;
  quantity: number;
  orderValue: number;
  currency: ClientCurrency;
  status: "confirmed" | "production" | "quality_check" | "packed" | "shipped" | "completed" | "cancelled";
  orderDate: string;
  deliveryDate: string;
}

export interface ClientCostingRecord {
  id: string;
  estimateNumber: string;
  orderNumber: string;
  styleName: string;
  quantity: number;
  costPerPiece: number;
  sellingPricePerPiece: number;
  currency: ClientCurrency;
  status: "draft" | "calculated" | "under_review" | "approved" | "rejected";
  createdAt: string;
}

export interface ClientQuotationRecord {
  id: string;
  quoteNumber: string;
  styleName: string;
  quantity: number;
  totalValue: number;
  currency: ClientCurrency;
  status: "Draft" | "Sent" | "Negotiation" | "Accepted" | "Rejected" | "Expired";
  validUntil: string;
  createdAt: string;
}

export interface ClientInvoiceRecord {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  amount: number;
  paidAmount: number;
  currency: ClientCurrency;
  dueDate: string;
  issueDate: string;
  status: "Paid" | "Partially Paid" | "Unpaid" | "Overdue";
}

export interface ClientTimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "created" | "order" | "quote" | "costing" | "invoice" | "payment" | "status_change" | "note";
  author?: string;
}

export interface ClientRecord {
  id: string; // Stable internal ID, e.g. "clt_001" (never changes even if company name changes)
  clientId: string; // Display ID, e.g. "CLT-2026-001"
  companyName: string;
  clientType: ClientType;
  country: ClientCountry;
  city: string;
  website?: string;
  
  primaryContact: PrimaryContact;
  secondaryContact?: SecondaryContact;
  
  businessInfo: BusinessInfo;
  commercialInfo: CommercialInfo;
  manufacturingPreferences: ManufacturingPreferences;
  
  clientNotes?: string;
  internalNotes?: string;
  accountManager: string;
  status: ClientStatus;
  
  // Relational data
  orders: ClientOrderRecord[];
  costEstimates: ClientCostingRecord[];
  quotations: ClientQuotationRecord[];
  invoices: ClientInvoiceRecord[];
  timeline: ClientTimelineEvent[];
  
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
}

export const CLIENT_STORAGE_KEY = "factoryos_clients";

// Helper to check if a client has any linked transactional data
export function hasLinkedTransactions(client: ClientRecord): boolean {
  const hasOrders = Array.isArray(client.orders) && client.orders.length > 0;
  const hasCosting = Array.isArray(client.costEstimates) && client.costEstimates.length > 0;
  const hasQuotes = Array.isArray(client.quotations) && client.quotations.length > 0;
  const hasInvoices = Array.isArray(client.invoices) && client.invoices.length > 0;
  return hasOrders || hasCosting || hasQuotes || hasInvoices;
}

// Helper to compute client summary metrics
export function computeClientMetrics(client: ClientRecord) {
  const orders = client.orders || [];
  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) => o.status === "production" || o.status === "confirmed" || o.status === "quality_check" || o.status === "packed").length;
  const completedOrders = orders.filter((o) => o.status === "completed" || o.status === "shipped").length;
  
  const totalOrderValue = orders.reduce((sum, o) => sum + (o.orderValue || 0), 0);
  const totalUnits = orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalOrderValue / totalOrders : 0;
  
  const invoices = client.invoices || [];
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const outstanding = totalInvoiced - totalPaid;
  const overdue = invoices
    .filter((i) => i.status === "Overdue")
    .reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);
    
  return {
    totalOrders,
    activeOrders,
    completedOrders,
    totalOrderValue,
    totalUnits,
    avgOrderValue,
    totalInvoiced,
    totalPaid,
    outstanding,
    overdue,
  };
}

// Initial realistic seed data for Garment Manufacturing ERP
export const INITIAL_CLIENTS: ClientRecord[] = [
  {
    id: "clt_001",
    clientId: "CLT-2026-001",
    companyName: "Urban Luxe Apparel",
    clientType: "Brand",
    country: "United Kingdom",
    city: "London",
    website: "https://urbanluxe.co.uk",
    primaryContact: {
      name: "Sarah Jenkins",
      designation: "Head of Sourcing & Merchandising",
      email: "s.jenkins@urbanluxe.co.uk",
      phone: "+44 20 7946 0912",
      whatsApp: "+44 7700 900123",
    },
    secondaryContact: {
      name: "Oliver Smith",
      designation: "Product Developer",
      email: "o.smith@urbanluxe.co.uk",
      phone: "+44 20 7946 0915",
    },
    businessInfo: {
      industry: "High-Street Apparel & Streetwear",
      buyerCategory: "Premium Wholesale Brand",
      annualEstimatedVolume: 35000,
      preferredProductCategories: ["Hoodies & Sweatshirts", "Heavyweight T-Shirts", "Joggers"],
    },
    commercialInfo: {
      currency: "USD",
      paymentTerms: "30% Advance TT / 70% before BL Release",
      incoterms: "FOB Sialkot",
      creditLimit: 75000,
      taxVatId: "GB 982 3411 90",
      preferredShippingMethod: "Air Cargo",
      defaultShippingDestination: "London Heathrow Logistics Hub",
    },
    manufacturingPreferences: {
      preferredFabrics: "380 GSM 100% Combed Cotton Fleece, 2x2 Spandex Rib",
      preferredGsmRange: "280 - 450 GSM",
      preferredMoq: 500,
      qualityRequirements: "AQL 2.5 Major / 4.0 Minor, Pre-shrunk silicone finish",
      packagingRequirements: "Individual biodegradable polybag with moisture absorber, 20 pcs/carton",
      labelingRequirements: "High-density damask woven neck label + FSC swing tag",
    },
    clientNotes: "High attention to garment wash handle and color consistency across dye lots.",
    internalNotes: "Tier-1 buyer. Consistently confirms TT within 48h of invoice release.",
    accountManager: "Hamza Tariq (Senior Export Merchandiser)",
    status: "active",
    orders: [
      {
        id: "ord_1",
        orderNumber: "ORD-2026-001",
        styleCode: "HD-380",
        styleName: "HD-380 — 380 GSM Heavyweight Hoodie",
        productCategory: "Hoodies",
        quantity: 500,
        orderValue: 10545,
        currency: "USD",
        status: "production",
        orderDate: "2026-08-15",
        deliveryDate: "2026-09-12",
      },
    ],
    costEstimates: [
      {
        id: "cst_1",
        estimateNumber: "CST-2026-001",
        orderNumber: "ORD-2026-001",
        styleName: "HD-380 — 380 GSM Heavyweight Hoodie",
        quantity: 500,
        costPerPiece: 15.82,
        sellingPricePerPiece: 21.09,
        currency: "USD",
        status: "approved",
        createdAt: "2026-08-20",
      },
    ],
    quotations: [
      {
        id: "qt_1",
        quoteNumber: "QT-2026-001",
        styleName: "HD-380 — 380 GSM Heavyweight Hoodie",
        quantity: 500,
        totalValue: 10545,
        currency: "USD",
        status: "Accepted",
        validUntil: "2026-09-01",
        createdAt: "2026-08-18",
      },
    ],
    invoices: [
      {
        id: "inv_1",
        invoiceNumber: "INV-2026-001",
        orderNumber: "ORD-2026-001",
        amount: 3163.5, // 30% advance deposit
        paidAmount: 3163.5,
        currency: "USD",
        dueDate: "2026-08-20",
        issueDate: "2026-08-16",
        status: "Paid",
      },
    ],
    timeline: [
      {
        id: "evt_1",
        title: "Account Registered",
        description: "Client account onboarded by Hamza Tariq with $75,000 credit limit.",
        timestamp: "2026-08-10 10:30 AM",
        type: "created",
        author: "Hamza Tariq",
      },
      {
        id: "evt_2",
        title: "Quotation QT-2026-001 Accepted",
        description: "Formal FOB quotation accepted for 500 pcs HD-380 Hoodie.",
        timestamp: "2026-08-18 03:15 PM",
        type: "quote",
        author: "Sarah Jenkins",
      },
      {
        id: "evt_3",
        title: "Advance Deposit Received",
        description: "30% advance TT received ($3,163.50) against INV-2026-001.",
        timestamp: "2026-08-20 11:00 AM",
        type: "payment",
        author: "Finance Desk",
      },
      {
        id: "evt_4",
        title: "BOM Cost Estimate Approved",
        description: "Cost sheet CST-2026-001 approved by Plant Manager at $21.09/pc.",
        timestamp: "2026-08-20 11:30 AM",
        type: "costing",
        author: "Tariq Mahmood",
      },
    ],
    createdAt: "2026-08-10T10:30:00.000Z",
    updatedAt: "2026-08-20T11:30:00.000Z",
  },
  {
    id: "clt_002",
    clientId: "CLT-2026-002",
    companyName: "Nordic Athletic",
    clientType: "Retailer",
    country: "Sweden",
    city: "Stockholm",
    website: "https://nordicathletic.se",
    primaryContact: {
      name: "Erik Lindqvist",
      designation: "Product Category Manager",
      email: "e.lindqvist@nordicathletic.se",
      phone: "+46 8 123 4567",
      whatsApp: "+46 70 123 4567",
    },
    businessInfo: {
      industry: "Athletic & Performance Activewear",
      buyerCategory: "Multi-Store Retail Chain",
      annualEstimatedVolume: 60000,
      preferredProductCategories: ["Heavyweight T-Shirts", "Performance Tanks", "Gym Shorts"],
    },
    commercialInfo: {
      currency: "USD",
      paymentTerms: "Net 30 Days after Port Clearance",
      incoterms: "CIF Gothenburg",
      creditLimit: 120000,
      taxVatId: "SE 556012 3456",
      preferredShippingMethod: "Sea Freight (FCL)",
      defaultShippingDestination: "Port of Gothenburg Logistics Terminal",
    },
    manufacturingPreferences: {
      preferredFabrics: "240 GSM Organic Cotton Jersey, Spandex Collar Rib",
      preferredGsmRange: "200 - 260 GSM",
      preferredMoq: 1000,
      qualityRequirements: "GOTS Certified Organic Cotton, OEKO-TEX Standard 100",
      packagingRequirements: "Master carton 40 pcs flat folded in biodegradable master poly",
      labelingRequirements: "Tagless heat transfer neck print + FSC recycled paper hangtag",
    },
    clientNotes: "Requires strict adherence to Scandinavian eco-packaging standards.",
    internalNotes: "Established buyer for 4+ years. Annual contract renewed every January.",
    accountManager: "Zainab Raza (Key Account Director)",
    status: "active",
    orders: [
      {
        id: "ord_2",
        orderNumber: "ORD-2026-002",
        styleCode: "TS-240",
        styleName: "TS-240 — 240 GSM Boxy Heavy T-Shirt",
        productCategory: "T-Shirts",
        quantity: 1200,
        orderValue: 12852,
        currency: "USD",
        status: "quality_check",
        orderDate: "2026-08-12",
        deliveryDate: "2026-09-05",
      },
    ],
    costEstimates: [
      {
        id: "cst_2",
        estimateNumber: "CST-2026-002",
        orderNumber: "ORD-2026-002",
        styleName: "TS-240 — 240 GSM Boxy Heavy T-Shirt",
        quantity: 1200,
        costPerPiece: 8.35,
        sellingPricePerPiece: 10.71,
        currency: "USD",
        status: "calculated",
        createdAt: "2026-08-22",
      },
    ],
    quotations: [
      {
        id: "qt_2",
        quoteNumber: "QT-2026-002",
        styleName: "TS-240 — 240 GSM Boxy Heavy T-Shirt",
        quantity: 1200,
        totalValue: 12852,
        currency: "USD",
        status: "Accepted",
        validUntil: "2026-08-30",
        createdAt: "2026-08-14",
      },
    ],
    invoices: [
      {
        id: "inv_2",
        invoiceNumber: "INV-2026-002",
        orderNumber: "ORD-2026-002",
        amount: 12852,
        paidAmount: 0,
        currency: "USD",
        dueDate: "2026-09-20",
        issueDate: "2026-08-22",
        status: "Unpaid",
      },
    ],
    timeline: [
      {
        id: "evt_21",
        title: "Account Verified",
        description: "Nordic Athletic account verified for Fall 2026 bulk order delivery.",
        timestamp: "2026-08-01 09:00 AM",
        type: "created",
        author: "Zainab Raza",
      },
      {
        id: "evt_22",
        title: "Order ORD-2026-002 Stage: Quality Check",
        description: "1,200 units of TS-240 reached QA inspection bay.",
        timestamp: "2026-08-24 02:00 PM",
        type: "order",
        author: "Floor Supervisor",
      },
    ],
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-24T14:00:00.000Z",
  },
  {
    id: "clt_003",
    clientId: "CLT-2026-003",
    companyName: "Coastal Threads",
    clientType: "Brand",
    country: "United States",
    city: "Los Angeles",
    website: "https://coastalthreadsla.com",
    primaryContact: {
      name: "Marcus Vance",
      designation: "Director of Production",
      email: "m.vance@coastalthreadsla.com",
      phone: "+1 213 555 0198",
      whatsApp: "+1 213 555 0198",
    },
    businessInfo: {
      industry: "Casual Sportswear & Loungewear",
      buyerCategory: "DTC & Wholesale Brand",
      annualEstimatedVolume: 45000,
      preferredProductCategories: ["French Terry Joggers", "Zip Hoodies", "Crewnecks"],
    },
    commercialInfo: {
      currency: "USD",
      paymentTerms: "Letter of Credit (LC at Sight)",
      incoterms: "FOB Karachi / Sialkot",
      creditLimit: 100000,
      taxVatId: "US 95-4821903",
      preferredShippingMethod: "Sea Freight (FCL)",
      defaultShippingDestination: "Port of Long Beach, California",
    },
    manufacturingPreferences: {
      preferredFabrics: "320 GSM 100% Organic Cotton French Terry",
      preferredGsmRange: "300 - 380 GSM",
      preferredMoq: 800,
      qualityRequirements: "Tonal precision embroidery, flatlock decorative stitching",
      packagingRequirements: "Recycled polybags, 25 pcs per export box",
      labelingRequirements: "Side seam woven flag label + custom size print",
    },
    clientNotes: "Requires custom dyed drawstrings with dipped silicone tips.",
    internalNotes: "LC opens swiftly via Wells Fargo Bank.",
    accountManager: "Hamza Tariq (Senior Export Merchandiser)",
    status: "active",
    orders: [
      {
        id: "ord_3",
        orderNumber: "ORD-2026-003",
        styleCode: "JG-320",
        styleName: "JG-320 — French Terry Cuffed Joggers",
        productCategory: "Joggers",
        quantity: 800,
        orderValue: 13520,
        currency: "USD",
        status: "production",
        orderDate: "2026-08-16",
        deliveryDate: "2026-09-28",
      },
    ],
    costEstimates: [
      {
        id: "cst_3",
        estimateNumber: "CST-2026-003",
        orderNumber: "ORD-2026-003",
        styleName: "JG-320 — French Terry Cuffed Joggers",
        quantity: 800,
        costPerPiece: 12.84,
        sellingPricePerPiece: 16.90,
        currency: "USD",
        status: "under_review",
        createdAt: "2026-08-25",
      },
    ],
    quotations: [
      {
        id: "qt_3",
        quoteNumber: "QT-2026-003",
        styleName: "JG-320 — French Terry Cuffed Joggers",
        quantity: 800,
        totalValue: 13520,
        currency: "USD",
        status: "Negotiation",
        validUntil: "2026-09-10",
        createdAt: "2026-08-20",
      },
    ],
    invoices: [],
    timeline: [
      {
        id: "evt_31",
        title: "Client Profile Created",
        description: "New California-based brand profile registered for Fall 2026 sample development.",
        timestamp: "2026-08-05 11:00 AM",
        type: "created",
        author: "Hamza Tariq",
      },
    ],
    createdAt: "2026-08-05T11:00:00.000Z",
    updatedAt: "2026-08-25T14:00:00.000Z",
  },
  {
    id: "clt_004",
    clientId: "CLT-2026-004",
    companyName: "Highland Outdoor",
    clientType: "Manufacturer",
    country: "Germany",
    city: "Munich",
    website: "https://highlandoutdoor.de",
    primaryContact: {
      name: "Klaus Weber",
      designation: "Supply Chain & Procurement Lead",
      email: "k.weber@highlandoutdoor.de",
      phone: "+49 89 987654",
      whatsApp: "+49 170 1234567",
    },
    businessInfo: {
      industry: "Technical Outdoor & Hiking Apparel",
      buyerCategory: "European Outdoor Manufacturer",
      annualEstimatedVolume: 20000,
      preferredProductCategories: ["Technical Windbreakers", "Bonded Fleece Jackets"],
    },
    commercialInfo: {
      currency: "EUR",
      paymentTerms: "30% Advance TT / 70% after AQL Passed",
      incoterms: "CIF Hamburg",
      creditLimit: 60000,
      taxVatId: "DE 123456789",
      preferredShippingMethod: "Air Cargo",
      defaultShippingDestination: "Munich Air Cargo Logistics Terminal",
    },
    manufacturingPreferences: {
      preferredFabrics: "Waterproof Taslan Nylon, 3-Layer Bonded Microfleece",
      preferredGsmRange: "180 - 320 GSM",
      preferredMoq: 400,
      qualityRequirements: "Seam-sealed tape testing, YKK AquaGuard zipper durability",
      packagingRequirements: "Individual hanging garment bag with breathable mesh",
      labelingRequirements: "High-visibility reflective transfers + German care instructions",
    },
    clientNotes: "Hydrostatic head waterproof testing report mandatory before dispatch.",
    internalNotes: "Rigorous technical inspection standards. Always sample seal before bulk cut.",
    accountManager: "Hamza Tariq (Senior Export Merchandiser)",
    status: "active",
    orders: [
      {
        id: "ord_4",
        orderNumber: "ORD-2026-004",
        styleCode: "HD-380",
        styleName: "HD-380 — 380 GSM Heavyweight Hoodie",
        productCategory: "Hoodies",
        quantity: 450,
        orderValue: 9490.5,
        currency: "EUR",
        status: "packed",
        orderDate: "2026-08-01",
        deliveryDate: "2026-08-30",
      },
    ],
    costEstimates: [],
    quotations: [],
    invoices: [
      {
        id: "inv_4",
        invoiceNumber: "INV-2026-004",
        orderNumber: "ORD-2026-004",
        amount: 9490.5,
        paidAmount: 9490.5,
        currency: "EUR",
        dueDate: "2026-08-28",
        issueDate: "2026-08-25",
        status: "Paid",
      },
    ],
    timeline: [
      {
        id: "evt_41",
        title: "Account Created",
        description: "Highland Outdoor account opened for technical garment production.",
        timestamp: "2026-07-20 02:00 PM",
        type: "created",
        author: "Hamza Tariq",
      },
      {
        id: "evt_42",
        title: "Full Settlement Received",
        description: "100% invoice settlement received (€9,490.50) for ORD-2026-004.",
        timestamp: "2026-08-27 10:00 AM",
        type: "payment",
        author: "Finance Desk",
      },
    ],
    createdAt: "2026-07-20T14:00:00.000Z",
    updatedAt: "2026-08-27T10:00:00.000Z",
  },
  {
    id: "clt_005",
    clientId: "CLT-2026-005",
    companyName: "Desert Activewear",
    clientType: "Wholesaler",
    country: "UAE",
    city: "Dubai",
    website: "https://desertactive.ae",
    primaryContact: {
      name: "Tariq Al-Mansoor",
      designation: "Managing Director",
      email: "tariq@desertactive.ae",
      phone: "+971 4 345 6789",
      whatsApp: "+971 50 123 4567",
    },
    businessInfo: {
      industry: "Middle East Athleisure & Sportswear",
      buyerCategory: "Regional Master Distributor",
      annualEstimatedVolume: 80000,
      preferredProductCategories: ["Moisture Wicking Tees", "Track Jackets", "Gym Tights"],
    },
    commercialInfo: {
      currency: "AED",
      paymentTerms: "50% Advance TT / 50% upon Cargo Departure",
      incoterms: "CIF Jebel Ali",
      creditLimit: 150000,
      taxVatId: "AE 100234567800003",
      preferredShippingMethod: "Sea Freight (FCL)",
      defaultShippingDestination: "Jebel Ali Free Zone Port",
    },
    manufacturingPreferences: {
      preferredFabrics: "Micro-Polyester Interlock, UPF 50+ Sun Protection Lycra",
      preferredGsmRange: "140 - 220 GSM",
      preferredMoq: 1500,
      qualityRequirements: "Quick-dry moisture wicking test certified",
      packagingRequirements: "Individual hanging polybags, 50 pcs per carton",
      labelingRequirements: "Arabic + English bilingual wash care label",
    },
    clientNotes: "Targeting Q4 Middle East Marathon Series.",
    internalNotes: "Prospective large volume account. Sample sets dispatched for evaluation.",
    accountManager: "Zainab Raza (Key Account Director)",
    status: "prospect",
    orders: [],
    costEstimates: [],
    quotations: [
      {
        id: "qt_5",
        quoteNumber: "QT-2026-005",
        styleName: "JK-450 — Technical Windbreaker Jacket",
        quantity: 300,
        totalValue: 9800,
        currency: "USD",
        status: "Sent",
        validUntil: "2026-09-15",
        createdAt: "2026-08-26",
      },
    ],
    invoices: [],
    timeline: [
      {
        id: "evt_51",
        title: "Prospect Lead Added",
        description: "Desert Activewear onboarded following Dubai Apparel Sourcing Expo.",
        timestamp: "2026-08-25 04:00 PM",
        type: "created",
        author: "Zainab Raza",
      },
      {
        id: "evt_52",
        title: "Quotation QT-2026-005 Dispatched",
        description: "Price proposal sent for 300 pcs JK-450 Track Jackets.",
        timestamp: "2026-08-26 09:30 AM",
        type: "quote",
        author: "Zainab Raza",
      },
    ],
    createdAt: "2026-08-25T16:00:00.000Z",
    updatedAt: "2026-08-26T09:30:00.000Z",
  },
];

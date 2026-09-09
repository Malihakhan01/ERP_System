/**
 * FactoryOS Garment ERP — Clients MySQL 8 Repository
 * Replaces Database clients-db with live MySQL CRUD.
 */

import { executeQuery, MySQL } from "./db";
import type { ClientRecord, ClientStatus, ClientType, ClientCountry, ClientCurrency } from "@/lib/clients-engine";

export async function getClientsFromMySQL(): Promise<ClientRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `clients` WHERE `is_archived` = 0 ORDER BY `created_at` DESC"
  );

  return rows.map((r) => {
    let parsedNotes: any = {};
    try {
      if (r.notes && (r.notes.startsWith("{") || r.notes.startsWith("["))) {
        parsedNotes = JSON.parse(r.notes);
      }
    } catch {
      // plain text note
    }

    return {
      id: String(r.id),
      clientId: r.display_id || `CLT-2026-${String(r.id).padStart(3, "0")}`,
      companyName: r.company_name,
      clientType: (parsedNotes.clientType || "Brand") as ClientType,
      country: (r.country || "United Kingdom") as ClientCountry,
      city: r.city || "",
      website: parsedNotes.website || undefined,

      primaryContact: {
        name: r.contact_person || "Operations Manager",
        designation: parsedNotes.primaryDesignation || "Procurement Director",
        email: r.email || "",
        phone: r.phone || "",
        whatsApp: parsedNotes.whatsApp || undefined,
      },

      secondaryContact: parsedNotes.secondaryContact || undefined,

      businessInfo: {
        industry: parsedNotes.industry || "High-Street Apparel & Streetwear",
        buyerCategory: r.brand_name || "Premium Wholesale Brand",
        annualEstimatedVolume: parsedNotes.annualEstimatedVolume ? Number(parsedNotes.annualEstimatedVolume) : 25000,
        preferredProductCategories: parsedNotes.preferredProductCategories || ["Hoodies & Sweatshirts", "T-Shirts & Polos"],
      },

      commercialInfo: {
        currency: (r.currency || "PKR") as ClientCurrency,
        paymentTerms: r.payment_terms || "30% Advance TT / 70% LC at Sight",
        incoterms: parsedNotes.incoterms || "FOB Sialkot",
        creditLimit: Number(r.credit_limit) || 50000,
        taxVatId: r.tax_number || undefined,
        preferredShippingMethod: parsedNotes.shippingMethod || "Air Cargo",
        defaultShippingDestination: parsedNotes.shippingDestination || "London Heathrow Logistics Hub",
      },

      manufacturingPreferences: parsedNotes.manufacturingPreferences || {
        preferredFabrics: "100% Combed Cotton Fleece, French Terry, Single Jersey",
        preferredGsmRange: "240 - 450 GSM",
        preferredMoq: 500,
        packagingRequirements: "Standard 5-ply master export cartons",
        labelingRequirements: "Standard buyer tags and care labels",
      },

      clientNotes: typeof r.notes === "string" && !r.notes.startsWith("{") ? r.notes : undefined,
      internalNotes: parsedNotes.internalNotes || undefined,
      accountManager: parsedNotes.accountManager || "Senior Merchandiser",
      status: (parsedNotes.status || "active") as ClientStatus,

      orders: [],
      costEstimates: [],
      quotations: [],
      invoices: [],
      timeline: parsedNotes.timeline || [
        {
          id: `evt_init_${r.id}`,
          title: "Buyer Account Registered",
          description: `Client account created for ${r.company_name} in ${r.country || "Global Market"}.`,
          timestamp: new Date(r.created_at || Date.now()).toISOString().replace("T", " ").substring(0, 19),
          type: "created",
          author: "System Administrator",
        },
      ],

      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
      isArchived: Boolean(r.is_archived),
    };
  });
}

export async function getClientByIdFromMySQL(id: string): Promise<ClientRecord | null> {
  const rows = await executeQuery<any>("SELECT * FROM `clients` WHERE `id` = ?", [id]);
  if (!rows || rows.length === 0) return null;
  const clients = await getClientsFromMySQL();
  return clients.find((c) => c.id === String(id)) || null;
}

export async function createClientInMySQL(data: Partial<ClientRecord>): Promise<string> {
  const maxRows = await executeQuery<any>("SELECT COALESCE(MAX(id), 0) as max_id FROM `clients`");
  const nextNum = (maxRows[0]?.max_id || 0) + 1;
  const displayId = data.clientId || `CLT-2026-${String(nextNum).padStart(3, "0")}`;

  const notesJson = JSON.stringify({
    clientType: data.clientType || "Brand",
    website: data.website || "",
    primaryDesignation: data.primaryContact?.designation || "",
    whatsApp: data.primaryContact?.whatsApp || "",
    secondaryContact: data.secondaryContact || null,
    industry: data.businessInfo?.industry || "High-Street Apparel & Streetwear",
    annualEstimatedVolume: data.businessInfo?.annualEstimatedVolume || 25000,
    preferredProductCategories: data.businessInfo?.preferredProductCategories || ["Hoodies & Sweatshirts"],
    incoterms: data.commercialInfo?.incoterms || "FOB Sialkot",
    shippingMethod: data.commercialInfo?.preferredShippingMethod || "Air Cargo",
    shippingDestination: data.commercialInfo?.defaultShippingDestination || "London Heathrow Logistics Hub",
    manufacturingPreferences: data.manufacturingPreferences || {},
    internalNotes: data.internalNotes || "",
    accountManager: data.accountManager || "Senior Merchandiser",
    status: data.status || "active",
    timeline: data.timeline || [
      {
        id: `evt_${Date.now()}`,
        title: "Buyer Profile Created",
        description: `Registered commercial account for ${data.companyName}.`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        type: "created",
        author: "Merchandising Dept",
      },
    ],
  });

  const insertId = await MySQL.insert("clients", {
    uuid: crypto.randomUUID(),
    display_id: displayId,
    company_name: data.companyName || "Untitled Client",
    brand_name: data.businessInfo?.buyerCategory || data.companyName || "Apparel Brand",
    country: data.country || "United Kingdom",
    city: data.city || "London",
    contact_person: data.primaryContact?.name || "Primary Contact",
    email: data.primaryContact?.email || "buyer@brand.com",
    phone: data.primaryContact?.phone || "+44 20 7946 0912",
    currency: data.commercialInfo?.currency || "PKR",
    credit_limit: data.commercialInfo?.creditLimit || 50000,
    payment_terms: data.commercialInfo?.paymentTerms || "30% Advance TT / 70% LC at Sight",
    tax_number: data.commercialInfo?.taxVatId || null,
    is_archived: 0,
    notes: notesJson,
  });

  return String(insertId);
}

export async function updateClientInMySQL(id: string, data: Partial<ClientRecord>): Promise<boolean> {
  const payload: Record<string, any> = {};

  if (data.companyName) payload.company_name = data.companyName;
  if (data.country) payload.country = data.country;
  if (data.city) payload.city = data.city;
  if (data.primaryContact?.name) payload.contact_person = data.primaryContact.name;
  if (data.primaryContact?.email) payload.email = data.primaryContact.email;
  if (data.primaryContact?.phone) payload.phone = data.primaryContact.phone;
  if (data.commercialInfo?.currency) payload.currency = data.commercialInfo.currency;
  if (data.commercialInfo?.creditLimit !== undefined) payload.credit_limit = data.commercialInfo.creditLimit;
  if (data.commercialInfo?.paymentTerms) payload.payment_terms = data.commercialInfo.paymentTerms;
  if (data.commercialInfo?.taxVatId) payload.tax_number = data.commercialInfo.taxVatId;
  if (data.isArchived !== undefined) payload.is_archived = data.isArchived ? 1 : 0;

  const notesJson = JSON.stringify({
    clientType: data.clientType || "Brand",
    website: data.website || "",
    primaryDesignation: data.primaryContact?.designation || "",
    whatsApp: data.primaryContact?.whatsApp || "",
    secondaryContact: data.secondaryContact || null,
    industry: data.businessInfo?.industry || "High-Street Apparel & Streetwear",
    annualEstimatedVolume: data.businessInfo?.annualEstimatedVolume || 25000,
    preferredProductCategories: data.businessInfo?.preferredProductCategories || ["Hoodies & Sweatshirts"],
    incoterms: data.commercialInfo?.incoterms || "FOB Sialkot",
    shippingMethod: data.commercialInfo?.preferredShippingMethod || "Air Cargo",
    shippingDestination: data.commercialInfo?.defaultShippingDestination || "London Heathrow Logistics Hub",
    manufacturingPreferences: data.manufacturingPreferences || {},
    internalNotes: data.internalNotes || "",
    accountManager: data.accountManager || "Senior Merchandiser",
    status: data.status || "active",
    timeline: data.timeline || [],
  });
  payload.notes = notesJson;

  return MySQL.update("clients", id, payload);
}

export async function deleteClientInMySQL(id: string): Promise<boolean> {
  return MySQL.delete("clients", id, true);
}

export async function getClientMetricsFromMySQL() {
  const clients = await getClientsFromMySQL();
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const prospects = clients.filter((c) => c.status === "prospect").length;
  const internationalCount = clients.filter((c) => c.country !== "Other").length;
  const totalPortfolioOrderValue = clients.reduce((acc, c) => acc + (c.commercialInfo.creditLimit || 0), 0);

  return {
    totalClients,
    activeClients,
    prospects,
    internationalCount,
    totalPortfolioOrderValue,
  };
}

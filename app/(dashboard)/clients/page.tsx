"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard, CardGrid, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog, Modal, ModalFooter } from "@/components/ui/Modal";
import { EmptyState, Pagination } from "@/components/ui/Misc";
import { FormField, FormSection } from "@/components/forms/FormField";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  Users,
  Plus,
  Search,
  Building2,
  DollarSign,
  Briefcase,
  RotateCcw,
  Eye,
  Edit,
  Copy,
  Trash2,
  Archive,
  ArrowLeft,
  Globe,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  Calculator,
  Receipt,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  MapPin,
  RefreshCw,
} from "lucide-react";
import {
  ClientRecord,
  ClientStatus,
  ClientType,
  ClientCountry,
  ClientCurrency,
  CLIENT_STORAGE_KEY,
  INITIAL_CLIENTS,
  hasLinkedTransactions,
  computeClientMetrics,
} from "@/lib/clients-engine";
import { CURRENCY_SYMBOLS } from "@/lib/costing-engine";
import {
  getClientsFromSupabase,
  createClientInSupabase,
  updateClientInSupabase,
  deleteClientInSupabase,
} from "@/lib/services/clients-service";

const STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; variant: "primary" | "warning" | "info" | "success" | "danger" | "default" }
> = {
  active: { label: "Active Account", variant: "success" },
  prospect: { label: "Prospect / Lead", variant: "primary" },
  on_hold: { label: "On Credit Hold", variant: "warning" },
  inactive: { label: "Inactive", variant: "default" },
};

const COUNTRY_OPTIONS: ClientCountry[] = [
  "United Kingdom",
  "United States",
  "Sweden",
  "Germany",
  "UAE",
  "Saudi Arabia",
  "Canada",
  "Australia",
  "Other",
];

const CLIENT_TYPE_OPTIONS: ClientType[] = [
  "Brand",
  "Retailer",
  "Wholesaler",
  "Manufacturer",
  "Importer",
  "Distributor",
  "Agent",
];

export default function ClientsPage() {
  const { success, error: toastError } = useToast();

  // View Mode: "list" | "create" | "edit" | "detail"
  const [viewMode, setViewMode] = React.useState<"list" | "create" | "edit" | "detail">("list");
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);

  // Detail Sub-Tab: "overview" | "orders" | "costing" | "quotations" | "invoices" | "timeline" | "manufacturing"
  const [detailTab, setDetailTab] = React.useState<
    "overview" | "orders" | "costing" | "quotations" | "invoices" | "timeline" | "manufacturing"
  >("overview");

  // Hydration-Safe State Synchronization
  const getSnapshot = React.useCallback(() => {
    try {
      if (typeof window === "undefined") return JSON.stringify(INITIAL_CLIENTS);
      const stored = localStorage.getItem(CLIENT_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(INITIAL_CLIENTS));
        return JSON.stringify(INITIAL_CLIENTS);
      }
      return stored;
    } catch {
      return JSON.stringify(INITIAL_CLIENTS);
    }
  }, []);

  const getServerSnapshot = React.useCallback(() => JSON.stringify(INITIAL_CLIENTS), []);

  const subscribe = React.useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }, []);

  const rawJson = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [localOverride, setLocalOverride] = React.useState<ClientRecord[] | null>(null);
  const [loadingClients, setLoadingClients] = React.useState(false);

  const loadClients = React.useCallback(async (showToast = false) => {
    setLoadingClients(true);
    try {
      const data = await getClientsFromSupabase();
      if (data && data.length > 0) {
        setLocalOverride(data);
      }
      if (showToast) {
        success("Clients Refreshed", { description: "Loaded live client accounts from MySQL." });
      }
    } catch (err: any) {
      console.error("Failed to load clients:", err);
      if (showToast) {
        toastError("Failed to Refresh Clients", { description: err.message });
      }
    } finally {
      setLoadingClients(false);
    }
  }, [success, toastError]);

  // Sync on mount
  React.useEffect(() => {
    loadClients();
  }, [loadClients]);

  const clients = React.useMemo(() => {
    let list: ClientRecord[];
    if (localOverride !== null) {
      list = localOverride;
    } else {
      try {
        list = JSON.parse(rawJson) as ClientRecord[];
      } catch {
        list = INITIAL_CLIENTS;
      }
    }

    return list.filter((c) => {
      if (!c) return false;
      const nameLower = (c.companyName || "").toLowerCase().trim();
      const isExplicitTestDummy =
        nameLower === "honey" ||
        nameLower === "honey (branch / subsidiary)" ||
        nameLower.includes("dummy") ||
        nameLower.includes("asdasd");

      if (isExplicitTestDummy && !hasLinkedTransactions(c)) {
        return false;
      }
      return true;
    });
  }, [rawJson, localOverride]);

  const saveClients = (records: ClientRecord[]) => {
    setLocalOverride(records);
    try {
      localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(records));
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore
    }
  };

  // Active selected client object
  const activeClient = React.useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [countryFilter, setCountryFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"name" | "recent" | "value" | "orders">("recent");
  const [page, setPage] = React.useState(1);

  // Deletion / Archival Safety Modal State
  const [clientToDelete, setClientToDelete] = React.useState<ClientRecord | null>(null);
  const [archiveModalClient, setArchiveModalClient] = React.useState<ClientRecord | null>(null);

  // Form State (for Create & Edit)
  const [editingInternalId, setEditingInternalId] = React.useState<string | null>(null);
  const [clientId, setClientId] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [clientType, setClientType] = React.useState<ClientType>("Brand");
  const [country, setCountry] = React.useState<ClientCountry>("United Kingdom");
  const [city, setCity] = React.useState("");
  const [website, setWebsite] = React.useState("");

  // Primary Contact
  const [primaryName, setPrimaryName] = React.useState("");
  const [primaryDesignation, setPrimaryDesignation] = React.useState("");
  const [primaryEmail, setPrimaryEmail] = React.useState("");
  const [primaryPhone, setPrimaryPhone] = React.useState("");
  const [primaryWhatsApp, setPrimaryWhatsApp] = React.useState("");

  // Secondary Contact
  const [secondaryName, setSecondaryName] = React.useState("");
  const [secondaryDesignation, setSecondaryDesignation] = React.useState("");
  const [secondaryEmail, setSecondaryEmail] = React.useState("");
  const [secondaryPhone, setSecondaryPhone] = React.useState("");

  // Business Info
  const [industry, setIndustry] = React.useState("High-Street Apparel & Streetwear");
  const [buyerCategory, setBuyerCategory] = React.useState("Premium Wholesale Brand");
  const [annualEstimatedVolume, setAnnualEstimatedVolume] = React.useState("25000");
  const [preferredCategories, setPreferredCategories] = React.useState("Hoodies, T-Shirts, Joggers");

  // Commercial Info
  const [currency, setCurrency] = React.useState<ClientCurrency>("USD");
  const [paymentTerms, setPaymentTerms] = React.useState("30% Advance TT / 70% before BL Release");
  const [incoterms, setIncoterms] = React.useState("FOB Sialkot");
  const [creditLimit, setCreditLimit] = React.useState("50000");
  const [taxVatId, setTaxVatId] = React.useState("");
  const [shippingMethod, setShippingMethod] = React.useState("Air Cargo");
  const [shippingDestination, setShippingDestination] = React.useState("London Heathrow Logistics Hub");

  // Manufacturing Preferences
  const [preferredFabrics, setPreferredFabrics] = React.useState("100% Combed Cotton Fleece, French Terry, Single Jersey");
  const [preferredGsmRange, setPreferredGsmRange] = React.useState("240 - 450 GSM");
  const [preferredMoq, setPreferredMoq] = React.useState("500");
  const [qualityRequirements, setQualityRequirements] = React.useState("AQL 2.5 Major / 4.0 Minor, OEKO-TEX Standard 100");
  const [packagingRequirements, setPackagingRequirements] = React.useState("Individual Biodegradable Polybag, 20 pcs/carton");
  const [labelingRequirements, setLabelingRequirements] = React.useState("High-Density Damask Woven Neck Label + FSC Swing Tag");

  // Notes & Meta
  const [clientNotes, setClientNotes] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");
  const [accountManager, setAccountManager] = React.useState("Hamza Tariq (Senior Export Merchandiser)");
  const [status, setStatus] = React.useState<ClientStatus>("active");

  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = React.useState<string | null>(null);

  // Initialize Create Form
  const handleOpenCreate = () => {
    const currentYear = new Date().getFullYear();
    const currentMax = clients.reduce((max, c) => {
      const match = c.clientId.match(/CLT-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = currentMax + 1;
    const newDisplayId = `CLT-${currentYear}-${String(nextNum).padStart(3, "0")}`;

    setEditingInternalId(null);
    setClientId(newDisplayId);
    setCompanyName("");
    setClientType("Brand");
    setCountry("United Kingdom");
    setCity("London");
    setWebsite("");

    setPrimaryName("");
    setPrimaryDesignation("Head of Sourcing");
    setPrimaryEmail("");
    setPrimaryPhone("");
    setPrimaryWhatsApp("");

    setSecondaryName("");
    setSecondaryDesignation("");
    setSecondaryEmail("");
    setSecondaryPhone("");

    setIndustry("High-Street Apparel & Streetwear");
    setBuyerCategory("Premium Wholesale Brand");
    setAnnualEstimatedVolume("25000");
    setPreferredCategories("Hoodies, T-Shirts, Joggers");

    setCurrency("USD");
    setPaymentTerms("30% Advance TT / 70% before BL Release");
    setIncoterms("FOB Sialkot");
    setCreditLimit("50000");
    setTaxVatId("");
    setShippingMethod("Air Cargo");
    setShippingDestination("London Heathrow Hub");

    setPreferredFabrics("100% Combed Cotton Fleece, French Terry, Single Jersey");
    setPreferredGsmRange("240 - 450 GSM");
    setPreferredMoq("500");
    setQualityRequirements("AQL 2.5 Major / 4.0 Minor, OEKO-TEX Standard 100");
    setPackagingRequirements("Individual Biodegradable Polybag, 20 pcs/carton");
    setLabelingRequirements("High-Density Damask Woven Neck Label + FSC Swing Tag");

    setClientNotes("");
    setInternalNotes("");
    setAccountManager("Hamza Tariq (Senior Export Merchandiser)");
    setStatus("active");

    setFormErrors({});
    setDuplicateWarning(null);
    setViewMode("create");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Open Edit Form
  const handleOpenEdit = (client: ClientRecord) => {
    setEditingInternalId(client.id);
    setClientId(client.clientId);
    setCompanyName(client.companyName);
    setClientType(client.clientType);
    setCountry(client.country);
    setCity(client.city || "");
    setWebsite(client.website || "");

    setPrimaryName(client.primaryContact.name);
    setPrimaryDesignation(client.primaryContact.designation);
    setPrimaryEmail(client.primaryContact.email);
    setPrimaryPhone(client.primaryContact.phone);
    setPrimaryWhatsApp(client.primaryContact.whatsApp || "");

    setSecondaryName(client.secondaryContact?.name || "");
    setSecondaryDesignation(client.secondaryContact?.designation || "");
    setSecondaryEmail(client.secondaryContact?.email || "");
    setSecondaryPhone(client.secondaryContact?.phone || "");

    setIndustry(client.businessInfo.industry || "");
    setBuyerCategory(client.businessInfo.buyerCategory || "");
    setAnnualEstimatedVolume(String(client.businessInfo.annualEstimatedVolume || ""));
    setPreferredCategories((client.businessInfo.preferredProductCategories || []).join(", "));

    setCurrency(client.commercialInfo.currency);
    setPaymentTerms(client.commercialInfo.paymentTerms);
    setIncoterms(client.commercialInfo.incoterms);
    setCreditLimit(String(client.commercialInfo.creditLimit || "0"));
    setTaxVatId(client.commercialInfo.taxVatId || "");
    setShippingMethod(client.commercialInfo.preferredShippingMethod || "");
    setShippingDestination(client.commercialInfo.defaultShippingDestination || "");

    setPreferredFabrics(client.manufacturingPreferences.preferredFabrics || "");
    setPreferredGsmRange(client.manufacturingPreferences.preferredGsmRange || "");
    setPreferredMoq(String(client.manufacturingPreferences.preferredMoq || ""));
    setQualityRequirements(client.manufacturingPreferences.qualityRequirements || "");
    setPackagingRequirements(client.manufacturingPreferences.packagingRequirements || "");
    setLabelingRequirements(client.manufacturingPreferences.labelingRequirements || "");

    setClientNotes(client.clientNotes || "");
    setInternalNotes(client.internalNotes || "");
    setAccountManager(client.accountManager);
    setStatus(client.status);

    setFormErrors({});
    setDuplicateWarning(null);
    setViewMode("edit");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Open Detail Profile
  const handleOpenDetail = (client: ClientRecord) => {
    setSelectedClientId(client.id);
    setDetailTab("overview");
    setViewMode("detail");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Duplicate Client Profile
  const handleDuplicateClient = (client: ClientRecord) => {
    const currentMax = clients.reduce((max, c) => {
      const match = c.clientId.match(/CLT-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = currentMax + 1;
    const newDisplayId = `CLT-2026-${String(nextNum).padStart(3, "0")}`;
    const newInternalId = "clt_" + Date.now();
    const nowIso = new Date().toISOString();

    // Strip any existing branch/copy suffix (including repeated chains) so it is never duplicated
    const cleanBaseName = client.companyName
      .replace(/(?:\s*\((?:Branch\s*\/\s*Subsidiary|Branch\s*\d+|Copy(?:\s*\d+)?)\))+$/gi, "")
      .trim();
    const cleanDuplicatedName = `${cleanBaseName} (Branch / Subsidiary)`;

    const duplicated: ClientRecord = {
      ...client,
      id: newInternalId,
      clientId: newDisplayId,
      companyName: cleanDuplicatedName,
      status: "prospect",
      orders: [],
      costEstimates: [],
      quotations: [],
      invoices: [],
      timeline: [
        {
          id: "evt_" + Date.now(),
          title: "Account Duplicated",
          description: `Duplicated from master account ${client.clientId} (${cleanBaseName}).`,
          timestamp: new Date().toLocaleString("en-PK", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          type: "created",
          author: "Account Manager",
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updatedList = [duplicated, ...clients];
    saveClients(updatedList);
    success("Client Profile Duplicated", {
      description: `Created new prospect account ${newDisplayId} based on ${cleanBaseName}.`,
    });
    setSelectedClientId(newInternalId);
    setViewMode("detail");
  };

  // Check Duplicate Helper
  const checkLikelyDuplicates = (name: string, email: string, phone: string, excludeId?: string | null) => {
    const cleanName = name.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, "");

    const found = clients.find((c) => {
      if (excludeId && c.id === excludeId) return false;
      const cName = c.companyName.toLowerCase();
      const cEmail = c.primaryContact.email.toLowerCase();
      const cPhone = c.primaryContact.phone.replace(/[^0-9]/g, "");

      return (
        (cleanName && (cName === cleanName || cName.includes(cleanName) || cleanName.includes(cName))) ||
        (cleanEmail && cEmail === cleanEmail) ||
        (cleanPhone && cleanPhone.length > 6 && cPhone.includes(cleanPhone))
      );
    });

    if (found) {
      return `Potential duplicate match detected: "${found.companyName}" (${found.clientId}) with email ${found.primaryContact.email}.`;
    }
    return null;
  };

  // Save / Submit Client Form (Create or Edit)
  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!clientId.trim()) {
      errors.clientId = "Client ID is required.";
    }

    if (!companyName.trim()) {
      errors.companyName = "Company / Brand Name is required.";
    }

    if (!primaryName.trim()) {
      errors.primaryName = "Primary contact person name is required.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!primaryEmail.trim()) {
      errors.primaryEmail = "Primary email address is required.";
    } else if (!emailRegex.test(primaryEmail.trim())) {
      errors.primaryEmail = "Please enter a valid email format (e.g. buyer@brand.com).";
    }

    if (secondaryEmail.trim() && !emailRegex.test(secondaryEmail.trim())) {
      errors.secondaryEmail = "Secondary email address is invalid.";
    }

    const phoneRegex = /^[+0-9\s\-().]{7,25}$/;
    if (primaryPhone.trim() && !phoneRegex.test(primaryPhone.trim())) {
      errors.primaryPhone = "Please enter a valid phone number (e.g. +44 20 7946 0912).";
    }
    if (secondaryPhone.trim() && !phoneRegex.test(secondaryPhone.trim())) {
      errors.secondaryPhone = "Please enter a valid secondary phone number.";
    }
    if (primaryWhatsApp.trim() && !phoneRegex.test(primaryWhatsApp.trim())) {
      errors.primaryWhatsApp = "Please enter a valid WhatsApp number.";
    }

    const vol = parseInt(annualEstimatedVolume, 10);
    if (annualEstimatedVolume.trim() && (isNaN(vol) || vol < 0)) {
      errors.annualEstimatedVolume = "Annual volume must be a non-negative number.";
    }

    const cred = parseFloat(creditLimit);
    if (creditLimit.trim() && (isNaN(cred) || cred < 0)) {
      errors.creditLimit = "Credit limit must be a non-negative number.";
    }

    const moqVal = parseInt(preferredMoq, 10);
    if (preferredMoq.trim() && (isNaN(moqVal) || moqVal < 0)) {
      errors.preferredMoq = "MOQ must be a positive integer.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toastError("Please resolve highlighted validation errors.", {
        description: Object.values(errors)[0],
      });
      return;
    }

    // Check duplicate warning
    const warn = checkLikelyDuplicates(companyName, primaryEmail, primaryPhone, editingInternalId);
    if (warn && !duplicateWarning) {
      setDuplicateWarning(warn);
      toastError("Notice: Similar client already exists.", {
        description: `${warn} Click Save again to proceed anyway.`,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const nowReadable = new Date().toLocaleString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const parsedCategories = preferredCategories
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let clientToSave: ClientRecord;

    if (editingInternalId && activeClient) {
      clientToSave = {
        ...activeClient,
        clientId: clientId.trim().toUpperCase(),
        companyName: companyName.trim(),
        clientType,
        country,
        city: city.trim(),
        website: website.trim() || undefined,
        primaryContact: {
          name: primaryName.trim(),
          designation: primaryDesignation.trim(),
          email: primaryEmail.trim(),
          phone: primaryPhone.trim(),
          whatsApp: primaryWhatsApp.trim() || undefined,
        },
        secondaryContact: secondaryName.trim()
          ? {
              name: secondaryName.trim(),
              designation: secondaryDesignation.trim() || undefined,
              email: secondaryEmail.trim() || undefined,
              phone: secondaryPhone.trim() || undefined,
            }
          : undefined,
        businessInfo: {
          industry: industry.trim(),
          buyerCategory: buyerCategory.trim(),
          annualEstimatedVolume: isNaN(vol) ? undefined : vol,
          preferredProductCategories: parsedCategories,
        },
        commercialInfo: {
          currency,
          paymentTerms: paymentTerms.trim(),
          incoterms: incoterms.trim(),
          creditLimit: isNaN(cred) ? 0 : cred,
          taxVatId: taxVatId.trim() || undefined,
          preferredShippingMethod: shippingMethod.trim() || undefined,
          defaultShippingDestination: shippingDestination.trim() || undefined,
        },
        manufacturingPreferences: {
          preferredFabrics: preferredFabrics.trim() || undefined,
          preferredGsmRange: preferredGsmRange.trim() || undefined,
          preferredMoq: isNaN(moqVal) ? undefined : moqVal,
          qualityRequirements: qualityRequirements.trim() || undefined,
          packagingRequirements: packagingRequirements.trim() || undefined,
          labelingRequirements: labelingRequirements.trim() || undefined,
        },
        clientNotes: clientNotes.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        accountManager: accountManager.trim(),
        status,
        updatedAt: nowIso,
      };

      const updated = clients.map((c) => (c.id === editingInternalId ? clientToSave : c));
      saveClients(updated);
      success("Client Profile Updated", {
        description: `Changes saved for ${clientToSave.companyName} (${clientToSave.clientId}).`,
      });
    } else {
      const newInternalId = "clt_" + Date.now();
      clientToSave = {
        id: newInternalId,
        clientId: clientId.trim().toUpperCase(),
        companyName: companyName.trim(),
        clientType,
        country,
        city: city.trim(),
        website: website.trim() || undefined,
        primaryContact: {
          name: primaryName.trim(),
          designation: primaryDesignation.trim(),
          email: primaryEmail.trim(),
          phone: primaryPhone.trim(),
          whatsApp: primaryWhatsApp.trim() || undefined,
        },
        secondaryContact: secondaryName.trim()
          ? {
              name: secondaryName.trim(),
              designation: secondaryDesignation.trim() || undefined,
              email: secondaryEmail.trim() || undefined,
              phone: secondaryPhone.trim() || undefined,
            }
          : undefined,
        businessInfo: {
          industry: industry.trim(),
          buyerCategory: buyerCategory.trim(),
          annualEstimatedVolume: isNaN(vol) ? undefined : vol,
          preferredProductCategories: parsedCategories,
        },
        commercialInfo: {
          currency,
          paymentTerms: paymentTerms.trim(),
          incoterms: incoterms.trim(),
          creditLimit: isNaN(cred) ? 0 : cred,
          taxVatId: taxVatId.trim() || undefined,
          preferredShippingMethod: shippingMethod.trim() || undefined,
          defaultShippingDestination: shippingDestination.trim() || undefined,
        },
        manufacturingPreferences: {
          preferredFabrics: preferredFabrics.trim() || undefined,
          preferredGsmRange: preferredGsmRange.trim() || undefined,
          preferredMoq: isNaN(moqVal) ? undefined : moqVal,
          qualityRequirements: qualityRequirements.trim() || undefined,
          packagingRequirements: packagingRequirements.trim() || undefined,
          labelingRequirements: labelingRequirements.trim() || undefined,
        },
        clientNotes: clientNotes.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        accountManager: accountManager.trim(),
        status,
        orders: [],
        costEstimates: [],
        quotations: [],
        invoices: [],
        timeline: [
          {
            id: "evt_" + Date.now(),
            title: "Client Onboarded",
            description: `New ${clientType} account registered for ${country} market by ${accountManager}.`,
            timestamp: nowReadable,
            type: "created",
            author: accountManager,
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const updated = [clientToSave, ...clients];
      saveClients(updated);
      createClientInSupabase(clientToSave).catch((err) => console.error(err));
      success("Client Account Created", {
        description: `Successfully onboarded ${clientToSave.companyName} (${clientToSave.clientId}).`,
      });
    }

    if (editingInternalId && activeClient) {
      updateClientInSupabase(clientToSave).catch((err) => console.error(err));
    }

    setSelectedClientId(clientToSave.id);
    setViewMode("detail");
  };

  // Handle Quick Status Change
  const handleUpdateClientStatus = (client: ClientRecord, newStatus: ClientStatus) => {
    const nowIso = new Date().toISOString();
    const nowReadable = new Date().toLocaleString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const statusEvent = {
      id: "evt_" + Date.now(),
      title: `Status Changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`,
      description: `Account status transitioned from ${STATUS_CONFIG[client.status]?.label} to ${STATUS_CONFIG[newStatus]?.label}.`,
      timestamp: nowReadable,
      type: "status_change" as const,
      author: "Merchandising Lead",
    };

    const updatedClient: ClientRecord = {
      ...client,
      status: newStatus,
      timeline: [statusEvent, ...(client.timeline || [])],
      updatedAt: nowIso,
    };

    const updatedList = clients.map((c) => (c.id === client.id ? updatedClient : c));
    saveClients(updatedList);
    updateClientInSupabase(updatedClient).catch((err) => console.error(err));
    success("Client Status Updated", {
      description: `${client.companyName} status changed to ${STATUS_CONFIG[newStatus]?.label}.`,
    });
  };

  // Safe Deletion Handler
  const handleRequestDelete = (client: ClientRecord) => {
    if (hasLinkedTransactions(client)) {
      // Client has linked records -> Block hard delete and suggest Archive
      setArchiveModalClient(client);
    } else {
      // Client has no transactional data -> Allow permanent deletion
      setClientToDelete(client);
    }
  };

  const handleConfirmPermanentDelete = () => {
    if (!clientToDelete) return;
    const updated = clients.filter((c) => c.id !== clientToDelete.id);
    saveClients(updated);
    deleteClientInSupabase(clientToDelete.id, clientToDelete.clientId).catch((err) => console.error(err));
    success("Client Account Removed", {
      description: `${clientToDelete.companyName} (${clientToDelete.clientId}) was permanently deleted.`,
    });
    if (selectedClientId === clientToDelete.id) {
      setSelectedClientId(null);
      setViewMode("list");
    }
    setClientToDelete(null);
  };

  const handleConfirmArchive = () => {
    if (!archiveModalClient) return;
    const updatedClient: ClientRecord = {
      ...archiveModalClient,
      status: "inactive",
      isArchived: true,
      updatedAt: new Date().toISOString(),
    };
    const updated = clients.map((c) => (c.id === archiveModalClient.id ? updatedClient : c));
    saveClients(updated);
    updateClientInSupabase(updatedClient).catch((err) => console.error(err));
    success("Client Archived", {
      description: `${archiveModalClient.companyName} has been archived. Linked orders and invoices remain historically preserved.`,
    });
    setArchiveModalClient(null);
  };

  // Dynamic KPI Computations derived from actual persisted dataset
  const nonArchivedClients = clients.filter((c) => !c.isArchived);
  const totalClientsCount = nonArchivedClients.length;
  const activeClientsCount = nonArchivedClients.filter((c) => c.status === "active").length;
  const prospectsCount = nonArchivedClients.filter((c) => c.status === "prospect").length;
  const internationalCount = nonArchivedClients.filter((c) => c.country !== "Other").length;

  const totalPortfolioOrderValue = nonArchivedClients.reduce((sum, c) => {
    const ordersTotal = (c.orders || []).reduce((oSum, o) => oSum + (o.orderValue || 0), 0);
    return sum + ordersTotal;
  }, 0);

  // Search & Filter Pipeline
  const filteredClients = nonArchivedClients.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      c.companyName.toLowerCase().includes(q) ||
      c.clientId.toLowerCase().includes(q) ||
      c.primaryContact.name.toLowerCase().includes(q) ||
      c.primaryContact.email.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesCountry = countryFilter === "all" || c.country === countryFilter;
    const matchesType = typeFilter === "all" || c.clientType === typeFilter;

    return matchesSearch && matchesStatus && matchesCountry && matchesType;
  });

  // Sorting
  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortBy === "name") {
      return a.companyName.localeCompare(b.companyName);
    }
    if (sortBy === "value") {
      const aVal = (a.orders || []).reduce((s, o) => s + (o.orderValue || 0), 0);
      const bVal = (b.orders || []).reduce((s, o) => s + (o.orderValue || 0), 0);
      return bVal - aVal;
    }
    if (sortBy === "orders") {
      return (b.orders?.length || 0) - (a.orders?.length || 0);
    }
    // recent
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pageSize = 10;
  const paginatedClients = sortedClients.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <TopNav
        title={
          viewMode === "create"
            ? "Add New Apparel Buyer Account"
            : viewMode === "edit"
            ? `Edit Client Profile: ${companyName || clientId}`
            : viewMode === "detail"
            ? `Client Profile: ${activeClient?.companyName || ""}`
            : "Clients & Apparel Buyer CRM"
        }
      />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* ============================================================
            VIEW 1: CREATE / EDIT CLIENT FORM STUDIO
            ============================================================ */}
        {viewMode === "create" || viewMode === "edit" ? (
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewMode(selectedClientId ? "detail" : "list")}
                  className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back to Clients"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                      {companyName || "New Client Account"}
                    </h1>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {clientId}
                    </span>
                    <Badge variant={STATUS_CONFIG[status]?.variant || "default"} dot>
                      {STATUS_CONFIG[status]?.label || status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {clientType} • {country} {city ? `• ${city}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setViewMode(selectedClientId ? "detail" : "list")}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={handleSaveClient}
                >
                  {editingInternalId ? "Update Client Profile" : "Save Client Account"}
                </Button>
              </div>
            </div>

            {/* Duplicate Notice Banner */}
            {duplicateWarning && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Duplicate Check Warning:</strong>
                  <p className="mt-0.5 text-amber-800">{duplicateWarning}</p>
                  <p className="mt-1 text-[11px] text-amber-700 font-medium">
                    If this is a legitimate new buyer branch or distinct entity, click <strong>Save Client Account</strong> again to confirm.
                  </p>
                </div>
              </div>
            )}

            {/* Form Canvas */}
            <form onSubmit={handleSaveClient} className="space-y-6">
              {/* Section 1: Company & Brand Identity */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="1. Company & Brand Identity"
                  description="Legal entity name, trade brand, country market, and corporate website."
                >
                  <FormField
                    label="Client Display ID"
                    description="Auto-generated unique ERP identification code (Read-only)"
                  >
                    <Input
                      value={clientId}
                      readOnly
                      disabled
                      className="bg-slate-100/70 text-blue-700 font-mono font-bold cursor-not-allowed select-none border-slate-200"
                      placeholder="e.g. CLT-2026-001"
                    />
                  </FormField>

                  <FormField
                    label="Company / Brand Name"
                    required
                    description="Commercial trading name"
                    error={formErrors.companyName}
                  >
                    <Input
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        if (formErrors.companyName) setFormErrors((prev) => ({ ...prev, companyName: "" }));
                        if (duplicateWarning) setDuplicateWarning(null);
                      }}
                      placeholder="e.g. Urban Luxe Apparel"
                      error={!!formErrors.companyName}
                    />
                  </FormField>

                  <FormField label="Client Type" required>
                    <Select
                      value={clientType}
                      onChange={(e) => setClientType(e.target.value as ClientType)}
                      options={CLIENT_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
                    />
                  </FormField>

                  <FormField label="Country / Market" required>
                    <Select
                      value={country}
                      onChange={(e) => setCountry(e.target.value as ClientCountry)}
                      options={COUNTRY_OPTIONS.map((c) => ({ value: c, label: c }))}
                    />
                  </FormField>

                  <FormField label="City / Region">
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. London, Stockholm, Los Angeles"
                    />
                  </FormField>

                  <FormField label="Corporate Website">
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="e.g. https://urbanluxe.co.uk"
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Section 2: Contact Persons */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="2. Key Contacts (Primary & Secondary)"
                  description="Direct merchandisers, buyers, and sourcing managers for PO coordination."
                >
                  <FormField
                    label="Primary Contact Name"
                    required
                    error={formErrors.primaryName}
                  >
                    <Input
                      value={primaryName}
                      onChange={(e) => {
                        setPrimaryName(e.target.value);
                        if (formErrors.primaryName) setFormErrors((prev) => ({ ...prev, primaryName: "" }));
                      }}
                      placeholder="e.g. Sarah Jenkins"
                      error={!!formErrors.primaryName}
                    />
                  </FormField>

                  <FormField label="Designation / Role">
                    <Input
                      value={primaryDesignation}
                      onChange={(e) => setPrimaryDesignation(e.target.value)}
                      placeholder="e.g. Head of Sourcing & Merchandising"
                    />
                  </FormField>

                  <FormField
                    label="Primary Email"
                    required
                    error={formErrors.primaryEmail}
                  >
                    <Input
                      type="email"
                      value={primaryEmail}
                      onChange={(e) => {
                        setPrimaryEmail(e.target.value);
                        if (formErrors.primaryEmail) setFormErrors((prev) => ({ ...prev, primaryEmail: "" }));
                        if (duplicateWarning) setDuplicateWarning(null);
                      }}
                      placeholder="e.g. s.jenkins@urbanluxe.co.uk"
                      error={!!formErrors.primaryEmail}
                    />
                  </FormField>

                  <FormField label="Direct Phone" error={formErrors.primaryPhone}>
                    <Input
                      value={primaryPhone}
                      onChange={(e) => {
                        setPrimaryPhone(e.target.value);
                        if (formErrors.primaryPhone) setFormErrors((prev) => ({ ...prev, primaryPhone: "" }));
                      }}
                      placeholder="e.g. +44 20 7946 0912"
                      error={!!formErrors.primaryPhone}
                    />
                  </FormField>

                  <FormField label="WhatsApp Number" error={formErrors.primaryWhatsApp}>
                    <Input
                      value={primaryWhatsApp}
                      onChange={(e) => {
                        setPrimaryWhatsApp(e.target.value);
                        if (formErrors.primaryWhatsApp) setFormErrors((prev) => ({ ...prev, primaryWhatsApp: "" }));
                      }}
                      placeholder="e.g. +44 7700 900123"
                      error={!!formErrors.primaryWhatsApp}
                    />
                  </FormField>

                  <FormField label="Secondary Contact Name">
                    <Input
                      value={secondaryName}
                      onChange={(e) => setSecondaryName(e.target.value)}
                      placeholder="e.g. Oliver Smith"
                    />
                  </FormField>

                  <FormField label="Secondary Email" error={formErrors.secondaryEmail}>
                    <Input
                      type="email"
                      value={secondaryEmail}
                      onChange={(e) => {
                        setSecondaryEmail(e.target.value);
                        if (formErrors.secondaryEmail) setFormErrors((prev) => ({ ...prev, secondaryEmail: "" }));
                      }}
                      placeholder="e.g. o.smith@urbanluxe.co.uk"
                      error={!!formErrors.secondaryEmail}
                    />
                  </FormField>

                  <FormField label="Secondary Phone" error={formErrors.secondaryPhone}>
                    <Input
                      value={secondaryPhone}
                      onChange={(e) => {
                        setSecondaryPhone(e.target.value);
                        if (formErrors.secondaryPhone) setFormErrors((prev) => ({ ...prev, secondaryPhone: "" }));
                      }}
                      placeholder="e.g. +44 20 7946 0915"
                      error={!!formErrors.secondaryPhone}
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Section 3: Commercial & Payment Terms */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="3. Commercial Terms & Credit Conditions"
                  description="Export invoicing currency, payment milestones, incoterms, and approved credit limit."
                >
                  <FormField label="Invoicing Currency" required>
                    <Select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as ClientCurrency)}
                      options={[
                        { value: "USD", label: "USD ($) — US Dollar" },
                        { value: "EUR", label: "EUR (€) — Euro" },
                        { value: "GBP", label: "GBP (£) — British Pound" },
                        { value: "PKR", label: "PKR (₨) — Pakistani Rupee" },
                        { value: "AED", label: "AED (AED) — UAE Dirham" },
                      ]}
                    />
                  </FormField>

                  <FormField label="Payment Terms" required>
                    <Select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      options={[
                        { value: "30% Advance TT / 70% before BL Release", label: "30% Advance TT / 70% before BL Release" },
                        { value: "Letter of Credit (LC at Sight)", label: "Letter of Credit (LC at Sight)" },
                        { value: "50% Advance TT / 50% upon Cargo Departure", label: "50% Advance TT / 50% upon Departure" },
                        { value: "Net 30 Days after Delivery", label: "Net 30 Days after Delivery" },
                        { value: "Net 60 Days after Delivery", label: "Net 60 Days after Delivery" },
                        { value: "100% Advance Payment", label: "100% Advance Payment" },
                      ]}
                    />
                  </FormField>

                  <FormField label="Incoterms Agreement" required>
                    <Select
                      value={incoterms}
                      onChange={(e) => setIncoterms(e.target.value)}
                      options={[
                        { value: "FOB Sialkot", label: "FOB Sialkot / Lahore" },
                        { value: "FOB Karachi Port", label: "FOB Karachi Port" },
                        { value: "CIF London", label: "CIF Destination Port" },
                        { value: "DDP Warehouse", label: "DDP Buyer Warehouse" },
                        { value: "EXW Factory", label: "EXW Sialkot Factory" },
                      ]}
                    />
                  </FormField>

                  <FormField label="Credit Limit" error={formErrors.creditLimit}>
                    <Input
                      type="number"
                      min="0"
                      value={creditLimit}
                      onChange={(e) => {
                        setCreditLimit(e.target.value);
                        if (formErrors.creditLimit) setFormErrors((prev) => ({ ...prev, creditLimit: "" }));
                      }}
                      prefix={CURRENCY_SYMBOLS[currency]}
                      placeholder="e.g. 50000"
                      error={!!formErrors.creditLimit}
                    />
                  </FormField>

                  <FormField label="Tax / VAT / EORI Number">
                    <Input
                      value={taxVatId}
                      onChange={(e) => setTaxVatId(e.target.value)}
                      placeholder="e.g. GB 982 3411 90"
                    />
                  </FormField>

                  <FormField label="Preferred Shipping Method">
                    <Select
                      value={shippingMethod}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      options={[
                        { value: "Air Cargo", label: "Air Cargo (Standard / Express)" },
                        { value: "Sea Freight (FCL)", label: "Sea Freight — Full Container (FCL)" },
                        { value: "Sea Freight (LCL)", label: "Sea Freight — Consolidated (LCL)" },
                        { value: "Courier (DHL/FedEx)", label: "International Express Courier" },
                      ]}
                    />
                  </FormField>

                  <FormField label="Default Destination Port / Hub">
                    <Input
                      value={shippingDestination}
                      onChange={(e) => setShippingDestination(e.target.value)}
                      placeholder="e.g. London Heathrow Logistics Hub"
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Section 4: Manufacturing Preferences */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="4. Manufacturing & Quality Preferences"
                  description="Fabric specs, GSM ranges, minimum order quantities, and packaging requirements."
                >
                  <FormField label="Preferred Fabrics & Blends">
                    <Input
                      value={preferredFabrics}
                      onChange={(e) => setPreferredFabrics(e.target.value)}
                      placeholder="e.g. 100% Combed Cotton Fleece, French Terry"
                    />
                  </FormField>

                  <FormField label="Preferred GSM Range">
                    <Input
                      value={preferredGsmRange}
                      onChange={(e) => setPreferredGsmRange(e.target.value)}
                      placeholder="e.g. 240 - 450 GSM"
                    />
                  </FormField>

                  <FormField label="Minimum Order Quantity (MOQ)" error={formErrors.preferredMoq}>
                    <Input
                      type="number"
                      min="0"
                      value={preferredMoq}
                      onChange={(e) => setPreferredMoq(e.target.value)}
                      suffix="Pcs"
                      placeholder="e.g. 500"
                    />
                  </FormField>

                  <FormField label="Quality & Testing Standards">
                    <Input
                      value={qualityRequirements}
                      onChange={(e) => setQualityRequirements(e.target.value)}
                      placeholder="e.g. AQL 2.5 Major / 4.0 Minor, OEKO-TEX Standard 100"
                    />
                  </FormField>

                  <FormField label="Packaging Requirements">
                    <Input
                      value={packagingRequirements}
                      onChange={(e) => setPackagingRequirements(e.target.value)}
                      placeholder="e.g. Individual Biodegradable Polybag, 20 pcs/box"
                    />
                  </FormField>

                  <FormField label="Labeling & Trims Specifications">
                    <Input
                      value={labelingRequirements}
                      onChange={(e) => setLabelingRequirements(e.target.value)}
                      placeholder="e.g. Woven neck tags + FSC swing tags"
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Section 5: Internal Notes & Account Management */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="5. CRM Account Management & Notes"
                  description="Designated merchandiser, account status, and buyer intelligence."
                >
                  <FormField label="Lead Account Manager" required>
                    <Input
                      value={accountManager}
                      onChange={(e) => setAccountManager(e.target.value)}
                      placeholder="e.g. Hamza Tariq"
                    />
                  </FormField>

                  <FormField label="Account Status" required>
                    <Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ClientStatus)}
                      options={[
                        { value: "active", label: "Active Account" },
                        { value: "prospect", label: "Prospect / Lead" },
                        { value: "on_hold", label: "On Credit Hold" },
                        { value: "inactive", label: "Inactive" },
                      ]}
                    />
                  </FormField>

                  <FormField label="Client Commercial Notes">
                    <Textarea
                      rows={2}
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="Visible commercial notes, buyer requests, colorway requirements..."
                    />
                  </FormField>

                  <FormField label="Internal Merchandising Notes">
                    <Textarea
                      rows={2}
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Internal intelligence, payment habits, preferred delivery windows..."
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => setViewMode(selectedClientId ? "detail" : "list")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                >
                  {editingInternalId ? "Update Client Profile" : "Save Client Account"}
                </Button>
              </div>
            </form>
          </div>
        ) : viewMode === "detail" && activeClient ? (
          /* ============================================================
             VIEW 2: CLIENT DETAIL PROFILE (TABS & CONNECTED HISTORIES)
             ============================================================ */
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Detail Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back to Clients List"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                      {activeClient.companyName}
                    </h1>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {activeClient.clientId}
                    </span>
                    <Badge variant={STATUS_CONFIG[activeClient.status]?.variant || "default"} dot>
                      {STATUS_CONFIG[activeClient.status]?.label || activeClient.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {activeClient.country} {activeClient.city ? `(${activeClient.city})` : ""}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                      {activeClient.clientType}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                      Currency: {activeClient.commercialInfo.currency}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
                <select
                  value={activeClient.status}
                  onChange={(e) => handleUpdateClientStatus(activeClient, e.target.value as ClientStatus)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer shadow-2xs focus:outline-none"
                  title="Change Account Status"
                >
                  <option value="active">Status: Active</option>
                  <option value="prospect">Status: Prospect</option>
                  <option value="on_hold">Status: On Hold</option>
                  <option value="inactive">Status: Inactive</option>
                </select>
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Copy className="h-4 w-4" />}
                  onClick={() => handleDuplicateClient(activeClient)}
                >
                  Duplicate
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  leftIcon={<Edit className="h-4 w-4" />}
                  onClick={() => handleOpenEdit(activeClient)}
                >
                  Edit Profile
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => handleRequestDelete(activeClient)}
                >
                  Delete / Archive
                </Button>
              </div>
            </div>

            {/* Top 6 Summary KPI Cards */}
            {(() => {
              const metrics = computeClientMetrics(activeClient);
              const currSymbol = CURRENCY_SYMBOLS[activeClient.commercialInfo.currency] || "$";

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Card className="p-3.5 border-slate-200/80 shadow-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Orders</span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">{metrics.totalOrders}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{metrics.totalUnits.toLocaleString()} Pcs Total</p>
                  </Card>

                  <Card className="p-3.5 border-slate-200/80 shadow-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Orders</span>
                    <p className="text-lg font-bold text-blue-700 mt-0.5">{metrics.activeOrders}</p>
                    <p className="text-[11px] text-blue-600 mt-0.5">In Factory / QA</p>
                  </Card>

                  <Card className="p-3.5 border-slate-200/80 shadow-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Completed</span>
                    <p className="text-lg font-bold text-emerald-700 mt-0.5">{metrics.completedOrders}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">Dispatched / Shipped</p>
                  </Card>

                  <Card className="p-3.5 border-slate-200/80 shadow-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Order Value</span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                      {currSymbol}{metrics.totalOrderValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Lifetime Revenue</p>
                  </Card>

                  <Card className="p-3.5 border-slate-200/80 shadow-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Order Value</span>
                    <p className="text-lg font-bold text-purple-700 mt-0.5 truncate">
                      {currSymbol}{metrics.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[11px] text-purple-600 mt-0.5">Per Contract</p>
                  </Card>

                  <Card className="p-3.5 border-slate-200/80 shadow-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding</span>
                    <p className="text-lg font-bold text-amber-700 mt-0.5 truncate">
                      {currSymbol}{metrics.outstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-amber-600 mt-0.5">Pending Settlement</p>
                  </Card>
                </div>
              );
            })()}

            {/* Profile Tabs Navigation */}
            <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
              {[
                { id: "overview", label: "Overview & Contacts", icon: Building2 },
                { id: "orders", label: `Orders (${activeClient.orders?.length || 0})`, icon: ShoppingBag },
                { id: "costing", label: `Cost Estimates (${activeClient.costEstimates?.length || 0})`, icon: Calculator },
                { id: "quotations", label: `Quotations (${activeClient.quotations?.length || 0})`, icon: FileText },
                { id: "invoices", label: `Invoices & Billing (${activeClient.invoices?.length || 0})`, icon: Receipt },
                { id: "manufacturing", label: "Manufacturing Specs", icon: Layers },
                { id: "timeline", label: "Activity Timeline", icon: Clock },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = detailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id as typeof detailTab)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "border-blue-600 text-blue-700 bg-blue-50/50"
                        : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            {detailTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company & Commercial Terms */}
                <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Company & Commercial Profile
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Industry Sector</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeClient.businessInfo.industry}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Buyer Category</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeClient.businessInfo.buyerCategory}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Annual Volume</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {activeClient.businessInfo.annualEstimatedVolume?.toLocaleString() || "—"} Pcs / Year
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Credit Limit</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {CURRENCY_SYMBOLS[activeClient.commercialInfo.currency]}
                        {activeClient.commercialInfo.creditLimit.toLocaleString()}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-medium">Payment Terms</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeClient.commercialInfo.paymentTerms}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Incoterms</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeClient.commercialInfo.incoterms}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Tax / VAT ID</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeClient.commercialInfo.taxVatId || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-medium">Default Destination Port</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {activeClient.commercialInfo.defaultShippingDestination || "—"} ({activeClient.commercialInfo.preferredShippingMethod})
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Contacts & Notes */}
                <div className="space-y-6">
                  <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Primary Key Contact
                      </h3>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Contact Person:</span>
                        <span className="font-bold text-slate-900">{activeClient.primaryContact.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Designation:</span>
                        <span className="font-medium text-slate-700">{activeClient.primaryContact.designation}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Email:</span>
                        <a
                          href={`mailto:${activeClient.primaryContact.email}`}
                          className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {activeClient.primaryContact.email}
                        </a>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Direct Phone:</span>
                        <span className="font-mono text-slate-800 flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {activeClient.primaryContact.phone}
                        </span>
                      </div>
                      {activeClient.primaryContact.whatsApp && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">WhatsApp:</span>
                          <span className="font-mono text-emerald-700 font-semibold flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {activeClient.primaryContact.whatsApp}
                          </span>
                        </div>
                      )}
                    </div>

                    {activeClient.secondaryContact?.name && (
                      <div className="pt-3 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Secondary Contact</span>
                        <p className="text-xs font-semibold text-slate-800 mt-1">
                          {activeClient.secondaryContact.name} ({activeClient.secondaryContact.designation || "Assistant"})
                        </p>
                        {activeClient.secondaryContact.email && (
                          <p className="text-xs text-slate-500">{activeClient.secondaryContact.email}</p>
                        )}
                      </div>
                    )}
                  </Card>

                  {/* Notes Card */}
                  <Card className="p-5 space-y-3 border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <FileText className="h-4 w-4 text-amber-600" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Commercial & Internal Intelligence Notes
                      </h3>
                    </div>

                    {activeClient.clientNotes && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <span className="font-bold text-slate-700">Client Specification Notes:</span>
                        <p className="text-slate-600 mt-0.5">{activeClient.clientNotes}</p>
                      </div>
                    )}

                    {activeClient.internalNotes && (
                      <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200 text-xs">
                        <span className="font-bold text-blue-900">Internal Merchandising Intelligence:</span>
                        <p className="text-blue-800 mt-0.5">{activeClient.internalNotes}</p>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 pt-1 flex justify-between">
                      <span>Account Lead: <strong>{activeClient.accountManager}</strong></span>
                      <span>Onboarded: {new Date(activeClient.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Tab: Orders */}
            {detailTab === "orders" && (
              <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Customer Production Orders History
                  </h3>
                  <span className="text-xs text-slate-500">{activeClient.orders?.length || 0} Orders Registered</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Order #</th>
                        <th className="py-2.5 px-4">Garment Style</th>
                        <th className="py-2.5 px-4">Product Category</th>
                        <th className="py-2.5 px-4 text-right">Quantity</th>
                        <th className="py-2.5 px-4 text-right">Order Value</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4">Order Date</th>
                        <th className="py-2.5 px-4">Target Delivery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!activeClient.orders || activeClient.orders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            No production orders recorded for this client yet.
                          </td>
                        </tr>
                      ) : (
                        activeClient.orders.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">{o.orderNumber}</td>
                            <td className="py-3 px-4 font-medium text-slate-900">{o.styleName}</td>
                            <td className="py-3 px-4 text-slate-600">{o.productCategory}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">{o.quantity.toLocaleString()} Pcs</td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-700">
                              {CURRENCY_SYMBOLS[o.currency]}{o.orderValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant="primary" dot>{o.status}</Badge>
                            </td>
                            <td className="py-3 px-4 text-slate-500">{o.orderDate}</td>
                            <td className="py-3 px-4 text-slate-700 font-medium">{o.deliveryDate}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Tab: Cost Estimates */}
            {detailTab === "costing" && (
              <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Linked Cost Estimates & Pre-Costing BOMs
                  </h3>
                  <span className="text-xs text-slate-500">{activeClient.costEstimates?.length || 0} Cost Sheets</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Estimate #</th>
                        <th className="py-2.5 px-4">Order Ref</th>
                        <th className="py-2.5 px-4">Style</th>
                        <th className="py-2.5 px-4 text-right">Volume</th>
                        <th className="py-2.5 px-4 text-right">Cost / pc</th>
                        <th className="py-2.5 px-4 text-right">FOB Price / pc</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4">Created Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!activeClient.costEstimates || activeClient.costEstimates.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            No costing sheets calculated for this client yet.
                          </td>
                        </tr>
                      ) : (
                        activeClient.costEstimates.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">{c.estimateNumber}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{c.orderNumber}</td>
                            <td className="py-3 px-4 font-medium text-slate-900">{c.styleName}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">{c.quantity.toLocaleString()} Pcs</td>
                            <td className="py-3 px-4 text-right text-slate-600">
                              {CURRENCY_SYMBOLS[c.currency]}{c.costPerPiece.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-blue-700">
                              {CURRENCY_SYMBOLS[c.currency]}{c.sellingPricePerPiece.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant={c.status === "approved" ? "success" : "info"} dot>
                                {c.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-slate-500">{c.createdAt}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Tab: Quotations */}
            {detailTab === "quotations" && (
              <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Commercial Export Quotations & Proposals
                  </h3>
                  <span className="text-xs text-slate-500">{activeClient.quotations?.length || 0} Quotations</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Quote #</th>
                        <th className="py-2.5 px-4">Garment Style</th>
                        <th className="py-2.5 px-4 text-right">Quantity</th>
                        <th className="py-2.5 px-4 text-right">Total Proposal Value</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4">Valid Until</th>
                        <th className="py-2.5 px-4">Issue Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!activeClient.quotations || activeClient.quotations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No export quotations issued for this client yet.
                          </td>
                        </tr>
                      ) : (
                        activeClient.quotations.map((q) => (
                          <tr key={q.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">{q.quoteNumber}</td>
                            <td className="py-3 px-4 font-medium text-slate-900">{q.styleName}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">{q.quantity.toLocaleString()} Pcs</td>
                            <td className="py-3 px-4 text-right font-bold text-purple-700">
                              {CURRENCY_SYMBOLS[q.currency]}{q.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant={q.status === "Accepted" ? "success" : q.status === "Sent" ? "info" : "warning"} dot>
                                {q.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{q.validUntil}</td>
                            <td className="py-3 px-4 text-slate-500">{q.createdAt}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Tab: Invoices & Payments */}
            {detailTab === "invoices" && (
              <div className="space-y-6">
                <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Commercial Invoices & Accounts Receivable
                    </h3>
                    <span className="text-xs text-slate-500">{activeClient.invoices?.length || 0} Invoices Issued</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-4">Invoice #</th>
                          <th className="py-2.5 px-4">Order Ref</th>
                          <th className="py-2.5 px-4 text-right">Invoice Amount</th>
                          <th className="py-2.5 px-4 text-right">Settled / Paid</th>
                          <th className="py-2.5 px-4 text-right">Balance Due</th>
                          <th className="py-2.5 px-4 text-center">Status</th>
                          <th className="py-2.5 px-4">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!activeClient.invoices || activeClient.invoices.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              No commercial invoices recorded for this client.
                            </td>
                          </tr>
                        ) : (
                          activeClient.invoices.map((inv) => {
                            const balance = inv.amount - inv.paidAmount;
                            return (
                              <tr key={inv.id} className="hover:bg-slate-50/50">
                                <td className="py-3 px-4 font-mono font-bold text-blue-700">{inv.invoiceNumber}</td>
                                <td className="py-3 px-4 font-mono text-slate-500">{inv.orderNumber}</td>
                                <td className="py-3 px-4 text-right font-bold text-slate-900">
                                  {CURRENCY_SYMBOLS[inv.currency]}{inv.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-emerald-700">
                                  {CURRENCY_SYMBOLS[inv.currency]}{inv.paidAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-amber-700">
                                  {CURRENCY_SYMBOLS[inv.currency]}{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Badge variant={inv.status === "Paid" ? "success" : inv.status === "Overdue" ? "danger" : "warning"} dot>
                                    {inv.status}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-slate-600">{inv.dueDate}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* Tab: Manufacturing Preferences */}
            {detailTab === "manufacturing" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Fabric & Quality Specifications
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Preferred Fabrics</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {activeClient.manufacturingPreferences.preferredFabrics || "Standard factory catalog fabrics"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Target GSM Weight Range</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {activeClient.manufacturingPreferences.preferredGsmRange || "Standard range"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Standard Batch MOQ</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {activeClient.manufacturingPreferences.preferredMoq ? `${activeClient.manufacturingPreferences.preferredMoq} Pcs` : "500 Pcs"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Quality Testing Standards</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {activeClient.manufacturingPreferences.qualityRequirements || "AQL 2.5 Standard"}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Export Packaging & Labeling Standards
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Master Packaging Requirements</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {activeClient.manufacturingPreferences.packagingRequirements || "Standard 5-ply master export cartons"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Brand Labeling & Swing Tags</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {activeClient.manufacturingPreferences.labelingRequirements || "Standard buyer tags and care labels"}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Tab: Activity Timeline */}
            {detailTab === "timeline" && (
              <Card className="p-5 border-slate-200/80 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
                  CRM Activity & Transaction Timeline
                </h3>
                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {!activeClient.timeline || activeClient.timeline.length === 0 ? (
                    <p className="text-xs text-slate-400 pl-8">No recorded activity yet.</p>
                  ) : (
                    activeClient.timeline.map((evt) => (
                      <div key={evt.id} className="relative flex items-start gap-4 pl-8">
                        <div className="absolute left-2 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-xs -translate-x-1/2" />
                        <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-900">{evt.title}</span>
                            <span className="text-slate-400 text-[11px]">{evt.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{evt.description}</p>
                          {evt.author && (
                            <span className="text-[10px] text-slate-400 mt-1 block">Logged by: {evt.author}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}
          </div>
        ) : (
          /* ============================================================
             VIEW 3: CRM CLIENTS DASHBOARD & MAIN DATA TABLE
             ============================================================ */
          <div className="space-y-6 min-w-0 w-full">
            {/* Page Header */}
            <PageHeader
              title="Clients & Apparel Buyer Accounts"
              description="Manage buyers, brands, manufacturers, contacts, commercial terms, and customer relationships."
              actions={
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={<RefreshCw className={`h-4 w-4 ${loadingClients ? "animate-spin" : ""}`} />}
                    onClick={() => loadClients(true)}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={handleOpenCreate}
                  >
                    Add Client
                  </Button>
                </div>
              }
            />

            {/* 5 Dynamic KPI Cards */}
            <CardGrid columns={5}>
              <StatCard
                label="Total Clients"
                value={String(totalClientsCount)}
                sub="Registered buyer portfolio"
                icon={<Users className="h-5 w-5" />}
                iconColor="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Active Clients"
                value={String(activeClientsCount)}
                sub="Buyers with live orders"
                icon={<Briefcase className="h-5 w-5" />}
                iconColor="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                label="Prospects"
                value={String(prospectsCount)}
                sub="Leads & sample stage"
                icon={<Building2 className="h-5 w-5" />}
                iconColor="bg-amber-50 text-amber-600"
              />
              <StatCard
                label="International Clients"
                value={String(internationalCount)}
                sub="Export markets"
                icon={<Globe className="h-5 w-5" />}
                iconColor="bg-indigo-50 text-indigo-600"
              />
              <StatCard
                label="Total Order Value"
                value={`$${(totalPortfolioOrderValue / 1000).toFixed(1)}k`}
                sub="Cumulative buyer contracts"
                icon={<DollarSign className="h-5 w-5" />}
                iconColor="bg-purple-50 text-purple-600"
              />
            </CardGrid>

            {/* Search, Filters & Sorting Toolbar */}
            <Card noPadding className="p-3.5 sm:p-4 bg-[var(--color-erp-surface)] border-[var(--color-erp-border)] shadow-xs">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 min-w-0">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-erp-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search clients by company, buyer, email, country, client ID..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] placeholder-[var(--color-erp-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-erp-primary)]/20"
                  />
                </div>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="prospect">Prospect</option>
                    <option value="on_hold">On Hold</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  <select
                    value={countryFilter}
                    onChange={(e) => {
                      setCountryFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Countries</option>
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    {CLIENT_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="recent">Sort: Recently Added</option>
                    <option value="name">Sort: Company Name (A-Z)</option>
                    <option value="value">Sort: Highest Order Value</option>
                    <option value="orders">Sort: Most Orders</option>
                  </select>

                  {(searchQuery || statusFilter !== "all" || countryFilter !== "all" || typeFilter !== "all" || sortBy !== "recent") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setCountryFilter("all");
                        setTypeFilter("all");
                        setSortBy("recent");
                        setPage(1);
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Main Clients Data Table */}
            <Card noPadding className="border-[var(--color-erp-border)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-xs text-left min-w-[1100px]">
                  <thead className="bg-[var(--color-erp-surface-2)] text-[var(--color-erp-text-muted)] font-semibold border-b border-[var(--color-erp-border)] uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Client ID</th>
                      <th className="py-3 px-4">Company / Brand</th>
                      <th className="py-3 px-4">Primary Contact</th>
                      <th className="py-3 px-4">Country</th>
                      <th className="py-3 px-4">Client Type</th>
                      <th className="py-3 px-4 text-center">Active Orders</th>
                      <th className="py-3 px-4 text-right">Total Order Value</th>
                      <th className="py-3 px-4">Last Order</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-erp-border)]">
                    {paginatedClients.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-0">
                          <EmptyState
                            icon={<Users className="h-6 w-6 text-blue-600" />}
                            title="No clients found"
                            description={
                              searchQuery || statusFilter !== "all" || countryFilter !== "all" || typeFilter !== "all"
                                ? "No client accounts match your active search filters. Click Reset to clear filters."
                                : "Manage wholesale buyers, retail brands, commercial credit terms, and order histories."
                            }
                            actionLabel="Add Client"
                            actionIcon={<Plus className="h-4 w-4" />}
                            onAction={handleOpenCreate}
                          />
                        </td>
                      </tr>
                    ) : (
                      paginatedClients.map((client) => {
                        const metrics = computeClientMetrics(client);
                        const statusConfig = STATUS_CONFIG[client.status] || {
                          label: client.status,
                          variant: "default",
                        };
                        const lastOrder = client.orders && client.orders.length > 0 ? client.orders[client.orders.length - 1] : null;

                        return (
                          <tr
                            key={client.id}
                            className="hover:bg-[var(--color-erp-surface-2)]/50 transition-colors"
                          >
                            {/* Client ID */}
                            <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(client)}
                                className="hover:underline cursor-pointer text-left"
                                title="View client profile"
                              >
                                {client.clientId}
                              </button>
                            </td>

                            {/* Company / Brand */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-[var(--color-erp-text-primary)]">
                                {client.companyName}
                              </div>
                              {client.website && (
                                <a
                                  href={client.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-1 mt-0.5"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" />
                                  {client.website.replace(/^https?:\/\//, "")}
                                </a>
                              )}
                            </td>

                            {/* Primary Contact */}
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-900">{client.primaryContact.name}</div>
                              <div className="text-[10px] text-slate-500">{client.primaryContact.email}</div>
                            </td>

                            {/* Country */}
                            <td className="py-3.5 px-4 font-medium text-slate-700">
                              {client.country}
                              {client.city ? <span className="text-slate-400 block text-[10px]">{client.city}</span> : null}
                            </td>

                            {/* Client Type */}
                            <td className="py-3.5 px-4 text-slate-600">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                                {client.clientType}
                              </span>
                            </td>

                            {/* Active Orders */}
                            <td className="py-3.5 px-4 text-center">
                              {metrics.activeOrders > 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                                  {metrics.activeOrders} Live
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>

                            {/* Total Order Value */}
                            <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                              {CURRENCY_SYMBOLS[client.commercialInfo.currency]}
                              {metrics.totalOrderValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>

                            {/* Last Order */}
                            <td className="py-3.5 px-4">
                              {lastOrder ? (
                                <div>
                                  <span className="font-mono text-blue-700 font-semibold">{lastOrder.orderNumber}</span>
                                  <span className="text-slate-400 block text-[10px]">{lastOrder.orderDate}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">No orders</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-center">
                              <Badge variant={statusConfig.variant} dot>
                                {statusConfig.label}
                              </Badge>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetail(client)}
                                  title="View full client profile"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(client)}
                                  title="Edit client profile"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicateClient(client)}
                                  title="Duplicate client"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => handleRequestDelete(client)}
                                  className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete / Archive client"
                                  aria-label={`Delete ${client.companyName}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={page}
                pageSize={pageSize}
                total={sortedClients.length}
                onPageChange={setPage}
              />
            </Card>
          </div>
        )}
      </div>

      {/* Safety Alert Modal: Client has Linked Records -> Archive Instead */}
      <Modal
        isOpen={!!archiveModalClient}
        onClose={() => setArchiveModalClient(null)}
        title="Archive Client Account"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Linked Transactions Protection:</strong>
              <p className="mt-1 text-amber-800">
                Client <strong>{archiveModalClient?.companyName} ({archiveModalClient?.clientId})</strong> has linked ERP records (
                {archiveModalClient?.orders?.length || 0} Orders, {archiveModalClient?.costEstimates?.length || 0} Cost Estimates, {archiveModalClient?.quotations?.length || 0} Quotations, {archiveModalClient?.invoices?.length || 0} Invoices).
              </p>
              <p className="mt-1.5 text-amber-800 font-medium">
                To maintain historical accounting and audit compliance, this client cannot be permanently erased. Archive the client instead to deactivate active operations while preserving historical data.
              </p>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setArchiveModalClient(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Archive className="h-4 w-4" />}
              onClick={handleConfirmArchive}
            >
              Archive Client
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Confirmation Dialog: Permanent Delete (Only for clients without linked transactions) */}
      <ConfirmDialog
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        onConfirm={handleConfirmPermanentDelete}
        title={`Permanently Delete ${clientToDelete?.companyName || "Client"}?`}
        description={`Are you sure you want to delete client ${clientToDelete?.companyName} (${clientToDelete?.clientId})? This account has no linked transactions and will be permanently removed.`}
        confirmLabel="Delete Client"
        cancelLabel="Keep Client"
        destructive
      />
    </>
  );
}

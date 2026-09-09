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
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  Eye,
  Edit,
  Copy,
  Trash2,
  Archive,
  ArrowLeft,
  Building2,
  Layers,
  Calculator,
  MapPin,
  ExternalLink,
  AlertTriangle,
  Send,
  RefreshCw,
} from "lucide-react";
import {
  QuotationRecord,
  QuotationStatus,
  QuotationType,
  CommercialCurrency,
  QUOTATION_STORAGE_KEY,
  INITIAL_QUOTATIONS,
  calculateQuotationPricing,
  hasQuotationTransactionalLinks,
  syncClientWithQuotations,
  convertQuotationToOrder,
} from "@/lib/quotations-engine";
import {
  ClientRecord,
  CLIENT_STORAGE_KEY,
  INITIAL_CLIENTS,
} from "@/lib/clients-engine";
import {
  OrderRecord,
  ORDER_STORAGE_KEY,
  INITIAL_ORDERS,
} from "@/lib/orders-engine";
import { CURRENCY_SYMBOLS } from "@/lib/costing-engine";

import {
  getQuotationsFromDB,
  createQuotationInDB,
  updateQuotationInDB,
  deleteQuotationInDB,
} from "@/lib/services/quotations-service";
import { createOrderInDB } from "@/lib/services/orders-service";

const STATUS_CONFIG: Record<
  QuotationStatus,
  { label: string; variant: "primary" | "warning" | "info" | "success" | "danger" | "default" }
> = {
  draft: { label: "Draft Proposal", variant: "default" },
  sent: { label: "Sent to Buyer", variant: "warning" },
  under_review: { label: "Under Review / Negotiation", variant: "info" },
  accepted: { label: "Accepted by Buyer", variant: "success" },
  rejected: { label: "Declined / Rejected", variant: "danger" },
  expired: { label: "Expired", variant: "default" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

const QUOTATION_TYPES: QuotationType[] = [
  "Export Bulk Proposal",
  "Sampling Quote",
  "Repeat Order Quotation",
  "Wholesale Price List",
  "Fast-Track Special",
];

const GARMENT_STYLES = [
  {
    code: "HD-380",
    name: "HD-380 — 380 GSM Heavyweight Hoodie",
    category: "Hoodies & Sweatshirts",
    fabric: "380 GSM 100% Combed Cotton Fleece, 2x2 Spandex Rib",
    gsm: "380 GSM",
    defaultPrice: 21.09,
    costEstimateRef: "CST-2026-001",
  },
  {
    code: "TS-240",
    name: "TS-240 — 240 GSM Boxy Heavy T-Shirt",
    category: "T-Shirts",
    fabric: "240 GSM Organic Cotton Jersey, Spandex Collar Rib",
    gsm: "240 GSM",
    defaultPrice: 10.71,
    costEstimateRef: "CST-2026-002",
  },
  {
    code: "JG-320",
    name: "JG-320 — French Terry Cuffed Joggers",
    category: "Joggers & Bottoms",
    fabric: "320 GSM 100% Organic Cotton French Terry",
    gsm: "320 GSM",
    defaultPrice: 16.9,
    costEstimateRef: "CST-2026-003",
  },
  {
    code: "JK-450",
    name: "JK-450 — Technical Windbreaker Jacket",
    category: "Jackets & Outerwear",
    fabric: "Micro-Polyester Interlock, UPF 50+ Lycra",
    gsm: "160 GSM",
    defaultPrice: 32.67,
    costEstimateRef: "",
  },
];

export default function QuotationsPage() {
  const { success, error: toastError } = useToast();

  // View Mode: "list" | "create" | "edit" | "detail"
  const [viewMode, setViewMode] = React.useState<"list" | "create" | "edit" | "detail">("list");
  const [selectedQuotationId, setSelectedQuotationId] = React.useState<string | null>(null);

  // Detail Sub-Tab: "overview" | "specs" | "costing" | "client" | "conversion" | "timeline"
  const [detailTab, setDetailTab] = React.useState<
    "overview" | "specs" | "costing" | "client" | "conversion" | "timeline"
  >("overview");

  // Hydration-Safe State for Quotations
  const getQuotationsSnapshot = React.useCallback(() => {
    try {
      if (typeof window === "undefined") return JSON.stringify(INITIAL_QUOTATIONS);
      const stored = localStorage.getItem(QUOTATION_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(INITIAL_QUOTATIONS));
        return JSON.stringify(INITIAL_QUOTATIONS);
      }
      return stored;
    } catch {
      return JSON.stringify(INITIAL_QUOTATIONS);
    }
  }, []);

  const getQuotationsServerSnapshot = React.useCallback(() => JSON.stringify(INITIAL_QUOTATIONS), []);

  const subscribeQuotations = React.useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }, []);

  const rawQuotationsJson = React.useSyncExternalStore(subscribeQuotations, getQuotationsSnapshot, getQuotationsServerSnapshot);
  const [localQuotationsOverride, setLocalQuotationsOverride] = React.useState<QuotationRecord[] | null>(null);
  const [loadingQuotations, setLoadingQuotations] = React.useState(false);

  const loadQuotations = React.useCallback(async (showToast = false) => {
    setLoadingQuotations(true);
    try {
      const data = await getQuotationsFromDB();
      if (data && data.length > 0) {
        setLocalQuotationsOverride(data);
      }
      if (showToast) {
        success("Quotations Refreshed", { description: "Loaded live commercial quotations from MySQL." });
      }
    } catch (err: any) {
      console.error("Failed to load quotations:", err);
      if (showToast) {
        toastError("Failed to Refresh Quotations", { description: err.message });
      }
    } finally {
      setLoadingQuotations(false);
    }
  }, [success, toastError]);

  // Sync with Database on mount
  React.useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  const quotations = React.useMemo(() => {
    if (localQuotationsOverride !== null) return localQuotationsOverride;
    try {
      return JSON.parse(rawQuotationsJson) as QuotationRecord[];
    } catch {
      return INITIAL_QUOTATIONS;
    }
  }, [rawQuotationsJson, localQuotationsOverride]);

  const saveQuotations = (records: QuotationRecord[]) => {
    setLocalQuotationsOverride(records);
    try {
      localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(records));
      syncClientWithQuotations(records);
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore
    }
  };

  // Hydration-Safe State for Clients
  const getClientsSnapshot = React.useCallback(() => {
    try {
      if (typeof window === "undefined") return JSON.stringify(INITIAL_CLIENTS);
      const stored = localStorage.getItem(CLIENT_STORAGE_KEY);
      return stored ? stored : JSON.stringify(INITIAL_CLIENTS);
    } catch {
      return JSON.stringify(INITIAL_CLIENTS);
    }
  }, []);

  const rawClientsJson = React.useSyncExternalStore(subscribeQuotations, getClientsSnapshot, () => JSON.stringify(INITIAL_CLIENTS));
  const availableClients = React.useMemo(() => {
    try {
      const parsed: ClientRecord[] = JSON.parse(rawClientsJson);
      return parsed.filter((c) => !c.isArchived);
    } catch {
      return INITIAL_CLIENTS;
    }
  }, [rawClientsJson]);

  // Hydration-Safe State for Orders
  const getOrdersSnapshot = React.useCallback(() => {
    try {
      if (typeof window === "undefined") return JSON.stringify(INITIAL_ORDERS);
      const stored = localStorage.getItem(ORDER_STORAGE_KEY);
      return stored ? stored : JSON.stringify(INITIAL_ORDERS);
    } catch {
      return JSON.stringify(INITIAL_ORDERS);
    }
  }, []);

  const rawOrdersJson = React.useSyncExternalStore(subscribeQuotations, getOrdersSnapshot, () => JSON.stringify(INITIAL_ORDERS));
  const availableOrders = React.useMemo(() => {
    try {
      return JSON.parse(rawOrdersJson) as OrderRecord[];
    } catch {
      return INITIAL_ORDERS;
    }
  }, [rawOrdersJson]);

  const saveOrders = (records: OrderRecord[]) => {
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(records));
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore
    }
  };

  // Selected Quotation
  const activeQuotation = React.useMemo(() => {
    if (!selectedQuotationId) return null;
    return quotations.find((q) => q.id === selectedQuotationId) || null;
  }, [quotations, selectedQuotationId]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [clientFilter, setClientFilter] = React.useState("all");
  const [currencyFilter, setCurrencyFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"recent" | "quotationDate" | "validUntil" | "highValue" | "lowValue" | "clientName">("recent");
  const [page, setPage] = React.useState(1);

  // Archive & Delete Modals
  const [quoteToDelete, setQuoteToDelete] = React.useState<QuotationRecord | null>(null);
  const [archiveModalQuote, setArchiveModalQuote] = React.useState<QuotationRecord | null>(null);

  // Form State
  const [editingInternalId, setEditingInternalId] = React.useState<string | null>(null);
  const [quotationNumber, setQuotationNumber] = React.useState("");
  const [selectedClientInternalId, setSelectedClientInternalId] = React.useState("");
  const [quotationDate, setQuotationDate] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");
  const [quotationType, setQuotationType] = React.useState<QuotationType>("Export Bulk Proposal");
  const [currency, setCurrency] = React.useState<CommercialCurrency>("PKR");
  const [status, setStatus] = React.useState<QuotationStatus>("draft");

  // Garment Details Form
  const [garmentStyle, setGarmentStyle] = React.useState("");
  const [styleName, setStyleName] = React.useState("");
  const [productCategory, setProductCategory] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [fabric, setFabric] = React.useState("");
  const [gsm, setGsm] = React.useState("");
  const [color, setColor] = React.useState("");
  const [sizeRange, setSizeRange] = React.useState("");
  const [customizationNotes, setCustomizationNotes] = React.useState("");

  // Pricing Form
  const [quantity, setQuantity] = React.useState("");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [discount, setDiscount] = React.useState("0");
  const [freightCharges, setFreightCharges] = React.useState("0");
  const [tax, setTax] = React.useState("0");

  // Terms Form
  const [paymentTerms, setPaymentTerms] = React.useState("");
  const [incoterms, setIncoterms] = React.useState("");
  const [shippingMethod, setShippingMethod] = React.useState("");
  const [destinationPort, setDestinationPort] = React.useState("");
  const [buyerPoRef, setBuyerPoRef] = React.useState("");

  // References
  const [costEstimateId, setCostEstimateId] = React.useState("");
  const [orderId, setOrderId] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");
  const [buyerNotes, setBuyerNotes] = React.useState("");

  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Dynamic Calculated Pricing
  const calculatedPricing = React.useMemo(() => {
    return calculateQuotationPricing(quantity, unitPrice, discount, freightCharges, tax);
  }, [quantity, unitPrice, discount, freightCharges, tax]);

  // Open Create Form — Clean Blank-State Initialization
  const handleOpenCreate = (preselectedClientId?: string) => {
    const currentYear = new Date().getFullYear();
    const currentMax = quotations.reduce((max, q) => {
      const match = q.quotationNumber.match(/QT-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = currentMax + 1;
    const newDisplayId = `QT-${currentYear}-${String(nextNum).padStart(3, "0")}`;
    const today = new Date().toISOString().split("T")[0];

    setEditingInternalId(null);
    setQuotationNumber(newDisplayId);
    setQuotationDate(today);
    setValidUntil("");
    setQuotationType("Export Bulk Proposal");
    setStatus("draft");

    // Clear garment details
    setGarmentStyle("");
    setStyleName("");
    setProductCategory("");
    setDescription("");
    setFabric("");
    setGsm("");
    setColor("");
    setSizeRange("");
    setCustomizationNotes("");

    // Clear commercial pricing to zero/empty
    setQuantity("");
    setUnitPrice("");
    setDiscount("0");
    setFreightCharges("0");
    setTax("0");

    // References
    setCostEstimateId("");
    setOrderId("");
    setInternalNotes("");
    setBuyerNotes("");
    setFormErrors({});

    // Controlled client selection exception
    if (preselectedClientId) {
      setSelectedClientInternalId(preselectedClientId);
      const client = availableClients.find((c) => c.id === preselectedClientId);
      if (client) {
        setCurrency(client.commercialInfo.currency || "PKR");
        setPaymentTerms(client.commercialInfo.paymentTerms || "");
        setIncoterms(client.commercialInfo.incoterms || "");
        setShippingMethod(client.commercialInfo.preferredShippingMethod || "");
        setDestinationPort(client.commercialInfo.defaultShippingDestination || "");
      }
    } else {
      setSelectedClientInternalId("");
      setCurrency("PKR");
      setPaymentTerms("");
      setIncoterms("");
      setShippingMethod("");
      setDestinationPort("");
      setBuyerPoRef("");
    }

    setViewMode("create");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Client Selection Change -> Auto-populate Buyer commercial defaults
  const handleClientChange = (clientId: string) => {
    setSelectedClientInternalId(clientId);
    if (formErrors.selectedClient) {
      setFormErrors((prev) => ({ ...prev, selectedClient: "" }));
    }
    const client = availableClients.find((c) => c.id === clientId);
    if (client) {
      if (client.commercialInfo.currency) {
        setCurrency(client.commercialInfo.currency);
      }
      if (client.commercialInfo.paymentTerms) {
        setPaymentTerms(client.commercialInfo.paymentTerms);
      }
      if (client.commercialInfo.incoterms) {
        setIncoterms(client.commercialInfo.incoterms);
      }
      if (client.commercialInfo.preferredShippingMethod) {
        setShippingMethod(client.commercialInfo.preferredShippingMethod);
      }
      if (client.commercialInfo.defaultShippingDestination) {
        setDestinationPort(client.commercialInfo.defaultShippingDestination);
      }
    }
  };

  // Style Preset Selection Change -> Only populates garment specs, never commercial pricing or terms
  const handleStyleChange = (code: string) => {
    setGarmentStyle(code);
    const found = GARMENT_STYLES.find((s) => s.code === code);
    if (found) {
      setStyleName(found.name);
      setProductCategory(found.category);
      setFabric(found.fabric);
      setGsm(found.gsm);
      if (formErrors.styleName) setFormErrors((prev) => ({ ...prev, styleName: "" }));
    }
  };

  // Open Edit Form
  const handleOpenEdit = (quote: QuotationRecord) => {
    setEditingInternalId(quote.id);
    setQuotationNumber(quote.quotationNumber);
    setSelectedClientInternalId(quote.clientId);
    setQuotationDate(quote.quotationDate);
    setValidUntil(quote.validUntil);
    setQuotationType(quote.quotationType);
    setCurrency(quote.currency);
    setStatus(quote.status);

    setGarmentStyle(quote.garmentStyle);
    setStyleName(quote.styleName);
    setProductCategory(quote.productCategory);
    setDescription(quote.description || "");
    setFabric(quote.fabric);
    setGsm(quote.gsm || "");
    setColor(quote.color || "");
    setSizeRange(quote.sizeRange || "");
    setCustomizationNotes(quote.customizationNotes || "");

    setQuantity(String(quote.quantity));
    setUnitPrice(String(quote.unitPrice));
    setDiscount(String(quote.discount || "0"));
    setFreightCharges(String(quote.freightCharges || "0"));
    setTax(String(quote.tax || "0"));

    setPaymentTerms(quote.paymentTerms);
    setIncoterms(quote.incoterms);
    setShippingMethod(quote.shippingMethod || "Air Cargo");
    setDestinationPort(quote.destinationPort || "");
    setBuyerPoRef(quote.buyerPoRef || "");

    setCostEstimateId(quote.costEstimateId || "");
    setOrderId(quote.orderId || "");
    setInternalNotes(quote.internalNotes || "");
    setBuyerNotes(quote.buyerNotes || "");

    setFormErrors({});
    setViewMode("edit");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Open Detail View
  const handleOpenDetail = (quote: QuotationRecord) => {
    setSelectedQuotationId(quote.id);
    setDetailTab("overview");
    setViewMode("detail");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Duplicate Quotation
  const handleDuplicateQuotation = (quote: QuotationRecord) => {
    const currentYear = new Date().getFullYear();
    const currentMax = quotations.reduce((max, q) => {
      const match = q.quotationNumber.match(/QT-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = currentMax + 1;
    const newDisplayId = `QT-${currentYear}-${String(nextNum).padStart(3, "0")}`;
    const newInternalId = "qt_" + Date.now();
    const nowIso = new Date().toISOString();
    const nowReadable = new Date().toLocaleString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const duplicated: QuotationRecord = {
      ...quote,
      id: newInternalId,
      quotationNumber: newDisplayId,
      status: "draft",
      orderId: undefined,
      timeline: [
        {
          id: "evt_" + Date.now(),
          title: "Quotation Duplicated",
          description: `Duplicated from proposal ${quote.quotationNumber}. Set as Draft.`,
          timestamp: nowReadable,
          type: "created",
          author: "Merchandising Desk",
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [duplicated, ...quotations];
    saveQuotations(updated);
    success("Quotation Duplicated", {
      description: `Created new draft proposal ${newDisplayId} based on ${quote.quotationNumber}.`,
    });
    setSelectedQuotationId(newInternalId);
    setViewMode("detail");
  };

  // Save / Update Quotation
  const handleSaveQuotation = (e: React.FormEvent, targetStatus?: QuotationStatus) => {
    e.preventDefault();

    const determinedStatus: QuotationStatus = targetStatus ? targetStatus : status;
    const errors: Record<string, string> = {};

    if (!selectedClientInternalId.trim()) {
      errors.selectedClient = "Please select a client account.";
    }

    if (determinedStatus === "draft") {
      if (!selectedClientInternalId.trim()) {
        setFormErrors(errors);
        toastError("Client Account Required", {
          description: "Please select a client to save a quotation draft.",
        });
        return;
      }
    } else {
      const qtyNum = parseInt(quantity, 10);
      if (!quantity.trim() || isNaN(qtyNum) || qtyNum <= 0) {
        errors.quantity = "Quoted quantity must be a positive integer greater than 0.";
      }

      const priceNum = parseFloat(unitPrice);
      if (!unitPrice.trim() || isNaN(priceNum) || priceNum < 0) {
        errors.unitPrice = "Unit price must be a non-negative number.";
      }

      if (!quotationDate.trim()) {
        errors.quotationDate = "Quotation date is required.";
      }

      if (!validUntil.trim()) {
        errors.validUntil = "Validity date is required.";
      }

      if (quotationDate && validUntil && new Date(validUntil) < new Date(quotationDate)) {
        errors.validUntil = "Valid Until date cannot be earlier than Quotation Date.";
      }

      if (!styleName.trim()) {
        errors.styleName = "Garment style name is required.";
      }

      if (!paymentTerms.trim()) {
        errors.paymentTerms = "Payment terms are required.";
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        toastError("Please resolve highlighted validation errors.", {
          description: Object.values(errors)[0],
        });
        return;
      }
    }

    const clientObj = availableClients.find((c) => c.id === selectedClientInternalId);
    if (!clientObj) {
      toastError("Invalid Client Account", {
        description: "Selected client could not be found in active records.",
      });
      return;
    }

    const pricing = calculateQuotationPricing(quantity || 0, unitPrice || 0, discount, freightCharges, tax);
    const nowIso = new Date().toISOString();
    const nowReadable = new Date().toLocaleString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let quoteToSave: QuotationRecord;

    if (editingInternalId && activeQuotation) {
      quoteToSave = {
        ...activeQuotation,
        quotationNumber: quotationNumber.trim(),
        clientId: clientObj.id,
        clientDisplayId: clientObj.clientId,
        clientName: clientObj.companyName,
        clientCountry: clientObj.country,
        clientContact: clientObj.primaryContact.name,
        clientEmail: clientObj.primaryContact.email,
        quotationDate: quotationDate.trim(),
        validUntil: validUntil.trim(),
        quotationType,
        currency,
        status: determinedStatus,
        garmentStyle: garmentStyle.trim(),
        styleName: styleName.trim(),
        productCategory: productCategory.trim(),
        description: description.trim() || undefined,
        fabric: fabric.trim(),
        gsm: gsm.trim() || undefined,
        color: color.trim() || undefined,
        sizeRange: sizeRange.trim() || undefined,
        customizationNotes: customizationNotes.trim() || undefined,
        quantity: pricing.quantity,
        unitPrice: pricing.unitPrice,
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        freightCharges: pricing.freightCharges,
        tax: pricing.tax,
        grandTotal: pricing.grandTotal,
        paymentTerms: paymentTerms.trim(),
        incoterms: incoterms.trim(),
        shippingMethod: shippingMethod.trim() || undefined,
        destinationPort: destinationPort.trim() || undefined,
        buyerPoRef: buyerPoRef.trim() || undefined,
        costEstimateId: costEstimateId.trim() || undefined,
        orderId: orderId.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        buyerNotes: buyerNotes.trim() || undefined,
        updatedAt: nowIso,
        timeline: [
          ...(determinedStatus !== activeQuotation.status
            ? [
                {
                  id: "evt_" + Date.now(),
                  title: `Status Changed: ${STATUS_CONFIG[determinedStatus]?.label || determinedStatus}`,
                  description: `Quotation status updated to ${STATUS_CONFIG[determinedStatus]?.label || determinedStatus}.`,
                  timestamp: nowReadable,
                  type: "updated" as const,
                  author: "Merchandising Lead",
                },
              ]
            : []),
          ...(activeQuotation.timeline || []),
        ],
      };

      const updated = quotations.map((q) => (q.id === editingInternalId ? quoteToSave : q));
      saveQuotations(updated);
      success("Quotation Updated", {
        description: `Changes saved for proposal ${quoteToSave.quotationNumber} (${clientObj.companyName}).`,
      });
    } else {
      const newInternalId = "qt_" + Date.now();
      quoteToSave = {
        id: newInternalId,
        quotationNumber: quotationNumber.trim(),
        clientId: clientObj.id,
        clientDisplayId: clientObj.clientId,
        clientName: clientObj.companyName,
        clientCountry: clientObj.country,
        clientContact: clientObj.primaryContact.name,
        clientEmail: clientObj.primaryContact.email,
        quotationDate: quotationDate.trim(),
        validUntil: validUntil.trim(),
        quotationType,
        currency,
        status: determinedStatus,
        garmentStyle: garmentStyle.trim(),
        styleName: styleName.trim(),
        productCategory: productCategory.trim(),
        description: description.trim() || undefined,
        fabric: fabric.trim(),
        gsm: gsm.trim() || undefined,
        color: color.trim() || undefined,
        sizeRange: sizeRange.trim() || undefined,
        customizationNotes: customizationNotes.trim() || undefined,
        quantity: pricing.quantity,
        unitPrice: pricing.unitPrice,
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        freightCharges: pricing.freightCharges,
        tax: pricing.tax,
        grandTotal: pricing.grandTotal,
        paymentTerms: paymentTerms.trim(),
        incoterms: incoterms.trim(),
        shippingMethod: shippingMethod.trim() || undefined,
        destinationPort: destinationPort.trim() || undefined,
        buyerPoRef: buyerPoRef.trim() || undefined,
        costEstimateId: costEstimateId.trim() || undefined,
        orderId: undefined,
        internalNotes: internalNotes.trim() || undefined,
        buyerNotes: buyerNotes.trim() || undefined,
        timeline: [
          {
            id: "evt_" + Date.now(),
            title: determinedStatus === "draft" ? "Quotation Draft Created" : "Quotation Proposal Issued",
            description: `${determinedStatus === "draft" ? "Draft proposal saved" : "Commercial quotation issued"} for ${pricing.quantity.toLocaleString()} pcs ${garmentStyle} @ ${CURRENCY_SYMBOLS[currency]}${pricing.unitPrice.toFixed(2)} (${clientObj.companyName}).`,
            timestamp: nowReadable,
            type: determinedStatus === "draft" ? "created" : "sent",
            author: "Merchandising Lead",
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const updated = [quoteToSave, ...quotations];
      saveQuotations(updated);
      createQuotationInDB(quoteToSave).catch((err) => console.error(err));
      success(determinedStatus === "draft" ? "Draft Quotation Saved" : "Quotation Issued", {
        description: `Successfully created proposal ${quoteToSave.quotationNumber} for ${clientObj.companyName}.`,
      });
    }

    if (editingInternalId && activeQuotation) {
      updateQuotationInDB(quoteToSave).catch((err) => console.error(err));
    }

    setSelectedQuotationId(quoteToSave.id);
    setViewMode("detail");
  };

  // Convert Quotation to Sales Order
  const handleConvertToOrder = (quote: QuotationRecord) => {
    if (quote.orderId) {
      toastError("Already Converted", {
        description: `Quotation ${quote.quotationNumber} is already linked to Sales Order ${quote.orderId}.`,
      });
      return;
    }

    // If quotation is not yet accepted, accept it first
    let quoteForConversion = quote;
    const nowIso = new Date().toISOString();
    const nowReadable = new Date().toLocaleString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (quote.status !== "accepted") {
      quoteForConversion = {
        ...quote,
        status: "accepted",
        updatedAt: nowIso,
        timeline: [
          {
            id: "evt_" + Date.now(),
            title: "Quotation Accepted",
            description: `Proposal marked accepted by buyer for order conversion.`,
            timestamp: nowReadable,
            type: "accepted",
            author: "Merchandising Lead",
          },
          ...(quote.timeline || []),
        ],
      };
    }

    const conversionResult = convertQuotationToOrder(quoteForConversion, availableOrders, saveOrders);

    if (!conversionResult.success || !conversionResult.orderNumber) {
      toastError("Conversion Failed", {
        description: conversionResult.error || "Could not convert quotation to order.",
      });
      return;
    }

    // Link created Order ID back to Quotation
    const updatedQuote: QuotationRecord = {
      ...quoteForConversion,
      status: "accepted",
      orderId: conversionResult.orderNumber,
      updatedAt: nowIso,
      timeline: [
        {
          id: "evt_" + Date.now(),
          title: "Converted to Sales Order",
          description: `Contract ${conversionResult.orderNumber} successfully booked from quotation.`,
          timestamp: nowReadable,
          type: "converted",
          author: "Merchandising Lead",
          reference: conversionResult.orderNumber,
        },
        ...(quoteForConversion.timeline || []),
      ],
    };

    const updatedQuotations = quotations.map((q) => (q.id === quote.id ? updatedQuote : q));
    saveQuotations(updatedQuotations);
    updateQuotationInDB(updatedQuote).catch((err) => console.error(err));

    success("Converted to Sales Order", {
      description: `Created Sales Order ${conversionResult.orderNumber} from proposal ${quote.quotationNumber}.`,
    });
  };

  // Quick Status Update
  const handleUpdateStatus = (quote: QuotationRecord, newStatus: QuotationStatus) => {
    const nowIso = new Date().toISOString();
    const nowReadable = new Date().toLocaleString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updatedQuote: QuotationRecord = {
      ...quote,
      status: newStatus,
      updatedAt: nowIso,
      timeline: [
        {
          id: "evt_" + Date.now(),
          title: `Status Changed: ${STATUS_CONFIG[newStatus]?.label || newStatus}`,
          description: `Quotation proposal transitioned from ${STATUS_CONFIG[quote.status]?.label || quote.status} to ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
          timestamp: nowReadable,
          type: newStatus === "accepted" ? "accepted" : newStatus === "rejected" ? "rejected" : "updated",
          author: "Merchandising Desk",
        },
        ...(quote.timeline || []),
      ],
    };

    const updated = quotations.map((q) => (q.id === quote.id ? updatedQuote : q));
    saveQuotations(updated);
    updateQuotationInDB(updatedQuote).catch((err) => console.error(err));
    success("Status Updated", {
      description: `${quote.quotationNumber} is now ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
    });
  };

  // Deletion / Archival Safety
  const handleRequestDelete = (quote: QuotationRecord) => {
    if (hasQuotationTransactionalLinks(quote)) {
      setArchiveModalQuote(quote);
    } else {
      setQuoteToDelete(quote);
    }
  };

  const handleConfirmPermanentDelete = () => {
    if (!quoteToDelete) return;
    const updated = quotations.filter((q) => q.id !== quoteToDelete.id);
    saveQuotations(updated);
    deleteQuotationInDB(quoteToDelete.id, quoteToDelete.quotationNumber).catch((err) => console.error(err));
    success("Quotation Removed", {
      description: `Quotation ${quoteToDelete.quotationNumber} was permanently deleted.`,
    });
    if (selectedQuotationId === quoteToDelete.id) {
      setSelectedQuotationId(null);
      setViewMode("list");
    }
    setQuoteToDelete(null);
  };

  const handleConfirmArchive = () => {
    if (!archiveModalQuote) return;
    const updatedQuote: QuotationRecord = {
      ...archiveModalQuote,
      status: "cancelled",
      isArchived: true,
      updatedAt: new Date().toISOString(),
    };
    const updated = quotations.map((q) => (q.id === archiveModalQuote.id ? updatedQuote : q));
    saveQuotations(updated);
    updateQuotationInDB(updatedQuote).catch((err) => console.error(err));
    success("Quotation Archived", {
      description: `Proposal ${archiveModalQuote.quotationNumber} archived. Historical accounting and audit links preserved.`,
    });
    setArchiveModalQuote(null);
  };

  // Dynamic KPI Computations
  const nonArchivedQuotes = quotations.filter((q) => !q.isArchived);
  const totalQuotationsCount = nonArchivedQuotes.length;
  const draftQuotationsCount = nonArchivedQuotes.filter((q) => q.status === "draft").length;
  const sentUnderReviewCount = nonArchivedQuotes.filter((q) => q.status === "sent" || q.status === "under_review").length;
  const acceptedCount = nonArchivedQuotes.filter((q) => q.status === "accepted").length;
  const totalQuotedValueSum = nonArchivedQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

  // Search & Filter Pipeline
  const filteredQuotations = nonArchivedQuotes.filter((q) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      q.quotationNumber.toLowerCase().includes(query) ||
      q.clientName.toLowerCase().includes(query) ||
      q.clientDisplayId.toLowerCase().includes(query) ||
      q.garmentStyle.toLowerCase().includes(query) ||
      q.styleName.toLowerCase().includes(query) ||
      q.clientCountry.toLowerCase().includes(query) ||
      (q.clientEmail && q.clientEmail.toLowerCase().includes(query)) ||
      (q.orderId && q.orderId.toLowerCase().includes(query));

    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    const matchesClient = clientFilter === "all" || q.clientId === clientFilter;
    const matchesCurrency = currencyFilter === "all" || q.currency === currencyFilter;
    const matchesType = typeFilter === "all" || q.quotationType === typeFilter;

    return matchesSearch && matchesStatus && matchesClient && matchesCurrency && matchesType;
  });

  // Sorting
  const sortedQuotations = [...filteredQuotations].sort((a, b) => {
    if (sortBy === "quotationDate") {
      return new Date(b.quotationDate).getTime() - new Date(a.quotationDate).getTime();
    }
    if (sortBy === "validUntil") {
      return new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime();
    }
    if (sortBy === "highValue") {
      return (b.grandTotal || 0) - (a.grandTotal || 0);
    }
    if (sortBy === "lowValue") {
      return (a.grandTotal || 0) - (b.grandTotal || 0);
    }
    if (sortBy === "clientName") {
      return a.clientName.localeCompare(b.clientName);
    }
    // recent
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pageSize = 10;
  const paginatedQuotations = sortedQuotations.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <TopNav
        title={
          viewMode === "create"
            ? "Create New Commercial Quotation"
            : viewMode === "edit"
            ? `Edit Quotation: ${quotationNumber}`
            : viewMode === "detail"
            ? `Commercial Quotation: ${activeQuotation?.quotationNumber || ""} (${activeQuotation?.clientName || ""})`
            : "Commercial Export Quotations & Price Proposals"
        }
      />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* ============================================================
            VIEW 1: CREATE / EDIT QUOTATION STUDIO
            ============================================================ */}
        {viewMode === "create" || viewMode === "edit" ? (
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewMode(selectedQuotationId ? "detail" : "list")}
                  className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back to Quotations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                      {editingInternalId ? `Edit Quotation: ${quotationNumber}` : "Create New Commercial Quotation"}
                    </h1>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {quotationNumber}
                    </span>
                    <Badge variant={STATUS_CONFIG[status]?.variant || "default"} dot>
                      {STATUS_CONFIG[status]?.label || status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {quotationType} • Valid Until: {validUntil || "Not set"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setViewMode(selectedQuotationId ? "detail" : "list")}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={(e) => handleSaveQuotation(e, "draft")}
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leftIcon={<Send className="h-4 w-4" />}
                  onClick={(e) => handleSaveQuotation(e, "sent")}
                >
                  {editingInternalId ? "Update & Issue Proposal" : "Issue Commercial Quotation"}
                </Button>
              </div>
            </div>

            {/* Form Canvas */}
            <form onSubmit={(e) => handleSaveQuotation(e, "sent")} className="space-y-6">
              {/* Section A: Quotation & Client Identification */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="A. Quotation & Client Identification"
                  description="System-generated quotation ID, buyer account, proposal date, and validity window."
                >
                  <FormField
                    label="Quotation Display ID"
                    description="Auto-generated unique proposal code (Read-only)"
                  >
                    <Input
                      value={quotationNumber}
                      readOnly
                      disabled
                      className="bg-slate-100/70 text-blue-700 font-mono font-bold cursor-not-allowed select-none border-slate-200"
                    />
                  </FormField>

                  <FormField label="Client / Buyer Account" required error={formErrors.selectedClient}>
                    <Select
                      value={selectedClientInternalId}
                      onChange={(e) => handleClientChange(e.target.value)}
                      error={!!formErrors.selectedClient}
                      options={[
                        { value: "", label: "-- Select Client / Buyer Account --" },
                        ...availableClients.map((c) => ({
                          value: c.id,
                          label: `${c.clientId} — ${c.companyName} (${c.country})`,
                        })),
                      ]}
                    />
                  </FormField>

                  <FormField label="Quotation Date" required error={formErrors.quotationDate}>
                    <Input
                      type="date"
                      value={quotationDate}
                      onChange={(e) => {
                        setQuotationDate(e.target.value);
                        if (formErrors.quotationDate) setFormErrors((prev) => ({ ...prev, quotationDate: "" }));
                      }}
                      error={!!formErrors.quotationDate}
                    />
                  </FormField>

                  <FormField label="Valid Until Date" required error={formErrors.validUntil}>
                    <Input
                      type="date"
                      value={validUntil}
                      onChange={(e) => {
                        setValidUntil(e.target.value);
                        if (formErrors.validUntil) setFormErrors((prev) => ({ ...prev, validUntil: "" }));
                      }}
                      error={!!formErrors.validUntil}
                    />
                  </FormField>

                  <FormField label="Quotation Proposal Type" required>
                    <Select
                      value={quotationType}
                      onChange={(e) => setQuotationType(e.target.value as QuotationType)}
                      options={QUOTATION_TYPES.map((t) => ({ value: t, label: t }))}
                    />
                  </FormField>

                  <FormField label="Commercial Currency" required>
                    <Select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CommercialCurrency)}
                      options={[
                        { value: "PKR", label: "PKR (Rs) — Pakistani Rupee" },
                        { value: "USD", label: "USD ($) — US Dollar" },
                        { value: "EUR", label: "EUR (€) — Euro" },
                        { value: "GBP", label: "GBP (£) — British Pound" },
                        { value: "AED", label: "AED (AED) — UAE Dirham" },
                      ]}
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Section B: Product / Garment Details */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="B. Product / Garment Details"
                  description="Garment style specifications, fabric composition, GSM, colorways, and pre-costing BOM links."
                >
                  <FormField label="Select Garment Style Preset">
                    <Select
                      value={garmentStyle}
                      onChange={(e) => handleStyleChange(e.target.value)}
                      options={[
                        { value: "", label: "-- Select Garment Style Preset (Optional) --" },
                        ...GARMENT_STYLES.map((s) => ({
                          value: s.code,
                          label: `${s.code} — ${s.name}`,
                        })),
                      ]}
                    />
                  </FormField>

                  <FormField label="Style Name / Description" required error={formErrors.styleName}>
                    <Input
                      value={styleName}
                      onChange={(e) => {
                        setStyleName(e.target.value);
                        if (formErrors.styleName) setFormErrors((prev) => ({ ...prev, styleName: "" }));
                      }}
                      placeholder="e.g. HD-380 — Heavyweight Hoodie"
                      error={!!formErrors.styleName}
                    />
                  </FormField>

                  <FormField label="Product Category">
                    <Input
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value)}
                      placeholder="e.g. Hoodies & Sweatshirts"
                    />
                  </FormField>

                  <FormField label="Fabric Composition" required error={formErrors.fabric}>
                    <Input
                      value={fabric}
                      onChange={(e) => {
                        setFabric(e.target.value);
                        if (formErrors.fabric) setFormErrors((prev) => ({ ...prev, fabric: "" }));
                      }}
                      placeholder="e.g. 380 GSM 100% Combed Cotton Fleece"
                      error={!!formErrors.fabric}
                    />
                  </FormField>

                  <FormField label="Target Fabric GSM">
                    <Input
                      value={gsm}
                      onChange={(e) => setGsm(e.target.value)}
                      placeholder="e.g. 380 GSM"
                    />
                  </FormField>

                  <FormField label="Colorway / Dye Lot">
                    <Input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="e.g. Washed Black / Vintage Olive"
                    />
                  </FormField>

                  <FormField label="Size Matrix Range">
                    <Input
                      value={sizeRange}
                      onChange={(e) => setSizeRange(e.target.value)}
                      placeholder="e.g. S, M, L, XL, XXL"
                    />
                  </FormField>

                  <FormField label="Linked Pre-Costing Estimate">
                    <Input
                      value={costEstimateId}
                      onChange={(e) => setCostEstimateId(e.target.value)}
                      placeholder="e.g. CST-2026-001 (Optional)"
                    />
                  </FormField>

                  <FormField label="Customization & Artwork Notes" className="col-span-2">
                    <Textarea
                      rows={2}
                      value={customizationNotes}
                      onChange={(e) => setCustomizationNotes(e.target.value)}
                      placeholder="Embroidery artwork placement, screenprint inks, silicon wash instructions, damask neck tags..."
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Section C: Commercial Pricing Calculation */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="C. Commercial Pricing Calculation"
                  description="Batch order quantity, agreed FOB unit price, commercial discounts, freight additions, and proposal total."
                >
                  <FormField label="Quoted Quantity (Pcs)" required error={formErrors.quantity}>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        if (formErrors.quantity) setFormErrors((prev) => ({ ...prev, quantity: "" }));
                      }}
                      suffix="Pcs"
                      placeholder="e.g. 500"
                      error={!!formErrors.quantity}
                    />
                  </FormField>

                  <FormField label="Unit Selling Price" required error={formErrors.unitPrice}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitPrice}
                      onChange={(e) => {
                        setUnitPrice(e.target.value);
                        if (formErrors.unitPrice) setFormErrors((prev) => ({ ...prev, unitPrice: "" }));
                      }}
                      prefix={CURRENCY_SYMBOLS[currency] || "Rs "}
                      placeholder="e.g. 21.09"
                      error={!!formErrors.unitPrice}
                    />
                  </FormField>

                  <FormField label="Commercial Discount">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      prefix={CURRENCY_SYMBOLS[currency] || "Rs "}
                      placeholder="0.00"
                    />
                  </FormField>

                  <FormField label="Freight / Handling Charges">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={freightCharges}
                      onChange={(e) => setFreightCharges(e.target.value)}
                      prefix={CURRENCY_SYMBOLS[currency] || "Rs "}
                      placeholder="0.00"
                    />
                  </FormField>

                  <FormField label="Applicable Export Tax / Duties">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      prefix={CURRENCY_SYMBOLS[currency] || "Rs "}
                      placeholder="0.00"
                    />
                  </FormField>

                  {/* Real-time Commercial Total Display */}
                  <div className="col-span-full sm:col-span-2 w-full p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[11px] font-medium text-slate-500">Subtotal:</span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {CURRENCY_SYMBOLS[currency] || "Rs "}{calculatedPricing.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-500">Discount:</span>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">
                        -{CURRENCY_SYMBOLS[currency] || "Rs "}{calculatedPricing.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-500">Charges & Tax:</span>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">
                        +{CURRENCY_SYMBOLS[currency] || "Rs "}{(calculatedPricing.freightCharges + calculatedPricing.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-blue-700 uppercase">Grand Quotation Total:</span>
                      <p className="text-base font-extrabold text-blue-700 mt-0.5">
                        {CURRENCY_SYMBOLS[currency] || "Rs "}{calculatedPricing.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </FormSection>
              </Card>

              {/* Section D: Commercial & Shipping Terms */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="D. Commercial Settlement & Shipping Terms"
                  description="Payment milestone agreements, international Incoterms, and dispatch logistics."
                >
                  <FormField label="Payment Settlement Terms" required error={formErrors.paymentTerms}>
                    <Input
                      value={paymentTerms}
                      onChange={(e) => {
                        setPaymentTerms(e.target.value);
                        if (formErrors.paymentTerms) setFormErrors((prev) => ({ ...prev, paymentTerms: "" }));
                      }}
                      placeholder="e.g. 30% Advance TT / 70% before BL Release"
                      error={!!formErrors.paymentTerms}
                    />
                  </FormField>

                  <FormField label="Incoterms Agreement">
                    <Select
                      value={incoterms}
                      onChange={(e) => setIncoterms(e.target.value)}
                      options={[
                        { value: "", label: "-- Select Incoterms (Optional) --" },
                        { value: "FOB Sialkot", label: "FOB Sialkot Dry Port (SDPT)" },
                        { value: "FOB Sialkot Dry Port", label: "FOB Sialkot Dry Port / Sambrial" },
                        { value: "CIF London", label: "CIF Destination Port" },
                        { value: "CIF Gothenburg", label: "CIF Gothenburg" },
                        { value: "DDP Warehouse", label: "DDP Buyer Warehouse" },
                        { value: "EXW Factory", label: "EXW Factory" },
                      ]}
                    />
                  </FormField>

                  <FormField label="Shipping Mode">
                    <Select
                      value={shippingMethod}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      options={[
                        { value: "", label: "-- Select Shipping Mode (Optional) --" },
                        { value: "Air Cargo", label: "Air Cargo (Standard / Express)" },
                        { value: "Sea Freight (FCL)", label: "Sea Freight (Full Container)" },
                        { value: "Sea Freight (LCL)", label: "Sea Freight (Consolidated)" },
                        { value: "Courier (DHL/FedEx)", label: "International Courier" },
                      ]}
                    />
                  </FormField>

                  <FormField label="Destination Port / Terminal">
                    <Input
                      value={destinationPort}
                      onChange={(e) => setDestinationPort(e.target.value)}
                      placeholder="e.g. London Heathrow Logistics Hub (Optional)"
                    />
                  </FormField>

                  <FormField label="Buyer PO / RfQ Reference">
                    <Input
                      value={buyerPoRef}
                      onChange={(e) => setBuyerPoRef(e.target.value)}
                      placeholder="e.g. PO-UK-88219 (Optional)"
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Section E: Costing & Internal References */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="E. Internal Notes & Buyer Remarks"
                  description="Internal costing notes, margin parameters, and client-facing remarks."
                >
                  <FormField label="Internal Merchandiser Notes" className="col-span-2">
                    <Textarea
                      rows={2}
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Confidential remarks on fabric yield, margin thresholds, supplier terms..."
                    />
                  </FormField>

                  <FormField label="Buyer Proposal Remarks" className="col-span-2">
                    <Textarea
                      rows={2}
                      value={buyerNotes}
                      onChange={(e) => setBuyerNotes(e.target.value)}
                      placeholder="Special commercial remarks visible on the formal quotation proposal sheet..."
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
                  onClick={() => setViewMode(selectedQuotationId ? "detail" : "list")}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={(e) => handleSaveQuotation(e, "draft")}
                >
                  Save Draft
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  leftIcon={<Send className="h-4 w-4" />}
                >
                  {editingInternalId ? "Update & Issue Proposal" : "Issue Commercial Quotation"}
                </Button>
              </div>
            </form>
          </div>
        ) : viewMode === "detail" && activeQuotation ? (
          /* ============================================================
             VIEW 2: COMMERCIAL QUOTATION DETAIL VIEW (6 SUB-TABS)
             ============================================================ */
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Detail Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back to Quotations List"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                      {activeQuotation.quotationNumber}
                    </h1>
                    <span className="text-sm font-semibold text-slate-700 truncate">
                      • {activeQuotation.clientName}
                    </span>
                    <Badge variant={STATUS_CONFIG[activeQuotation.status]?.variant || "default"} dot>
                      {STATUS_CONFIG[activeQuotation.status]?.label || activeQuotation.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      {activeQuotation.styleName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-blue-700 font-bold">
                      {activeQuotation.quantity.toLocaleString()} Pcs
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {activeQuotation.clientCountry}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
                {/* Convert to Order Action */}
                {!activeQuotation.orderId && (
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<ArrowRight className="h-4 w-4" />}
                    onClick={() => handleConvertToOrder(activeQuotation)}
                  >
                    Convert to Order
                  </Button>
                )}

                {activeQuotation.orderId && (
                  <span className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    {activeQuotation.orderId}
                  </span>
                )}

                {/* Status Switcher */}
                <select
                  value={activeQuotation.status}
                  onChange={(e) => handleUpdateStatus(activeQuotation, e.target.value as QuotationStatus)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer shadow-2xs focus:outline-none"
                  title="Update Proposal Status"
                >
                  <option value="draft">Status: Draft</option>
                  <option value="sent">Status: Sent to Buyer</option>
                  <option value="under_review">Status: Under Review</option>
                  <option value="accepted">Status: Accepted</option>
                  <option value="rejected">Status: Rejected</option>
                  <option value="expired">Status: Expired</option>
                  <option value="cancelled">Status: Cancelled</option>
                </select>

                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Copy className="h-4 w-4" />}
                  onClick={() => handleDuplicateQuotation(activeQuotation)}
                >
                  Duplicate
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  leftIcon={<Edit className="h-4 w-4" />}
                  onClick={() => handleOpenEdit(activeQuotation)}
                >
                  Edit Quotation
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => handleRequestDelete(activeQuotation)}
                >
                  Delete / Archive
                </Button>
              </div>
            </div>

            {/* Top 5 Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Quoted Units</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{activeQuotation.quantity.toLocaleString()} Pcs</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{activeQuotation.garmentStyle}</p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Unit Price</span>
                <p className="text-lg font-bold text-blue-700 mt-0.5">
                  {CURRENCY_SYMBOLS[activeQuotation.currency]}{activeQuotation.unitPrice.toFixed(2)}
                </p>
                <p className="text-[11px] text-blue-600 mt-0.5">FOB proposed rate</p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Quotation Total</span>
                <p className="text-lg font-bold text-emerald-700 mt-0.5 truncate">
                  {CURRENCY_SYMBOLS[activeQuotation.currency]}{activeQuotation.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Gross commercial value</p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valid Until</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{activeQuotation.validUntil}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Issued: {activeQuotation.quotationDate}</p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Proposal Status</span>
                <div className="mt-1">
                  <Badge variant={STATUS_CONFIG[activeQuotation.status]?.variant || "default"} dot>
                    {STATUS_CONFIG[activeQuotation.status]?.label || activeQuotation.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {activeQuotation.orderId ? `Converted: ${activeQuotation.orderId}` : "Not converted"}
                </p>
              </Card>
            </div>

            {/* Profile Sub-Tabs Navigation */}
            <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
              {[
                { id: "overview", label: "Overview & Commercial", icon: Building2 },
                { id: "specs", label: "Garment Specifications", icon: Layers },
                { id: "costing", label: "Cost Estimate BOM", icon: Calculator },
                { id: "client", label: "Client & Buyer Profile", icon: Building2 },
                { id: "conversion", label: "Order Conversion", icon: ArrowRight },
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

            {/* Tab: Overview */}
            {detailTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Commercial Terms & Incoterms
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Buyer / Brand</span>
                      <p className="font-bold text-slate-900 mt-0.5">{activeQuotation.clientName}</p>
                      <span className="text-[10px] text-blue-600 font-mono">{activeQuotation.clientDisplayId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Country / Market</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeQuotation.clientCountry}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Primary Contact</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeQuotation.clientContact || "—"}</p>
                      <p className="text-[10px] text-slate-500">{activeQuotation.clientEmail || ""}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Proposal Type</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeQuotation.quotationType}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-medium">Payment Settlement Terms</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeQuotation.paymentTerms}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Incoterms</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeQuotation.incoterms}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Shipping Mode</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeQuotation.shippingMethod || "Air Cargo"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-medium">Destination Logistics Port</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeQuotation.destinationPort || "—"}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Calculator className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Commercial Pricing Breakdown
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Quoted Quantity:</span>
                      <span className="font-bold text-slate-900">{activeQuotation.quantity.toLocaleString()} Pcs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Agreed Unit FOB Price:</span>
                      <span className="font-bold text-blue-700">
                        {CURRENCY_SYMBOLS[activeQuotation.currency]}{activeQuotation.unitPrice.toFixed(2)} / pc
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal:</span>
                      <span className="font-semibold text-slate-800">
                        {CURRENCY_SYMBOLS[activeQuotation.currency]}{activeQuotation.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Commercial Discount:</span>
                      <span className="font-semibold text-slate-700">
                        -{CURRENCY_SYMBOLS[activeQuotation.currency]}{activeQuotation.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Freight & Process Charges:</span>
                      <span className="font-semibold text-slate-700">
                        +{CURRENCY_SYMBOLS[activeQuotation.currency]}{activeQuotation.freightCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Export Duties / Tax:</span>
                      <span className="font-semibold text-slate-700">
                        +{CURRENCY_SYMBOLS[activeQuotation.currency]}{activeQuotation.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="font-bold text-slate-900">Grand Total:</span>
                      <span className="text-base font-extrabold text-emerald-700">
                        {CURRENCY_SYMBOLS[activeQuotation.currency]}{activeQuotation.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Tab: Garment Specs */}
            {detailTab === "specs" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Garment Styling & Technical Specifications
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Garment Style Code:</span>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">{activeQuotation.garmentStyle}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Garment Style Name:</span>
                    <p className="font-bold text-slate-900 mt-0.5">{activeQuotation.styleName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Product Category:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{activeQuotation.productCategory}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Fabric Composition:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{activeQuotation.fabric}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Target Fabric GSM:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{activeQuotation.gsm || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Colorway / Dye Lot:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{activeQuotation.color || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Size Matrix Range:</span>
                    <p className="font-mono text-slate-800 mt-0.5">{activeQuotation.sizeRange || "—"}</p>
                  </div>
                </div>

                {activeQuotation.customizationNotes && (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700">Artwork & Embellishment Notes:</span>
                    <p className="text-slate-600 mt-1">{activeQuotation.customizationNotes}</p>
                  </div>
                )}
              </Card>
            )}

            {/* Tab: Costing */}
            {detailTab === "costing" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Linked Pre-Costing Estimate BOM
                    </h3>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    {activeQuotation.costEstimateId || "Not Linked"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Proposed Unit FOB Price:</span>
                    <p className="text-base font-bold text-blue-700 mt-0.5">
                      {CURRENCY_SYMBOLS[activeQuotation.currency]}{activeQuotation.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Quotation Total Value:</span>
                    <p className="text-base font-bold text-emerald-700 mt-0.5">
                      {CURRENCY_SYMBOLS[activeQuotation.currency]}{activeQuotation.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Pricing Model:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">25% Target Gross Margin</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Approval Status:</span>
                    <Badge variant="success" dot className="mt-1">Approved BOM</Badge>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                  <span>
                    Linked Cost Sheet: <strong>{activeQuotation.costEstimateId || "CST-2026-001"}</strong>
                  </span>
                  <a href="/costing" className="font-semibold text-blue-700 hover:underline flex items-center gap-1">
                    Open Costing Studio <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Card>
            )}

            {/* Tab: Client & Buyer */}
            {detailTab === "client" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Client Profile & CRM Relational Account
                    </h3>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                    {activeQuotation.clientDisplayId}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Company / Brand Name:</span>
                    <p className="font-bold text-slate-900 mt-0.5">{activeQuotation.clientName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Market / Destination:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{activeQuotation.clientCountry}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Primary Contact Person:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{activeQuotation.clientContact || "—"}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                  <span>View comprehensive client orders, cost sheets, and CRM history.</span>
                  <a href="/clients" className="font-semibold text-blue-700 hover:underline flex items-center gap-1">
                    Open Clients CRM <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Card>
            )}

            {/* Tab: Order Conversion */}
            {detailTab === "conversion" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-purple-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Sales Order Conversion Pipeline
                    </h3>
                  </div>
                  {activeQuotation.orderId ? (
                    <Badge variant="success" dot>Order Booked</Badge>
                  ) : (
                    <Badge variant="warning" dot>Pending Conversion</Badge>
                  )}
                </div>

                {activeQuotation.orderId ? (
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs space-y-2">
                    <p className="font-bold text-purple-900 text-sm">
                      Commercial Proposal Converted to Sales Order:
                    </p>
                    <p className="text-purple-800">
                      This quotation was successfully converted into confirmed production contract{" "}
                      <strong className="font-mono text-purple-900">{activeQuotation.orderId}</strong>.
                    </p>
                    <div className="pt-2">
                      <a href="/orders" className="font-bold text-purple-700 hover:underline flex items-center gap-1">
                        Open Sales Orders Module <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                    <p className="text-slate-700">
                      When the buyer accepts this formal price proposal, convert it directly into a confirmed Sales Order. All commercial pricing, terms, garment specifications, and client links will be carried forward automatically.
                    </p>
                    <Button
                      variant="primary"
                      leftIcon={<ArrowRight className="h-4 w-4" />}
                      onClick={() => handleConvertToOrder(activeQuotation)}
                    >
                      Convert Quotation to Sales Order
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Tab: Timeline */}
            {detailTab === "timeline" && (
              <Card className="p-5 border-slate-200/80 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
                  Commercial Proposal Event & Audit Timeline
                </h3>
                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {!activeQuotation.timeline || activeQuotation.timeline.length === 0 ? (
                    <p className="text-xs text-slate-400 pl-8">No recorded activity yet.</p>
                  ) : (
                    activeQuotation.timeline.map((evt) => (
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
             VIEW 3: COMMERCIAL QUOTATIONS DASHBOARD & MAIN DATA TABLE
             ============================================================ */
          <div className="space-y-6 min-w-0 w-full">
            {/* Page Header */}
            <PageHeader
              title="Commercial Quotations"
              description="Manage buyer quotations, commercial proposals, pricing, validity, and order conversion."
              actions={
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={<RefreshCw className={`h-4 w-4 ${loadingQuotations ? "animate-spin" : ""}`} />}
                    onClick={() => loadQuotations(true)}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => handleOpenCreate()}
                  >
                    Create Quotation
                  </Button>
                </div>
              }
            />

            {/* 5 Dynamic KPI Cards */}
            <CardGrid columns={5}>
              <StatCard
                label="Total Quotations"
                value={String(totalQuotationsCount)}
                sub="Issued proposals"
                icon={<FileText className="h-5 w-5" />}
                iconColor="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Draft Quotations"
                value={String(draftQuotationsCount)}
                sub="Unissued drafts"
                icon={<Edit className="h-5 w-5" />}
                iconColor="bg-slate-50 text-slate-600"
              />
              <StatCard
                label="Sent / Under Review"
                value={String(sentUnderReviewCount)}
                sub="Awaiting buyer feedback"
                icon={<Clock className="h-5 w-5" />}
                iconColor="bg-amber-50 text-amber-600"
              />
              <StatCard
                label="Accepted Proposals"
                value={String(acceptedCount)}
                sub="Approved by buyer"
                icon={<CheckCircle2 className="h-5 w-5" />}
                iconColor="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                label="Total Quoted Value"
                value={`Rs ${(totalQuotedValueSum / 1000).toFixed(1)}k`}
                sub="Active proposal pipeline"
                icon={<Calculator className="h-5 w-5" />}
                iconColor="bg-purple-50 text-purple-600"
              />
            </CardGrid>

            {/* Search & Multi-Filters Toolbar */}
            <Card noPadding className="p-3.5 sm:p-4 bg-[var(--color-erp-surface)] border-[var(--color-erp-border)] shadow-xs">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 min-w-0">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-erp-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search by quote # (QT-2026-001), buyer, style, email, country..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] placeholder-[var(--color-erp-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-erp-primary)]/20"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status */}
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent to Buyer</option>
                    <option value="under_review">Under Review</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  {/* Client */}
                  <select
                    value={clientFilter}
                    onChange={(e) => {
                      setClientFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Clients</option>
                    {availableClients.map((c) => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>

                  {/* Currency */}
                  <select
                    value={currencyFilter}
                    onChange={(e) => {
                      setCurrencyFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Currencies</option>
                    <option value="PKR">PKR (Rs)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (AED)</option>
                  </select>

                  {/* Type */}
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    {QUOTATION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {/* Sorting */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-2.5 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="recent">Sort: Recently Added</option>
                    <option value="quotationDate">Sort: Quotation Date</option>
                    <option value="validUntil">Sort: Valid Until</option>
                    <option value="highValue">Sort: Highest Value</option>
                    <option value="lowValue">Sort: Lowest Value</option>
                    <option value="clientName">Sort: Client Name (A-Z)</option>
                  </select>

                  {(searchQuery ||
                    statusFilter !== "all" ||
                    clientFilter !== "all" ||
                    currencyFilter !== "all" ||
                    typeFilter !== "all" ||
                    sortBy !== "recent") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setClientFilter("all");
                        setCurrencyFilter("all");
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

            {/* Main Quotations Table */}
            <Card noPadding className="border-[var(--color-erp-border)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-xs text-left min-w-[1200px]">
                  <thead className="bg-[var(--color-erp-surface-2)] text-[var(--color-erp-text-muted)] font-semibold border-b border-[var(--color-erp-border)] uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">QUOTATION #</th>
                      <th className="py-3 px-4">CLIENT / BRAND</th>
                      <th className="py-3 px-4">DATE ISSUED</th>
                      <th className="py-3 px-4">VALID UNTIL</th>
                      <th className="py-3 px-4">STYLE / PRODUCT</th>
                      <th className="py-3 px-4 text-right">QTY</th>
                      <th className="py-3 px-4 text-right">UNIT PRICE</th>
                      <th className="py-3 px-4 text-right">QUOTATION VALUE</th>
                      <th className="py-3 px-4 text-center">CURRENCY</th>
                      <th className="py-3 px-4 text-center">STATUS</th>
                      <th className="py-3 px-4 text-center">LINKED ORDER</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-erp-border)]">
                    {paginatedQuotations.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-0">
                          <EmptyState
                            icon={<FileText className="h-6 w-6 text-blue-600" />}
                            title="No commercial quotations found"
                            description={
                              searchQuery || statusFilter !== "all" || clientFilter !== "all"
                                ? "No quotations match your search filters. Click Reset to clear filters."
                                : "Create export price proposals from pre-costing calculations to send formal commercial terms to international buyers."
                            }
                            actionLabel="Create Quotation"
                            actionIcon={<Plus className="h-4 w-4" />}
                            onAction={() => handleOpenCreate()}
                          />
                        </td>
                      </tr>
                    ) : (
                      paginatedQuotations.map((quote) => {
                        const statusConfig = STATUS_CONFIG[quote.status] || {
                          label: quote.status,
                          variant: "default",
                        };

                        return (
                          <tr
                            key={quote.id}
                            className="hover:bg-[var(--color-erp-surface-2)]/50 transition-colors"
                          >
                            {/* Quotation # */}
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(quote)}
                                className="hover:underline cursor-pointer text-left"
                                title="View full quotation profile"
                              >
                                {quote.quotationNumber}
                              </button>
                            </td>

                            {/* Client / Brand */}
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{quote.clientName}</div>
                              <span className="text-[10px] text-slate-400">{quote.clientCountry}</span>
                            </td>

                            {/* Date Issued */}
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {quote.quotationDate}
                            </td>

                            {/* Valid Until */}
                            <td className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">
                              {quote.validUntil}
                            </td>

                            {/* Style / Product */}
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900">{quote.styleName}</div>
                              <span className="text-[10px] text-slate-500 font-mono">{quote.garmentStyle}</span>
                            </td>

                            {/* Quantity */}
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              {quote.quantity.toLocaleString()} Pcs
                            </td>

                            {/* Unit Price */}
                            <td className="py-3 px-4 text-right font-medium text-slate-700">
                              {CURRENCY_SYMBOLS[quote.currency]}{quote.unitPrice.toFixed(2)}
                            </td>

                            {/* Quotation Value */}
                            <td className="py-3 px-4 text-right font-bold text-emerald-700">
                              {CURRENCY_SYMBOLS[quote.currency]}{quote.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            {/* Currency */}
                            <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                              {quote.currency}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4 text-center">
                              <Badge variant={statusConfig.variant} dot>
                                {statusConfig.label}
                              </Badge>
                            </td>

                            {/* Linked Order */}
                            <td className="py-3 px-4 text-center">
                              {quote.orderId ? (
                                <a
                                  href="/orders"
                                  className="font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 hover:underline"
                                  title="View linked sales order"
                                >
                                  {quote.orderId}
                                </a>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">None</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetail(quote)}
                                  title="View quotation details"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(quote)}
                                  title="Edit quotation"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicateQuotation(quote)}
                                  title="Duplicate quotation"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                {!quote.orderId && quote.status === "accepted" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                    onClick={() => handleConvertToOrder(quote)}
                                    title="Convert to Sales Order"
                                  >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRequestDelete(quote)}
                                  className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete / Archive quotation"
                                  aria-label={`Delete ${quote.quotationNumber}`}
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
                total={sortedQuotations.length}
                onPageChange={setPage}
              />
            </Card>
          </div>
        )}
      </div>

      {/* Safety Alert Modal: Quotation has Linked Records -> Archive Instead */}
      <Modal
        isOpen={!!archiveModalQuote}
        onClose={() => setArchiveModalQuote(null)}
        title="Archive Commercial Quotation"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Linked Transactions Protection:</strong>
              <p className="mt-1 text-amber-800">
                Quotation proposal <strong>{archiveModalQuote?.quotationNumber} ({archiveModalQuote?.clientName})</strong> has commercial transaction links (
                {archiveModalQuote?.orderId ? `Sales Order: ${archiveModalQuote.orderId}, ` : ""}
                {archiveModalQuote?.costEstimateId ? `Costing BOM: ${archiveModalQuote.costEstimateId}, ` : ""}
                Status: {archiveModalQuote?.status}
                ).
              </p>
              <p className="mt-1.5 text-amber-800 font-medium">
                To maintain historical commercial pricing audits and contract compliance, this quotation cannot be permanently deleted. Archive the proposal instead to mark it cancelled while preserving all audit links.
              </p>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setArchiveModalQuote(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Archive className="h-4 w-4" />}
              onClick={handleConfirmArchive}
            >
              Archive Quotation
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Confirmation Dialog: Permanent Delete */}
      <ConfirmDialog
        isOpen={!!quoteToDelete}
        onClose={() => setQuoteToDelete(null)}
        onConfirm={handleConfirmPermanentDelete}
        title={`Permanently Delete Quotation ${quoteToDelete?.quotationNumber || ""}?`}
        description={`Are you sure you want to delete proposal ${quoteToDelete?.quotationNumber} (${quoteToDelete?.styleName})? This draft proposal has no active contract or accounting dependencies and will be permanently removed.`}
        confirmLabel="Delete Quotation"
        cancelLabel="Keep Quotation"
        destructive
      />
    </>
  );
}

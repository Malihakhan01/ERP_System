"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog, Modal, ModalFooter } from "@/components/ui/Modal";
import { EmptyState, Pagination } from "@/components/ui/Misc";
import { FormField, FormSection } from "@/components/forms/FormField";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  Receipt,
  Plus,
  Search,
  Clock,
  AlertTriangle,
  RotateCcw,
  Eye,
  Edit,
  Copy,
  Trash2,
  Archive,
  ArrowLeft,
  Building2,
  DollarSign,
  CreditCard,
  Layers,
  Truck,
  ExternalLink,
  Send,
  Printer,
  RefreshCw,
} from "lucide-react";
import {
  InvoiceRecord,
  InvoiceStatus,
  PaymentStatus,
  InvoiceType,
  INVOICE_STORAGE_KEY,
  INITIAL_INVOICES,
  calculateInvoicePricing,
  hasInvoiceTransactionalLinks,
  evaluateInvoiceOverdue,
  syncClientWithInvoices,
  recordInvoicePayment,
} from "@/lib/invoices-engine";
import {
  ClientRecord,
  CLIENT_STORAGE_KEY,
  INITIAL_CLIENTS,
} from "@/lib/clients-engine";
import {
  OrderRecord,
  ORDER_STORAGE_KEY,
  INITIAL_ORDERS,
  CommercialCurrency,
} from "@/lib/orders-engine";
import {
  QuotationRecord,
  QUOTATION_STORAGE_KEY,
  INITIAL_QUOTATIONS,
} from "@/lib/quotations-engine";
import { CURRENCY_SYMBOLS } from "@/lib/costing-engine";

import {
  getInvoicesFromSupabase,
  createInvoiceInSupabase,
  updateInvoiceInSupabase,
  deleteInvoiceInSupabase,
  recordInvoicePaymentInSupabase,
} from "@/lib/services/invoices-service";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; variant: "primary" | "warning" | "info" | "success" | "danger" | "default" }
> = {
  draft: { label: "Draft Invoice", variant: "default" },
  issued: { label: "Issued / Open", variant: "warning" },
  partially_paid: { label: "Partially Paid", variant: "info" },
  paid: { label: "Fully Settled", variant: "success" },
  overdue: { label: "Overdue Balance", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; variant: "primary" | "warning" | "info" | "success" | "danger" | "default" }
> = {
  pending: { label: "Unpaid / Pending", variant: "warning" },
  partially_paid: { label: "Partially Paid", variant: "info" },
  paid: { label: "Fully Settled", variant: "success" },
  overdue: { label: "Overdue", variant: "danger" },
  on_hold: { label: "Credit Hold", variant: "danger" },
};

const INVOICE_TYPES: InvoiceType[] = [
  "Export Commercial Invoice",
  "Proforma Invoice",
  "Sample Development Invoice",
  "Debit Note",
  "Credit Settlement",
];

export default function InvoicesPage() {
  const { success, error: toastError } = useToast();

  // View Mode: "list" | "create" | "edit" | "detail"
  const [viewMode, setViewMode] = React.useState<"list" | "create" | "edit" | "detail">("list");
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null);

  // Detail Sub-Tab: "overview" | "order" | "breakdown" | "payments" | "client" | "shipping" | "timeline"
  const [detailTab, setDetailTab] = React.useState<
    "overview" | "order" | "breakdown" | "payments" | "client" | "shipping" | "timeline"
  >("overview");

  // Hydration-Safe State for Invoices
  const getInvoicesSnapshot = React.useCallback(() => {
    try {
      if (typeof window === "undefined") return JSON.stringify(INITIAL_INVOICES);
      const stored = localStorage.getItem(INVOICE_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(INITIAL_INVOICES));
        return JSON.stringify(INITIAL_INVOICES);
      }
      return stored;
    } catch {
      return JSON.stringify(INITIAL_INVOICES);
    }
  }, []);

  const getInvoicesServerSnapshot = React.useCallback(() => JSON.stringify(INITIAL_INVOICES), []);

  const subscribeInvoices = React.useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }, []);

  const rawInvoicesJson = React.useSyncExternalStore(subscribeInvoices, getInvoicesSnapshot, getInvoicesServerSnapshot);
  const [localInvoicesOverride, setLocalInvoicesOverride] = React.useState<InvoiceRecord[] | null>(null);
  const [loadingInvoices, setLoadingInvoices] = React.useState(false);

  const loadInvoices = React.useCallback(async (showToast = false) => {
    setLoadingInvoices(true);
    try {
      const data = await getInvoicesFromSupabase();
      if (data && data.length > 0) {
        setLocalInvoicesOverride(data);
      }
      if (showToast) {
        success("Invoices Refreshed", { description: "Loaded live commercial invoices from MySQL." });
      }
    } catch (err: any) {
      console.error("Failed to load invoices:", err);
      if (showToast) {
        toastError("Failed to Refresh Invoices", { description: err.message });
      }
    } finally {
      setLoadingInvoices(false);
    }
  }, [success, toastError]);

  // Sync with Supabase on mount
  React.useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const invoices = React.useMemo(() => {
    const raw: InvoiceRecord[] = localInvoicesOverride !== null ? localInvoicesOverride : (() => {
      try {
        return JSON.parse(rawInvoicesJson) as InvoiceRecord[];
      } catch {
        return INITIAL_INVOICES;
      }
    })();

    // Evaluate overdue status dynamically based on current date
    const todayStr = new Date().toISOString().split("T")[0];
    return raw.map((inv) => evaluateInvoiceOverdue(inv, todayStr));
  }, [rawInvoicesJson, localInvoicesOverride]);

  const saveInvoices = (records: InvoiceRecord[]) => {
    setLocalInvoicesOverride(records);
    try {
      localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(records));
      syncClientWithInvoices(records);
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

  const rawClientsJson = React.useSyncExternalStore(subscribeInvoices, getClientsSnapshot, () => JSON.stringify(INITIAL_CLIENTS));
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

  const rawOrdersJson = React.useSyncExternalStore(subscribeInvoices, getOrdersSnapshot, () => JSON.stringify(INITIAL_ORDERS));
  const availableOrders = React.useMemo(() => {
    try {
      const parsed: OrderRecord[] = JSON.parse(rawOrdersJson);
      return parsed.filter((o) => !o.isArchived);
    } catch {
      return INITIAL_ORDERS;
    }
  }, [rawOrdersJson]);

  // Hydration-Safe State for Quotations
  const getQuotationsSnapshot = React.useCallback(() => {
    try {
      if (typeof window === "undefined") return JSON.stringify(INITIAL_QUOTATIONS);
      const stored = localStorage.getItem(QUOTATION_STORAGE_KEY);
      return stored ? stored : JSON.stringify(INITIAL_QUOTATIONS);
    } catch {
      return JSON.stringify(INITIAL_QUOTATIONS);
    }
  }, []);

  const rawQuotationsJson = React.useSyncExternalStore(subscribeInvoices, getQuotationsSnapshot, () => JSON.stringify(INITIAL_QUOTATIONS));
  const availableQuotations = React.useMemo(() => {
    try {
      const parsed: QuotationRecord[] = JSON.parse(rawQuotationsJson);
      return parsed.filter((q) => !q.isArchived);
    } catch {
      return INITIAL_QUOTATIONS;
    }
  }, [rawQuotationsJson]);

  // Selected Active Invoice
  const activeInvoice = React.useMemo(() => {
    if (!selectedInvoiceId) return null;
    return invoices.find((inv) => inv.id === selectedInvoiceId) || null;
  }, [invoices, selectedInvoiceId]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [clientFilter, setClientFilter] = React.useState("all");
  const [currencyFilter, setCurrencyFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<
    "recent" | "invoiceDate" | "dueDate" | "highValue" | "lowValue" | "outstanding" | "clientName"
  >("recent");
  const [page, setPage] = React.useState(1);

  // Modals State
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<InvoiceRecord | null>(null);
  const [archiveModalInvoice, setArchiveModalInvoice] = React.useState<InvoiceRecord | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);

  // Payment Recording Form State
  const [paymentAmountInput, setPaymentAmountInput] = React.useState("");
  const [paymentDateInput, setPaymentDateInput] = React.useState("");
  const [paymentMethodInput, setPaymentMethodInput] = React.useState("Bank Wire (TT)");
  const [paymentReferenceInput, setPaymentReferenceInput] = React.useState("");
  const [paymentNotesInput, setPaymentNotesInput] = React.useState("");
  const [paymentRecordedByInput, setPaymentRecordedByInput] = React.useState("Finance Officer");
  const [paymentErrors, setPaymentErrors] = React.useState<Record<string, string>>({});

  // Invoice Form State
  const [editingInternalId, setEditingInternalId] = React.useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [selectedClientInternalId, setSelectedClientInternalId] = React.useState("");
  const [selectedOrderInternalId, setSelectedOrderInternalId] = React.useState("");
  const [selectedQuotationInternalId, setSelectedQuotationInternalId] = React.useState("");

  const [invoiceDate, setInvoiceDate] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [invoiceType, setInvoiceType] = React.useState<InvoiceType>("Export Commercial Invoice");
  const [currency, setCurrency] = React.useState<CommercialCurrency>("USD");
  const [status, setStatus] = React.useState<InvoiceStatus>("draft");

  // Commercial Items Form
  const [garmentStyle, setGarmentStyle] = React.useState("");
  const [styleName, setStyleName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [discount, setDiscount] = React.useState("0");
  const [freightCharges, setFreightCharges] = React.useState("0");
  const [tax, setTax] = React.useState("0");

  // Terms Form
  const [paymentTerms, setPaymentTerms] = React.useState("");
  const [incoterms, setIncoterms] = React.useState("");
  const [buyerPoRef, setBuyerPoRef] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Dynamic Calculated Pricing
  const calculatedPricing = React.useMemo(() => {
    const activePaid = editingInternalId && activeInvoice ? activeInvoice.amountPaid : 0;
    return calculateInvoicePricing(quantity, unitPrice, discount, freightCharges, tax, activePaid);
  }, [quantity, unitPrice, discount, freightCharges, tax, editingInternalId, activeInvoice]);

  // Open Create Form — Clean Blank-State Initialization
  const handleOpenCreate = (preselectedOrderId?: string) => {
    const currentYear = new Date().getFullYear();
    const currentMax = invoices.reduce((max, inv) => {
      const match = inv.invoiceNumber.match(/INV-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = currentMax + 1;
    const newDisplayId = `INV-${currentYear}-${String(nextNum).padStart(3, "0")}`;
    const today = new Date().toISOString().split("T")[0];

    setEditingInternalId(null);
    setInvoiceNumber(newDisplayId);
    setInvoiceDate(today);
    setDueDate("");
    setInvoiceType("Export Commercial Invoice");
    setStatus("draft");

    // Clear commercial items & terms
    setGarmentStyle("");
    setStyleName("");
    setDescription("");
    setQuantity("");
    setUnitPrice("");
    setDiscount("0");
    setFreightCharges("0");
    setTax("0");
    setPaymentTerms("");
    setIncoterms("");
    setBuyerPoRef("");
    setNotes("");
    setFormErrors({});

    // If preselected from a confirmed order
    if (preselectedOrderId) {
      const order = availableOrders.find((o) => o.id === preselectedOrderId || o.orderNumber === preselectedOrderId);
      if (order) {
        setSelectedClientInternalId(order.clientId);
        setSelectedOrderInternalId(order.id);
        setSelectedQuotationInternalId(order.quotationId || "");
        setCurrency(order.currency);
        setGarmentStyle(order.styleCode);
        setStyleName(order.styleName);
        setDescription(`Commercial invoice for order ${order.orderNumber} (${order.styleName}).`);
        setQuantity(String(order.quantity));
        setUnitPrice(String(order.unitPrice));
        setDiscount(String(order.discount || "0"));
        setFreightCharges(String(order.additionalCharges || "0"));
        setTax(String(order.tax || "0"));
        setPaymentTerms(order.paymentTerms);
        setIncoterms(order.incoterms);
        setBuyerPoRef(order.buyerPoRef || "");
        setDueDate(order.targetDeliveryDate || "");
      } else {
        setSelectedClientInternalId("");
        setSelectedOrderInternalId("");
        setSelectedQuotationInternalId("");
        setCurrency("USD");
      }
    } else {
      setSelectedClientInternalId("");
      setSelectedOrderInternalId("");
      setSelectedQuotationInternalId("");
      setCurrency("USD");
    }

    setViewMode("create");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Client Selection Change -> Auto-populate Buyer commercial defaults
  const handleClientChange = (clientId: string) => {
    setSelectedClientInternalId(clientId);
    setSelectedOrderInternalId("");
    setSelectedQuotationInternalId("");
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
    }
  };

  // Order Selection Change -> Populate commercial order info
  const handleOrderChange = (orderIdVal: string) => {
    setSelectedOrderInternalId(orderIdVal);
    const order = availableOrders.find((o) => o.id === orderIdVal);
    if (order) {
      setSelectedClientInternalId(order.clientId);
      setSelectedQuotationInternalId(order.quotationId || "");
      setCurrency(order.currency);
      setGarmentStyle(order.styleCode);
      setStyleName(order.styleName);
      setDescription(`Export billing for Sales Order ${order.orderNumber} (${order.styleName}).`);
      setQuantity(String(order.quantity));
      setUnitPrice(String(order.unitPrice));
      setDiscount(String(order.discount || "0"));
      setFreightCharges(String(order.additionalCharges || "0"));
      setTax(String(order.tax || "0"));
      setPaymentTerms(order.paymentTerms);
      setIncoterms(order.incoterms);
      setBuyerPoRef(order.buyerPoRef || "");
      setDueDate(order.targetDeliveryDate || "");
      if (formErrors.styleName) setFormErrors((prev) => ({ ...prev, styleName: "" }));
      if (formErrors.quantity) setFormErrors((prev) => ({ ...prev, quantity: "" }));
      if (formErrors.unitPrice) setFormErrors((prev) => ({ ...prev, unitPrice: "" }));
    }
  };

  // Open Edit Form
  const handleOpenEdit = (inv: InvoiceRecord) => {
    setEditingInternalId(inv.id);
    setInvoiceNumber(inv.invoiceNumber);
    setSelectedClientInternalId(inv.clientId);
    setSelectedOrderInternalId(inv.orderId || "");
    setSelectedQuotationInternalId(inv.quotationId || "");
    setInvoiceDate(inv.invoiceDate);
    setDueDate(inv.dueDate);
    setInvoiceType(inv.invoiceType);
    setCurrency(inv.currency);
    setStatus(inv.status);

    setGarmentStyle(inv.garmentStyle || "");
    setStyleName(inv.styleName || "");
    setDescription(inv.description);
    setQuantity(String(inv.quantity));
    setUnitPrice(String(inv.unitPrice));
    setDiscount(String(inv.discount || "0"));
    setFreightCharges(String(inv.freightCharges || "0"));
    setTax(String(inv.tax || "0"));

    setPaymentTerms(inv.paymentTerms);
    setIncoterms(inv.incoterms || "");
    setBuyerPoRef(inv.buyerPoRef || "");
    setNotes(inv.notes || "");

    setFormErrors({});
    setViewMode("edit");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Open Detail View
  const handleOpenDetail = (inv: InvoiceRecord) => {
    setSelectedInvoiceId(inv.id);
    setDetailTab("overview");
    setViewMode("detail");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Duplicate Invoice
  const handleDuplicateInvoice = (inv: InvoiceRecord) => {
    const currentYear = new Date().getFullYear();
    const currentMax = invoices.reduce((max, i) => {
      const match = i.invoiceNumber.match(/INV-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = currentMax + 1;
    const newDisplayId = `INV-${currentYear}-${String(nextNum).padStart(3, "0")}`;
    const newInternalId = "inv_" + Date.now();
    const nowIso = new Date().toISOString();
    const nowReadable = new Date().toLocaleString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const duplicated: InvoiceRecord = {
      ...inv,
      id: newInternalId,
      invoiceNumber: newDisplayId,
      status: "draft",
      paymentStatus: "pending",
      amountPaid: 0,
      balanceDue: inv.grandTotal,
      payments: [],
      timeline: [
        {
          id: "evt_" + Date.now(),
          title: "Invoice Duplicated",
          description: `Duplicated from invoice ${inv.invoiceNumber}. Reset as Draft with zero payments.`,
          timestamp: nowReadable,
          type: "created",
          author: "Finance Desk",
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [duplicated, ...invoices];
    saveInvoices(updated);
    success("Invoice Duplicated", {
      description: `Created new draft invoice ${newDisplayId} based on ${inv.invoiceNumber}.`,
    });
    setSelectedInvoiceId(newInternalId);
    setViewMode("detail");
  };

  // Save / Update Invoice
  const handleSaveInvoice = (e: React.FormEvent, targetStatus?: InvoiceStatus) => {
    e.preventDefault();

    const determinedStatus: InvoiceStatus = targetStatus ? targetStatus : status;
    const errors: Record<string, string> = {};

    if (!selectedClientInternalId.trim()) {
      errors.selectedClient = "Please select a client account.";
    }

    if (determinedStatus === "draft") {
      if (!selectedClientInternalId.trim()) {
        setFormErrors(errors);
        toastError("Client Account Required", {
          description: "Please select a client to save an invoice draft.",
        });
        return;
      }
    } else {
      const qtyNum = parseInt(quantity, 10);
      if (!quantity.trim() || isNaN(qtyNum) || qtyNum <= 0) {
        errors.quantity = "Billed quantity must be a positive integer greater than 0.";
      }

      const priceNum = parseFloat(unitPrice);
      if (!unitPrice.trim() || isNaN(priceNum) || priceNum < 0) {
        errors.unitPrice = "Unit price must be a non-negative number.";
      }

      if (!invoiceDate.trim()) {
        errors.invoiceDate = "Invoice date is required.";
      }

      if (!dueDate.trim()) {
        errors.dueDate = "Payment due date is required.";
      }

      if (invoiceDate && dueDate && new Date(dueDate) < new Date(invoiceDate)) {
        errors.dueDate = "Payment Due Date cannot be earlier than Invoice Date.";
      }

      if (!description.trim() && !styleName.trim()) {
        errors.description = "Item description or style name is required.";
      }

      if (!paymentTerms.trim()) {
        errors.paymentTerms = "Payment settlement terms are required.";
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

    const linkedOrder = availableOrders.find((o) => o.id === selectedOrderInternalId);
    const existingPaid = editingInternalId && activeInvoice ? activeInvoice.amountPaid : 0;
    const pricing = calculateInvoicePricing(quantity || 0, unitPrice || 0, discount, freightCharges, tax, existingPaid);

    const nowIso = new Date().toISOString();
    const nowReadable = new Date().toLocaleString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let invoiceToSave: InvoiceRecord;

    if (editingInternalId && activeInvoice) {
      invoiceToSave = {
        ...activeInvoice,
        invoiceNumber: invoiceNumber.trim(),
        clientId: clientObj.id,
        clientDisplayId: clientObj.clientId,
        clientName: clientObj.companyName,
        clientCountry: clientObj.country,
        clientContact: clientObj.primaryContact.name,
        clientEmail: clientObj.primaryContact.email,
        orderId: linkedOrder ? linkedOrder.id : undefined,
        orderNumber: linkedOrder ? linkedOrder.orderNumber : undefined,
        quotationId: selectedQuotationInternalId.trim() || undefined,
        quotationNumber: selectedQuotationInternalId.trim() || undefined,
        invoiceDate: invoiceDate.trim(),
        dueDate: dueDate.trim(),
        invoiceType,
        currency,
        status: determinedStatus,
        paymentStatus: activeInvoice.balanceDue <= 0 ? "paid" : activeInvoice.amountPaid > 0 ? "partially_paid" : "pending",
        garmentStyle: garmentStyle.trim() || undefined,
        styleName: styleName.trim() || undefined,
        description: description.trim() || styleName.trim() || "Commercial Billing Item",
        quantity: pricing.quantity,
        unitPrice: pricing.unitPrice,
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        freightCharges: pricing.freightCharges,
        tax: pricing.tax,
        grandTotal: pricing.grandTotal,
        amountPaid: pricing.amountPaid,
        balanceDue: pricing.balanceDue,
        paymentTerms: paymentTerms.trim(),
        incoterms: incoterms.trim() || undefined,
        buyerPoRef: buyerPoRef.trim() || undefined,
        notes: notes.trim() || undefined,
        updatedAt: nowIso,
        timeline: [
          ...(determinedStatus !== activeInvoice.status
            ? [
                {
                  id: "evt_" + Date.now(),
                  title: `Status Changed: ${STATUS_CONFIG[determinedStatus]?.label || determinedStatus}`,
                  description: `Invoice status updated to ${STATUS_CONFIG[determinedStatus]?.label || determinedStatus}.`,
                  timestamp: nowReadable,
                  type: "status_change" as const,
                  author: "Finance Lead",
                },
              ]
            : []),
          ...(activeInvoice.timeline || []),
        ],
      };

      const updated = invoices.map((i) => (i.id === editingInternalId ? invoiceToSave : i));
      saveInvoices(updated);
      success("Invoice Updated", {
        description: `Changes saved for invoice ${invoiceToSave.invoiceNumber} (${clientObj.companyName}).`,
      });
    } else {
      const newInternalId = "inv_" + Date.now();
      invoiceToSave = {
        id: newInternalId,
        invoiceNumber: invoiceNumber.trim(),
        clientId: clientObj.id,
        clientDisplayId: clientObj.clientId,
        clientName: clientObj.companyName,
        clientCountry: clientObj.country,
        clientContact: clientObj.primaryContact.name,
        clientEmail: clientObj.primaryContact.email,
        orderId: linkedOrder ? linkedOrder.id : undefined,
        orderNumber: linkedOrder ? linkedOrder.orderNumber : undefined,
        quotationId: selectedQuotationInternalId.trim() || undefined,
        quotationNumber: selectedQuotationInternalId.trim() || undefined,
        invoiceDate: invoiceDate.trim(),
        dueDate: dueDate.trim(),
        invoiceType,
        currency,
        status: determinedStatus,
        paymentStatus: "pending",
        garmentStyle: garmentStyle.trim() || undefined,
        styleName: styleName.trim() || undefined,
        description: description.trim() || styleName.trim() || "Commercial Billing Item",
        quantity: pricing.quantity,
        unitPrice: pricing.unitPrice,
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        freightCharges: pricing.freightCharges,
        tax: pricing.tax,
        grandTotal: pricing.grandTotal,
        amountPaid: 0,
        balanceDue: pricing.grandTotal,
        paymentTerms: paymentTerms.trim() || "Net 30 Days",
        incoterms: incoterms.trim() || undefined,
        buyerPoRef: buyerPoRef.trim() || undefined,
        notes: notes.trim() || undefined,
        payments: [],
        timeline: [
          {
            id: "evt_" + Date.now(),
            title: determinedStatus === "draft" ? "Invoice Draft Created" : "Commercial Invoice Issued",
            description: `${determinedStatus === "draft" ? "Draft billing saved" : "Commercial invoice issued"} for ${pricing.quantity.toLocaleString()} pcs @ ${CURRENCY_SYMBOLS[currency] || "$"}${pricing.unitPrice.toFixed(2)} (Total: ${CURRENCY_SYMBOLS[currency] || "$"}${pricing.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}).`,
            timestamp: nowReadable,
            type: determinedStatus === "draft" ? "created" : "issued",
            author: "Finance Lead",
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const updated = [invoiceToSave, ...invoices];
      saveInvoices(updated);
      createInvoiceInSupabase(invoiceToSave).catch((err) => console.error(err));
      success(determinedStatus === "draft" ? "Draft Invoice Saved" : "Invoice Issued", {
        description: `Successfully created invoice ${invoiceToSave.invoiceNumber} for ${clientObj.companyName}.`,
      });
    }

    if (editingInternalId && activeInvoice) {
      updateInvoiceInSupabase(invoiceToSave).catch((err) => console.error(err));
    }

    setSelectedInvoiceId(invoiceToSave.id);
    setViewMode("detail");
  };

  // Open Payment Recording Modal
  const handleOpenPaymentModal = () => {
    if (!activeInvoice) return;
    setPaymentAmountInput(String(activeInvoice.balanceDue));
    setPaymentDateInput(new Date().toISOString().split("T")[0]);
    setPaymentMethodInput("Bank Wire (TT)");
    setPaymentReferenceInput(`TT-${Math.floor(10000 + Math.random() * 90000)}`);
    setPaymentNotesInput("");
    setPaymentRecordedByInput("Finance Desk");
    setPaymentErrors({});
    setIsPaymentModalOpen(true);
  };

  // Submit Payment Record
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) return;

    const errors: Record<string, string> = {};
    const amt = parseFloat(paymentAmountInput);

    if (isNaN(amt) || !isFinite(amt) || amt <= 0) {
      errors.amount = "Payment amount must be greater than zero.";
    } else if (amt > activeInvoice.balanceDue + 0.001) {
      errors.amount = `Payment amount cannot exceed remaining balance due (${CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}${activeInvoice.balanceDue.toFixed(2)}).`;
    }

    if (!paymentDateInput.trim()) {
      errors.paymentDate = "Payment receipt date is required.";
    }

    if (!paymentReferenceInput.trim()) {
      errors.reference = "Bank wire or payment transaction reference is required.";
    }

    if (Object.keys(errors).length > 0) {
      setPaymentErrors(errors);
      return;
    }

    const res = recordInvoicePayment(activeInvoice, {
      amount: amt,
      paymentDate: paymentDateInput,
      paymentMethod: paymentMethodInput,
      referenceNumber: paymentReferenceInput,
      notes: paymentNotesInput,
      recordedBy: paymentRecordedByInput,
    });

    if (!res.success || !res.invoice) {
      toastError("Payment Failed", { description: res.error || "Could not record payment." });
      return;
    }

    const updatedInvoices = invoices.map((i) => (i.id === activeInvoice.id ? res.invoice! : i));
    saveInvoices(updatedInvoices);
    updateInvoiceInSupabase(res.invoice).catch((err) => console.error(err));

    success("Payment Recorded", {
      description: `Logged ${activeInvoice.currency} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} for ${activeInvoice.invoiceNumber}.`,
    });

    setIsPaymentModalOpen(false);
  };

  // Deletion / Archival Safety
  const handleRequestDelete = (inv: InvoiceRecord) => {
    if (hasInvoiceTransactionalLinks(inv)) {
      setArchiveModalInvoice(inv);
    } else {
      setInvoiceToDelete(inv);
    }
  };

  const handleConfirmPermanentDelete = () => {
    if (!invoiceToDelete) return;
    const updated = invoices.filter((i) => i.id !== invoiceToDelete.id);
    saveInvoices(updated);
    deleteInvoiceInSupabase(invoiceToDelete.id, invoiceToDelete.invoiceNumber).catch((err) => console.error(err));
    success("Invoice Removed", {
      description: `Invoice ${invoiceToDelete.invoiceNumber} was permanently deleted.`,
    });
    if (selectedInvoiceId === invoiceToDelete.id) {
      setSelectedInvoiceId(null);
      setViewMode("list");
    }
    setInvoiceToDelete(null);
  };

  const handleConfirmArchive = () => {
    if (!archiveModalInvoice) return;
    const updatedInvoice: InvoiceRecord = {
      ...archiveModalInvoice,
      status: "cancelled",
      isArchived: true,
      updatedAt: new Date().toISOString(),
    };
    const updated = invoices.map((i) => (i.id === archiveModalInvoice.id ? updatedInvoice : i));
    saveInvoices(updated);
    updateInvoiceInSupabase(updatedInvoice).catch((err) => console.error(err));
    success("Invoice Archived", {
      description: `Invoice ${archiveModalInvoice.invoiceNumber} archived. Historical accounting records preserved.`,
    });
    setArchiveModalInvoice(null);
  };

  // Dynamic KPI Computations
  const nonArchivedInvoices = invoices.filter((i) => !i.isArchived);
  const totalInvoicesCount = nonArchivedInvoices.length;
  const draftInvoicesCount = nonArchivedInvoices.filter((i) => i.status === "draft").length;
  const issuedOutstandingCount = nonArchivedInvoices.filter(
    (i) => i.status === "issued" || i.status === "overdue"
  ).length;
  const partiallyPaidCount = nonArchivedInvoices.filter((i) => i.status === "partially_paid").length;
  const paidCount = nonArchivedInvoices.filter((i) => i.status === "paid").length;
  const totalInvoicedValueSum = nonArchivedInvoices
    .filter((i) => i.status !== "draft" && i.status !== "cancelled")
    .reduce((sum, i) => sum + (i.grandTotal || 0), 0);
  const totalOutstandingSum = nonArchivedInvoices
    .filter((i) => i.status !== "draft" && i.status !== "cancelled")
    .reduce((sum, i) => sum + (i.balanceDue || 0), 0);

  // Search & Filter Pipeline
  const filteredInvoices = nonArchivedInvoices.filter((inv) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      inv.invoiceNumber.toLowerCase().includes(query) ||
      inv.clientName.toLowerCase().includes(query) ||
      inv.clientDisplayId.toLowerCase().includes(query) ||
      (inv.orderNumber && inv.orderNumber.toLowerCase().includes(query)) ||
      (inv.quotationNumber && inv.quotationNumber.toLowerCase().includes(query)) ||
      (inv.clientEmail && inv.clientEmail.toLowerCase().includes(query)) ||
      inv.clientCountry.toLowerCase().includes(query) ||
      (inv.buyerPoRef && inv.buyerPoRef.toLowerCase().includes(query)) ||
      inv.status.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesClient = clientFilter === "all" || inv.clientId === clientFilter;
    const matchesCurrency = currencyFilter === "all" || inv.currency === currencyFilter;
    const matchesType = typeFilter === "all" || inv.invoiceType === typeFilter;
    const matchesPayment = paymentStatusFilter === "all" || inv.paymentStatus === paymentStatusFilter;

    return matchesSearch && matchesStatus && matchesClient && matchesCurrency && matchesType && matchesPayment;
  });

  // Sorting
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (sortBy === "invoiceDate") {
      return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
    }
    if (sortBy === "dueDate") {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (sortBy === "highValue") {
      return (b.grandTotal || 0) - (a.grandTotal || 0);
    }
    if (sortBy === "lowValue") {
      return (a.grandTotal || 0) - (b.grandTotal || 0);
    }
    if (sortBy === "outstanding") {
      return (b.balanceDue || 0) - (a.balanceDue || 0);
    }
    if (sortBy === "clientName") {
      return a.clientName.localeCompare(b.clientName);
    }
    // recent
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pageSize = 10;
  const paginatedInvoices = sortedInvoices.slice((page - 1) * pageSize, page * pageSize);

  // Available confirmed orders for the current selected client
  const clientConfirmedOrders = React.useMemo(() => {
    if (!selectedClientInternalId) return [];
    return availableOrders.filter(
      (o) => (o.clientId === selectedClientInternalId || o.clientDisplayId === selectedClientInternalId) && o.orderStatus !== "draft"
    );
  }, [availableOrders, selectedClientInternalId]);

  return (
    <>
      <TopNav
        title={
          viewMode === "create"
            ? "Create Commercial Invoice"
            : viewMode === "edit"
            ? `Edit Invoice: ${invoiceNumber}`
            : viewMode === "detail"
            ? `Commercial Invoice: ${activeInvoice?.invoiceNumber || ""} (${activeInvoice?.clientName || ""})`
            : "Commercial Invoicing & Accounts Receivable"
        }
      />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* ============================================================
            VIEW 1: CREATE / EDIT INVOICE STUDIO
            ============================================================ */}
        {viewMode === "create" || viewMode === "edit" ? (
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewMode(selectedInvoiceId ? "detail" : "list")}
                  className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back to Invoices"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                      {editingInternalId ? `Edit Invoice: ${invoiceNumber}` : "Create Commercial Invoice"}
                    </h1>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {invoiceNumber}
                    </span>
                    <Badge variant={STATUS_CONFIG[status]?.variant || "default"} dot>
                      {STATUS_CONFIG[status]?.label || status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {invoiceType} • Due Date: {dueDate || "Not set"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setViewMode(selectedInvoiceId ? "detail" : "list")}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={(e) => handleSaveInvoice(e, "draft")}
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leftIcon={<Send className="h-4 w-4" />}
                  onClick={(e) => handleSaveInvoice(e, "issued")}
                >
                  {editingInternalId ? "Update & Issue Invoice" : "Issue Commercial Invoice"}
                </Button>
              </div>
            </div>

            {/* Form Canvas */}
            <form onSubmit={(e) => handleSaveInvoice(e, "issued")} className="space-y-6">
              {/* Section A: Customer & Relational Order Identification */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="A. Customer & Relational Order Identification"
                  description="System-generated invoice ID, customer account, confirmed order link, and billing dates."
                >
                  <FormField
                    label="Invoice Display ID"
                    description="Auto-generated unique invoice code (Read-only)"
                  >
                    <Input
                      value={invoiceNumber}
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

                  <FormField label="Confirmed Sales Order Reference">
                    <Select
                      value={selectedOrderInternalId}
                      onChange={(e) => handleOrderChange(e.target.value)}
                      options={[
                        { value: "", label: "-- Select Confirmed Order (Optional) --" },
                        ...clientConfirmedOrders.map((o) => ({
                          value: o.id,
                          label: `${o.orderNumber} — ${o.styleName} (${o.quantity.toLocaleString()} pcs)`,
                        })),
                      ]}
                    />
                  </FormField>

                  <FormField label="Commercial Quotation Link">
                    <Select
                      value={selectedQuotationInternalId}
                      onChange={(e) => setSelectedQuotationInternalId(e.target.value)}
                      options={[
                        { value: "", label: "-- Select Quotation (Optional) --" },
                        ...availableQuotations
                          .filter((q) => !selectedClientInternalId || q.clientId === selectedClientInternalId || q.clientDisplayId === selectedClientInternalId)
                          .map((q) => ({
                            value: q.quotationNumber,
                            label: `${q.quotationNumber} — ${q.styleName} (${q.quantity.toLocaleString()} pcs)`,
                          })),
                      ]}
                    />
                  </FormField>

                  <FormField label="Invoice Date" required error={formErrors.invoiceDate}>
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => {
                        setInvoiceDate(e.target.value);
                        if (formErrors.invoiceDate) setFormErrors((prev) => ({ ...prev, invoiceDate: "" }));
                      }}
                      error={!!formErrors.invoiceDate}
                    />
                  </FormField>

                  <FormField label="Payment Due Date" required error={formErrors.dueDate}>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        if (formErrors.dueDate) setFormErrors((prev) => ({ ...prev, dueDate: "" }));
                      }}
                      error={!!formErrors.dueDate}
                    />
                  </FormField>

                  <FormField label="Invoice Type" required>
                    <Select
                      value={invoiceType}
                      onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                      options={INVOICE_TYPES.map((t) => ({ value: t, label: t }))}
                    />
                  </FormField>

                  <FormField label="Commercial Currency" required>
                    <Select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CommercialCurrency)}
                      options={[
                        { value: "USD", label: "USD ($) — US Dollar" },
                        { value: "EUR", label: "EUR (€) — Euro" },
                        { value: "GBP", label: "GBP (£) — British Pound" },
                        { value: "PKR", label: "PKR (₨) — Pakistani Rupee" },
                        { value: "AED", label: "AED (AED) — UAE Dirham" },
                      ]}
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Section B: Billing Item Specifications */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="B. Billing Item Specifications"
                  description="Garment style description, batch delivery scope, and export billing line item."
                >
                  <FormField label="Garment Style Code">
                    <Input
                      value={garmentStyle}
                      onChange={(e) => setGarmentStyle(e.target.value)}
                      placeholder="e.g. HD-380 (Optional)"
                    />
                  </FormField>

                  <FormField label="Style Name">
                    <Input
                      value={styleName}
                      onChange={(e) => setStyleName(e.target.value)}
                      placeholder="e.g. HD-380 — 380 GSM Heavyweight Hoodie (Optional)"
                    />
                  </FormField>

                  <FormField label="Item Billing Description" required error={formErrors.description} className="col-span-2">
                    <Textarea
                      rows={2}
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (formErrors.description) setFormErrors((prev) => ({ ...prev, description: "" }));
                      }}
                      placeholder="Export commercial billing description for garment batch fulfillment..."
                      error={!!formErrors.description}
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Section C: Financial Calculation Breakdown */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="C. Financial Calculation Breakdown"
                  description="Billed quantity, agreed unit selling price, discounts, freight additions, and balance calculation."
                >
                  <FormField label="Billed Quantity (Pcs)" required error={formErrors.quantity}>
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

                  <FormField label="Unit Price" required error={formErrors.unitPrice}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitPrice}
                      onChange={(e) => {
                        setUnitPrice(e.target.value);
                        if (formErrors.unitPrice) setFormErrors((prev) => ({ ...prev, unitPrice: "" }));
                      }}
                      prefix={CURRENCY_SYMBOLS[currency] || "$"}
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
                      prefix={CURRENCY_SYMBOLS[currency] || "$"}
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
                      prefix={CURRENCY_SYMBOLS[currency] || "$"}
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
                      prefix={CURRENCY_SYMBOLS[currency] || "$"}
                      placeholder="0.00"
                    />
                  </FormField>

                  {/* Real-time Commercial Total Display */}
                  <div className="col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[11px] font-medium text-slate-500">Subtotal:</span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {CURRENCY_SYMBOLS[currency] || "$"}{calculatedPricing.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-500">Discount:</span>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">
                        -{CURRENCY_SYMBOLS[currency] || "$"}{calculatedPricing.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-blue-700 uppercase">Grand Invoice Total:</span>
                      <p className="text-base font-extrabold text-blue-700 mt-0.5">
                        {CURRENCY_SYMBOLS[currency] || "$"}{calculatedPricing.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-amber-700 uppercase">Balance Due:</span>
                      <p className="text-base font-extrabold text-amber-700 mt-0.5">
                        {CURRENCY_SYMBOLS[currency] || "$"}{calculatedPricing.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </FormSection>
              </Card>

              {/* Section D: Commercial & Settlement Terms */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="D. Commercial Settlement Terms & Notes"
                  description="Payment settlement terms, international Incoterms, and buyer remarks."
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

                  <FormField label="Incoterms">
                    <Select
                      value={incoterms}
                      onChange={(e) => setIncoterms(e.target.value)}
                      options={[
                        { value: "", label: "-- Select Incoterms (Optional) --" },
                        { value: "FOB Sialkot", label: "FOB Sialkot / Lahore" },
                        { value: "FOB Karachi Port", label: "FOB Karachi Port" },
                        { value: "CIF London", label: "CIF Destination Port" },
                        { value: "CIF Gothenburg", label: "CIF Gothenburg" },
                        { value: "DDP Warehouse", label: "DDP Buyer Warehouse" },
                        { value: "EXW Factory", label: "EXW Factory" },
                      ]}
                    />
                  </FormField>

                  <FormField label="Buyer PO / RfQ Reference">
                    <Input
                      value={buyerPoRef}
                      onChange={(e) => setBuyerPoRef(e.target.value)}
                      placeholder="e.g. PO-UK-88219 (Optional)"
                    />
                  </FormField>

                  <FormField label="Accounting & Payment Notes" className="col-span-2">
                    <Textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special payment routing instructions, bank IBAN/SWIFT codes, L/C advice notes..."
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
                  onClick={() => setViewMode(selectedInvoiceId ? "detail" : "list")}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={(e) => handleSaveInvoice(e, "draft")}
                >
                  Save Draft
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  leftIcon={<Send className="h-4 w-4" />}
                >
                  {editingInternalId ? "Update & Issue Invoice" : "Issue Commercial Invoice"}
                </Button>
              </div>
            </form>
          </div>
        ) : viewMode === "detail" && activeInvoice ? (
          /* ============================================================
             VIEW 2: COMMERCIAL INVOICE DETAIL VIEW (7 SUB-TABS)
             ============================================================ */
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Detail Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back to Invoices List"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                      {activeInvoice.invoiceNumber}
                    </h1>
                    <span className="text-sm font-semibold text-slate-700 truncate">
                      • {activeInvoice.clientName}
                    </span>
                    <Badge variant={STATUS_CONFIG[activeInvoice.status]?.variant || "default"} dot>
                      {STATUS_CONFIG[activeInvoice.status]?.label || activeInvoice.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Receipt className="h-3.5 w-3.5 text-slate-400" />
                      {activeInvoice.description}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-blue-700 font-bold">
                      {CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}{activeInvoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      {activeInvoice.clientCountry}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
                {/* Record Payment Button */}
                {activeInvoice.balanceDue > 0 && activeInvoice.status !== "cancelled" && (
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<DollarSign className="h-4 w-4" />}
                    onClick={handleOpenPaymentModal}
                  >
                    Record Payment
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Copy className="h-4 w-4" />}
                  onClick={() => handleDuplicateInvoice(activeInvoice)}
                >
                  Duplicate
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  leftIcon={<Edit className="h-4 w-4" />}
                  onClick={() => handleOpenEdit(activeInvoice)}
                >
                  Edit Invoice
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  leftIcon={<Printer className="h-4 w-4" />}
                  onClick={() => {
                    if (typeof window !== "undefined") window.print();
                  }}
                >
                  Print
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => handleRequestDelete(activeInvoice)}
                >
                  Delete / Archive
                </Button>
              </div>
            </div>

            {/* Top 5 Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Invoice Total</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                  {CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}{activeInvoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{activeInvoice.quantity.toLocaleString()} Pcs billed</p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount Paid</span>
                <p className="text-lg font-bold text-emerald-700 mt-0.5 truncate">
                  {CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}{activeInvoice.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  {activeInvoice.grandTotal > 0
                    ? `${Math.round((activeInvoice.amountPaid / activeInvoice.grandTotal) * 100)}% settled`
                    : "0% settled"}
                </p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Balance Due</span>
                <p className={`text-lg font-bold mt-0.5 truncate ${activeInvoice.balanceDue > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  {CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}{activeInvoice.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className={`text-[11px] mt-0.5 ${activeInvoice.balanceDue > 0 ? "text-amber-600" : "text-emerald-600 font-medium"}`}>
                  {activeInvoice.balanceDue > 0 ? "Open receivable" : "Fully settled (No balance)"}
                </p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Payment Due Date</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{activeInvoice.dueDate || "—"}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Issued: {activeInvoice.invoiceDate}</p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Payment Status</span>
                <div className="mt-1">
                  <Badge variant={PAYMENT_STATUS_CONFIG[activeInvoice.paymentStatus]?.variant || "default"} dot>
                    {PAYMENT_STATUS_CONFIG[activeInvoice.paymentStatus]?.label || activeInvoice.paymentStatus}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {activeInvoice.payments?.length || 0} payment receipts
                </p>
              </Card>
            </div>

            {/* Profile Sub-Tabs Navigation */}
            <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
              {[
                { id: "overview", label: "Overview & Billing", icon: Building2 },
                { id: "order", label: "Order & Commercial", icon: Layers },
                { id: "breakdown", label: "Invoice Breakdown", icon: Receipt },
                { id: "payments", label: `Payments & Settlement (${activeInvoice.payments?.length || 0})`, icon: CreditCard },
                { id: "client", label: "Client & Buyer", icon: Building2 },
                { id: "shipping", label: "Shipping & Logistics", icon: Truck },
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

            {/* Tab 1: Overview & Billing */}
            {detailTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Commercial Billing Identification
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Customer / Buyer</span>
                      <p className="font-bold text-slate-900 mt-0.5">{activeInvoice.clientName}</p>
                      <span className="text-[10px] text-blue-600 font-mono">{activeInvoice.clientDisplayId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Market / Country</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeInvoice.clientCountry}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Invoice Date</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeInvoice.invoiceDate}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Payment Due Date</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeInvoice.dueDate || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-medium">Payment Settlement Terms</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeInvoice.paymentTerms}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Incoterms</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeInvoice.incoterms || "—"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Buyer PO Reference</span>
                      <p className="font-mono text-slate-900 font-bold mt-0.5">{activeInvoice.buyerPoRef || "—"}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Accounts Receivable Balance Summary
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross Invoiced Total:</span>
                      <span className="font-bold text-slate-900">
                        {CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}{activeInvoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Settled / Paid:</span>
                      <span className="font-bold text-emerald-700">
                        {CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}{activeInvoice.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="font-bold text-slate-900">Outstanding Balance:</span>
                      <span className="text-base font-extrabold text-amber-700">
                        {CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}{activeInvoice.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {activeInvoice.notes && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs mt-3">
                      <span className="font-bold text-slate-700">Payment Routing Notes:</span>
                      <p className="text-slate-600 mt-1">{activeInvoice.notes}</p>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Tab 2: Order & Commercial */}
            {detailTab === "order" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Linked Commercial Sales Order & Quotation
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Linked Sales Order:</span>
                    {activeInvoice.orderNumber ? (
                      <a href="/orders" className="font-mono font-bold text-purple-700 hover:underline block mt-0.5">
                        {activeInvoice.orderNumber}
                      </a>
                    ) : (
                      <p className="text-slate-500 italic mt-0.5">Not Linked</p>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400">Linked Quotation:</span>
                    {activeInvoice.quotationNumber ? (
                      <a href="/quotations" className="font-mono font-bold text-blue-700 hover:underline block mt-0.5">
                        {activeInvoice.quotationNumber}
                      </a>
                    ) : (
                      <p className="text-slate-500 italic mt-0.5">Not Linked</p>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400">Garment Style:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{activeInvoice.garmentStyle || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Billed Quantity:</span>
                    <p className="font-bold text-slate-900 mt-0.5">{activeInvoice.quantity.toLocaleString()} Pcs</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-200 text-xs flex justify-between items-center">
                  <span>Cross-module link to source Sales Order contract.</span>
                  <a href="/orders" className="font-semibold text-indigo-700 hover:underline flex items-center gap-1">
                    Open Sales Orders <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Card>
            )}

            {/* Tab 3: Invoice Breakdown */}
            {detailTab === "breakdown" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Receipt className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Itemized Commercial Invoice Breakdown
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                        <th className="py-2.5 px-3 text-right">Discount</th>
                        <th className="py-2.5 px-3 text-right">Freight & Charges</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{activeInvoice.description}</div>
                          {activeInvoice.styleName && (
                            <span className="text-[10px] text-slate-500 font-mono">{activeInvoice.styleName}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {activeInvoice.quantity.toLocaleString()} Pcs
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          {CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}{activeInvoice.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}{activeInvoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          -{CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}{activeInvoice.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          +{CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}{(activeInvoice.freightCharges + activeInvoice.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-blue-700 text-sm">
                          {CURRENCY_SYMBOLS[activeInvoice.currency] || "$"}{activeInvoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Tab 4: Payments & Settlement */}
            {detailTab === "payments" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Payment Receipts & Bank Wire Reconciliation
                    </h3>
                  </div>

                  {activeInvoice.balanceDue > 0 && activeInvoice.status !== "cancelled" && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      onClick={handleOpenPaymentModal}
                    >
                      Record Payment
                    </Button>
                  )}
                </div>

                {!activeInvoice.payments || activeInvoice.payments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No payment receipts recorded yet for this invoice. Click &quot;Record Payment&quot; above to log an incoming wire deposit or TT.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3">Transaction Reference</th>
                          <th className="py-2.5 px-3 text-right">Amount Received</th>
                          <th className="py-2.5 px-3">Recorded By</th>
                          <th className="py-2.5 px-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeInvoice.payments.map((p) => (
                          <tr key={p.paymentId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-slate-700 font-medium">{p.paymentDate}</td>
                            <td className="py-2.5 px-3 text-slate-900 font-semibold">{p.paymentMethod}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{p.referenceNumber}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700 text-sm">
                              {CURRENCY_SYMBOLS[p.currency] || "$"}{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{p.recordedBy}</td>
                            <td className="py-2.5 px-3 text-slate-500">{p.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {/* Tab 5: Client & Buyer */}
            {detailTab === "client" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Buyer Account & CRM Profile
                    </h3>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                    {activeInvoice.clientDisplayId}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Company Name:</span>
                    <p className="font-bold text-slate-900 mt-0.5">{activeInvoice.clientName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Destination Market:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{activeInvoice.clientCountry}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Primary Contact Person:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{activeInvoice.clientContact || "—"}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                  <span>View comprehensive client orders, quotation proposals, and accounting history.</span>
                  <a href="/clients" className="font-semibold text-blue-700 hover:underline flex items-center gap-1">
                    Open Clients CRM <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Card>
            )}

            {/* Tab 6: Shipping & Logistics */}
            {detailTab === "shipping" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Truck className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Export Logistics & Dispatch Verification
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Incoterms:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{activeInvoice.incoterms || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Payment Terms:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{activeInvoice.paymentTerms}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Buyer PO Reference:</span>
                    <p className="font-mono text-slate-900 font-bold mt-0.5">{activeInvoice.buyerPoRef || "—"}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-200 text-xs flex justify-between items-center">
                  <span>Monitor export logistics status via FactoryOS Tracking Engine.</span>
                  <a href="/tracking" className="font-semibold text-indigo-700 hover:underline flex items-center gap-1">
                    Open Tracking Module <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Card>
            )}

            {/* Tab 7: Activity Timeline */}
            {detailTab === "timeline" && (
              <Card className="p-5 border-slate-200/80 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
                  Commercial Invoicing Event & Audit Timeline
                </h3>
                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {!activeInvoice.timeline || activeInvoice.timeline.length === 0 ? (
                    <p className="text-xs text-slate-400 pl-8">No recorded activity yet.</p>
                  ) : (
                    activeInvoice.timeline.map((evt) => (
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
             VIEW 3: COMMERCIAL INVOICES DASHBOARD & MAIN DATA TABLE
             ============================================================ */
          <div className="space-y-6 min-w-0 w-full">
            {/* Page Header */}
            <PageHeader
              title="Commercial Invoices & Accounts Receivable"
              description="Manage customer invoices, billing milestones, payment collection, balances, and accounts receivable."
              actions={
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={<RefreshCw className={`h-4 w-4 ${loadingInvoices ? "animate-spin" : ""}`} />}
                    onClick={() => loadInvoices(true)}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => handleOpenCreate()}
                  >
                    Create Invoice
                  </Button>
                </div>
              }
            />

            {/* 7 Dynamic KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <Card className="p-3 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Invoices</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{totalInvoicesCount}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Billed contracts</p>
              </Card>

              <Card className="p-3 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Drafts</span>
                <p className="text-lg font-bold text-slate-700 mt-0.5">{draftInvoicesCount}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Unissued drafts</p>
              </Card>

              <Card className="p-3 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Issued / Open</span>
                <p className="text-lg font-bold text-amber-600 mt-0.5">{issuedOutstandingCount}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Awaiting deposit</p>
              </Card>

              <Card className="p-3 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Partially Paid</span>
                <p className="text-lg font-bold text-blue-600 mt-0.5">{partiallyPaidCount}</p>
                <p className="text-[10px] text-blue-600 mt-0.5">In settlement</p>
              </Card>

              <Card className="p-3 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fully Paid</span>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">{paidCount}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">100% settled</p>
              </Card>

              <Card className="p-3 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
                <p className="text-lg font-bold text-purple-700 mt-0.5 truncate">
                  ${(totalInvoicedValueSum / 1000).toFixed(1)}k
                </p>
                <p className="text-[10px] text-purple-600 mt-0.5">Billed revenue</p>
              </Card>

              <Card className="p-3 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding</span>
                <p className="text-lg font-bold text-rose-600 mt-0.5 truncate">
                  ${(totalOutstandingSum / 1000).toFixed(1)}k
                </p>
                <p className="text-[10px] text-rose-500 mt-0.5">Open receivables</p>
              </Card>
            </div>

            {/* Search & Multi-Filters Toolbar */}
            <Card noPadding className="p-3.5 sm:p-4 bg-[var(--color-erp-surface)] border-[var(--color-erp-border)] shadow-xs">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 min-w-0">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-erp-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search by invoice # (INV-2026-001), order #, buyer, email, PO ref..."
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
                    <option value="issued">Issued / Open</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Fully Settled</option>
                    <option value="overdue">Overdue</option>
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
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="PKR">PKR (₨)</option>
                    <option value="AED">AED (AED)</option>
                  </select>

                  {/* Payment Status */}
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => {
                      setPaymentStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Payments</option>
                    <option value="pending">Unpaid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Fully Settled</option>
                    <option value="overdue">Overdue</option>
                  </select>

                  {/* Sorting */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-2.5 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="recent">Sort: Recently Added</option>
                    <option value="invoiceDate">Sort: Invoice Date</option>
                    <option value="dueDate">Sort: Due Date</option>
                    <option value="highValue">Sort: Highest Value</option>
                    <option value="lowValue">Sort: Lowest Value</option>
                    <option value="outstanding">Sort: Outstanding Balance</option>
                    <option value="clientName">Sort: Client Name (A-Z)</option>
                  </select>

                  {(searchQuery ||
                    statusFilter !== "all" ||
                    clientFilter !== "all" ||
                    currencyFilter !== "all" ||
                    typeFilter !== "all" ||
                    paymentStatusFilter !== "all" ||
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
                        setPaymentStatusFilter("all");
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

            {/* Main Invoices Table */}
            <Card noPadding className="border-[var(--color-erp-border)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-xs text-left min-w-[1200px]">
                  <thead className="bg-[var(--color-erp-surface-2)] text-[var(--color-erp-text-muted)] font-semibold border-b border-[var(--color-erp-border)] uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">INVOICE #</th>
                      <th className="py-3 px-4">BUYER / CLIENT</th>
                      <th className="py-3 px-4">ORDER REF #</th>
                      <th className="py-3 px-4">ISSUE DATE</th>
                      <th className="py-3 px-4">DUE DATE</th>
                      <th className="py-3 px-4 text-right">TOTAL AMOUNT</th>
                      <th className="py-3 px-4 text-right">AMOUNT PAID</th>
                      <th className="py-3 px-4 text-right">BALANCE DUE</th>
                      <th className="py-3 px-4 text-center">PAYMENT</th>
                      <th className="py-3 px-4 text-center">STATUS</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-erp-border)]">
                    {paginatedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-0">
                          <EmptyState
                            icon={<Receipt className="h-6 w-6 text-blue-600" />}
                            title="No commercial invoices found"
                            description={
                              searchQuery || statusFilter !== "all" || clientFilter !== "all"
                                ? "No invoices match your search filters. Click Reset to clear filters."
                                : "Create commercial export invoices upon order fulfillment to track customer payments and receivables."
                            }
                            actionLabel="Create Invoice"
                            actionIcon={<Plus className="h-4 w-4" />}
                            onAction={() => handleOpenCreate()}
                          />
                        </td>
                      </tr>
                    ) : (
                      paginatedInvoices.map((inv) => {
                        const statusConfig = STATUS_CONFIG[inv.status] || {
                          label: inv.status,
                          variant: "default",
                        };
                        const payConfig = PAYMENT_STATUS_CONFIG[inv.paymentStatus] || {
                          label: inv.paymentStatus,
                          variant: "default",
                        };

                        return (
                          <tr
                            key={inv.id}
                            className="hover:bg-[var(--color-erp-surface-2)]/50 transition-colors"
                          >
                            {/* Invoice # */}
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(inv)}
                                className="hover:underline cursor-pointer text-left"
                                title="View full invoice profile"
                              >
                                {inv.invoiceNumber}
                              </button>
                            </td>

                            {/* Client / Brand */}
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{inv.clientName}</div>
                              <span className="text-[10px] text-slate-400">{inv.clientCountry}</span>
                            </td>

                            {/* Order Ref */}
                            <td className="py-3 px-4 font-mono text-purple-700 font-bold">
                              {inv.orderNumber ? (
                                <a href="/orders" className="hover:underline">
                                  {inv.orderNumber}
                                </a>
                              ) : (
                                <span className="text-slate-400 text-[11px] font-normal italic">Direct Billing</span>
                              )}
                            </td>

                            {/* Issue Date */}
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {inv.invoiceDate}
                            </td>

                            {/* Due Date */}
                            <td className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">
                              {inv.dueDate || "—"}
                            </td>

                            {/* Total Amount */}
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              {CURRENCY_SYMBOLS[inv.currency] || "$"}{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            {/* Amount Paid */}
                            <td className="py-3 px-4 text-right font-bold text-emerald-700">
                              {CURRENCY_SYMBOLS[inv.currency] || "$"}{inv.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            {/* Balance Due */}
                            <td className="py-3 px-4 text-right font-extrabold text-amber-700">
                              {CURRENCY_SYMBOLS[inv.currency] || "$"}{inv.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            {/* Payment Status */}
                            <td className="py-3 px-4 text-center">
                              <Badge variant={payConfig.variant} dot>
                                {payConfig.label}
                              </Badge>
                            </td>

                            {/* Invoice Status */}
                            <td className="py-3 px-4 text-center">
                              <Badge variant={statusConfig.variant}>
                                {statusConfig.label}
                              </Badge>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetail(inv)}
                                  title="View invoice profile"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {inv.balanceDue > 0 && inv.status !== "cancelled" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => {
                                      setSelectedInvoiceId(inv.id);
                                      handleOpenPaymentModal();
                                    }}
                                    title="Record payment"
                                  >
                                    <DollarSign className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(inv)}
                                  title="Edit invoice"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicateInvoice(inv)}
                                  title="Duplicate invoice"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => handleRequestDelete(inv)}
                                  className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete / Archive invoice"
                                  aria-label={`Delete ${inv.invoiceNumber}`}
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
                total={sortedInvoices.length}
                onPageChange={setPage}
              />
            </Card>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment Receipt — ${activeInvoice?.invoiceNumber || ""}`}
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex justify-between items-center">
            <span>
              Outstanding Balance Due:{" "}
              <strong>
                {CURRENCY_SYMBOLS[activeInvoice?.currency || "USD"] || "$"}{activeInvoice?.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </span>
            <span className="font-bold text-blue-700">{activeInvoice?.clientName}</span>
          </div>

          <FormField label="Payment Amount" required error={paymentErrors.amount}>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={activeInvoice?.balanceDue}
              value={paymentAmountInput}
              onChange={(e) => setPaymentAmountInput(e.target.value)}
              prefix={CURRENCY_SYMBOLS[activeInvoice?.currency || "USD"] || "$"}
              placeholder="Enter amount received"
              error={!!paymentErrors.amount}
            />
          </FormField>

          <FormField label="Payment Receipt Date" required error={paymentErrors.paymentDate}>
            <Input
              type="date"
              value={paymentDateInput}
              onChange={(e) => setPaymentDateInput(e.target.value)}
              error={!!paymentErrors.paymentDate}
            />
          </FormField>

          <FormField label="Payment Method" required>
            <Select
              value={paymentMethodInput}
              onChange={(e) => setPaymentMethodInput(e.target.value)}
              options={[
                { value: "Bank Wire (TT)", label: "Direct Bank Wire (Telegraphic Transfer — TT)" },
                { value: "Letter of Credit (LC)", label: "Commercial Letter of Credit (LC at Sight)" },
                { value: "Online Transfer", label: "SWIFT / International ACH Wire" },
                { value: "Company Cheque", label: "Company Crossed Cheque" },
                { value: "Credit Card", label: "Corporate Credit Card" },
              ]}
            />
          </FormField>

          <FormField label="Bank Wire / Reference #" required error={paymentErrors.reference}>
            <Input
              value={paymentReferenceInput}
              onChange={(e) => setPaymentReferenceInput(e.target.value)}
              placeholder="e.g. TT-88219-FINAL"
              error={!!paymentErrors.reference}
            />
          </FormField>

          <FormField label="Recorded By Officer">
            <Input
              value={paymentRecordedByInput}
              onChange={(e) => setPaymentRecordedByInput(e.target.value)}
              placeholder="e.g. Finance Officer"
            />
          </FormField>

          <FormField label="Payment Remarks / Bank Advice">
            <Textarea
              rows={2}
              value={paymentNotesInput}
              onChange={(e) => setPaymentNotesInput(e.target.value)}
              placeholder="Bank confirmation notes, swift transaction details..."
            />
          </FormField>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" leftIcon={<DollarSign className="h-4 w-4" />}>
              Save Payment Receipt
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Safety Alert Modal: Invoice has Linked Records -> Archive Instead */}
      <Modal
        isOpen={!!archiveModalInvoice}
        onClose={() => setArchiveModalInvoice(null)}
        title="Archive Commercial Invoice"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Financial History Protection:</strong>
              <p className="mt-1 text-amber-800">
                Invoice <strong>{archiveModalInvoice?.invoiceNumber} ({archiveModalInvoice?.clientName})</strong> has recorded financial or contract history (
                {archiveModalInvoice?.payments?.length ? `${archiveModalInvoice.payments.length} payment receipts, ` : ""}
                {archiveModalInvoice?.orderNumber ? `Sales Order: ${archiveModalInvoice.orderNumber}, ` : ""}
                Total Paid: {CURRENCY_SYMBOLS[archiveModalInvoice?.currency || "USD"] || "$"}{archiveModalInvoice?.amountPaid.toFixed(2)}
                ).
              </p>
              <p className="mt-1.5 text-amber-800 font-medium">
                To maintain statutory tax compliance and accounts receivable audit integrity, this invoice cannot be permanently deleted. Archive the invoice instead to mark it cancelled while preserving all transaction records.
              </p>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setArchiveModalInvoice(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Archive className="h-4 w-4" />}
              onClick={handleConfirmArchive}
            >
              Archive Invoice
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Confirmation Dialog: Permanent Delete */}
      <ConfirmDialog
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={handleConfirmPermanentDelete}
        title={`Permanently Delete Invoice ${invoiceToDelete?.invoiceNumber || ""}?`}
        description={`Are you sure you want to delete invoice ${invoiceToDelete?.invoiceNumber} (${invoiceToDelete?.description})? This draft invoice has no recorded payment deposits or accounting dependencies and will be permanently removed.`}
        confirmLabel="Delete Invoice"
        cancelLabel="Keep Invoice"
        destructive
      />
    </>
  );
}

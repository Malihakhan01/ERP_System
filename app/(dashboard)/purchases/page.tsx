"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard, CardGrid, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState, Pagination } from "@/components/ui/Misc";
import { FormField, FormSection } from "@/components/forms/FormField";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  ShoppingCart,
  Plus,
  Search,
  DollarSign,
  CheckCircle2,
  Truck,
  Clock,
  RotateCcw,
  Trash2,
  ArrowLeft,
  Save,
  Sparkles,
  RefreshCw,
} from "lucide-react";

import {
  getPurchasesFromSupabase,
  createPurchaseInSupabase,
  updatePurchaseInSupabase,
  deletePurchaseInSupabase,
  PurchaseOrder,
  PURCHASES_STORAGE_KEY as STORAGE_KEY,
} from "@/lib/services/purchases-service";

export type { PurchaseOrder };

const PAYMENT_TERMS_OPTIONS = [
  { value: "adv_50", label: "50% Advance / 50% on Delivery (Standard)" },
  { value: "net_30", label: "Net 30 Days Credit" },
  { value: "cod", label: "Cash on Delivery (COD)" },
  { value: "full_advance", label: "100% Full Advance Payment" },
];

const PAYMENT_TERMS_LABEL_MAP: Record<string, string> = {
  adv_50: "50% Adv / 50% Del",
  net_30: "Net 30 Days",
  cod: "Cash on Delivery",
  full_advance: "100% Advance",
};

const UNIT_OPTIONS = [
  { value: "KG", label: "Kilograms (KG)" },
  { value: "Meters", label: "Meters (M)" },
  { value: "Pcs", label: "Pieces (Pcs)" },
  { value: "Gross", label: "Gross (144 Pcs)" },
  { value: "Rolls", label: "Rolls" },
];

const emptyOrdersArray: PurchaseOrder[] = [];

export default function PurchasesPage() {
  const { success, error: toastError } = useToast();

  // Mode: "list" | "create"
  const [viewMode, setViewMode] = React.useState<"list" | "create">("list");

  // Hydration-safe localStorage synchronization
  const getSnapshot = React.useCallback(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) || "[]" : "[]";
    } catch {
      return "[]";
    }
  }, []);

  const getServerSnapshot = React.useCallback(() => "[]", []);

  const subscribe = React.useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }, []);

  const rawJson = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [localOverride, setLocalOverride] = React.useState<PurchaseOrder[] | null>(null);
  const [loadingPurchases, setLoadingPurchases] = React.useState(false);

  const loadPurchases = React.useCallback(async (showToast = false) => {
    setLoadingPurchases(true);
    try {
      const data = await getPurchasesFromSupabase();
      if (data && data.length > 0) {
        setLocalOverride(data);
      }
      if (showToast) {
        success("Purchase Orders Refreshed", { description: "Loaded live material procurement orders from MySQL." });
      }
    } catch (err: any) {
      console.error("Failed to load purchases:", err);
      if (showToast) {
        toastError("Failed to Refresh Purchases", { description: err.message });
      }
    } finally {
      setLoadingPurchases(false);
    }
  }, [success, toastError]);

  // Sync on mount
  React.useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const purchaseOrders = React.useMemo(() => {
    if (localOverride !== null) return localOverride;
    try {
      return JSON.parse(rawJson) as PurchaseOrder[];
    } catch {
      return emptyOrdersArray;
    }
  }, [rawJson, localOverride]);

  // Helper to persist purchase orders list
  const saveOrdersList = (newOrders: PurchaseOrder[]) => {
    setLocalOverride(newOrders);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore
    }
  };

  // Filter & pagination state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  // Delete dialog state
  const [orderToDelete, setOrderToDelete] = React.useState<PurchaseOrder | null>(null);

  // Form input state
  const [poNumber, setPoNumber] = React.useState("");
  const [supplier, setSupplier] = React.useState("");
  const [orderDate, setOrderDate] = React.useState("");
  const [expectedDate, setExpectedDate] = React.useState("");
  const [material, setMaterial] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [unit, setUnit] = React.useState("KG");
  const [rate, setRate] = React.useState("");
  const [paymentTerms, setPaymentTerms] = React.useState<"adv_50" | "net_30" | "cod" | "full_advance">("adv_50");

  // In-form validation errors
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Reset form completely for a clean new session
  const resetFormState = () => {
    setPoNumber("");
    setSupplier("");
    setOrderDate("");
    setExpectedDate("");
    setMaterial("");
    setQuantity("");
    setUnit("KG");
    setRate("");
    setPaymentTerms("adv_50");
    setFormErrors({});
  };

  const handleOpenCreateForm = () => {
    resetFormState();
    setViewMode("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelCreate = () => {
    resetFormState();
    setViewMode("list");
  };

  // Calculate live financial estimates for preview
  const parsedQty = parseFloat(quantity) || 0;
  const parsedRate = parseFloat(rate) || 0;
  const calculatedTotal = parsedQty * parsedRate;

  let calculatedPaid = 0;
  if (paymentTerms === "adv_50") {
    calculatedPaid = calculatedTotal * 0.5;
  } else if (paymentTerms === "full_advance") {
    calculatedPaid = calculatedTotal;
  } else {
    calculatedPaid = 0; // net_30 or cod
  }
  const calculatedBalance = Math.max(0, calculatedTotal - calculatedPaid);

  // Form submission with strict validation
  const handleSavePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!poNumber.trim()) {
      errors.poNumber = "PO Identifier / Reference # is required.";
    } else if (purchaseOrders.some((po) => po.poNumber.toLowerCase() === poNumber.trim().toLowerCase())) {
      errors.poNumber = "This PO Number already exists. Please enter a unique PO reference.";
    }

    if (!supplier.trim()) {
      errors.supplier = "Supplier or textile mill name is required.";
    }

    if (!orderDate.trim()) {
      errors.orderDate = "Order issue date is required.";
    }

    if (!expectedDate.trim()) {
      errors.expectedDate = "Expected delivery date is required.";
    }

    if (!material.trim()) {
      errors.material = "Ordered material description is required.";
    }

    if (!quantity.trim() || parsedQty <= 0) {
      errors.quantity = "Please enter a valid positive quantity (e.g. 750).";
    }

    if (!rate.trim() || parsedRate <= 0) {
      errors.rate = "Please enter a valid positive unit rate in PKR (e.g. 1850).";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toastError("Please resolve the errors highlighted in the form before saving.");
      return;
    }

    const newOrder: PurchaseOrder = {
      id: "po_" + Date.now(),
      poNumber: poNumber.trim().toUpperCase(),
      supplier: supplier.trim(),
      orderDate: orderDate.trim(),
      expectedDate: expectedDate.trim(),
      material: material.trim(),
      quantity: quantity.trim(),
      unit,
      rate: rate.trim(),
      totalAmount: calculatedTotal,
      paidAmount: calculatedPaid,
      balance: calculatedBalance,
      paymentTerms,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };

    const updated = [newOrder, ...purchaseOrders];
    saveOrdersList(updated);
    createPurchaseInSupabase(newOrder).catch((err) => console.error(err));

    success("Purchase order created successfully", {
      description: `${newOrder.poNumber} has been added to purchase orders.`,
    });

    resetFormState();
    setViewMode("list");
  };

  const handleConfirmDelete = () => {
    if (!orderToDelete) return;
    const updated = purchaseOrders.filter((po) => po.id !== orderToDelete.id);
    saveOrdersList(updated);
    deletePurchaseInSupabase(orderToDelete.id, orderToDelete.poNumber).catch((err) => console.error(err));
    success("Purchase order deleted", {
      description: `${orderToDelete.poNumber} was removed from purchase orders.`,
    });
    setOrderToDelete(null);
  };

  const handleMarkAsReceived = (poId: string) => {
    const targetPo = purchaseOrders.find((p) => p.id === poId);
    const updated = purchaseOrders.map((po) =>
      po.id === poId ? { ...po, status: "received" as const } : po
    );
    saveOrdersList(updated);
    if (targetPo) {
      updatePurchaseInSupabase({ ...targetPo, status: "received" }).catch((err) => console.error(err));
    }
    success("Goods Receipt (GRN) logged", {
      description: "Purchase order marked as Fully Received in warehouse.",
    });
  };

  // Filtered orders list
  const filteredOrders = purchaseOrders.filter((po) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.material.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || po.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate dynamic KPI metrics
  const totalPurchaseValue = purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
  const openOrdersCount = purchaseOrders.filter((po) => po.status !== "received").length;
  const grnReceivedCount = purchaseOrders.filter((po) => po.status === "received").length;
  const totalOutstandingBalance = purchaseOrders.reduce((sum, po) => sum + (po.balance || 0), 0);

  return (
    <>
      <TopNav
        title={
          viewMode === "create"
            ? "Create Purchase Order"
            : "Procurement & Purchase Orders (PO)"
        }
      />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* ============================================================
            VIEW 1: FULL-CANVAS CREATE PURCHASE ORDER STUDIO
            ============================================================ */}
        {viewMode === "create" ? (
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Header & Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back to Purchase Orders"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                      Create Sourcing Purchase Order (PO)
                    </h1>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Procurement Contract
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Issue commercial purchase orders to yarn mills, fabric dyehouses, and trim vendors.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                <Button variant="secondary" size="md" onClick={handleCancelCreate}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={handleSavePurchaseOrder}
                >
                  Issue Purchase Order
                </Button>
              </div>
            </div>

            {/* Form Canvas (Spacious Two-Column Grid on Desktop) */}
            <form onSubmit={handleSavePurchaseOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
              {/* Left Column: Form Sections (8 cols) */}
              <div className="lg:col-span-8 space-y-6 min-w-0">
                {/* 1. Supplier & Dates */}
                <Card>
                  <FormSection
                    title="1. Supplier Details & Delivery Schedule"
                    description="Textile mill vendor information and delivery milestones"
                  >
                    <FormField
                      label="PO Identifier #"
                      required
                      error={formErrors.poNumber}
                    >
                      <Input
                        value={poNumber}
                        onChange={(e) => {
                          setPoNumber(e.target.value);
                          if (formErrors.poNumber) setFormErrors((p) => ({ ...p, poNumber: "" }));
                        }}
                        placeholder="e.g. PO-2026-001"
                        required
                      />
                    </FormField>

                    <FormField
                      label="Supplier / Mill Name"
                      required
                      error={formErrors.supplier}
                    >
                      <Input
                        value={supplier}
                        onChange={(e) => {
                          setSupplier(e.target.value);
                          if (formErrors.supplier) setFormErrors((p) => ({ ...p, supplier: "" }));
                        }}
                        placeholder="e.g. Al-Karam Textile Mills Ltd."
                        required
                      />
                    </FormField>

                    <FormField
                      label="Order Issue Date"
                      required
                      error={formErrors.orderDate}
                    >
                      <Input
                        type="date"
                        value={orderDate}
                        onChange={(e) => {
                          setOrderDate(e.target.value);
                          if (formErrors.orderDate) setFormErrors((p) => ({ ...p, orderDate: "" }));
                        }}
                        required
                      />
                    </FormField>

                    <FormField
                      label="Expected Mill Delivery Date"
                      required
                      error={formErrors.expectedDate}
                    >
                      <Input
                        type="date"
                        value={expectedDate}
                        onChange={(e) => {
                          setExpectedDate(e.target.value);
                          if (formErrors.expectedDate) setFormErrors((p) => ({ ...p, expectedDate: "" }));
                        }}
                        required
                      />
                    </FormField>
                  </FormSection>
                </Card>

                {/* 2. Material Line Items & Commercials */}
                <Card>
                  <FormSection
                    title="2. Material Line Items & Commercial Terms"
                    description="Ordered fabric or trims with quantities, rates, and payment conditions"
                  >
                    <FormField
                      label="Material Description"
                      required
                      error={formErrors.material}
                    >
                      <Input
                        value={material}
                        onChange={(e) => {
                          setMaterial(e.target.value);
                          if (formErrors.material) setFormErrors((p) => ({ ...p, material: "" }));
                        }}
                        placeholder="e.g. 100% Combed Cotton French Terry Fleece (380 GSM)"
                        required
                      />
                    </FormField>

                    <FormField
                      label="Ordered Quantity"
                      required
                      error={formErrors.quantity}
                    >
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={quantity}
                          onChange={(e) => {
                            setQuantity(e.target.value);
                            if (formErrors.quantity) setFormErrors((p) => ({ ...p, quantity: "" }));
                          }}
                          placeholder="750"
                          className="flex-1"
                          required
                        />
                        <div className="w-32">
                          <Select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            options={UNIT_OPTIONS}
                          />
                        </div>
                      </div>
                    </FormField>

                    <FormField
                      label="Agreed Rate / Unit (PKR)"
                      required
                      error={formErrors.rate}
                    >
                      <Input
                        type="number"
                        step="0.5"
                        min="0.1"
                        value={rate}
                        onChange={(e) => {
                          setRate(e.target.value);
                          if (formErrors.rate) setFormErrors((p) => ({ ...p, rate: "" }));
                        }}
                        placeholder="1850"
                        prefix="Rs"
                        required
                      />
                    </FormField>

                    <FormField label="Payment Terms" required>
                      <Select
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value as "adv_50" | "net_30" | "cod" | "full_advance")}
                        options={PAYMENT_TERMS_OPTIONS}
                      />
                    </FormField>
                  </FormSection>
                </Card>
              </div>

              {/* Right Column: Live Summary & Actions (4 cols) */}
              <div className="lg:col-span-4 space-y-6 min-w-0">
                <Card className="sticky top-20 bg-slate-50/70 border-slate-200/90 shadow-xs">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Purchase Order Summary
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <p className="text-slate-400 font-medium">PO Reference #</p>
                        <p className="font-mono font-bold text-sm text-blue-600 truncate">
                          {poNumber.trim().toUpperCase() || "— NOT SPECIFIED —"}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <p className="text-slate-400 font-medium">Supplier / Mill</p>
                        <p className="font-bold text-slate-900 truncate">
                          {supplier.trim() || "— Not Specified —"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <p className="text-slate-400 font-medium">Ordered Qty</p>
                          <p className="font-semibold text-slate-800 truncate">
                            {parsedQty > 0 ? `${parsedQty.toLocaleString()} ${unit}` : "—"}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <p className="text-slate-400 font-medium">Unit Rate</p>
                          <p className="font-semibold text-slate-800 truncate">
                            {parsedRate > 0 ? `Rs ${parsedRate.toLocaleString()}` : "—"}
                          </p>
                        </div>
                      </div>

                      {/* Financial Totals */}
                      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-medium">Total Contract Value:</span>
                          <span className="font-mono font-extrabold text-blue-700 text-sm">
                            Rs {calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] pt-1 border-t border-blue-100">
                          <span className="text-slate-500">Advance Paid:</span>
                          <span className="font-mono font-semibold text-slate-700">
                            Rs {calculatedPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-purple-700 font-medium">Outstanding Balance:</span>
                          <span className="font-mono font-bold text-purple-700">
                            Rs {calculatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <p className="text-slate-400 font-medium">Payment Terms</p>
                        <p className="font-semibold text-slate-800 truncate">
                          {PAYMENT_TERMS_LABEL_MAP[paymentTerms]}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <Button
                        variant="primary"
                        className="w-full h-11 text-xs font-bold"
                        leftIcon={<Save className="h-4 w-4" />}
                        onClick={handleSavePurchaseOrder}
                      >
                        Issue Purchase Order
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full"
                        size="sm"
                        onClick={handleCancelCreate}
                      >
                        Cancel & Return
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </form>
          </div>
        ) : (
          /* ============================================================
              VIEW 2: PURCHASES CATALOG TABLE & OVERVIEW
              ============================================================ */
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Page Header */}
            <PageHeader
              title="Purchases & Raw Material Sourcing"
              description="Manage textile mill purchase orders, yarn contracts, trim sourcing, goods receipt notes (GRN), and supplier settlements."
              actions={
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={<RefreshCw className={`h-4 w-4 ${loadingPurchases ? "animate-spin" : ""}`} />}
                    onClick={() => loadPurchases(true)}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={handleOpenCreateForm}
                  >
                    New Purchase Order
                  </Button>
                </div>
              }
            />

            {/* 4 Meaningful KPI Cards (Calculated dynamically) */}
            <CardGrid columns={4}>
              <StatCard
                label="Total Purchase Value"
                value={`Rs ${totalPurchaseValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                sub="YTD material procurement"
                icon={<DollarSign className="h-5 w-5" />}
                iconColor="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Open Purchase Orders"
                value={String(openOrdersCount)}
                sub="Awaiting mill delivery"
                icon={<Clock className="h-5 w-5" />}
                iconColor="bg-amber-50 text-amber-600"
              />
              <StatCard
                label="Goods Received (GRN)"
                value={String(grnReceivedCount)}
                sub="Inspected in warehouse"
                icon={<CheckCircle2 className="h-5 w-5" />}
                iconColor="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                label="Outstanding Balance"
                value={`Rs ${totalOutstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                sub="Payables due to suppliers"
                icon={<Truck className="h-5 w-5" />}
                iconColor="bg-purple-50 text-purple-600"
              />
            </CardGrid>

            {/* Search & Filter Toolbar */}
            <Card noPadding className="p-3.5 sm:p-4 bg-white border-slate-200/80 shadow-xs">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 min-w-0">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search POs by number (e.g. PO-2026-001), supplier mill, or material..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Filter Dropdown */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  >
                    <option value="all">All PO Statuses</option>
                    <option value="draft">Draft / Issued</option>
                    <option value="confirmed">Confirmed by Mill</option>
                    <option value="partial">Partially Received</option>
                    <option value="received">Fully Received (GRN)</option>
                  </select>

                  {(searchQuery || statusFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Main Purchases Table */}
            <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-xs text-left min-w-[900px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">PO Number</th>
                      <th className="py-3 px-4">Supplier / Mill</th>
                      <th className="py-3 px-4">Order Date</th>
                      <th className="py-3 px-4">Expected Date</th>
                      <th className="py-3 px-4">Primary Material</th>
                      <th className="py-3 px-4">Quantity</th>
                      <th className="py-3 px-4">Total Amount (PKR)</th>
                      <th className="py-3 px-4">Paid</th>
                      <th className="py-3 px-4">Balance</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-0">
                          <EmptyState
                            icon={<ShoppingCart className="h-6 w-6 text-blue-600" />}
                            title={purchaseOrders.length === 0 ? "No purchase orders issued yet" : "No matching purchase orders found"}
                            description={
                              purchaseOrders.length === 0
                                ? "Create purchase orders for textile mills, yarn suppliers, and trim vendors to track material arrivals and accounts payable."
                                : "Try adjusting your search query or status filter to find the purchase order."
                            }
                            actionLabel="Create Purchase Order"
                            actionIcon={<Plus className="h-4 w-4" />}
                            onAction={handleOpenCreateForm}
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((po) => {
                        return (
                          <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                              {po.poNumber}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[200px]">
                              <span className="truncate block">{po.supplier}</span>
                              <span className="text-[11px] font-normal text-slate-400 block truncate">
                                Terms: {PAYMENT_TERMS_LABEL_MAP[po.paymentTerms]}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600">
                              {po.orderDate}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600">
                              {po.expectedDate}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 max-w-[180px]">
                              <span className="truncate block font-medium">{po.material}</span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              {parseFloat(po.quantity).toLocaleString()} {po.unit}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              Rs {po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-emerald-700 font-semibold">
                              Rs {po.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-purple-700 font-semibold">
                              Rs {po.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {po.status === "received" ? (
                                <Badge variant="success">Received (GRN)</Badge>
                              ) : po.status === "confirmed" ? (
                                <Badge variant="primary">Confirmed</Badge>
                              ) : po.status === "partial" ? (
                                <Badge variant="warning">Partial</Badge>
                              ) : (
                                <Badge variant="muted">Draft</Badge>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {po.status !== "received" && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAsReceived(po.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                                    title="Mark as Received (GRN)"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Receive GRN</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setOrderToDelete(po)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Delete purchase order"
                                >
                                  <Trash2 className="h-4 w-4" />
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
                pageSize={10}
                total={filteredOrders.length}
                onPageChange={setPage}
              />
            </Card>

            {/* In-App Delete Confirmation Dialog */}
            <ConfirmDialog
              isOpen={Boolean(orderToDelete)}
              onClose={() => setOrderToDelete(null)}
              onConfirm={handleConfirmDelete}
              title="Delete Purchase Order"
              description={
                orderToDelete
                  ? `Are you sure you want to delete purchase order "${orderToDelete.poNumber} — ${orderToDelete.supplier}"? This action cannot be undone.`
                  : ""
              }
              confirmLabel="Delete PO"
              cancelLabel="Cancel"
              destructive
            />
          </div>
        )}
      </div>
    </>
  );
}

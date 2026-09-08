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
  ClipboardList,
  Plus,
  Search,
  Factory,
  Truck,
  DollarSign,
  RotateCcw,
  Eye,
  Edit,
  Copy,
  Trash2,
  Archive,
  ArrowLeft,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileText,
  Calculator,
  Receipt,
  MapPin,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  OrderRecord,
  OrderStatus,
  OrderType,
  ProductionStage,
  OrderPriority,
  PaymentStatus,
  CommercialCurrency,
  ORDER_STORAGE_KEY,
  INITIAL_ORDERS,
  calculateOrderPricing,
  hasOrderTransactionalLinks,
  syncClientWithOrders,
} from "@/lib/orders-engine";
import {
  ClientRecord,
  CLIENT_STORAGE_KEY,
  INITIAL_CLIENTS,
} from "@/lib/clients-engine";
import { CURRENCY_SYMBOLS } from "@/lib/costing-engine";
import {
  getOrdersFromSupabase,
  createOrderInSupabase,
  updateOrderInSupabase,
  deleteOrderInSupabase,
} from "@/lib/services/orders-service";
import { getProductsFromSupabase, GarmentProduct } from "@/lib/services/products-service";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: "primary" | "warning" | "info" | "success" | "danger" | "default" }
> = {
  draft: { label: "Draft Order", variant: "default" },
  confirmed: { label: "Confirmed", variant: "primary" },
  pre_production: { label: "Pre-Production", variant: "info" },
  in_production: { label: "In Production", variant: "warning" },
  qa: { label: "QA Inspection", variant: "info" },
  packed: { label: "Packed & Staged", variant: "info" },
  ready_to_ship: { label: "Ready to Ship", variant: "primary" },
  shipped: { label: "Dispatched / Shipped", variant: "success" },
  completed: { label: "Completed", variant: "success" },
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

const ORDER_TYPES: OrderType[] = [
  "Export Bulk Production",
  "Sample Development",
  "Repeat Order",
  "Wholesale Contract",
  "Urgent / Fast-Track",
];

const PRODUCTION_STAGES: ProductionStage[] = [
  "Order Confirmed",
  "Pre-Production",
  "Cutting",
  "Sewing",
  "Finishing",
  "Quality Assurance",
  "Packed",
  "Ready to Ship",
  "Shipped",
  "Completed",
  "Cancelled",
];

const ORDER_PRIORITIES: { value: OrderPriority; label: string }[] = [
  { value: "low", label: "Low Priority" },
  { value: "normal", label: "Normal Priority (Standard Lead Time)" },
  { value: "high", label: "High Priority (Expedited Fabric Milling)" },
  { value: "urgent", label: "Urgent / Fast-Track (Dedicated Line Capacity)" },
];

const GARMENT_STYLES = [
  {
    code: "HD-380",
    name: "HD-380 — 380 GSM Heavyweight Oversized Hoodie",
    category: "Hoodies & Sweatshirts",
    fabric: "380 GSM 100% Combed Cotton Fleece, Brushed Interior",
    gsm: "380 GSM",
    defaultPrice: 18.5,
    costEstimateRef: "CST-2026-001",
    quotationRef: "QT-2026-001",
  },
  {
    code: "TS-240",
    name: "TS-240 — 240 GSM Boxy Heavy T-Shirt",
    category: "T-Shirts",
    fabric: "240 GSM Organic Cotton Jersey, Spandex Collar Rib",
    gsm: "240 GSM",
    defaultPrice: 10.71,
    costEstimateRef: "CST-2026-002",
    quotationRef: "QT-2026-002",
  },
  {
    code: "JG-320",
    name: "JG-320 — French Terry Cuffed Joggers",
    category: "Joggers & Bottoms",
    fabric: "320 GSM 100% Organic Cotton French Terry",
    gsm: "320 GSM",
    defaultPrice: 16.9,
    costEstimateRef: "CST-2026-003",
    quotationRef: "QT-2026-003",
  },
  {
    code: "JK-450",
    name: "JK-450 — Technical Windbreaker Jacket",
    category: "Jackets & Outerwear",
    fabric: "Micro-Polyester Interlock, UPF 50+ Lycra",
    gsm: "160 GSM",
    defaultPrice: 32.67,
    costEstimateRef: "",
    quotationRef: "QT-2026-005",
  },
];

export default function OrdersPage() {
  const { success, error: toastError } = useToast();

  // View Mode: "list" | "create" | "edit" | "detail"
  const [viewMode, setViewMode] = React.useState<"list" | "create" | "edit" | "detail">("list");
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);

  // Detail Tab: "overview" | "production" | "costing" | "quotation" | "invoices" | "shipping" | "timeline"
  const [detailTab, setDetailTab] = React.useState<
    "overview" | "production" | "costing" | "quotation" | "invoices" | "shipping" | "timeline"
  >("overview");

  // Hydration-Safe State for Orders
  const getOrdersSnapshot = React.useCallback(() => {
    try {
      if (typeof window === "undefined") return JSON.stringify(INITIAL_ORDERS);
      const stored = localStorage.getItem(ORDER_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
        return JSON.stringify(INITIAL_ORDERS);
      }
      return stored;
    } catch {
      return JSON.stringify(INITIAL_ORDERS);
    }
  }, []);

  const getOrdersServerSnapshot = React.useCallback(() => JSON.stringify(INITIAL_ORDERS), []);

  const subscribeOrders = React.useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }, []);

  const rawOrdersJson = React.useSyncExternalStore(subscribeOrders, getOrdersSnapshot, getOrdersServerSnapshot);
  const [localOrdersOverride, setLocalOrdersOverride] = React.useState<OrderRecord[] | null>(null);
  const [availableProducts, setAvailableProducts] = React.useState<GarmentProduct[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(false);

  const loadOrders = React.useCallback(async (showToast = false) => {
    setLoadingOrders(true);
    try {
      const [ordData, prods] = await Promise.all([
        getOrdersFromSupabase().catch(() => []),
        getProductsFromSupabase().catch(() => []),
      ]);

      if (ordData && ordData.length > 0) {
        setLocalOrdersOverride(ordData);
      }
      if (prods && prods.length > 0) {
        setAvailableProducts(prods);
      }

      if (showToast) {
        success("Orders Refreshed", { description: "Loaded live sales orders from MySQL." });
      }
    } catch (err: any) {
      console.error("Failed to load orders:", err);
      if (showToast) {
        toastError("Failed to Refresh Orders", { description: err.message });
      }
    } finally {
      setLoadingOrders(false);
    }
  }, [success, toastError]);

  // Sync with Supabase on mount
  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const orders = React.useMemo(() => {
    if (localOrdersOverride !== null) return localOrdersOverride;
    try {
      return JSON.parse(rawOrdersJson) as OrderRecord[];
    } catch {
      return INITIAL_ORDERS;
    }
  }, [rawOrdersJson, localOrdersOverride]);

  const saveOrders = (records: OrderRecord[]) => {
    setLocalOrdersOverride(records);
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(records));
      syncClientWithOrders(records);
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

  const rawClientsJson = React.useSyncExternalStore(subscribeOrders, getClientsSnapshot, () => JSON.stringify(INITIAL_CLIENTS));
  const availableClients = React.useMemo(() => {
    try {
      const parsed: ClientRecord[] = JSON.parse(rawClientsJson);
      return parsed.filter((c) => !c.isArchived);
    } catch {
      return INITIAL_CLIENTS;
    }
  }, [rawClientsJson]);

  // Selected Order
  const activeOrder = React.useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o) => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [clientFilter, setClientFilter] = React.useState("all");
  const [countryFilter, setCountryFilter] = React.useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = React.useState("all");
  const [stageFilter, setStageFilter] = React.useState("all");
  const [paymentFilter, setPaymentFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"recent" | "orderDate" | "deliveryDate" | "highValue" | "lowValue" | "clientName">("recent");
  const [page, setPage] = React.useState(1);

  // Archive & Delete Modals
  const [orderToDelete, setOrderToDelete] = React.useState<OrderRecord | null>(null);
  const [archiveModalOrder, setArchiveModalOrder] = React.useState<OrderRecord | null>(null);

  // Form State
  const [editingInternalId, setEditingInternalId] = React.useState<string | null>(null);
  const [orderNumber, setOrderNumber] = React.useState("");
  const [selectedClientInternalId, setSelectedClientInternalId] = React.useState("clt_001");
  const [orderDate, setOrderDate] = React.useState("");
  const [targetDeliveryDate, setTargetDeliveryDate] = React.useState("");
  const [requestedShipDate, setRequestedShipDate] = React.useState("");
  const [productionStartDate, setProductionStartDate] = React.useState("");
  const [orderType, setOrderType] = React.useState<OrderType>("Export Bulk Production");
  const [currency, setCurrency] = React.useState<CommercialCurrency>("USD");
  const [priority, setPriority] = React.useState<OrderPriority>("normal");
  const [orderStatus, setOrderStatus] = React.useState<OrderStatus>("confirmed");
  const [productionStage, setProductionStage] = React.useState<ProductionStage>("Order Confirmed");
  const [paymentStatus, setPaymentStatus] = React.useState<PaymentStatus>("pending");

  // Garment Details Form
  const [selectedProductId, setSelectedProductId] = React.useState<string | undefined>(undefined);
  const [styleCode, setStyleCode] = React.useState("HD-380");
  const [styleName, setStyleName] = React.useState("HD-380 — 380 GSM Heavyweight Hoodie");
  const [productCategory, setProductCategory] = React.useState("Hoodies & Sweatshirts");
  const [description, setDescription] = React.useState("");
  const [fabric, setFabric] = React.useState("380 GSM 100% Combed Cotton Fleece, 2x2 Spandex Rib");
  const [gsm, setGsm] = React.useState("380 GSM");
  const [color, setColor] = React.useState("Washed Black");
  const [sizeRange, setSizeRange] = React.useState("S, M, L, XL, XXL");
  const [customizationNotes, setCustomizationNotes] = React.useState("");

  // Commercial Pricing Form
  const [quantity, setQuantity] = React.useState("500");
  const [unitPrice, setUnitPrice] = React.useState("21.09");
  const [discount, setDiscount] = React.useState("0");
  const [additionalCharges, setAdditionalCharges] = React.useState("0");
  const [tax, setTax] = React.useState("0");

  // Commercial & Shipping Form
  const [paymentTerms, setPaymentTerms] = React.useState("30% Advance TT / 70% before BL Release");
  const [incoterms, setIncoterms] = React.useState("FOB Sialkot");
  const [shippingMethod, setShippingMethod] = React.useState("Air Cargo");
  const [destinationPort, setDestinationPort] = React.useState("London Heathrow Logistics Hub");
  const [buyerPoRef, setBuyerPoRef] = React.useState("");

  // Relational Links
  const [costEstimateId, setCostEstimateId] = React.useState("CST-2026-001");
  const [quotationId, setQuotationId] = React.useState("QT-2026-001");
  const [productionJobId, setProductionJobId] = React.useState("PRD-2026-001");
  const [trackingNumber, setTrackingNumber] = React.useState("TRK-2026-001");

  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Dynamic Calculated Pricing
  const calculatedPricing = React.useMemo(() => {
    return calculateOrderPricing(quantity, unitPrice, discount, additionalCharges, tax);
  }, [quantity, unitPrice, discount, additionalCharges, tax]);

  // Open Create Form
  const handleOpenCreate = () => {
    const currentYear = new Date().getFullYear();
    const currentMax = orders.reduce((max, o) => {
      const match = o.orderNumber.match(/ORD-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = currentMax + 1;
    const newDisplayId = `ORD-${currentYear}-${String(nextNum).padStart(3, "0")}`;

    const defaultClient = availableClients[0] || INITIAL_CLIENTS[0];
    const today = new Date().toISOString().split("T")[0];
    const delivery = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const prodStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    setEditingInternalId(null);
    setOrderNumber(newDisplayId);
    setSelectedClientInternalId(defaultClient.id);
    setOrderDate(today);
    setTargetDeliveryDate(delivery);
    setRequestedShipDate(delivery);
    setProductionStartDate(prodStart);
    setOrderType("Export Bulk Production");
    setCurrency(defaultClient.commercialInfo.currency || "USD");
    setPriority("normal");
    setOrderStatus("confirmed");
    setProductionStage("Order Confirmed");
    setPaymentStatus("pending");

    // Style defaults
    const defaultStyle = GARMENT_STYLES[0];
    const matchingProduct = availableProducts.find((p) => p.styleCode === defaultStyle.code);
    setSelectedProductId(matchingProduct?.id);
    setStyleCode(defaultStyle.code);
    setStyleName(defaultStyle.name);
    setProductCategory(defaultStyle.category);
    setDescription("Export quality garment production order.");
    setFabric(defaultStyle.fabric);
    setGsm(defaultStyle.gsm);
    setColor("Washed Black");
    setSizeRange("S, M, L, XL");
    setCustomizationNotes("");

    setQuantity("500");
    setUnitPrice(String(defaultStyle.defaultPrice));
    setDiscount("0");
    setAdditionalCharges("0");
    setTax("0");

    setPaymentTerms(defaultClient.commercialInfo.paymentTerms || "30% Advance TT / 70% before BL Release");
    setIncoterms(defaultClient.commercialInfo.incoterms || "FOB Sialkot");
    setShippingMethod(defaultClient.commercialInfo.preferredShippingMethod || "Air Cargo");
    setDestinationPort(defaultClient.commercialInfo.defaultShippingDestination || "International Logistics Port");
    setBuyerPoRef("");

    setCostEstimateId(defaultStyle.costEstimateRef || "");
    setQuotationId(defaultStyle.quotationRef || "");
    setProductionJobId(`PRD-${currentYear}-${String(nextNum).padStart(3, "0")}`);
    setTrackingNumber("");

    setFormErrors({});
    setViewMode("create");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Client Selection Change -> Auto-populate Buyer commercial defaults
  const handleClientChange = (clientId: string) => {
    setSelectedClientInternalId(clientId);
    const clientObj = availableClients.find((c) => c.id === clientId);
    if (clientObj) {
      if (clientObj.commercialInfo.currency) {
        setCurrency(clientObj.commercialInfo.currency as CommercialCurrency);
      }
      if (clientObj.commercialInfo.paymentTerms) {
        setPaymentTerms(clientObj.commercialInfo.paymentTerms);
      }
      if (clientObj.commercialInfo.incoterms) {
        setIncoterms(clientObj.commercialInfo.incoterms);
      }
      if (clientObj.commercialInfo.preferredShippingMethod) {
        setShippingMethod(clientObj.commercialInfo.preferredShippingMethod);
      }
      if (clientObj.commercialInfo.defaultShippingDestination) {
        setDestinationPort(clientObj.commercialInfo.defaultShippingDestination);
      }
    }
  };

  // Style Selection Change
  const handleStyleChange = (code: string) => {
    const matchingProduct = availableProducts.find((p) => p.styleCode === code);
    const found = GARMENT_STYLES.find((s) => s.code === code);
    setSelectedProductId(matchingProduct?.id);

    if (matchingProduct) {
      setStyleCode(matchingProduct.styleCode);
      setStyleName(matchingProduct.name);
      setProductCategory(matchingProduct.category);
      setFabric(matchingProduct.fabricType);
      setGsm(matchingProduct.gsm);
    } else if (found) {
      setStyleCode(found.code);
      setStyleName(found.name);
      setProductCategory(found.category);
      setFabric(found.fabric);
      setGsm(found.gsm);
    }
  };

  // Open Edit Form
  const handleOpenEdit = (order: OrderRecord) => {
    setEditingInternalId(order.id);
    setOrderNumber(order.orderNumber);
    setSelectedClientInternalId(order.clientId);
    setSelectedProductId(order.productId);
    setOrderDate(order.orderDate);
    setTargetDeliveryDate(order.targetDeliveryDate);
    setRequestedShipDate(order.requestedShipDate || "");
    setProductionStartDate(order.productionStartDate || "");
    setOrderType(order.orderType);
    setCurrency(order.currency);
    setPriority(order.priority);
    setOrderStatus(order.orderStatus);
    setProductionStage(order.productionStage);
    setPaymentStatus(order.paymentStatus);

    setStyleCode(order.styleCode);
    setStyleName(order.styleName);
    setProductCategory(order.productCategory);
    setDescription(order.description || "");
    setFabric(order.fabric || "");
    setGsm(order.gsm || "");
    setColor(order.color || "");
    setSizeRange(order.sizeRange || "");
    setCustomizationNotes(order.customizationNotes || "");

    setQuantity(String(order.quantity));
    setUnitPrice(String(order.unitPrice));
    setDiscount(String(order.discount || "0"));
    setAdditionalCharges(String(order.additionalCharges || "0"));
    setTax(String(order.tax || "0"));

    setPaymentTerms(order.paymentTerms);
    setIncoterms(order.incoterms);
    setShippingMethod(order.shippingMethod || "Air Cargo");
    setDestinationPort(order.destinationPort || "");
    setBuyerPoRef(order.buyerPoRef || "");

    setCostEstimateId(order.costEstimateId || "");
    setQuotationId(order.quotationId || "");
    setProductionJobId(order.productionJobId || "");
    setTrackingNumber(order.trackingNumber || "");

    setFormErrors({});
    setViewMode("edit");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Open Detail View
  const handleOpenDetail = (order: OrderRecord) => {
    setSelectedOrderId(order.id);
    setDetailTab("overview");
    setViewMode("detail");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Duplicate Order
  const handleDuplicateOrder = (order: OrderRecord) => {
    const currentYear = new Date().getFullYear();
    const currentMax = orders.reduce((max, o) => {
      const match = o.orderNumber.match(/ORD-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = currentMax + 1;
    const newDisplayId = `ORD-${currentYear}-${String(nextNum).padStart(3, "0")}`;
    const newInternalId = "ord_" + Date.now();
    const nowIso = new Date().toISOString();
    const nowReadable = new Date().toLocaleString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const duplicated: OrderRecord = {
      ...order,
      id: newInternalId,
      orderNumber: newDisplayId,
      orderStatus: "draft",
      productionStage: "Order Confirmed",
      paymentStatus: "pending",
      invoiceIds: [],
      trackingNumber: undefined,
      productionJobId: `PRD-${currentYear}-${String(nextNum).padStart(3, "0")}`,
      timeline: [
        {
          id: "evt_" + Date.now(),
          title: "Order Duplicated",
          description: `Duplicated from master sales order ${order.orderNumber}. Set as Draft.`,
          timestamp: nowReadable,
          type: "created",
          author: "Merchandising Desk",
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [duplicated, ...orders];
    saveOrders(updated);
    success("Sales Order Duplicated", {
      description: `Created new draft contract ${newDisplayId} based on ${order.orderNumber}.`,
    });
    setSelectedOrderId(newInternalId);
    setViewMode("detail");
  };

  // Save / Update Order
  const handleSaveOrder = (e: React.FormEvent, asDraft: boolean = false) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    const qtyNum = parseInt(quantity, 10);
    if (!quantity.trim() || isNaN(qtyNum) || qtyNum <= 0) {
      errors.quantity = "Order quantity must be a positive integer greater than 0.";
    }

    const priceNum = parseFloat(unitPrice);
    if (!unitPrice.trim() || isNaN(priceNum) || priceNum < 0) {
      errors.unitPrice = "Unit price must be a non-negative number.";
    }

    if (!orderDate.trim()) {
      errors.orderDate = "Order booking date is required.";
    }

    if (!targetDeliveryDate.trim()) {
      errors.targetDeliveryDate = "Target delivery date is required.";
    }

    if (orderDate && targetDeliveryDate && new Date(targetDeliveryDate) < new Date(orderDate)) {
      errors.targetDeliveryDate = "Target delivery date cannot be before Order booking date.";
    }

    if (productionStartDate && targetDeliveryDate && new Date(productionStartDate) > new Date(targetDeliveryDate)) {
      errors.productionStartDate = "Production start date cannot be after Target delivery date.";
    }

    if (!styleName.trim()) {
      errors.styleName = "Garment style name is required.";
    }

    const clientObj = availableClients.find((c) => c.id === selectedClientInternalId) || INITIAL_CLIENTS[0];

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toastError("Please resolve highlighted validation errors.", {
        description: Object.values(errors)[0],
      });
      return;
    }

    const pricing = calculateOrderPricing(quantity, unitPrice, discount, additionalCharges, tax);
    const nowIso = new Date().toISOString();
    const nowReadable = new Date().toLocaleString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let orderToSave: OrderRecord;

    if (editingInternalId && activeOrder) {
      const finalStatus: OrderStatus = asDraft
        ? "draft"
        : activeOrder.orderStatus === "draft"
        ? "confirmed"
        : orderStatus;

      orderToSave = {
        ...activeOrder,
        orderNumber: orderNumber.trim(),
        clientId: clientObj.id,
        clientDisplayId: clientObj.clientId,
        clientName: clientObj.companyName,
        clientCountry: clientObj.country,
        clientCity: clientObj.city,
        clientContact: clientObj.primaryContact.name,
        clientEmail: clientObj.primaryContact.email,
        orderDate: orderDate.trim(),
        targetDeliveryDate: targetDeliveryDate.trim(),
        requestedShipDate: requestedShipDate.trim() || undefined,
        productionStartDate: productionStartDate.trim() || undefined,
        orderType,
        currency,
        priority,
        orderStatus: finalStatus,
        productionStage,
        paymentStatus,
        productId: selectedProductId || activeOrder.productId || undefined,
        styleCode: styleCode.trim(),
        styleName: styleName.trim(),
        productCategory: productCategory.trim(),
        description: description.trim() || undefined,
        fabric: fabric.trim() || undefined,
        gsm: gsm.trim() || undefined,
        color: color.trim() || undefined,
        sizeRange: sizeRange.trim() || undefined,
        customizationNotes: customizationNotes.trim() || undefined,
        quantity: pricing.quantity,
        unitPrice: pricing.unitPrice,
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        additionalCharges: pricing.additionalCharges,
        tax: pricing.tax,
        totalValue: pricing.totalValue,
        paymentTerms: paymentTerms.trim(),
        incoterms: incoterms.trim(),
        shippingMethod: shippingMethod.trim() || undefined,
        destinationPort: destinationPort.trim() || undefined,
        buyerPoRef: buyerPoRef.trim() || undefined,
        costEstimateId: costEstimateId.trim() || undefined,
        quotationId: quotationId.trim() || undefined,
        productionJobId: asDraft ? undefined : (productionJobId.trim() || undefined),
        trackingNumber: trackingNumber.trim() || undefined,
        updatedAt: nowIso,
        timeline: [
          ...(activeOrder.orderStatus === "draft" && !asDraft
            ? [
                {
                  id: "evt_" + Date.now(),
                  title: "Sales Order Booked",
                  description: `Draft order ${orderNumber} confirmed and booked.`,
                  timestamp: nowReadable,
                  type: "status_change" as const,
                  author: "Merchandising Lead",
                },
              ]
            : []),
          ...(activeOrder.timeline || []),
        ],
      };

      const updated = orders.map((o) => (o.id === editingInternalId ? orderToSave : o));
      saveOrders(updated);
      success(asDraft ? "Draft Order Saved" : "Sales Order Updated", {
        description: `Changes saved for order ${orderToSave.orderNumber} (${clientObj.companyName}).`,
      });
    } else {
      const newInternalId = "ord_" + Date.now();
      const finalStatus: OrderStatus = asDraft ? "draft" : "confirmed";

      orderToSave = {
        id: newInternalId,
        orderNumber: orderNumber.trim(),
        clientId: clientObj.id,
        clientDisplayId: clientObj.clientId,
        clientName: clientObj.companyName,
        clientCountry: clientObj.country,
        clientCity: clientObj.city,
        clientContact: clientObj.primaryContact.name,
        clientEmail: clientObj.primaryContact.email,
        orderDate: orderDate.trim(),
        targetDeliveryDate: targetDeliveryDate.trim(),
        requestedShipDate: requestedShipDate.trim() || undefined,
        productionStartDate: productionStartDate.trim() || undefined,
        orderType,
        currency,
        priority,
        orderStatus: finalStatus,
        productionStage: asDraft ? "Order Confirmed" : productionStage,
        paymentStatus,
        productId: selectedProductId || undefined,
        styleCode: styleCode.trim(),
        styleName: styleName.trim(),
        productCategory: productCategory.trim(),
        description: description.trim() || undefined,
        fabric: fabric.trim() || undefined,
        gsm: gsm.trim() || undefined,
        color: color.trim() || undefined,
        sizeRange: sizeRange.trim() || undefined,
        customizationNotes: customizationNotes.trim() || undefined,
        quantity: pricing.quantity,
        unitPrice: pricing.unitPrice,
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        additionalCharges: pricing.additionalCharges,
        tax: pricing.tax,
        totalValue: pricing.totalValue,
        paymentTerms: paymentTerms.trim(),
        incoterms: incoterms.trim(),
        shippingMethod: shippingMethod.trim() || undefined,
        destinationPort: destinationPort.trim() || undefined,
        buyerPoRef: buyerPoRef.trim() || undefined,
        costEstimateId: costEstimateId.trim() || undefined,
        quotationId: quotationId.trim() || undefined,
        productionJobId: asDraft ? undefined : (productionJobId.trim() || undefined),
        trackingNumber: trackingNumber.trim() || undefined,
        timeline: [
          {
            id: "evt_" + Date.now(),
            title: asDraft ? "Order Draft Created" : "Sales Order Booked",
            description: asDraft
              ? `Draft sales order contract saved for ${pricing.quantity.toLocaleString()} pcs ${styleCode} (${clientObj.companyName}).`
              : `Confirmed commercial contract booked for ${pricing.quantity.toLocaleString()} pcs ${styleCode} @ ${CURRENCY_SYMBOLS[currency]}${pricing.unitPrice.toFixed(2)} (${clientObj.companyName}).`,
            timestamp: nowReadable,
            type: "created",
            author: "Merchandising Lead",
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const updated = [orderToSave, ...orders];
      saveOrders(updated);
      createOrderInSupabase(orderToSave).catch((err) => console.error(err));
      success(asDraft ? "Draft Order Saved" : "Sales Order Confirmed", {
        description: asDraft
          ? `Saved draft contract ${orderToSave.orderNumber} for ${clientObj.companyName}.`
          : `Successfully booked confirmed contract ${orderToSave.orderNumber} for ${clientObj.companyName}.`,
      });
    }

    if (editingInternalId && activeOrder) {
      updateOrderInSupabase(orderToSave).catch((err) => console.error(err));
    }

    setSelectedOrderId(orderToSave.id);
    setViewMode("detail");
  };

  // Quick Production Stage Transition from Detail View
  const handleUpdateProductionStage = (order: OrderRecord, newStage: ProductionStage) => {
    const nowIso = new Date().toISOString();
    const nowReadable = new Date().toLocaleString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let newOrderStatus = order.orderStatus;
    if (newStage === "Sewing" || newStage === "Cutting" || newStage === "Finishing") {
      newOrderStatus = "in_production";
    } else if (newStage === "Quality Assurance") {
      newOrderStatus = "qa";
    } else if (newStage === "Packed") {
      newOrderStatus = "packed";
    } else if (newStage === "Ready to Ship") {
      newOrderStatus = "ready_to_ship";
    } else if (newStage === "Shipped") {
      newOrderStatus = "shipped";
    } else if (newStage === "Completed") {
      newOrderStatus = "completed";
    } else if (newStage === "Cancelled") {
      newOrderStatus = "cancelled";
    }

    const updatedOrder: OrderRecord = {
      ...order,
      productionStage: newStage,
      orderStatus: newOrderStatus,
      timeline: [
        {
          id: "evt_" + Date.now(),
          title: `Stage Changed: ${newStage}`,
          description: `Production stage transitioned from ${order.productionStage} to ${newStage}.`,
          timestamp: nowReadable,
          type: "stage_change",
          author: "Plant Floor Lead",
        },
        ...(order.timeline || []),
      ],
      updatedAt: nowIso,
    };

    const updated = orders.map((o) => (o.id === order.id ? updatedOrder : o));
    saveOrders(updated);
    updateOrderInSupabase(updatedOrder).catch((err) => console.error(err));
    success("Production Stage Updated", {
      description: `${order.orderNumber} advanced to ${newStage}.`,
    });
  };

  // Deletion / Archival Safety
  const handleRequestDelete = (order: OrderRecord) => {
    if (hasOrderTransactionalLinks(order)) {
      setArchiveModalOrder(order);
    } else {
      setOrderToDelete(order);
    }
  };

  const handleConfirmPermanentDelete = () => {
    if (!orderToDelete) return;
    const updated = orders.filter((o) => o.id !== orderToDelete.id);
    saveOrders(updated);
    deleteOrderInSupabase(orderToDelete.id, orderToDelete.orderNumber).catch((err) => console.error(err));
    success("Order Removed", {
      description: `Sales order ${orderToDelete.orderNumber} was permanently deleted.`,
    });
    if (selectedOrderId === orderToDelete.id) {
      setSelectedOrderId(null);
      setViewMode("list");
    }
    setOrderToDelete(null);
  };

  const handleConfirmArchive = () => {
    if (!archiveModalOrder) return;
    const updatedOrder: OrderRecord = {
      ...archiveModalOrder,
      orderStatus: "cancelled",
      isArchived: true,
      updatedAt: new Date().toISOString(),
    };
    const updated = orders.map((o) => (o.id === archiveModalOrder.id ? updatedOrder : o));
    saveOrders(updated);
    updateOrderInSupabase(updatedOrder).catch((err) => console.error(err));
    success("Sales Order Archived", {
      description: `Order ${archiveModalOrder.orderNumber} archived. Historical accounting and production tracking data preserved.`,
    });
    setArchiveModalOrder(null);
  };

  // Dynamic KPI Computations
  const nonArchivedOrders = orders.filter((o) => !o.isArchived);
  const totalOrdersCount = nonArchivedOrders.length;
  const activeOrdersCount = nonArchivedOrders.filter((o) => o.orderStatus !== "completed" && o.orderStatus !== "cancelled").length;
  const inProductionCount = nonArchivedOrders.filter(
    (o) => o.orderStatus === "in_production" || o.orderStatus === "pre_production" || o.orderStatus === "qa"
  ).length;
  const completedCount = nonArchivedOrders.filter((o) => o.orderStatus === "completed" || o.orderStatus === "shipped").length;
  const totalOrderValueSum = nonArchivedOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0);

  // Search & Filter Pipeline
  const filteredOrders = nonArchivedOrders.filter((o) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.clientName.toLowerCase().includes(q) ||
      o.clientDisplayId.toLowerCase().includes(q) ||
      o.styleCode.toLowerCase().includes(q) ||
      o.styleName.toLowerCase().includes(q) ||
      o.clientCountry.toLowerCase().includes(q) ||
      (o.productionJobId && o.productionJobId.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "all" || o.orderStatus === statusFilter;
    const matchesClient = clientFilter === "all" || o.clientId === clientFilter;
    const matchesCountry = countryFilter === "all" || o.clientCountry === countryFilter;
    const matchesType = orderTypeFilter === "all" || o.orderType === orderTypeFilter;
    const matchesStage = stageFilter === "all" || o.productionStage === stageFilter;
    const matchesPayment = paymentFilter === "all" || o.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesClient && matchesCountry && matchesType && matchesStage && matchesPayment;
  });

  // Sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === "orderDate") {
      return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    }
    if (sortBy === "deliveryDate") {
      return new Date(a.targetDeliveryDate).getTime() - new Date(b.targetDeliveryDate).getTime();
    }
    if (sortBy === "highValue") {
      return (b.totalValue || 0) - (a.totalValue || 0);
    }
    if (sortBy === "lowValue") {
      return (a.totalValue || 0) - (b.totalValue || 0);
    }
    if (sortBy === "clientName") {
      return a.clientName.localeCompare(b.clientName);
    }
    // recent
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pageSize = 10;
  const paginatedOrders = sortedOrders.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <TopNav
        title={
          viewMode === "create"
            ? "Create New Sales Order"
            : viewMode === "edit"
            ? `Edit Sales Order: ${orderNumber}`
            : viewMode === "detail"
            ? `Sales Order: ${activeOrder?.orderNumber || ""} (${activeOrder?.clientName || ""})`
            : "Commercial Customer Orders & Contracts"
        }
      />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* ============================================================
            VIEW 1: CREATE / EDIT SALES ORDER STUDIO
            ============================================================ */}
        {viewMode === "create" || viewMode === "edit" ? (
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewMode(selectedOrderId ? "detail" : "list")}
                  className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back to Orders"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                      {editingInternalId ? `Edit Order: ${orderNumber}` : "Create New Sales Order"}
                    </h1>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {orderNumber}
                    </span>
                    <Badge variant={STATUS_CONFIG[orderStatus]?.variant || "default"} dot>
                      {STATUS_CONFIG[orderStatus]?.label || orderStatus}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {orderType} • Delivery: {targetDeliveryDate || "Not set"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setViewMode(selectedOrderId ? "detail" : "list")}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={(e) => handleSaveOrder(e, true)}
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={(e) => handleSaveOrder(e, false)}
                >
                  {editingInternalId ? "Update Sales Order" : "Confirm & Book Order"}
                </Button>
              </div>
            </div>

            {/* Form Canvas */}
            <form onSubmit={(e) => handleSaveOrder(e, false)} className="space-y-6">
              {/* Section A: Order & Client Identification */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="A. Order & Client Identification"
                  description="System-generated order code, buyer selection, booking date, and export currency."
                >
                  <FormField
                    label="Order Display ID"
                    description="Auto-generated unique order code (Read-only)"
                  >
                    <Input
                      value={orderNumber}
                      readOnly
                      disabled
                      className="bg-slate-100/70 text-blue-700 font-mono font-bold cursor-not-allowed select-none border-slate-200"
                    />
                  </FormField>

                  <FormField label="Client / Buyer Account" required>
                    <Select
                      value={selectedClientInternalId}
                      onChange={(e) => handleClientChange(e.target.value)}
                      options={availableClients.map((c) => ({
                        value: c.id,
                        label: `${c.clientId} — ${c.companyName} (${c.country})`,
                      }))}
                    />
                  </FormField>

                  <FormField label="Order Date" required error={formErrors.orderDate}>
                    <Input
                      type="date"
                      value={orderDate}
                      onChange={(e) => {
                        setOrderDate(e.target.value);
                        if (formErrors.orderDate) setFormErrors((prev) => ({ ...prev, orderDate: "" }));
                      }}
                      error={!!formErrors.orderDate}
                    />
                  </FormField>

                  <FormField label="Order Contract Type" required>
                    <Select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value as OrderType)}
                      options={ORDER_TYPES.map((t) => ({ value: t, label: t }))}
                    />
                  </FormField>

                  <FormField label="Commercial Invoicing Currency" required>
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

                  <FormField label="Order Priority">
                    <Select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as OrderPriority)}
                      options={[
                        { value: "low", label: "Low Priority" },
                        { value: "normal", label: "Normal Priority" },
                        { value: "high", label: "High Priority" },
                        { value: "urgent", label: "Urgent / Fast-Track" },
                      ]}
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Section B: Product / Garment Order Details */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="B. Product / Garment Order Details"
                  description="Garment style specifications, fabric composition, GSM, colorways, and pre-costing BOM links."
                >
                  <FormField label="Select Garment Style Preset">
                    <Select
                      value={styleCode}
                      onChange={(e) => handleStyleChange(e.target.value)}
                      options={GARMENT_STYLES.map((s) => ({
                        value: s.code,
                        label: `${s.code} — ${s.name}`,
                      }))}
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

                  <FormField label="Fabric Composition">
                    <Input
                      value={fabric}
                      onChange={(e) => setFabric(e.target.value)}
                      placeholder="e.g. 380 GSM 100% Combed Cotton Fleece"
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
                      placeholder="e.g. CST-2026-001"
                    />
                  </FormField>

                  <FormField label="Linked Commercial Quotation">
                    <Input
                      value={quotationId}
                      onChange={(e) => setQuotationId(e.target.value)}
                      placeholder="e.g. QT-2026-001"
                    />
                  </FormField>

                  <FormField label="Customization & Embellishment Notes" className="col-span-2">
                    <Textarea
                      rows={2}
                      value={customizationNotes}
                      onChange={(e) => setCustomizationNotes(e.target.value)}
                      placeholder="Embroidery artwork placement, screenprint inks, silicon wash instructions, damask neck tags..."
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Section C: Quantity & Commercial Pricing */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="C. Quantities & Commercial Pricing Calculation"
                  description="Batch order quantity, agreed FOB unit price, commercial discounts, taxes, and contract total."
                >
                  <FormField label="Order Quantity (Pcs)" required error={formErrors.quantity}>
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
                      prefix={CURRENCY_SYMBOLS[currency]}
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
                      prefix={CURRENCY_SYMBOLS[currency]}
                      placeholder="0.00"
                    />
                  </FormField>

                  <FormField label="Additional Freight / Process Charges">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(e.target.value)}
                      prefix={CURRENCY_SYMBOLS[currency]}
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
                      prefix={CURRENCY_SYMBOLS[currency]}
                      placeholder="0.00"
                    />
                  </FormField>

                  {/* Real-time Commercial Total Display */}
                  <div className="col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[11px] font-medium text-slate-500">Subtotal:</span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {CURRENCY_SYMBOLS[currency]}{calculatedPricing.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-500">Discount:</span>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">
                        -{CURRENCY_SYMBOLS[currency]}{calculatedPricing.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-500">Additions & Tax:</span>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">
                        +{CURRENCY_SYMBOLS[currency]}{(calculatedPricing.additionalCharges + calculatedPricing.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-blue-700 uppercase">Grand Contract Total:</span>
                      <p className="text-base font-extrabold text-blue-700 mt-0.5">
                        {CURRENCY_SYMBOLS[currency]}{calculatedPricing.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </FormSection>
              </Card>

              {/* Section D: Delivery & Production Planning */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="D. Delivery Schedules & Manufacturing Planning"
                  description="Target delivery dates, factory start timeline, and production stage tracking."
                >
                  <FormField label="Target Delivery Date" required error={formErrors.targetDeliveryDate}>
                    <Input
                      type="date"
                      value={targetDeliveryDate}
                      onChange={(e) => {
                        setTargetDeliveryDate(e.target.value);
                        if (formErrors.targetDeliveryDate) setFormErrors((prev) => ({ ...prev, targetDeliveryDate: "" }));
                      }}
                      error={!!formErrors.targetDeliveryDate}
                    />
                  </FormField>

                  <FormField label="Requested Port Dispatch Date">
                    <Input
                      type="date"
                      value={requestedShipDate}
                      onChange={(e) => setRequestedShipDate(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Planned Production Start Date" error={formErrors.productionStartDate}>
                    <Input
                      type="date"
                      value={productionStartDate}
                      onChange={(e) => {
                        setProductionStartDate(e.target.value);
                        if (formErrors.productionStartDate) setFormErrors((prev) => ({ ...prev, productionStartDate: "" }));
                      }}
                      error={!!formErrors.productionStartDate}
                    />
                  </FormField>

                  <FormField label="Production Stage">
                    <Select
                      value={productionStage}
                      onChange={(e) => setProductionStage(e.target.value as ProductionStage)}
                      options={PRODUCTION_STAGES.map((s) => ({ value: s, label: s }))}
                    />
                  </FormField>

                  <FormField label="Assigned Production Job Ref">
                    <Input
                      value={productionJobId}
                      onChange={(e) => setProductionJobId(e.target.value)}
                      placeholder="e.g. PRD-2026-001"
                    />
                  </FormField>
                </FormSection>
              </Card>

              {/* Section E: Payment & Commercial Terms */}
              <Card className="p-5 sm:p-6 border-slate-200/80 shadow-xs">
                <FormSection
                  title="E. Payment Milestones & Commercial Shipping Terms"
                  description="Settlement conditions, incoterms, port destinations, and buyer PO references."
                >
                  <FormField label="Payment Settlement Terms" required>
                    <Input
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      placeholder="e.g. 30% Advance TT / 70% before BL Release"
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
                        { value: "EXW Factory", label: "EXW Factory" },
                      ]}
                    />
                  </FormField>

                  <FormField label="Shipping Mode">
                    <Select
                      value={shippingMethod}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      options={[
                        { value: "Air Cargo", label: "Air Cargo (Standard / Express)" },
                        { value: "Sea Freight (FCL)", label: "Sea Freight (Full Container)" },
                        { value: "Sea Freight (LCL)", label: "Sea Freight (Consolidated)" },
                        { value: "Courier (DHL/FedEx)", label: "International Courier" },
                      ]}
                    />
                  </FormField>

                  <FormField label="Destination Port / Logistics Terminal">
                    <Input
                      value={destinationPort}
                      onChange={(e) => setDestinationPort(e.target.value)}
                      placeholder="e.g. London Heathrow Logistics Hub"
                    />
                  </FormField>

                  <FormField label="Buyer External PO Reference #">
                    <Input
                      value={buyerPoRef}
                      onChange={(e) => setBuyerPoRef(e.target.value)}
                      placeholder="e.g. PO-UK-88219"
                    />
                  </FormField>

                  <FormField label="Payment Status">
                    <Select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                      options={[
                        { value: "pending", label: "Unpaid / Pending" },
                        { value: "partially_paid", label: "Partially Paid" },
                        { value: "paid", label: "Fully Settled" },
                        { value: "overdue", label: "Overdue" },
                        { value: "on_hold", label: "Credit Hold" },
                      ]}
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
                  onClick={() => setViewMode(selectedOrderId ? "detail" : "list")}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={(e) => handleSaveOrder(e, true)}
                >
                  Save Draft
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                >
                  {editingInternalId ? "Update Sales Order" : "Confirm & Book Order"}
                </Button>
              </div>
            </form>
          </div>
        ) : viewMode === "detail" && activeOrder ? (
          /* ============================================================
             VIEW 2: SALES ORDER DETAIL VIEW (7 SUB-TABS & RELATIONSHIPS)
             ============================================================ */
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Detail Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back to Orders List"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                      {activeOrder.orderNumber}
                    </h1>
                    <span className="text-sm font-semibold text-slate-700 truncate">
                      • {activeOrder.clientName}
                    </span>
                    <Badge variant={STATUS_CONFIG[activeOrder.orderStatus]?.variant || "default"} dot>
                      {STATUS_CONFIG[activeOrder.orderStatus]?.label || activeOrder.orderStatus}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      {activeOrder.styleName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-blue-700 font-bold">
                      {activeOrder.quantity.toLocaleString()} Pcs
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {activeOrder.clientCountry}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
                {/* Stage Quick Switcher */}
                <select
                  value={activeOrder.productionStage}
                  onChange={(e) => handleUpdateProductionStage(activeOrder, e.target.value as ProductionStage)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer shadow-2xs focus:outline-none"
                  title="Update Manufacturing Stage"
                >
                  {PRODUCTION_STAGES.map((s) => (
                    <option key={s} value={s}>Stage: {s}</option>
                  ))}
                </select>

                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Copy className="h-4 w-4" />}
                  onClick={() => handleDuplicateOrder(activeOrder)}
                >
                  Duplicate
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  leftIcon={<Edit className="h-4 w-4" />}
                  onClick={() => handleOpenEdit(activeOrder)}
                >
                  Edit Order
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => handleRequestDelete(activeOrder)}
                >
                  Delete / Archive
                </Button>
              </div>
            </div>

            {/* Top 6 Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Order Units</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{activeOrder.quantity.toLocaleString()} Pcs</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{activeOrder.styleCode}</p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Unit Price</span>
                <p className="text-lg font-bold text-blue-700 mt-0.5">
                  {CURRENCY_SYMBOLS[activeOrder.currency]}{activeOrder.unitPrice.toFixed(2)}
                </p>
                <p className="text-[11px] text-blue-600 mt-0.5">FOB agreed rate</p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contract Total</span>
                <p className="text-lg font-bold text-emerald-700 mt-0.5 truncate">
                  {CURRENCY_SYMBOLS[activeOrder.currency]}{activeOrder.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Gross order revenue</p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Production Stage</span>
                <p className="text-sm font-bold text-purple-700 mt-1 truncate">{activeOrder.productionStage}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{activeOrder.productionJobId || "No job linked"}</p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Delivery Target</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{activeOrder.targetDeliveryDate}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{activeOrder.incoterms}</p>
              </Card>

              <Card className="p-3.5 border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Payment Status</span>
                <div className="mt-1">
                  <Badge variant={PAYMENT_STATUS_CONFIG[activeOrder.paymentStatus]?.variant || "warning"} dot>
                    {PAYMENT_STATUS_CONFIG[activeOrder.paymentStatus]?.label || activeOrder.paymentStatus}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">{activeOrder.paymentTerms}</p>
              </Card>
            </div>

            {/* Profile Tabs Navigation */}
            <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
              {[
                { id: "overview", label: "Overview & Commercial", icon: Building2 },
                { id: "production", label: "Production & Floor", icon: Factory },
                { id: "costing", label: "Cost Estimate BOM", icon: Calculator },
                { id: "quotation", label: "Export Quotation", icon: FileText },
                { id: "invoices", label: "Invoices & Settlement", icon: Receipt },
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

            {/* Tab Contents */}
            {detailTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Buyer & Commercial Profile */}
                <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Buyer & Commercial Conditions
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Buyer / Brand</span>
                      <p className="font-bold text-slate-900 mt-0.5">{activeOrder.clientName}</p>
                      <span className="text-[10px] text-blue-600 font-mono">{activeOrder.clientDisplayId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Country / Market</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeOrder.clientCountry}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Primary Contact</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeOrder.clientContact || "—"}</p>
                      <p className="text-[10px] text-slate-500">{activeOrder.clientEmail || ""}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Order Contract Type</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeOrder.orderType}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-medium">Payment Settlement Terms</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeOrder.paymentTerms}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Incoterms</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{activeOrder.incoterms}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Buyer PO Ref</span>
                      <p className="font-semibold text-slate-900 mt-0.5 font-mono">{activeOrder.buyerPoRef || "—"}</p>
                    </div>
                  </div>
                </Card>

                {/* Garment Specifications */}
                <Card className="p-5 space-y-4 border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Garment & Product Breakdown
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Garment Style:</span>
                      <span className="font-bold text-slate-900">{activeOrder.styleName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fabric & Blend:</span>
                      <span className="font-medium text-slate-800">{activeOrder.fabric || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">GSM Weight:</span>
                      <span className="font-medium text-slate-800">{activeOrder.gsm || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Colorway / Dye Lot:</span>
                      <span className="font-medium text-slate-800">{activeOrder.color || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Size Matrix:</span>
                      <span className="font-mono text-slate-800">{activeOrder.sizeRange || "—"}</span>
                    </div>

                    {activeOrder.customizationNotes && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs mt-2">
                        <span className="font-bold text-slate-700">Artwork & Customization:</span>
                        <p className="text-slate-600 mt-0.5">{activeOrder.customizationNotes}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Tab: Production */}
            {detailTab === "production" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Manufacturing Floor & Job Tracking
                    </h3>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                    {activeOrder.productionJobId || "PRD-UNLINKED"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Planned Batch Quantity:</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">{activeOrder.quantity.toLocaleString()} Pcs</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Current Production Stage:</span>
                    <p className="text-base font-bold text-purple-700 mt-0.5">{activeOrder.productionStage}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Floor Start Date:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{activeOrder.productionStartDate || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Target Delivery:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{activeOrder.targetDeliveryDate}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-blue-50/50 border border-blue-200 text-xs text-blue-900 flex justify-between items-center">
                  <span>
                    Linked Production Job: <strong>{activeOrder.productionJobId || "PRD-2026-001"}</strong>
                  </span>
                  <a href="/production" className="font-semibold text-blue-700 hover:underline flex items-center gap-1">
                    Open Production Floor <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
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
                    {activeOrder.costEstimateId || "CST-UNLINKED"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">FOB Selling Price / pc:</span>
                    <p className="text-base font-bold text-blue-700 mt-0.5">
                      {CURRENCY_SYMBOLS[activeOrder.currency]}{activeOrder.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Contract Value:</span>
                    <p className="text-base font-bold text-emerald-700 mt-0.5">
                      {CURRENCY_SYMBOLS[activeOrder.currency]}{activeOrder.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Pricing Model:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">25% Gross Margin</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Approval Status:</span>
                    <Badge variant="success" dot className="mt-1">Approved BOM</Badge>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                  <span>
                    Linked Cost Sheet: <strong>{activeOrder.costEstimateId || "CST-2026-001"}</strong>
                  </span>
                  <a href="/costing" className="font-semibold text-blue-700 hover:underline flex items-center gap-1">
                    Open Costing Studio <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Card>
            )}

            {/* Tab: Quotation */}
            {detailTab === "quotation" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Commercial Export Quotation Proposal
                    </h3>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                    {activeOrder.quotationId || "No quotation linked"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Quotation Proposal Value:</span>
                    <p className="text-base font-bold text-purple-700 mt-0.5">
                      {CURRENCY_SYMBOLS[activeOrder.currency]}{activeOrder.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Quoted Quantity:</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">{activeOrder.quantity.toLocaleString()} Pcs</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Commercial Term:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{activeOrder.incoterms}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Status:</span>
                    <Badge variant="success" dot className="mt-1">Accepted by Buyer</Badge>
                  </div>
                </div>

                {activeOrder.quotationId ? (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                    <span>Formal export proposal accepted by {activeOrder.clientName}.</span>
                    <a href="/quotations" className="font-semibold text-blue-700 hover:underline flex items-center gap-1">
                      View Quotations <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No previous formal quotation linked to this order.</p>
                )}
              </Card>
            )}

            {/* Tab: Invoices */}
            {detailTab === "invoices" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Commercial Invoices & Accounts Receivable
                    </h3>
                  </div>
                  <Badge variant={PAYMENT_STATUS_CONFIG[activeOrder.paymentStatus]?.variant || "warning"} dot>
                    {PAYMENT_STATUS_CONFIG[activeOrder.paymentStatus]?.label || activeOrder.paymentStatus}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Total Contract Value:</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {CURRENCY_SYMBOLS[activeOrder.currency]}{activeOrder.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Payment Terms:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{activeOrder.paymentTerms}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Settled Invoices:</span>
                    <p className="font-mono text-slate-900 font-bold mt-0.5">
                      {activeOrder.invoiceIds && activeOrder.invoiceIds.length > 0 ? activeOrder.invoiceIds.join(", ") : "Pending Billing"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Billing Action:</span>
                    <a href="/invoices" className="text-xs font-semibold text-blue-700 hover:underline block mt-0.5">
                      Open Invoices Module →
                    </a>
                  </div>
                </div>
              </Card>
            )}

            {/* Tab: Shipping / Tracking */}
            {detailTab === "shipping" && (
              <Card className="p-5 border-slate-200/80 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Export Logistics & Shipment Tracking
                    </h3>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                    {activeOrder.trackingNumber ? activeOrder.trackingNumber : "Not Assigned"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Transport Method:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{activeOrder.shippingMethod || "Air Cargo"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Destination Port / Hub:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{activeOrder.destinationPort || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Target Delivery Date:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{activeOrder.targetDeliveryDate}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Tracking Reference:</span>
                    <p className="font-mono text-blue-700 font-bold mt-0.5">
                      {activeOrder.trackingNumber ? activeOrder.trackingNumber : "Not Assigned"}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-200 text-xs flex justify-between items-center">
                  <span>Real-time logistics monitoring via FactoryOS Tracking Engine.</span>
                  <a href="/tracking" className="font-semibold text-indigo-700 hover:underline flex items-center gap-1">
                    Open Tracking Module <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Card>
            )}

            {/* Tab: Activity Timeline */}
            {detailTab === "timeline" && (
              <Card className="p-5 border-slate-200/80 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
                  Order Event & Audit Timeline
                </h3>
                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {!activeOrder.timeline || activeOrder.timeline.length === 0 ? (
                    <p className="text-xs text-slate-400 pl-8">No recorded activity yet.</p>
                  ) : (
                    activeOrder.timeline.map((evt) => (
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
             VIEW 3: SALES ORDERS DASHBOARD & MAIN DATA TABLE
             ============================================================ */
          <div className="space-y-6 min-w-0 w-full">
            {/* Page Header */}
            <PageHeader
              title="Sales Orders"
              description="Manage confirmed buyer orders, production commitments, delivery schedules, values, and order progress."
              actions={
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={<RefreshCw className={`h-4 w-4 ${loadingOrders ? "animate-spin" : ""}`} />}
                    onClick={() => loadOrders(true)}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={handleOpenCreate}
                  >
                    Create Order
                  </Button>
                </div>
              }
            />

            {/* 5 Dynamic KPI Cards */}
            <CardGrid columns={5}>
              <StatCard
                label="Total Orders"
                value={String(totalOrdersCount)}
                sub="Confirmed buyer contracts"
                icon={<ClipboardList className="h-5 w-5" />}
                iconColor="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Active Orders"
                value={String(activeOrdersCount)}
                sub="Live in system"
                icon={<Building2 className="h-5 w-5" />}
                iconColor="bg-indigo-50 text-indigo-600"
              />
              <StatCard
                label="In Production"
                value={String(inProductionCount)}
                sub="Cutting / Sewing / QA"
                icon={<Factory className="h-5 w-5" />}
                iconColor="bg-amber-50 text-amber-600"
              />
              <StatCard
                label="Completed / Shipped"
                value={String(completedCount)}
                sub="Dispatched orders"
                icon={<Truck className="h-5 w-5" />}
                iconColor="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                label="Total Order Value"
                value={`$${(totalOrderValueSum / 1000).toFixed(1)}k`}
                sub="Active pipeline revenue"
                icon={<DollarSign className="h-5 w-5" />}
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
                    placeholder="Search by order # (ORD-2026-001), buyer, style, production job, country..."
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
                    <option value="confirmed">Confirmed</option>
                    <option value="in_production">In Production</option>
                    <option value="qa">QA Inspection</option>
                    <option value="packed">Packed</option>
                    <option value="shipped">Shipped</option>
                    <option value="completed">Completed</option>
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

                  {/* Stage */}
                  <select
                    value={stageFilter}
                    onChange={(e) => {
                      setStageFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Stages</option>
                    {PRODUCTION_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {/* Payment */}
                  <select
                    value={paymentFilter}
                    onChange={(e) => {
                      setPaymentFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-2 text-xs rounded-lg border border-[var(--color-erp-border)] bg-[var(--color-erp-surface)] text-[var(--color-erp-text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Payments</option>
                    <option value="pending">Pending / Unpaid</option>
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
                    <option value="orderDate">Sort: Order Date</option>
                    <option value="deliveryDate">Sort: Delivery Date</option>
                    <option value="highValue">Sort: Highest Order Value</option>
                    <option value="lowValue">Sort: Lowest Order Value</option>
                    <option value="clientName">Sort: Client Name (A-Z)</option>
                  </select>

                  {(searchQuery ||
                    statusFilter !== "all" ||
                    clientFilter !== "all" ||
                    countryFilter !== "all" ||
                    orderTypeFilter !== "all" ||
                    stageFilter !== "all" ||
                    paymentFilter !== "all" ||
                    sortBy !== "recent") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setClientFilter("all");
                        setCountryFilter("all");
                        setOrderTypeFilter("all");
                        setStageFilter("all");
                        setPaymentFilter("all");
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

            {/* Main Orders Table */}
            <Card noPadding className="border-[var(--color-erp-border)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-xs text-left min-w-[1200px]">
                  <thead className="bg-[var(--color-erp-surface-2)] text-[var(--color-erp-text-muted)] font-semibold border-b border-[var(--color-erp-border)] uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">ORDER #</th>
                      <th className="py-3 px-4">CLIENT / BRAND</th>
                      <th className="py-3 px-4">STYLE / PRODUCT</th>
                      <th className="py-3 px-4">ORDER DATE</th>
                      <th className="py-3 px-4 text-right">QTY</th>
                      <th className="py-3 px-4 text-right">UNIT PRICE</th>
                      <th className="py-3 px-4 text-right">ORDER VALUE</th>
                      <th className="py-3 px-4">DELIVERY DATE</th>
                      <th className="py-3 px-4 text-center">PRODUCTION STAGE</th>
                      <th className="py-3 px-4 text-center">PAYMENT STATUS</th>
                      <th className="py-3 px-4 text-center">ORDER STATUS</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-erp-border)]">
                    {paginatedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-0">
                          <EmptyState
                            icon={<ClipboardList className="h-6 w-6 text-blue-600" />}
                            title="No sales orders found"
                            description={
                              searchQuery || statusFilter !== "all" || clientFilter !== "all"
                                ? "No customer orders match your search filters. Click Reset to clear filters."
                                : "Create customer production orders from confirmed buyer quotations to schedule fabric, cutting, and export delivery."
                            }
                            actionLabel="Create Order"
                            actionIcon={<Plus className="h-4 w-4" />}
                            onAction={handleOpenCreate}
                          />
                        </td>
                      </tr>
                    ) : (
                      paginatedOrders.map((order) => {
                        const statusConfig = STATUS_CONFIG[order.orderStatus] || {
                          label: order.orderStatus,
                          variant: "default",
                        };
                        const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus] || {
                          label: order.paymentStatus,
                          variant: "warning",
                        };

                        return (
                          <tr
                            key={order.id}
                            className="hover:bg-[var(--color-erp-surface-2)]/50 transition-colors"
                          >
                            {/* Order # */}
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(order)}
                                className="hover:underline cursor-pointer text-left"
                                title="View full order profile"
                              >
                                {order.orderNumber}
                              </button>
                            </td>

                            {/* Client / Brand */}
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{order.clientName}</div>
                              <span className="text-[10px] text-slate-400">{order.clientCountry}</span>
                            </td>

                            {/* Style / Product */}
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900">{order.styleName}</div>
                              <span className="text-[10px] text-slate-500 font-mono">{order.styleCode}</span>
                            </td>

                            {/* Order Date */}
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {order.orderDate}
                            </td>

                            {/* Quantity */}
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              {order.quantity.toLocaleString()} Pcs
                            </td>

                            {/* Unit Price */}
                            <td className="py-3 px-4 text-right font-medium text-slate-700">
                              {CURRENCY_SYMBOLS[order.currency]}{order.unitPrice.toFixed(2)}
                            </td>

                            {/* Order Value */}
                            <td className="py-3 px-4 text-right font-bold text-emerald-700">
                              {CURRENCY_SYMBOLS[order.currency]}{order.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            {/* Delivery Date */}
                            <td className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">
                              {order.targetDeliveryDate}
                            </td>

                            {/* Production Stage */}
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[10px]">
                                {order.productionStage}
                              </span>
                            </td>

                            {/* Payment Status */}
                            <td className="py-3 px-4 text-center">
                              <Badge variant={paymentConfig.variant} dot>
                                {paymentConfig.label}
                              </Badge>
                            </td>

                            {/* Order Status */}
                            <td className="py-3 px-4 text-center">
                              <Badge variant={statusConfig.variant} dot>
                                {statusConfig.label}
                              </Badge>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetail(order)}
                                  title="View order details"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(order)}
                                  title="Edit order"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicateOrder(order)}
                                  title="Duplicate order"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => handleRequestDelete(order)}
                                  className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete / Archive order"
                                  aria-label={`Delete ${order.orderNumber}`}
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
                total={sortedOrders.length}
                onPageChange={setPage}
              />
            </Card>
          </div>
        )}
      </div>

      {/* Safety Alert Modal: Order has Linked Records -> Archive Instead */}
      <Modal
        isOpen={!!archiveModalOrder}
        onClose={() => setArchiveModalOrder(null)}
        title="Archive Sales Order"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Linked Transactions Protection:</strong>
              <p className="mt-1 text-amber-800">
                Sales Order <strong>{archiveModalOrder?.orderNumber} ({archiveModalOrder?.clientName})</strong> has active factory floor connections (
                {archiveModalOrder?.productionJobId ? `Production Job: ${archiveModalOrder.productionJobId}, ` : ""}
                {archiveModalOrder?.costEstimateId ? `Costing BOM: ${archiveModalOrder.costEstimateId}, ` : ""}
                {archiveModalOrder?.quotationId ? `Quotation: ${archiveModalOrder.quotationId}, ` : ""}
                {archiveModalOrder?.invoiceIds && archiveModalOrder.invoiceIds.length > 0 ? `Invoices: ${archiveModalOrder.invoiceIds.join(", ")}` : ""}
                ).
              </p>
              <p className="mt-1.5 text-amber-800 font-medium">
                To maintain historical accounting and audit compliance, this order cannot be permanently deleted. Archive the order instead to mark it inactive while preserving all audit links.
              </p>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setArchiveModalOrder(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Archive className="h-4 w-4" />}
              onClick={handleConfirmArchive}
            >
              Archive Sales Order
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Confirmation Dialog: Permanent Delete (Only for orders without active dependencies) */}
      <ConfirmDialog
        isOpen={!!orderToDelete}
        onClose={() => setOrderToDelete(null)}
        onConfirm={handleConfirmPermanentDelete}
        title={`Permanently Delete Order ${orderToDelete?.orderNumber || ""}?`}
        description={`Are you sure you want to delete sales order ${orderToDelete?.orderNumber} (${orderToDelete?.styleName})? This contract has no active floor or billing dependencies and will be permanently removed.`}
        confirmLabel="Delete Order"
        cancelLabel="Keep Order"
        destructive
      />
    </>
  );
}

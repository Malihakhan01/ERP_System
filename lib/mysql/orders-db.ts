/**
 * FactoryOS Garment ERP — Orders MySQL 8 Repository
 * Complete CRUD & Metrics for Sales Orders.
 */

import { executeQuery, MySQL } from "./db";
import type { OrderRecord, OrderStatus, OrderType, ProductionStage, OrderPriority, PaymentStatus, CommercialCurrency } from "@/lib/orders-engine";

export async function getOrdersFromMySQL(): Promise<OrderRecord[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `orders` WHERE `is_archived` = 0 ORDER BY `created_at` DESC"
  );

  return rows.map((r) => {
    let timeline: any[] = [];
    try {
      if (r.special_instructions && r.special_instructions.startsWith("{")) {
        const parsed = JSON.parse(r.special_instructions);
        if (parsed.timeline) timeline = parsed.timeline;
      }
    } catch {
      // fallback
    }

    if (timeline.length === 0) {
      timeline = [
        {
          id: `evt_ord_${r.id}`,
          title: "Order Contract Registered",
          description: `Contract ${r.order_number} confirmed for ${r.client_name}.`,
          timestamp: new Date(r.created_at || Date.now()).toISOString().replace("T", " ").substring(0, 19),
          author: "Sales Merchandiser",
        },
      ];
    }

    return {
      id: String(r.id),
      orderNumber: r.order_number,
      clientId: String(r.client_id),
      clientDisplayId: r.client_display_id || `CLT-2026-${String(r.client_id).padStart(3, "0")}`,
      clientName: r.client_name,
      clientCountry: r.client_country || "United Kingdom",
      clientCity: r.client_city || undefined,
      clientContact: r.client_contact || undefined,
      clientEmail: r.client_email || undefined,
      orderDate: r.order_date ? new Date(r.order_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      targetDeliveryDate: r.delivery_deadline ? new Date(r.delivery_deadline).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      requestedShipDate: undefined,
      productionStartDate: undefined,
      orderType: (r.order_type || "Export Bulk Production") as OrderType,
      currency: (r.currency || "PKR") as CommercialCurrency,
      priority: (r.priority || "normal") as OrderPriority,
      orderStatus: (r.status || "confirmed") as OrderStatus,
      productionStage: (r.production_stage || "Order Confirmed") as ProductionStage,
      paymentStatus: (r.payment_status || "pending") as PaymentStatus,
      productId: r.product_id ? String(r.product_id) : undefined,
      styleCode: r.style_code,
      styleName: r.style_name,
      productCategory: r.product_category || "Hoodies & Sweatshirts",
      description: r.special_instructions && !r.special_instructions.startsWith("{") ? r.special_instructions : undefined,
      fabric: r.fabric_details || "100% Cotton Fleece",
      gsm: r.target_gsm || "320 GSM",
      color: r.colorway || "Black / Navy",
      sizeRange: "XS, S, M, L, XL, 2XL",
      customizationNotes: undefined,
      quantity: Number(r.quantity) || 0,
      unitPrice: Number(r.unit_price) || 0,
      subtotal: Number(r.subtotal) || 0,
      discount: Number(r.discount) || 0,
      additionalCharges: Number(r.additional_charges) || 0,
      tax: Number(r.tax) || 0,
      totalValue: Number(r.total_value) || 0,
      paymentTerms: r.payment_terms || "30% Advance TT / 70% LC at Sight",
      incoterms: r.incoterms || "FOB Sialkot Dry Port",
      shippingMethod: r.shipping_method || "Sea Freight (FCL)",
      destinationPort: r.destination_port || "Hamburg Port, Germany",
      buyerPoRef: r.buyer_po_ref || undefined,
      costEstimateId: undefined,
      quotationId: undefined,
      productionJobId: undefined,
      invoiceIds: [],
      trackingNumber: undefined,
      timeline,
      isArchived: Boolean(r.is_archived),
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
    };
  });
}

export async function getOrderByIdFromMySQL(id: string): Promise<OrderRecord | null> {
  const rows = await executeQuery<any>("SELECT * FROM `orders` WHERE `id` = ?", [id]);
  if (!rows || rows.length === 0) return null;
  const orders = await getOrdersFromMySQL();
  return orders.find((o) => o.id === String(id)) || null;
}

export async function createOrderInMySQL(data: Partial<OrderRecord>): Promise<string> {
  const maxRows = await executeQuery<any>("SELECT COALESCE(MAX(id), 0) as max_id FROM `orders`");
  const nextNum = (maxRows[0]?.max_id || 0) + 1;
  const orderNumber = data.orderNumber || `ORD-2026-${String(nextNum).padStart(3, "0")}`;

  const quantity = Number(data.quantity) || 1000;
  const unitPrice = Number(data.unitPrice) || 12.5;
  const subtotal = quantity * unitPrice;
  const discount = Number(data.discount) || 0;
  const additionalCharges = Number(data.additionalCharges) || 0;
  const tax = Number(data.tax) || 0;
  const totalValue = data.totalValue || (subtotal - discount + additionalCharges + tax);

  const insertId = await MySQL.insert("orders", {
    uuid: crypto.randomUUID(),
    order_number: orderNumber,
    client_id: data.clientId ? Number(data.clientId) : 1,
    product_id: data.productId ? Number(data.productId) : null,
    client_name: data.clientName || "Apparel Brand Inc",
    client_country: data.clientCountry || "United Kingdom",
    style_code: data.styleCode || "HD-001",
    style_name: data.styleName || "Essential Heavyweight Hoodie",
    product_category: data.productCategory || "Hoodies & Sweatshirts",
    order_date: data.orderDate || new Date().toISOString().split("T")[0],
    delivery_deadline: data.targetDeliveryDate || new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
    order_type: data.orderType || "Export Bulk Production",
    currency: data.currency || "PKR",
    priority: data.priority || "normal",
    status: data.orderStatus || "confirmed",
    production_stage: data.productionStage || "Order Confirmed",
    payment_status: data.paymentStatus || "pending",
    fabric_details: data.fabric || "100% Combed Cotton Fleece",
    target_gsm: data.gsm || "360 GSM",
    colorway: data.color || "Black / Heather Grey",
    quantity,
    unit_price: unitPrice,
    subtotal,
    discount,
    additional_charges: additionalCharges,
    tax,
    total_value: totalValue,
    payment_terms: data.paymentTerms || "30% Advance TT / 70% LC at Sight",
    incoterms: data.incoterms || "FOB Sialkot Dry Port",
    shipping_method: data.shippingMethod || "Sea Freight (FCL)",
    destination_port: data.destinationPort || "Hamburg Port, Germany",
    buyer_po_ref: data.buyerPoRef || null,
    special_instructions: data.description || null,
    is_archived: 0,
  });

  return String(insertId);
}

export async function updateOrderInMySQL(id: string, data: Partial<OrderRecord>): Promise<boolean> {
  const payload: Record<string, any> = {};

  if (data.orderStatus) payload.status = data.orderStatus;
  if (data.productionStage) payload.production_stage = data.productionStage;
  if (data.paymentStatus) payload.payment_status = data.paymentStatus;
  if (data.targetDeliveryDate) payload.delivery_deadline = data.targetDeliveryDate;
  if (data.quantity !== undefined) payload.quantity = data.quantity;
  if (data.unitPrice !== undefined) payload.unit_price = data.unitPrice;
  if (data.totalValue !== undefined) payload.total_value = data.totalValue;
  if (data.styleCode) payload.style_code = data.styleCode;
  if (data.styleName) payload.style_name = data.styleName;
  if (data.fabric) payload.fabric_details = data.fabric;
  if (data.gsm) payload.target_gsm = data.gsm;
  if (data.color) payload.colorway = data.color;
  if (data.shippingMethod) payload.shipping_method = data.shippingMethod;
  if (data.destinationPort) payload.destination_port = data.destinationPort;
  if (data.buyerPoRef) payload.buyer_po_ref = data.buyerPoRef;
  if (data.isArchived !== undefined) payload.is_archived = data.isArchived ? 1 : 0;

  return MySQL.update("orders", id, payload);
}

export async function updateOrderStatusInMySQL(id: string, status: string, stage?: string): Promise<boolean> {
  const payload: Record<string, any> = { status };
  if (stage) payload.production_stage = stage;
  return MySQL.update("orders", id, payload);
}

export async function deleteOrderInMySQL(id: string): Promise<boolean> {
  return MySQL.delete("orders", id, true);
}

export async function getOrderMetricsFromMySQL() {
  const orders = await getOrdersFromMySQL();
  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) => o.orderStatus !== "completed" && o.orderStatus !== "cancelled").length;
  const inProduction = orders.filter((o) => o.productionStage !== "Order Confirmed" && o.productionStage !== "Completed" && o.productionStage !== "Shipped").length;
  const completed = orders.filter((o) => o.orderStatus === "completed" || o.productionStage === "Completed" || o.productionStage === "Shipped").length;
  const totalOrderValue = orders.reduce((acc, o) => acc + (o.totalValue || 0), 0);

  return {
    totalOrders,
    activeOrders,
    inProduction,
    completed,
    totalOrderValue,
  };
}

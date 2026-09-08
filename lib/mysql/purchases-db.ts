/**
 * FactoryOS Garment ERP — Purchases & Procurement MySQL 8 Repository
 * Connects /purchases with live MySQL `purchases` table.
 */

import { executeQuery, MySQL } from "./db";
import type { PurchaseOrder } from "@/lib/services/purchases-service";

export async function getPurchasesFromMySQL(): Promise<PurchaseOrder[]> {
  const rows = await executeQuery<any>(
    "SELECT * FROM `purchases` WHERE `is_archived` = 0 ORDER BY `created_at` DESC"
  );

  return rows.map((r) => ({
    id: String(r.id),
    poNumber: r.po_number,
    supplier: r.supplier,
    orderDate: r.order_date ? new Date(r.order_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    expectedDate: r.expected_date ? new Date(r.expected_date).toISOString().split("T")[0] : new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    material: r.material,
    materialId: r.material_id ? String(r.material_id) : undefined,
    quantity: String(r.quantity || "0"),
    unit: r.unit || "kg",
    rate: String(r.rate || "0"),
    totalAmount: Number(r.total_amount || 0),
    paidAmount: Number(r.paid_amount || 0),
    balance: Number(r.balance || 0),
    paymentTerms: (r.payment_terms || "adv_50") as any,
    status: (r.status || "draft") as any,
    isArchived: Boolean(r.is_archived),
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  }));
}

export async function getPurchaseByIdFromMySQL(id: string): Promise<PurchaseOrder | null> {
  const rows = await executeQuery<any>("SELECT * FROM `purchases` WHERE `id` = ?", [id]);
  if (!rows || rows.length === 0) return null;
  const list = await getPurchasesFromMySQL();
  return list.find((p) => p.id === String(id)) || null;
}

export async function createPurchaseInMySQL(data: Partial<PurchaseOrder>): Promise<string> {
  const countRows = await executeQuery<any>("SELECT COUNT(*) as cnt FROM `purchases`");
  const nextNum = (countRows[0]?.cnt || 0) + 1;
  const poNum = data.poNumber || `PO-2026-${String(nextNum).padStart(4, "0")}`;

  const qty = Number(data.quantity) || 1000;
  const rate = Number(data.rate) || 4.2;
  const total = Number(data.totalAmount) || (qty * rate);
  const paid = Number(data.paidAmount) || 0;
  const balance = total - paid;

  const insertId = await MySQL.insert("purchases", {
    uuid: crypto.randomUUID(),
    po_number: poNum,
    supplier: data.supplier || "Al-Karam Textile Mills",
    order_date: data.orderDate || new Date().toISOString().split("T")[0],
    expected_date: data.expectedDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    material: data.material || "Cotton Fleece Yarn Lot A",
    material_id: data.materialId ? Number(data.materialId) : null,
    quantity: qty,
    unit: data.unit || "kg",
    rate,
    total_amount: total,
    paid_amount: paid,
    balance,
    payment_terms: data.paymentTerms || "adv_50",
    status: data.status || "confirmed",
    is_archived: 0,
  });

  return String(insertId);
}

export async function updatePurchaseInMySQL(id: string, data: Partial<PurchaseOrder>): Promise<boolean> {
  const payload: Record<string, any> = {};

  if (data.supplier) payload.supplier = data.supplier;
  if (data.status) payload.status = data.status;
  if (data.quantity !== undefined) payload.quantity = Number(data.quantity);
  if (data.rate !== undefined) payload.rate = Number(data.rate);
  if (data.totalAmount !== undefined) payload.total_amount = data.totalAmount;
  if (data.paidAmount !== undefined) {
    payload.paid_amount = data.paidAmount;
    if (data.totalAmount !== undefined) {
      payload.balance = data.totalAmount - data.paidAmount;
    }
  }
  if (data.isArchived !== undefined) payload.is_archived = data.isArchived ? 1 : 0;

  return MySQL.update("purchases", id, payload);
}

export async function deletePurchaseInMySQL(id: string): Promise<boolean> {
  return MySQL.delete("purchases", id, true);
}

export async function getPurchaseMetricsFromMySQL() {
  const purchases = await getPurchasesFromMySQL();
  const totalPurchasesCount = purchases.length;
  const totalPurchasesValue = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
  const totalPaidAmount = purchases.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
  const outstandingMillBalance = purchases.reduce((acc, p) => acc + (p.balance || 0), 0);
  const pendingDeliveries = purchases.filter((p) => p.status !== "received").length;

  return {
    totalPurchasesCount,
    totalPurchasesValue,
    totalPaidAmount,
    outstandingMillBalance,
    pendingDeliveries,
  };
}

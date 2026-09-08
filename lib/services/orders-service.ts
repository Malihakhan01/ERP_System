// lib/services/orders-service.ts
// MySQL 8 Database Service Layer for FactoryOS Sales Orders

import type { OrderRecord } from "../orders-engine";
import { ORDER_STORAGE_KEY, INITIAL_ORDERS } from "../orders-engine";

export async function getOrdersFromSupabase(): Promise<OrderRecord[]> {
  try {
    const res = await fetch("/api/orders");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(json.data));
      }
      return json.data;
    }
  } catch (err) {
    console.error("Error loading orders from MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return INITIAL_ORDERS;
}

export async function createOrderInSupabase(order: OrderRecord): Promise<OrderRecord> {
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      order.id = String(json.data.id);
    }
  } catch (err) {
    console.error("Error creating order via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      const list: OrderRecord[] = raw ? JSON.parse(raw) : INITIAL_ORDERS;
      const updated = [order, ...list.filter((o) => o.id !== order.id && o.orderNumber !== order.orderNumber)];
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return order;
}

export async function updateOrderInSupabase(order: OrderRecord): Promise<OrderRecord> {
  try {
    await fetch(`/api/orders/${order.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
  } catch (err) {
    console.error("Error updating order via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      const list: OrderRecord[] = raw ? JSON.parse(raw) : INITIAL_ORDERS;
      const updated = list.map((o) => (o.id === order.id || o.orderNumber === order.orderNumber ? order : o));
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return order;
}

export async function deleteOrderInSupabase(id: string, orderNumber?: string): Promise<boolean> {
  try {
    await fetch(`/api/orders/${id}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Error deleting order via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      const list: OrderRecord[] = raw ? JSON.parse(raw) : INITIAL_ORDERS;
      const updated = list.filter((o) => o.id !== id && (orderNumber ? o.orderNumber !== orderNumber : true));
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return true;
}

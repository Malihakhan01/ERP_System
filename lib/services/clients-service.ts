// lib/services/clients-service.ts
// MySQL 8 Database Service Layer for FactoryOS Clients CRM

import type { ClientRecord } from "../clients-engine";
import { CLIENT_STORAGE_KEY, INITIAL_CLIENTS } from "../clients-engine";

export async function getClientsFromSupabase(): Promise<ClientRecord[]> {
  try {
    const res = await fetch("/api/clients");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(json.data));
      }
      return json.data;
    }
  } catch (err) {
    console.error("Error fetching clients from MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CLIENT_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return INITIAL_CLIENTS;
}

export async function createClientInSupabase(client: ClientRecord): Promise<ClientRecord> {
  try {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      client.id = String(json.data.id);
    }
  } catch (err) {
    console.error("Error creating client via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CLIENT_STORAGE_KEY);
      const list: ClientRecord[] = raw ? JSON.parse(raw) : INITIAL_CLIENTS;
      const updated = [client, ...list.filter((c) => c.id !== client.id && c.clientId !== client.clientId)];
      localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return client;
}

export async function updateClientInSupabase(client: ClientRecord): Promise<ClientRecord> {
  try {
    await fetch(`/api/clients/${client.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client),
    });
  } catch (err) {
    console.error("Error updating client via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CLIENT_STORAGE_KEY);
      const list: ClientRecord[] = raw ? JSON.parse(raw) : INITIAL_CLIENTS;
      const updated = list.map((c) => (c.id === client.id || c.clientId === client.clientId ? client : c));
      localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return client;
}

export async function deleteClientInSupabase(id: string, clientId?: string): Promise<boolean> {
  try {
    await fetch(`/api/clients/${id}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Error deleting client via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CLIENT_STORAGE_KEY);
      const list: ClientRecord[] = raw ? JSON.parse(raw) : INITIAL_CLIENTS;
      const updated = list.filter((c) => c.id !== id && (clientId ? c.clientId !== clientId : true));
      localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return true;
}

export async function archiveClientInSupabase(id: string): Promise<boolean> {
  try {
    await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: true }),
    });
  } catch (err) {
    console.error("Error archiving client via MySQL API:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CLIENT_STORAGE_KEY);
      const list: ClientRecord[] = raw ? JSON.parse(raw) : INITIAL_CLIENTS;
      const updated = list.map((c) => (c.id === id || c.clientId === id ? { ...c, isArchived: true } : c));
      localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return true;
}

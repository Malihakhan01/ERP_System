// lib/services/advances-service.ts
// MySQL 8 Database Service Layer for FactoryOS Advances & Repayment Ledger

import type { AdvanceRecord } from "../advances-engine";
import { ADVANCE_STORAGE_KEY } from "../advances-engine";

export async function getAdvancesFromDB(): Promise<AdvanceRecord[]> {
  try {
    const res = await fetch("/api/advances");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      setLocalAdvances(json.data);
      return json.data;
    }
  } catch (err) {
    console.error("Failed to fetch advances from MySQL API:", err);
  }
  return getLocalAdvances();
}

export async function createAdvanceInDB(record: AdvanceRecord): Promise<AdvanceRecord> {
  const currentLocal = getLocalAdvances();
  const updatedLocal = [record, ...currentLocal];
  setLocalAdvances(updatedLocal);

  try {
    const res = await fetch("/api/advances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    const json = await res.json();
    if (json.success && json.data?.id) {
      record.id = String(json.data.id);
    }
  } catch (err) {
    console.error("MySQL API advance insert exception:", err);
  }

  return record;
}

export async function updateAdvanceInDB(record: AdvanceRecord): Promise<AdvanceRecord> {
  const currentLocal = getLocalAdvances();
  const updatedLocal = currentLocal.map((a) => (a.id === record.id ? record : a));
  setLocalAdvances(updatedLocal);

  try {
    await fetch(`/api/advances/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  } catch (err) {
    console.error("MySQL API advance update error:", err);
  }

  return record;
}

export async function deleteAdvanceInDB(id: string): Promise<boolean> {
  const currentLocal = getLocalAdvances();
  const updatedLocal = currentLocal.filter((a) => a.id !== id);
  setLocalAdvances(updatedLocal);

  try {
    await fetch(`/api/advances/${id}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("MySQL API advance delete error:", err);
  }

  return true;
}

function getLocalAdvances(): AdvanceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ADVANCE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalAdvances(list: AdvanceRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADVANCE_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Failed to write to local advances cache", e);
  }
}

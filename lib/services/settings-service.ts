// lib/services/settings-service.ts
// Supabase Database Service Layer for FactoryOS System Settings
// Primary source of truth: PostgreSQL `system_settings` table with offline cache fallback.

import { createClient } from "./client";
import { isSupabaseConfigured } from "./employees-service";

export interface CompanySettings {
  companyName: string;
  ntnNumber: string;
  strnNumber: string;
  currency: string;
  shift1Time: string;
  shift2Time: string;
  activeLinesCount: string;
  maxAdvancePercent: string;
  maxRepaymentMonths: string;
  invoicePrefix: string;
  quotationPrefix: string;
  bankAccount: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: "FactoryOS Garments Ltd.",
  ntnNumber: "8912401-7",
  strnNumber: "32-77-8912-401-19",
  currency: "PKR",
  shift1Time: "08:00 - 17:00",
  shift2Time: "17:00 - 01:00",
  activeLinesCount: "6",
  maxAdvancePercent: "200",
  maxRepaymentMonths: "12",
  invoicePrefix: "INV-2026-",
  quotationPrefix: "QTN-2026-",
  bankAccount: "Habib Bank Limited — A/C 019283746501",
};

export const SETTINGS_STORAGE_KEY = "factoryos_system_settings";

export async function getSystemSettingsFromSupabase(): Promise<CompanySettings> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        return raw ? { ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(raw) } : DEFAULT_COMPANY_SETTINGS;
      } catch {
        return DEFAULT_COMPANY_SETTINGS;
      }
    }
    return DEFAULT_COMPANY_SETTINGS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "company_profile")
    .maybeSingle();

  if (error || !data) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        return raw ? { ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(raw) } : DEFAULT_COMPANY_SETTINGS;
      } catch {
        return DEFAULT_COMPANY_SETTINGS;
      }
    }
    return DEFAULT_COMPANY_SETTINGS;
  }

  const settings = { ...DEFAULT_COMPANY_SETTINGS, ...(data.value || {}) };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }
  return settings;
}

export async function saveSystemSettingsInSupabase(settings: CompanySettings): Promise<CompanySettings> {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }

  if (!isSupabaseConfigured()) {
    return settings;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("system_settings")
    .upsert({
      key: "company_profile",
      value: settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" })
    .select("value")
    .single();

  if (error) {
    console.error("Error saving system settings to Supabase:", error);
    return settings;
  }

  return { ...DEFAULT_COMPANY_SETTINGS, ...(data?.value || settings) };
}

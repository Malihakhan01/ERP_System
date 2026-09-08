// lib/services/settings-service.ts
// MySQL Database Service Layer for FactoryOS System Settings
// Primary source of truth: MySQL 8 `system_settings` table via Next.js REST API with offline cache fallback.

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
  try {
    const res = await fetch("/api/settings?key=company_profile");
    const json = await res.json();
    if (json.success && json.data) {
      const merged = { ...DEFAULT_COMPANY_SETTINGS, ...json.data };
      if (typeof window !== "undefined") {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.error("Error loading settings from MySQL API:", err);
  }

  // Fallback to localStorage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) return { ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(raw) };
    } catch {}
  }
  return DEFAULT_COMPANY_SETTINGS;
}

export async function saveSystemSettingsInSupabase(settings: CompanySettings): Promise<CompanySettings> {
  // Optimistic local update
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }

  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "company_profile", value: settings }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      return { ...DEFAULT_COMPANY_SETTINGS, ...json.data };
    }
  } catch (err) {
    console.error("Error saving settings via MySQL API:", err);
  }

  return settings;
}

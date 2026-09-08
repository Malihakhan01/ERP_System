/**
 * FactoryOS Garment ERP — System Settings MySQL 8 Repository
 * Persists factory configurations, company profiles, and shifts.
 */

import { executeQuery, executeStatement } from "./db";

export interface CompanySettingsData {
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
  [key: string]: any;
}

export const DEFAULT_SETTINGS: CompanySettingsData = {
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

export async function getSystemSettingsFromMySQL(key = "company_profile"): Promise<CompanySettingsData> {
  try {
    const rows = await executeQuery<any>(
      "SELECT `value` FROM `system_settings` WHERE `key` = ? LIMIT 1",
      [key]
    );

    if (rows && rows.length > 0 && rows[0].value) {
      const val = typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value;
      return { ...DEFAULT_SETTINGS, ...val };
    }
  } catch (error) {
    console.error("[MySQL getSystemSettings Error]:", error);
  }

  return DEFAULT_SETTINGS;
}

export async function saveSystemSettingsInMySQL(
  key = "company_profile",
  value: Record<string, any>,
  updatedBy = "System Admin"
): Promise<boolean> {
  try {
    const jsonStr = JSON.stringify(value);
    await executeStatement(
      `INSERT INTO \`system_settings\` (\`key\`, \`value\`, \`updated_by\`)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`updated_by\` = VALUES(\`updated_by\`), \`updated_at\` = CURRENT_TIMESTAMP`,
      [key, jsonStr, updatedBy]
    );

    // Audit log
    try {
      await executeStatement(
        "INSERT INTO `audit_logs` (`action`, `module`, `entity_id`, `details`) VALUES (?, ?, ?, ?)",
        ["UPDATE_SYSTEM_SETTINGS", "settings", key, jsonStr]
      );
    } catch {}

    return true;
  } catch (error) {
    console.error("[MySQL saveSystemSettings Error]:", error);
    throw error;
  }
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormField, FormSection } from "@/components/forms/FormField";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  Building2,
  Factory,
  HandCoins,
  Receipt,
  Users,
  Sliders,
  Sparkles,
  CheckCircle2,
  Save,
  Key,
  ShieldCheck,
  Zap,
  RefreshCw,
} from "lucide-react";
import {
  AiSettings,
  DEFAULT_AI_SETTINGS,
  MOCKUP_STYLES,
} from "@/lib/ai-mockup-engine";
import {
  getAiSettingsFromDB,
  saveAiSettingsInDB,
} from "@/lib/services/ai-mockup-service";

import {
  getSystemSettingsFromDB,
  saveSystemSettingsInDB,
  CompanySettings,
} from "@/lib/services/settings-service";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = React.useState<
    "company" | "factory" | "advances" | "invoices" | "roles" | "ai" | "system"
  >("company");

  // Company Settings
  const [companyName, setCompanyName] = React.useState("FactoryOS Garments Ltd.");
  const [ntnNumber, setNtnNumber] = React.useState("8912401-7");
  const [strnNumber, setStrnNumber] = React.useState("32-77-8912-401-19");
  const [currency, setCurrency] = React.useState("PKR");

  // Factory Floor Settings
  const [shift1Time, setShift1Time] = React.useState("08:00 - 17:00");
  const [shift2Time, setShift2Time] = React.useState("17:00 - 01:00");
  const [activeLinesCount, setActiveLinesCount] = React.useState("6");

  // Advance Rules
  const [maxAdvancePercent, setMaxAdvancePercent] = React.useState("200");
  const [maxRepaymentMonths, setMaxRepaymentMonths] = React.useState("12");

  // Invoice & Qtn Prefixes
  const [invoicePrefix, setInvoicePrefix] = React.useState("INV-2026-");
  const [quotationPrefix, setQuotationPrefix] = React.useState("QTN-2026-");
  const [bankAccount, setBankAccount] = React.useState("Habib Bank Limited — A/C 019283746501");

  // AI Configuration State
  const [aiSettings, setAiSettings] = React.useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [isTestingAi, setIsTestingAi] = React.useState(false);
  const [aiTestMessage, setAiTestMessage] = React.useState<string | null>(null);

  const [isSaving, setIsSaving] = React.useState(false);

  // Load Settings on Mount
  React.useEffect(() => {
    // 1. Load System Settings (Company, Factory, Advances)
    getSystemSettingsFromDB().then((s) => {
      if (s) {
        if (s.companyName) setCompanyName(s.companyName);
        if (s.ntnNumber) setNtnNumber(s.ntnNumber);
        if (s.strnNumber) setStrnNumber(s.strnNumber);
        if (s.currency) setCurrency(s.currency);
        if (s.shift1Time) setShift1Time(s.shift1Time);
        if (s.shift2Time) setShift2Time(s.shift2Time);
        if (s.activeLinesCount) setActiveLinesCount(s.activeLinesCount);
        if (s.maxAdvancePercent) setMaxAdvancePercent(s.maxAdvancePercent);
        if (s.maxRepaymentMonths) setMaxRepaymentMonths(s.maxRepaymentMonths);
        if (s.invoicePrefix) setInvoicePrefix(s.invoicePrefix);
        if (s.quotationPrefix) setQuotationPrefix(s.quotationPrefix);
        if (s.bankAccount) setBankAccount(s.bankAccount);
      }
    });

    // 2. Load AI Settings
    fetch("/api/ai/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setAiSettings(data.settings);
        } else {
          getAiSettingsFromDB().then((s) => setAiSettings(s));
        }
      })
      .catch(() => getAiSettingsFromDB().then((s) => setAiSettings(s)));
  }, []);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      if (activeSection === "ai") {
        await saveAiSettingsInDB(aiSettings);
        await fetch("/api/ai/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: aiSettings }),
        });
      } else {
        const payload: CompanySettings = {
          companyName,
          ntnNumber,
          strnNumber,
          currency,
          shift1Time,
          shift2Time,
          activeLinesCount,
          maxAdvancePercent,
          maxRepaymentMonths,
          invoicePrefix,
          quotationPrefix,
          bankAccount,
        };
        await saveSystemSettingsInDB(payload);
      }

      toast({
        type: "success",
        message: "Settings Saved",
        description: "Configuration updated successfully across FactoryOS.",
      });
    } catch (err: any) {
      toast({
        type: "error",
        message: "Save Failed",
        description: err.message || "Failed to save settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Test AI Connection
  const handleTestAiConnection = async () => {
    if (!aiSettings.openaiApiKey || !aiSettings.openaiApiKey.trim()) {
      toast({ type: "warning", message: "API Key Required", description: "Enter your OpenAI secret key first." });
      return;
    }

    setIsTestingAi(true);
    setAiTestMessage(null);

    try {
      const res = await fetch("/api/ai/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: aiSettings.openaiApiKey.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAiTestMessage("✅ Connected successfully: OpenAI API validated. DALL-E 3 is ready.");
        toast({ type: "success", message: "OpenAI Connected", description: "Key verified." });
      } else {
        setAiTestMessage(`❌ Connection Failed: ${data.error || "Invalid OpenAI Secret Key."}`);
        toast({ type: "error", message: "Test Failed", description: data.error || "Invalid key." });
      }
    } catch (err: any) {
      setAiTestMessage(`❌ Network error: ${err.message}`);
    } finally {
      setIsTestingAi(false);
    }
  };

  return (
    <>
      <TopNav title="System Configuration & Preferences" />

      <div className="max-w-[1440px] mx-auto p-4 sm:p-6 space-y-6 pb-16 animate-in fade-in-0 duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Factory & System Settings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure company legal profile, production floor parameters, advance rules, invoice prefixes, and AI integrations.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => handleSaveSettings()}
            disabled={isSaving}
            leftIcon={<Save className="h-4 w-4" />}
          >
            {isSaving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Navigation Sidebar (3 cols) */}
          <div className="lg:col-span-3 space-y-1.5 min-w-0">
            {[
              { id: "company" as const, label: "Company Profile", icon: Building2, desc: "Legal entity & tax IDs" },
              { id: "factory" as const, label: "Factory & Floor", icon: Factory, desc: "Shifts, lines & tolerances" },
              { id: "advances" as const, label: "Advance Loan Rules", icon: HandCoins, desc: "Borrow limits & policies" },
              { id: "invoices" as const, label: "Invoices & Quotations", icon: Receipt, desc: "Prefixes & bank accounts" },
              { id: "roles" as const, label: "Users & Roles (RBAC)", icon: Users, desc: "Access permission matrix" },
              { id: "ai" as const, label: "AI & OpenAI Config", icon: Sparkles, desc: "DALL-E 3 API credentials" },
              { id: "system" as const, label: "System Preferences", icon: Sliders, desc: "Timezone, backups & audit" },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-start gap-3 rounded-2xl p-3.5 text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? "text-white" : "text-blue-600"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-tight">{s.label}</p>
                    <p className={`text-[10px] mt-0.5 truncate ${isActive ? "text-blue-100" : "text-slate-400"}`}>
                      {s.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Configuration Form (9 cols) */}
          <div className="lg:col-span-9 space-y-6 min-w-0">
            {/* 1. COMPANY PROFILE */}
            {activeSection === "company" && (
              <Card className="p-6 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Company & Legal Entity</h3>
                  <p className="text-xs text-slate-500">Printed on export invoices, commercial bills, and tech packs.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Company Legal Name *">
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </FormField>

                  <FormField label="National Tax Number (NTN) *">
                    <Input value={ntnNumber} onChange={(e) => setNtnNumber(e.target.value)} />
                  </FormField>

                  <FormField label="Sales Tax Registration (STRN) *">
                    <Input value={strnNumber} onChange={(e) => setStrnNumber(e.target.value)} />
                  </FormField>

                  <FormField label="Default Currency">
                    <Select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      options={[
                        { label: "PKR — Pakistani Rupee", value: "PKR" },
                        { label: "USD — US Dollar", value: "USD" },
                        { label: "EUR — Euro", value: "EUR" },
                      ]}
                    />
                  </FormField>
                </div>

                <Button variant="primary" size="md" onClick={() => handleSaveSettings()}>
                  Save Company Profile
                </Button>
              </Card>
            )}

            {/* 2. FACTORY & FLOOR */}
            {activeSection === "factory" && (
              <Card className="p-6 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Factory Shift & Floor Setup</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Shift 1 Timings">
                    <Input value={shift1Time} onChange={(e) => setShift1Time(e.target.value)} />
                  </FormField>

                  <FormField label="Shift 2 (Night) Timings">
                    <Input value={shift2Time} onChange={(e) => setShift2Time(e.target.value)} />
                  </FormField>

                  <FormField label="Active Stitching Lines">
                    <Input value={activeLinesCount} onChange={(e) => setActiveLinesCount(e.target.value)} type="number" />
                  </FormField>
                </div>

                <Button variant="primary" size="md" onClick={() => handleSaveSettings()}>
                  Save Factory Config
                </Button>
              </Card>
            )}

            {/* 3. ADVANCES */}
            {activeSection === "advances" && (
              <Card className="p-6 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Advance Loan Borrowing Rules</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Max Advance (% of Monthly Wage)">
                    <Input value={maxAdvancePercent} onChange={(e) => setMaxAdvancePercent(e.target.value)} type="number" />
                  </FormField>

                  <FormField label="Max Repayment Duration (Months)">
                    <Input value={maxRepaymentMonths} onChange={(e) => setMaxRepaymentMonths(e.target.value)} type="number" />
                  </FormField>
                </div>

                <Button variant="primary" size="md" onClick={() => handleSaveSettings()}>
                  Save Advance Policies
                </Button>
              </Card>
            )}

            {/* 4. INVOICES & QUOTATIONS */}
            {activeSection === "invoices" && (
              <Card className="p-6 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Document Prefixes & Bank Details</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Invoice Number Prefix">
                    <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
                  </FormField>

                  <FormField label="Quotation Number Prefix">
                    <Input value={quotationPrefix} onChange={(e) => setQuotationPrefix(e.target.value)} />
                  </FormField>

                  <FormField label="Bank Account Wire Details" className="sm:col-span-2">
                    <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
                  </FormField>
                </div>

                <Button variant="primary" size="md" onClick={() => handleSaveSettings()}>
                  Save Invoicing Setup
                </Button>
              </Card>
            )}

            {/* 5. USERS & ROLES */}
            {activeSection === "roles" && (
              <Card className="p-6 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Role-Based Access Control (RBAC)</h3>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">Factory Admin (Director)</strong>
                      <span className="text-[11px] text-slate-500">Full system access, payroll approvals, and AI settings</span>
                    </div>
                    <Badge variant="primary">Full Access</Badge>
                  </div>

                  <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">Production Manager</strong>
                      <span className="text-[11px] text-slate-500">Line tracking, costing, piece rate recording, floor reports</span>
                    </div>
                    <Badge variant="default">Floor & Reports</Badge>
                  </div>

                  <div className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">Accounts Officer</strong>
                      <span className="text-[11px] text-slate-500">Salaries, advance disbursements, invoices, receivables</span>
                    </div>
                    <Badge variant="success">Financials Only</Badge>
                  </div>
                </div>
              </Card>
            )}

            {/* 6. AI & OPENAI CONFIG */}
            {activeSection === "ai" && (
              <Card className="p-6 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">OpenAI API & Generative Models</h3>
                    <p className="text-xs text-slate-500">Connected with FactoryOS AI Center & Mockup Studio.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestAiConnection}
                    disabled={isTestingAi}
                    leftIcon={isTestingAi ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
                  >
                    {isTestingAi ? "Testing Key..." : "Test Connection"}
                  </Button>
                </div>

                {aiTestMessage && (
                  <div className={`p-3.5 rounded-xl text-xs font-semibold ${aiTestMessage.startsWith("✅") ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-rose-50 text-rose-900 border border-rose-200"}`}>
                    {aiTestMessage}
                  </div>
                )}

                <div className="space-y-4">
                  <FormField label="OpenAI Secret API Key *" description="Format: sk-proj-... or sk-...">
                    <Input
                      type="password"
                      placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={aiSettings.openaiApiKey || ""}
                      onChange={(e) => setAiSettings({ ...aiSettings, openaiApiKey: e.target.value.trim() })}
                      className="font-mono text-xs"
                    />
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Image Model">
                      <Select
                        value={aiSettings.model}
                        onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value as any })}
                        options={[
                          { label: "DALL-E 3 — Photorealistic (Recommended)", value: "dall-e-3" },
                          { label: "DALL-E 2 — Fast Conceptual Prototype", value: "dall-e-2" },
                        ]}
                      />
                    </FormField>

                    <FormField label="Resolution">
                      <Select
                        value={aiSettings.defaultResolution}
                        onChange={(e) => setAiSettings({ ...aiSettings, defaultResolution: e.target.value as any })}
                        options={[
                          { label: "1024 x 1024 (1:1 Square)", value: "1024x1024" },
                          { label: "1024 x 1792 (9:16 Story)", value: "1024x1792" },
                          { label: "1792 x 1024 (16:9 Banner)", value: "1792x1024" },
                        ]}
                      />
                    </FormField>
                  </div>
                </div>

                <Button variant="primary" size="md" onClick={() => handleSaveSettings()}>
                  Save AI Configuration
                </Button>
              </Card>
            )}

            {/* 7. SYSTEM PREFERENCES */}
            {activeSection === "system" && (
              <Card className="p-6 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">System Preferences & Audit</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Timezone">
                    <Input defaultValue="Asia/Karachi (GMT+5)" disabled />
                  </FormField>

                  <FormField label="Unit of Measure (UOM)">
                    <Input defaultValue="Metric (Meters, Kilograms, Pieces)" disabled />
                  </FormField>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Automatic SQLite/PostgreSQL hourly snapshot backups active.</span>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

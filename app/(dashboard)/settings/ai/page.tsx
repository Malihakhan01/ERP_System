"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { FormField } from "@/components/forms/FormField";
import { useToast } from "@/components/ui/Toast";
import {
  Sparkles,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Cpu,
  RefreshCw,
  Zap,
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

export default function AiSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [settings, setSettings] = React.useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ status: "success" | "error" | null; message: string }>({
    status: null,
    message: "",
  });

  // Load Settings on Mount (From Server & Database)
  React.useEffect(() => {
    fetch("/api/ai/settings")
      .then((res) => res.json())
      .then((serverData) => {
        if (serverData.success && serverData.settings) {
          getAiSettingsFromDB().then((dbData) => {
            setSettings({
              ...dbData,
              ...serverData.settings,
              openaiApiKey: serverData.settings.openaiApiKey || dbData.openaiApiKey || "",
            });
          });
        } else {
          getAiSettingsFromDB().then((dbData) => setSettings(dbData));
        }
      })
      .catch(() => {
        getAiSettingsFromDB().then((dbData) => setSettings(dbData));
      });
  }, []);

  // Save Settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save in Database & LocalStorage
      await saveAiSettingsInDB(settings);

      // 2. Persist to Server API Route
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to persist settings on server.");
      }

      toast({
        type: "success",
        message: "Configuration Saved",
        description: "OpenAI settings saved and active across FactoryOS.",
      });
    } catch (err: any) {
      toast({
        type: "error",
        message: "Save Failed",
        description: err.message || "Failed to persist AI settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Test OpenAI API Connection
  const handleTestConnection = async () => {
    if (!settings.openaiApiKey || !settings.openaiApiKey.trim()) {
      toast({
        type: "warning",
        message: "API Key Required",
        description: "Please enter your OpenAI API key before testing.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult({ status: null, message: "" });

    try {
      const res = await fetch("/api/ai/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: settings.openaiApiKey.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          status: "success",
          message: data.message || "OpenAI API connection verified successfully. DALL-E 3 is ready.",
        });
        toast({
          type: "success",
          message: "OpenAI Connected",
          description: "API key validated. Generative synthesis is ready.",
        });
      } else {
        setTestResult({
          status: "error",
          message: data.error || "Invalid OpenAI Secret Key. Check your OpenAI account permissions and quota.",
        });
        toast({
          type: "error",
          message: "Connection Failed",
          description: data.error || "Invalid OpenAI Secret Key.",
        });
      }
    } catch (err: any) {
      setTestResult({
        status: "error",
        message: err.message || "Network error while connecting to OpenAI.",
      });
      toast({
        type: "error",
        message: "Network Error",
        description: "Failed to connect to verification endpoint.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const isKeyConfigured = Boolean(
    settings.openaiApiKey &&
    !settings.openaiApiKey.includes("placeholder") &&
    settings.openaiApiKey.startsWith("sk-")
  );

  return (
    <>
      <TopNav title="FactoryOS Settings — AI & Machine Learning Configuration" />

      <div className="max-w-[1440px] mx-auto p-4 sm:p-6 space-y-5 pb-28 animate-in fade-in-0 duration-200">
        {/* ========================================================= */}
        {/* 1. COMPACT TOP HEADER ACTION BAR (80PX)                   */}
        {/* ========================================================= */}
        <div className="h-20 flex items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl px-6 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/ai/mockup-generator")}
              className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Back to Mockup Generator"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  OpenAI & Model Settings
                </h1>
                <Badge variant={isKeyConfigured ? "success" : "warning"} dot>
                  {isKeyConfigured ? "OpenAI Configured" : "AI Provider Not Configured"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 truncate">
                Configure OpenAI API credentials, active image models, and generation quotas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={handleTestConnection}
              disabled={isTesting}
              leftIcon={isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-amber-500" />}
            >
              {isTesting ? "Testing Key..." : "Test Connection"}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={isSaving}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>

        {/* Connection Test Result Feedback */}
        {testResult.status === "success" && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-3 shadow-xs animate-in fade-in-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-sm">✅ Connected Successfully:</strong>
              <p className="mt-0.5 text-emerald-800">{testResult.message}</p>
            </div>
          </div>
        )}

        {testResult.status === "error" && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-3 shadow-xs animate-in fade-in-0">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-sm">❌ Connection Failed:</strong>
              <p className="mt-0.5 text-rose-800">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. MAIN CONFIGURATION CARDS                               */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* Card A: API Credentials */}
          <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  API Credentials & Authentication
                </h2>
              </div>
            </div>

            <FormField label="API Service Provider">
              <Select
                value={settings.apiProvider}
                onChange={(e) => setSettings({ ...settings, apiProvider: e.target.value as any })}
                options={[
                  { label: "OpenAI (Official DALL-E 3 / DALL-E 2 API)", value: "OpenAI" },
                  { label: "Microsoft Azure OpenAI Service", value: "Azure" },
                  { label: "Custom Self-Hosted Endpoint", value: "Custom" },
                ]}
              />
            </FormField>

            <FormField
              label="OpenAI Secret API Key *"
              description="Paste your OpenAI Secret Key (Format: sk-proj-... or sk-...)"
            >
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={settings.openaiApiKey || ""}
                  onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value.trim() })}
                  className="pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Server-Side Security:</strong>
                <p className="mt-0.5 text-blue-800 text-[11px]">
                  Secret keys are processed and saved securely on the server. Client browsers never expose raw secret keys.
                </p>
              </div>
            </div>
          </Card>

          {/* Card B: Synthesis Model & Quality Settings */}
          <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Model & Render Resolution
                </h2>
              </div>
            </div>

            <FormField label="Image Generation Model" description="Select neural model">
              <Select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value as any })}
                options={[
                  { label: "DALL-E 3 — Photorealistic, Complex Details & Fine Textures", value: "dall-e-3" },
                  { label: "DALL-E 2 — Fast Conceptual Prototyping", value: "dall-e-2" },
                ]}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Image Quality">
                <Select
                  value={settings.imageQuality}
                  onChange={(e) => setSettings({ ...settings, imageQuality: e.target.value as any })}
                  options={[
                    { label: "Standard (Fast & Cost Effective)", value: "standard" },
                    { label: "HD (Maximum Detail & Stitching Clarity)", value: "hd" },
                  ]}
                />
              </FormField>

              <FormField label="Default Canvas Resolution">
                <Select
                  value={settings.defaultResolution}
                  onChange={(e) => setSettings({ ...settings, defaultResolution: e.target.value as any })}
                  options={[
                    { label: "1024 x 1024 (1:1 Square)", value: "1024x1024" },
                    { label: "1024 x 1792 (9:16 Vertical Story)", value: "1024x1792" },
                    { label: "1792 x 1024 (16:9 Landscape Banner)", value: "1792x1024" },
                  ]}
                />
              </FormField>
            </div>

            <FormField label="Default Style Preset">
              <Select
                value={settings.defaultStyle}
                onChange={(e) => setSettings({ ...settings, defaultStyle: e.target.value as any })}
                options={MOCKUP_STYLES.map((s) => ({ label: s.label, value: s.value }))}
              />
            </FormField>
          </Card>
        </div>

        {/* ========================================================= */}
        {/* 3. STICKY BOTTOM ACTION BAR                               */}
        {/* ========================================================= */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-slate-200/80 p-3.5 shadow-lg">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4 px-4">
            <Button variant="ghost" onClick={() => router.push("/ai/mockup-generator")}>
              ← Back to Mockup Generator
            </Button>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? "Testing..." : "Test Connection"}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                {isSaving ? "Saving..." : "Save AI Configuration"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

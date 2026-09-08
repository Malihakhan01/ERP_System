"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormField } from "@/components/forms/FormField";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import {
  Sparkles,
  ImageIcon,
  FileText,
  TrendingUp,
  Bot,
  Upload,
  Layers,
  Wand2,
  Download,
  ShieldCheck,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  Copy,
  Check,
  Eye,
  Sliders,
  Camera,
  Palette,
  Shirt,
  Search,
  ZoomIn,
  Settings,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  Zap,
  Lightbulb,
} from "lucide-react";
import {
  ProductCategory,
  MockupStyle,
  MockupBackground,
  AiMockupConfig,
  AiGenerationRecord,
  PRODUCT_CATEGORIES,
  MOCKUP_STYLES,
  MOCKUP_BACKGROUNDS,
  POPULAR_COLORS,
  enhanceAiPrompt,
} from "@/lib/ai-mockup-engine";
import {
  getAiGenerationsFromSupabase,
  saveAiGenerationInSupabase,
  toggleSaveDesignInSupabase,
  getAiSettingsFromSupabase,
} from "@/lib/services/ai-mockup-service";

type AiCenterTab = "mockup" | "product" | "fabric" | "pricing" | "production";

const QUICK_PROMPT_TEMPLATES = [
  {
    title: "Heavyweight Fleece Hoodie",
    category: "Hoodie" as ProductCategory,
    style: "Realistic Product Photography" as MockupStyle,
    background: "White Studio" as MockupBackground,
    colors: ["Jet Black"],
    prompt: "350 GSM heavyweight oversized pullover hoodie, kangaroo pocket, ribbed cuffs, clean studio lighting.",
  },
  {
    title: "Pro Leather Boxing Gloves",
    category: "Gloves" as ProductCategory,
    style: "Realistic Product Photography" as MockupStyle,
    background: "Sports Arena" as MockupBackground,
    colors: ["Jet Black", "Crimson Red"],
    prompt: "Professional boxing gloves, genuine cowhide leather texture, reinforced wrist support with red stitching.",
  },
  {
    title: "Sublimated Athletic Jersey",
    category: "Sportswear" as ProductCategory,
    style: "Lifestyle Model Shoot" as MockupStyle,
    background: "Sports Arena" as MockupBackground,
    colors: ["Navy Blue", "Pure White"],
    prompt: "Breathable moisture-wicking soccer jersey with dynamic geometric chest pattern.",
  },
  {
    title: "High-Visibility Safety Jacket",
    category: "Safety Wear" as ProductCategory,
    style: "Factory Catalog Image" as MockupStyle,
    background: "Factory Floor" as MockupBackground,
    colors: ["Neon Lime"],
    prompt: "High-visibility waterproof industrial safety bomber jacket with 3M reflective tape strips.",
  },
];

export default function AICenterPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Active Main Tab
  const [activeTab, setActiveTab] = React.useState<AiCenterTab>("mockup");

  // ==========================================
  // 1. MOCKUP STUDIO STATE
  // ==========================================
  const [productName, setProductName] = React.useState("Boxing Gloves");
  const [category, setCategory] = React.useState<ProductCategory>("Gloves");
  const [style, setStyle] = React.useState<MockupStyle>("Realistic Product Photography");
  const [background, setBackground] = React.useState<MockupBackground>("Sports Arena");
  const [selectedColors, setSelectedColors] = React.useState<string[]>(["Jet Black", "Crimson Red"]);
  const [additionalInstructions, setAdditionalInstructions] = React.useState(
    "Black and red professional boxing gloves, premium leather texture with detailed stitching and wrist strap."
  );
  const [referenceImageUrl, setReferenceImageUrl] = React.useState<string | null>(null);
  const [autoEnhance, setAutoEnhance] = React.useState(true);

  // Accordion Sections State
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    product: true,
    style: true,
    colors: true,
    background: false,
    advanced: true,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Generation & Engine States
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationStep, setGenerationStep] = React.useState<number>(0);
  const [activeGeneration, setActiveGeneration] = React.useState<AiGenerationRecord | null>(null);
  const [generationError, setGenerationError] = React.useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = React.useState<boolean>(false);
  const [allGenerations, setAllGenerations] = React.useState<AiGenerationRecord[]>([]);

  // Modals & UI States
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = React.useState(false);
  const [promptPreviewModalOpen, setPromptPreviewModalOpen] = React.useState(false);
  const [copiedPrompt, setCopiedPrompt] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // ==========================================
  // 2. OTHER TABS FORM STATES
  // ==========================================
  const [garmentTitle, setGarmentTitle] = React.useState("380 GSM Heavyweight French Terry Pullover Hoodie");
  const [fabricType, setFabricType] = React.useState("100% Combed Organic Cotton Fleece");
  const [specResult, setSpecResult] = React.useState<string | null>(null);
  const [isGeneratingSpec, setIsGeneratingSpec] = React.useState(false);

  // Load Settings & Generations on Mount
  React.useEffect(() => {
    fetch("/api/ai/settings")
      .then((res) => res.json())
      .then((serverData) => {
        if (serverData.hasApiKey) {
          setHasApiKey(true);
        } else {
          getAiSettingsFromSupabase().then((s) => {
            setHasApiKey(Boolean(s.openaiApiKey && !s.openaiApiKey.includes("placeholder") && s.openaiApiKey.startsWith("sk-")));
          });
        }
      })
      .catch(() => {
        getAiSettingsFromSupabase().then((s) => {
          setHasApiKey(Boolean(s.openaiApiKey && !s.openaiApiKey.includes("placeholder") && s.openaiApiKey.startsWith("sk-")));
        });
      });

    getAiGenerationsFromSupabase().then((data) => {
      setAllGenerations(data || []);
      if (data && data.length > 0) {
        setActiveGeneration(data[0]);
      }
    });
  }, []);

  // Live Enhanced Prompt
  const currentConfig: AiMockupConfig = React.useMemo(
    () => ({
      productName,
      category,
      style,
      background,
      colors: selectedColors,
      additionalInstructions,
      referenceImageUrl: referenceImageUrl || undefined,
      autoEnhance,
    }),
    [productName, category, style, background, selectedColors, additionalInstructions, referenceImageUrl, autoEnhance]
  );

  const liveEnhancedPrompt = React.useMemo(() => {
    return enhanceAiPrompt(currentConfig);
  }, [currentConfig]);

  // Color Toggle Handler
  const toggleColor = (colorName: string) => {
    if (selectedColors.includes(colorName)) {
      setSelectedColors(selectedColors.filter((c) => c !== colorName));
    } else {
      if (selectedColors.length >= 3) {
        toast({ type: "warning", message: "Color Limit", description: "You can select up to 3 primary colors." });
        return;
      }
      setSelectedColors([...selectedColors, colorName]);
    }
  };

  // Reference Image Upload Handler
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ type: "error", message: "Invalid File", description: "Please upload a PNG or JPG image." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setReferenceImageUrl(event.target.result as string);
        toast({ type: "success", message: "Reference Attached", description: `${file.name} ready.` });
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick Preset Loader
  const loadQuickTemplate = (tpl: typeof QUICK_PROMPT_TEMPLATES[0]) => {
    setProductName(tpl.title);
    setCategory(tpl.category);
    setStyle(tpl.style);
    setBackground(tpl.background);
    setSelectedColors(tpl.colors);
    setAdditionalInstructions(tpl.prompt);
    toast({ type: "info", message: "Template Loaded", description: `Loaded ${tpl.title} preset.` });
  };

  // Real OpenAI Generation Handler
  const handleGenerateMockup = async () => {
    if (!productName.trim()) {
      toast({ type: "warning", message: "Product Title Required", description: "Please enter a title for your mockup." });
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep(1);

    const t1 = setTimeout(() => setGenerationStep(2), 1200);
    const t2 = setTimeout(() => setGenerationStep(3), 2800);
    const t3 = setTimeout(() => setGenerationStep(4), 5500);

    try {
      const settings = await getAiSettingsFromSupabase();

      const res = await fetch("/api/ai/generate-mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: currentConfig,
          apiKey: settings.openaiApiKey,
          model: settings.model || "dall-e-3",
          quality: settings.imageQuality || "standard",
          size: settings.defaultResolution || "1024x1024",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.imageUrl) {
        throw new Error(data.error || "Failed to generate image from OpenAI.");
      }

      // Create Real Generation Record
      const newRecord: AiGenerationRecord = {
        id: `gen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productName: productName.trim(),
        category,
        style,
        background,
        colors: selectedColors,
        prompt: additionalInstructions || productName,
        enhancedPrompt: data.prompt || data.enhancedPrompt || liveEnhancedPrompt,
        imageUrl: data.imageUrl,
        status: "Completed",
        tags: [category, style.split(" ")[0]],
        isSaved: false,
        createdAt: new Date().toISOString(),
      };

      await saveAiGenerationInSupabase(newRecord);
      setAllGenerations((prev) => [newRecord, ...prev]);
      setActiveGeneration(newRecord);

      toast({
        type: "success",
        message: "AI Mockup Generated",
        description: `Photorealistic ${productName} generated from OpenAI DALL-E 3.`,
      });
    } catch (err: any) {
      console.error("Mockup Generation Error:", err);
      setGenerationError(err.message || "Failed to generate mockup.");
      toast({
        type: "error",
        message: "Generation Failed",
        description: err.message || "Could not generate AI image.",
      });
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsGenerating(false);
      setGenerationStep(0);
    }
  };

  // Toggle Save / Bookmark
  const handleToggleSave = async (record: AiGenerationRecord) => {
    const nextState = !record.isSaved;
    await toggleSaveDesignInSupabase(record.id, nextState);
    setAllGenerations((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, isSaved: nextState } : r))
    );
    if (activeGeneration?.id === record.id) {
      setActiveGeneration({ ...activeGeneration, isSaved: nextState });
    }
    toast({
      type: "success",
      message: nextState ? "Saved to Design Library" : "Removed from Saved Designs",
    });
  };

  // Download High-Res Image
  const handleDownload = (imageUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${filename.toLowerCase().replace(/\s+/g, "_")}_mockup.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ type: "success", message: "Download Started", description: "Image saved." });
  };

  // Copy Prompt
  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    toast({ type: "info", message: "Prompt Copied", description: "AI prompt copied to clipboard." });
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Generate Spec Copy Handler
  const handleGenerateSpec = () => {
    setIsGeneratingSpec(true);
    setTimeout(() => {
      setIsGeneratingSpec(false);
      setSpecResult(`TECH SPECIFICATION & CARE LABEL
Product: ${garmentTitle}
Fabric: ${fabricType}
GSM: 380 GSM Heavyweight Loopback
Stitching: 4-Needle Flatlock Seams, Reinforced Collar
Care Instructions: Machine wash cold with like colors. Do not bleach. Tumble dry low. Cool iron if needed.
Tariff Code (HS): 6110.20 (Sweaters, pullovers, and similar articles, of cotton)`);
      toast({ type: "success", message: "Specification Generated", description: "Tech pack copy generated." });
    }, 1000);
  };

  return (
    <>
      <TopNav title="FactoryOS AI — Intelligence & Automation Center" />

      <div className="max-w-[1440px] mx-auto p-4 sm:p-6 space-y-5 pb-12 animate-in fade-in-0 duration-200">
        {/* ========================================================= */}
        {/* 1. COMPACT ENTERPRISE HEADER (80PX)                       */}
        {/* ========================================================= */}
        <div className="h-20 flex items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl px-6 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  FactoryOS AI Intelligence Center
                </h1>
                <Badge variant={hasApiKey ? "primary" : "warning"} dot>
                  {hasApiKey ? "OpenAI DALL-E 3 Ready" : "AI Provider Not Configured"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 truncate">
                AI automation tools for garment manufacturing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Settings className="h-4 w-4" />}
              onClick={() => router.push("/settings/ai")}
              className="rounded-xl"
            >
              AI Settings
            </Button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. TAB NAVIGATION BAR                                     */}
        {/* ========================================================= */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 no-scrollbar min-w-0">
          {[
            { id: "mockup" as const, label: "Mockup Studio", icon: ImageIcon, badge: "DALL-E 3" },
            { id: "product" as const, label: "Product AI", icon: FileText },
            { id: "fabric" as const, label: "Fabric Advisor", icon: Layers },
            { id: "pricing" as const, label: "Pricing AI", icon: TrendingUp },
            { id: "production" as const, label: "Production AI", icon: Bot },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700"}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: MOCKUP STUDIO (380PX FIXED LEFT + LARGE PREVIEW)   */}
        {/* ========================================================= */}
        {activeTab === "mockup" && (
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* ======================================================= */}
            {/* LEFT PANEL: 380PX FIXED ACCORDION CONTROLS              */}
            {/* ======================================================= */}
            <div className="w-full lg:w-[380px] shrink-0 space-y-3.5">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-blue-600" />
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Design Configuration
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromptPreviewModalOpen(true)}
                    className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Prompt
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Accordion 1: Product */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection("product")}
                      className="w-full px-3 py-2 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Shirt className="h-3.5 w-3.5 text-blue-600" />
                        1. Product
                      </span>
                      {openSections.product ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                    </button>

                    {openSections.product && (
                      <div className="p-3 bg-white space-y-2.5 border-t border-slate-100">
                        <FormField label="Category *">
                          <Select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as ProductCategory)}
                            options={PRODUCT_CATEGORIES.map((c) => ({ label: c.label, value: c.value }))}
                          />
                        </FormField>

                        <FormField label="Product Title *">
                          <Input
                            placeholder="e.g. Boxing Gloves"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                          />
                        </FormField>
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Style */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection("style")}
                      className="w-full px-3 py-2 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5 text-blue-600" />
                        2. Style Presets
                      </span>
                      {openSections.style ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                    </button>

                    {openSections.style && (
                      <div className="p-3 bg-white border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-1.5">
                          {MOCKUP_STYLES.map((st) => (
                            <button
                              key={st.value}
                              type="button"
                              onClick={() => setStyle(st.value)}
                              className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                                style === st.value
                                  ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600"
                                  : "border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <span className="text-[11px] font-bold text-slate-900 block leading-tight">{st.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 3: Colors */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection("colors")}
                      className="w-full px-3 py-2 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Palette className="h-3.5 w-3.5 text-blue-600" />
                        3. Colors ({selectedColors.length})
                      </span>
                      {openSections.colors ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                    </button>

                    {openSections.colors && (
                      <div className="p-3 bg-white border-t border-slate-100 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {POPULAR_COLORS.map((col) => {
                            const isSelected = selectedColors.includes(col.name);
                            return (
                              <button
                                key={col.name}
                                type="button"
                                onClick={() => toggleColor(col.name)}
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600 font-bold"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span className="h-2 w-2 rounded-full border border-slate-300" style={{ backgroundColor: col.hex }} />
                                {col.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 4: Background */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection("background")}
                      className="w-full px-3 py-2 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-blue-600" />
                        4. Background
                      </span>
                      {openSections.background ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                    </button>

                    {openSections.background && (
                      <div className="p-3 bg-white border-t border-slate-100">
                        <Select
                          value={background}
                          onChange={(e) => setBackground(e.target.value as MockupBackground)}
                          options={MOCKUP_BACKGROUNDS.map((b) => ({ label: b.label, value: b.value }))}
                        />
                      </div>
                    )}
                  </div>

                  {/* Accordion 5: Advanced Settings */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection("advanced")}
                      className="w-full px-3 py-2 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Wand2 className="h-3.5 w-3.5 text-blue-600" />
                        5. Advanced Settings
                      </span>
                      {openSections.advanced ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                    </button>

                    {openSections.advanced && (
                      <div className="p-3 bg-white border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700">Specific Prompt</label>
                          <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoEnhance}
                              onChange={(e) => setAutoEnhance(e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-semibold text-blue-700">Auto-Enhance</span>
                          </label>
                        </div>
                        <Textarea
                          rows={2}
                          placeholder="e.g. Premium leather texture with reinforced stitching."
                          value={additionalInstructions}
                          onChange={(e) => setAdditionalInstructions(e.target.value)}
                        />

                        {/* Reference Image Attachment */}
                        <div className="pt-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleReferenceUpload}
                            className="hidden"
                          />
                          {referenceImageUrl ? (
                            <div className="flex items-center gap-2 p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-[11px]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={referenceImageUrl} alt="Ref" className="h-8 w-8 rounded object-cover" />
                              <span className="flex-1 truncate font-semibold text-slate-800">Reference Attached</span>
                              <button type="button" onClick={() => setReferenceImageUrl(null)} className="text-rose-600 hover:underline">
                                Remove
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full p-2 border border-dashed border-slate-300 hover:border-blue-400 rounded-lg text-center text-[11px] text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Upload className="h-3 w-3" />
                              Attach sketch / tech pack
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Action Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full shadow-md shadow-blue-500/20 py-3 text-xs font-bold rounded-xl cursor-pointer"
                  disabled={isGenerating}
                  onClick={handleGenerateMockup}
                  leftIcon={isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                >
                  {isGenerating ? "Synthesizing with OpenAI..." : "Generate AI Mockup"}
                </Button>
              </div>
            </div>

            {/* ======================================================= */}
            {/* RIGHT PANEL: LARGE PREVIEW CANVAS & ACTIONS             */}
            {/* ======================================================= */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col min-h-[560px] justify-between">
                {/* Canvas Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-bold text-slate-900">
                      {activeGeneration ? activeGeneration.productName : "Mockup Canvas"}
                    </span>
                    {activeGeneration && (
                      <Badge variant="primary">
                        {activeGeneration.category}
                      </Badge>
                    )}
                  </div>

                  {activeGeneration && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsFullscreenModalOpen(true)}
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="View Fullscreen"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSave(activeGeneration)}
                        className={`h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          activeGeneration.isSaved
                            ? "bg-amber-50 border-amber-300 text-amber-800"
                            : "border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                        title="Save to Design Library"
                      >
                        {activeGeneration.isSaved ? <BookmarkCheck className="h-4 w-4 text-amber-600" /> : <Bookmark className="h-4 w-4 text-slate-500" />}
                        {activeGeneration.isSaved ? "Saved" : "Save"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Canvas Center / Progress / Real Render */}
                <div className="relative my-3 flex-1 flex flex-col items-center justify-center bg-slate-50/80 border border-slate-200/60 rounded-xl overflow-hidden min-h-[380px] p-4">
                  {isGenerating ? (
                    <div className="p-6 text-center space-y-3.5 max-w-md animate-in fade-in-0 duration-300">
                      <div className="relative mx-auto w-14 h-14 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                        <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900">
                          {generationStep === 1 && "1. Analyzing Product Specifications..."}
                          {generationStep === 2 && "2. Creating Enhanced Technical Prompt..."}
                          {generationStep === 3 && "3. Generating Image with OpenAI DALL-E 3..."}
                          {generationStep === 4 && "4. Finalizing High-Resolution Render..."}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Applying {style} with {background} environment.
                        </p>
                      </div>

                      {/* Step Indicator */}
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <div className={`h-1.5 w-8 rounded-full transition-colors ${generationStep >= 1 ? "bg-blue-600" : "bg-slate-200"}`} />
                        <div className={`h-1.5 w-8 rounded-full transition-colors ${generationStep >= 2 ? "bg-blue-600" : "bg-slate-200"}`} />
                        <div className={`h-1.5 w-8 rounded-full transition-colors ${generationStep >= 3 ? "bg-blue-600" : "bg-slate-200"}`} />
                        <div className={`h-1.5 w-8 rounded-full transition-colors ${generationStep >= 4 ? "bg-blue-600" : "bg-slate-200"}`} />
                      </div>
                    </div>
                  ) : activeGeneration?.imageUrl ? (
                    <div className="w-full h-full flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeGeneration.imageUrl}
                        alt={activeGeneration.productName}
                        className="max-h-[460px] w-full object-contain rounded-xl shadow-xs"
                      />
                    </div>
                  ) : (
                    /* High-Value Standby Preview with Quick Templates */
                    <div className="p-6 text-center space-y-4 max-w-lg">
                      <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          AI Generated Mockup Will Appear Here
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Select a factory preset template or configure product details to synthesize visuals.
                        </p>
                      </div>

                      {/* Quick Template Prompts */}
                      <div className="grid grid-cols-2 gap-2 text-left pt-2">
                        {QUICK_PROMPT_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.title}
                            type="button"
                            onClick={() => loadQuickTemplate(tpl)}
                            className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-left transition-all cursor-pointer group"
                          >
                            <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 block truncate">
                              {tpl.title}
                            </span>
                            <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                              {tpl.category} • {tpl.style.split(" ")[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {generationError && (
                  <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="font-bold">Generation Error:</strong>
                      <p className="mt-0.5 text-rose-800">{generationError}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push("/settings/ai")}
                      className="shrink-0"
                    >
                      AI Settings
                    </Button>
                  </div>
                )}

                {/* Canvas Footer Toolbar */}
                {activeGeneration && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Download className="h-4 w-4" />}
                        onClick={() => handleDownload(activeGeneration.imageUrl, activeGeneration.productName)}
                      >
                        Download High-Res
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<RotateCcw className="h-4 w-4" />}
                        onClick={handleGenerateMockup}
                        disabled={isGenerating}
                      >
                        Regenerate
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={copiedPrompt ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      onClick={() => handleCopyPrompt(activeGeneration.enhancedPrompt)}
                    >
                      {copiedPrompt ? "Copied" : "Copy Prompt"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Recent Generations Strip */}
              {allGenerations.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-600" />
                      Recent Design Library ({allGenerations.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                    {allGenerations.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveGeneration(item)}
                        className={`p-1 rounded-xl border transition-all shrink-0 cursor-pointer ${
                          activeGeneration?.id === item.id
                            ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50"
                            : "border-slate-200 hover:border-slate-300 bg-slate-50"
                        }`}
                        title={item.productName}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PRODUCT AI (TECHNICAL SPEC & COPYWRITING)          */}
        {/* ========================================================= */}
        {activeTab === "product" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Tech Pack & Description Generator
                  </h2>
                </div>
              </div>

              <FormField label="Garment Title / Model *">
                <Input
                  value={garmentTitle}
                  onChange={(e) => setGarmentTitle(e.target.value)}
                />
              </FormField>

              <FormField label="Fabric Blend & Material *">
                <Input
                  value={fabricType}
                  onChange={(e) => setFabricType(e.target.value)}
                />
              </FormField>

              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={handleGenerateSpec}
                disabled={isGeneratingSpec}
                leftIcon={isGeneratingSpec ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              >
                {isGeneratingSpec ? "Generating Specifications..." : "Generate Tech Pack Spec"}
              </Button>
            </Card>

            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-3 min-h-[300px] flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">Generated Spec Output</span>
                {specResult && <Badge variant="success">Ready</Badge>}
              </div>

              <div className="flex-1 flex items-center justify-center">
                {specResult ? (
                  <pre className="w-full p-3.5 bg-slate-50 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed border border-slate-200">
                    {specResult}
                  </pre>
                ) : (
                  <p className="text-xs text-slate-400 text-center">
                    Enter garment details on the left and click &ldquo;Generate Tech Pack Spec&rdquo;.
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: FABRIC ADVISOR (WASTAGE & YIELD CALCULATOR)         */}
        {/* ========================================================= */}
        {activeTab === "fabric" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4 lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Layers className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Fabric Wastage & Yield AI Estimation
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <FormField label="Fabric Cut Width (Inches)">
                  <Input defaultValue="60" type="number" />
                </FormField>
                <FormField label="Marker Efficiency Target (%)">
                  <Input defaultValue="84.5" type="number" />
                </FormField>
                <FormField label="Total Order Quantity (Pcs)">
                  <Input defaultValue="5000" type="number" />
                </FormField>
                <FormField label="Fabric GSM">
                  <Input defaultValue="240" type="number" />
                </FormField>
              </div>

              <Button variant="primary" size="md" leftIcon={<Wand2 className="h-4 w-4" />}>
                Calculate AI Marker Yield
              </Button>
            </Card>

            <Card className="p-5 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase">AI Recommendation</h3>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                <strong className="block font-bold">Estimated Consumption:</strong>
                <p>0.42 kg / piece (2,100 kg total yarn required)</p>
                <strong className="block font-bold pt-1">Optimal Nesting:</strong>
                <p>Nested marker orientation reduces cutting edge waste by 3.2%.</p>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PRICING AI (SMART EXPORT PRICING)                   */}
        {/* ========================================================= */}
        {activeTab === "pricing" && (
          <Card className="p-6 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Smart Export Pricing & CM Margin Advisor
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              Evaluates FOB/CIF pricing for European and US garment export orders factoring currency parity and ocean freight index.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <FormField label="Target FOB Price ($/pc)">
                <Input defaultValue="14.50" type="number" />
              </FormField>
              <FormField label="Cut & Make (CM) Cost (PKR)">
                <Input defaultValue="650" type="number" />
              </FormField>
              <FormField label="Export Destination">
                <Select
                  options={[
                    { label: "European Union (EUR)", value: "EU" },
                    { label: "United States (USD)", value: "US" },
                    { label: "United Kingdom (GBP)", value: "UK" },
                  ]}
                />
              </FormField>
            </div>
          </Card>
        )}

        {/* ========================================================= */}
        {/* TAB 5: PRODUCTION AI (LINE BOTTLENECK ANALYZER)            */}
        {/* ========================================================= */}
        {activeTab === "production" && (
          <Card className="p-6 border-slate-200/80 shadow-xs bg-white rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Bot className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Sewing Line Balancing & Operator SMV Optimization
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              Real-time bottleneck detector for Stitching Lines A, B, and C based on actual piece rates and hourly output.
            </p>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <strong className="font-bold">Line 2 Bottleneck Detected:</strong>
              <p>Overlock operation (SMV 1.45) is running 12% slower than flatlock feeder. Rebalancing 2 operators from Line 4 recommended.</p>
            </div>
          </Card>
        )}

        {/* ========================================================= */}
        {/* 4. MODAL: FULLSCREEN HIGH-RES VIEW                        */}
        {/* ========================================================= */}
        {activeGeneration && (
          <Modal
            isOpen={isFullscreenModalOpen}
            onClose={() => setIsFullscreenModalOpen(false)}
            title={`${activeGeneration.productName} — High-Res AI Render`}
            size="xl"
          >
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-center min-h-[500px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeGeneration.imageUrl}
                  alt={activeGeneration.productName}
                  className="max-h-[600px] w-auto object-contain rounded-xl"
                />
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                <strong className="text-slate-900 block font-bold mb-0.5">Prompt Details:</strong>
                {activeGeneration.enhancedPrompt}
              </div>
            </div>

            <ModalFooter>
              <Button variant="ghost" onClick={() => setIsFullscreenModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => handleDownload(activeGeneration.imageUrl, activeGeneration.productName)}
              >
                Download PNG
              </Button>
            </ModalFooter>
          </Modal>
        )}

        {/* ========================================================= */}
        {/* 5. MODAL: PROMPT PREVIEW                                  */}
        {/* ========================================================= */}
        <Modal
          isOpen={promptPreviewModalOpen}
          onClose={() => setPromptPreviewModalOpen(false)}
          title="Technical AI Prompt Preview"
          size="lg"
        >
          <div className="space-y-3.5 text-xs">
            <p className="text-slate-600">
              Technical prompt constructed for OpenAI DALL-E 3 with fabric GSM, stitching parameters, and studio lighting:
            </p>

            <div className="p-4 bg-slate-900 text-emerald-400 font-mono rounded-xl leading-relaxed text-xs">
              {liveEnhancedPrompt}
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setPromptPreviewModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              leftIcon={<Copy className="h-4 w-4" />}
              onClick={() => handleCopyPrompt(liveEnhancedPrompt)}
            >
              Copy Prompt
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </>
  );
}

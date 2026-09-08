"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { FormField } from "@/components/forms/FormField";
import { useToast } from "@/components/ui/Toast";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Download,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  Copy,
  Check,
  Eye,
  Sliders,
  History,
  Search,
  Trash2,
  ZoomIn,
  Upload,
  Palette,
  Camera,
  Shirt,
  Layers,
  Settings,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertCircle,
  Clock,
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
  deleteAiGenerationInSupabase,
  toggleSaveDesignInSupabase,
  getAiSettingsFromSupabase,
} from "@/lib/services/ai-mockup-service";

type ActiveTab = "generator" | "saved" | "history";

function MockupGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Navigation tab
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("generator");

  // Configuration Form State
  const [productName, setProductName] = React.useState(searchParams.get("productName") || "Boxing Gloves");
  const [category, setCategory] = React.useState<ProductCategory>((searchParams.get("category") as ProductCategory) || "Gloves");
  const [style, setStyle] = React.useState<MockupStyle>((searchParams.get("style") as MockupStyle) || "Realistic Product Photography");
  const [background, setBackground] = React.useState<MockupBackground>((searchParams.get("background") as MockupBackground) || "Sports Arena");
  const [selectedColors, setSelectedColors] = React.useState<string[]>(
    searchParams.get("color") ? [searchParams.get("color")!] : ["Jet Black", "Crimson Red"]
  );
  const [additionalInstructions, setAdditionalInstructions] = React.useState(
    "Black and red professional boxing gloves, premium leather texture with detailed stitching and wrist strap."
  );
  const [referenceImageUrl, setReferenceImageUrl] = React.useState<string | null>(null);
  const [autoEnhance, setAutoEnhance] = React.useState(true);

  // Accordion Section Expand State
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    product: true,
    style: true,
    environment: false,
    colors: true,
    reference: false,
    advanced: true,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Active Generation States
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationStep, setGenerationStep] = React.useState<number>(0);
  const [activeGeneration, setActiveGeneration] = React.useState<AiGenerationRecord | null>(null);
  const [generationError, setGenerationError] = React.useState<string | null>(null);

  // Database / History Records
  const [allGenerations, setAllGenerations] = React.useState<AiGenerationRecord[]>([]);
  const [hasApiKey, setHasApiKey] = React.useState<boolean>(false);

  // Modals & Previews
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = React.useState(false);
  const [promptPreviewModalOpen, setPromptPreviewModalOpen] = React.useState(false);
  const [copiedPrompt, setCopiedPrompt] = React.useState(false);

  // Search & Filters in Saved & History Tabs
  const [gallerySearch, setGallerySearch] = React.useState("");
  const [galleryCategoryFilter, setGalleryCategoryFilter] = React.useState<string>("all");

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Load Settings & Saved Generations on Mount
  React.useEffect(() => {
    // Check server settings
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

  // Live Enhanced Prompt Calculation
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

  // Main Generation Handler (Calls Real OpenAI API, NO fake SVGs)
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

  // Reload Record in Generator
  const handleReloadInGenerator = (record: AiGenerationRecord) => {
    setProductName(record.productName);
    setCategory(record.category);
    setStyle(record.style);
    setBackground(record.background);
    setSelectedColors(record.colors || []);
    setAdditionalInstructions(record.prompt);
    setActiveGeneration(record);
    setActiveTab("generator");
    toast({ type: "info", message: "Loaded Mockup", description: `Loaded ${record.productName} configuration.` });
  };

  // Delete Record
  const handleDeleteRecord = async (id: string) => {
    await deleteAiGenerationInSupabase(id);
    setAllGenerations((prev) => prev.filter((r) => r.id !== id));
    if (activeGeneration?.id === id) {
      setActiveGeneration(allGenerations.find((r) => r.id !== id) || null);
    }
    toast({ type: "success", message: "Record Deleted", description: "Removed from history." });
  };

  // Saved Designs Filter
  const savedDesigns = React.useMemo(() => {
    return allGenerations.filter((r) => {
      if (!r.isSaved) return false;
      if (galleryCategoryFilter !== "all" && r.category !== galleryCategoryFilter) return false;
      if (gallerySearch.trim()) {
        const q = gallerySearch.toLowerCase();
        return (
          r.productName.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.tags && r.tags.some((t) => t.toLowerCase().includes(q)))
        );
      }
      return true;
    });
  }, [allGenerations, galleryCategoryFilter, gallerySearch]);

  // History Records Filter
  const historyRecords = React.useMemo(() => {
    return allGenerations.filter((r) => {
      if (galleryCategoryFilter !== "all" && r.category !== galleryCategoryFilter) return false;
      if (gallerySearch.trim()) {
        const q = gallerySearch.toLowerCase();
        return (
          r.productName.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.prompt.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allGenerations, galleryCategoryFilter, gallerySearch]);

  return (
    <>
      <TopNav title="FactoryOS AI — Garment & Product Mockup Generator" />

      <div className="max-w-[1440px] mx-auto p-4 sm:p-6 space-y-5 pb-24 animate-in fade-in-0 duration-200">
        {/* ========================================================= */}
        {/* 1. COMPACT TOP HEADER ACTION BAR (80PX)                   */}
        {/* ========================================================= */}
        <div className="h-20 flex items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl px-6 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  AI Mockup Generator
                </h1>
                <Badge variant={hasApiKey ? "primary" : "warning"} dot>
                  {hasApiKey ? "OpenAI DALL-E 3 Ready" : "AI Provider Not Configured"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 truncate">
                Generate product mockups, factory samples, and marketing visuals using AI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("generator")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "generator"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Workspace
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("saved")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "saved"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                Saved ({allGenerations.filter((g) => g.isSaved).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "history"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                History ({allGenerations.length})
              </button>
            </div>

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

        {/* API Key Missing Notice */}
        {!hasApiKey && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <strong className="font-bold">AI Provider Not Configured:</strong>
                <p className="text-amber-800 mt-0.5">
                  Configure your OpenAI Secret API Key in Settings to generate photorealistic DALL-E 3 visuals.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => router.push("/settings/ai")}
              className="shrink-0"
            >
              Open AI Settings →
            </Button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. TAB: MAIN DUAL-PANEL WORKSPACE (420px Fixed / Rest)     */}
        {/* ========================================================= */}
        {activeTab === "generator" && (
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* ======================================================= */}
            {/* LEFT PANEL: 420PX FIXED PROMPT ACCORDION PANEL          */}
            {/* ======================================================= */}
            <div className="w-full lg:w-[420px] shrink-0 space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
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
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview Prompt
                  </button>
                </div>

                <div className="space-y-2.5">
                  {/* Accordion 1: Product & Category */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection("product")}
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Shirt className="h-4 w-4 text-blue-600" />
                        1. Product & Category
                      </span>
                      {openSections.product ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    </button>

                    {openSections.product && (
                      <div className="p-3.5 bg-white space-y-2.5 border-t border-slate-100">
                        <FormField label="Product Category *">
                          <Select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as ProductCategory)}
                            options={PRODUCT_CATEGORIES.map((c) => ({ label: c.label, value: c.value }))}
                          />
                        </FormField>

                        <FormField label="Product Name / Title *">
                          <Input
                            placeholder="e.g. Boxing Gloves"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                          />
                        </FormField>
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Visual Style */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection("style")}
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Camera className="h-4 w-4 text-blue-600" />
                        2. Style Presets
                      </span>
                      {openSections.style ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    </button>

                    {openSections.style && (
                      <div className="p-3.5 bg-white border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                          {MOCKUP_STYLES.map((st) => (
                            <button
                              key={st.value}
                              type="button"
                              onClick={() => setStyle(st.value)}
                              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                style === st.value
                                  ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600"
                                  : "border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <span className="text-xs font-bold text-slate-900 block leading-tight">{st.label}</span>
                              <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{st.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 3: Environment & Background */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection("environment")}
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-blue-600" />
                        3. Studio Environment
                      </span>
                      {openSections.environment ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    </button>

                    {openSections.environment && (
                      <div className="p-3.5 bg-white border-t border-slate-100">
                        <Select
                          value={background}
                          onChange={(e) => setBackground(e.target.value as MockupBackground)}
                          options={MOCKUP_BACKGROUNDS.map((b) => ({ label: `${b.label} — ${b.description}`, value: b.value }))}
                        />
                      </div>
                    )}
                  </div>

                  {/* Accordion 4: Colors & Palette */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection("colors")}
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Palette className="h-4 w-4 text-blue-600" />
                        4. Colorway Palette ({selectedColors.length})
                      </span>
                      {openSections.colors ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    </button>

                    {openSections.colors && (
                      <div className="p-3.5 bg-white border-t border-slate-100 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {POPULAR_COLORS.map((col) => {
                            const isSelected = selectedColors.includes(col.name);
                            return (
                              <button
                                key={col.name}
                                type="button"
                                onClick={() => toggleColor(col.name)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600 font-bold"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span className="h-2.5 w-2.5 rounded-full border border-slate-300" style={{ backgroundColor: col.hex }} />
                                {col.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 5: Reference Image */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection("reference")}
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Upload className="h-4 w-4 text-blue-600" />
                        5. Reference Image (Optional)
                      </span>
                      {openSections.reference ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    </button>

                    {openSections.reference && (
                      <div className="p-3.5 bg-white border-t border-slate-100">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleReferenceUpload}
                          className="hidden"
                        />
                        {referenceImageUrl ? (
                          <div className="flex items-center gap-3 p-2 border border-slate-200 rounded-lg bg-slate-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={referenceImageUrl}
                              alt="Reference"
                              className="h-10 w-10 rounded object-cover border border-slate-200"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">Attached</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => setReferenceImageUrl(null)}>
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full p-3 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl bg-slate-50/50 text-center transition-all cursor-pointer"
                          >
                            <Upload className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                            <span className="text-xs font-bold text-slate-700 block">Upload sketch or tech pack</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Accordion 6: Prompt & Instructions */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection("advanced")}
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-blue-600" />
                        6. Prompt Instructions
                      </span>
                      {openSections.advanced ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    </button>

                    {openSections.advanced && (
                      <div className="p-3.5 bg-white border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700">Specific Prompt</label>
                          <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
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
                          rows={3}
                          placeholder="e.g. Black and red boxing gloves with premium leather texture."
                          value={additionalInstructions}
                          onChange={(e) => setAdditionalInstructions(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Action Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full shadow-md shadow-blue-500/20 py-3 text-sm font-bold rounded-xl cursor-pointer"
                  disabled={isGenerating}
                  onClick={handleGenerateMockup}
                  leftIcon={isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                >
                  {isGenerating ? "Synthesizing with OpenAI..." : "Generate AI Mockup"}
                </Button>
              </div>
            </div>

            {/* ======================================================= */}
            {/* RIGHT PANEL: FLEX-1 PREVIEW & HISTORY PANEL             */}
            {/* ======================================================= */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col min-h-[560px] justify-between">
                {/* Canvas Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-bold text-slate-900">
                      {activeGeneration ? activeGeneration.productName : "Generated Preview"}
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

                {/* Canvas Center Render / Progress Animation */}
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
                    <div className="p-8 text-center space-y-3 max-w-sm">
                      <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
                        <ImageIcon className="h-7 w-7" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">
                        AI Generated Mockup Will Appear Here
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Configure your product details on the left and click <strong>&ldquo;Generate AI Mockup&rdquo;</strong> to create a photorealistic visual.
                      </p>
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

              {/* Recent Generations Strip (When items exist in history) */}
              {allGenerations.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-600" />
                      Recent Generations ({allGenerations.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("history")}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      View All →
                    </button>
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
        {/* 3. TAB: SAVED DESIGNS GALLERY                             */}
        {/* ========================================================= */}
        {activeTab === "saved" && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search saved designs..."
                    value={gallerySearch}
                    onChange={(e) => setGallerySearch(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>

                <Select
                  value={galleryCategoryFilter}
                  onChange={(e) => setGalleryCategoryFilter(e.target.value)}
                  options={[
                    { label: "All Categories", value: "all" },
                    ...PRODUCT_CATEGORIES.map((c) => ({ label: c.label, value: c.value })),
                  ]}
                />
              </div>

              <span className="text-xs font-semibold text-slate-500">
                {savedDesigns.length} Saved Visuals
              </span>
            </div>

            {savedDesigns.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {savedDesigns.map((design) => (
                  <div
                    key={design.id}
                    className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between group hover:shadow-md transition-shadow"
                  >
                    <div className="relative bg-slate-50 aspect-square flex items-center justify-center p-3 border-b border-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={design.imageUrl}
                        alt={design.productName}
                        className="h-full w-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleToggleSave(design)}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 shadow-xs text-amber-600 hover:bg-white cursor-pointer"
                        title="Remove from Saved"
                      >
                        <BookmarkCheck className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {design.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(design.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{design.productName}</h3>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{design.prompt}</p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleReloadInGenerator(design)}
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Open in Workspace <ChevronRight className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(design.imageUrl, design.productName)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
                          title="Download Image"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-white border border-slate-200/80 rounded-2xl space-y-2">
                <Bookmark className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Saved Designs Yet</h3>
                <p className="text-xs text-slate-500">
                  Bookmark any generated mockup from the workspace to save it in this library.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. TAB: GENERATION HISTORY                                */}
        {/* ========================================================= */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search history records..."
                  value={gallerySearch}
                  onChange={(e) => setGallerySearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <span className="text-xs font-semibold text-slate-500">
                {historyRecords.length} Total Generations Logged
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Preview</th>
                      <th className="py-3 px-3">Product Name</th>
                      <th className="py-3 px-2">Category</th>
                      <th className="py-3 px-2">Style</th>
                      <th className="py-3 px-3">Prompt Details</th>
                      <th className="py-3 px-2">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyRecords.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {item.productName}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 text-[11px] truncate max-w-[120px]">
                          {item.style}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[260px]" title={item.enhancedPrompt}>
                          {item.enhancedPrompt}
                        </td>
                        <td className="py-2.5 px-2 text-slate-400 font-mono text-[10px]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Open in Workspace"
                              onClick={() => handleReloadInGenerator(item)}
                            >
                              <Wand2 className="h-3.5 w-3.5 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Download"
                              onClick={() => handleDownload(item.imageUrl, item.productName)}
                            >
                              <Download className="h-3.5 w-3.5 text-slate-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              onClick={() => handleDeleteRecord(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. MODAL: FULLSCREEN HIGH-RES VIEW                        */}
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
              <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-700">
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
        {/* 6. MODAL: LIVE PROMPT PREVIEW                             */}
        {/* ========================================================= */}
        <Modal
          isOpen={promptPreviewModalOpen}
          onClose={() => setPromptPreviewModalOpen(false)}
          title="FactoryOS AI Prompt Engineering Preview"
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Technical prompt automatically constructed for OpenAI DALL-E 3 with fabric GSM, stitching parameters, and studio lighting:
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

export default function AiMockupGeneratorPage() {
  return (
    <React.Suspense fallback={<div className="flex h-96 items-center justify-center text-slate-400">Loading AI Mockup Generator...</div>}>
      <MockupGeneratorContent />
    </React.Suspense>
  );
}

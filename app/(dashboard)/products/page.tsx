"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard, CardGrid, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState, Pagination } from "@/components/ui/Misc";
import { FormField, FormSection } from "@/components/forms/FormField";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Scissors,
  RotateCcw,
  Trash2,
  ArrowLeft,
  Save,
  Sparkles,
  RefreshCw,
} from "lucide-react";

import {
  getProductsFromSupabase,
  createProductInSupabase,
  updateProductInSupabase,
  deleteProductInSupabase,
  GarmentProduct,
  PRODUCTS_STORAGE_KEY as STORAGE_KEY,
} from "@/lib/services/products-service";

export type { GarmentProduct };

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

const CATEGORY_OPTIONS = [
  { value: "hoodies", label: "Hoodies & Sweatshirts" },
  { value: "tshirts", label: "T-Shirts & Polos" },
  { value: "joggers", label: "Joggers & Bottoms" },
  { value: "jackets", label: "Jackets & Outerwear" },
];

const CATEGORY_LABEL_MAP: Record<string, string> = {
  hoodies: "Hoodies & Sweatshirts",
  tshirts: "T-Shirts & Polos",
  joggers: "Joggers & Bottoms",
  jackets: "Jackets & Outerwear",
};

const emptyProductsArray: GarmentProduct[] = [];

export default function ProductsPage() {
  const { success, error: toastError } = useToast();

  // Mode: "list" | "create"
  const [viewMode, setViewMode] = React.useState<"list" | "create">("list");

  // Hydration-safe localStorage synchronization
  const getSnapshot = React.useCallback(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) || "[]" : "[]";
    } catch {
      return "[]";
    }
  }, []);

  const getServerSnapshot = React.useCallback(() => "[]", []);

  const subscribe = React.useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }, []);

  const rawJson = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [localOverride, setLocalOverride] = React.useState<GarmentProduct[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  const loadProducts = React.useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const data = await getProductsFromSupabase();
      if (data && data.length > 0) {
        setLocalOverride(data);
      }
      if (showToast) {
        success("Product Catalog Refreshed", { description: "Loaded live garment styles from MySQL database." });
      }
    } catch (err: any) {
      console.error("Failed to load products:", err);
      if (showToast) {
        toastError("Failed to Refresh Products", { description: err.message });
      }
    } finally {
      setLoading(false);
    }
  }, [success, toastError]);

  // Sync on mount
  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const products = React.useMemo(() => {
    if (localOverride !== null) return localOverride;
    try {
      return JSON.parse(rawJson) as GarmentProduct[];
    } catch {
      return emptyProductsArray;
    }
  }, [rawJson, localOverride]);

  // Helper to persist products
  const saveProductsList = (newProducts: GarmentProduct[]) => {
    setLocalOverride(newProducts);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProducts));
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore
    }
  };

  // Filter & pagination state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  // Delete dialog state
  const [productToDelete, setProductToDelete] = React.useState<GarmentProduct | null>(null);

  // Form input state
  const [styleCode, setStyleCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("hoodies");
  const [sam, setSam] = React.useState("");
  const [fabricType, setFabricType] = React.useState("");
  const [gsm, setGsm] = React.useState("");
  const [consumptionKg, setConsumptionKg] = React.useState("");
  const [wastagePct, setWastagePct] = React.useState("5.0");
  const [selectedSizes, setSelectedSizes] = React.useState<string[]>([]);

  // In-form validation errors
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Reset form completely for a clean new session
  const resetFormState = () => {
    setStyleCode("");
    setName("");
    setCategory("hoodies");
    setSam("");
    setFabricType("");
    setGsm("");
    setConsumptionKg("");
    setWastagePct("5.0");
    setSelectedSizes([]);
    setFormErrors({});
  };

  const handleOpenCreateForm = () => {
    resetFormState();
    setViewMode("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelCreate = () => {
    resetFormState();
    setViewMode("list");
  };

  const handleToggleSize = (sz: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]
    );
    if (formErrors.sizes) {
      setFormErrors((prev) => ({ ...prev, sizes: "" }));
    }
  };

  const handleSelectAllSizes = () => {
    setSelectedSizes(ALL_SIZES);
    if (formErrors.sizes) {
      setFormErrors((prev) => ({ ...prev, sizes: "" }));
    }
  };

  const handleClearSizes = () => {
    setSelectedSizes([]);
  };

  // Form submission with strict in-form field validation
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!styleCode.trim()) {
      errors.styleCode = "Style Code / SKU is required.";
    } else if (products.some((p) => p.styleCode.toLowerCase() === styleCode.trim().toLowerCase())) {
      errors.styleCode = "This Style Code is already in use. Please enter a unique identifier.";
    }

    if (!name.trim()) {
      errors.name = "Product name is required.";
    }

    if (!fabricType.trim()) {
      errors.fabricType = "Primary fabric type is required.";
    }

    const gsmNum = parseFloat(gsm);
    if (!gsm.trim() || isNaN(gsmNum) || gsmNum <= 0) {
      errors.gsm = "Please enter a valid positive GSM weight (e.g. 340).";
    }

    const consumptionNum = parseFloat(consumptionKg);
    if (!consumptionKg.trim() || isNaN(consumptionNum) || consumptionNum <= 0) {
      errors.consumptionKg = "Please enter a valid fabric consumption per unit in KG (e.g. 0.45).";
    }

    const wastageNum = parseFloat(wastagePct);
    if (isNaN(wastageNum) || wastageNum < 0 || wastageNum > 50) {
      errors.wastagePct = "Cutting wastage allowance must be between 0% and 50%.";
    }

    if (sam.trim()) {
      const samNum = parseFloat(sam);
      if (isNaN(samNum) || samNum < 0) {
        errors.sam = "SAM must be 0 or a positive number.";
      }
    }

    if (selectedSizes.length === 0) {
      errors.sizes = "Please select at least one size for this garment style.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toastError("Please fix the errors in the form before saving.");
      return;
    }

    // Create the garment product
    const newProduct: GarmentProduct = {
      id: "prod_" + Date.now(),
      styleCode: styleCode.trim().toUpperCase(),
      name: name.trim(),
      category,
      sam: sam.trim() || "0",
      fabricType: fabricType.trim(),
      gsm: gsm.trim(),
      consumptionKg: consumptionKg.trim(),
      wastagePct: wastagePct.trim() || "5.0",
      sizes: selectedSizes,
      bomStatus: "verified",
      productionStatus: "active",
      createdAt: new Date().toISOString(),
    };

    const updated = [newProduct, ...products];
    saveProductsList(updated);
    createProductInSupabase(newProduct).catch((err) => console.error(err));

    success("Product created successfully", {
      description: `${newProduct.styleCode} — ${newProduct.name} has been added to the garment catalog.`,
    });

    resetFormState();
    setViewMode("list");
  };

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    const updated = products.filter((p) => p.id !== productToDelete.id);
    saveProductsList(updated);
    deleteProductInSupabase(productToDelete.id, productToDelete.styleCode).catch((err) => console.error(err));
    success("Product deleted", {
      description: `${productToDelete.styleCode} was removed from the garment catalog.`,
    });
    setProductToDelete(null);
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      p.styleCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fabricType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || p.category === categoryFilter;

    const matchesStatus =
      statusFilter === "all" || p.productionStatus === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <>
      <TopNav
        title={
          viewMode === "create"
            ? "Create Garment Product"
            : "Garment Products & Style Catalog"
        }
      />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* ============================================================
            VIEW 1: FULL-CANVAS PRODUCT CREATION FORM STUDIO
            ============================================================ */}
        {viewMode === "create" ? (
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Header & Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back to Products Catalog"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                      Add New Garment Product
                    </h1>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      BOM Tech Pack Editor
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define technical style specifications, cutting yield consumption, and size matrix.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                <Button variant="secondary" size="md" onClick={handleCancelCreate}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={handleSaveProduct}
                >
                  Save Garment Product
                </Button>
              </div>
            </div>

            {/* Form Canvas (Spacious Two-Column Grid on Desktop) */}
            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
              {/* Left Column: Form Sections (8 cols) */}
              <div className="lg:col-span-8 space-y-6 min-w-0">
                {/* 1. Style Specification */}
                <Card>
                  <FormSection
                    title="1. Style Specification & Classification"
                    description="Enter the unique manufacturing SKU and product attributes"
                  >
                    <FormField
                      label="Style Code / Identifier"
                      required
                      error={formErrors.styleCode}
                    >
                      <Input
                        value={styleCode}
                        onChange={(e) => {
                          setStyleCode(e.target.value);
                          if (formErrors.styleCode) setFormErrors((p) => ({ ...p, styleCode: "" }));
                        }}
                        placeholder="e.g. HD-380-01"
                        required
                      />
                    </FormField>

                    <FormField
                      label="Product Name"
                      required
                      error={formErrors.name}
                    >
                      <Input
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (formErrors.name) setFormErrors((p) => ({ ...p, name: "" }));
                        }}
                        placeholder="e.g. Heavyweight Pullover Hoodie (380 GSM)"
                        required
                      />
                    </FormField>

                    <FormField label="Product Category" required>
                      <Select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        options={CATEGORY_OPTIONS}
                      />
                    </FormField>

                    <FormField
                      label="Standard Allowed Minute (SAM)"
                      error={formErrors.sam}
                    >
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={sam}
                        onChange={(e) => {
                          setSam(e.target.value);
                          if (formErrors.sam) setFormErrors((p) => ({ ...p, sam: "" }));
                        }}
                        placeholder="e.g. 18.5"
                        suffix="mins"
                      />
                    </FormField>
                  </FormSection>
                </Card>

                {/* 2. Fabric & Consumption Yield */}
                <Card>
                  <FormSection
                    title="2. Fabric Specification & Cutting Yield"
                    description="Define raw material requirements, GSM, and unit consumption"
                  >
                    <FormField
                      label="Primary Fabric Type"
                      required
                      error={formErrors.fabricType}
                    >
                      <Input
                        value={fabricType}
                        onChange={(e) => {
                          setFabricType(e.target.value);
                          if (formErrors.fabricType) setFormErrors((p) => ({ ...p, fabricType: "" }));
                        }}
                        placeholder="e.g. 100% Combed Cotton French Terry"
                        required
                      />
                    </FormField>

                    <FormField
                      label="Fabric GSM"
                      required
                      error={formErrors.gsm}
                    >
                      <Input
                        type="number"
                        min="1"
                        value={gsm}
                        onChange={(e) => {
                          setGsm(e.target.value);
                          if (formErrors.gsm) setFormErrors((p) => ({ ...p, gsm: "" }));
                        }}
                        placeholder="380"
                        suffix="GSM"
                        required
                      />
                    </FormField>

                    <FormField
                      label="Fabric Consumption (KG / Piece)"
                      required
                      error={formErrors.consumptionKg}
                    >
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={consumptionKg}
                        onChange={(e) => {
                          setConsumptionKg(e.target.value);
                          if (formErrors.consumptionKg) setFormErrors((p) => ({ ...p, consumptionKg: "" }));
                        }}
                        placeholder="0.68"
                        suffix="KG/pc"
                        required
                      />
                    </FormField>

                    <FormField
                      label="Cutting Wastage Allowance (%)"
                      required
                      error={formErrors.wastagePct}
                    >
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="50"
                        value={wastagePct}
                        onChange={(e) => {
                          setWastagePct(e.target.value);
                          if (formErrors.wastagePct) setFormErrors((p) => ({ ...p, wastagePct: "" }));
                        }}
                        placeholder="5.0"
                        suffix="%"
                        required
                      />
                    </FormField>
                  </FormSection>
                </Card>

                {/* 3. Size Matrix (All start UNCHECKED) */}
                <Card>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          3. Size Matrix & Range
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Select all sizes available for this garment style (all start clean).
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAllSizes}
                          className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={handleClearSizes}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {ALL_SIZES.map((sz) => {
                        const isChecked = selectedSizes.includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => handleToggleSize(sz)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              isChecked
                                ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs ring-2 ring-blue-500/20"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                            }`}
                          >
                            <span
                              className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] font-bold ${
                                isChecked
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-slate-300 bg-white text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <span>{sz}</span>
                          </button>
                        );
                      })}
                    </div>

                    {formErrors.sizes && (
                      <p className="text-xs font-medium text-red-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {formErrors.sizes}
                      </p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right Column: Live Summary Preview & Actions (4 cols) */}
              <div className="lg:col-span-4 space-y-6 min-w-0">
                <Card className="sticky top-20 bg-slate-50/70 border-slate-200/90 shadow-xs">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        BOM Style Preview
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <p className="text-slate-400 font-medium">Style SKU</p>
                        <p className="font-mono font-bold text-sm text-blue-600 truncate">
                          {styleCode.trim().toUpperCase() || "— NOT SPECIFIED —"}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <p className="text-slate-400 font-medium">Product Name</p>
                        <p className="font-bold text-slate-900 truncate">
                          {name.trim() || "— Not Specified —"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <p className="text-slate-400 font-medium">Category</p>
                          <p className="font-semibold text-slate-800 truncate">
                            {CATEGORY_LABEL_MAP[category] || category}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <p className="text-slate-400 font-medium">GSM Weight</p>
                          <p className="font-semibold text-slate-800 truncate">
                            {gsm.trim() ? `${gsm.trim()} GSM` : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <p className="text-slate-400 font-medium">Estimated Fabric / 100 Pcs</p>
                        <p className="font-mono font-bold text-emerald-700 text-sm">
                          {consumptionKg.trim()
                            ? `${(
                                parseFloat(consumptionKg) *
                                100 *
                                (1 + (parseFloat(wastagePct) || 5) / 100)
                              ).toFixed(1)} KG`
                            : "0.0 KG"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Includes {wastagePct || "5.0"}% cutting wastage buffer
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <p className="text-slate-400 font-medium">Selected Sizes</p>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {selectedSizes.length > 0 ? (
                            selectedSizes.map((sz) => (
                              <span
                                key={sz}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {sz}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">No sizes selected</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <Button
                        variant="primary"
                        className="w-full h-11 text-xs font-bold"
                        leftIcon={<Save className="h-4 w-4" />}
                        onClick={handleSaveProduct}
                      >
                        Save Garment Product
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full"
                        size="sm"
                        onClick={handleCancelCreate}
                      >
                        Cancel & Return
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </form>
          </div>
        ) : (
          /* ============================================================
              VIEW 2: PRODUCTS CATALOG TABLE & OVERVIEW
              ============================================================ */
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Page Header */}
            <PageHeader
              title="Products & Garment Catalog"
              description="Manage garment styles, tech packs, size matrices, fabric yield consumption, and Bill of Materials (BOM)."
              actions={
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
                    onClick={() => loadProducts(true)}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={handleOpenCreateForm}
                  >
                    Add Product
                  </Button>
                </div>
              }
            />

            {/* 4 Meaningful KPI Cards */}
            <CardGrid columns={4}>
              <StatCard
                label="Total Garment Styles"
                value={String(products.length)}
                sub="Active catalog styles"
                icon={<Package className="h-5 w-5" />}
                iconColor="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Active In Production"
                value={String(products.filter((p) => p.productionStatus === "active").length)}
                sub="Currently on sewing lines"
                icon={<Scissors className="h-5 w-5" />}
                iconColor="bg-amber-50 text-amber-600"
              />
              <StatCard
                label="Verified BOM Sheets"
                value={String(products.filter((p) => p.bomStatus === "verified").length)}
                sub="With approved consumption"
                icon={<CheckCircle2 className="h-5 w-5" />}
                iconColor="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                label="Low Fabric Stock"
                value="0"
                sub="Styles requiring fabric reorder"
                icon={<AlertCircle className="h-5 w-5" />}
                iconColor="bg-rose-50 text-rose-600"
              />
            </CardGrid>

            {/* Search & Filter Toolbar */}
            <Card noPadding className="p-3.5 sm:p-4 bg-white border-slate-200/80 shadow-xs">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 min-w-0">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products by style SKU, name, or fabric..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    <option value="hoodies">Hoodies & Sweatshirts</option>
                    <option value="tshirts">T-Shirts & Polos</option>
                    <option value="joggers">Joggers & Bottoms</option>
                    <option value="jackets">Jackets & Outerwear</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Production</option>
                    <option value="sample">Sample Development</option>
                    <option value="queued">Queued</option>
                  </select>

                  {(searchQuery || categoryFilter !== "all" || statusFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setSearchQuery("");
                        setCategoryFilter("all");
                        setStatusFilter("all");
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Main Products Table */}
            <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-xs text-left min-w-[900px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Style / SKU</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Fabric & GSM</th>
                      <th className="py-3 px-4">Size Range</th>
                      <th className="py-3 px-4">Yield / Piece</th>
                      <th className="py-3 px-4 text-center">BOM Status</th>
                      <th className="py-3 px-4 text-center">Production Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-0">
                          <EmptyState
                            icon={<Package className="h-6 w-6 text-blue-600" />}
                            title={products.length === 0 ? "No products have been added yet" : "No matching products found"}
                            description={
                              products.length === 0
                                ? "Create your first garment style to configure size matrices, fabric consumption yield, and Bill of Materials (BOM)."
                                : "Try adjusting your search query or filters to find the garment style."
                            }
                            actionLabel="Add Garment Product"
                            actionIcon={<Plus className="h-4 w-4" />}
                            onAction={handleOpenCreateForm}
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                            {product.styleCode}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[200px]">
                            <span className="truncate block">{product.name}</span>
                            {product.sam && product.sam !== "0" && (
                              <span className="text-[11px] font-normal text-slate-400 block">
                                SAM: {product.sam} mins
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {CATEGORY_LABEL_MAP[product.category] || product.category}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            <span className="font-semibold block truncate max-w-[180px]">{product.fabricType}</span>
                            <span className="text-[11px] text-slate-400 font-mono block">
                              {product.gsm} GSM
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {product.sizes.map((sz) => (
                                <span
                                  key={sz}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  {sz}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            {product.consumptionKg} KG
                            <span className="block text-[10px] text-slate-400">
                              +{product.wastagePct}% waste
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge variant="success">Verified BOM</Badge>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge variant="primary">Active</Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setProductToDelete(product)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={page}
                pageSize={10}
                total={filteredProducts.length}
                onPageChange={setPage}
              />
            </Card>

            {/* In-App Delete Confirmation Dialog (Zero native browser confirm) */}
            <ConfirmDialog
              isOpen={Boolean(productToDelete)}
              onClose={() => setProductToDelete(null)}
              onConfirm={handleConfirmDelete}
              title="Delete Garment Style"
              description={
                productToDelete
                  ? `Are you sure you want to delete "${productToDelete.styleCode} — ${productToDelete.name}"? This will remove its BOM specifications from your catalog.`
                  : ""
              }
              confirmLabel="Delete Product"
              cancelLabel="Cancel"
              destructive
            />
          </div>
        )}
      </div>
    </>
  );
}

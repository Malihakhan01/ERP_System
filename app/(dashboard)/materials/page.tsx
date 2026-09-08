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
  Layers,
  Plus,
  Search,
  Warehouse,
  AlertTriangle,
  Boxes,
  RotateCcw,
  Trash2,
  ArrowLeft,
  Save,
  Sparkles,
  RefreshCw,
} from "lucide-react";

import {
  getMaterialsFromSupabase,
  createMaterialInSupabase,
  updateMaterialInSupabase,
  deleteMaterialInSupabase,
  RawMaterial,
  MATERIALS_STORAGE_KEY as STORAGE_KEY,
} from "@/lib/services/materials-service";

export type { RawMaterial };

const CATEGORY_OPTIONS = [
  { value: "fabric", label: "Knitted & Woven Fabrics" },
  { value: "trims", label: "Zippers, Buttons & Cords" },
  { value: "labels", label: "Labels, Tags & Badges" },
  { value: "packaging", label: "Polybags & Master Cartons" },
];

const CATEGORY_LABEL_MAP: Record<string, string> = {
  fabric: "Knitted & Woven Fabrics",
  trims: "Zippers, Buttons & Cords",
  labels: "Labels, Tags & Badges",
  packaging: "Polybags & Master Cartons",
};

const UOM_OPTIONS = [
  { value: "kg", label: "Kilograms (KG) — Fabric & Yarn" },
  { value: "meters", label: "Meters (M) — Rib & Elastic" },
  { value: "pieces", label: "Pieces (Pcs) — Zippers & Badges" },
  { value: "gross", label: "Gross (144 Pcs) — Buttons" },
  { value: "rolls", label: "Rolls — Sewing Thread" },
];

const UOM_LABEL_MAP: Record<string, string> = {
  kg: "KG",
  meters: "M",
  pieces: "Pcs",
  gross: "Gross",
  rolls: "Rolls",
};

const emptyMaterialsArray: RawMaterial[] = [];

export default function MaterialsPage() {
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

  const [localOverride, setLocalOverride] = React.useState<RawMaterial[] | null>(null);
  const [loadingMaterials, setLoadingMaterials] = React.useState(false);

  const loadMaterials = React.useCallback(async (showToast = false) => {
    setLoadingMaterials(true);
    try {
      const data = await getMaterialsFromSupabase();
      if (data && data.length > 0) {
        setLocalOverride(data);
      }
      if (showToast) {
        success("Raw Materials Refreshed", { description: "Loaded live material SKUs and roll stock from MySQL." });
      }
    } catch (err: any) {
      console.error("Failed to load materials:", err);
      if (showToast) {
        toastError("Failed to Refresh Materials", { description: err.message });
      }
    } finally {
      setLoadingMaterials(false);
    }
  }, [success, toastError]);

  // Sync on mount
  React.useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const materials = React.useMemo(() => {
    if (localOverride !== null) return localOverride;
    try {
      return JSON.parse(rawJson) as RawMaterial[];
    } catch {
      return emptyMaterialsArray;
    }
  }, [rawJson, localOverride]);

  // Helper to persist materials list
  const saveMaterialsList = (newMaterials: RawMaterial[]) => {
    setLocalOverride(newMaterials);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMaterials));
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore
    }
  };

  // Filter & pagination state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [locationFilter, setLocationFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  // Delete dialog state
  const [materialToDelete, setMaterialToDelete] = React.useState<RawMaterial | null>(null);

  // Form input state
  const [materialCode, setMaterialCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<"fabric" | "trims" | "labels" | "packaging">("fabric");
  const [color, setColor] = React.useState("");
  const [uom, setUom] = React.useState<"kg" | "meters" | "pieces" | "gross" | "rolls">("kg");
  const [gsm, setGsm] = React.useState("");
  const [unitCost, setUnitCost] = React.useState("");
  const [reorderPoint, setReorderPoint] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [currentStock, setCurrentStock] = React.useState("0");

  // In-form validation errors
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Reset form completely for a fresh session
  const resetFormState = () => {
    setMaterialCode("");
    setName("");
    setCategory("fabric");
    setColor("");
    setUom("kg");
    setGsm("");
    setUnitCost("");
    setReorderPoint("");
    setLocation("");
    setCurrentStock("0");
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

  // Save new material with in-form validation
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!materialCode.trim()) {
      errors.materialCode = "Material Code / SKU is required.";
    } else if (materials.some((m) => m.materialCode.toLowerCase() === materialCode.trim().toLowerCase())) {
      errors.materialCode = "This Material Code is already registered. Please use a unique SKU.";
    }

    if (!name.trim()) {
      errors.name = "Material name and description are required.";
    }

    const costNum = parseFloat(unitCost);
    if (!unitCost.trim() || isNaN(costNum) || costNum <= 0) {
      errors.unitCost = "Please enter a valid positive unit cost in PKR (e.g. 1850).";
    }

    const reorderNum = parseFloat(reorderPoint);
    if (!reorderPoint.trim() || isNaN(reorderNum) || reorderNum < 0) {
      errors.reorderPoint = "Please enter a valid safety reorder threshold (0 or higher).";
    }

    const stockNum = parseFloat(currentStock);
    if (isNaN(stockNum) || stockNum < 0) {
      errors.currentStock = "Current stock quantity cannot be negative.";
    }

    if (!location.trim()) {
      errors.location = "Warehouse bay or bin location is required (e.g. Bay 1, Rack A-02).";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toastError("Please resolve the errors highlighted in the form before saving.");
      return;
    }

    const stockVal = parseFloat(currentStock) || 0;
    const reorderVal = parseFloat(reorderPoint) || 0;

    let status: "normal" | "low" | "critical" = "normal";
    if (stockVal <= 0) {
      status = "critical";
    } else if (stockVal <= reorderVal) {
      status = "low";
    }

    const newMaterial: RawMaterial = {
      id: "mat_" + Date.now(),
      materialCode: materialCode.trim().toUpperCase(),
      name: name.trim(),
      category,
      color: color.trim() || "Standard",
      uom,
      gsm: gsm.trim() || undefined,
      unitCost: unitCost.trim(),
      reorderPoint: reorderPoint.trim(),
      location: location.trim(),
      currentStock: currentStock.trim() || "0",
      status,
      createdAt: new Date().toISOString(),
    };

    const updated = [newMaterial, ...materials];
    saveMaterialsList(updated);
    createMaterialInSupabase(newMaterial).catch((err) => console.error(err));

    success("Material added successfully", {
      description: `${newMaterial.materialCode} — ${newMaterial.name} has been added to the raw materials catalog.`,
    });

    resetFormState();
    setViewMode("list");
  };

  const handleConfirmDelete = () => {
    if (!materialToDelete) return;
    const updated = materials.filter((m) => m.id !== materialToDelete.id);
    saveMaterialsList(updated);
    deleteMaterialInSupabase(materialToDelete.id, materialToDelete.materialCode).catch((err) => console.error(err));
    success("Material removed", {
      description: `${materialToDelete.materialCode} has been deleted from the catalog.`,
    });
    setMaterialToDelete(null);
  };

  // Filtered materials list
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      m.materialCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.color.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || m.category === categoryFilter;

    const matchesLocation =
      locationFilter === "all" || m.location.toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Calculate dynamic KPI metrics
  const totalMaterialsCount = materials.length;
  const fabricStockKg = materials
    .filter((m) => m.category === "fabric" && m.uom === "kg")
    .reduce((acc, curr) => acc + (parseFloat(curr.currentStock) || 0), 0);
  const trimsUnitsCount = materials
    .filter((m) => m.category !== "fabric")
    .reduce((acc, curr) => acc + (parseFloat(curr.currentStock) || 0), 0);
  const lowStockCount = materials.filter(
    (m) => (parseFloat(m.currentStock) || 0) <= (parseFloat(m.reorderPoint) || 0) && (parseFloat(m.reorderPoint) || 0) > 0
  ).length;

  return (
    <>
      <TopNav
        title={
          viewMode === "create"
            ? "Register Raw Material"
            : "Raw Materials, Fabrics & Trims Inventory"
        }
      />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* ============================================================
            VIEW 1: FULL-CANVAS REGISTER RAW MATERIAL STUDIO
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
                  title="Back to Materials Catalog"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                      Register New Raw Material
                    </h1>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Warehouse Stock Item
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Catalog textile fabric rolls, yarn lots, sewing threads, zippers, and packaging trims.
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
                  onClick={handleSaveMaterial}
                >
                  Save Raw Material
                </Button>
              </div>
            </div>

            {/* Form Canvas (Spacious Two-Column Grid on Desktop) */}
            <form onSubmit={handleSaveMaterial} className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
              {/* Left Column: Form Sections (8 cols) */}
              <div className="lg:col-span-8 space-y-6 min-w-0">
                {/* 1. Material Identification */}
                <Card>
                  <FormSection
                    title="1. Material Identification & Category"
                    description="Enter unique SKU code, description, and color specifications"
                  >
                    <FormField
                      label="Material Code / SKU"
                      required
                      error={formErrors.materialCode}
                    >
                      <Input
                        value={materialCode}
                        onChange={(e) => {
                          setMaterialCode(e.target.value);
                          if (formErrors.materialCode) setFormErrors((p) => ({ ...p, materialCode: "" }));
                        }}
                        placeholder="e.g. FAB-FL-380-BLK"
                        required
                      />
                    </FormField>

                    <FormField
                      label="Material Name / Description"
                      required
                      error={formErrors.name}
                    >
                      <Input
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (formErrors.name) setFormErrors((p) => ({ ...p, name: "" }));
                        }}
                        placeholder="e.g. 100% Combed Cotton 380 GSM French Terry Fleece"
                        required
                      />
                    </FormField>

                    <FormField label="Material Category" required>
                      <Select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as "fabric" | "trims" | "labels" | "packaging")}
                        options={CATEGORY_OPTIONS}
                      />
                    </FormField>

                    <FormField label="Color / Shade">
                      <Input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="e.g. Jet Black (Pantone 19-4008 TCX)"
                      />
                    </FormField>
                  </FormSection>
                </Card>

                {/* 2. Units & Valuation */}
                <Card>
                  <FormSection
                    title="2. Units, Valuation & Safety Reorder Threshold"
                    description="Set measurement unit, unit cost, safety threshold, and bay storage"
                  >
                    <FormField label="Unit of Measurement (UOM)" required>
                      <Select
                        value={uom}
                        onChange={(e) => setUom(e.target.value as "kg" | "meters" | "pieces" | "gross" | "rolls")}
                        options={UOM_OPTIONS}
                      />
                    </FormField>

                    {category === "fabric" && (
                      <FormField label="Fabric GSM (Optional)">
                        <Input
                          type="number"
                          value={gsm}
                          onChange={(e) => setGsm(e.target.value)}
                          placeholder="e.g. 380"
                          suffix="GSM"
                        />
                      </FormField>
                    )}

                    <FormField
                      label="Standard Unit Cost (PKR)"
                      required
                      error={formErrors.unitCost}
                    >
                      <Input
                        type="number"
                        step="0.5"
                        min="0.1"
                        value={unitCost}
                        onChange={(e) => {
                          setUnitCost(e.target.value);
                          if (formErrors.unitCost) setFormErrors((p) => ({ ...p, unitCost: "" }));
                        }}
                        placeholder="1850"
                        prefix="Rs"
                        required
                      />
                    </FormField>

                    <FormField
                      label="Safety Reorder Threshold"
                      required
                      error={formErrors.reorderPoint}
                    >
                      <Input
                        type="number"
                        min="0"
                        value={reorderPoint}
                        onChange={(e) => {
                          setReorderPoint(e.target.value);
                          if (formErrors.reorderPoint) setFormErrors((p) => ({ ...p, reorderPoint: "" }));
                        }}
                        placeholder="250"
                        suffix={UOM_LABEL_MAP[uom] || "Units"}
                        required
                      />
                    </FormField>

                    <FormField
                      label="Initial Stock Quantity"
                      error={formErrors.currentStock}
                    >
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={currentStock}
                        onChange={(e) => {
                          setCurrentStock(e.target.value);
                          if (formErrors.currentStock) setFormErrors((p) => ({ ...p, currentStock: "" }));
                        }}
                        placeholder="0"
                        suffix={UOM_LABEL_MAP[uom] || "Units"}
                      />
                    </FormField>

                    <FormField
                      label="Warehouse Bay / Bin Location"
                      required
                      error={formErrors.location}
                    >
                      <Input
                        value={location}
                        onChange={(e) => {
                          setLocation(e.target.value);
                          if (formErrors.location) setFormErrors((p) => ({ ...p, location: "" }));
                        }}
                        placeholder="e.g. Bay 1, Rack C-04"
                        required
                      />
                    </FormField>
                  </FormSection>
                </Card>
              </div>

              {/* Right Column: Material Live Summary Preview & Actions (4 cols) */}
              <div className="lg:col-span-4 space-y-6 min-w-0">
                <Card className="sticky top-20 bg-slate-50/70 border-slate-200/90 shadow-xs">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Material Item Summary
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <p className="text-slate-400 font-medium">Material Code / SKU</p>
                        <p className="font-mono font-bold text-sm text-indigo-600 truncate">
                          {materialCode.trim().toUpperCase() || "— NOT SPECIFIED —"}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <p className="text-slate-400 font-medium">Description</p>
                        <p className="font-bold text-slate-900 truncate">
                          {name.trim() || "— Not Specified —"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <p className="text-slate-400 font-medium">Category</p>
                          <p className="font-semibold text-slate-800 truncate">
                            {CATEGORY_LABEL_MAP[category]}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <p className="text-slate-400 font-medium">UOM Unit</p>
                          <p className="font-semibold text-slate-800 truncate">
                            {UOM_LABEL_MAP[uom]}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <p className="text-slate-400 font-medium">Unit Cost</p>
                          <p className="font-bold text-slate-900 truncate">
                            {unitCost.trim() ? `Rs ${parseFloat(unitCost).toLocaleString()}` : "—"}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <p className="text-slate-400 font-medium">Reorder Point</p>
                          <p className="font-bold text-amber-700 truncate">
                            {reorderPoint.trim() ? `${reorderPoint.trim()} ${UOM_LABEL_MAP[uom]}` : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <p className="text-slate-400 font-medium">Warehouse Storage</p>
                        <p className="font-semibold text-slate-800 truncate">
                          {location.trim() || "— Unassigned —"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <Button
                        variant="primary"
                        className="w-full h-11 text-xs font-bold"
                        leftIcon={<Save className="h-4 w-4" />}
                        onClick={handleSaveMaterial}
                      >
                        Save Raw Material
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
              VIEW 2: RAW MATERIALS CATALOG TABLE & OVERVIEW
              ============================================================ */
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Page Header */}
            <PageHeader
              title="Raw Materials & Trims Inventory"
              description="Manage textile fabrics, yarn lots, sewing threads, zippers, care labels, and packaging trims across warehouse bays."
              actions={
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={<RefreshCw className={`h-4 w-4 ${loadingMaterials ? "animate-spin" : ""}`} />}
                    onClick={() => loadMaterials(true)}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={handleOpenCreateForm}
                  >
                    Add Material
                  </Button>
                </div>
              }
            />

            {/* 4 Meaningful KPI Cards (Calculated dynamically from real state) */}
            <CardGrid columns={4}>
              <StatCard
                label="Total Raw Materials"
                value={String(totalMaterialsCount)}
                sub="Registered material SKUs"
                icon={<Layers className="h-5 w-5" />}
                iconColor="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Fabric Stock On Hand"
                value={`${fabricStockKg.toLocaleString()} KG`}
                sub="Knit, fleece & woven rolls"
                icon={<Warehouse className="h-5 w-5" />}
                iconColor="bg-indigo-50 text-indigo-600"
              />
              <StatCard
                label="Trims & Accessories"
                value={`${trimsUnitsCount.toLocaleString()} Units`}
                sub="Zippers, buttons & polybags"
                icon={<Boxes className="h-5 w-5" />}
                iconColor="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                label="Below Reorder Point"
                value={`${lowStockCount} Items`}
                sub="Requires purchase order"
                icon={<AlertTriangle className="h-5 w-5" />}
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
                    placeholder="Search materials by code (e.g. FAB-FL-380), description, or color..."
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
                    <option value="fabric">Knitted & Woven Fabrics</option>
                    <option value="trims">Zippers, Buttons & Cords</option>
                    <option value="labels">Labels, Tags & Badges</option>
                    <option value="packaging">Polybags & Master Cartons</option>
                  </select>

                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  >
                    <option value="all">All Locations</option>
                    <option value="bay 1">Bay 1 (Fabrics)</option>
                    <option value="bay 2">Bay 2 (Trims)</option>
                    <option value="bay 3">Bay 3 (Packaging)</option>
                  </select>

                  {(searchQuery || categoryFilter !== "all" || locationFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setSearchQuery("");
                        setCategoryFilter("all");
                        setLocationFilter("all");
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Main Materials Table */}
            <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-xs text-left min-w-[900px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Material Code</th>
                      <th className="py-3 px-4">Material Description</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Color / Shade</th>
                      <th className="py-3 px-4">GSM / UOM</th>
                      <th className="py-3 px-4">Available Stock</th>
                      <th className="py-3 px-4">Reorder Point</th>
                      <th className="py-3 px-4">Unit Cost (PKR)</th>
                      <th className="py-3 px-4 text-center">Stock Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMaterials.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-0">
                          <EmptyState
                            icon={<Layers className="h-6 w-6 text-blue-600" />}
                            title={materials.length === 0 ? "No raw materials registered yet" : "No matching raw materials found"}
                            description={
                              materials.length === 0
                                ? "Catalog production fabrics, GSM weights, color shades, trims, and packaging units to track stock across warehouse bays."
                                : "Try adjusting your search query or filters to find the raw material."
                            }
                            actionLabel="Add Raw Material"
                            actionIcon={<Plus className="h-4 w-4" />}
                            onAction={handleOpenCreateForm}
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredMaterials.map((material) => {
                        const stockVal = parseFloat(material.currentStock) || 0;
                        const reorderVal = parseFloat(material.reorderPoint) || 0;
                        const isLow = stockVal <= reorderVal && reorderVal > 0;

                        return (
                          <tr key={material.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                              {material.materialCode}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[220px]">
                              <span className="truncate block">{material.name}</span>
                              <span className="text-[11px] font-normal text-slate-400 block truncate">
                                Loc: {material.location}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {CATEGORY_LABEL_MAP[material.category] || material.category}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">
                              <span className="font-semibold block truncate max-w-[140px]">{material.color}</span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-700">
                              {material.gsm ? `${material.gsm} GSM` : UOM_LABEL_MAP[material.uom]}
                              <span className="block text-[10px] text-slate-400">
                                ({UOM_LABEL_MAP[material.uom]})
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              {stockVal.toLocaleString()} {UOM_LABEL_MAP[material.uom]}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-500">
                              {reorderVal.toLocaleString()} {UOM_LABEL_MAP[material.uom]}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-900 font-semibold">
                              Rs {parseFloat(material.unitCost).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {isLow ? (
                                <Badge variant="danger">Low Stock</Badge>
                              ) : (
                                <Badge variant="success">Normal</Badge>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setMaterialToDelete(material)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete raw material"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={page}
                pageSize={10}
                total={filteredMaterials.length}
                onPageChange={setPage}
              />
            </Card>

            {/* In-App Delete Confirmation Dialog (Zero native browser confirm) */}
            <ConfirmDialog
              isOpen={Boolean(materialToDelete)}
              onClose={() => setMaterialToDelete(null)}
              onConfirm={handleConfirmDelete}
              title="Delete Raw Material"
              description={
                materialToDelete
                  ? `Are you sure you want to delete "${materialToDelete.materialCode} — ${materialToDelete.name}"? This will remove its inventory entry from your warehouse records.`
                  : ""
              }
              confirmLabel="Delete Material"
              cancelLabel="Cancel"
              destructive
            />
          </div>
        )}
      </div>
    </>
  );
}

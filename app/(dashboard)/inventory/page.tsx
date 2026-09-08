"use client";

import * as React from "react";
import { TopNav } from "@/components/layout/TopNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard, CardGrid, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState, Pagination, Tabs } from "@/components/ui/Misc";
import { FormField, FormSection } from "@/components/forms/FormField";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  Warehouse,
  Plus,
  Search,
  ArrowDownUp,
  AlertTriangle,
  Layers,
  DollarSign,
  Boxes,
  RotateCcw,
  Trash2,
  ArrowLeft,
  Save,
  Sparkles,
  History,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";

import {
  getInventoryFromSupabase,
  getStockMovementsFromSupabase,
  createInventoryItemInSupabase,
  updateInventoryItemInSupabase,
  recordStockMovementInSupabase,
  InventoryItem,
  StockMovementRecord,
  INVENTORY_STORAGE_KEY as STORAGE_KEY,
  MOVEMENTS_STORAGE_KEY,
} from "@/lib/services/inventory-service";

export type { InventoryItem, StockMovementRecord };

const CATEGORY_OPTIONS = [
  { value: "fabric", label: "Knitted & Woven Fabric Rolls" },
  { value: "trims", label: "Trims, Zippers & Badges" },
  { value: "packaging", label: "Polybags & Master Cartons" },
];

const CATEGORY_LABEL_MAP: Record<string, string> = {
  fabric: "Fabric Rolls",
  trims: "Trims & Zippers",
  packaging: "Packaging Goods",
};

const BAY_OPTIONS = [
  { value: "bay_1", label: "Bay 1 (Raw Fabric Hall)" },
  { value: "bay_2", label: "Bay 2 (Trims & Accessories)" },
  { value: "bay_3", label: "Bay 3 (Packaging Goods)" },
  { value: "cutting_table", label: "Cutting Table Floor (Staging)" },
];

const BAY_LABEL_MAP: Record<string, string> = {
  bay_1: "Bay 1 (Fabric Hall)",
  bay_2: "Bay 2 (Trims Rack)",
  bay_3: "Bay 3 (Packaging)",
  cutting_table: "Cutting Table (Floor)",
};

const MOVEMENT_TYPE_LABEL_MAP: Record<string, string> = {
  in: "Stock In — Opening / Mill Receipt",
  issue: "Floor Issue — Cutting & Sewing Production",
  transfer: "Internal Bay Transfer",
  scrap: "Scrap / Cutting End-Loss Adjustment",
  correction: "Cycle Count Correction",
};

const UNIT_OPTIONS = [
  { value: "KG", label: "Kilograms (KG)" },
  { value: "Meters", label: "Meters (M)" },
  { value: "Pcs", label: "Pieces (Pcs)" },
  { value: "Gross", label: "Gross (144 Pcs)" },
  { value: "Rolls", label: "Rolls" },
];

const emptyInventoryArray: InventoryItem[] = [];
const emptyMovementsArray: StockMovementRecord[] = [];

export default function InventoryPage() {
  const { success, error: toastError } = useToast();

  // Mode: "list" | "adjust"
  const [viewMode, setViewMode] = React.useState<"list" | "adjust">("list");
  const [activeTab, setActiveTab] = React.useState<"all" | "fabric" | "trims" | "movements">("all");

  // Hydration-safe localStorage synchronization for inventory
  const getSnapshot = React.useCallback(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) || "[]" : "[]";
    } catch {
      return "[]";
    }
  }, []);

  const getMovementsSnapshot = React.useCallback(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(MOVEMENTS_STORAGE_KEY) || "[]" : "[]";
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
  const rawMovementsJson = React.useSyncExternalStore(subscribe, getMovementsSnapshot, getServerSnapshot);

  const [localOverride, setLocalOverride] = React.useState<InventoryItem[] | null>(null);
  const [localMovementsOverride, setLocalMovementsOverride] = React.useState<StockMovementRecord[] | null>(null);
  const [loadingInventory, setLoadingInventory] = React.useState(false);

  const loadInventory = React.useCallback(async (showToast = false) => {
    setLoadingInventory(true);
    try {
      const [invData, movData] = await Promise.all([
        getInventoryFromSupabase().catch(() => []),
        getStockMovementsFromSupabase().catch(() => []),
      ]);

      if (invData && invData.length > 0) {
        setLocalOverride(invData);
      }
      if (movData && movData.length > 0) {
        setLocalMovementsOverride(movData);
      }

      if (showToast) {
        success("Warehouse Inventory Refreshed", { description: "Loaded live stock rolls and bay allocations from MySQL." });
      }
    } catch (err: any) {
      console.error("Failed to load inventory:", err);
      if (showToast) {
        toastError("Failed to Refresh Inventory", { description: err.message });
      }
    } finally {
      setLoadingInventory(false);
    }
  }, [success, toastError]);

  // Sync on mount
  React.useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const inventoryItems = React.useMemo(() => {
    if (localOverride !== null) return localOverride;
    try {
      return JSON.parse(rawJson) as InventoryItem[];
    } catch {
      return emptyInventoryArray;
    }
  }, [rawJson, localOverride]);

  const movements = React.useMemo(() => {
    if (localMovementsOverride !== null) return localMovementsOverride;
    try {
      return JSON.parse(rawMovementsJson) as StockMovementRecord[];
    } catch {
      return emptyMovementsArray;
    }
  }, [rawMovementsJson, localMovementsOverride]);

  // Persistence helpers
  const saveInventoryList = (newItems: InventoryItem[], newMovements?: StockMovementRecord[]) => {
    setLocalOverride(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      if (newMovements) {
        setLocalMovementsOverride(newMovements);
        localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(newMovements));
      }
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore
    }
  };

  // Filter & pagination state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [bayFilter, setBayFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  // Delete dialog state
  const [itemToDelete, setItemToDelete] = React.useState<InventoryItem | null>(null);

  // Form input state
  const [movementType, setMovementType] = React.useState<"in" | "issue" | "transfer" | "scrap" | "correction">("in");
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [lotNumber, setLotNumber] = React.useState("");
  const [category, setCategory] = React.useState<"fabric" | "trims" | "packaging">("fabric");
  const [bay, setBay] = React.useState("bay_1");
  const [quantity, setQuantity] = React.useState("");
  const [allocatedQty, setAllocatedQty] = React.useState("0");
  const [unit, setUnit] = React.useState("KG");
  const [unitCost, setUnitCost] = React.useState("");
  const [reorderPoint, setReorderPoint] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // In-form validation errors
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Reset form completely for a clean new session
  const resetFormState = () => {
    setMovementType("in");
    setName("");
    setSku("");
    setLotNumber("");
    setCategory("fabric");
    setBay("bay_1");
    setQuantity("");
    setAllocatedQty("0");
    setUnit("KG");
    setUnitCost("");
    setReorderPoint("");
    setNotes("");
    setFormErrors({});
  };

  const handleOpenAdjustForm = () => {
    resetFormState();
    setViewMode("adjust");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleIssueItem = (item: InventoryItem) => {
    resetFormState();
    setMovementType("issue");
    setName(item.name);
    setSku(item.sku);
    setLotNumber(item.lotNumber);
    setCategory(item.category);
    setBay("cutting_table");
    setQuantity("450");
    setAllocatedQty(String(item.allocatedStock || 0));
    setUnit(item.unit || "KG");
    setUnitCost(String(item.unitCost || 0));
    setReorderPoint(String(item.reorderPoint || 0));
    setNotes("Production issue for cutting & sewing line (PRD-2026-003)");
    setViewMode("adjust");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelAdjust = () => {
    resetFormState();
    setViewMode("list");
  };

  // Live parsed calculations for preview
  const parsedQty = parseFloat(quantity) || 0;
  const parsedAllocated = parseFloat(allocatedQty) || 0;
  const parsedCost = parseFloat(unitCost) || 0;
  const parsedReorder = parseFloat(reorderPoint) || 0;
  const totalValuation = parsedQty * parsedCost;

  // Form submission with strict validation
  const handleSaveStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Item name / Material specification is required.";
    }

    if (!sku.trim()) {
      errors.sku = "Material SKU code is required.";
    }

    if (!lotNumber.trim()) {
      errors.lotNumber = "Lot # / Batch identifier is required.";
    }

    if (!quantity.trim() || parsedQty <= 0) {
      errors.quantity = "Please enter a valid positive quantity (e.g. 150).";
    }

    if (!unitCost.trim() || parsedCost <= 0) {
      errors.unitCost = "Please enter a valid unit valuation in PKR (e.g. 1850).";
    }

    if (!reorderPoint.trim() || parsedReorder < 0) {
      errors.reorderPoint = "Safety reorder threshold must be 0 or higher.";
    }

    if (parsedAllocated < 0 || parsedAllocated > parsedQty) {
      errors.allocatedQty = "Allocated quantity cannot exceed available stock.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toastError("Please resolve the errors highlighted in the form before saving.");
      return;
    }

    let health: "healthy" | "low" | "critical" = "healthy";
    if (parsedQty <= 0) {
      health = "critical";
    } else if (parsedQty <= parsedReorder) {
      health = "low";
    }

    // Check if item already exists by SKU and lot
    const existingIndex = inventoryItems.findIndex(
      (item) => item.sku.toLowerCase() === sku.trim().toLowerCase() && item.lotNumber.toLowerCase() === lotNumber.trim().toLowerCase()
    );

    let updatedInventory: InventoryItem[] = [];
    const itemId = existingIndex >= 0 ? inventoryItems[existingIndex].id : "inv_" + Date.now();

    if (existingIndex >= 0) {
      const existing = inventoryItems[existingIndex];
      let newStock = existing.availableStock;
      if (movementType === "in" || movementType === "correction") {
        newStock = parsedQty;
      } else if (movementType === "scrap" || movementType === "issue") {
        newStock = Math.max(0, existing.availableStock - parsedQty);
      } else if (movementType === "transfer") {
        newStock = parsedQty;
      }

      let updatedHealth: "healthy" | "low" | "critical" = "healthy";
      if (newStock <= 0) updatedHealth = "critical";
      else if (newStock <= parsedReorder) updatedHealth = "low";

      const updatedItem: InventoryItem = {
        ...existing,
        name: name.trim(),
        bay,
        availableStock: newStock,
        allocatedStock: parsedAllocated,
        unit,
        unitCost: parsedCost,
        reorderPoint: parsedReorder,
        health: updatedHealth,
      };

      updatedInventory = [...inventoryItems];
      updatedInventory[existingIndex] = updatedItem;
    } else {
      const newItem: InventoryItem = {
        id: itemId,
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        lotNumber: lotNumber.trim().toUpperCase(),
        category,
        bay,
        availableStock: parsedQty,
        allocatedStock: parsedAllocated,
        unit,
        unitCost: parsedCost,
        reorderPoint: parsedReorder,
        health,
        createdAt: new Date().toISOString(),
      };
      updatedInventory = [newItem, ...inventoryItems];
    }

    // Record stock movement entry
    const newMovement: StockMovementRecord = {
      id: "mov_" + Date.now(),
      itemId,
      itemName: name.trim(),
      sku: sku.trim().toUpperCase(),
      type: movementType,
      quantity: parsedQty,
      unit,
      toBay: bay,
      timestamp: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    const updatedMovements = [newMovement, ...movements];

    saveInventoryList(updatedInventory, updatedMovements);

    if (existingIndex >= 0) {
      updateInventoryItemInSupabase(updatedInventory[existingIndex]).catch((err) => console.error(err));
    } else {
      createInventoryItemInSupabase(updatedInventory[0]).catch((err) => console.error(err));
    }
    recordStockMovementInSupabase(newMovement).catch((err) => console.error(err));

    success("Stock movement logged", {
      description: `${name.trim()} (${sku.trim().toUpperCase()}) stock updated successfully.`,
    });

    resetFormState();
    setViewMode("list");
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const updated = inventoryItems.filter((i) => i.id !== itemToDelete.id);
    saveInventoryList(updated);
    updateInventoryItemInSupabase({ ...itemToDelete, isArchived: true }).catch((err) => console.error(err));
    success("Inventory record removed", {
      description: `${itemToDelete.name} was removed from warehouse inventory.`,
    });
    setItemToDelete(null);
  };

  // Filtered items list based on tab, search, and bay
  const filteredItems = inventoryItems.filter((item) => {
    const matchesTab =
      activeTab === "all"
        ? true
        : activeTab === "fabric"
        ? item.category === "fabric"
        : activeTab === "trims"
        ? item.category === "trims" || item.category === "packaging"
        : true;

    const matchesSearch =
      searchQuery.trim() === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lotNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBay =
      bayFilter === "all" || item.bay === bayFilter;

    return matchesTab && matchesSearch && matchesBay;
  });

  // Calculate dynamic KPI metrics
  const totalStockValuation = inventoryItems.reduce(
    (sum, item) => sum + (item.availableStock * item.unitCost || 0),
    0
  );
  const fabricStockOnHandKg = inventoryItems
    .filter((item) => item.category === "fabric")
    .reduce((sum, item) => sum + (item.availableStock || 0), 0);
  const trimsAccessoriesUnits = inventoryItems
    .filter((item) => item.category !== "fabric")
    .reduce((sum, item) => sum + (item.availableStock || 0), 0);
  const lowStockWarningsCount = inventoryItems.filter(
    (item) => item.availableStock <= item.reorderPoint && item.reorderPoint > 0
  ).length;

  return (
    <>
      <TopNav
        title={
          viewMode === "adjust"
            ? "Record Stock Adjustment"
            : "Warehouse Stock, Fabric Rolls & Lot Tracking"
        }
      />

      <div className="flex-1 w-full max-w-[1600px] mx-auto min-w-0 px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* ============================================================
            VIEW 1: FULL-CANVAS STOCK ADJUSTMENT STUDIO
            ============================================================ */}
        {viewMode === "adjust" ? (
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Header & Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleCancelAdjust}
                  className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back to Warehouse Inventory"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                      Warehouse Stock Adjustment / Bay Transfer
                    </h1>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Inventory Control
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Log material intake, internal multi-bay transfers, cutting floor staging, and scrap reconciliations.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                <Button variant="secondary" size="md" onClick={handleCancelAdjust}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={handleSaveStockAdjustment}
                >
                  Confirm Stock Movement
                </Button>
              </div>
            </div>

            {/* Form Canvas (Spacious Two-Column Grid on Desktop) */}
            <form onSubmit={handleSaveStockAdjustment} className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
              {/* Left Column: Form Sections (8 cols) */}
              <div className="lg:col-span-8 space-y-6 min-w-0">
                {/* 1. Movement Type & Material Details */}
                <Card>
                  <FormSection
                    title="1. Movement Type & Specification"
                    description="Specify transfer action, SKU identifier, and batch lot number"
                  >
                    <FormField label="Adjustment / Movement Type" required>
                      <Select
                        value={movementType}
                        onChange={(e) => setMovementType(e.target.value as "in" | "issue" | "transfer" | "scrap" | "correction")}
                        options={[
                          { value: "in", label: "Stock In — Opening Balance / Mill Receipt" },
                          { value: "issue", label: "Floor Issue — Cutting & Sewing Production" },
                          { value: "transfer", label: "Internal Bay Transfer / Floor Staging" },
                          { value: "scrap", label: "Scrap / Cutting End-Loss Adjustment" },
                          { value: "correction", label: "Cycle Count Correction" },
                        ]}
                      />
                    </FormField>

                    <FormField
                      label="Item Name / Material Spec"
                      required
                      error={formErrors.name}
                    >
                      <Input
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (formErrors.name) setFormErrors((p) => ({ ...p, name: "" }));
                        }}
                        placeholder="e.g. 100% Combed Cotton French Terry (380 GSM)"
                        required
                      />
                    </FormField>

                    <FormField
                      label="Material SKU / Code"
                      required
                      error={formErrors.sku}
                    >
                      <Input
                        value={sku}
                        onChange={(e) => {
                          setSku(e.target.value);
                          if (formErrors.sku) setFormErrors((p) => ({ ...p, sku: "" }));
                        }}
                        placeholder="e.g. FAB-FL-380-BLK"
                        required
                      />
                    </FormField>

                    <FormField
                      label="Lot Number / Dye Batch #"
                      required
                      error={formErrors.lotNumber}
                    >
                      <Input
                        value={lotNumber}
                        onChange={(e) => {
                          setLotNumber(e.target.value);
                          if (formErrors.lotNumber) setFormErrors((p) => ({ ...p, lotNumber: "" }));
                        }}
                        placeholder="e.g. LOT-2026-04"
                        required
                      />
                    </FormField>

                    <FormField label="Item Category" required>
                      <Select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as "fabric" | "trims" | "packaging")}
                        options={CATEGORY_OPTIONS}
                      />
                    </FormField>
                  </FormSection>
                </Card>

                {/* 2. Stock Quantities & Bay Storage */}
                <Card>
                  <FormSection
                    title="2. Quantities, Valuation & Warehouse Location"
                    description="Set available balance, cutting allocation, unit valuation, and storage bay"
                  >
                    <FormField
                      label="Available Stock Quantity"
                      required
                      error={formErrors.quantity}
                    >
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={quantity}
                          onChange={(e) => {
                            setQuantity(e.target.value);
                            if (formErrors.quantity) setFormErrors((p) => ({ ...p, quantity: "" }));
                          }}
                          placeholder="150"
                          className="flex-1"
                          required
                        />
                        <div className="w-32">
                          <Select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            options={UNIT_OPTIONS}
                          />
                        </div>
                      </div>
                    </FormField>

                    <FormField
                      label="Allocated to Cutting (WIP)"
                      error={formErrors.allocatedQty}
                    >
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={allocatedQty}
                        onChange={(e) => {
                          setAllocatedQty(e.target.value);
                          if (formErrors.allocatedQty) setFormErrors((p) => ({ ...p, allocatedQty: "" }));
                        }}
                        placeholder="0"
                        suffix={unit}
                      />
                    </FormField>

                    <FormField
                      label="Unit Cost / Valuation (PKR)"
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
                        placeholder="50"
                        suffix={unit}
                        required
                      />
                    </FormField>

                    <FormField label="Target Warehouse Bay" required>
                      <Select
                        value={bay}
                        onChange={(e) => setBay(e.target.value)}
                        options={BAY_OPTIONS}
                      />
                    </FormField>
                  </FormSection>
                </Card>
              </div>

              {/* Right Column: Live Movement Summary Preview (4 cols) */}
              <div className="lg:col-span-4 space-y-6 min-w-0">
                <Card className="sticky top-20 bg-slate-50/70 border-slate-200/90 shadow-xs">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Movement Summary
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <p className="text-slate-400 font-medium">Movement Type</p>
                        <p className="font-bold text-indigo-700">
                          {MOVEMENT_TYPE_LABEL_MAP[movementType]}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <p className="text-slate-400 font-medium">Material Spec</p>
                        <p className="font-bold text-slate-900 truncate">
                          {name.trim() || "— Not Specified —"}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {sku.trim().toUpperCase() || "NO SKU"} • {lotNumber.trim().toUpperCase() || "NO LOT"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <p className="text-slate-400 font-medium">Quantity</p>
                          <p className="font-bold text-slate-900 truncate">
                            {parsedQty > 0 ? `${parsedQty.toLocaleString()} ${unit}` : "—"}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <p className="text-slate-400 font-medium">Target Bay</p>
                          <p className="font-semibold text-slate-800 truncate">
                            {BAY_LABEL_MAP[bay] || bay}
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-medium">Stock Value (FIFO):</span>
                          <span className="font-mono font-extrabold text-indigo-700 text-sm">
                            Rs {totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Allocated to Cutting:</span>
                          <span className="font-mono font-semibold text-slate-700">
                            {parsedAllocated.toLocaleString()} {unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <Button
                        variant="primary"
                        className="w-full h-11 text-xs font-bold"
                        leftIcon={<Save className="h-4 w-4" />}
                        onClick={handleSaveStockAdjustment}
                      >
                        Confirm Stock Movement
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full"
                        size="sm"
                        onClick={handleCancelAdjust}
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
              VIEW 2: WAREHOUSE INVENTORY CATALOG TABLE & OVERVIEW
              ============================================================ */
          <div className="space-y-6 min-w-0 w-full animate-in fade-in-0 duration-200">
            {/* Page Header */}
            <PageHeader
              title="Warehouse Inventory & Lot Control"
              description="Track raw fabric rolls, batch lot numbers, cutting allocations, trim bins, and multi-bay stock transfers."
              actions={
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={<RefreshCw className={`h-4 w-4 ${loadingInventory ? "animate-spin" : ""}`} />}
                    onClick={() => loadInventory(true)}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<ArrowDownUp className="h-4 w-4" />}
                    onClick={handleOpenAdjustForm}
                  >
                    Stock Adjustment
                  </Button>
                </div>
              }
            />

            {/* 4 Meaningful KPI Cards (Calculated dynamically) */}
            <CardGrid columns={4}>
              <StatCard
                label="Total Stock Valuation"
                value={`Rs ${totalStockValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                sub="FIFO inventory valuation"
                icon={<DollarSign className="h-5 w-5" />}
                iconColor="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Fabric On Hand"
                value={`${fabricStockOnHandKg.toLocaleString()} KG`}
                sub="Active rolls across bays"
                icon={<Layers className="h-5 w-5" />}
                iconColor="bg-indigo-50 text-indigo-600"
              />
              <StatCard
                label="Trims & Accessories"
                value={`${trimsAccessoriesUnits.toLocaleString()} Units`}
                sub="Zippers, buttons & labels"
                icon={<Boxes className="h-5 w-5" />}
                iconColor="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                label="Low Stock Warnings"
                value={`${lowStockWarningsCount} Items`}
                sub="Below safety reorder point"
                icon={<AlertTriangle className="h-5 w-5" />}
                iconColor="bg-rose-50 text-rose-600"
              />
            </CardGrid>

            {/* Tabs & Search/Filter Toolbar */}
            <Card noPadding className="p-3.5 sm:p-4 bg-white border-slate-200/80 shadow-xs space-y-3">
              <Tabs
                tabs={[
                  { key: "all", label: "All Warehouse Stock" },
                  { key: "fabric", label: "Fabric Rolls & Lots" },
                  { key: "trims", label: "Trims & Packaging" },
                  { key: "movements", label: "Stock Movement History" },
                ]}
                activeKey={activeTab}
                onChange={(k) => setActiveTab(k as "all" | "fabric" | "trims" | "movements")}
              />

              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1 min-w-0">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search inventory by item name, SKU, or lot number (e.g. LOT-2026-04)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Filter Dropdown */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={bayFilter}
                    onChange={(e) => setBayFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  >
                    <option value="all">All Warehouse Bays</option>
                    <option value="bay_1">Bay 1 (Raw Fabric Hall)</option>
                    <option value="bay_2">Bay 2 (Trims & Accessories)</option>
                    <option value="bay_3">Bay 3 (Packaging Goods)</option>
                    <option value="cutting_table">Cutting Table Floor</option>
                  </select>

                  {(searchQuery || bayFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setSearchQuery("");
                        setBayFilter("all");
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Main Inventory Section: Table or Movement History */}
            {activeTab === "movements" ? (
              <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
                <div className="overflow-x-auto w-full min-w-0">
                  <table className="w-full text-xs text-left min-w-[800px]">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Item & SKU</th>
                        <th className="py-3 px-4">Movement Action</th>
                        <th className="py-3 px-4">Quantity</th>
                        <th className="py-3 px-4">Destination Bay</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movements.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <EmptyState
                              icon={<History className="h-6 w-6 text-indigo-600" />}
                              title="No movement history recorded yet"
                              description="Warehouse intake, transfers to cutting table, and scrap adjustments will automatically log here."
                            />
                          </td>
                        </tr>
                      ) : (
                        movements.map((mov) => (
                          <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-slate-500">
                              {new Date(mov.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {mov.itemName}
                              <span className="block font-mono text-[11px] font-normal text-slate-400">
                                {mov.sku}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge
                                variant={
                                  mov.type === "in"
                                    ? "success"
                                    : mov.type === "scrap"
                                    ? "danger"
                                    : "primary"
                                }
                              >
                                {MOVEMENT_TYPE_LABEL_MAP[mov.type] || mov.type}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              {mov.quantity.toLocaleString()} {mov.unit}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700">
                              {BAY_LABEL_MAP[mov.toBay] || mov.toBay}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 italic">
                              {mov.notes || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card noPadding className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
                <div className="overflow-x-auto w-full min-w-0">
                  <table className="w-full text-xs text-left min-w-[900px]">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Inventory Item / Spec</th>
                        <th className="py-3 px-4">SKU & Lot #</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Warehouse Bay</th>
                        <th className="py-3 px-4">Available Stock</th>
                        <th className="py-3 px-4">Allocated (Cutting)</th>
                        <th className="py-3 px-4">Reorder Point</th>
                        <th className="py-3 px-4 text-center">Stock Health</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-0">
                            <EmptyState
                              icon={<Warehouse className="h-6 w-6 text-blue-600" />}
                              title={inventoryItems.length === 0 ? "No inventory records found" : "No matching inventory records"}
                              description={
                                inventoryItems.length === 0
                                  ? "Purchased goods received (GRN) from textile mills and suppliers will automatically register in warehouse stock."
                                  : "Try adjusting your search query or bay filter to locate warehouse lots."
                              }
                              actionLabel="Record Stock Adjustment"
                              actionIcon={<Plus className="h-4 w-4" />}
                              onAction={handleOpenAdjustForm}
                            />
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[220px]">
                              <span className="truncate block">{item.name}</span>
                              <span className="text-[11px] font-normal text-slate-400 block font-mono">
                                Val: Rs {item.unitCost.toLocaleString()} / {item.unit}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              <span className="font-bold text-blue-600 block">{item.sku}</span>
                              <span className="text-[11px] text-slate-400 block">Lot: {item.lotNumber}</span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {CATEGORY_LABEL_MAP[item.category] || item.category}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700">
                              {BAY_LABEL_MAP[item.bay] || item.bay}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              {item.availableStock.toLocaleString()} {item.unit}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-amber-700 font-semibold">
                              {item.allocatedStock.toLocaleString()} {item.unit}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-500">
                              {item.reorderPoint.toLocaleString()} {item.unit}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {item.health === "healthy" ? (
                                <Badge variant="success">Healthy</Badge>
                              ) : item.health === "low" ? (
                                <Badge variant="warning">Low Stock</Badge>
                              ) : (
                                <Badge variant="danger">Critical</Badge>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleIssueItem(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                                  title="Issue to Production Floor"
                                >
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                  <span>Issue</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItemToDelete(item)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Delete inventory item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
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
                  total={filteredItems.length}
                  onPageChange={setPage}
                />
              </Card>
            )}

            {/* In-App Delete Confirmation Dialog */}
            <ConfirmDialog
              isOpen={Boolean(itemToDelete)}
              onClose={() => setItemToDelete(null)}
              onConfirm={handleConfirmDelete}
              title="Delete Warehouse Inventory Item"
              description={
                itemToDelete
                  ? `Are you sure you want to delete inventory lot "${itemToDelete.name} (${itemToDelete.sku} • Lot ${itemToDelete.lotNumber})"? This will remove its stock tracking entry.`
                  : ""
              }
              confirmLabel="Delete Item"
              cancelLabel="Cancel"
              destructive
            />
          </div>
        )}
      </div>
    </>
  );
}

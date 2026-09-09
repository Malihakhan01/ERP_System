// lib/costing-engine.ts
// Pure calculation engine for Garment Factory Pre-Costing & BOM Estimation

export type CostEstimateStatus =
  | "draft"
  | "calculated"
  | "under_review"
  | "approved"
  | "rejected"
  | "archived";

export type Currency = "USD" | "EUR" | "GBP" | "PKR" | "AED";
export type PricingMethod = "margin" | "markup";

export interface FabricCostRow {
  id: string;
  materialName: string;
  specification: string;
  consumptionPerPiece: number; // e.g. 0.68 kg
  wastagePercent: number; // e.g. 5%
  unit: string; // "KG" | "Meters" | "Yards"
  unitCost: number; // e.g. $7.20 / kg
}

export interface TrimCostRow {
  id: string;
  trimName: string;
  specification: string;
  quantityPerPiece: number; // e.g. 1.2
  wastagePercent: number; // e.g. 2%
  unit: string; // "Pcs" | "Meters" | "Sets" | "Yards" | "Gross"
  unitCost: number; // e.g. $0.45 / pc
}

export interface ProcessCostRow {
  id: string;
  processName: string;
  specification?: string;
  ratePerPiece: number; // e.g. $0.85
}

export interface CuttingCostDetails {
  laborPerPiece: number;
  machinePerPiece: number;
  markerPerPiece: number;
  spreadingPerPiece: number;
  wastagePercent: number;
  otherPerPiece: number;
}

export interface LaborCostDetails {
  samMinutes: number; // Standard Allowed Minutes (e.g. 18.5)
  costPerMinute: number; // e.g. $0.08 / min
  allocatedLine?: string;
  isSamFromProduction?: boolean;
  sewingLaborOverride?: number; // optional manual override
}

export interface FinishingQaCostDetails {
  finishingLaborPerPiece: number;
  pressingSteamPerPiece: number;
  threadTrimmingPerPiece: number;
  inspectionPerPiece: number;
  reworkPercent: number;
  otherQaPerPiece: number;
}

export interface PackagingCostDetails {
  polybagPerPiece: number;
  hangtagPerPiece: number;
  cartonCostPerUnit: number; // per master carton box
  pcsPerCarton: number; // e.g. 20 pcs
  tapeLabelPerPiece: number;
  otherPackagingPerPiece: number;
}

export interface OverheadCostDetails {
  method: "percentage" | "fixed";
  percentage: number; // e.g. 8%
  fixedPerPiece: number; // e.g. $0.50
}

export interface LogisticsCostDetails {
  origin: string;
  destination: string;
  freightPerPiece: number; // estimated
  insurancePerPiece: number;
  customsDutiesPerPiece: number;
  otherLogisticsPerPiece: number;
}

export interface CostCalculationSummary {
  // 1. Fabric BOM
  totalFabricCostPerPiece: number;
  totalFabricCost: number;

  // 2. Trims & Accessories
  totalTrimsCostPerPiece: number;
  totalTrimsCost: number;

  // 3. Embellishments & Value-Added Processes
  totalProcessesCostPerPiece: number;
  totalProcessesCost: number;

  // 4. Cutting Department
  totalCuttingCostPerPiece: number;
  totalCuttingCost: number;

  // 5. Sewing Assembly Labor (SAM)
  sewingLaborCostPerPiece: number;
  totalSewingLaborCost: number;

  // 6. Finishing & Quality QA
  totalFinishingQaCostPerPiece: number;
  totalFinishingQaCost: number;

  // 7. Export Packaging
  cartonsRequired: number;
  totalPackagingCostPerPiece: number;
  totalPackagingCost: number;

  // Direct Production Subtotal (before overhead & freight)
  directProductionSubtotalPerPiece: number;
  totalDirectProductionSubtotal: number;

  // 8. Factory Overhead
  overheadCostPerPiece: number;
  totalOverheadCost: number;

  // Direct Manufacturing Cost / Pc (Ex-Factory Subtotal = Direct Production + Overhead)
  directManufacturingCostPerPiece: number;
  totalDirectManufacturingCost: number;

  // 9. Export Logistics (Freight, Cargo Insurance, Customs Duties)
  exportLogisticsCostPerPiece: number;
  totalExportLogisticsCost: number;

  // Total Export Cost / Pc (Ex-Factory Manufacturing + Export Logistics)
  totalExportCostPerPiece: number;
  totalExportCost: number;

  // Backward compatibility alias
  totalManufacturingCostPerPiece: number;
  totalManufacturingCost: number;
  logisticsCostPerPiece: number;
  totalLogisticsCost: number;

  // 10. Commercial Pricing & Profit
  pricingMethod: PricingMethod;
  markupPercent: number;
  marginPercent: number;
  profitPerPiece: number;
  totalProfit: number;
  sellingPricePerPiece: number;
  estimatedOrderValue: number;

  // Percentage Breakdown of Total Export Cost
  fabricPct: number;
  trimsPct: number;
  processesPct: number;
  cuttingPct: number;
  sewingLaborPct: number;
  finishingQaPct: number;
  packagingPct: number;
  overheadPct: number;
  logisticsPct: number;
}

export interface CostEstimateRecord {
  id: string;
  estimateNumber: string;
  orderNumber: string;
  customerName: string;
  productionJobRef?: string;
  productId?: string; // Foreign key referencing Product UUID
  styleCode: string;
  styleName: string;
  batchQuantity: number;
  currency: Currency;
  status: CostEstimateStatus;
  targetDeliveryDate?: string;
  notes?: string;

  // Cost Input Structures
  fabrics: FabricCostRow[];
  trims: TrimCostRow[];
  processes: ProcessCostRow[];
  cutting: CuttingCostDetails;
  labor: LaborCostDetails;
  finishingQa: FinishingQaCostDetails;
  packaging: PackagingCostDetails;
  overhead: OverheadCostDetails;
  logistics: LogisticsCostDetails;

  // Commercial Pricing Target
  pricingMethod: PricingMethod;
  targetMarginPercent: number;
  targetMarkupPercent: number;

  // Calculated Results Snapshot
  calculation: CostCalculationSummary;

  // Audit metadata
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  isLinkedToProduction?: boolean;
}

// ----------------------------------------------------
// CALCULATION LOGIC
// ----------------------------------------------------

/**
 * Calculates effective consumption with wastage allowance:
 * Effective Consumption = Consumption * (1 + Wastage % / 100)
 */
export function calculateEffectiveConsumption(consumption: number, wastagePercent: number): number {
  const c = Math.max(0, isNaN(consumption) ? 0 : consumption);
  const w = Math.max(0, Math.min(100, isNaN(wastagePercent) ? 0 : wastagePercent));
  return c * (1 + w / 100);
}

/**
 * Computes the complete cost estimation summary
 */
export function calculateCostEstimate(params: {
  batchQuantity: number;
  fabrics: FabricCostRow[];
  trims: TrimCostRow[];
  processes: ProcessCostRow[];
  cutting: CuttingCostDetails;
  labor: LaborCostDetails;
  finishingQa: FinishingQaCostDetails;
  packaging: PackagingCostDetails;
  overhead: OverheadCostDetails;
  logistics: LogisticsCostDetails;
  pricingMethod: PricingMethod;
  targetMarginPercent: number;
  targetMarkupPercent: number;
}): CostCalculationSummary {
  const rawQty = Math.max(0, isNaN(params.batchQuantity) ? 0 : params.batchQuantity);
  const qty = rawQty > 0 ? rawQty : 1; // Safe divider for per-unit calculations

  // 1. Fabric Cost
  let totalFabricCostPerPiece = 0;
  if (Array.isArray(params.fabrics)) {
    for (const f of params.fabrics) {
      const effective = calculateEffectiveConsumption(f.consumptionPerPiece, f.wastagePercent);
      const rowCostPerPiece = effective * Math.max(0, isNaN(f.unitCost) ? 0 : f.unitCost);
      totalFabricCostPerPiece += rowCostPerPiece;
    }
  }
  const totalFabricCost = totalFabricCostPerPiece * rawQty;

  // 2. Trims Cost
  let totalTrimsCostPerPiece = 0;
  if (Array.isArray(params.trims)) {
    for (const t of params.trims) {
      const effective = calculateEffectiveConsumption(t.quantityPerPiece, t.wastagePercent);
      const rowCostPerPiece = effective * Math.max(0, isNaN(t.unitCost) ? 0 : t.unitCost);
      totalTrimsCostPerPiece += rowCostPerPiece;
    }
  }
  const totalTrimsCost = totalTrimsCostPerPiece * rawQty;

  // 3. Value-Added Processes Cost
  let totalProcessesCostPerPiece = 0;
  if (Array.isArray(params.processes)) {
    for (const p of params.processes) {
      totalProcessesCostPerPiece += Math.max(0, isNaN(p.ratePerPiece) ? 0 : p.ratePerPiece);
    }
  }
  const totalProcessesCost = totalProcessesCostPerPiece * rawQty;

  // 4. Cutting Department Cost
  const cuttingLabor = Math.max(0, isNaN(params.cutting?.laborPerPiece) ? 0 : params.cutting.laborPerPiece);
  const cuttingMachine = Math.max(0, isNaN(params.cutting?.machinePerPiece) ? 0 : params.cutting.machinePerPiece);
  const cuttingMarker = Math.max(0, isNaN(params.cutting?.markerPerPiece) ? 0 : params.cutting.markerPerPiece);
  const cuttingSpreading = Math.max(0, isNaN(params.cutting?.spreadingPerPiece) ? 0 : params.cutting.spreadingPerPiece);
  const cuttingOther = Math.max(0, isNaN(params.cutting?.otherPerPiece) ? 0 : params.cutting.otherPerPiece);
  const cuttingBase = cuttingLabor + cuttingMachine + cuttingMarker + cuttingSpreading + cuttingOther;
  const cuttingWastageMultiplier = 1 + Math.max(0, Math.min(100, isNaN(params.cutting?.wastagePercent) ? 0 : params.cutting.wastagePercent)) / 100;
  const totalCuttingCostPerPiece = cuttingBase * cuttingWastageMultiplier;
  const totalCuttingCost = totalCuttingCostPerPiece * rawQty;

  // 5. Sewing Assembly Labor Cost (SAM)
  let sewingLaborCostPerPiece = 0;
  if (params.labor?.sewingLaborOverride && params.labor.sewingLaborOverride > 0) {
    sewingLaborCostPerPiece = params.labor.sewingLaborOverride;
  } else {
    const sam = Math.max(0, isNaN(params.labor?.samMinutes) ? 0 : params.labor.samMinutes);
    const costPerMin = Math.max(0, isNaN(params.labor?.costPerMinute) ? 0 : params.labor.costPerMinute);
    sewingLaborCostPerPiece = sam * costPerMin;
  }
  const totalSewingLaborCost = sewingLaborCostPerPiece * rawQty;

  // 6. Finishing & Quality QA Cost
  const finishingLabor = Math.max(0, isNaN(params.finishingQa?.finishingLaborPerPiece) ? 0 : params.finishingQa.finishingLaborPerPiece);
  const pressingSteam = Math.max(0, isNaN(params.finishingQa?.pressingSteamPerPiece) ? 0 : params.finishingQa.pressingSteamPerPiece);
  const threadTrimming = Math.max(0, isNaN(params.finishingQa?.threadTrimmingPerPiece) ? 0 : params.finishingQa.threadTrimmingPerPiece);
  const inspection = Math.max(0, isNaN(params.finishingQa?.inspectionPerPiece) ? 0 : params.finishingQa.inspectionPerPiece);
  const finishingOther = Math.max(0, isNaN(params.finishingQa?.otherQaPerPiece) ? 0 : params.finishingQa.otherQaPerPiece);
  const finishingBase = finishingLabor + pressingSteam + threadTrimming + inspection + finishingOther;
  const reworkMultiplier = 1 + Math.max(0, Math.min(100, isNaN(params.finishingQa?.reworkPercent) ? 0 : params.finishingQa.reworkPercent)) / 100;
  const totalFinishingQaCostPerPiece = finishingBase * reworkMultiplier;
  const totalFinishingQaCost = totalFinishingQaCostPerPiece * rawQty;

  // 7. Export Packaging Cost
  const pcsPerCarton = Math.max(1, isNaN(params.packaging?.pcsPerCarton) ? 20 : params.packaging.pcsPerCarton);
  const cartonsRequired = Math.ceil(qty / pcsPerCarton);
  const cartonCostUnit = Math.max(0, isNaN(params.packaging?.cartonCostPerUnit) ? 0 : params.packaging.cartonCostPerUnit);
  const cartonCostPerPiece = (cartonCostUnit * cartonsRequired) / qty;

  const polybag = Math.max(0, isNaN(params.packaging?.polybagPerPiece) ? 0 : params.packaging.polybagPerPiece);
  const hangtag = Math.max(0, isNaN(params.packaging?.hangtagPerPiece) ? 0 : params.packaging.hangtagPerPiece);
  const tapeLabel = Math.max(0, isNaN(params.packaging?.tapeLabelPerPiece) ? 0 : params.packaging.tapeLabelPerPiece);
  const otherPackaging = Math.max(0, isNaN(params.packaging?.otherPackagingPerPiece) ? 0 : params.packaging.otherPackagingPerPiece);
  const totalPackagingCostPerPiece = polybag + hangtag + tapeLabel + otherPackaging + cartonCostPerPiece;
  const totalPackagingCost = totalPackagingCostPerPiece * rawQty;

  // Direct Production Subtotal (Fabric + Trims + Processes + Cutting + Sewing + Finishing + Packaging)
  const directProductionSubtotalPerPiece =
    totalFabricCostPerPiece +
    totalTrimsCostPerPiece +
    totalProcessesCostPerPiece +
    totalCuttingCostPerPiece +
    sewingLaborCostPerPiece +
    totalFinishingQaCostPerPiece +
    totalPackagingCostPerPiece;
  const totalDirectProductionSubtotal = directProductionSubtotalPerPiece * rawQty;

  // 8. Factory Overhead Cost
  let overheadCostPerPiece = 0;
  if (params.overhead?.method === "percentage") {
    const pct = Math.max(0, isNaN(params.overhead.percentage) ? 0 : params.overhead.percentage) / 100;
    overheadCostPerPiece = directProductionSubtotalPerPiece * pct;
  } else {
    overheadCostPerPiece = Math.max(0, isNaN(params.overhead?.fixedPerPiece) ? 0 : params.overhead.fixedPerPiece);
  }
  const totalOverheadCost = overheadCostPerPiece * rawQty;

  // Direct Manufacturing Cost / Pc (Ex-Factory = Direct Production Subtotal + Factory Overhead)
  const directManufacturingCostPerPiece = directProductionSubtotalPerPiece + overheadCostPerPiece;
  const totalDirectManufacturingCost = directManufacturingCostPerPiece * rawQty;

  // 9. Export Logistics (Freight, Cargo Insurance, Customs Clearance)
  const freight = Math.max(0, isNaN(params.logistics?.freightPerPiece) ? 0 : params.logistics.freightPerPiece);
  const insurance = Math.max(0, isNaN(params.logistics?.insurancePerPiece) ? 0 : params.logistics.insurancePerPiece);
  const customs = Math.max(0, isNaN(params.logistics?.customsDutiesPerPiece) ? 0 : params.logistics.customsDutiesPerPiece);
  const otherLogistics = Math.max(0, isNaN(params.logistics?.otherLogisticsPerPiece) ? 0 : params.logistics.otherLogisticsPerPiece);
  const exportLogisticsCostPerPiece = freight + insurance + customs + otherLogistics;
  const totalExportLogisticsCost = exportLogisticsCostPerPiece * rawQty;

  // Total Export Cost / Pc = Direct Manufacturing Cost + Export Logistics Cost
  const totalExportCostPerPiece = directManufacturingCostPerPiece + exportLogisticsCostPerPiece;
  const totalExportCost = totalExportCostPerPiece * rawQty;

  // 10. Commercial Pricing & Profit
  let sellingPricePerPiece = totalExportCostPerPiece;
  let profitPerPiece = 0;
  let computedMarginPercent = 0;
  let computedMarkupPercent = 0;

  if (params.pricingMethod === "markup") {
    const markup = Math.max(0, isNaN(params.targetMarkupPercent) ? 0 : params.targetMarkupPercent);
    computedMarkupPercent = markup;
    sellingPricePerPiece = totalExportCostPerPiece * (1 + markup / 100);
    profitPerPiece = sellingPricePerPiece - totalExportCostPerPiece;
    computedMarginPercent = sellingPricePerPiece > 0 ? (profitPerPiece / sellingPricePerPiece) * 100 : 0;
  } else {
    // Gross Margin Method: Selling Price = Total Export Cost / (1 - Margin %)
    const rawMargin = Math.max(0, Math.min(99.9, isNaN(params.targetMarginPercent) ? 0 : params.targetMarginPercent));
    computedMarginPercent = rawMargin;
    const marginRatio = 1 - rawMargin / 100;
    sellingPricePerPiece = marginRatio > 0 ? totalExportCostPerPiece / marginRatio : totalExportCostPerPiece;
    profitPerPiece = sellingPricePerPiece - totalExportCostPerPiece;
    computedMarkupPercent =
      totalExportCostPerPiece > 0 ? (profitPerPiece / totalExportCostPerPiece) * 100 : 0;
  }

  const totalProfit = profitPerPiece * rawQty;
  const estimatedOrderValue = sellingPricePerPiece * rawQty;

  // Cost Breakdown Percentages
  const safeTotal = totalExportCostPerPiece > 0 ? totalExportCostPerPiece : 1;
  const fabricPct = Math.round((totalFabricCostPerPiece / safeTotal) * 100);
  const trimsPct = Math.round((totalTrimsCostPerPiece / safeTotal) * 100);
  const processesPct = Math.round((totalProcessesCostPerPiece / safeTotal) * 100);
  const cuttingPct = Math.round((totalCuttingCostPerPiece / safeTotal) * 100);
  const sewingLaborPct = Math.round((sewingLaborCostPerPiece / safeTotal) * 100);
  const finishingQaPct = Math.round((totalFinishingQaCostPerPiece / safeTotal) * 100);
  const packagingPct = Math.round((totalPackagingCostPerPiece / safeTotal) * 100);
  const overheadPct = Math.round((overheadCostPerPiece / safeTotal) * 100);
  const logisticsPct = Math.round((exportLogisticsCostPerPiece / safeTotal) * 100);

  return {
    totalFabricCostPerPiece,
    totalFabricCost,
    totalTrimsCostPerPiece,
    totalTrimsCost,
    totalProcessesCostPerPiece,
    totalProcessesCost,
    totalCuttingCostPerPiece,
    totalCuttingCost,
    sewingLaborCostPerPiece,
    totalSewingLaborCost,
    totalFinishingQaCostPerPiece,
    totalFinishingQaCost,
    cartonsRequired,
    totalPackagingCostPerPiece,
    totalPackagingCost,
    directProductionSubtotalPerPiece,
    totalDirectProductionSubtotal,
    overheadCostPerPiece,
    totalOverheadCost,
    directManufacturingCostPerPiece,
    totalDirectManufacturingCost,
    exportLogisticsCostPerPiece,
    totalExportLogisticsCost,
    totalExportCostPerPiece,
    totalExportCost,
    // backward compatibility aliases
    totalManufacturingCostPerPiece: totalExportCostPerPiece,
    totalManufacturingCost: totalExportCost,
    logisticsCostPerPiece: exportLogisticsCostPerPiece,
    totalLogisticsCost: totalExportLogisticsCost,
    pricingMethod: params.pricingMethod,
    markupPercent: computedMarkupPercent,
    marginPercent: computedMarginPercent,
    profitPerPiece,
    totalProfit,
    sellingPricePerPiece,
    estimatedOrderValue,
    fabricPct,
    trimsPct,
    processesPct,
    cuttingPct,
    sewingLaborPct,
    finishingQaPct,
    packagingPct,
    overheadPct,
    logisticsPct,
  };
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  PKR: "Rs ",
  AED: "AED ",
};

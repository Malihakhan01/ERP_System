<?php

namespace App\Domain\Costing;

class CostingCalculator
{
    /**
     * Calculate comprehensive pre-costing BOM and target FOB rate.
     */
    public static function calculate(array $params): array
    {
        $batchQuantity = max(1, (int) ($params['batch_quantity'] ?? 500));
        $consumptionKg = (float) ($params['consumption_kg'] ?? 0.68);
        $wastagePct = (float) ($params['wastage_pct'] ?? 5.0);
        $fabricRatePerKg = (float) ($params['fabric_rate_per_kg'] ?? 8.50);
        $samMinutes = (float) ($params['sam_minutes'] ?? 18.5);
        $operatorHourlyRate = (float) ($params['operator_hourly_rate'] ?? 2.20);
        $marginPct = (float) ($params['margin_pct'] ?? 20.0);

        // 1. Fabric Calculations
        $netFabricKg = $batchQuantity * $consumptionKg;
        $wastageKg = $netFabricKg * ($wastagePct / 100.0);
        $grossFabricKg = $netFabricKg + $wastageKg;
        $totalFabricCost = $grossFabricKg * $fabricRatePerKg;
        $fabricCostPerPc = $totalFabricCost / $batchQuantity;

        // 2. Trims & Accessories Total
        $trimsTotal = (float) ($params['trims_cost_total'] ?? 0.0);
        $trimsCostPerPc = $trimsTotal / $batchQuantity;

        // 3. Labor Cost based on SAM
        $laborCostPerPc = ($samMinutes / 60.0) * $operatorHourlyRate;
        $totalLaborCost = $laborCostPerPc * $batchQuantity;

        // 4. Overheads & Packaging
        $overheadsPerPc = (float) ($params['overhead_cost_per_pc'] ?? 0.45);
        $packagingPerPc = (float) ($params['packaging_cost_per_pc'] ?? 0.35);

        // 5. Total Factory Cost per Piece
        $factoryCostPerPc = $fabricCostPerPc + $trimsCostPerPc + $laborCostPerPc + $overheadsPerPc + $packagingPerPc;
        $totalFactoryCost = $factoryCostPerPc * $batchQuantity;

        // 6. FOB Selling Price with Target Margin
        $marginMultiplier = 1.0 - ($marginPct / 100.0);
        $fobPricePerPc = $marginMultiplier > 0 ? ($factoryCostPerPc / $marginMultiplier) : $factoryCostPerPc;
        $totalContractValue = $fobPricePerPc * $batchQuantity;
        $netProfitTotal = $totalContractValue - $totalFactoryCost;

        return [
            'batch_quantity' => $batchQuantity,
            'net_fabric_kg' => round($netFabricKg, 2),
            'wastage_kg' => round($wastageKg, 2),
            'gross_fabric_kg' => round($grossFabricKg, 2),
            'fabric_cost_total' => round($totalFabricCost, 2),
            'fabric_cost_per_pc' => round($fabricCostPerPc, 2),
            'trim_cost_total' => round($trimsTotal, 2),
            'trim_cost_per_pc' => round($trimsCostPerPc, 2),
            'labor_cost_total' => round($totalLaborCost, 2),
            'labor_cost_per_pc' => round($laborCostPerPc, 2),
            'factory_cost_per_pc' => round($factoryCostPerPc, 2),
            'total_factory_cost' => round($totalFactoryCost, 2),
            'net_margin_pct' => round($marginPct, 2),
            'fob_price_per_pc' => round($fobPricePerPc, 2),
            'total_contract_value' => round($totalContractValue, 2),
            'net_profit_total' => round($netProfitTotal, 2),
        ];
    }
}

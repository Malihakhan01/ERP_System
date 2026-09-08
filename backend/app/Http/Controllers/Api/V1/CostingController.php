<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CostEstimate;
use App\Domain\Costing\CostingCalculator;
use Illuminate\Http\Request;

class CostingController extends Controller
{
    public function index(Request $request)
    {
        $query = CostEstimate::where('is_archived', false)->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('estimate_number', 'like', "%{$s}%")
                  ->orWhere('style_code', 'like', "%{$s}%");
            });
        }

        $estimates = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $estimates->items(),
            'pagination' => [
                'total' => $estimates->total(),
                'current_page' => $estimates->currentPage(),
                'last_page' => $estimates->lastPage(),
                'per_page' => $estimates->perPage(),
            ],
        ]);
    }

    public function calculatePreview(Request $request)
    {
        $validated = $request->validate([
            'batch_quantity' => 'required|integer|min:1',
            'consumption_kg' => 'required|numeric|min:0.01',
            'wastage_pct' => 'nullable|numeric|min:0',
            'fabric_rate_per_kg' => 'required|numeric|min:0.1',
            'sam_minutes' => 'required|numeric|min:0.1',
            'operator_hourly_rate' => 'nullable|numeric|min:0.1',
            'margin_pct' => 'nullable|numeric|min:0',
            'trims_cost_total' => 'nullable|numeric|min:0',
            'overhead_cost_per_pc' => 'nullable|numeric|min:0',
            'packaging_cost_per_pc' => 'nullable|numeric|min:0',
        ]);

        $calculation = CostingCalculator::calculate($validated);

        return response()->json([
            'success' => true,
            'data' => $calculation,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'estimate_number' => 'required|string|max:50|unique:cost_estimates,estimate_number',
            'order_id' => 'nullable|exists:orders,id',
            'product_id' => 'nullable|exists:products,id',
            'style_code' => 'required|string|max:50',
            'batch_quantity' => 'required|integer|min:1',
            'currency' => 'required|string|max:10',
            'details_json' => 'required|array',
        ]);

        $calc = CostingCalculator::calculate($validated['details_json']);

        $estimate = CostEstimate::create([
            'estimate_number' => $validated['estimate_number'],
            'order_id' => $validated['order_id'] ?? null,
            'product_id' => $validated['product_id'] ?? null,
            'style_code' => $validated['style_code'],
            'batch_quantity' => $calc['batch_quantity'],
            'currency' => $validated['currency'],
            'fabric_cost_total' => $calc['fabric_cost_total'],
            'trim_cost_total' => $calc['trim_cost_total'],
            'labor_cost_total' => $calc['labor_cost_total'],
            'overhead_cost_total' => $calc['factory_cost_per_pc'] * $calc['batch_quantity'] - $calc['fabric_cost_total'] - $calc['trim_cost_total'] - $calc['labor_cost_total'],
            'factory_cost_per_pc' => $calc['factory_cost_per_pc'],
            'net_margin_pct' => $calc['net_margin_pct'],
            'fob_price_per_pc' => $calc['fob_price_per_pc'],
            'total_contract_value' => $calc['total_contract_value'],
            'status' => 'approved',
            'details_json' => $validated['details_json'],
        ]);

        return response()->json([
            'success' => true,
            'message' => "Cost Estimate {$estimate->estimate_number} saved successfully.",
            'data' => $estimate,
        ], 201);
    }

    public function show($id)
    {
        $estimate = CostEstimate::with(['order', 'product'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $estimate,
        ]);
    }
}

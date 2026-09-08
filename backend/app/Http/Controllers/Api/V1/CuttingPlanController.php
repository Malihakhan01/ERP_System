<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CuttingPlan;
use App\Models\CuttingPlanSize;
use App\Models\ProductionJob;
use App\Models\ProductionBundle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CuttingPlanController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'production_job_id' => 'required|exists:production_jobs,id',
            'marker_name' => 'required|string|max:100',
            'marker_length_meters' => 'required|numeric|min:0.1',
            'marker_width_cm' => 'required|numeric|min:1',
            'fabric_type' => 'required|string|max:150',
            'fabric_gsm' => 'required|string|max:50',
            'plies_count' => 'required|integer|min:1',
            'marker_efficiency_pct' => 'nullable|numeric|min:0',
            'sizes' => 'required|array',
        ]);

        $plan = DB::transaction(function () use ($validated) {
            $job = ProductionJob::findOrFail($validated['production_job_id']);
            $count = CuttingPlan::where('production_job_id', $job->id)->count() + 1;
            $planNumber = 'CUT-' . substr($job->job_number, 4) . '-' . str_pad((string) $count, 2, '0', STR_PAD_LEFT);

            $newPlan = CuttingPlan::create([
                'plan_number' => $planNumber,
                'production_job_id' => $job->id,
                'marker_name' => $validated['marker_name'],
                'marker_length_meters' => $validated['marker_length_meters'],
                'marker_width_cm' => $validated['marker_width_cm'],
                'fabric_type' => $validated['fabric_type'],
                'fabric_gsm' => $validated['fabric_gsm'],
                'plies_count' => $validated['plies_count'],
                'marker_efficiency_pct' => $validated['marker_efficiency_pct'] ?? 88.5,
                'status' => 'approved',
            ]);

            foreach ($validated['sizes'] as $sz) {
                CuttingPlanSize::create([
                    'cutting_plan_id' => $newPlan->id,
                    'size' => $sz['size'],
                    'ratio' => (int) ($sz['ratio'] ?? 1),
                    'planned_quantity' => (int) ($sz['planned_quantity'] ?? ($sz['ratio'] * $validated['plies_count'])),
                    'actual_cut_quantity' => 0,
                ]);
            }

            return $newPlan->load('sizes');
        });

        return response()->json([
            'success' => true,
            'message' => "CAD Cutting Plan {$plan->plan_number} saved.",
            'data' => $plan,
        ], 201);
    }

    public function executeCutting(Request $request)
    {
        $validated = $request->validate([
            'cutting_plan_id' => 'required|exists:cutting_plans,id',
            'bundle_size_pieces' => 'nullable|integer|min:5|max:100',
        ]);

        $result = DB::transaction(function () use ($validated) {
            $plan = CuttingPlan::with('sizes')->findOrFail($validated['cutting_plan_id']);
            $job = ProductionJob::findOrFail($plan->production_job_id);
            $bundlePieces = $validated['bundle_size_pieces'] ?? 25;
            $totalCut = 0;
            $createdBundles = [];
            $bundleIndex = ProductionBundle::where('production_job_id', $job->id)->count() + 1;

            foreach ($plan->sizes as $planSize) {
                $actualQty = $planSize->planned_quantity;
                $planSize->update(['actual_cut_quantity' => $actualQty]);
                $totalCut += $actualQty;

                // Split cut run into floor QR barcode bundles
                $remainingPieces = $actualQty;
                while ($remainingPieces > 0) {
                    $qtyThisBundle = min($remainingPieces, $bundlePieces);
                    $barcode = 'BND-' . substr($job->job_number, 4) . '-' . $planSize->size . '-' . str_pad((string) $bundleIndex, 3, '0', STR_PAD_LEFT);

                    $createdBundles[] = ProductionBundle::create([
                        'bundle_barcode' => $barcode,
                        'production_job_id' => $job->id,
                        'bundle_number' => $bundleIndex,
                        'size' => $planSize->size,
                        'quantity' => $qtyThisBundle,
                        'current_stage' => 'cutting',
                        'current_line' => $job->assigned_line,
                        'status' => 'created',
                    ]);

                    $bundleIndex++;
                    $remainingPieces -= $qtyThisBundle;
                }
            }

            // Update Job Totals and Stage
            $job->total_cut_quantity += $totalCut;
            $job->stage = 'cutting';
            $job->status = 'in_production';
            $job->save();

            $plan->update(['status' => 'completed']);

            return [
                'total_pieces_cut' => $totalCut,
                'bundles_generated' => count($createdBundles),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => "Cut run logged: {$result['total_pieces_cut']} pieces cut, {$result['bundles_generated']} QR bundles generated.",
            'data' => $result,
        ]);
    }
}

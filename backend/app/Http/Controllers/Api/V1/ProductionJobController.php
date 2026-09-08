<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ProductionJob;
use App\Models\Order;
use App\Models\InventoryItem;
use App\Models\StockMovement;
use App\Models\ProductionMaterialIssue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductionJobController extends Controller
{
    public function index(Request $request)
    {
        $query = ProductionJob::where('is_archived', false)->orderBy('created_at', 'desc');

        if ($request->filled('stage') && $request->stage !== 'all') {
            $query->where('stage', $request->stage);
        }
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('job_number', 'like', "%{$s}%")
                  ->orWhere('order_number', 'like', "%{$s}%")
                  ->orWhere('client_name', 'like', "%{$s}%")
                  ->orWhere('style_code', 'like', "%{$s}%");
            });
        }

        $jobs = $query->paginate($request->get('per_page', 20));

        // Real-time floor summary metrics
        $metrics = [
            'active_lines' => ProductionJob::where('status', 'in_production')->distinct('assigned_line')->count('assigned_line'),
            'bundles_in_stitching' => DB::table('production_bundles')->where('current_stage', 'stitching')->whereIn('status', ['in_progress', 'created'])->count(),
            'bundles_pending' => DB::table('production_bundles')->where('status', 'pending')->count(),
            'stitched_today' => (int) DB::table('operator_production_logs')->whereDate('work_date', date('Y-m-d'))->sum('pieces_completed'),
            'rejected_today' => (int) DB::table('operator_production_logs')->whereDate('work_date', date('Y-m-d'))->sum('pieces_rejected'),
            'active_operators' => DB::table('operator_production_logs')->whereDate('work_date', date('Y-m-d'))->distinct('employee_id')->count('employee_id'),
        ];

        return response()->json([
            'success' => true,
            'data' => $jobs->items(),
            'metrics' => $metrics,
            'pagination' => [
                'total' => $jobs->total(),
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'per_page' => $jobs->perPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required',
            'job_number' => 'required|string|max:50|unique:production_jobs,job_number',
            'planned_quantity' => 'required|integer|min:1',
            'target_start_date' => 'required|date',
            'target_end_date' => 'required|date',
            'priority' => 'nullable|string',
            'assigned_line' => 'nullable|string',
            'supervisor_id' => 'nullable',
            'supervisor_name' => 'nullable|string',
            'special_instructions' => 'nullable|string',
            'size_breakdown' => 'nullable|array',
        ]);

        $order = Order::findOrFail($validated['order_id']);

        $job = DB::transaction(function () use ($validated, $order) {
            $qty = (int) $validated['planned_quantity'];
            $defaultSizes = $validated['size_breakdown'] ?? [
                'S' => (int) round($qty * 0.2),
                'M' => (int) round($qty * 0.3),
                'L' => (int) round($qty * 0.3),
                'XL' => (int) round($qty * 0.2),
            ];

            $newJob = ProductionJob::create([
                'job_number' => trim($validated['job_number']),
                'order_id' => $order->id,
                'client_id' => $order->client_id,
                'product_id' => $order->product_id,
                'order_number' => $order->order_number,
                'client_name' => $order->client_name,
                'style_code' => $order->style_code,
                'style_name' => $order->style_name,
                'planned_quantity' => $qty,
                'target_start_date' => $validated['target_start_date'],
                'target_end_date' => $validated['target_end_date'],
                'priority' => $validated['priority'] ?? 'normal',
                'assigned_line' => $validated['assigned_line'] ?? 'line_1',
                'supervisor_id' => $validated['supervisor_id'] ?? null,
                'supervisor_name' => $validated['supervisor_name'] ?? null,
                'standard_sam' => 18.5,
                'size_breakdown' => $defaultSizes,
                'stage' => 'planning',
                'status' => 'released',
                'special_instructions' => $validated['special_instructions'] ?? null,
            ]);

            // Advance commercial order production stage
            $order->update([
                'production_stage' => 'Pre-Production',
                'status' => 'in_production',
            ]);

            return $newJob;
        });

        return response()->json([
            'success' => true,
            'message' => "Production Job {$job->job_number} released to factory floor.",
            'data' => $job,
        ], 201);
    }

    public function show($id)
    {
        $job = ProductionJob::with([
            'cuttingPlans.sizes',
            'materialIssues',
            'bundles',
            'operatorLogs',
            'finishingOperations',
            'qaInspections.defects',
            'packingCartons.items',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $job,
        ]);
    }

    public function issueMaterial(Request $request)
    {
        $validated = $request->validate([
            'production_job_id' => 'required|exists:production_jobs,id',
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'quantity' => 'required|numeric|min:0.1',
            'to_stage' => 'required|string',
        ]);

        $issue = DB::transaction(function () use ($validated) {
            $item = InventoryItem::where('id', $validated['inventory_item_id'])->lockForUpdate()->firstOrFail();
            $qty = (float) $validated['quantity'];

            if ($item->available_stock < $qty) {
                abort(422, "Insufficient stock. Available: {$item->available_stock} {$item->unit}.");
            }

            $item->available_stock -= $qty;
            $item->allocated_stock += $qty;
            $item->save();

            StockMovement::create([
                'inventory_item_id' => $item->id,
                'movement_number' => 'MOV-' . date('Ymd') . '-' . Str::upper(Str::random(4)),
                'movement_type' => 'production_issue',
                'quantity' => $qty,
                'previous_stock' => $item->available_stock + $qty,
                'new_stock' => $item->available_stock,
                'reference_type' => 'production_jobs',
                'reference_id' => (string) $validated['production_job_id'],
                'actor' => 'Production Supervisor',
            ]);

            return ProductionMaterialIssue::create([
                'issue_number' => 'ISS-' . time(),
                'production_job_id' => $validated['production_job_id'],
                'inventory_item_id' => $item->id,
                'material_name' => $item->name,
                'sku' => $item->sku,
                'lot_number' => $item->lot_number,
                'category' => $item->category,
                'from_bay' => $item->bay,
                'to_stage' => $validated['to_stage'],
                'standard_bom_qty' => $qty,
                'issued_quantity' => $qty,
                'unit' => $item->unit,
                'unit_cost' => $item->unit_cost,
                'total_cost' => $item->unit_cost * $qty,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => "Material issued successfully.",
            'data' => $issue,
        ], 201);
    }
}

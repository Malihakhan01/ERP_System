<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ProductionBundle;
use App\Models\ProductionJob;
use App\Models\Employee;
use App\Models\OperatorProductionLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BundleController extends Controller
{
    public function index($job_id)
    {
        $bundles = ProductionBundle::with(['assignedEmployee', 'operatorLogs'])
            ->where('production_job_id', $job_id)
            ->orderBy('bundle_number', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $bundles,
        ]);
    }

    public function assign(Request $request)
    {
        $validated = $request->validate([
            'bundle_id' => 'required|exists:production_bundles,id',
            'employee_id' => 'required|exists:employees,id',
            'operation_name' => 'required|string|max:150',
            'line_code' => 'nullable|string|max:50',
        ]);

        $bundle = DB::transaction(function () use ($validated) {
            $b = ProductionBundle::findOrFail($validated['bundle_id']);
            $emp = Employee::findOrFail($validated['employee_id']);

            $b->update([
                'assigned_employee_id' => $emp->id,
                'assigned_employee_name' => $emp->full_name,
                'assigned_operation' => $validated['operation_name'],
                'current_line' => $validated['line_code'] ?? $b->current_line,
                'current_stage' => 'stitching',
                'status' => 'in_progress',
            ]);

            return $b;
        });

        return response()->json([
            'success' => true,
            'message' => "Bundle {$bundle->bundle_barcode} assigned to {$bundle->assigned_employee_name}.",
            'data' => $bundle,
        ]);
    }

    public function recordOutput(Request $request)
    {
        $validated = $request->validate([
            'bundle_id' => 'required|exists:production_bundles,id',
            'employee_id' => 'required|exists:employees,id',
            'operation_name' => 'required|string|max:150',
            'pieces_completed' => 'required|integer|min:0',
            'pieces_rejected' => 'nullable|integer|min:0',
            'pieces_rework' => 'nullable|integer|min:0',
            'rate_per_piece' => 'required|numeric|min:0',
            'work_date' => 'required|date',
            'shift' => 'nullable|string',
        ]);

        $log = DB::transaction(function () use ($validated) {
            $bundle = ProductionBundle::findOrFail($validated['bundle_id']);
            $emp = Employee::findOrFail($validated['employee_id']);
            $job = ProductionJob::findOrFail($bundle->production_job_id);

            $completed = (int) $validated['pieces_completed'];
            $rejected = (int) ($validated['pieces_rejected'] ?? 0);
            $rework = (int) ($validated['pieces_rework'] ?? 0);
            $rate = (float) $validated['rate_per_piece'];
            $totalEarnings = $completed * $rate;

            $newLog = OperatorProductionLog::create([
                'production_job_id' => $job->id,
                'bundle_id' => $bundle->id,
                'employee_id' => $emp->id,
                'employee_name' => $emp->full_name,
                'operation_name' => $validated['operation_name'],
                'pieces_completed' => $completed,
                'pieces_rejected' => $rejected,
                'pieces_rework' => $rework,
                'rate_per_piece' => $rate,
                'total_earnings' => $totalEarnings,
                'work_date' => $validated['work_date'],
                'shift' => $validated['shift'] ?? 'Morning',
                'payroll_month' => substr($validated['work_date'], 0, 7),
                'verified_by' => 'Floor Supervisor',
            ]);

            // Update Bundle pieces
            $bundle->passed_pieces += $completed;
            $bundle->rejected_pieces += $rejected;
            $bundle->rework_pieces += $rework;
            if ($bundle->passed_pieces >= $bundle->quantity) {
                $bundle->status = 'passed';
            }
            $bundle->save();

            // Update Job stitch total
            $job->total_stitched_quantity += $completed;
            $job->total_rejected_quantity += $rejected;
            $job->total_rework_quantity += $rework;
            $job->save();

            return $newLog;
        });

        return response()->json([
            'success' => true,
            'message' => "Logged {$log->pieces_completed} pcs output for {$log->employee_name} (Earnings: \${$log->total_earnings}).",
            'data' => $log,
        ], 201);
    }
}

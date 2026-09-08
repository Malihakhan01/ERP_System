<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\QAInspection;
use App\Models\QADefectDetail;
use App\Models\QAReworkRecord;
use App\Models\ProductionJob;
use App\Domain\QA\AqlSamplingCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QAInspectionController extends Controller
{
    public function index(Request $request)
    {
        $query = QAInspection::with(['defects', 'reworkRecords'])->orderBy('created_at', 'desc');

        if ($request->filled('result') && $request->result !== 'all') {
            $query->where('inspection_result', $request->result);
        }
        if ($request->filled('stage') && $request->stage !== 'all') {
            $query->where('inspection_stage', $request->stage);
        }

        $inspections = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $inspections->items(),
            'pagination' => [
                'total' => $inspections->total(),
                'current_page' => $inspections->currentPage(),
                'last_page' => $inspections->lastPage(),
                'per_page' => $inspections->perPage(),
            ],
        ]);
    }

    public function queue()
    {
        $queue = ProductionJob::where('is_archived', false)
            ->whereIn('stage', ['stitching', 'finishing', 'qa'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $queue,
        ]);
    }

    public function reworkList()
    {
        $reworks = QAReworkRecord::with(['inspection', 'productionJob'])
            ->where('status', 'in_progress')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $reworks,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'production_job_id' => 'required|exists:production_jobs,id',
            'bundle_id' => 'nullable|exists:production_bundles,id',
            'inspection_stage' => 'required|string',
            'inspection_level' => 'nullable|string',
            'lot_size' => 'required|integer|min:1',
            'passed_pieces' => 'required|integer|min:0',
            'critical_defects_found' => 'nullable|integer|min:0',
            'major_defects_found' => 'nullable|integer|min:0',
            'minor_defects_found' => 'nullable|integer|min:0',
            'inspector_name' => 'nullable|string',
            'defects' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $inspection = DB::transaction(function () use ($validated) {
            $job = ProductionJob::findOrFail($validated['production_job_id']);
            $lotSize = (int) $validated['lot_size'];
            $plan = AqlSamplingCalculator::computeSamplePlan($lotSize, $validated['inspection_level'] ?? 'Level II');

            $crit = (int) ($validated['critical_defects_found'] ?? 0);
            $maj = (int) ($validated['major_defects_found'] ?? 0);
            $min = (int) ($validated['minor_defects_found'] ?? 0);

            $result = AqlSamplingCalculator::evaluateResult($crit, $maj, $min, $plan);

            $count = QAInspection::where('production_job_id', $job->id)->count() + 1;
            $inspNumber = 'QA-' . substr($job->job_number, 4) . '-' . str_pad((string) $count, 2, '0', STR_PAD_LEFT);

            $newInsp = QAInspection::create([
                'inspection_number' => $inspNumber,
                'production_job_id' => $job->id,
                'bundle_id' => $validated['bundle_id'] ?? null,
                'inspection_stage' => $validated['inspection_stage'],
                'inspection_level' => $plan['inspection_level'],
                'aql_level' => 'AQL 2.5 Major / 4.0 Minor',
                'lot_size' => $lotSize,
                'sample_size' => $plan['sample_size'],
                'passed_pieces' => (int) $validated['passed_pieces'],
                'failed_pieces' => $crit + $maj + $min,
                'critical_defects_found' => $crit,
                'major_defects_found' => $maj,
                'minor_defects_found' => $min,
                'inspection_result' => $result,
                'status' => $result === 'passed' ? 'passed' : 'rework_required',
                'inspector_name' => $validated['inspector_name'] ?? 'QA Inspector',
                'notes' => $validated['notes'] ?? null,
            ]);

            if (!empty($validated['defects'])) {
                foreach ($validated['defects'] as $def) {
                    QADefectDetail::create([
                        'qa_inspection_id' => $newInsp->id,
                        'defect_code' => $def['defect_code'] ?? 'DEF-GEN',
                        'defect_name' => $def['defect_name'] ?? 'Defect',
                        'defect_category' => $def['defect_category'] ?? 'major',
                        'defect_count' => (int) ($def['defect_count'] ?? 1),
                        'responsible_operation' => $def['responsible_operation'] ?? null,
                    ]);
                }
            }

            if ($result === 'rework_required' || $result === 'failed') {
                QAReworkRecord::create([
                    'rework_number' => 'RWK-' . substr($job->job_number, 4) . '-' . str_pad((string) $count, 2, '0', STR_PAD_LEFT),
                    'qa_inspection_id' => $newInsp->id,
                    'production_job_id' => $job->id,
                    'rework_quantity' => $crit + $maj + $min,
                    'defect_summary' => "Defects identified: {$crit} critical, {$maj} major, {$min} minor.",
                    'assigned_line' => $job->assigned_line,
                    'status' => 'in_progress',
                ]);
            } else {
                $job->total_qa_passed_quantity += (int) $validated['passed_pieces'];
                $job->save();
            }

            return $newInsp->load('defects');
        });

        return response()->json([
            'success' => true,
            'message' => "QA Inspection {$inspection->inspection_number} saved (Result: {$inspection->inspection_result}).",
            'data' => $inspection,
        ], 201);
    }

    public function resolveRework(Request $request, $id)
    {
        $rework = QAReworkRecord::findOrFail($id);
        $request->validate(['notes' => 'nullable|string']);

        $rework->update([
            'status' => 'completed',
            'completion_notes' => $request->notes ?? 'Rework completed on line and verified.',
            'completed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Rework ticket {$rework->rework_number} marked as resolved.",
            'data' => $rework,
        ]);
    }
}

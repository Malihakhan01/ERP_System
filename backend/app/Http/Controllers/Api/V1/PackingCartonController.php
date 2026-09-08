<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PackingCarton;
use App\Models\PackingCartonItem;
use App\Models\ProductionJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PackingCartonController extends Controller
{
    public function index(Request $request)
    {
        $query = PackingCarton::with('items')->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('carton_number', 'like', "%{$s}%")
                  ->orWhere('carton_barcode', 'like', "%{$s}%");
            });
        }

        $cartons = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $cartons->items(),
            'pagination' => [
                'total' => $cartons->total(),
                'current_page' => $cartons->currentPage(),
                'last_page' => $cartons->lastPage(),
                'per_page' => $cartons->perPage(),
            ],
        ]);
    }

    public function queue()
    {
        $jobs = ProductionJob::where('is_archived', false)
            ->where('total_qa_passed_quantity', '>', 0)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $jobs,
        ]);
    }

    public function resolveBarcode($barcode)
    {
        $carton = PackingCarton::with(['items', 'productionJob'])->where('carton_barcode', $barcode)->first();

        if (!$carton) {
            return response()->json([
                'success' => false,
                'message' => "No master carton found matching barcode '{$barcode}'.",
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $carton,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'production_job_id' => 'required|exists:production_jobs,id',
            'packing_type' => 'nullable|string',
            'gross_weight_kg' => 'required|numeric|min:0.1',
            'net_weight_kg' => 'required|numeric|min:0.1',
            'length_cm' => 'nullable|numeric',
            'width_cm' => 'nullable|numeric',
            'height_cm' => 'nullable|numeric',
            'items' => 'required|array|min:1',
        ]);

        $carton = DB::transaction(function () use ($validated) {
            $job = ProductionJob::findOrFail($validated['production_job_id']);
            $index = PackingCarton::where('production_job_id', $job->id)->count() + 1;
            $cartonNumber = 'CTN-' . substr($job->job_number, 4) . '-' . str_pad((string) $index, 3, '0', STR_PAD_LEFT);
            $barcode = 'CTN-BC-' . substr($job->job_number, 4) . '-' . str_pad((string) $index, 3, '0', STR_PAD_LEFT);

            $totalUnits = 0;
            foreach ($validated['items'] as $it) {
                $totalUnits += (int) ($it['quantity'] ?? 0);
            }

            $newCarton = PackingCarton::create([
                'carton_number' => $cartonNumber,
                'production_job_id' => $job->id,
                'carton_index' => $index,
                'carton_barcode' => $barcode,
                'packing_type' => $validated['packing_type'] ?? 'Master Solid Carton',
                'total_units_in_carton' => $totalUnits,
                'gross_weight_kg' => $validated['gross_weight_kg'],
                'net_weight_kg' => $validated['net_weight_kg'],
                'length_cm' => $validated['length_cm'] ?? 60.0,
                'width_cm' => $validated['width_cm'] ?? 40.0,
                'height_cm' => $validated['height_cm'] ?? 35.0,
                'status' => 'packed',
                'packed_by' => 'Packing Floor Supervisor',
            ]);

            foreach ($validated['items'] as $it) {
                PackingCartonItem::create([
                    'carton_id' => $newCarton->id,
                    'size' => $it['size'],
                    'colorway' => $it['colorway'] ?? 'Standard',
                    'quantity' => (int) $it['quantity'],
                ]);
            }

            $job->total_packed_quantity += $totalUnits;
            $job->save();

            return $newCarton->load('items');
        });

        return response()->json([
            'success' => true,
            'message' => "Master Carton {$carton->carton_number} packed and barcode generated.",
            'data' => $carton,
        ], 201);
    }
}

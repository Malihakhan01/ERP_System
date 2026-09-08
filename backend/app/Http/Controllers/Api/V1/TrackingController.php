<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TrackingRecord;
use App\Models\TrackingTimeline;
use App\Models\Order;
use App\Models\PackingCarton;
use App\Models\ProductionBundle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrackingController extends Controller
{
    public function index(Request $request)
    {
        $query = TrackingRecord::with(['order', 'timeline'])->orderBy('created_at', 'desc');

        if ($request->filled('gate') && $request->gate !== 'all') {
            $query->where('current_gate', $request->gate);
        }

        $records = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $records->items(),
            'pagination' => [
                'total' => $records->total(),
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'origin_facility' => 'nullable|string',
            'destination_port' => 'required|string',
            'estimated_delivery' => 'required|date',
        ]);

        $record = DB::transaction(function () use ($validated) {
            $order = Order::findOrFail($validated['order_id']);
            $count = TrackingRecord::count() + 1;
            $trkNumber = 'TRK-' . date('Y') . '-' . str_pad((string) $count, 3, '0', STR_PAD_LEFT);

            $newTrk = TrackingRecord::create([
                'tracking_number' => $trkNumber,
                'order_id' => $order->id,
                'current_gate' => 1,
                'gate_status' => 'in_progress',
                'origin_facility' => $validated['origin_facility'] ?? 'Main Garment Plant Sialkot',
                'destination_port' => $validated['destination_port'],
                'current_location' => 'Factory Floor',
                'estimated_delivery' => $validated['estimated_delivery'],
            ]);

            TrackingTimeline::create([
                'tracking_record_id' => $newTrk->id,
                'gate_number' => 1,
                'title' => 'Gate 1: Order Confirmation & Production Booking',
                'description' => "Commercial order {$order->order_number} confirmed and milestone tracking registered.",
                'location' => 'Commercial Merchandising Bay',
                'actor' => 'System Milestone Dispatcher',
            ]);

            return $newTrk->load('timeline');
        });

        return response()->json([
            'success' => true,
            'message' => "Shipment Tracking {$record->tracking_number} registered.",
            'data' => $record,
        ], 201);
    }

    public function advanceGate(Request $request, $id)
    {
        $validated = $request->validate([
            'gate_number' => 'required|integer|min:1|max:9',
            'title' => 'required|string|max:150',
            'description' => 'required|string',
            'location' => 'required|string|max:150',
        ]);

        $record = DB::transaction(function () use ($id, $validated) {
            $trk = TrackingRecord::findOrFail($id);
            $trk->update([
                'current_gate' => $validated['gate_number'],
                'current_location' => $validated['location'],
            ]);

            TrackingTimeline::create([
                'tracking_record_id' => $trk->id,
                'gate_number' => $validated['gate_number'],
                'title' => $validated['title'],
                'description' => $validated['description'],
                'location' => $validated['location'],
                'actor' => 'Milestone Controller',
            ]);

            return $trk->load('timeline');
        });

        return response()->json([
            'success' => true,
            'message' => "Advanced to Gate {$record->current_gate}.",
            'data' => $record,
        ]);
    }

    public function resolveBarcode($barcode)
    {
        // 1. Check if bundle
        $bundle = ProductionBundle::with('productionJob')->where('bundle_barcode', $barcode)->first();
        if ($bundle) {
            return response()->json([
                'success' => true,
                'type' => 'bundle',
                'data' => $bundle,
            ]);
        }

        // 2. Check if carton
        $carton = PackingCarton::with(['items', 'productionJob'])->where('carton_barcode', $barcode)->first();
        if ($carton) {
            return response()->json([
                'success' => true,
                'type' => 'carton',
                'data' => $carton,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "No entity found for barcode '{$barcode}'.",
        ], 404);
    }
}

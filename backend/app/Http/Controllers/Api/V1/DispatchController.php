<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DispatchNote;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DispatchController extends Controller
{
    public function index(Request $request)
    {
        $query = DispatchNote::with('order')->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $dispatches = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $dispatches->items(),
            'pagination' => [
                'total' => $dispatches->total(),
                'current_page' => $dispatches->currentPage(),
                'last_page' => $dispatches->lastPage(),
                'per_page' => $dispatches->perPage(),
            ],
        ]);
    }

    public function queue()
    {
        $orders = Order::where('is_archived', false)
            ->whereIn('status', ['in_production', 'qa', 'packed'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'carrier_name' => 'required|string|max:150',
            'tracking_ref' => 'nullable|string|max:100',
            'container_number' => 'nullable|string|max:100',
            'seal_number' => 'nullable|string|max:100',
            'total_cartons' => 'required|integer|min:1',
            'total_pieces' => 'required|integer|min:1',
            'gross_weight_kg' => 'required|numeric|min:0.1',
            'shipping_method' => 'required|string|max:100',
            'destination_port' => 'nullable|string|max:150',
        ]);

        $dispatch = DB::transaction(function () use ($validated) {
            $order = Order::findOrFail($validated['order_id']);
            $count = DispatchNote::count() + 1;
            $dispNumber = 'DSP-' . date('Y') . '-' . str_pad((string) $count, 3, '0', STR_PAD_LEFT);

            $newDisp = DispatchNote::create(array_merge($validated, [
                'dispatch_number' => $dispNumber,
                'status' => 'ready_for_dispatch',
            ]));

            $order->update([
                'status' => 'packed',
                'production_stage' => 'Ready for Container Dispatch',
            ]);

            return $newDisp;
        });

        return response()->json([
            'success' => true,
            'message' => "Dispatch Note {$dispatch->dispatch_number} created.",
            'data' => $dispatch,
        ], 201);
    }

    public function markLoaded(Request $request, $id)
    {
        $dispatch = DispatchNote::findOrFail($id);
        $dispatch->update(['status' => 'loaded']);

        return response()->json([
            'success' => true,
            'message' => "Container for Dispatch {$dispatch->dispatch_number} marked as loaded.",
            'data' => $dispatch,
        ]);
    }

    public function completeDispatch(Request $request, $id)
    {
        $dispatch = DispatchNote::findOrFail($id);

        DB::transaction(function () use ($dispatch) {
            $dispatch->update([
                'status' => 'dispatched',
                'dispatched_at' => now(),
            ]);

            $order = Order::find($dispatch->order_id);
            if ($order) {
                $order->update([
                    'status' => 'shipped',
                    'production_stage' => 'Export Shipment Dispatched',
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => "Dispatch {$dispatch->dispatch_number} completed and marked as shipped.",
            'data' => $dispatch,
        ]);
    }
}

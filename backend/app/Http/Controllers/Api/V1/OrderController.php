<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Client;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::where('is_archived', false)->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('priority') && $request->priority !== 'all') {
            $query->where('priority', $request->priority);
        }
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('order_number', 'like', "%{$s}%")
                  ->orWhere('client_name', 'like', "%{$s}%")
                  ->orWhere('style_code', 'like', "%{$s}%")
                  ->orWhere('buyer_po_ref', 'like', "%{$s}%");
            });
        }

        $orders = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $orders->items(),
            'pagination' => [
                'total' => $orders->total(),
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_number' => 'required|string|max:50|unique:orders,order_number',
            'client_id' => 'required|exists:clients,id',
            'product_id' => 'nullable|exists:products,id',
            'style_code' => 'required|string|max:50',
            'style_name' => 'required|string|max:200',
            'order_date' => 'required|date',
            'delivery_deadline' => 'required|date',
            'order_type' => 'nullable|string',
            'currency' => 'required|string|max:10',
            'priority' => 'nullable|string',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0.01',
            'discount' => 'nullable|numeric|min:0',
            'additional_charges' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string',
            'incoterms' => 'nullable|string',
            'special_instructions' => 'nullable|string',
        ]);

        $order = DB::transaction(function () use ($validated) {
            $client = Client::findOrFail($validated['client_id']);
            $qty = (int) $validated['quantity'];
            $price = (float) $validated['unit_price'];
            $subtotal = $qty * $price;
            $discount = (float) ($validated['discount'] ?? 0.0);
            $charges = (float) ($validated['additional_charges'] ?? 0.0);
            $tax = (float) ($validated['tax'] ?? 0.0);
            $totalValue = $subtotal - $discount + $charges + $tax;

            return Order::create(array_merge($validated, [
                'client_name' => $client->company_name,
                'client_country' => $client->country,
                'subtotal' => $subtotal,
                'total_value' => $totalValue,
                'status' => 'confirmed',
                'production_stage' => 'Order Confirmed',
                'payment_status' => 'pending',
            ]));
        });

        return response()->json([
            'success' => true,
            'message' => "Sales Order {$order->order_number} confirmed.",
            'data' => $order,
        ], 201);
    }

    public function show($id)
    {
        $order = Order::with(['client', 'product', 'productionJob', 'costEstimates', 'dispatchNotes'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $request->validate(['status' => 'required|string']);

        $order->update(['status' => $request->status]);

        return response()->json([
            'success' => true,
            'message' => "Order {$order->order_number} status updated to {$order->status}.",
            'data' => $order,
        ]);
    }

    public function destroy($id)
    {
        $order = Order::findOrFail($id);
        $order->update(['is_archived' => true]);

        return response()->json([
            'success' => true,
            'message' => "Order {$order->order_number} archived.",
        ]);
    }
}

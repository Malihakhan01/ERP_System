<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = InventoryItem::where('is_archived', false)->orderBy('name', 'asc');

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('sku', 'like', "%{$s}%")
                  ->orWhere('name', 'like', "%{$s}%")
                  ->orWhere('bay', 'like', "%{$s}%");
            });
        }

        $items = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $items->items(),
            'pagination' => [
                'total' => $items->total(),
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sku' => 'required|string|max:50|unique:inventory_items,sku',
            'name' => 'required|string|max:200',
            'category' => 'required|string|max:100',
            'unit' => 'required|string|max:20',
            'unit_cost' => 'required|numeric|min:0',
            'total_stock' => 'required|numeric|min:0',
            'min_reorder_level' => 'nullable|numeric|min:0',
            'bay' => 'nullable|string|max:50',
            'lot_number' => 'nullable|string|max:100',
        ]);

        $item = DB::transaction(function () use ($validated) {
            $validated['available_stock'] = $validated['total_stock'];
            $validated['allocated_stock'] = 0.0;
            $newItem = InventoryItem::create($validated);

            if ($newItem->total_stock > 0) {
                StockMovement::create([
                    'inventory_item_id' => $newItem->id,
                    'movement_number' => 'MOV-' . date('Ymd') . '-' . Str::upper(Str::random(4)),
                    'movement_type' => 'purchase_receipt',
                    'quantity' => $newItem->total_stock,
                    'previous_stock' => 0.0,
                    'new_stock' => $newItem->total_stock,
                    'reference_type' => 'opening_balance',
                    'actor' => 'Warehouse Manager',
                ]);
            }

            return $newItem;
        });

        return response()->json([
            'success' => true,
            'message' => "Item {$item->name} added to warehouse inventory.",
            'data' => $item,
        ], 201);
    }

    public function movements(Request $request)
    {
        $query = StockMovement::with('inventoryItem')->orderBy('created_at', 'desc');

        if ($request->filled('item_id')) {
            $query->where('inventory_item_id', $request->item_id);
        }

        $movements = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $movements->items(),
            'pagination' => [
                'total' => $movements->total(),
                'current_page' => $movements->currentPage(),
                'last_page' => $movements->lastPage(),
                'per_page' => $movements->perPage(),
            ],
        ]);
    }

    public function adjustStock(Request $request)
    {
        $validated = $request->validate([
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'adjustment_type' => 'required|in:add,subtract',
            'quantity' => 'required|numeric|min:0.1',
            'reason' => 'required|string|max:255',
        ]);

        $movement = DB::transaction(function () use ($validated) {
            $item = InventoryItem::where('id', $validated['inventory_item_id'])->lockForUpdate()->firstOrFail();
            $qty = (float) $validated['quantity'];
            $prevStock = $item->available_stock;

            if ($validated['adjustment_type'] === 'add') {
                $item->total_stock += $qty;
                $item->available_stock += $qty;
                $movType = 'return_to_stock';
            } else {
                if ($item->available_stock < $qty) {
                    abort(422, "Cannot deduct {$qty} {$item->unit}. Available: {$item->available_stock}.");
                }
                $item->total_stock -= $qty;
                $item->available_stock -= $qty;
                $movType = 'damage_adjustment';
            }

            $item->save();

            return StockMovement::create([
                'inventory_item_id' => $item->id,
                'movement_number' => 'MOV-' . date('Ymd') . '-' . Str::upper(Str::random(4)),
                'movement_type' => $movType,
                'quantity' => $qty,
                'previous_stock' => $prevStock,
                'new_stock' => $item->available_stock,
                'notes' => $validated['reason'],
                'actor' => 'Warehouse Supervisor',
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => "Stock adjusted successfully.",
            'data' => $movement,
        ]);
    }
}

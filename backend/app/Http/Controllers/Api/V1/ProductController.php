<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::where('is_archived', false)->orderBy('created_at', 'desc');

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('production_status', $request->status);
        }
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('style_code', 'like', "%{$s}%")
                  ->orWhere('name', 'like', "%{$s}%")
                  ->orWhere('fabric_type', 'like', "%{$s}%");
            });
        }

        $products = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $products->items(),
            'pagination' => [
                'total' => $products->total(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'style_code' => 'required|string|max:50|unique:products,style_code',
            'name' => 'required|string|max:200',
            'category' => 'required|string|max:100',
            'sam' => 'required|numeric|min:0.1',
            'fabric_type' => 'required|string|max:150',
            'gsm' => 'required|string|max:50',
            'consumption_kg' => 'required|numeric|min:0.01',
            'wastage_pct' => 'nullable|numeric|min:0',
            'sizes' => 'required|array',
            'bom_status' => 'nullable|string',
            'production_status' => 'nullable|string',
            'specs' => 'nullable|array',
        ]);

        $product = Product::create($validated);

        return response()->json([
            'success' => true,
            'message' => "Garment Tech Pack {$product->style_code} created successfully.",
            'data' => $product,
        ], 201);
    }

    public function show($id)
    {
        $product = Product::with(['orders', 'costEstimates'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $product,
        ]);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'style_code' => "sometimes|required|string|max:50|unique:products,style_code,{$id}",
            'name' => 'sometimes|required|string|max:200',
            'category' => 'sometimes|required|string|max:100',
            'sam' => 'sometimes|required|numeric|min:0.1',
            'fabric_type' => 'sometimes|required|string|max:150',
            'gsm' => 'sometimes|required|string|max:50',
            'consumption_kg' => 'sometimes|required|numeric|min:0.01',
            'wastage_pct' => 'nullable|numeric|min:0',
            'sizes' => 'sometimes|required|array',
            'bom_status' => 'nullable|string',
            'production_status' => 'nullable|string',
            'specs' => 'nullable|array',
        ]);

        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => "Product {$product->style_code} updated successfully.",
            'data' => $product,
        ]);
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->update(['is_archived' => true]);

        return response()->json([
            'success' => true,
            'message' => "Product {$product->style_code} archived successfully.",
        ]);
    }
}

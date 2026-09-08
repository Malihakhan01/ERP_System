<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::where('is_archived', false)->orderBy('company_name', 'asc');

        if ($request->filled('country') && $request->country !== 'all') {
            $query->where('country', $request->country);
        }
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('company_name', 'like', "%{$s}%")
                  ->orWhere('brand_name', 'like', "%{$s}%")
                  ->orWhere('contact_person', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%");
            });
        }

        $clients = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $clients->items(),
            'pagination' => [
                'total' => $clients->total(),
                'current_page' => $clients->currentPage(),
                'last_page' => $clients->lastPage(),
                'per_page' => $clients->perPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:200',
            'brand_name' => 'nullable|string|max:150',
            'country' => 'required|string|max:100',
            'city' => 'nullable|string|max:100',
            'contact_person' => 'nullable|string|max:150',
            'email' => 'nullable|email|max:150',
            'phone' => 'nullable|string|max:50',
            'currency' => 'required|string|max:10',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string|max:150',
            'tax_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $count = Client::count() + 1;
        $validated['display_id'] = 'CLT-' . date('Y') . '-' . str_pad((string) $count, 3, '0', STR_PAD_LEFT);

        $client = Client::create($validated);

        return response()->json([
            'success' => true,
            'message' => "Client {$client->company_name} registered successfully.",
            'data' => $client,
        ], 201);
    }

    public function show($id)
    {
        $client = Client::with('orders')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $client,
        ]);
    }

    public function update(Request $request, $id)
    {
        $client = Client::findOrFail($id);

        $validated = $request->validate([
            'company_name' => 'sometimes|required|string|max:200',
            'brand_name' => 'nullable|string|max:150',
            'country' => 'sometimes|required|string|max:100',
            'city' => 'nullable|string|max:100',
            'contact_person' => 'nullable|string|max:150',
            'email' => 'nullable|email|max:150',
            'phone' => 'nullable|string|max:50',
            'currency' => 'sometimes|required|string|max:10',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string|max:150',
            'tax_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $client->update($validated);

        return response()->json([
            'success' => true,
            'message' => "Client {$client->company_name} updated successfully.",
            'data' => $client,
        ]);
    }

    public function destroy($id)
    {
        $client = Client::findOrFail($id);
        $client->update(['is_archived' => true]);

        return response()->json([
            'success' => true,
            'message' => "Client {$client->company_name} archived.",
        ]);
    }
}

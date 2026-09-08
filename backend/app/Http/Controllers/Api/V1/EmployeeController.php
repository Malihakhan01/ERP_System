<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = Employee::where('is_archived', false)->orderBy('full_name', 'asc');

        if ($request->filled('department') && $request->department !== 'all') {
            $query->where('department', $request->department);
        }
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('full_name', 'like', "%{$s}%")
                  ->orWhere('employee_number', 'like', "%{$s}%")
                  ->orWhere('designation', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        $employees = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $employees->items(),
            'pagination' => [
                'total' => $employees->total(),
                'current_page' => $employees->currentPage(),
                'last_page' => $employees->lastPage(),
                'per_page' => $employees->perPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:150',
            'father_name' => 'nullable|string|max:150',
            'cnic' => 'nullable|string|max:30|unique:employees,cnic',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email|max:150',
            'joining_date' => 'required|date',
            'department' => 'required|string|max:100',
            'designation' => 'required|string|max:150',
            'employment_type' => 'nullable|string',
            'salary_type' => 'required|string',
            'monthly_salary' => 'nullable|numeric|min:0',
            'daily_rate' => 'nullable|numeric|min:0',
            'piece_rate' => 'nullable|numeric|min:0',
            'assigned_line' => 'nullable|string',
            'skill_level' => 'nullable|string',
        ]);

        $count = Employee::count() + 1;
        $validated['employee_number'] = 'EMP-' . date('Y') . '-' . str_pad((string) $count, 3, '0', STR_PAD_LEFT);

        $emp = Employee::create($validated);

        return response()->json([
            'success' => true,
            'message' => "Employee {$emp->full_name} ({$emp->employee_number}) registered successfully.",
            'data' => $emp,
        ], 201);
    }

    public function show($id)
    {
        $emp = Employee::with(['productionLogs', 'payrollRecords'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $emp,
        ]);
    }

    public function update(Request $request, $id)
    {
        $emp = Employee::findOrFail($id);

        $validated = $request->validate([
            'full_name' => 'sometimes|required|string|max:150',
            'father_name' => 'nullable|string|max:150',
            'cnic' => "nullable|string|max:30|unique:employees,cnic,{$id}",
            'phone' => 'sometimes|required|string|max:50',
            'email' => 'nullable|email|max:150',
            'joining_date' => 'sometimes|required|date',
            'department' => 'sometimes|required|string|max:100',
            'designation' => 'sometimes|required|string|max:150',
            'employment_type' => 'nullable|string',
            'salary_type' => 'sometimes|required|string',
            'monthly_salary' => 'nullable|numeric|min:0',
            'daily_rate' => 'nullable|numeric|min:0',
            'piece_rate' => 'nullable|numeric|min:0',
            'assigned_line' => 'nullable|string',
            'skill_level' => 'nullable|string',
        ]);

        $emp->update($validated);

        return response()->json([
            'success' => true,
            'message' => "Employee {$emp->full_name} updated successfully.",
            'data' => $emp,
        ]);
    }

    public function destroy($id)
    {
        $emp = Employee::findOrFail($id);
        $emp->update(['is_archived' => true]);

        return response()->json([
            'success' => true,
            'message' => "Employee {$emp->full_name} archived.",
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PayrollRecord;
use App\Models\Employee;
use App\Models\OperatorProductionLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    public function index(Request $request)
    {
        $query = PayrollRecord::with('employee')->orderBy('payroll_month', 'desc');

        if ($request->filled('month')) {
            $query->where('payroll_month', $request->month);
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

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'payroll_month' => 'required|string|regex:/^\d{4}-\d{2}$/',
        ]);

        $month = $validated['payroll_month'];

        $generated = DB::transaction(function () use ($month) {
            $employees = Employee::where('is_archived', false)->where('status', 'Active')->get();
            $results = [];

            foreach ($employees as $emp) {
                // Piece-rate earnings for the month
                $pieceEarnings = (float) OperatorProductionLog::where('employee_id', $emp->id)
                    ->where('payroll_month', $month)
                    ->sum('total_earnings');

                $baseSalary = $emp->salary_type === 'monthly' ? (float) $emp->monthly_salary : 0.0;
                $netPayable = $baseSalary + $pieceEarnings;

                $count = PayrollRecord::where('payroll_month', $month)->count() + 1;
                $payNumber = 'PAY-' . str_replace('-', '', $month) . '-' . str_pad((string) $count, 3, '0', STR_PAD_LEFT);

                $results[] = PayrollRecord::updateOrCreate(
                    [
                        'employee_id' => $emp->id,
                        'payroll_month' => $month,
                    ],
                    [
                        'payroll_number' => $payNumber,
                        'base_salary' => $baseSalary,
                        'piece_rate_earnings' => $pieceEarnings,
                        'overtime_earnings' => 0.0,
                        'advance_deductions' => 0.0,
                        'tax_deductions' => 0.0,
                        'net_payable' => $netPayable,
                        'status' => 'draft',
                        'generated_at' => now(),
                    ]
                );
            }

            return $results;
        });

        return response()->json([
            'success' => true,
            'message' => "Generated payroll for {$month} across " . count($generated) . " employees.",
            'data' => $generated,
        ]);
    }

    public function approve(Request $request, $id)
    {
        $payroll = PayrollRecord::findOrFail($id);
        $payroll->update(['status' => 'approved']);

        return response()->json([
            'success' => true,
            'message' => "Payroll record {$payroll->payroll_number} approved for disbursement.",
            'data' => $payroll,
        ]);
    }
}

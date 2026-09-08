<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\ProductionJob;
use App\Models\Product;
use App\Models\Client;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function metrics()
    {
        $activeOrdersCount = Order::where('is_archived', false)->whereNotIn('status', ['completed', 'cancelled'])->count();
        $totalMonthlyRevenue = (float) Order::where('is_archived', false)->whereMonth('created_at', date('m'))->whereYear('created_at', date('Y'))->sum('total_value');
        
        $activeProductionJobs = ProductionJob::where('is_archived', false)->whereNotIn('status', ['completed', 'cancelled'])->count();
        $totalPiecesCut = (int) ProductionJob::where('is_archived', false)->sum('total_cut_quantity');
        $totalPiecesStitched = (int) ProductionJob::where('is_archived', false)->sum('total_stitched_quantity');
        $totalPiecesPacked = (int) ProductionJob::where('is_archived', false)->sum('total_packed_quantity');
        
        $activeEmployees = Employee::where('is_archived', false)->where('status', 'Active')->count();
        $totalProducts = Product::where('is_archived', false)->count();
        $totalClients = Client::where('is_archived', false)->count();

        // Floor live pulse
        $floorPulse = [
            'active_lines' => ProductionJob::where('status', 'in_production')->distinct('assigned_line')->count('assigned_line'),
            'stitched_today' => (int) DB::table('operator_production_logs')->whereDate('work_date', date('Y-m-d'))->sum('pieces_completed'),
            'rejected_today' => (int) DB::table('operator_production_logs')->whereDate('work_date', date('Y-m-d'))->sum('pieces_rejected'),
            'active_operators' => DB::table('operator_production_logs')->whereDate('work_date', date('Y-m-d'))->distinct('employee_id')->count('employee_id'),
        ];

        // Recent Orders
        $recentOrders = Order::where('is_archived', false)->orderBy('created_at', 'desc')->limit(5)->get();

        return response()->json([
            'success' => true,
            'data' => [
                'metrics' => [
                    'active_orders' => $activeOrdersCount,
                    'monthly_revenue' => $totalMonthlyRevenue,
                    'active_jobs' => $activeProductionJobs,
                    'total_cut_pieces' => $totalPiecesCut,
                    'total_stitched_pieces' => $totalPiecesStitched,
                    'total_packed_pieces' => $totalPiecesPacked,
                    'active_employees' => $activeEmployees,
                    'total_products' => $totalProducts,
                    'total_clients' => $totalClients,
                ],
                'floor_pulse' => $floorPulse,
                'recent_orders' => $recentOrders,
            ],
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\ProductionJob;
use App\Models\QAInspection;
use App\Models\InventoryItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function financial(Request $request)
    {
        $year = $request->get('year', date('Y'));

        $orders = Order::where('is_archived', false)
            ->whereYear('order_date', $year)
            ->selectRaw('MONTH(order_date) as month, SUM(total_value) as revenue, COUNT(*) as count')
            ->groupBy('month')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'year' => $year,
                'monthly_revenue' => $orders,
                'total_annual_revenue' => (float) Order::where('is_archived', false)->whereYear('order_date', $year)->sum('total_value'),
            ],
        ]);
    }

    public function production(Request $request)
    {
        $jobs = ProductionJob::where('is_archived', false)
            ->selectRaw('assigned_line, SUM(total_cut_quantity) as cut, SUM(total_stitched_quantity) as stitched, SUM(total_packed_quantity) as packed')
            ->groupBy('assigned_line')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $jobs,
        ]);
    }

    public function qa(Request $request)
    {
        $qaStats = QAInspection::selectRaw('inspection_result, COUNT(*) as count')
            ->groupBy('inspection_result')
            ->get();

        $topDefects = DB::table('qa_defect_details')
            ->selectRaw('defect_name, defect_category, SUM(defect_count) as total')
            ->groupBy('defect_name', 'defect_category')
            ->orderBy('total', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'results_breakdown' => $qaStats,
                'top_defects' => $topDefects,
            ],
        ]);
    }

    public function inventory(Request $request)
    {
        $inventoryStats = InventoryItem::where('is_archived', false)
            ->selectRaw('category, COUNT(*) as item_count, SUM(total_stock * unit_cost) as total_valuation')
            ->groupBy('category')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $inventoryStats,
        ]);
    }
}

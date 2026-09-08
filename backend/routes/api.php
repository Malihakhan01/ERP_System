<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ClientController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\CostingController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\ProductionJobController;
use App\Http\Controllers\Api\V1\CuttingPlanController;
use App\Http\Controllers\Api\V1\BundleController;
use App\Http\Controllers\Api\V1\QAInspectionController;
use App\Http\Controllers\Api\V1\PackingCartonController;
use App\Http\Controllers\Api\V1\DispatchController;
use App\Http\Controllers\Api\V1\TrackingController;
use App\Http\Controllers\Api\V1\EmployeeController;
use App\Http\Controllers\Api\V1\PayrollController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\FileController;

/*
|--------------------------------------------------------------------------
| FactoryOS Garment ERP — REST API V1 Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // 1. Authentication Endpoints
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/auth/me', [AuthController::class, 'me'])->middleware('auth:sanctum');

    // 2. Executive Dashboard & Real-Time Pulse
    Route::get('/dashboard/metrics', [DashboardController::class, 'metrics']);

    // 3. Clients & Commercial Buyers
    Route::apiResource('clients', ClientController::class);

    // 4. Garment Products & Tech Packs
    Route::apiResource('products', ProductController::class);

    // 5. Commercial Sales Orders
    Route::apiResource('orders', OrderController::class);
    Route::put('/orders/{id}/status', [OrderController::class, 'updateStatus']);

    // 6. Pre-Costing BOM & Estimates
    Route::apiResource('costing', CostingController::class);
    Route::post('/costing/calculate-preview', [CostingController::class, 'calculatePreview']);

    // 7. Materials & Warehouse Inventory
    Route::apiResource('inventory', InventoryController::class);
    Route::get('/inventory-movements', [InventoryController::class, 'movements']);
    Route::post('/inventory/adjust-stock', [InventoryController::class, 'adjustStock']);

    // 8. Manufacturing Execution System (MES) & Floor Work Orders
    Route::apiResource('production/jobs', ProductionJobController::class);
    Route::post('/production/cutting-plans', [CuttingPlanController::class, 'store']);
    Route::post('/production/cutting-execute', [CuttingPlanController::class, 'executeCutting']);
    Route::post('/production/material-issue', [ProductionJobController::class, 'issueMaterial']);
    Route::get('/production/bundles/{job_id}', [BundleController::class, 'index']);
    Route::post('/production/assign-bundle', [BundleController::class, 'assign']);
    Route::post('/production/operator-output', [BundleController::class, 'recordOutput']);
    Route::post('/production/finishing/receive', [ProductionJobController::class, 'receiveFinishing']);
    Route::post('/production/finishing/complete', [ProductionJobController::class, 'completeFinishing']);

    // 9. QA ANSI/ASQ Z1.4 & AQL 2.5 Audits
    Route::apiResource('qa/inspections', QAInspectionController::class);
    Route::get('/qa/queue', [QAInspectionController::class, 'queue']);
    Route::get('/qa/rework', [QAInspectionController::class, 'reworkList']);
    Route::post('/qa/rework/{id}/resolve', [QAInspectionController::class, 'resolveRework']);

    // 10. Master Carton Packing
    Route::apiResource('packing/cartons', PackingCartonController::class);
    Route::get('/packing/queue', [PackingCartonController::class, 'queue']);
    Route::get('/packing/resolve-barcode/{barcode}', [PackingCartonController::class, 'resolveBarcode']);

    // 11. Export Dispatch & Manifests
    Route::apiResource('dispatch', DispatchController::class);
    Route::get('/dispatch/queue', [DispatchController::class, 'queue']);
    Route::post('/dispatch/{id}/mark-loaded', [DispatchController::class, 'markLoaded']);
    Route::post('/dispatch/{id}/complete', [DispatchController::class, 'completeDispatch']);

    // 12. 9-Gate Milestone Tracking
    Route::apiResource('tracking', TrackingController::class);
    Route::put('/tracking/{id}/gate', [TrackingController::class, 'advanceGate']);
    Route::get('/tracking/resolve-barcode/{barcode}', [TrackingController::class, 'resolveBarcode']);

    // 13. Workforce, Employees & Piece-Rate Payroll
    Route::apiResource('employees', EmployeeController::class);
    Route::get('/payroll', [PayrollController::class, 'index']);
    Route::post('/payroll/generate', [PayrollController::class, 'generate']);
    Route::post('/payroll/{id}/approve', [PayrollController::class, 'approve']);

    // 14. Reports & Exports
    Route::get('/reports/financial', [ReportController::class, 'financial']);
    Route::get('/reports/production', [ReportController::class, 'production']);
    Route::get('/reports/qa', [ReportController::class, 'qa']);
    Route::get('/reports/inventory', [ReportController::class, 'inventory']);

    // 15. Secure File Storage & Streaming Downloads
    Route::post('/files/upload', [FileController::class, 'upload']);
    Route::get('/files/{id}/download', [FileController::class, 'download']);
});

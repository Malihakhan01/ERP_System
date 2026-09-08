<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProductionJob extends Model
{
    protected $table = 'production_jobs';

    protected $fillable = [
        'uuid',
        'job_number',
        'order_id',
        'client_id',
        'product_id',
        'order_number',
        'client_name',
        'style_code',
        'style_name',
        'planned_quantity',
        'total_cut_quantity',
        'total_stitched_quantity',
        'total_finished_quantity',
        'total_qa_passed_quantity',
        'total_packed_quantity',
        'total_rejected_quantity',
        'total_rework_quantity',
        'target_start_date',
        'target_end_date',
        'actual_start_date',
        'actual_end_date',
        'stage',
        'status',
        'priority',
        'assigned_line',
        'supervisor_id',
        'supervisor_name',
        'standard_sam',
        'size_breakdown',
        'colorways',
        'special_instructions',
        'is_archived',
    ];

    protected $casts = [
        'planned_quantity' => 'integer',
        'total_cut_quantity' => 'integer',
        'total_stitched_quantity' => 'integer',
        'total_finished_quantity' => 'integer',
        'total_qa_passed_quantity' => 'integer',
        'total_packed_quantity' => 'integer',
        'total_rejected_quantity' => 'integer',
        'total_rework_quantity' => 'integer',
        'target_start_date' => 'date',
        'target_end_date' => 'date',
        'actual_start_date' => 'date',
        'actual_end_date' => 'date',
        'standard_sam' => 'decimal:2',
        'size_breakdown' => 'array',
        'colorways' => 'array',
        'is_archived' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'supervisor_id');
    }

    public function cuttingPlans(): HasMany
    {
        return $this->hasMany(CuttingPlan::class, 'production_job_id');
    }

    public function materialIssues(): HasMany
    {
        return $this->hasMany(ProductionMaterialIssue::class, 'production_job_id');
    }

    public function bundles(): HasMany
    {
        return $this->hasMany(ProductionBundle::class, 'production_job_id');
    }

    public function operatorLogs(): HasMany
    {
        return $this->hasMany(OperatorProductionLog::class, 'production_job_id');
    }

    public function finishingOperations(): HasMany
    {
        return $this->hasMany(FinishingOperation::class, 'production_job_id');
    }

    public function qaInspections(): HasMany
    {
        return $this->hasMany(QAInspection::class, 'production_job_id');
    }

    public function packingCartons(): HasMany
    {
        return $this->hasMany(PackingCarton::class, 'production_job_id');
    }
}

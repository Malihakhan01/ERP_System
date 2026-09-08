<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class OperatorProductionLog extends Model
{
    protected $table = 'operator_production_logs';
    public $timestamps = false;

    protected $fillable = [
        'uuid',
        'production_job_id',
        'bundle_id',
        'employee_id',
        'employee_name',
        'operation_name',
        'pieces_completed',
        'pieces_rejected',
        'pieces_rework',
        'rate_per_piece',
        'total_earnings',
        'work_date',
        'shift',
        'payroll_month',
        'verified_by',
        'notes',
    ];

    protected $casts = [
        'pieces_completed' => 'integer',
        'pieces_rejected' => 'integer',
        'pieces_rework' => 'integer',
        'rate_per_piece' => 'decimal:2',
        'total_earnings' => 'decimal:2',
        'work_date' => 'date',
        'created_at' => 'datetime',
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

    public function productionJob(): BelongsTo
    {
        return $this->belongsTo(ProductionJob::class, 'production_job_id');
    }

    public function bundle(): BelongsTo
    {
        return $this->belongsTo(ProductionBundle::class, 'bundle_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}

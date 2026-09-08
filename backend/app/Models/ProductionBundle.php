<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProductionBundle extends Model
{
    protected $table = 'production_bundles';

    protected $fillable = [
        'uuid',
        'bundle_barcode',
        'production_job_id',
        'bundle_number',
        'size',
        'colorway',
        'quantity',
        'current_stage',
        'current_line',
        'assigned_employee_id',
        'assigned_employee_name',
        'assigned_operation',
        'status',
        'passed_pieces',
        'rejected_pieces',
        'rework_pieces',
    ];

    protected $casts = [
        'bundle_number' => 'integer',
        'quantity' => 'integer',
        'passed_pieces' => 'integer',
        'rejected_pieces' => 'integer',
        'rework_pieces' => 'integer',
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

    public function assignedEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'assigned_employee_id');
    }

    public function operatorLogs(): HasMany
    {
        return $this->hasMany(OperatorProductionLog::class, 'bundle_id');
    }
}

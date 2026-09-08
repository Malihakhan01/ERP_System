<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class FinishingOperation extends Model
{
    protected $table = 'finishing_operations';

    protected $fillable = [
        'uuid',
        'operation_number',
        'production_job_id',
        'operation_type',
        'received_quantity',
        'processed_quantity',
        'passed_quantity',
        'rejected_quantity',
        'rework_quantity',
        'status',
        'operator_id',
        'operator_name',
        'notes',
    ];

    protected $casts = [
        'received_quantity' => 'integer',
        'processed_quantity' => 'integer',
        'passed_quantity' => 'integer',
        'rejected_quantity' => 'integer',
        'rework_quantity' => 'integer',
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
}

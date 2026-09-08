<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class TrackingRecord extends Model
{
    protected $table = 'tracking_records';

    protected $fillable = [
        'uuid',
        'tracking_number',
        'order_id',
        'production_job_id',
        'current_gate',
        'gate_status',
        'origin_facility',
        'destination_port',
        'current_location',
        'estimated_delivery',
        'actual_delivery',
        'is_delayed',
    ];

    protected $casts = [
        'current_gate' => 'integer',
        'estimated_delivery' => 'date',
        'actual_delivery' => 'date',
        'is_delayed' => 'boolean',
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

    public function productionJob(): BelongsTo
    {
        return $this->belongsTo(ProductionJob::class, 'production_job_id');
    }

    public function timeline(): HasMany
    {
        return $this->hasMany(TrackingTimeline::class, 'tracking_record_id')->orderBy('timestamp', 'asc');
    }
}

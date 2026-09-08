<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CuttingPlan extends Model
{
    protected $table = 'cutting_plans';

    protected $fillable = [
        'uuid',
        'plan_number',
        'production_job_id',
        'marker_name',
        'marker_length_meters',
        'marker_width_cm',
        'fabric_type',
        'fabric_gsm',
        'colorway',
        'plies_count',
        'planned_lays',
        'marker_efficiency_pct',
        'status',
        'notes',
    ];

    protected $casts = [
        'marker_length_meters' => 'decimal:2',
        'marker_width_cm' => 'decimal:2',
        'plies_count' => 'integer',
        'planned_lays' => 'integer',
        'marker_efficiency_pct' => 'decimal:2',
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

    public function sizes(): HasMany
    {
        return $this->hasMany(CuttingPlanSize::class, 'cutting_plan_id');
    }
}

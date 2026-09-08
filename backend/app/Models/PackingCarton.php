<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PackingCarton extends Model
{
    protected $table = 'packing_cartons';

    protected $fillable = [
        'uuid',
        'carton_number',
        'production_job_id',
        'carton_index',
        'carton_barcode',
        'packing_type',
        'total_units_in_carton',
        'gross_weight_kg',
        'net_weight_kg',
        'length_cm',
        'width_cm',
        'height_cm',
        'status',
        'packed_by',
    ];

    protected $casts = [
        'carton_index' => 'integer',
        'total_units_in_carton' => 'integer',
        'gross_weight_kg' => 'decimal:2',
        'net_weight_kg' => 'decimal:2',
        'length_cm' => 'decimal:2',
        'width_cm' => 'decimal:2',
        'height_cm' => 'decimal:2',
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

    public function items(): HasMany
    {
        return $this->hasMany(PackingCartonItem::class, 'carton_id');
    }
}

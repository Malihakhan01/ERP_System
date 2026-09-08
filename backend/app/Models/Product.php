<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Product extends Model
{
    protected $table = 'products';

    protected $fillable = [
        'uuid',
        'style_code',
        'name',
        'category',
        'sam',
        'fabric_type',
        'gsm',
        'consumption_kg',
        'wastage_pct',
        'sizes',
        'bom_status',
        'production_status',
        'specs',
        'is_archived',
    ];

    protected $casts = [
        'sam' => 'decimal:2',
        'consumption_kg' => 'decimal:4',
        'wastage_pct' => 'decimal:2',
        'sizes' => 'array',
        'specs' => 'array',
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

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'product_id');
    }

    public function productionJobs(): HasMany
    {
        return $this->hasMany(ProductionJob::class, 'product_id');
    }

    public function costEstimates(): HasMany
    {
        return $this->hasMany(CostEstimate::class, 'product_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CostEstimate extends Model
{
    protected $table = 'cost_estimates';

    protected $fillable = [
        'uuid',
        'estimate_number',
        'order_id',
        'product_id',
        'style_code',
        'batch_quantity',
        'currency',
        'fabric_cost_total',
        'trim_cost_total',
        'process_cost_total',
        'labor_cost_total',
        'overhead_cost_total',
        'packaging_cost_total',
        'factory_cost_per_pc',
        'net_margin_pct',
        'fob_price_per_pc',
        'total_contract_value',
        'status',
        'details_json',
        'is_archived',
    ];

    protected $casts = [
        'batch_quantity' => 'integer',
        'fabric_cost_total' => 'decimal:2',
        'trim_cost_total' => 'decimal:2',
        'process_cost_total' => 'decimal:2',
        'labor_cost_total' => 'decimal:2',
        'overhead_cost_total' => 'decimal:2',
        'packaging_cost_total' => 'decimal:2',
        'factory_cost_per_pc' => 'decimal:2',
        'net_margin_pct' => 'decimal:2',
        'fob_price_per_pc' => 'decimal:2',
        'total_contract_value' => 'decimal:2',
        'details_json' => 'array',
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

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}

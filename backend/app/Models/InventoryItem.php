<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class InventoryItem extends Model
{
    protected $table = 'inventory_items';

    protected $fillable = [
        'uuid',
        'sku',
        'name',
        'category',
        'unit',
        'unit_cost',
        'total_stock',
        'available_stock',
        'allocated_stock',
        'min_reorder_level',
        'bay',
        'lot_number',
        'is_archived',
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'total_stock' => 'decimal:2',
        'available_stock' => 'decimal:2',
        'allocated_stock' => 'decimal:2',
        'min_reorder_level' => 'decimal:2',
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

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'inventory_item_id');
    }

    public function materialIssues(): HasMany
    {
        return $this->hasMany(ProductionMaterialIssue::class, 'inventory_item_id');
    }
}

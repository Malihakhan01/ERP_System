<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ProductionMaterialIssue extends Model
{
    protected $table = 'production_material_issues';
    public $timestamps = false;

    protected $fillable = [
        'uuid',
        'issue_number',
        'production_job_id',
        'inventory_item_id',
        'material_name',
        'sku',
        'lot_number',
        'category',
        'from_bay',
        'to_stage',
        'standard_bom_qty',
        'issued_quantity',
        'returned_quantity',
        'unit',
        'unit_cost',
        'total_cost',
    ];

    protected $casts = [
        'standard_bom_qty' => 'decimal:2',
        'issued_quantity' => 'decimal:2',
        'returned_quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
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

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}

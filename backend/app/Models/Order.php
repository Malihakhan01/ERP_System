<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Order extends Model
{
    protected $table = 'orders';

    protected $fillable = [
        'uuid',
        'order_number',
        'client_id',
        'product_id',
        'client_name',
        'client_country',
        'style_code',
        'style_name',
        'product_category',
        'order_date',
        'delivery_deadline',
        'order_type',
        'currency',
        'priority',
        'status',
        'production_stage',
        'payment_status',
        'fabric_details',
        'target_gsm',
        'colorway',
        'quantity',
        'unit_price',
        'subtotal',
        'discount',
        'additional_charges',
        'tax',
        'total_value',
        'payment_terms',
        'incoterms',
        'shipping_method',
        'destination_port',
        'buyer_po_ref',
        'special_instructions',
        'is_archived',
    ];

    protected $casts = [
        'order_date' => 'date',
        'delivery_deadline' => 'date',
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'additional_charges' => 'decimal:2',
        'tax' => 'decimal:2',
        'total_value' => 'decimal:2',
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

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function productionJob(): HasOne
    {
        return $this->hasOne(ProductionJob::class, 'order_id');
    }

    public function costEstimates(): HasMany
    {
        return $this->hasMany(CostEstimate::class, 'order_id');
    }

    public function dispatchNotes(): HasMany
    {
        return $this->hasMany(DispatchNote::class, 'order_id');
    }

    public function trackingRecords(): HasMany
    {
        return $this->hasMany(TrackingRecord::class, 'order_id');
    }
}

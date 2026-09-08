<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class DispatchNote extends Model
{
    protected $table = 'dispatch_notes';

    protected $fillable = [
        'uuid',
        'dispatch_number',
        'order_id',
        'carrier_name',
        'tracking_ref',
        'container_number',
        'seal_number',
        'total_cartons',
        'total_pieces',
        'gross_weight_kg',
        'shipping_method',
        'status',
        'destination_port',
        'dispatched_at',
    ];

    protected $casts = [
        'total_cartons' => 'integer',
        'total_pieces' => 'integer',
        'gross_weight_kg' => 'decimal:2',
        'dispatched_at' => 'datetime',
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
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackingCartonItem extends Model
{
    protected $table = 'packing_carton_items';
    public $timestamps = false;

    protected $fillable = [
        'carton_id',
        'size',
        'colorway',
        'quantity',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'created_at' => 'datetime',
    ];

    public function carton(): BelongsTo
    {
        return $this->belongsTo(PackingCarton::class, 'carton_id');
    }
}

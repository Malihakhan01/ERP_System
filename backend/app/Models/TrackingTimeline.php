<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrackingTimeline extends Model
{
    protected $table = 'tracking_timeline';
    public $timestamps = false;

    protected $fillable = [
        'tracking_record_id',
        'gate_number',
        'title',
        'description',
        'location',
        'actor',
        'timestamp',
    ];

    protected $casts = [
        'gate_number' => 'integer',
        'timestamp' => 'datetime',
    ];

    public function trackingRecord(): BelongsTo
    {
        return $this->belongsTo(TrackingRecord::class, 'tracking_record_id');
    }
}

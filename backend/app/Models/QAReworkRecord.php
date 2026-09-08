<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class QAReworkRecord extends Model
{
    protected $table = 'qa_rework_records';
    public $timestamps = false;

    protected $fillable = [
        'uuid',
        'rework_number',
        'qa_inspection_id',
        'production_job_id',
        'rework_quantity',
        'defect_summary',
        'assigned_line',
        'status',
        'completion_notes',
        'completed_at',
    ];

    protected $casts = [
        'rework_quantity' => 'integer',
        'completed_at' => 'datetime',
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

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(QAInspection::class, 'qa_inspection_id');
    }

    public function productionJob(): BelongsTo
    {
        return $this->belongsTo(ProductionJob::class, 'production_job_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class QAInspection extends Model
{
    protected $table = 'qa_inspections';

    protected $fillable = [
        'uuid',
        'inspection_number',
        'production_job_id',
        'bundle_id',
        'inspection_stage',
        'inspection_level',
        'aql_level',
        'lot_size',
        'sample_size',
        'passed_pieces',
        'failed_pieces',
        'rework_pieces',
        'critical_defects_found',
        'major_defects_found',
        'minor_defects_found',
        'inspection_result',
        'status',
        'inspector_name',
        'notes',
    ];

    protected $casts = [
        'lot_size' => 'integer',
        'sample_size' => 'integer',
        'passed_pieces' => 'integer',
        'failed_pieces' => 'integer',
        'rework_pieces' => 'integer',
        'critical_defects_found' => 'integer',
        'major_defects_found' => 'integer',
        'minor_defects_found' => 'integer',
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

    public function bundle(): BelongsTo
    {
        return $this->belongsTo(ProductionBundle::class, 'bundle_id');
    }

    public function defects(): HasMany
    {
        return $this->hasMany(QADefectDetail::class, 'qa_inspection_id');
    }

    public function reworkRecords(): HasMany
    {
        return $this->hasMany(QAReworkRecord::class, 'qa_inspection_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QADefectDetail extends Model
{
    protected $table = 'qa_defect_details';
    public $timestamps = false;

    protected $fillable = [
        'qa_inspection_id',
        'defect_code',
        'defect_name',
        'defect_category',
        'defect_count',
        'responsible_operation',
        'corrective_action',
    ];

    protected $casts = [
        'defect_count' => 'integer',
        'created_at' => 'datetime',
    ];

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(QAInspection::class, 'qa_inspection_id');
    }
}

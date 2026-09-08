<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CuttingPlanSize extends Model
{
    protected $table = 'cutting_plan_sizes';
    public $timestamps = false;

    protected $fillable = [
        'cutting_plan_id',
        'size',
        'ratio',
        'planned_quantity',
        'actual_cut_quantity',
    ];

    protected $casts = [
        'ratio' => 'integer',
        'planned_quantity' => 'integer',
        'actual_cut_quantity' => 'integer',
    ];

    public function cuttingPlan(): BelongsTo
    {
        return $this->belongsTo(CuttingPlan::class, 'cutting_plan_id');
    }
}

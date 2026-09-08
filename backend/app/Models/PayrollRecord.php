<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PayrollRecord extends Model
{
    protected $table = 'payroll_records';
    public $timestamps = false;

    protected $fillable = [
        'uuid',
        'payroll_number',
        'employee_id',
        'payroll_month',
        'base_salary',
        'piece_rate_earnings',
        'overtime_earnings',
        'advance_deductions',
        'tax_deductions',
        'net_payable',
        'status',
        'generated_at',
    ];

    protected $casts = [
        'base_salary' => 'decimal:2',
        'piece_rate_earnings' => 'decimal:2',
        'overtime_earnings' => 'decimal:2',
        'advance_deductions' => 'decimal:2',
        'tax_deductions' => 'decimal:2',
        'net_payable' => 'decimal:2',
        'generated_at' => 'datetime',
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

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}

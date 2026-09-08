<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Employee extends Model
{
    protected $table = 'employees';

    protected $fillable = [
        'uuid',
        'employee_number',
        'full_name',
        'father_name',
        'cnic',
        'phone',
        'email',
        'joining_date',
        'department',
        'designation',
        'employment_type',
        'status',
        'salary_type',
        'monthly_salary',
        'daily_rate',
        'piece_rate',
        'assigned_line',
        'skill_level',
        'shift',
        'is_archived',
    ];

    protected $casts = [
        'joining_date' => 'date',
        'monthly_salary' => 'decimal:2',
        'daily_rate' => 'decimal:2',
        'piece_rate' => 'decimal:2',
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

    public function productionLogs(): HasMany
    {
        return $this->hasMany(OperatorProductionLog::class, 'employee_id');
    }

    public function payrollRecords(): HasMany
    {
        return $this->hasMany(PayrollRecord::class, 'employee_id');
    }

    public function assignedBundles(): HasMany
    {
        return $this->hasMany(ProductionBundle::class, 'assigned_employee_id');
    }
}

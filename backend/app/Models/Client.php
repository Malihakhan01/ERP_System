<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Client extends Model
{
    protected $table = 'clients';

    protected $fillable = [
        'uuid',
        'display_id',
        'company_name',
        'brand_name',
        'country',
        'city',
        'contact_person',
        'email',
        'phone',
        'currency',
        'credit_limit',
        'payment_terms',
        'tax_number',
        'is_archived',
        'notes',
    ];

    protected $casts = [
        'credit_limit' => 'decimal:2',
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

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'client_id');
    }

    public function productionJobs(): HasMany
    {
        return $this->hasMany(ProductionJob::class, 'client_id');
    }
}

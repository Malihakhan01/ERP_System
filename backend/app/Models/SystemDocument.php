<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SystemDocument extends Model
{
    protected $table = 'system_documents';
    public $timestamps = false;

    protected $fillable = [
        'uuid',
        'document_type',
        'entity_type',
        'entity_id',
        'title',
        'file_name',
        'file_path',
        'file_size_bytes',
        'mime_type',
        'uploaded_by',
    ];

    protected $casts = [
        'file_size_bytes' => 'integer',
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
}

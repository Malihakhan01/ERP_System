<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateExportManifestJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;

    protected $dispatchId;

    public function __construct(int $dispatchId)
    {
        $this->dispatchId = $dispatchId;
    }

    public function handle(): void
    {
        Log::info("Generating PDF Export Manifest for Dispatch ID: {$this->dispatchId}");
        // Export document generation
    }
}

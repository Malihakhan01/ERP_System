<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;

    protected $reportType;
    protected $params;

    public function __construct(string $reportType, array $params = [])
    {
        $this->reportType = $reportType;
        $this->params = $params;
    }

    public function handle(): void
    {
        Log::info("Generating async report: {$this->reportType}", $this->params);
        // Heavy report processing logic here
    }
}

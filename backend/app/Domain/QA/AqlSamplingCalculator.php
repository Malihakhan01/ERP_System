<?php

namespace App\Domain\QA;

class AqlSamplingCalculator
{
    /**
     * Compute ANSI/ASQ Z1.4 sample size and Pass/Fail acceptance criteria.
     */
    public static function computeSamplePlan(int $lotSize, string $level = 'Level II'): array
    {
        // ISO 2859-1 / ANSI Normal Single Sampling Plan Table
        if ($lotSize <= 8) {
            $sampleSize = 2; $criticalAc = 0; $majorAc = 0; $minorAc = 0;
        } elseif ($lotSize <= 15) {
            $sampleSize = 3; $criticalAc = 0; $majorAc = 0; $minorAc = 0;
        } elseif ($lotSize <= 25) {
            $sampleSize = 5; $criticalAc = 0; $majorAc = 0; $minorAc = 0;
        } elseif ($lotSize <= 50) {
            $sampleSize = 8; $criticalAc = 0; $majorAc = 0; $minorAc = 1;
        } elseif ($lotSize <= 90) {
            $sampleSize = 13; $criticalAc = 0; $majorAc = 1; $minorAc = 1;
        } elseif ($lotSize <= 150) {
            $sampleSize = 20; $criticalAc = 0; $majorAc = 1; $minorAc = 2;
        } elseif ($lotSize <= 280) {
            $sampleSize = 32; $criticalAc = 0; $majorAc = 2; $minorAc = 3;
        } elseif ($lotSize <= 500) {
            $sampleSize = 50; $criticalAc = 0; $majorAc = 3; $minorAc = 5;
        } elseif ($lotSize <= 1200) {
            $sampleSize = 80; $criticalAc = 0; $majorAc = 5; $minorAc = 7;
        } elseif ($lotSize <= 3200) {
            $sampleSize = 125; $criticalAc = 0; $majorAc = 7; $minorAc = 10;
        } else {
            $sampleSize = 200; $criticalAc = 0; $majorAc = 10; $minorAc = 14;
        }

        return [
            'lot_size' => $lotSize,
            'inspection_level' => $level,
            'sample_size' => $sampleSize,
            'critical_aql' => 0.0,
            'critical_max_allowed' => $criticalAc,
            'major_aql' => 2.5,
            'major_max_allowed' => $majorAc,
            'minor_aql' => 4.0,
            'minor_max_allowed' => $minorAc,
        ];
    }

    /**
     * Determine inspection result based on defect counts.
     */
    public static function evaluateResult(int $criticalFound, int $majorFound, int $minorFound, array $plan): string
    {
        if ($criticalFound > $plan['critical_max_allowed']) {
            return 'failed';
        }
        if ($majorFound > $plan['major_max_allowed']) {
            return 'rework_required';
        }
        if ($minorFound > $plan['minor_max_allowed']) {
            return 'rework_required';
        }
        return 'passed';
    }
}

<?php

declare(strict_types=1);

namespace App\Support;

final class Hot
{
    public static function checksum(int $n): int
    {
        $h = 1;
        for ($i = 1; $i <= $n; $i++) {
            $h = ($h * 31 + $i) & 0x3fffffff;
        }

        return $h;
    }
}

<?php
function divide(int $a, int $b): float { return $a / $b; }
function main(): void {
    $a = (int) getenv('PROBE_A');
    $b = (int) getenv('PROBE_B');
    echo divide($a, $b) . "\n";
}

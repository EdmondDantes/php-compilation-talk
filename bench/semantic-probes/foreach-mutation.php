<?php
function main(): void {
    $items = [10, 20, 30];
    foreach ($items as $key => &$value) {
        echo $key . ':' . $value . "\n";
        if ($key === 0) unset($items[1]);
        if ($key === 2) $items[] = 40;
    }
    echo json_encode($items) . "\n";
}

<?php
$acc = $argc;
for ($i = 0; $i < 50000000; $i++) {
    $acc = ($acc * 3 + ($i & 7)) & 0x3FFFFFFF;
}
echo $acc, "\n";

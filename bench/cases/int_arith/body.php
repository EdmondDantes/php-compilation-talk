$h = 1;
$n = 100000000;
for ($i = 1; $i <= $n; $i++) {
    $h = ($h * 31 + $i) & 0x3fffffff;
}
echo $h . "\n";

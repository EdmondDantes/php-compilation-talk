$h = 1;
$n = 20000000;
for ($i = 0; $i < $n; $i++) {
    $h = ($i & 1) === 0 ? scale($h + $i) : shift($h + $i);
}
echo $h . "\n";

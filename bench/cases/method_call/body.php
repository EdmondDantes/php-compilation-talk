$scale = new Scale();
$shift = new Shift();
$h = 1;
$n = 20000000;
for ($i = 0; $i < $n; $i++) {
    $step = ($i & 1) === 0 ? $scale : $shift;
    $h = $step->apply($h + $i);
}
echo $h . "\n";

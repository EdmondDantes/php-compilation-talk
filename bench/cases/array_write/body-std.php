$a = std::vector(Type::Int, 2000);
for ($r = 0; $r < 20000; $r++) {
    for ($j = 0; $j < 2000; $j++) {
        $a[$j] = $j + $r;
    }
}
$sum = 0;
for ($j = 0; $j < 2000; $j++) {
    $sum += $a[$j];
}
echo $sum . "\n";

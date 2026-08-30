$a = std::vector(Type::Int, 2000);
for ($j = 0; $j < 2000; $j++) {
    $a[$j] = $j * 7 % 1000;
}
$sum = 0;
for ($r = 0; $r < 20000; $r++) {
    foreach ($a as $v) {
        $sum += $v;
    }
}
echo $sum . "\n";

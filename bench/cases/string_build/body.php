$h = 0;
$n = 5000000;
for ($i = 0; $i < $n; $i++) {
    $s = "key:" . $i;
    $h = ($h * 31 + strlen($s) + ord($s[4])) & 0x3fffffff;
}
echo $h . "\n";

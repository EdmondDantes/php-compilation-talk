function scale(int $h): int
{
    return ($h * 31) & 0x3fffffff;
}

function shift(int $h): int
{
    return ($h + 17) & 0x3fffffff;
}

interface Step
{
    public function apply(int $h): int;
}

final class Scale implements Step
{
    public function apply(int $h): int
    {
        return ($h * 31) & 0x3fffffff;
    }
}

final class Shift implements Step
{
    public function apply(int $h): int
    {
        return ($h + 17) & 0x3fffffff;
    }
}

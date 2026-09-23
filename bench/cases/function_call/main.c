#include <stdint.h>
#include <stdio.h>

/* The control for method_call: the same two operations as plain functions, chosen
   by the same parity test. gcc inlines both, so this is the floor of the arithmetic
   and the branch alone. */
static int64_t scale(int64_t h)
{
    return (h * 31) & 0x3fffffff;
}

static int64_t shift(int64_t h)
{
    return (h + 17) & 0x3fffffff;
}

int main(void)
{
    int64_t h = 1;
    int64_t n = 20000000;

    for (int64_t i = 0; i < n; i++) {
        h = (i & 1) == 0 ? scale(h + i) : shift(h + i);
    }

    printf("%lld\n", (long long) h);
    return 0;
}

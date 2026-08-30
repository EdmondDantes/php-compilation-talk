#include <stdint.h>
#include <stdio.h>

int main(void)
{
    int64_t h = 1;
    int64_t n = 100000000;

    for (int64_t i = 1; i <= n; i++) {
        h = (h * 31 + i) & 0x3fffffff;
    }

    printf("%lld\n", (long long) h);
    return 0;
}

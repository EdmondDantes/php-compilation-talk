#include <stdint.h>
#include <stdio.h>

/* uint64_t wraps where PHP widens to float: the C answer is the native one. */
int main(void)
{
    uint64_t h = 4611686018427387904ULL;

    for (uint64_t i = 1; i <= 3; i++) {
        h = (h * 31 + i) & 0x3fffffff;
        printf("%llu\n", (unsigned long long) h);
    }

    return 0;
}

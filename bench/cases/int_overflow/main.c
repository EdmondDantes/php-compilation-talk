#include <stdint.h>
#include <stdio.h>

/* Models the native-int answer: wraps where PHP promotes to double.
 * uint64_t, not int64_t: signed overflow is UB in C, and the wrapped
 * bit pattern is the same. */
int main(void)
{
    uint64_t h = 1;

    for (int i = 1; i <= 64; i++) {
        h = h * 2;
    }

    printf("%llu\n", (unsigned long long) h);
    return 0;
}

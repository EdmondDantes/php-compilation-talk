#include <stdint.h>
#include <stdio.h>

/* Models the native-int answer: int64 wraps where PHP promotes to double. */
int main(void)
{
    uint64_t h = 1;

    for (int i = 1; i <= 64; i++) {
        h = h * 2;
    }

    printf("%llu\n", (unsigned long long) h);
    return 0;
}

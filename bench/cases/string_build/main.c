#include <stdint.h>
#include <stdio.h>

/* One stack buffer reused every iteration: C formats the key without allocating,
   which every PHP engine has to do per string. A floor, not the same program. */
int main(void)
{
    char s[32];
    int64_t h = 0;
    int64_t n = 5000000;

    for (int64_t i = 0; i < n; i++) {
        int len = snprintf(s, sizeof s, "key:%lld", (long long) i);
        h = (h * 31 + len + (unsigned char) s[4]) & 0x3fffffff;
    }

    printf("%lld\n", (long long) h);
    return 0;
}

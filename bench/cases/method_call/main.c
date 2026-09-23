#include <stdint.h>
#include <stdio.h>

/* The interface call as C spells it: a table of function pointers indexed at run
   time. gcc may still see both targets and turn the call into a branch, so this is
   a floor for dispatch, not a model of a vtable. */
typedef int64_t (*step_fn)(int64_t);

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
    step_fn steps[2] = {scale, shift};
    int64_t h = 1;
    int64_t n = 20000000;

    for (int64_t i = 0; i < n; i++) {
        h = steps[i & 1](h + i);
    }

    printf("%lld\n", (long long) h);
    return 0;
}

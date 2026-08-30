#include <stdint.h>
#include <stdio.h>

#define SIZE 2000
#define REPS 20000

/* Identical to array_foreach/main.c on purpose: C has no foreach, so the two
   PHP cases share one baseline. Change both or neither. */

int main(void)
{
    static int64_t a[SIZE];
    int64_t sum = 0;

    for (int64_t j = 0; j < SIZE; j++) {
        a[j] = j * 7 % 1000;
    }

    for (int64_t r = 0; r < REPS; r++) {
        for (int64_t j = 0; j < SIZE; j++) {
            sum += a[j];
        }
    }

    printf("%lld\n", (long long) sum);
    return 0;
}

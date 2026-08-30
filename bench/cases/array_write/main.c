#include <stdint.h>
#include <stdio.h>

#define SIZE 2000
#define REPS 20000

int main(void)
{
    static int64_t a[SIZE];
    int64_t sum = 0;

    for (int64_t r = 0; r < REPS; r++) {
        for (int64_t j = 0; j < SIZE; j++) {
            a[j] = j + r;
        }
    }

    for (int64_t j = 0; j < SIZE; j++) {
        sum += a[j];
    }

    printf("%lld\n", (long long) sum);
    return 0;
}

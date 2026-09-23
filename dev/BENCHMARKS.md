# BENCHMARKS

Our own measurements. Other people's numbers stay in
`dev/research/php-compilers.md` and are quoted as theirs.

Method, cases and how to reproduce: `bench/README.md`. Raw output:
`bench/results/`, one file per run.

---

## 2026-09-23 — the same loops a month later, new cases, Manticore

**Machine.** The same i7-11700K and WSL2 kernel as on 2026-08-30, now with
23 GB of RAM instead of 8. The machine was not idle on its own: other WSL
distributions share the kernel and were compiling at up to 90 % of all
threads for much of the day, invisibly to `ps`. `run.py` now reads
`/proc/stat` around every sample and stores the busy share with it (`runs`),
and it runs the engines in turns, one sample each per round, so that a burst of
outside load lands on several columns at once instead of on one column's whole
row. Every run filed below started and ended below 10 % busy.

**Builds.** Two toolchain generations side by side (`bench/env-2026-08.sh`,
`bench/env-2026-09.sh`), each results file naming its commits in `toolchain`:

- August: TypePHP 0.6.7 `b906bfce`, elephc 0.26.5 `20fa89093`, PHP 8.4.22.
- September: TypePHP 0.9.2 `43e85b88` with PHPX 2.9.1, elephc 0.27.0
  `8d19942c2`, Manticore 0.11.0 (release tarball, SHA-256 checked, clang 18.1.3),
  PHP 8.4.22 and PHP 8.5.10 (Ubuntu PPA package, unpacked, OPcache built in).
  gcc 13.3 `-O2` for C and for TypePHP's C++.

PHPX 2.9.1 has to be configured from a path without the word "bench" in it:
its CMakeLists drops every mpdecimal source whose path matches `bench`, so a
build under `~/.cache/php-compilation-talk-bench` links a `libphpx.so` with 36
undefined `mpd_*` symbols. We built it through a symlink, `~/.cache/phpx-2026-09`.

**TypePHP columns keep their meaning, not their spelling.** 0.8.0 made native
scalars the default and removed `use native_types`. `typephp` is now compiled
under `use varint_types` (PHP ints, widening to float) and `typephp-native`
with no directive. The overflow probe confirms the mapping.

### The machine alone: August builds, today

`results/2026-09-23-toolchain-2026-08.json`, same binaries as 2026-08-30, the
engines still run one after another (the turn-taking runner came later that day):

| case | php-interp | php-opcache | php-jit | typephp | typephp-native | typephp-std | elephc | c-gcc-O2 |
|---|---|---|---|---|---|---|---|---|
| int_arith | 592.4 | 539.5 | 428.7 * | 3537.1 | 80.5 | — | 4512.0 | 81.8 |
| array_foreach | 215.3 | 214.2 | 73.5 * | 421.8 | 353.0 | 12.5 | 744.3 | 7.5 |
| array_index | 255.5 | 254.4 | 61.4 * | 939.7 | 179.3 | 17.6 | 1861.8 | 7.4 |
| array_write | 268.1 | 267.3 | 141.7 * | 1269.0 | 272.1 | 17.3 | 741.3 | 5.5 |

Every cell is faster than on 2026-08-30, by 6 to 17 %: C by 8 % on
`int_arith` and 6 % on `array_foreach`, TypePHP with PHP ints by 17 % on
`array_foreach`. On `int_arith` the ratios held — TypePHP 8.3× the JIT's median
against 8.2×, elephc 10.5× against 10.7× — but the container ratios drifted on
unchanged binaries: 28.2×, 10.2× and 15.7× against August's 29.6×, 11.2× and
16.4×. Those same-day numbers, not August's, are the baseline for what the new
builds changed. The JIT split on all four loops, 77–87 % of processes fast.

### Current builds

`results/2026-09-23b-toolchain-2026-09.json`, milliseconds, engines in turns.
A first run of the same builds with the engines one after another
(`2026-09-23-toolchain-2026-09.json`) is kept but not tabled: load bursts during
it split three rows that have no JIT, and the whole PHP 8.5 block of
`array_index` ran slow.

| case | php-interp | php-opcache | php-jit | php85-interp | php85-opcache | php85-jit | typephp | typephp-native | typephp-std | elephc | manticore | c-gcc-O2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| int_arith | 594.6 | 542.5 | 415.7 | 608.7 * | 541.5 | 411.6 | 962.8 | 82.5 | — | **245.6** | 22.2 | 81.9 |
| array_foreach | 213.7 | 214.8 | 70.1 | 198.0 | 198.5 | 70.3 | 249.0 | 217.5 | 12.1 | 641.4 | 12.6 | 7.4 |
| array_index | 253.1 | 253.1 | 57.3 | 252.3 | 254.1 | 58.3 | 148.3 | 123.7 | 14.1 | 1933.3 | 25.2 | 7.3 |
| array_write | 267.3 | 267.2 | 138.0 | 266.9 | 266.8 | 137.5 | 461.4 | 282.5 | 16.6 | 731.9 | 124.9 | 5.7 |
| function_call | 367.1 | 296.1 | 106.9 | 354.8 | 297.2 | 102.1 | 325.6 | 14.6 | — | 420.0 | 9.2 | 14.2 |
| method_call | 541.4 | 512.0 | 276.4 | 533.1 | 507.5 | 270.3 | 1465.3 | 1184.2 | — | 4790.4 | 50.8 | 22.7 |
| string_build | 199.6 | 196.7 | 145.1 | 209.3 | 215.2 | 145.5 | 552.9 | 305.4 | — | 166.4 | 73.5 | 147.4 |

`php85-interp` on `int_arith` split, 3 of 31 runs at 1.04–1.10 s, with no load
recorded on them; unexplained. Nothing else split — including every JIT row,
which is the next finding.

**The JIT's slow state did not appear in this run.** 31 processes in each of
the 14 JIT rows of the seven timed cases, 434 in all, one group each. The state is real and still happens:
80 fresh processes of `array_foreach` run back to back later the same hour gave
5 at 0.23–0.26 s, interpreter speed, against 0.08 s for the rest; the machine
was 0.13–0.15 busy during those five and 0.09 over all. Its frequency is not a
property of the engine alone: 6–26 % of processes in every run where the same
binary ran back to back (August, and both earlier runs today), 0 of 434 in the
turn-taking run, 6 % an hour later. The cause remains unknown. What the deck
can say is that a PHP process sometimes runs without its trace, not how often.

**elephc now beats the JIT on this loop, with PHP's answer on overflow.**
`int_arith` went from 4512 ms to 245.6 ms on the same machine, 18×, and is 1.7×
faster than the JIT (415.7). `elephc --emit-ir` on 0.27.0 shows one
`ichecked_numeric_chain_to_int v6 v7 v9 [mul,add]` per iteration and no
allocation, where 0.26.5 boxed the product twice; this is PR #817, written for
this loop. Because `int_arith` masks `$h` to 30 bits its check never fires, so a
new probe, `int_overflow_chain`, starts `$h` at 2^62 and runs the same
statement three times. PHP 8.4 and 8.5, TypePHP under `use varint_types` and
elephc 0.27.0 all print `0 2 65`; TypePHP native, Manticore and C print
`1 33 1026`. So the fused path keeps PHP's arithmetic. The older defect is
separate and still there: `int_overflow`, where an already-float `$h` is
doubled again, prints `-1.844674407371E+19` on 0.27.0. The speed-up is also
specific: elephc's array loops did not improve (`array_index` 1861.8 → 1933.3).

**TypePHP with PHP ints narrowed the gap and did not close it.** 3537 → 962.8
ms, 2.3× the JIT. Its native column is level with gcc's C (82.5 against 81.9),
so the price of PHP's widening in TypePHP is 11.7×, not the 44× of August.

**Replacing the container still buys more than compiling.** Against the
natively typed TypePHP program with a PHP array, `std::vector` gives 18.0× on
`foreach` (217.5 → 12.1), 8.8× on indexed reads, 17.0× on indexed writes. The
same-day August baseline was 28.2×, 10.2×, 15.7×: `foreach` and reads shrank
because TypePHP's PHP-array paths got faster (353 → 218, 179 → 124 ms); writes
did not change.

**Interface dispatch is where TypePHP and elephc lose, and calls are not.**
`method_call` alternates two `final` implementations of one interface, 2·10^7
calls; its control, `function_call`, does the same arithmetic through two
plain functions chosen by the same parity test.

| | function_call | method_call | difference per call |
|---|---|---|---|
| PHP 8.4 JIT | 106.9 | 276.4 | 8.5 ns |
| TypePHP native | 14.6 | 1184.2 | 58 ns |
| elephc | 420.0 | 4790.4 | 219 ns |
| Manticore | 9.2 | 50.8 | 2.1 ns |
| C (gcc) | 14.2 | 22.7 | 0.4 ns |

TypePHP compiles the function version to C speed and then spends 58 ns on
every interface call — it keeps objects in Zend. elephc pays 21 ns per plain
call and 219 ns per method. C's `method_call` is a real indirect call through a
pointer table (`call *%rdx` in the disassembly); the function version is
inlined. Whether the JIT inlines `apply` was not checked.

**Short strings: the JIT and elephc tie, Manticore is 2× faster.**
`string_build` computes `"key:" . $i` 5·10^6 times and reads its length and one
byte: JIT 145 ms, elephc 166, Manticore 73.5, TypePHP 305 native and 553 with
PHP ints. C's 147 ms is `snprintf`, a general formatter, and is no floor for
this case.

**Manticore reaches clang, and "level with C" depends on the C compiler.**
Manticore's 22.2 ms on `int_arith` is 3.7× under gcc's C. Its binary runs five
iterations per pass: LLVM multiplies by 31^5 (`imul $0x1b4d89f`) and adds a
precomputed constant, which is valid because its ints wrap and the mask works
modulo 2^30. The same `main.c` built with `clang -O2` does it too and runs in
23.2 ms; gcc's build takes 85.8 ms. Every "level with C" in this file means
gcc -O2. Manticore is the fastest compiled column on most rows but not on
arrays: `array_write` 124.9 ms, 22× C.

**PHP 8.5 changes nothing measurable here.** Every 8.5 column is within 10 % of
its 8.4 twin, in both directions, apart from the unexplained interpreter split.

### Manticore's own `loop` benchmark, measured our way

Manticore's README reports its `loop` case (`bench/cases/loop.php`,
`$acc = ($acc*3 + ($i&7)) & 0x3FFFFFFF`, 5·10^7 iterations) at 0.06 s against
PHP 8.5's 1.37 s, 22.8×, on an Apple M1 Pro. Its `bench/run.sh` times whole
processes, best of N, and runs `php` with no flags, so OPcache and the JIT are
off. The same file here, whole process, startup included, their way:
Manticore 24 ms (min of 7); PHP 8.5.10 without OPcache 363 ms (31 runs);
with OPcache and the JIT off, as php-fpm runs by default,
320 ms; with the tracing JIT 130 ms. On this machine that is 15.3×, 13.5× and 5.5×, from the unrounded minimums.
The README's 22.8× comes from an M1 Pro and a PHP that took 1.37 s, 3.8× our
interpreter's time; it was not reproduced, and the table never names the PHP
configuration. Script `bench/manticore-loop/measure.py`, raw samples
`results/2026-09-23-manticore-loop.json`.

### What the slides say, checked

| slide in player/deck/04-next.html | claim | status |
|---|---|---|
| Как мы замеряли | eight engines, PHP 8.4.22, TypePHP 0.6.7, elephc 0.26.5; "ничего постороннего" | dated; the machine is no longer idle by itself, runs now record load |
| Четыре реализации переполнения | TypePHP "Zend или явный int64_t"; elephc keeps PHP semantics for +, −, × | TypePHP: int64 by default, PHP ints under `use varint_types`. elephc: holds for the fused chain, fails when a float result is multiplied again |
| Целочисленный цикл, title and note | "Ускоряет не компиляция"; compiling alone buys nothing | **refuted for elephc 0.27.0**: 245.6 ms against the JIT's 415.7 with PHP's overflow answer |
| Целочисленный цикл | JIT 485, TypePHP PHP semantics 3996 (6–8×), elephc 5202 (8–11×), native 90, C 89, JIT slow 683, opcache 587 | **changed**: 415.7; 962.8 (2.3×); 245.6 (0.6×); 82.5; 81.9; no slow runs; 542.5 |
| Одно слово в объявлении | the arithmetic change buys 44× | **changed**: 11.7×, and the native form is now the default |
| Массивы | container swap 29.6×, 11.2×, 16.4×; 417→14, 209→19, 308→19 ms | **changed**: 18.0×, 8.8×, 17.0×; 217.5→12.1, 123.7→14.1, 282.5→16.6 ms |
| У JIT два режима | 74–90 % of processes fast; slow runs worse than no JIT on reads and ints | state holds, frequency does not: 0 % to 26 % by run; slow reads now level with opcache |
| Почему elephc медленнее | two heap boxes per iteration | **0.26.5 only** |
| Цена реализации elephc | 925 instructions/iteration, 83.5 % servicing the number; TypePHP PHP semantics 491 | **0.26.5 and 0.6.7 only**, not re-profiled |
| Одна программа — три ответа | TypePHP `native_types` prints 0; elephc −1.84e19 | holds; TypePHP prints 0 with no directive now |

---

## 2026-08-30 — PHP 8.4 against TypePHP and elephc, four loops

**Machine.** Intel Core i7-11700K, 16 threads, 8 GB, Linux
6.6.114.1-microsoft-standard-WSL2. Idle except for the run.

**Builds.** PHP 8.4.22 NTS release, package build, opcache included.
TypePHP 0.6.7 (`b906bfc`) on a private PHP 8.4.22 built with
`--enable-embed=shared`, PHPX built Release, generated C++ through g++ 13.3
at `-O2`. elephc 0.26.5 (`20fa890`) built from source with
`cargo build --release`; its generated code carries `--ir-opt=on`, which is
the default and the only optimization switch it has — with `--ir-opt=off` the
int loop takes 7.06 s instead of 4.79 s, so the measured column is the
optimized one. C baseline: `gcc -O2`. Talk repo at `713abd0` plus this file.

**Reading.** Startup is subtracted from every sample first, then the shape of
the samples decides what is reported: a minimum where there is one group of
times, and where there are two, the **median of all runs** — which stands
whether or not the split is the right description of them. The tracing JIT
splits on all four loops; its column carries `*` and the two groups are given
below it. Every sample is kept in `bench/results/2026-08-30.json` as `samples_s`. The PHP
columns ran 31 times, the compiled ones 7.

| case | php-interp | php-opcache | php-jit | typephp | typephp-native | typephp-std | elephc | c-gcc-O2 |
|---|---|---|---|---|---|---|---|---|
| int_arith | 651.8 | 587.0 | 484.9 * | 3995.7 | **90.4** | — | 5202.2 | 88.9 |
| array_foreach | 239.4 | 240.6 | 82.4 * | 509.9 | 417.4 | **14.1** | 856.2 | 8.0 |
| array_index | 287.4 | 287.0 | 71.5 * | 1098.7 | 208.7 | **18.7** | 2116.9 | 8.1 |
| array_write | 298.2 | 298.1 | 162.6 * | 1420.8 | 307.9 | **18.7** | 815.8 | 6.2 |

Milliseconds. `int_arith` is 10^8 iterations of a loop-carried
`$h = ($h * 31 + $i) & 0x3fffffff`; the array cases are 2000 elements traversed
20 000 times.

`*` — the JIT's 31 runs fall in two groups:

| case | lower group | share | upper group |
|---|---|---|---|
| int_arith | 462–531 | 90 % | 681–691 |
| array_foreach | 76–100 | 74 % | 236–254 |
| array_index | 63–122 | 84 % | 302–372 |
| array_write | 149–196 | 84 % | 296–329 |

The lower group is not a point either — on `array_index` it spans a factor of
1.94 — so "two modes" is a simplification of the data, and the tabled median
is deliberately a figure that does not depend on the split being real.

### What the numbers say

**Compiling PHP as PHP loses to the JIT.** Fed source that keeps full PHP
semantics, TypePHP runs the int loop 6–8× and elephc 8–11× slower than PHP 8.4
with its tracing JIT. The ranges are the JIT's own spread, not our uncertainty:
the multiple is 8.2× and 10.7× against the median, 5.8× and 7.6× against the
JIT's slowest runs. Compiling, by itself, buys nothing here.

**What buys the 44× is a different arithmetic, not an annotation.** `use
native_types` takes TypePHP's int loop from 3995.7 ms to 90.4 ms, level with
the C baseline's 88.9 ms and 5–8× faster than the JIT. The directive does not
annotate the program — it changes what the program computes: `$h` becomes an
`int64_t` that wraps, where PHP's int promotes to float on overflow. The
overflow probe below is the same change seen from the other side, and TypePHP
files it as an intentional rule rather than as an optimization.

The distinction matters because the alternative reading fails its own test.
Annotating elephc's source (`function work(int $n): int`) changes nothing —
4.49 s either way. Typing as such bought zero; abandoning PHP's overflow
semantics bought 44×.

**Replacing the container buys more than either.** Held against the same
compiled, natively typed program, `std::vector` instead of a PHP array takes
`array_foreach` from 417.4 ms to 14.1 ms — 29.6×, one change at a time;
`array_write` 16.4× and `array_index` 11.2×. Comparing against the JIT instead
mixes three changes and is the wrong number to quote for the container alone.

This is the same experiment the TypePHP authors publish as 10.6×, but it is
not a reproduction of it: our ratio is three times theirs, and their baseline
and machine are not ours. Same shape of result, different measurement.

**C is not a fair floor for the array cases.** gcc auto-vectorizes the sum —
8.0 ms for 4·10^7 additions is well under a cycle per element — and
`std::vector<int64_t>` vectorizes too, which is why 14.1 ms is within reach of
it. Zend does not vectorize a packed array; whether it could is not something
this measurement answers.

### The JIT decides once per process

The two groups above are not noise between runs, they are two states of a
process, and the state is settled once and never revisited. Measured directly:
a script that times the same loop three times in a row inside one process, run
25 times. Twenty-three processes gave three fast timings each, around 47 ms;
two gave three slow timings each, around 300 ms. No process changed its mind
between repetitions, and none of the slow ones recovered.

That also sharpens what the slow state is. Within one process the ratio is 6×,
far more than the 1.4× seen between processes on the whole-program timing,
because the whole-program figure includes the part before any trace exists. The
slow state looks like the trace never being used at all.

The tabled figure is the median of all runs because the median needs no view on
any of this. Both multiples are given where the difference could matter to a
claim, and only one claim is close enough to the line to be reversed by it: on
`int_arith` and `array_index` the JIT's slow runs are worse than running with
no JIT at all — 683 against opcache's 587, and 338 against 287.

**It has already cost one published claim.** A first run of the suite on
2026-08-30 took seven repeats of `array_foreach` that all landed slow, and the
table said the JIT gives nothing on `foreach` and nothing on indexed reads. It
does, in three runs out of four. The claim was retracted the same day. The
runner now keeps every sample, splits the groups itself, exits non-zero when it
finds two, and — after a second review — no longer picks which figure
represents such a row. That choice belongs to whoever writes the claim; burying
it in `measure()` is exactly the mistake that produced the retraction.

What is established about the cause: it is not machine load. Under eight busy
cores every one of 15 runs was fast, and a deliberate attempt to provoke it
with 14 parallel `g++ -O2` compiles produced 28 fast runs before, during and
after. It is not memory pressure: under 3 GB of pressure the JIT stayed on with
a full buffer, at 0.48–0.55 s. What is not established: anything else.
Disabling ASLR and pinning `opcache.mmap_base` each produced 15 fast runs, but
the unchanged control stopped producing the slow state during the same test, so
that comparison shows nothing. Nor could the slow state be caught under `perf`
in 45 attempts, so its counters are unmeasured.

For the talk this is a result rather than a nuisance: the deck already quotes
TypePHP's own comparison table, whose row "Deterministic performance" reads
*No* for a JIT. Here that row is measured.

### Why elephc is slow here, from its own IR

`elephc --emit-ir` on the int loop shows two heap allocations and two
refcount releases per iteration:

```
v7:  Heap(Mixed) = ichecked_mul v5 v6              ; alloc_heap
v9:  Heap(Mixed) = mixed_numeric_binop v7 v8 add   ; may_deopt
release v7
v11: I64 = cast v9 I64
release v9
```

`$h * 31` may overflow into a float, so the product is boxed. The loop
counter, whose range is known, stays unboxed (`ichecked_add_to_int`), which
shows the unboxed path exists and is not reached here. Annotating the source
does not reach it either, and neither does `--strict-locals`.

The semantics require a check; they do not require an allocation. PHP's JIT
obeys the same rule by calling its own specialized opcode handler, which writes
a zval into a stack slot — see `dev/research/hot-loop-anatomy.md`, where both
sides are read off the machine code. In this particular loop `$h` is masked to
30 bits every iteration, so the product is statically bounded below 2^35 and a
range analysis would remove the box altogether. elephc's own tracker files the
general case as issue #623.

### Overflow: one program, three answers

Not a timing case; `bench/cases/int_overflow/divergence.md` marks it so the
runner does not report the disagreement as a fault. Seven lines, `$h = 1;`
then 64 doublings:

| | result |
|---|---|
| PHP 8.4 | `1.844674407371E+19` |
| TypePHP, no directive | `1.844674407371E+19` |
| TypePHP `use native_types` | `0` |
| elephc | `-1.844674407371E+19` |
| C, `uint64_t` | `0` |

The first three are documented. TypePHP's
`docs/en/PHP_INCOMPATIBILITY_CLASSIFICATION.md` lists a row reading "Native
`std::int` overflow and integer division behavior | Intentional Rule |
Native numeric types trade PHP compatibility for performance and C++
storage." The divergence and its price are stated by the project itself.

elephc's is a defect against a published promise. Its documentation site
says of `+`, `-` and `*`: "Integer overflow promotes to `double`"
(<https://elephc.dev/docs/php/operators/>, same text as the repository's
`docs/php/operators.md`). It does promote — with the wrong sign. Minimal
reproduction:

```php
<?php
$h = 4611686018427387904;
$i = 0;
while ($i < 2) {
    $h = $h * 2;
    echo $h . "\n";
    $i += 1;
}
```

PHP prints `9.2233720368548E+18` then `1.844674407371E+19`; elephc 0.26.5 on
linux-x86_64 prints the second one negative. Not reported upstream: Edmond
decided on 2026-08-30 not to file it.

The mechanism is inferred, not measured here. elephc's open issue #548
documents, for relational operators, that a float-carrying Mixed box is
coerced through `__rt_mixed_cast_int` and that `cvttsd2si` on x86-64 returns
`INT64_MIN` for an out-of-range value. The arithmetic of our case fits that
story exactly — 2^62 · 2 gives the double 9.22e18, a cast of which yields
`INT64_MIN`, whose doubling overflows to −1.84e19 — but we did not dump the
IR or the assembly of this case to confirm that `*` takes the same path.

Two things the project's own site adds. It publishes no performance figures
at all — neither the home page, the pipeline description nor the feature
list quotes a number against PHP or against C. And its compatibility page
measures compatibility as builtin coverage — "Overall builtin coverage:
473 / 2030 (23%)" against PHP 8.4.20 — and lists four limitations, none of
them about numeric behaviour. Divergence in arithmetic is not a category the
page has.

### What this does not measure

Four loops are not an application: no strings, no objects, no method calls,
no exceptions, no request lifecycle, no framework. The arrays hold 2000
`int`s — about 32 KB, resident in L1/L2 — with integer keys and no misses,
so "the container decides" is established for a packed numeric array and for
nothing else. Two compilers, both pre-1.0, are also not a family: the
sentence about what this kind of project buys leans on VK's KPHP material,
and KPHP is not in the table.

The `FE_FETCH_R` reading on the deck's earlier slide comes from the
`ext/mlir` work, not from this run. What this run shows is only a time.

### Negative results

- Typing elephc's source (`function work(int $n): int`) does not speed it
  up: 4.49 s typed, 4.49 s untyped. `--strict-locals` likewise.
- Disabling ASLR and pinning `opcache.mmap_base` as candidate causes of the
  JIT's bimodality: inconclusive, control stopped reproducing.
- The first run of the suite, 7 repeats, produced a wrong `php-jit` row on
  all three array cases. Kept here because the failure mode — a minimum over
  too few repeats of a bimodal distribution, agreeing with the story we
  already believed — is the one worth remembering.
- `measure()` originally returned a minimum and a median and discarded the
  samples. That is the root of the whole episode: by the time a number reached
  a file, the evidence for the one precondition the minimum needs was gone.
  Samples are now kept, and `run.py --from-json` re-summarizes them, so a
  correction to the rule costs no machine time.
- The first mode detector split on a fixed ratio of 1.5 between neighbouring
  samples. It caught the array cases, which separate by 3×, and missed
  `int_arith`, which separates by 1.28×. Replaced by a test against the
  distribution's own spread — the widest step must dwarf the typical one —
  which then had to be given a floor of two samples per group, because a
  single descheduled process was being reported as a mode.
- Provoking the slow state on demand: 14 parallel `g++ -O2` compiles, before,
  during and after, gave 28 fast runs. 3 GB of memory pressure gave 8 fast
  runs. Neither reproduces it.

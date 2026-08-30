# BENCHMARKS

Our own measurements. Other people's numbers stay in
`dev/research/php-compilers.md` and are quoted as theirs.

Method, cases and how to reproduce: `bench/README.md`. Raw output:
`bench/results.json`.

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
below it. Every sample is kept in `bench/results.json` as `samples_s`. The PHP
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

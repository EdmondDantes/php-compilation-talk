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

**Reading.** Minimum of 11 runs, process startup of the same engine
subtracted. Every engine printed the same checksum except in `int_overflow`,
where disagreement is the result; `run.py` now checks that and warns when an
engine's median stands more than 10 % above its minimum.

| case | php-interp | php-opcache | php-jit | typephp | typephp-native | typephp-std | elephc | c-gcc-O2 |
|---|---|---|---|---|---|---|---|---|
| int_arith | 625.6 | 575.5 | 438.5 | 3755.3 | **85.3** | — | 4809.1 | 86.4 |
| array_foreach | 229.4 | 231.1 | 74.9 | 462.6 | 386.9 | **12.8** | 794.9 | 7.9 |
| array_index | 273.0 | 274.0 | 60.4 | 1007.9 | 193.1 | **18.0** | 1996.0 | 7.9 |
| array_write | 287.6 | 293.9 | 148.5 | 1355.2 | 291.7 | **17.6** | 790.5 | 6.1 |

Milliseconds. `int_arith` is 10^8 iterations of a loop-carried
`$h = ($h * 31 + $i) & 0x3fffffff`; the array cases are 2000 elements
traversed 20 000 times. The `php-jit` figure for `array_write` is the fast
half of a bimodal distribution — see "The JIT's array result is bimodal".

### What the numbers say

**Compiling PHP as PHP loses to the JIT.** Both compilers, fed source that
keeps full PHP semantics, run the int loop 8.6× and 11× slower than PHP 8.4
with its tracing JIT: TypePHP 3755 ms and elephc 4809 ms against 438 ms.
Compiling, by itself, buys nothing here.

**What buys the 44× is a different arithmetic, not an annotation.** `use
native_types` takes TypePHP's int loop from 3755 ms to 85.3 ms, level with
the C baseline's 86.4 ms. The directive does not annotate the program — it
changes what the program computes: `$h` becomes an `int64_t` that wraps,
where PHP's int promotes to float on overflow. The overflow probe below is
the same change seen from the other side, and TypePHP files it as an
intentional rule rather than as an optimization.

The distinction matters because the alternative reading fails its own test.
Annotating elephc's source (`function work(int $n): int`) changes nothing —
4.49 s either way. Typing as such bought zero; abandoning PHP's overflow
semantics bought 44×.

**Replacing the container buys more than either.** Held against the same
compiled, natively typed program, `std::vector` instead of a PHP array takes
`array_foreach` from 386.9 ms to 12.8 ms — 30×, one change at a time. The
comparison against the JIT (74.9 → 12.8, 5.9×) mixes three changes and is
the wrong number to quote for the container alone.

This is the same experiment the TypePHP authors publish as 10.6×, but it is
not a reproduction of it: our ratio is three times theirs, and their baseline
and machine are not ours. Same shape of result, different measurement.

**C is not a fair floor for the array cases.** gcc auto-vectorizes the sum —
7.9 ms for 4·10^7 additions is well under a cycle per element — and
`std::vector<int64_t>` vectorizes too, which is why 12.8 ms is within reach
of it. Zend does not vectorize a packed array; whether it could is not
something this measurement answers.

### The JIT's array result is bimodal

On the array cases the tracing JIT lands in one of two modes per process,
and the mode holds for that process's whole run. On `array_foreach`, 31
fresh processes on an idle machine gave 24 runs at 80 ms and 7 at 240 ms —
the second mode being exactly the no-JIT time.

This cost us a wrong published claim. A first run of the suite on
2026-08-30 took seven repeats of `array_foreach` that all landed slow, and
the table said the JIT gives nothing on `foreach` and nothing on indexed
reads. It does: 231 → 75 and 274 → 60. The claim was retracted the same day.
The lesson is the one review.md rule 16.2 already states and this run
ignored: a minimum is only an estimator when the distribution has one mode,
and the median was in `results.json` saying otherwise.

What is established about the cause: it is not machine load. Under eight
busy cores every one of 15 runs was fast. What is not established: anything
else. Disabling ASLR and pinning `opcache.mmap_base` both produced 15 fast
runs, but the unchanged control stopped producing the slow mode during the
same test, so that comparison shows nothing. `array_write` still carries the
split at the time of writing — min 156.7 ms against median 298.8 ms.

For the talk this is a result rather than a nuisance: the deck already
quotes TypePHP's own comparison table, whose row "Deterministic performance"
reads *No* for a JIT. Here that row is measured.

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
obeys the same rule and pays a branch on a value in a register. In this
particular loop `$h` is masked to 30 bits every iteration, so the product is
statically bounded below 2^35 and a range analysis would remove the box
altogether. elephc's own tracker files the general case as issue #623.

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

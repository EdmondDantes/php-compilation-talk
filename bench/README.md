# bench

Our own measurement of PHP against two AOT compilers, on one machine, for the
talk's performance part. Results are filed in `dev/BENCHMARKS.md`; this file
says how to reproduce them and what the numbers do and do not cover.

## What is measured

Four timed workloads and one semantics probe, each a handful of lines:

| case | what it stresses |
|---|---|
| `int_arith` | int arithmetic in a loop-carried chain; no arrays, no allocation |
| `array_foreach` | `foreach` over a packed int array of 2000, 20 000 times |
| `array_index` | the same traffic through `$a[$j]` instead of `foreach` |
| `array_write` | indexed writes into a preallocated array |
| `int_overflow` | not timed: what each engine answers when an int overflows |

The bodies avoid closed forms on purpose. `int_arith` carries a dependency
through every iteration (`$h = ($h * 31 + $i) & 0x3fffffff`), so no compiler can
fold the loop into a constant and report a time that measures nothing.

## Engines

| column | what it is |
|---|---|
| `php-interp` | PHP 8.4.22 NTS, `-n`: no opcache at all |
| `php-opcache` | the same with opcache, JIT off |
| `php-jit` | the same with the tracing JIT |
| `typephp` | TypePHP AOT, PHP semantics kept — no `use native_types` |
| `typephp-native` | TypePHP with `use native_types`: int becomes `int64_t` |
| `typephp-std` | `use native_types` **and** `std::vector` instead of a PHP array |
| `elephc` | elephc, no Zend runtime |
| `c-gcc-O2` | the same loop written in C, as the floor |

The three TypePHP columns exist because a single "compiled" number hides which
of three separate changes bought the time: compiling the code, typing the
scalars, or replacing the container. `typephp-std` measures a rewritten source
and carries its own `body-std.php`; the other columns all run the same
`body.php`.

## Reporting

Process startup is measured separately, with an empty program of the same
engine, and subtracted from every sample before anything else is computed — a
native binary starts in a millisecond and a PHP process does not, and that gap
says nothing about a loop. Every sample survives into the results file as
`samples_s`, and the file's `toolchain` block names the machine, the PHP
binaries, and the version and commit of each compiler it measured.

What is reported then depends on the shape of the samples, and the runner
decides, not the reader:

- **One group** — the minimum. Noise on an idle machine only adds time, so the
  minimum is the closest thing to the loop's own cost.
- **Two groups** — each group's median and spread, the share of runs in each,
  and the median of everything. No single figure is picked: a split row carries
  no `loop_s` at all, because which number represents it is a decision for
  whoever writes the claim, not for the summary.

A run is called split when the widest step between adjacent sorted samples
dwarfs the typical step by a factor of eight — a tail rises gradually, a second
state does not — and when that step is at least 15 % and 5 ms, and each group
holds at least two samples and 5 % of the runs. Fewer than eight samples are
never split. A split row makes `run.py` exit non-zero: it is a result that
needs reading, not a warning to scroll past.

This is not a precaution in the abstract. PHP's tracing JIT settles into one of
two states per process on these loops, a minimum over seven repeats of it put a
wrong claim into the deck, and `dev/BENCHMARKS.md` records what that cost. The
PHP columns therefore run 31 times regardless of `--repeats`; two states cannot
be told apart from a handful of samples.

`run.py --from-json results/2026-08-30.json` re-summarizes stored samples under the current
rules without measuring again. That is what keeping them buys: the split test
here has already been corrected twice, and neither correction cost machine time.

Output is compared across engines rather than against a stored expectation.
Where engines disagree, the disagreement is the result; see `int_overflow`.

## Running it

The toolchains are not distribution packages. An env profile points at a private
PHP built with `--enable-embed=shared` (TypePHP needs the Embed SAPI, which the
Ubuntu packages omit), at a TypePHP checkout with `vendor/` installed and PHPX
built, and at an elephc binary. There is one profile per toolchain generation,
and the builds of each live side by side, so an old result can be rerun on
today's machine:

| profile | TypePHP | elephc | PHP |
|---|---|---|---|
| `env-2026-08.sh` | 0.6.7 | 0.26.5 | 8.4.22 |
| `env-2026-09.sh` | 0.9.2 | 0.27.0 | 8.4.22, and 8.5.10 as `php85-*` |

```bash
cd bench
. ./env-2026-09.sh
python3 run.py --repeats 7 --json results/$(date +%F)-$BENCH_PROFILE.json   # the PHP columns run 31 times regardless
```

One run, one file under `results/`; a run never overwrites another. The TypePHP
columns are defined by what an int is — `typephp` keeps PHP's widening to float,
`typephp-native` compiles `int64_t` — and the profile names the directive that
spells each in its release, because 0.9 inverted the default.

Override `BENCH_SCRATCH`, `BENCH_PHP`, `PHP_HOME` or `LOCALDEV` before sourcing
to point at your own builds. Setting up those builds is written down in
`dev/BENCHMARKS.md` under the run they belong to.

## Limits

Four loops are not an application. Nothing here touches strings, objects,
method calls, exceptions, or the request lifecycle, and none of the engines is
carrying a framework. The numbers bound one narrow question — what a typed,
compiled loop costs against the same loop under Zend — and nothing wider.

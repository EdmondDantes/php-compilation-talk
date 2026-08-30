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
says nothing about a loop. Every sample survives into `results.json` as
`samples_s`.

What is reported then depends on the shape of the samples, and the runner
decides, not the reader:

- **One mode** — the minimum. Noise on an idle machine only adds time, so the
  minimum is the closest thing to the loop's own cost.
- **Two modes** — both, with the share of runs in each and the count. The
  reported figure is the **slow** mode, and every ratio quoted against it is
  therefore one that survives a reader whose own run lands in either mode.

A run is called bimodal when two adjacent sorted samples stand apart by half
again, and by at least 5 ms so that jitter near zero is not mistaken for a
split. A bimodal row makes `run.py` exit non-zero: it is a result that needs
reading, not a warning to scroll past.

This is not a precaution in the abstract. PHP's tracing JIT picks a mode per
process on these loops and holds it, a minimum over seven repeats of it put a
wrong claim into the deck, and `dev/BENCHMARKS.md` records what that cost.
The PHP columns therefore run 31 times regardless of `--repeats`; two modes
cannot be told apart from a handful of samples.

Output is compared across engines rather than against a stored expectation.
Where engines disagree, the disagreement is the result; see `int_overflow`.

## Running it

The toolchains are not distribution packages. `env.sh` points at a private PHP
built with `--enable-embed=shared` (TypePHP needs the Embed SAPI, which the
Ubuntu packages omit), at a TypePHP checkout with `vendor/` installed and PHPX
built, and at an elephc binary.

```bash
cd bench
. ./env.sh
python3 run.py --repeats 7 --json results.json   # the PHP columns run 31 times regardless
```

Override `BENCH_SCRATCH`, `TYPEPHP_ROOT`, `ELEPHC_BIN` or `PHP_HOME` before
sourcing to point at your own builds. Setting up those builds is written down
in `dev/BENCHMARKS.md` under the run they belong to.

## Limits

Four loops are not an application. Nothing here touches strings, objects,
method calls, exceptions, or the request lifecycle, and none of the engines is
carrying a framework. The numbers bound one narrow question — what a typed,
compiled loop costs against the same loop under Zend — and nothing wider.

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

Each engine runs `--repeats` times and the **minimum** is reported: noise on a
shared machine only adds time. The median travels with it in `results.json` so
a wide spread stays visible. Process startup is measured separately, with an
empty program of the same engine, and subtracted — a native binary starts in a
millisecond and a PHP process does not, and that gap says nothing about a loop.

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
python3 run.py --repeats 7 --json results.json
```

Override `BENCH_SCRATCH`, `TYPEPHP_ROOT`, `ELEPHC_BIN` or `PHP_HOME` before
sourcing to point at your own builds. Setting up those builds is written down
in `dev/BENCHMARKS.md` under the run they belong to.

## Limits

Four loops are not an application. Nothing here touches strings, objects,
method calls, exceptions, or the request lifecycle, and none of the engines is
carrying a framework. The numbers bound one narrow question — what a typed,
compiled loop costs against the same loop under Zend — and nothing wider.

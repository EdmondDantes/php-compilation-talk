# September 2026 refresh: compilers, measurements, Laravel, Manticore

State of the four PHP compilers the talk leans on, as of 2026-09-23, and what
that does to the numbers in the deck. Details live where they belong; this file
is the summary and the index.

- per-project changes, dated and linked: `dev/research/php-compilers.md`
  (each entry's "Update 2026-09-23") and `dev/research/typephp-review.md`;
- measurements, method and raw files: `dev/BENCHMARKS.md`, section 2026-09-23;
- TypePHP on Laravel: `dev/research/typephp-laravel.md`.

## What changed since August

**TypePHP** went from 0.6.7 to 0.9.2 in 256 commits and nine releases, and from
~95 to 1,403 stars. 0.8.0 made native `int64_t` the default and removed
`use native_types`; PHP's widening now needs `use varint_types`. A program
compiled with no directive therefore answers overflow differently from PHP
(`0` against `1.844674407371E+19`). New: `--nano` (no `libphp`),
`embedded-files` (Composer `vendor/` as bytecode inside the binary), Android,
iOS. The documented incompatibilities were not relaxed.

**elephc** went from 0.26.5 to 0.27.0 in 1,521 commits. PR #817 fuses a
checked multiply-add chain into registers; its motivating loop is our
`int_arith`, which went from 4.5 s to 0.25 s. The overflow sign defect we
found in August is still there.

**KPHP**: 13 commits, all on the undocumented k2 runtime. Nothing public.

**Manticore**: 0.6.0 to 0.11.0, first prebuilt binaries. Analysed below.

The commit counts first quoted in this session (1,797 and 6,917) came from
shallow clones and counted whole histories; the figures above come from full
clones.

## Measurements

Corrected on the evening of 2026-09-23: until then PHP ran every case at file
scope, where its JIT is 3.9× slower than inside a function, and every ratio
against the JIT favoured the compilers (dev/POSTMORTEM.md). With every engine
given the body inside a function (dev/BENCHMARKS.md, corrected section):

- **The JIT still beats compiled PHP with PHP semantics.** int_arith: JIT 100 ms
  (1.2× gcc's C), elephc 0.27 246 ms (2.5×), TypePHP with PHP ints 996 ms (9.9×).
  The gap is shrinking fast — in August it was 44× and 34× — but it is there.
- **The price of PHP's int semantics** in TypePHP fell from 43× to 11.8×.
- **On packed arrays the JIT is 2.2–2.5× from `std::vector`** and 4–7× faster
  than TypePHP on the same PHP array.
- **Calls:** TypePHP compiles plain calls to C speed (17 ms against the JIT's 69)
  and loses 5× to the JIT on interface calls (58 ns each); elephc loses 6× on
  plain calls and 20× on interface calls. The loss is the polymorphic call site:
  with one class at it TypePHP takes 103 ms against the JIT's 119, because both
  cache one class and TypePHP's miss is a full Zend call (dev/BENCHMARKS.md).
- **The JIT's "two states" were mostly a file-scope effect.** Inside a function
  only array_write splits, by 1.4×.
- **Manticore** is faster than the JIT on every case but array_write.
- **PHP 8.5** is within 10 % of 8.4.
- **"Level with C" means gcc;** clang folds the int loop 3.7× further, as
  Manticore's LLVM does.

## TypePHP and Laravel

It builds and runs, in two ways; `dev/research/typephp-laravel.md` has the
commands, the five errors in the order they stopped the build, and the timings.

- **The whole application as one binary** works only after `bootstrap/`,
  `config/`, `routes/`, `app/Models` and `app/Providers` are excluded from
  compilation. Each of them stopped the build with a fatal error, not with the
  documented fallback. Three files end up compiled; Laravel runs as embedded
  Zend bytecode in a 176 MB executable, prints four `$_ENV` warnings into its
  output, and in a persistent worker serves the framework-heavy request 40 %
  slower than PHP with OPcache.
- **One typed class as an extension** under an unchanged Laravel: builds in
  2.6 s, loads, and cuts a request whose work is the hot loop from 5.1 ms to
  1.3 ms in a persistent worker — 4.0× against OPcache and 1.6× against the JIT.
  In a fresh process per request, the shape of a php-fpm request (php-fpm itself
  was not run), the same request goes from 41.2 to 38.5 ms, 7 %.
- **The JIT does not compile scripts loaded from OPcache's file cache**, which
  silently switched it off in the first Laravel runs; without the file cache it
  halves the hot-loop request.

## Manticore since June

**What it is now.** One author, Taras Chornyi: 1,416 of 1,416 commits, every
pull request his. The public history begins on 2026-06-29 with a single commit
of 51,731 lines that already self-hosts, so the compiler predates its
repository. Commits per month in the public history: 15, 733, 214, 454. Tags v0.6.0 (07-21), v0.10.0
(09-19), v0.11.0 (09-23); 0.11.0 is the first with binaries. 48 stars, two
outside issues ever, 2 Packagist downloads.

**What "works" means there.** The project's own suite: 1,186 cases in
`tests/aot/cases`, each diffed against PHP's output; CI on 2026-09-23 reports
1,167 passed and 0 failed of 1,169. No php-src `.phpt` test is run. Push CI
exists since 2026-09-22. The self-hosting fixpoint is claimed and not checked
in CI: the log prints `fixpoint=0`, and the weekly gate that would run it has
never run. Real programs: three examples (`async`, `http`, `symfony-console`);
a Symfony demo build is recorded in the roadmap as "runs to completion" with
107 undefined-function traps and no artifact.

**Where it differs from PHP.** Documented: integers wrap, visibility is not
enforced at all (private members are readable), `$a/$b` of divisible ints is a
float, `['a'] === ['a']` compares pointers, `is_callable()` is true for any
object, `__sleep`/`__wakeup` are ignored, the cycle collector runs only when
called. Coverage against PHP 8.5.10: 731 of 2,135 functions, mbstring 1 of 65.
We confirmed the first on our probes: `int_overflow` prints `0`,
`int_overflow_chain` prints `1 33 1026`, as C does.

**How fast, measured here.** It compiled all nine of our cases unmodified and
answered every timed case correctly. On the one loop disassembled, `int_arith`,
the speed is LLVM folding five iterations into one; the folded result equals
PHP's, since the mask keeps every intermediate below 2^55, so what the fold
needed was the absence of an overflow check, not a different answer. The other
rows were not disassembled. It is the fastest of the PHP compilers in the
table on integers, calls and strings, and faster than the JIT everywhere but
array_write: `int_arith` 21.1 ms (3.9× under gcc's C, by LLVM
folding the wrapped loop), `function_call` 8.5 ms, `method_call` 64.4 ms
against the JIT's 232, `string_build` 64.7 ms, half the JIT. It is not fast on
array writes: 124.0 ms against the JIT's 42.5.

**Its own benchmark claim, checked.** The README's `loop` row says 22.8× over
PHP 8.5 on an Apple M1 Pro. Its script times whole processes and runs `php` with
no flags, so OPcache and the JIT are off, and its `loop.php` is top-level code;
the table says neither. Measured here on x86: Manticore 24 ms; PHP 8.5.10 on
their file without OPcache 363 ms, 15×; with OPcache and the JIT off, as php-fpm
runs by default, 320 ms, 13.5×; with the tracing JIT 130 ms, 5.5×; and the same
loop inside a function under the JIT 68 ms, 2.9×. The README's 22.8× was
not reproduced — its PHP took 1.37 s, 3.8× our 363 ms, for a reason we cannot
see from here.

**Reading.** Manticore is the fastest PHP compiler in our table outside
arrays, with one author and three months of public history. What it does not
keep is documented — wrapping integers, no visibility checks, pointer equality
for arrays, no runtime autoload — but none of our timed cases exercises those,
and the one loop examined gains from an omitted overflow check that range
analysis could have proven dead. Its object calls cost 2.8 ns more than plain
calls, against TypePHP's 58 ns, which points at its own object model rather
than at dropped semantics. How much of its lead is the dialect and how much is
the engineering is not settled by these measurements.

## Benchmarks that could be added

Two were added this time (`method_call` with its control `function_call`, and
`string_build`), plus the overflow probe `int_overflow_chain`. Candidates not
taken, with the reason:

- **Recursion** (`fib`): cheap, every engine supports it, and Manticore and the
  TypePHP press quote it — a good fourth case if the deck needs calls again.
- **Hash arrays with string keys**: the packed-array cases say nothing about
  the `HashTable` path that real code uses; worth adding before any claim about
  "arrays" in general.
- **Exceptions**: throw and catch in a loop; not measured by anyone in this
  file, and none of the slides needs it yet.
- **Startup and memory**: startup is already measured and subtracted in every
  run; publishing it (and peak RSS) is a reporting change, not a new case.
- **Compile time**: Laravel took 80 s and 176 MB in TypePHP; a small table of
  build times per engine would support the "deploy cost" part of the talk.
- **KPHP as an engine**: needs its 2022 Docker image and typed source; a
  separate, timeboxed step, since it breaks "one body for every engine".

## What the talk has to decide

These are the speaker's decisions and are not made here:

- the integer slide's title "Ускоряет не компиляция" is refuted by elephc 0.27.0;
- two elephc slides (the boxed IR, the 83.5 % profile) describe 0.26.5 only;
- whether the JIT slide keeps "74–90 % fast" or says the frequency varies;
- whether interface dispatch, Laravel, and Manticore get slides of their own.

The per-claim table is in `dev/BENCHMARKS.md`, section 2026-09-23.

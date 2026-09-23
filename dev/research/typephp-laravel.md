# TypePHP on Laravel

TypePHP 0.9.2 (`43e85b88`) builds a Laravel 13.33 application into a binary
that answers requests, but only by compiling three of its files; everything else, the
framework included, runs as Zend bytecode embedded in the executable. Compiling
one typed class into an extension and loading it beside an unchanged Laravel
also works. Tried on 2026-09-23. The application, its overlay and the build
script are in `bench/laravel/`; timings are in `bench/results/2026-09-23-laravel.json` and
`bench/results/2026-09-23b-laravel.json`.

## What was tested, and which claim each attempt tests

The vendor makes two different claims, and each attempt tests one.

- **Attempt A, the application as one binary.** The README offers binary mode
  plus `embedded-files` for exactly this: sources are compiled, Composer
  `vendor/` is packed as OPcache bytecode, and "a PHP file excluded by `ignore`,
  or rejected because it uses unsupported AOT syntax, enters the opcode table"
  (`docs/en/EMBEDDED_FILES.md`). The claim tested: an existing framework
  application can be shipped as a TypePHP executable.
- **Attempt B, one hot class as an extension.** Extension mode "loads as a
  standard PHP extension" (README). The claim tested: a typed hot path can be
  compiled and dropped under a framework that stays on Zend.

The application is a fresh `laravel/laravel` v13.10.1 skeleton (framework
v13.33.0) with one route, `/bench?n=N`, which returns
`App\Support\Hot::checksum(N)` — the loop of `bench/cases/int_arith` as a
static method with typed parameters. Sessions use the `array` driver so that a
request writes nothing to SQLite. Both attempts run on the private PHP 8.4.22
embed build that `libphp` comes from, because an extension must load into the
PHP it was built against.

## Attempt A: the whole application

Start: `sources` lists `app.php` (the entry, a `main()` that boots Laravel and
handles requests), `app/`, `bootstrap/`, `config/` and `routes/`;
`embedded-files` lists `vendor/`, the same four directories, `resources/` and
`.env` (`bench/laravel/overlay/tp-whole.yml`).

Each build stopped at the first file it could not compile, with a fatal error.
TypePHP does have a fallback: a file whose translation throws its `Unsupported`
exception is moved to the embedded opcodes (`src/Build/SourcePipelineTrait.php`,
`reportUnsupportedProjectFile`). None of the five took it; each came from
`fatalError()`, which aborts the build. The directory named in
the error was added to `ignore` and the build repeated:

| # | first blocking error, verbatim | cause | added to `ignore` |
|---|---|---|---|
| 1 | `Fatal error: Unsupported statement: Stmt_Return in …/bootstrap/app.php:8` | the file ends in `return Application::configure(…)->create();` | `bootstrap` |
| 2 | `Fatal error: Unsupported statement: Stmt_Return in …/config/app.php:3` | every config file is `return [...]` | `config` |
| 3 | `Fatal error: All execution code must be within a function, found stray code in …/routes/console.php:6` | route files are top-level calls | `routes` |
| 4 | ``Fatal error: Trait `Illuminate\Database\Eloquent\Factories\HasFactory` not found in …/app/Models/User.php:18`` | a vendor trait is invisible to AOT unless vendor is compiled too | `app/Models` |
| 5 | ``Fatal error: Class `AppServiceProvider` inherits from a non-existent class `Illuminate\Support\ServiceProvider` in …/app/Providers/AppServiceProvider.php:7`` | an AOT class may not extend an autoloaded one (`CLASS_INHERITANCE.md`, rule 2) | `app/Providers` |

After the fifth, the build succeeds in about 80 s: 8,117 PHP files turned into
embedded opcodes and three compiled — `app.php`,
`app/Http/Controllers/Controller.php` (an empty abstract class) and
`app/Support/Hot.php`. The executable is 176 MB.

It answers requests built inside the process with `Request::create()`:
`/bench?n=1000` returns `906902389`, the same as PHP; the welcome page matches
PHP's line for line once the warnings below and blank lines are removed; an
unknown path returns Laravel's 404 page. Serving real HTTP, `Request::capture()`
and `$_SERVER` were not exercised. Every run prints four warnings to standard
output first:
`Warning: Undefined global variable $_ENV in
…/vlucas/phpdotenv/src/Repository/Adapter/EnvConstAdapter.php on line 42`.
The embedded runtime does not provide `$_ENV`; the `.env` values still arrive
through the other adapters, since the application boots with its key and
drivers. Whether other superglobals are affected was not checked.

So the fallback covers constructs the translator does not know, and not the
ones Laravel is built from: code at file scope, and parents or traits that live
in `vendor/`, are fatal. Error 5 is documented as such (`CLASS_INHERITANCE.md`,
rule 2). What remains compiled is the one file written for the purpose. The
binary is Laravel on Zend, packaged.

## Attempt B: one class as an extension

`bench/laravel/overlay/tp-hot.yml` compiles `app/Support/Hot.php` in `ext`
mode. The build takes 2.6 s and yields a 30 KB `hot.so`. Loaded with
`-d extension=hot.so`, the class is internal (`ReflectionClass::isInternal()`
is true), so Composer's autoloader never reaches the PHP file, and Laravel
serves the route unchanged with the same answer.

Nothing in the class needed changing. It was written with typed parameters and
no dynamic features, which is the precondition the vendor states.

## Timings

`bench/laravel/measure.py`, private PHP 8.4.22 NTS for every configuration, 15
repeats with the configurations taking turns; `results/2026-09-23c-laravel.json`.
*Cold* is one request in a fresh process that boots Laravel, minimum of 15, with
OPcache reading a warm file cache — the shape of a request in a pool that starts
from compiled scripts. *Warm* is one more request in a process that has already
booted and served one: the median of 201 requests minus the median of 1, divided
by 200 — the state of a persistent worker (Octane, RoadRunner, FrankenPHP's
worker mode). Neither Octane nor php-fpm itself was run. Warm requests run
without the file cache: the tracing JIT does not compile scripts that OPcache
loaded from it (5.19 against 5.59 ms per warm request with the file cache,
2.58 against 5.18 without; one run of 7 repeats each), which made the JIT columns
of the two earlier files (`2026-09-23-laravel.json`, `2026-09-23b-laravel.json`)
measure OPcache alone.

| configuration | n=1000, cold | n=1000, warm | n=10^6, cold | n=10^6, warm |
|---|---|---|---|---|
| PHP + OPcache | 36.2 ms | 0.415 ms | 41.2 ms | 5.125 ms |
| PHP + JIT | 37.3 ms | 0.940 ms | 41.7 ms | 2.061 ms |
| PHP + OPcache + hot.so | 38.1 ms | 0.431 ms | 38.5 ms | 1.276 ms |
| PHP + JIT + hot.so | 37.8 ms | 0.913 ms | 42.2 ms | 1.834 ms |
| TypePHP binary | 36.6 ms | 0.579 ms | 37.6 ms | 1.449 ms |

Results, each within this run:

- **A framework request gains nothing from compilation, and the binary loses.**
  With the loop at 1000 iterations the warm request is Laravel's routing,
  middleware and response: 0.415 ms under OPcache, 0.431 with hot.so loaded,
  0.579 ms in the binary — 40 % slower. Why the embedded runtime is slower was
  not investigated.
- **Where the request is the hot loop, the extension pays, against the JIT too.**
  With 10^6 iterations hot.so takes a warm request from 5.125 ms (OPcache) to
  1.276 ms, 4.0×, and is 1.6× faster than the JIT's 2.061 ms. The binary gets
  3.5× against OPcache and 1.4× against the JIT.
- **A fresh process per request hides most of it.** Cold requests cost 36–42 ms
  in every configuration; with 10^6 iterations hot.so takes one from 41.2 to
  38.5 ms, 7 %.
- **The JIT made the framework request slower in this window:** 0.940 against
  0.415 ms warm at n=1000. 200 requests may not be enough for its traces to pay
  back their compilation; not investigated further.

## What this says for the talk

- The vendor's first claim, an existing application shipped as a TypePHP
  binary, holds only in the sense that the binary runs. What runs is Laravel on
  Zend with three compiled files, 176 MB, `$_ENV` warnings in its output, and a
  framework request 40 % slower than plain PHP in a persistent worker. Everything TypePHP
  refused — `return` at file scope, top-level calls, vendor traits,
  subclasses of autoloaded classes — is how Laravel is written, not an edge case
  of this application.
- The second claim, a compiled hot path under an unchanged framework, holds as
  stated: a 30 KB extension, no change to the application, 4.0× against OPcache
  and 1.6× against the JIT on a request that is the hot loop in a persistent
  worker, 7 % on the same request in a fresh process, and nothing on a request
  that is not. This is the same
  result as the talk's loops, now inside a real request: compilation pays for
  typed numeric code and for nothing else.
- For a working developer the usable form is the extension, and the question it
  raises is the one the talk already asks: is there a hot loop in the request
  at all.

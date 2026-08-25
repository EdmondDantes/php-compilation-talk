# Projects that compile PHP — inventory

Compiled 2026-08-25 from project repositories, release pages and vendor
docs. Dates are last observed activity on that day.

Read the categories first: most arguments about "PHP compilers" are
really arguments about which of these six things the speaker meant.

- **A. AOT to native code** — PHP semantics translated to machine code
  or to C/C++/LLVM IR, producing a binary.
- **B. Compiled to a foreign VM** — PHP re-implemented on CLR, JVM, Go,
  Erlang, RPython.
- **C. Compiled to JavaScript or WebAssembly** — with an important split
  between re-implementations and ports of the C interpreter.
- **D. Inside the engine** — what php-src itself already compiles:
  OPcache, preloading, the JIT.
- **E. Encoders** — ship Zend opcode plus a loader extension. Marketed
  as compilers; the runtime is unchanged.
- **F. Packagers** — bundle the unmodified interpreter into one file.
  No translation happens at all.

Two rules used throughout: a benchmark stated by the project itself is
labelled *project-authored*; anything a primary source did not confirm is
labelled *unverified*.

---

## A. Ahead-of-time, to native code

### Alive

**KPHP** — <https://github.com/VKCOM/kphp> · <https://vkcom.github.io/kphp/>
VK.com. PHP subset → C++ → native binary with an embedded HTTP server.
Active (last commit 2026-08-21; current work is a new "k2" runtime);
open-sourced late 2020; ~1.5k stars, GPLv3.
Subset, and a hard one: no `eval`, no dynamic names, no reflection, no
variable variables, no generators, no anonymous classes, no `finally`,
no SPL, no XML/DOM, no `$_SESSION`, no file uploads; references only
partially. Static typing must hold.
Docs claim 3–10× over Zend for code that follows its rules
(project-authored). Runs vk.com in production — the strongest production
reference in the whole category. Exact PHP language-version target is
never stated (unverified).

**elephc** — <https://github.com/illegalstudio/elephc> · <https://elephc.dev/>
Vincenzo Petrucci, Guillaume Loulier. Written in Rust; compiles a PHP
subset **straight to assembly** — no C step, no VM, no runtime
dependency. macOS ARM64, Linux ARM64/x86_64. MIT.
Active and fast-moving: created 2026-03-21, ~5.3k commits, ~568 stars,
last commit 2026-08-24. Self-described experimental.
Wide subset — classes, interfaces, traits, enums, generators, Fibers,
PDO/mysqli, 500+ builtins — plus non-PHP extensions (`packed class`,
`buffer<T>`, `ptr`, `extern` FFI). `eval()` falls back to an optionally
linked interpreter. Headline demo: a DOOM-style renderer compiled from
PHP. No independent benchmarks.

**Manticore (ManticorePHP compiler)** — <https://github.com/manticorephp/compiler>
Taras Chornyi. Self-hosted AOT compiler **written in PHP**: lexer →
Pratt parser → AST lowering → MIR passes → LLVM IR → static binary
linking only libc. MIT.
Active but very young: created 2026-06-12, ~957 commits, ~35 stars, last
commit 2026-08-23. v0.6.0.
Claims a large subset of PHP 8.5 plus a superset — structured
concurrency, FFI, modules, generics, property hooks, Fibers. Documented
gaps: no `extract()`, integer overflow wraps instead of promoting to
float, traits and generics cannot cross compiled-library boundaries,
`json_encode` of objects returns `{}`.
Claims it compiles itself to a byte-identical fixpoint, ~50 KB binaries,
cold start 2.6 ms against PHP's 62 ms, and 44× on spectralnorm — all
project-authored.
Name collision: **Manticore Search** (search engine) and Trail of Bits'
**Manticore** (symbolic execution) are unrelated.

**TypePHP** (was `swoole/aot-compiler`) — <https://github.com/swoole/typephp>
Swoole (上海识沃网络科技有限公司), GPL-3.0. PHP → C++17 → native machine
code. Active preview: created 2026-05-11, ~1.5k commits, commits as
recent as 2026-08-25, ~95 stars. No tagged releases; `project.yml` says
0.6.3. Linux-primary (Ubuntu 22.04 recommended).

**The source is open** — checked against the repository tree on
2026-08-25, not against the README. `src/` holds the compiler itself,
written in PHP: `Parser/`, `Analysis/`, `TypeSystem/`, `Optimizer/`,
`Backend/`, `Generator/`, `Resolver/`, `Symbol/`, `Transform/`,
plus `Translator.php` (219 KB), `CompilerBase.php` (217 KB) and
`Preprocessor.php` (97 KB). CI builds a bootstrap compiler `tpc` and
runs PHPT tests against it, keeping the generated `.cc`/`.h` files as
artifacts. Requires PHP 8.4–8.5 with the `embed` SAPI, GCC 9+ or Clang,
CMake 3.24+, GMP, MPFR and libmpdec.

What makes it different from KPHP: **gradual, and it does not ask for
the whole codebase.** `use native_types` turns `int`/`float`/`bool` into
`int64_t`/`double`/`bool` in the compiled unit; `std::vector`,
`std::map`, `std::ordered_map` and `std::array` are typed containers;
`bigInt`/`decimal`/`bigFloat` map to GMP, libmpdec and MPFR. Everything
untouched keeps running on Zend. Three build modes — standalone binary
(needs a global `main()`), **loadable PHP extension** (drops into
php-fpm, so frameworks keep working), or a static library. There is also
a WASI 0.2 and browser target, and a Python bridge.
Methods on primitives (`$s->upper()`, `$arr->contains()`) resolve at
compile time to direct C calls.
Its own benchmark, a 10000×100000 update loop: PHP arrays with JIT
**67.6 s**, TypePHP `std::array` **6.4 s**, hand-written C++
`std::vector` **6.2 s** — project-authored, but the shape of the claim
is "we reach C++, not merely beat PHP".
Limits are documented in `docs/INCOMPATIBLE_PHP_FEATURES.md`.
The README also sells **source protection** — the shipped artifact is a
binary, not readable PHP. Note where that lands the vendor: Swoole sells
an encoder called Swoole Compiler and now ships a real compiler whose
pitch overlaps it.

**php-to-native-compiler (PTN)** — <https://github.com/adamziel/php-to-native-compiler>
Adam Zieliński (of WordPress Playground). Personal experiment, no
licence file, 4 stars, created 2026-05, last commit 2026-07-12.
AST → IR → C runtime → native executable. Tracks 424 runnable PHPT tests
against 576 classified blockers. Makes no performance claims — notable
precisely for that.

### Dead

**HipHop for PHP (HPHPc)** — Facebook, 2010. PHP → C++ → one binary.
Killed by February 2013, when all Facebook production had moved to HHVM.
Causes, from the record: a flattened performance curve, no `eval()` or
`create_function()`, and deploy binaries above 1 GB.
Wikipedia reports up to ~6× page-generation throughput over Zend
(project-authored, 2010 baseline).

**HHVM** — <https://github.com/facebook/hhvm> — alive, but not for PHP.
Branch cut 2018-12-03; v3.30.0 (2018-12-17) was the last PHP-supporting
release; v4.0.0 shipped Hack-only (2019-01-28); v3.30 support ended
2019-11-19. Its AOT stage (HHBBC, repo-authoritative mode) is
bytecode → bytecode, not native; native code still comes from the JIT.

**phc** — <https://github.com/pbiggar/phc>. Started 2005 at Trinity
College Dublin by Edsko de Vries and John Gilbert; Paul Biggar joined
later. PHP → C through a three-level IR (AST → HIR → MIR), using the PHP
C API and the embed SAPI; emitted either a PHP extension holding the
compiled script or a standalone binary.
Development ended 2016 (last substantive commits 2016-10-28 and
2017-07-05); 138 stars. No object support.
Its domain is the epitaph: **phpcompiler.org now redirects to an
unrelated WordPress site** ("PHComper — Turning Code Into Possibilities",
published 2022).
Paul Biggar's PhD thesis, "Design and implementation of an ahead-of-time
compiler for PHP" (Trinity College Dublin, 2010 per the TARA record —
some listings say 2009, unverified), is still the standard academic
reference. Its abstract claims roughly **1.55×** on benchmarks, with the
author noting that static analysis and optimization are needed for more.
<https://paulbiggar.com/research/thesis.pdf>

**Roadsend PHP (pcc)** — <https://github.com/weyrick/roadsend-php>.
Shannon Weyrick. PHP → Bigloo Scheme → C → machine code; shipped
standalone native web-app binaries, FastCGI, PHP-GTK desktop.
Commercial from 2002, open-sourced 2007, last commit 2012-01-16.
Successor **Raven / rphp** (C++ and LLVM, started 2008) — archived,
never finished.

**Recki-CT** — <https://github.com/google/recki-ct>. Anthony Ferrara,
while at Google. An AOT compiler **written in PHP**, with two backends:
JIT-Fu (machine code via libjit) and PECL (emits C for an extension).
Archived, Apache-2.0, 541 stars.
Extremely restricted: no references, no variable variables, no globals
at all — not even superglobals.
Effective development life: **under four months** — created 2014-08-29,
last commit 2014-12-22. Announced August 2014 with claims of beating
PHP 5.5 and HHVM 3.2 in some cases (project-authored).
<https://blog.ircmaxell.com/2014/08/introducing-recki-ct.html>

**JIT-Fu** — <https://github.com/krakjoe/jitfu>. Joe Watkins. A PHP
extension exposing an OO API over libjit so userland PHP can build and
run native instructions. Dead (2014–2018), never on PECL, 190 stars.
It was the only machine-code backend Recki-CT ever shipped. Watkins'
2019 FFI-era successor, `jitfi`, was created and abandoned on the same
day.

**php-compiler** — <https://github.com/ircmaxell/php-compiler>. Ferrara's
successor: a compiler in PHP driving LLVM through FFI (after trying
libgccjit and libjit), doing both JIT and AOT to machine code. Dormant
since 2019-05, 804 stars; the LLVM-C wrapper is `php-llvm`.
Measured in the write-up: Ack(3,10) at **0.2127 s compiled against
1.1752 s on PHP 7.4 with OPcache** — about 10× on an
iterated-function-call case, with the author warning that startup is
"*really* heavy (it's all in PHP remember)".
<https://blog.ircmaxell.com/2019/04/compilers-ffi.html>

**polarphp** — <https://github.com/polarphp/polarphp>. "Compiler and
runtime of PHP", C++, 1,037 stars. Abandoned, last push 2020-02-20.
Details unverified.

**BinaryPHP / PHP-to-C** — <https://github.com/vnool/PHP-to-C>. PHP →
C++ source. Abandoned 2021-02, 45 stars, quality unverified.

**Pipp** ("Pipp is Parrot's PHP", formerly Plumhead) —
<https://github.com/bschmalhofer/pipp>. Bernhard Schmalhofer,
Artistic-2.0. PHP on the Parrot VM.
Last commit 2009-07-23. The usual framing — that Parrot's death killed
it — is wrong: `parrot/parrot` was still taking commits in December 2025
and is not archived. Pipp died first, on its own, sixteen years earlier.

### Proposal only

**php-src AOT RFC discussion**, June 2025 —
<https://news-web.php.net/php.internals/127670>.
Proposes a frontend/IR/backend with either C transpilation or LLVM, a
strict static subset (no `eval`, no dynamic includes, a
`php.compiler.json` manifest) and a CLI-only development mode. Entirely
opt-in; Zend VM and JIT unchanged. No implementation, not accepted.

---

## B. Compiled to a foreign VM

### .NET / CLR

**PeachPie** — <https://github.com/peachpiecompiler/peachpie> ·
<https://www.peachpie.io/>. iolevel / DEVSENSE; a .NET Foundation
project since 2017. PHP → CIL via Roslyn, with the runtime library
reimplemented in C# (so no Zend extensions).
Active: v1.1.13 on 2025-11-17, last commit 2026-06-09. PHP 8.x language
level, including the 8.5 pipe operator. WordPress on ASP.NET Core is the
flagship target; it also runs in the browser through Blazor WebAssembly.
Native code only indirectly, by putting the assembly through .NET
NativeAOT; one user report of ~27% on the Zend bench that way — a single
report, not an independent benchmark.

**Phalanger** — <https://github.com/DEVSENSE/Phalanger>. Charles
University Prague, later DEVSENSE, Microsoft-supported. PHP 5.4 → CIL.
Archived; stable 3.0.0.3851 in January 2013, last commit 2017-07-09.
The repo describes itself as PeachPie's predecessor.

**PHP4Mono** — <https://php4mono.sourceforge.net/>. University of
Augsburg, Google Summer of Code 2005 with the Mono Project. Dead at
version 0.2, 2006.

*"Zend for CLR" does not exist. Mainsoft Grasshopper has no PHP angle —
it cross-compiles .NET IL to Java bytecode.*

### JVM

**Quercus** — <http://quercus.caucho.com/>. Caucho Technology, bundled
in the Resin app server. Interprets PHP on the JVM; Resin Pro compiles
PHP to Java bytecode. PHP 5 only, with extensions reimplemented in Java.
Stagnant: Resin Pro 4.0.67 dated 2024-11-20, last Maven Central artifact
4.0.66 in 2022, last newsletter August 2020. Claims to be "twenty to
forty times faster than the PHP-Java Bridge" (project-authored — and the
comparison is against a bridge, not against Zend). Any specific "Caucho
shut down in year X" claim is unverified.

**JPHP** — <https://github.com/jphp-group/jphp>. Dmitriy Zaitsev.
Compiles to JVM bytecode. Abandoned: last master commit 2020-07-07, last
core release 0.9.2 in 2017; 1,710 stars.
PHP 7.1+ with selected 7.2–7.4 features, and an explicit non-goal —
"we don't plan to implement the zend runtime libraries" — so its stdlib
is its own, with UTF-16 strings, threads and JavaFX/SWT. Its real user
was DevelNext, a desktop RAD IDE, itself dead since 2020.

**P8** — IBM Hursley, Rob Nicholson;
<https://www.infoq.com/presentations/nicholson-php-jvm/>. Presented at
the JVM Language Summit 2008; compiled PHP functions to JVM bytecode and
experimented with InvokeDynamic. Never shipped standalone. It was the
PHP runtime inside **IBM Project Zero / WebSphere sMash** — final
release 1.1.1 in June 2009, withdrawn from marketing 2012, support ended
2014. PHP version and extension coverage unverified.
*IBM FileNet P8 is an unrelated product.*

**graalphp** — <https://github.com/abertschi/graalphp>. Andrin
Bertschi, undergraduate thesis at ETH Zurich's AST Lab. A Truffle AST
interpreter on GraalVM, ~4,000 LOC, Apache-2.0. Abandoned 2020-09-26.
Covers a small slice of PHP 7.4 — scalars, arrays, functions, control
flow, **no classes**. Reported up to ~859% over PHP 7 on synthetic
benchmarks: the strongest published evidence that a Truffle-hosted PHP
would work, and nobody continued it.

### Go, Erlang, RPython

**Goro** — <https://github.com/KarpelesLab/goro>. Mark Karpelès. A full
PHP bytecode VM in pure Go — not a transpiler. BSD-3, 695 stars, active
(last commit 2026-05-26).
Project-authored completeness claims, independently unverified but
unusually specific: PHP 8.5 language features, ~11,864 of 12,121
(~97.9%) of the PHP 8.5.5 test suite, ten extensions, and CLI/CGI/FPM
SAPIs. The motivation is calling goroutines and channels from PHP, plus
`fs.FS`-sandboxed execution.
If the claims hold, this is the most complete non-Zend PHP alive — at
695 stars.

**ePHP** — <https://github.com/bragful/ephp>. Manuel Rubio. PHP
interpreter in pure Erlang/OTP, LGPL 2.1, 289 stars, active
(2026-07-18). Partial; ships its own `doc/COMPATIBILITY.md`. Used to
embed PHP as a plugin language — tested with Kazoo and FreeSWITCH for
VoIP control.

**HippyVM** — <https://github.com/hippyvm/hippyvm>. Maciej Fijałkowski
and the PyPy team; the 2012 study was Facebook-sponsored. Built on
RPython, so it got PyPy's tracing JIT for free. Abandoned (last push
2022-04-26, development effectively over years earlier), 866 stars.
The author's own epitaph is a blog post titled "HippyVM goes to Y
Combinator and fails" (March 2015) — rejected after two interview
rounds. A useful data point for the business part of the talk: a
technically credible PHP JIT with no business model behind it.

**PyHP** — <https://github.com/juokaz/pyhp>, and **PyHP.js**, the same
RPython interpreter translated to asm.js. Both abandoned, 2016 and 2015.

**PHPPHP** — <https://github.com/ircmaxell/PHPPHP>. A PHP VM written in
PHP. 809 stars, abandoned 2018, educational and slow by design.

**PH7** — <https://github.com/symisc/PH7>. Symisc Systems. An embeddable
PHP implementation as a single C library, in the manner of SQLite.
Archived 2023-10-29, 508 stars.

**Tagua VM** — <https://github.com/tagua-vm/tagua-vm>. Ivan Enderlin.
PHP VM in Rust with LLVM. Abandoned 2016-11-01; only its parser crate
reached maturity. Reason for abandonment unverified.

---

## C. JavaScript and WebAssembly

The split that matters: **re-implementations** rewrite PHP in JS, and are
always incomplete; **WASM ports** compile the real C interpreter, and are
complete because they are PHP.

**Uniter** — <https://github.com/asmblah/uniter> · <https://phptojs.com/>.
Dan Phillimore. `phptoast` → `phptojs` → `phpcore`/`phpruntime`: a real
transpiler with a JS runtime, browser and Node. The umbrella repo is
quiet (2025-06-02) but the packages ship — `phptojs` 10.3.2 (2026-07-21),
`phpcore` 8.3.0 (2026-07-10). Its README concedes only a small subset of
the standard library is implemented. PHP version target stated nowhere.

**php.js (niklasvh)** — <https://github.com/niklasvh/php.js>. Compiles to
JS executed by a VM. Abandoned 2015. Passed ~670 tests of the official
suite while implementing "only a fraction of module functions"; the
author warns against using it in any application.

**Locutus** — <https://locutus.io/> — *not* a compiler: JS
reimplementations of standard-library functions. Active. Listed because
its old name was php.js and the confusion is permanent.

Dead PHP→JS transpilers, all real: `babel-preset-php` (Kornel Lesiński,
2017), `glayzzle/php-transpiler` (2017), `tharzen/php-interpreter`
(archived 2023), plus a row of small `php2js` repos.

**WordPress Playground / `@php-wasm`** —
<https://github.com/WordPress/wordpress-playground>. Real php-src
compiled to WASM through Emscripten with a custom WASM SAPI. Very
active: v3.1.51 on 2026-08-24, weekly releases. Supports PHP 7.0 through
8.5 — verified in `supported-php-versions.ts` on trunk.

**php-wasm (seanmorris)** — <https://github.com/seanmorris/php-wasm>.
1.4k stars, active (2026-05-19). Runtimes for PHP 8.0–8.5, default 8.4;
runtime-loadable gd, intl, dom, mbstring, openssl, sqlite and more.
**VRZNO** is its companion PHP *extension* — a PHP↔JS bridge, not a
compiler.

Both descend from **oraoto/pib**, abandoned 2021. VMware's Wasm Labs
`wasm32-wasi` port was archived in 2024 with a README note.

**There is no WASM SAPI upstream.** `php-src/sapi` on master carries
apache2handler, cgi, cli, embed, fpm, fuzzer, litespeed and phpdbg —
nothing else. Every WASM build is a downstream patch.

---

## D. Inside the engine

This is the part the audience already runs, and the baseline every
project in section A measures against.

### The pipeline PHP already has

**AST as a separate stage (PHP 7.0)** — <https://wiki.php.net/rfc/abstract_syntax_tree>.
Nikita Popov, 2014. Split the single-pass "parser emits opcodes" design
into lex → parse to AST → compile AST to opcodes. Passed 47–0;
compilation got 10–15% faster at 5–70% more memory.
Without this stage a PHP compiler is barely tractable — every project in
section A that is written in PHP starts from an AST.

**OPcache** — <https://wiki.php.net/rfc/optimizerplus>. Zend
Technologies, Dmitry Stogov; Zeev Suraski's RFC of 2013-01-28 passed
44–4 and it shipped bundled in PHP 5.5. Caches the compiled
`zend_op_array` in shared memory, so lex/parse/compile is skipped on
later requests, and runs the optimizer passes.
**PHP 8.5 made it non-optional** — <https://wiki.php.net/rfc/make_opcache_required>,
Tim Düsterhus, Arnaud Le Blanc, Ilija Tovilo; passed 30–0.
`zend_extension=opcache` and `--disable-opcache` are gone; the extension
is compiled in like ext/standard.

**The optimizer** — `Zend/Optimizer/`, driven by
`opcache.optimization_level`: peephole and constant folding, jump
optimization, CFG, SSA/DFA, call graph, SCCP, DCE, literal compaction.
Nikita Popov's write-up is the honest measure of its ceiling: only
functions "returning a constant value" can be inlined, which he calls
inlining that is "largely useless in practice", and constants cannot be
propagated across file boundaries.
<https://www.npopov.com/2022/05/22/The-opcache-optimizer.html>
That boundary — no whole-program view — is exactly what KPHP, HHVM's
repo-authoritative mode and every AOT project buy.

**Preloading (PHP 7.4)** — <https://wiki.php.net/rfc/preload>. Dmitry
Stogov, passed 48–0. A script runs at server startup and its classes and
functions stay permanently linked for every request, skipping per-request
linking.

**`opcache.file_cache` (PHP 7.0)** — a second-level on-disk cache of
compiled opcodes that survives restart and SHM reset.

### The JIT

**OPcache JIT (PHP 8.0)** — <https://wiki.php.net/rfc/jit>. Dmitry
Stogov and Zeev Suraski. Compiles op_arrays or traces to native code
inside OPcache, using **DynASM from LuaJIT** — LLVM was measured and
rejected as "almost 100 times slower" at code generation.
Two modes: function JIT (`1205`, whole functions at load) and tracing
JIT (`1254`, profile then compile hot traces). AArch64 backend in 8.1.
The numbers in the RFC itself are the talk's best single slide:
`bench.php` **0.140 s against 0.320 s**, and WordPress **326 against 315
req/sec**. Vote for inclusion in PHP 8: 50–2; the earlier attempt to
ship it as experimental in 7.4 failed 18–36.
php.watch's "PHP JIT in Depth" measured Laravel about **2% worse** with
JIT on, and documents the default thresholds (`jit_hot_func=127`,
`jit_hot_loop=64`, `jit_hot_return=8`, `jit_hot_side_exit=8`).
<https://php.watch/articles/jit-in-depth>

**JIT defaults (PHP 8.4)** — the pair moved from `opcache.jit=tracing`
with a zero-sized buffer to `opcache.jit=disable` with a 64M buffer.
Still off by default, but now switched off honestly by `opcache.jit`
rather than by starving the buffer.

**JIT rewritten on the IR framework (PHP 8.4)** —
<https://wiki.php.net/rfc/jit-ir>. Dmitry Stogov, work started January
2022, vote 26–0, plus 25–0 to delete the old implementation.
The per-architecture DynASM backends are gone: 8.3 carries
`zend_jit_x86.dasc`, `zend_jit_arm64.dasc`, `dynasm/` and `libudis86/`;
8.4 carries none of them — only `zend_jit_ir.c` and a bundled `ir/`.
RFC claims ~5–10% faster and smaller generated code, at up to 4× slower
function-JIT compilation.

**IR — Lightweight JIT Compilation Framework** —
<https://github.com/dstogov/ir>. Dmitry Stogov, MIT, created 2022-09-06,
active (last commit 2026-08-25), 501 stars. A sea-of-nodes IR with a
folding engine, SCCP, global code motion, instruction selection and
linear-scan register allocation, targeting x86_64, x86 and AArch64.
README benchmarks the generated code at ~96% of GCC -O2 while compiling
~40× faster, and says plainly it is "not yet a stable finished product".
It also backs an experimental C compiler (RCC) — meaning php-src now
carries a general-purpose optimizing backend that has nothing PHP about
it. That is the piece any future in-tree AOT would build on.
Talk: "IR JIT Framework: The Basis for the Next Generation of JIT in
PHP", Joker 2023.

**PHP 8.5** — if the JIT is enabled and fails to initialize, PHP now
exits with a fatal error at startup instead of quietly continuing
(php-src `UPGRADING`).

**Declined: OPcache optimization without caching** —
<https://wiki.php.net/rfc/opcache.no_cache>, Tyson Andre, 2020,
declined 10–13. Would have let the optimizer and JIT run without shared
memory or file caching. A side poll on moving the optimizations into
core first passed 14–0 — the direction exists, nobody has done it.

**Under discussion: OPcache Static Cache** —
<https://wiki.php.net/rfc/opcache_static_cache>, Go Kudo, 2026-06-02,
targeting PHP 8.6. Despite the name it persists shared-memory *data*
across requests, not compiled code. Belongs on the "sounds like AOT,
isn't" list.

### Extension-generation compilers

Not PHP compilers, but the tools people reach for when they want native
speed inside PHP.

**Zephir** — <https://github.com/zephir-lang/zephir>. A statically-typed
language of its own → C → a compiled PHP extension. Active: 1.2.0 on
2026-07-27, ~3.4k stars. It tracks modern PHP type semantics into
generated C — 1.2.0 added typed properties via
`zend_declare_typed_property`, union types and `readonly`. Phalcon is
built with it, and that is the whole reason it is alive.

**ext-php-rs** — <https://github.com/extphprs/ext-php-rs>. Rust bindings
to the Zend API; very active (2026-08-25), 833 stars, now in its own
org. The modern successor to the PHP-CPP idea; Turso's PHP client is
built on it.

**PHP-CPP** — <https://github.com/CopernicaMarketingSoftware/PHP-CPP>. A
C++ library that hides the Zend API. Maintenance-only: v2.4.16 of
2026-07-06 exists solely to keep it compiling on PHP 7.4.

**ext_skel.php and gen_stub.php**, in php-src — the code generators
every modern extension actually uses: a skeleton generator, and a
compiler from `.stub.php` signatures to C `arginfo`.
Its dead ancestor is **CodeGen_PECL** (`pecl-gen`), which built whole
extensions from an XML description, 2005–2008.

### Typed PHP as an enabler

KPHP's type system is the clearest case: PHPDoc `@var/@param/@return`
plus `@kphp-*` annotations are the contract, and a wrong PHPDoc is a
**compile error**. Its docs page is titled "Strict typing is
performance".
In the wider ecosystem PHPStan (2.0.0, 2024-11-11) and Psalm (6,
announced 2025-05-11) taught the codebase the same vocabulary. Note for
honesty: no scalar-types, typed-properties or union-types RFC gives
compilation as its motivation — they are enablers in practice, not by
declared intent.

---

## E. Encoders — marketed as compilers, and not compilers

All of these emit encrypted or obfuscated **Zend opcode** and require a
proprietary loader extension. Execution is unchanged.

**ionCube PHP Encoder** — <https://www.ioncube.com/php_encoder.php>.
Encoder 15 released 2025-10-13; encodes up to PHP 8.4 syntax, and
8.2–8.4 files run on up to PHP 8.5. Active.

**SourceGuardian** — <https://www.sourceguardian.com/>. Version 17
(2025-12-11), PHP 4.x–8.x with 8.5 fully supported. Active.
**phpSHIELD** is the same company's legacy brand.

**Swoole Compiler** — <https://business.swoole.com/compiler.html>.
Despite the name, it ships processed opcode and requires the
`swoole-loader` extension; its own FAQ error strings are "Loader ext not
installed" and "the code encrypt by php 7.1, but the loader version is
5.6". Docs repo last committed 2021-09-26. Pricing and PHP range come
from search snippets only — unverified.
Note the split inside one vendor: Swoole sells an encoder called a
compiler *and* develops TypePHP, an actual compiler.

**Zend Guard** — discontinued. Last PHP supported: 5.6; never ported to
PHP 7. Announced 2016-10-10, in Zend's own words: "After much
deliberation, we've decided not to port Zend Guard to PHP 7 and beyond."
Reasons given: PHP 7's internals refactoring, and declining demand.
The cleanest epitaph the category has.

**Nu-Coder** (NuSphere) — supports only up to PHP 5.3; effectively
abandoned. **bcompiler** (PECL) — encoder, last release 1.0.2 on
2011-06-09, fails to build on PHP 5.4+; its own PECL page points at an
unfinished successor, `bcgen`.

Their ancestors, for the historical slide: **Turck MMCache** (opcode
cache plus encoder, last release 2003, forked onward into eAccelerator)
and **APC** (opcode cache, last release 2012-09-03, superseded by OPcache
in PHP 5.5; its user-cache half survives as APCu). Neither compiles
anything — they cache the opcodes the engine already produced.

---

## F. Packagers — the interpreter in one file

No translation happens. Listed because "compiled to a single binary" is
where most of the confusion starts.

**phpmicro** — <https://github.com/dixyes/phpmicro>. A static SAPI you
concatenate with a script: `cat micro.sfx code.php > app`. Active.
**static-php-cli** — <https://static-php.dev/>. Statically linked PHP
with 100+ extensions, and single-file apps through phpmicro. Active,
~1.9k stars.
**FrankenPHP** — <https://github.com/php/frankenphp>, now under the
`php` org. Caddy plus embedded libphp; a static build carries runtime,
server and app in one binary. Active, ~11k stars. Its performance story
is worker mode, not compilation.
**Box** (PHAR), **NativePHP**, **PHP Desktop**, **ExeOutput**,
**Bambalam** — same category. Bambalam's own README says it "doesn't
produce native machine code".

---

## G. Ruled out

- **Transphpile** — a PHP 7 → PHP 5.6 transpiler, not a compiler to
  anything foreign. Abandoned 2017.
- **Zephir** — <https://github.com/zephir-lang/zephir> — compiles *its
  own* language to C PHP extensions; it does not compile PHP files.
  Active, ~3.4k stars, and Phalcon is built with it.
- **PHP-CPP**, **ext-php-rs**, **phper** — toolkits for writing
  extensions, the opposite direction.
- **php2go, php2py** and friends — either stdlib libraries in another
  language or toy transpilers. The one genuine PHP→Go transpiler,
  `i582/php2go`, was abandoned in 2020 at 28 commits.
- **phprs** — the name resolves to several unrelated hobby repos
  (`neokofg`, `yingkitw`, `kerwanp`), none notable, all with README
  claims nobody has checked. `alexisbouchez/php.rs`, cited in some
  search results, does not exist.
- **PHP/Java Bridge**, **deuill/go-php** and similar — bridges, not
  implementations.
- No PHP→Java-source or PHP→C#-source transpiler exists.
- No notable post-2023 LLM-era PHP→Rust/Go/TypeScript transpiler exists;
  a sweep for such projects above 50 stars returned only
  reverse-direction hits.

---

## Three observations for the talk

1. **The 2026 energy is AOT-to-native, and it is new.** Three genuine
   native compilers appeared within five months: elephc (March),
   TypePHP (May), Manticore (June). The managed-VM lane is nearly
   empty — JPHP and graalphp dead since 2020, Phalanger archived, only
   PeachPie still shipping.
2. **The most complete non-Zend PHP alive is written in Go and has 695
   stars.** Goro claims ~97.9% of the 8.5 test suite with FPM and CGI
   SAPIs. Completeness, it turns out, does not buy adoption.
3. **Every survivor had one owner with one codebase.** KPHP has VK,
   HHVM had Facebook, PeachPie has DEVSENSE and WordPress-on-.NET,
   Zephir has Phalcon. Every project without that — phc, Roadsend,
   Recki-CT, HippyVM, JPHP, graalphp — is dead, regardless of how good
   the engineering was. HippyVM was rejected by Y Combinator; that is
   the business answer to "why doesn't PHP have a good compiler".

## Open gaps

- KPHP's exact PHP language-version target.
- Uniter's PHP version target; P8's and Project Zero's coverage.
- Why Tagua VM was abandoned.
- Every performance number above that is marked project-authored.
- Whether the talk needs a measurement of its own at all.

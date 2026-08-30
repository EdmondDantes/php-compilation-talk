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
`cargo build --release`. C baseline: g++'s sibling `gcc -O2`. Talk repo at
`713abd0`.

**Reading.** Minimum of 7 runs, process startup of the same engine
subtracted. Every engine printed the same checksum except where the
overflow probe says otherwise.

| case | php-interp | php-opcache | php-jit | typephp | typephp-native | typephp-std | elephc | c-gcc-O2 |
|---|---|---|---|---|---|---|---|---|
| int_arith | 590.9 | 541.4 | 424.3 | 3505.9 | **82.2** | — | 4489.7 | 81.3 |
| array_foreach | 214.6 | 213.9 | 210.1 | 427.2 | 352.9 | **12.1** | 742.6 | 7.4 |
| array_index | 256.7 | 253.5 | 253.1 | 913.4 | 172.5 | **17.0** | 1845.9 | 7.5 |
| array_write | 267.5 | 267.6 | 138.8 | 1226.2 | 271.1 | **16.8** | 726.0 | 5.7 |

Milliseconds. `int_arith` is 10^8 iterations of a loop-carried
`$h = ($h * 31 + $i) & 0x3fffffff`; the array cases are 2000 elements
traversed 20 000 times.

### What the numbers say

**Compiling PHP as PHP loses to the JIT.** Both compilers, fed source that
keeps full PHP semantics, run the int loop 8–10× slower than PHP 8.4 with
its tracing JIT: TypePHP 3506 ms and elephc 4490 ms against 424 ms. The
gain in this family of projects is the return on typing, not on compiling —
the same conclusion VK's own KPHP material reaches, recorded in
`dev/HANDOFF.md`.

**Typing buys parity with C.** `use native_types` turns TypePHP's `$h` from
a `php::Var` into a `php::Int`, which is `typedef zend_long Int` — a plain
`int64_t` — and the generated loop becomes the C loop: 82.2 ms against the C
baseline's 81.3 ms, 5.2× faster than the JIT. The two generated bodies carry
the same arithmetic expression and differ in the declaration:

```cpp
// no directive — 3505.9 ms
php::Var h = 1L;
h = ((((((h) * (31L))) + (i))) & (1073741823L));

// use native_types — 82.2 ms
php::Int h = php::toInt(1L);
h = php::toInt(((((((h) * (31L))) + (i))) & (1073741823L)));
```

The arithmetic expression is character-for-character the same; the storage
type is not, and `php::toInt` on an `int64_t` compiles to nothing. Forty-three
times the run time for one word in the declaration.

**Replacing the container buys more than either.** `std::vector` instead of
a PHP array takes `array_foreach` from 210 ms under the JIT to 12.1 ms, and
`array_write` from 139 ms to 16.8 ms — 17× and 8×. This is the experiment
the TypePHP authors published as 10.6×, reproduced on our machine and with
the container change kept separate from the compilation.

**The JIT gives nothing on `foreach`.** 210.1 ms with the tracing JIT
against 213.9 ms with opcache alone. The trace is built (`jit_debug=0x80000`
shows TRACE 2 as a two-opcode loop) and its `FE_FETCH_R` stays a helper
call, which is the claim slide 35 of the deck already makes. Indexed reads
behave the same: 253.1 against 253.5. Indexed writes are the one array case
the JIT does help, 267.6 → 138.8.

**C is not a fair floor for the array cases.** gcc auto-vectorizes the sum
(7.4 ms for 4·10^7 additions is under a cycle per element). `typephp-std`
at 12.1 ms is within reach of it because `std::vector<int64_t>` vectorizes
too; nothing operating on a PHP array can.

### Why elephc is slow here, from its own IR

`elephc --emit-ir` on the int loop shows two heap allocations and two
refcount releases per iteration:

```
v7:  Heap(Mixed) = ichecked_mul v5 v6            ; alloc_heap
v9:  Heap(Mixed) = mixed_numeric_binop v7 v8 add ; may_deopt
release v7
v11: I64 = cast v9 I64
release v9
```

The cause is the semantics, not the code generator: `$h * 31` may overflow
into a float, so the product is boxed. The loop counter, whose range is
known, stays unboxed (`ichecked_add_to_int`). Declaring the function
`work(int $n): int` changes nothing (4.49 s either way), and neither does
`--strict-locals` — the boxing is not driven by the annotation. elephc's
own tracker names this: issue #623.

The comparison is worth stating precisely, because both engines obey the
same rule. PHP's JIT pays an overflow *branch* on a value in a register;
elephc pays an *allocation*.

### Overflow: one program, three answers

Not a timing case. Seven lines, `$h = 1;` then 64 doublings:

| | result |
|---|---|
| PHP 8.4 | `1.844674407371E+19` |
| TypePHP, no directive | `1.844674407371E+19` |
| TypePHP `use native_types` | `0` |
| elephc | `-1.844674407371E+19` |
| C, `uint64_t` | `0` |

The first three are documented. TypePHP files native `std::int` overflow as
an intentional rule in `docs/en/PHP_INCOMPATIBILITY_CLASSIFICATION.md` — the
native types trade PHP compatibility for C++ storage, and say so.

elephc's is a defect against a published promise. Its documentation site says
of `+`, `-` and `*`: "Integer overflow promotes to `double`"
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
linux-x86_64 prints the second one negative. The mechanism is the one their
open issue #548 documents for relational operators: a float-carrying Mixed
box is coerced through `__rt_mixed_cast_int`, and `cvttsd2si` on x86-64
returns `INT64_MIN` for an out-of-range value. #548 covers `>` and `<`; this
is the same fault on `*`. Not reported upstream: Edmond decided on 2026-08-30
not to file it.

Two things the project's own site adds to this. It publishes no performance
figures at all — neither the home page, the pipeline description nor the
feature list quotes a number against PHP or against C, so every speed claim
about elephc in circulation comes from somewhere else. And its compatibility
page measures compatibility as builtin coverage — "Overall builtin coverage:
473 / 2030 (23%)" against PHP 8.4.20 — and lists four limitations, none of
them about numeric behaviour. Divergence in arithmetic is not a category the
page has.

### What this does not measure

Four loops are not an application: no strings, no objects, no method calls,
no exceptions, no request lifecycle, no framework. Every result bounds one
question — what a typed compiled loop costs against the same loop under
Zend — and the array numbers additionally bound what changing the container
costs, which is a different question again.

### Negative results

- Typing elephc's source (`function work(int $n): int`) does not speed it
  up: 4.49 s typed, 4.49 s untyped. `--strict-locals` likewise.
- `opcache.jit=tracing` does not beat plain opcache on `foreach` or on
  indexed reads. Both within a percent.

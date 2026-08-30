# Anatomy of one hot loop

Why each engine gets the time it gets, read off its own machine code and its
own profile. The times are in `dev/BENCHMARKS.md`; this file is the
explanation, and it is the material behind the performance slides.

The loop is `bench/cases/int_arith/body.php`, 10^8 iterations of

```php
$h = ($h * 31 + $i) & 0x3fffffff;
```

Everything below is per iteration, measured on the machine `dev/BENCHMARKS.md`
names.

## Which binaries these numbers come from

Two PHP builds appear below and the difference matters. The times in
`dev/BENCHMARKS.md` are the packaged `/usr/bin/php8.4`, which is stripped, so
`perf` can name nothing in it. The disassembly and the named profiles come from
a PHP 8.4.22 built here from the same release with `--enable-opcache
--with-capstone --disable-cgi --disable-all`, which keeps its symbol table and
can print JIT'd machine code.

They are the same JIT: both report `opcache.jit=tracing` at `opt_level=4`, and
timed side by side on this loop they agree — 0,47/0,51/0,49 s against
0,50/0,51/0,49 s. Everything below that names a symbol was measured on the
capstone build.

## The instrument, checked first

`perf` on this kernel needs the binary from `linux-tools-6.8.0-134` invoked
directly; the `/usr/bin/perf` wrapper refuses on a version mismatch and the
refusal looks like "no perf here". Hardware counters work.

The check that licenses the rest: `objdump` counts 8 instructions in gcc's
loop body, and `perf stat` reports 800 133 165 instructions for 10^8
iterations — 8.0 per iteration. Counter and disassembly agree, so both can be
used on engines where only one of them is available.

## The table

| engine | instr/iter | cycles/iter | IPC |
|---|---|---|---|
| C, `gcc -O2` | 8.0 | 4.1 | 1.95 |
| TypePHP `use native_types` | 8.3 | 4.2 | 1.95 |
| PHP 8.4 + tracing JIT, fast mode | 85.2 | 20.9 | 4.07 |
| PHP 8.4 interpreter | 112.2 | 30.2 | 3.71 |
| TypePHP, no directive | 491.3 | 187.3 | 2.62 |
| elephc 0.26.5 | 925.0 | 229.2 | 4.04 |

Read the IPC column against the cycles column before drawing any comfort from
it: elephc retires four instructions per cycle and is the slowest thing in the
table. High IPC on 925 instructions is a well-fed pipeline doing work that did
not need doing.

The JIT row is its fast mode. Instructions per iteration are the same in every
run that could be caught — 85.2 in each of 15 — while cycles vary, so the two
modes `dev/BENCHMARKS.md` describes differ in cycles rather than in the code
that runs. That is as far as this goes: 45 further runs under `perf` produced no
slow one, so the slow mode's counters are unmeasured. Whether `perf` suppresses
it or the machine simply did not produce it that hour is unknown.

## C and TypePHP `native_types` emit the same loop

gcc, from `objdump`:

```
mov %rdx,%rcx ; shl $0x5,%rcx ; sub %rdx,%rcx ; lea (%rcx,%rax,1),%rdx
add $0x1,%rax ; and $0x3fffffff,%edx ; cmp $0x5f5e101,%rax ; jne
```

TypePHP with the directive, from `objdump` of `php_main()`:

```
mov %rbx,%rdx ; shl $0x5,%rdx ; sub %rbx,%rdx ; lea (%rdx,%rax,1),%rbx
add $0x1,%rax ; and $0x3fffffff,%ebx ; cmp $0x5f5e101,%rax ; jne
```

The same eight instructions in the same order, differing in one register
choice. `$h * 31` is a shift and a subtract in both, because 31 is 32 − 1.
There is nothing left of PHP in this loop, which is the point and also the
price: `php::Int` is `typedef zend_long`, and an `int64_t` wraps where PHP's
int promotes to a float.

## The JIT calls the interpreter's own handlers

`opcache.jit_debug=0x01` on a PHP built `--with-capstone` prints the trace.
Its loop body is 34 instructions and contains two `callq`. Between the calls
sit eight type guards (`cmpb $4, …` — checking that the operand is still
`IS_LONG`) and one inlined operation: `andq $0x3fffffff`.

So the JIT inlines the bitwise AND and calls out for `*` and `+`. `perf`
names the callees:

```
40.99%  ZEND_MUL_SPEC_TMPVARCV_CONST_HANDLER
19.14%  ZEND_ADD_SPEC_TMPVARCV_TMPVARCV_HANDLER
 4.69%  [JIT] 0x…af9        ← the trace itself, and twenty more entries like it
```

Those first two are the interpreter's own opcode handlers, and 60 % of the
program's time is inside them.

**The interpreter is not running.** `execute_ex` does not appear in this
profile at all — zero samples at any threshold. That excludes the reading a
compiler person reaches for first, that a guard fails each iteration and the
work happens back in the VM. The dispatch loop is gone; the handlers it used to
dispatch to are still being called, from the trace.

### Why those two and not the AND — the JIT says so itself

`opcache.jit_debug=0x80000` prints the trace's type inference:

```
0004 #8.T3  [!long] = MUL     #5.CV0($h) int(31)
0005 #9.T4  [!long] = ADD     #8.T3 #6.CV2($i)
0006 #10.T3 [long]  = BW_AND  #9.T4 int(1073741823)
```

`!long` reads "not necessarily a long". The JIT cannot prove the product stays
an integer — an overflow makes it a double — so it will not emit a bare `imul`
and calls the handler that copes with both. The AND's result is provably a
long, and it becomes one `andq`. The rule is named by the compiler, in its own
dump, and not inferred from a profile.

### The operator experiment, as corroboration

The type dump above is the evidence; this is a second, cruder check of it.
Take the multiply out — `$h = ($h + $i) & 0x3fffffff`:

| | instr/iter | cycles/iter | calls in the trace | MUL handler in the profile |
|---|---|---|---|---|
| `($h * 31 + $i) & …` | 85.8 | 24.6 | 2 | 38.8 % |
| `($h + $i) & …` | 55.8 | 16.4 | 1 | absent |

One operator removed, one call removed, 30 instructions and 8.2 cycles saved.

Read that delta as an upper bound on one helper call, not as its price. Deleting
the multiply also drops its own dependency-chain latency, which even gcc pays,
and changes what the remaining ADD is specialized on. Four things moved, not
one; what the experiment establishes cleanly is only that one of the two calls
belongs to the multiply.

## elephc turns the same rule into an allocation

`elephc --emit-asm` gives the loop directly. Body plus condition plus update
is 87 instructions with **8 calls**:

```
__rt_int_mul_checked        __rt_mixed_from_value      __rt_mixed_numeric_add
__rt_decref_mixed  (x3)     __rt_mixed_cast_int        __rt_php_float_to_int
```

Every local round-trips through the stack — there is no register allocation
across the body — and two `mov`s per iteration rewrite a global for
`concat_reset`, which this loop does not use.

`perf record` on a build with `--keep-symbols` says where the *time* goes. These are cycle samples, not instruction counts — the allocator chases pointers while the loop body runs straight, so the two do not divide alike:

| | share |
|---|---|
| heap allocator and refcounting | 62.8 % |
| boxing and unboxing (`__rt_mixed_*`) | 20.7 % |
| the loop body itself (`main`) | 15.7 % |

The hot symbols are `__rt_heap_alloc_count`, `__rt_heap_alloc_small_bin_scan`,
`__rt_heap_alloc_bump`, `__rt_decref_mixed`, `__rt_object_handle_release`,
`__rt_mixed_free_deep_box`. Five sixths of the time — 83,5 %, the allocator
and the boxing together — goes on housing a number that fits in a register.

**The rule is not what puts it in the heap.** PHP's JIT obeys the same rule and
calls a handler that writes a zval into a stack slot. What the semantics demand
is a check; the heap is elephc's own choice of a Mixed box per temporary,
served by a bin-scanning allocator. Four things here are compiler immaturity
rather than PHP: the box per temporary, the allocator, the absence of register
allocation across the loop body, and two `mov`s an iteration maintaining a
`concat_reset` global this loop never touches. And in this particular loop `$h`
is masked to 30 bits every iteration, so the product is provably below 2^35 and
a range analysis would delete the box outright. elephc's own tracker carries
the general case as issue #623.

## TypePHP without the directive reaches Zend by another road

`objdump` of the compiled `php_main()` first. The loop body is 78 instructions
and **13 calls**, every one of them through the PLT into `libphpx.so`:

```
Variant::operator*   Variant::operator+   Variant::operator&
Variant::operator=   Variant::operator++  Variant::operator<=
Variant::~Variant()  x6
```

Six source operators become thirteen calls, because every intermediate value is
a C++ object with a lifetime. `$h * 31` returns a `Variant` by value; so does
`+ $i`; so does `& mask`. Each is constructed, passed, and destroyed, and the
destructor is a call of its own.

That is the part PHP's own VM does not pay. A `TMP_VAR` holding a long lives in
a preallocated slot on the VM stack: nothing is constructed, and freeing it is a
no-op because a long is not refcounted. The interpreter's 112 instructions per
iteration buy six opcodes with no object lifetimes at all.

`perf` on the compiled binary:

```
16.61%  libphpx.so  php::Variant::~Variant()
 8.11%  libphp.so   increment_function
 7.53%  libphpx.so  zval_ptr_dtor@plt
 6.75%  libphp.so   zend_compare
 6.69%  libphp.so   zval_ptr_dtor
 6.44%  case_tp     php_main()
 6.25%  libphp.so   bitwise_and_function
 5.57%  libphpx.so  php::Variant::operator++(int)
```

The loop body is 6.4 % of the time. The rest is `php::Variant` — a C++ class
holding a zval — and the Zend functions its operators call:
`increment_function`, `zend_compare`, `bitwise_and_function`, and
`zval_ptr_dtor` on every temporary.

Note which Zend functions those are. `increment_function`, `zend_compare` and
`bitwise_and_function` are the **generic** API, not the specialized opcode
handlers the JIT calls: `ZEND_ADD_SPEC_…` starts with an inline fast path for
two longs and mostly never reaches `add_function`. TypePHP's operators go
straight to the generic path, through a PLT, constructing and destroying a
`Variant` for each temporary on the way.

That is the answer to the number that surprises people — why an AOT compiler is
**six times slower than the plain interpreter** on the same source. Three costs
stack, and none of them is the dispatch loop it removed:

1. **An object lifetime per intermediate value.** Thirteen calls for six
   operators, six of them destructors. The VM has none of this.
2. **The generic function instead of the specialized handler.**
   `Variant::operator*` is one function for every type combination, so it lands
   on `mul_function`, which dispatches on both operands. `ZEND_MUL_SPEC_…` tests
   for two longs and multiplies inline.
3. **A shared-object boundary around every one of them.** All thirteen calls go
   through the PLT, so g++ cannot inline any of it, cannot keep `$h` in a
   register across an operator, and cannot learn that the type never changes.

Removing the interpreter is not the win. The interpreter's value is not its loop
but its specialization — 300-odd handlers, one per opcode-and-operand-type
combination, each with the common case inlined. The JIT keeps that and drops the
dispatch. TypePHP drops the dispatch and the specialization together, and pays
C++ object lifetimes on top.

## What the four engines share

Every row above except the last two obeys one rule of the language: an `int`
that overflows becomes a `float`. None of them can put the arithmetic in a
register, and each pays differently — dispatch plus specialized handler, the
specialized handler alone, the generic function plus a C++ temporary, a heap
box plus its own handler. Only the last is more expensive than the rule
requires, and that is elephc's implementation rather than PHP's semantics.

The row that escapes is the one that stops obeying. `use native_types` does not
make the arithmetic faster; it makes it a different arithmetic, and
`bench/cases/int_overflow` is the receipt.

That is the sentence the performance block of the talk exists to earn.

## What this does not establish

- The trace addresses were identified by removing an operator and watching a
  call and a profile entry disappear together, not by resolving symbols. The
  identification is an inference from a controlled change, and a strong one,
  but it is not a symbol table.
- Instruction counts per iteration come from whole-process counters divided by
  the iteration count, so process startup is in them. For the C row it is
  133 165 instructions of 800 133 165, or 1,7 parts in 10^4; for the PHP rows,
  where boot is tens of millions of instructions, it is nearer 10^-3. That is
  why 85,2 and 85,8 for the same loop are one number, not two.
- One loop, one shape of arithmetic, one machine. The array cases have their
  own anatomy and it is not written up here.
- Everything here describes the JIT's fast mode. The slow mode was never caught
  under a profiler, so nothing in this file explains it.

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
| PHP 8.4 + tracing JIT | 85.2 | 20.9 | 4.07 |
| PHP 8.4 interpreter | 112.2 | 30.2 | 3.71 |
| TypePHP, no directive | 491.3 | 187.3 | 2.62 |
| elephc 0.26.5 | 925.0 | 229.2 | 4.04 |

Read the IPC column against the cycles column before drawing any comfort from
it: elephc retires four instructions per cycle and is the slowest thing in the
table. High IPC on 925 instructions is a well-fed pipeline doing work that did
not need doing.

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
38.80%  ZEND_MUL_SPEC_TMPVARCV_CONST_HANDLER
18.86%  ZEND_ADD_SPEC_TMPVARCV_TMPVARCV_HANDLER
```

Those are the interpreter's own opcode handlers. The JIT removed the dispatch
loop and kept the handlers, and 58 % of the JIT'd program's time is spent
inside them.

### The one-variable experiment

Take the multiply out — `$h = ($h + $i) & 0x3fffffff` — and change nothing
else:

| | instr/iter | cycles/iter | calls in the trace | MUL handler in the profile |
|---|---|---|---|---|
| `($h * 31 + $i) & …` | 85.8 | 24.6 | 2 | 38.8 % |
| `($h + $i) & …` | 55.8 | 16.4 | 1 | absent |

One operator removed, one call removed, 30 instructions and 8.2 cycles saved.
That prices a single arithmetic operation routed through a helper, and it
identifies the two calls without having to resolve their addresses.

The AND is inlined and the arithmetic is not, because only the arithmetic can
leave the integer domain: `*` and `+` may overflow to float, `&` may not.

## elephc pays the same rule with an allocation

`elephc --emit-asm` gives the loop directly. Body plus condition plus update
is 87 instructions with **8 calls**:

```
__rt_int_mul_checked        __rt_mixed_from_value      __rt_mixed_numeric_add
__rt_decref_mixed  (x3)     __rt_mixed_cast_int        __rt_php_float_to_int
```

Every local round-trips through the stack — there is no register allocation
across the body — and two `mov`s per iteration rewrite a global for
`concat_reset`, which this loop does not use.

`perf` on a build with `--keep-symbols` says where the 925 instructions go:

| | share |
|---|---|
| heap allocator and refcounting | 62.8 % |
| boxing and unboxing (`__rt_mixed_*`) | 20.7 % |
| the loop body itself (`main`) | 15.7 % |

The hot symbols are `__rt_heap_alloc_count`, `__rt_heap_alloc_small_bin_scan`,
`__rt_heap_alloc_bump`, `__rt_decref_mixed`, `__rt_object_handle_release`,
`__rt_mixed_free_deep_box`. Six sevenths of the program's time is spent
allocating and freeing a box for a number that fits in a register.

The rule being obeyed is the same one the JIT obeys. The implementation
differs: PHP's JIT calls a handler that writes a zval into a stack slot;
elephc calls a handler that takes a heap object. Nothing in the semantics
demands the heap, and in this particular loop `$h` is masked to 30 bits every
iteration, so the product is provably below 2^35 and a range analysis would
delete the box outright. elephc's own tracker carries the general case as
issue #623.

## TypePHP without the directive reaches Zend by another road

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

This explains the one number that surprises people: why the AOT compiler is
**slower** than the JIT on the same source. The JIT removes the dispatch loop
and keeps the handlers. TypePHP without the directive also removes the
dispatch loop and also keeps the handlers — but reaches them through C++
operator overloads with a destructor per temporary, which the JIT does not
pay. Removing the interpreter is not the win; removing the helper is, and
neither of them does that.

## What the four engines share

Every row above except the last two obeys one rule of the language: an `int`
that overflows becomes a `float`. Four different systems pay for it four
ways — dispatch plus handler, handler alone, C++ operator plus handler, heap
box plus handler — and the only row that escapes is the one that stops obeying
the rule. `use native_types` does not make the arithmetic faster; it makes it
a different arithmetic, and `bench/cases/int_overflow` is the receipt.

That is the sentence the performance block of the talk exists to earn.

## What this does not establish

- The trace addresses were identified by removing an operator and watching a
  call and a profile entry disappear together, not by resolving symbols. The
  identification is an inference from a controlled change, and a strong one,
  but it is not a symbol table.
- Instruction counts per iteration come from whole-process counters divided by
  the iteration count; process startup is in them, at roughly one part in 10^5.
- One loop, one shape of arithmetic, one machine. The array cases have their
  own anatomy and it is not written up here.

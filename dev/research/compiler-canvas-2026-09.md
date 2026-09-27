# Compiler Canvas diagrams — 2026-09-27

Source review for the three consecutive diagrams in `04-next.html`.
These are conceptual compilation flows, not exhaustive pass inventories.
No compiler build, runtime experiment or performance measurement was run.
Existing benchmark results retain their original versions and dates.

## TypePHP

See [the pinned 0.9.3 review](typephp-architecture-2026-09.md).
SSA is built from PHP-parser AST nodes in PHP, before generating C++17.
The ordinary Zend-backed outputs and the restricted Linux/macOS Nano
output are separate choices; the Windows Nano exception is in the notes.

## elephc

Reviewed main at `2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7` (September 27),
whose Cargo version is 0.27.0. This is a current source snapshot, not a
claim that every depicted feature is in the published 0.27.0 release.

- [Pipeline](https://github.com/illegalstudio/elephc/blob/2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7/docs/internals/how-elephc-works.md)
- [Architecture](https://github.com/illegalstudio/elephc/blob/2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7/docs/internals/architecture.md)
- [Eval boundary and implementation pointers](https://github.com/illegalstudio/elephc/blob/2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7/docs/internals/eval-runtime.md)

The front end resolves PHP source and checks types, then lowers to EIR.
Optimized EIR feeds the project's own target-aware assembly backend.
Assembly and linking combine program code, runtime helpers and required
libraries. The slide covers native executables, not every output format.

Experimental eval is hybrid: supported literal fragments can be AOT;
fragments needing runtime parsing or unsupported dynamic behavior use
the optional statically embedded Magician interpreter. This is not Zend
and does not imply that ordinary code is interpreted. The old active
EvalIR description was updated to agree with the current-source diagram.

## Manticore

Reviewed main at `69310ffc446cca9ad517102b09753340dd2ad1b5` (September 26).

- [Overview and pipeline](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/README.md)
- [MIR pipeline](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/src/Compile/README.md)
- [Driver and pass invocation](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/src/Manticore/Main.php)
- [Memory ABI](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/src/Compile/MemoryAbi.php)

The compiler has its own PHP lexer/parser. AST is lowered into typed MIR,
then LLVM IR is emitted, clang produces objects and cc links the program.
Effect/escape analysis and memory-operation insertion happen in MIR before
LLVM emission. The diagram's memory panel branches from MIR, not from
the linker. Arena/heap is a simplified view of the allocation choices.

There is no Zend runtime, but there are generated runtime services and
native library dependencies. The slide names libc, PCRE2 and OpenSSL;
additional dependencies are selected by the program's features.

## Value representation comparison

Three consecutive slides immediately after Manticore compare ordinary
dynamic values, objects and PHP arrays, each across all three compilers.
They share the title "Как реализуются абстракции" and advance with space.
The preceding table design is preserved in `player/deck/parked/`.
These are logical memory diagrams, without byte sizes or physical scale.
They do not claim every value is boxed and exclude TypePHP Nano, explicit
std containers and specialized classes. All three remain separate pages
in print and overview, so none of the memory states is lost in export.

TypePHP mappings come from `src/Type.php` at its pinned 0.9.3 commit.
PHPX was separately inspected at
`0dfa613d2057dcd4aa319ec9b6816f68df2403e4` (September 24):

- [PHPX types](https://github.com/swoole/phpx/blob/0dfa613d2057dcd4aa319ec9b6816f68df2403e4/include/phpx_types.h): `Var` aliases `Variant`.
- [PHPX wrappers](https://github.com/swoole/phpx/blob/0dfa613d2057dcd4aa319ec9b6816f68df2403e4/include/phpx.h): `Variant` stores a `zval`; `Array` and `Object` derive from it and use Zend array/object APIs.

elephc's [memory model](https://github.com/illegalstudio/elephc/blob/2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7/docs/internals/memory-model.md)
describes heap-boxed `Mixed`, objects with a class id and property slots,
and separate indexed-array and hash-table layouts. Known scalars are
stored directly; the general-purpose representation is not universal.

Manticore's `src/Compile/Mir/Type.php` defines `cell` as a tagged union.
`MemoryAbi.php` and `docs/design/memory-abi.md` describe the object
descriptor/refcount/fields and unified PhpArray PACKED/HASHED modes.
The diagrams deliberately avoid hard-coded byte sizes or an ABI version:
the implementation and narrative documents have differing version labels.

## Presentation behavior

`player/js/compiler-diagrams.js` renders all three flows in Canvas 2D at
double resolution. Colors and fonts come from the selected deck theme.
Each canvas has a textual accessible description. Space/forward reveals
the next stage; back reverses it; another forward at the last stage changes
slides. Re-entering starts from the input stage. Key repeat is suppressed
on these slides. Reduced-motion preference disables reveal animation.

Canvas copies are explicitly redrawn in overview/presenter views. The
presenter synchronizes steps through the existing paired-window channel.
Printing renders every stage and restores the current step afterward.

`player/js/memory-diagrams.js` draws the three memory schematics through
the same theme, high-resolution canvas and clone-redraw path.

# Structural memory comparison (2026-09-27)

These are nominal 64-bit structure/carrier sizes, **not RSS measurements**.
One owning carrier is counted. Excluded: host allocator rounding/bookkeeping,
reserved arenas/heaps, keys and their string objects, referenced contents,
shared class metadata, dynamic property bags and specialized representations.
Manticore uses its RC allocation path; TypePHP uses the ordinary Zend backend.

Run `python3 bench/layouts/model.py` to reproduce the slide numbers.

| Example | TypePHP/Zend | elephc | Manticore |
| --- | ---: | ---: | ---: |
| Dynamic value | 16 | 48 | 8 |
| Object, three ordinary int fields | 104 | 80 | 56 |
| Packed int array, capacity 1024 | 16464 | 8240 | 8264 |
| Hash array, 1000 entries, specified capacities | 41032 | 131176 | 41032 |

All values are bytes. Compiler elimination of a carrier or sharing a container
changes its incremental cost; these models do not predict optimized stack use.

## Zend / PHPX validation

`zend-sizes.c` was compiled against the private PHP **8.4.22** headers on x86-64.
The output was:

```
PHP=8.4.22 pointer=8 zval=16 zend_object=56 object_properties_offset=40 zend_array=56 Bucket=32
```

`phpx-sizes.cpp` compiled successfully with C++17 and the same PHP headers.
Its static assertions establish 16 bytes each for `php::Var`, `php::Object`
and `php::Array`. PHPX source: `0dfa613d2057dcd4aa319ec9b6816f68df2403e4`.

The probes only inspect types; they do not execute a PHP application or link a
new interpreter. Use the matching php-config include flags and PHPX include
path to repeat them. The C++ probe is compile-only (`-c`).

`sizeof(zend_object)` includes one property slot: a normal object's relevant
layout is **40 + 16*N**, not 56 + 16*N. Packed array storage includes 8 bytes
for the minimal hash prefix. Mixed-array index storage is 8*C bytes:
`HT_SIZE_TO_MASK(C) = -2*C`, each index is 4 bytes.

Sources: PHP 8.4 `Zend/zend_types.h`, `Zend/zend_hash.c`, and the PHPX
`include/phpx.h` / `include/phpx_types.h` files pinned in the architecture review.

## elephc

Source: `2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7`.

- Carrier pointer: 8 bytes. Mixed payload: **24** (tag + two payload words),
  plus the allocator's **16-byte** prefix. The nominal new boxed value is
  therefore 8 + 24 + 16; a reused larger free block can cost more.
- Ordinary object: class id 8 + 16*N property slots, plus allocator prefix 16.
  Field access emits offsets `8 + property_index*16`; int does not shrink a
  normal property slot. Dynamic/eval-related tails are outside this model.
- Indexed array: 24-byte header; int/pointer slots 8, string slots 16.
- Hash array: 64-byte header and separately allocated 64-byte slots. Each
  allocation has its own 16-byte prefix.

Checked code: `src/codegen_support/runtime/arrays/mixed_from_value.rs`,
`heap_alloc.rs`, `hash_get.rs`, `hash_set.rs`, and
`src/codegen/lower_inst/objects/allocation_clone.rs`. Layout documentation:
`docs/internals/memory-model.md`.

## Manticore

Source: `69310ffc446cca9ad517102b09753340dd2ad1b5`.

- Dynamic cell: 64-bit tagged carrier, plus separately owned data where needed.
- Ordinary object: 16-byte header + usually 8*N; RC allocation adds an 8-byte
  tag before the returned pointer. Per-field alignment is applied. Narrow
  TypeDef representations, Struct and a dynamic-property bag change the size.
- PhpArray: 56-byte header + 8-byte RC allocation tag; PACKED slots 8,
  HASHED entries 24, plus a separately allocated index when built.

Checked code: `src/Compile/MemoryAbi.php`, `src/Compile/Mir/ClassDef.php`,
`src/Compile/Mir/Passes/EmitLlvmRuntime.php`, and
`src/Compile/Runtime/UnifiedArrayRuntime.php`.

## Hash algorithms and the example's assumptions

| | Zend / TypePHP | elephc | Manticore |
| --- | --- | --- | --- |
| Collision handling | Chains of Bucket indices | Linear probing in the entry array | Linear probing in a separate index |
| Insertion order | Ordered Bucket sequence | prev/next links inside entries | Ordered entry sequence |
| Small-map lookup | Hash index | Hash table | Linear scan below 8 entries |
| Growth/index policy | Bucket capacity growth or hole compaction | Doubles when count*4 >= capacity*3 | Index built lazily; power-of-two index >= max(16, 2*len) |
| Erasure nuance | Holes, later compaction | Deleted slots plus order-link repair | Tombstones and index backshift; eventual compaction |

The 1000-entry example explicitly assumes entry capacities **1024 / 2048 /
1024**. Zend has 2048 4-byte index entries; Manticore's built index has 2048
8-byte entries. Manticore's 24-byte entry saves 8 bytes relative to a Zend
Bucket, but its index uses 8192 extra bytes at these capacities. The totals
coincide for this specified state, not for every size or workload.

The elephc 64-byte slots and 75% growth threshold use more structural memory
in this example. This is not a demonstrated speed regression: hashing,
collisions, tombstones, key lengths, locality and copy-on-write need timed
workloads. Existing `array_foreach`, `array_index` and `array_write` cases use
packed integers and cannot rank hash-map performance.

## Object speed is a separate observation

The corrected 2026-09-23 `method_call` timings are 231.6 ms (PHP JIT),
1178.6 ms (TypePHP native), 4757.3 ms (elephc), 64.4 ms (Manticore), for
20 million calls alternating two final classes. The two objects have **no
properties**, are created before the loop, and do not test field density or
allocation throughput. Manticore's 3.6x advantage over JIT here must not be
attributed to packing without another experiment. These are historical
measurements of the versions in `dev/BENCHMARKS.md`, not the current snapshots.

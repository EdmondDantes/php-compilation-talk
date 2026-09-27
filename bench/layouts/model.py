"""Nominal structural bytes on 64-bit systems, not RSS or allocator usage.

One owning carrier; no shared class metadata, dynamic properties, narrow
TypeDefs, special classes, key strings, pointee contents or allocator rounding.
TypePHP uses Zend; Manticore allocations use the RC path. Hash capacities are
explicit model inputs, not an observation of a compiled workload.
"""
import json

# Columns: TypePHP/Zend, elephc, Manticore.
result = {
    "dynamic_value": [16, 8 + 24 + 16, 8],
    "object_three_int_fields": [
        16 + 40 + 3 * 16,
        8 + 16 + 8 + 3 * 16,
        8 + 8 + 16 + 3 * 8,
    ],
    "packed_int_capacity_1024": [
        16 + 56 + 8 + 1024 * 16,
        8 + 16 + 24 + 1024 * 8,
        8 + 8 + 56 + 1024 * 8,
    ],
    "hash_1000_entries": [
        16 + 56 + 1024 * (32 + 8),
        8 + (16 + 64) + (16 + 2048 * 64),
        8 + 8 + 56 + 1024 * 24 + 2048 * 8,
    ],
}
print(json.dumps(result, indent=2))

# Focused compiler critique and reading selection — 2026-09-27

## Scope and evidence

Read-only review of refreshed source checkouts, selected regression tests,
compatibility contracts and implementation histories. No compiler build,
new executable reproduction, live TLS test or performance rerun was performed.
Examples below are regression-test proposals, not claimed observed output.

Pinned snapshots:

- TypePHP: `8b33cad5c4f9cd2be2980425f522496e9ba0bfce` (0.9.3).
- elephc: `2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7` (main; Cargo says 0.27.0).
- Manticore: `69310ffc446cca9ad517102b09753340dd2ad1b5` (main).

The findings are not all newly discovered bugs. Some are explicit existing
limitations; historical incidents are labelled separately. No inference is made
that self-hosting, a green build or passing a particular corpus proves general
PHP compatibility.

## E1 — elephc: TLS options can disable more validation than requested

**Priority:** P1. **Status:** current dispatch/verifier behavior established by
source inspection; network reproduction pending.

Without the earlier `cafile`/`capath` branches taking precedence, a string-valued
`allow_self_signed` selects the insecure connector merely by being present.
Its contents are not examined: `"0"` and `""` also select that path. Separately,
`verify_peer_name="0"` selects the same connector, disabling certificate
validation as well as hostname checking.

The connector installs `NoVerification`, whose certificate and TLS handshake
signature callbacks return success. This exceeds the ordinary PHP contract:
allowing self-signed certificates is not the same as disabling peer validation,
and disabling hostname checks is not the same as disabling chain checks.
The default connector is secure; this finding concerns the option dispatch.
Do not generalize the string case to boolean `false`: the lookup helper treats
non-string values as absent, another compatibility boundary.

Evidence:

- [AArch64 dispatch, lines 106–132; x86-64 counterpart, 341–366](https://github.com/illegalstudio/elephc/blob/2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7/src/codegen_support/runtime/io/https.rs#L106)
- [String-only option lookup](https://github.com/illegalstudio/elephc/blob/2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7/src/codegen_support/runtime/io/stream_context_get_string_option.rs#L17)
- [NoVerification callbacks](https://github.com/illegalstudio/elephc/blob/2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7/crates/elephc-tls/src/lib.rs#L62)
- [PHP SSL option contract](https://www.php.net/manual/en/context.ssl.php)

Repair: normalize option values and separate chain, hostname and self-signed
policies. Never choose total bypass just because an option key exists.
Cost: medium; both targets and the bridge policy need tests.
Acceptance: local TLS fixtures with trusted, untrusted, expired, self-signed and
wrong-host certificates; compare boolean and string option values against PHP.
A closed TCP port is insufficient: it never reaches certificate validation.

## M1 — Manticore: property visibility is not an enforced boundary

**Priority:** P1 for PHP compatibility. **Status:** current known limitation,
corroborated by property codegen and serializer design; fresh execution pending.

For a known receiver and declared property, codegen computes the field offset
and loads the slot. It does not check the caller's scope against the property's
visibility. The serializer explicitly relies on a free function being able to
read private slots. Therefore accepting `private` syntax is not evidence of
PHP's access rules. This concerns properties, not every method call: current
dynamic-method dispatch does contain visibility machinery.

Minimal test proposal:

```php
class Box { private int $value = 7; }
echo (new Box())->value;
```

PHP must reject the outside access. Also test an inaccessible declared property
with `__get`: PHP should use the overload, not read the slot directly.

Evidence:

- [Direct property access path](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/src/Compile/Mir/Passes/EmitLlvmObjects.php#L1065)
- [Direct offset/load](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/src/Compile/Mir/Passes/EmitLlvmObjects.php#L1166)
- [Serializer explicitly relies on absent property visibility](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/src/Compile/Mir/Passes/LowerPrelude.php#L540)
- [Asymmetric-visibility test says write scope is not enforced](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/tests/aot/cases/asymmetric_visibility.php#L2)

Repair: model lexical access scope and route inaccessible accesses to errors or
magic methods as appropriate. Cost: medium/high; inheritance, traits, closures,
read/write access and dynamic receivers must agree. Acceptance: differential
positive and negative access cases, including `private(set)`.

## M2 — Manticore: zero-filled fields erase PHP's uninitialized state

**Priority:** P1 for PHP compatibility. **Status:** current known limitation,
corroborated by initialization/read code; fresh execution pending.

Ordinary property slots are zeroed; cell-like slots receive null. An ordinary
int property therefore lacks a separate uninitialized state. PHP distinguishes
an uninitialized typed field from an explicitly assigned zero. That distinction
also affects serialization, `isset`, reflection and `unset`.

Test proposal:

```php
class Box { public int $value; }
var_dump((new Box())->value);
```

PHP must throw rather than return zero. Compact fields alone are not an
apples-to-apples efficiency result while this semantic distinction is absent.

Evidence:

- [Initialization of each property slot](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/src/Compile/Mir/Passes/EmitLlvmObjects.php#L86)
- [Read path](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/src/Compile/Mir/Passes/EmitLlvmObjects.php#L1166)
- [Roadmap's typed-property serialization gap](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/docs/ROADMAP.md#L169)

Repair: explicit initialization state, not another ordinary field value used as
a universal sentinel. Cost: high across layout, reflection, serialization and
self-hosted ABI validation. Acceptance: uninitialized, assigned zero, assigned
null where permitted, unset, cloning and serialization compared with PHP.

## T1 — TypePHP: native arithmetic exposes C++ error behavior

**Priority:** P1 migration/safety risk. **Status:** current intentional native
numeric policy with a sharp runtime boundary, not an undisclosed promise to
preserve PHP arithmetic. No new executable reproduction.

Dynamic integer operands in the default native mode fall through to raw C++
operators. PHP-compatible Variant arithmetic is selected by `varint_types`.
Constant invalid operations are rejected, but a runtime zero divisor cannot be
handled by a constant guard. A raw C++ integer division by zero is undefined
behavior, not PHP's catchable `DivisionByZeroError`; ordinary integer division
also truncates. A native return conversion afterward cannot repair it.

Evidence:

- [Mode-dependent arithmetic and raw fallback](https://github.com/swoole/typephp/blob/8b33cad5c4f9cd2be2980425f522496e9ba0bfce/src/Parser/BinaryOpTrait.php#L201)
- [Literal-zero guard and mode distinction](https://github.com/swoole/typephp/blob/8b33cad5c4f9cd2be2980425f522496e9ba0bfce/src/Parser/BinaryOpTrait.php#L1437)
- [Intentional-rule classification](https://github.com/swoole/typephp/blob/8b33cad5c4f9cd2be2980425f522496e9ba0bfce/docs/en/PHP_INCOMPATIBILITY_CLASSIFICATION.md#L74)

Repair: specify defined native failure behavior and insert checks, or require an
explicit unsafe numeric opt-in. Cost: medium; arithmetic codegen and the numeric
contract both change. Acceptance: runtime-supplied zero, MIN/-1 and shift counts,
with sanitizers and both native/varint modes; do not test literals alone.

## Additional design boundaries worth discussing

- TypePHP deliberately changes other PHP behavior: a null array key means append
  rather than the empty-string key; `eval` cannot transparently inspect native
  stack locals. These are documented language choices, not newly found defects.
- elephc has a substantial handwritten runtime and an optional interpreter for
  eval. Fixing native semantics alone does not fix the interpreter automatically.
- Manticore's compact layout, self-hosting and LLVM backend do not establish
  behavior for all PHP source programs. Its own current docs and code provide
  counterexamples above.
- Historical benchmark timings in this talk were not rerun against these source
  snapshots. Do not use them as a current performance regression finding.

## Selected reading: surprising, with status attached

1. **TypePHP: extracting methods into traits broke its self-hosted reference
   outputs.** The documented repair replaced internal output parameters with
   return values; cross-trait handling remains labelled Partial.
   [Read the five-step account](https://github.com/swoole/typephp/blob/8b33cad5c4f9cd2be2980425f522496e9ba0bfce/docs/en/PHP_INCOMPATIBILITY_CLASSIFICATION.md#L115).
2. **Manticore: printing the character hid the bug.** Historical, fixed path:
   string use disabled byte-demotion, hiding the second emitter's index bug.
   [Read the incident](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/docs/design/unknown-cell-soundness.md#L648).
3. **elephc: an emoji changed JSON escaping flags.** Historical fix, documented
   under 0.26.5; AArch64 register reuse, not an encoding policy.
   [Read](https://github.com/illegalstudio/elephc/blob/2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7/CHANGELOG.md#L86).
4. **elephc: a missing file produced varying timestamps.** Historical fix in
   0.26.5: failed stat exposed uninitialized stack contents.
   [Read](https://github.com/illegalstudio/elephc/blob/2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7/CHANGELOG.md#L99).
5. **elephc: the TLS fail-closed test uses a closed port.** Current test checks
   connector dispatch/linkage, as its comment admits; it cannot check certificates.
   [Read](https://github.com/illegalstudio/elephc/blob/2ba0344b7a363a18f504e1aa2b319cd8fb6c2ea7/tests/codegen/io/streams.rs#L4583).
6. **Manticore: scanning two megabytes needed about 100 MB RSS.** The source
   comment reports that historical measurement, versus PHP's 29 MB, motivating
   conversion of unobserved one-character strings into bytes. These are the
   project's numbers, not ours, and not a claim about the optimized path today.
   [Read the optimization's rationale](https://github.com/manticorephp/compiler/blob/69310ffc446cca9ad517102b09753340dd2ad1b5/src/Compile/Mir/Passes/DemoteCharLocals.php#L17).

## Claims deliberately not promoted to current findings

Manticore's old document describes tagged arithmetic behind `false &&`; current
`InferTypes::arithType` has enabled the relevant path. Several old ownership,
reflection and callable notes are also stale. PDO MySQL's insecure certificate
settings in elephc were not treated as a default bypass: they are conditional on
an explicit disabled-verification option. Fixed historical defects above must
not be presented as fresh failures of the reviewed commits.

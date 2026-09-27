# Ecosystem and concrete compatibility presentation evidence

Updated 2026-09-28. Distinguish historical documentation, source review and
executed probes. These changes do not refresh the performance benchmark suite.

## Research and Deno

- [Meyerovich and Rabkin, OOPSLA 2013](https://lmeyerov.github.io/projects/socioplt/papers/oopsla2013.pdf): separate repository datasets (213,471 SourceForge and 590,000 Ohloh projects) and surveys up to 13,000 respondents. Association with adoption is not a universal claim that intrinsic language properties never matter.
- [Deno 1.0](https://deno.com/blog/v1): generally incompatible with Node/npm, but already described an early compatibility layer and expected more Node programs to work over time. Do not claim compatibility was permanently rejected.
- [Deno 1.28](https://deno.com/blog/v1.28): npm compatibility stabilized.
- [Deno 2](https://deno.com/blog/v2.0): existing ecosystem compatibility matters, with gRPC/AWS SDK examples. The original goals were retained, not all abandoned.

The dinosaur comic and dialogue are invented parody. Its chronology is backed
by the release posts. All numbers retain their source dates.

## Concrete restrictions

TypePHP: the pinned 0.9.3 `docs/en/INCOMPATIBLE_PHP_FEATURES.md` in
`/tmp/typephp-architecture-20260927` corroborates variable-variable,
Closure::bind, top-level statement, strict-types and native-value restrictions.
See [the existing source review](typephp-architecture-2026-09.md).

KPHP: the existing [compiler inventory](php-compilers.md) and the project's
[unsupported-features documentation](https://vkcom.github.io/kphp/kphp-language/best-practices/what-kphp-doesnt-support.html)
cover eval, reflection and dynamic declarations. The documentation endpoint
could not be fetched in this turn; these claims retain the earlier review basis.

For elephc 0.27.0 at `8d19942c2ff7d91ccbef71d08587dfde73e048ce`, local docs
explicitly reject `goto`, reference elements in array literals (`[&$x]`),
and `__unset()`. Sources:
[control structures](https://github.com/illegalstudio/elephc/blob/8d19942c2ff7d91ccbef71d08587dfde73e048ce/docs/php/control-structures.md),
[arrays](https://github.com/illegalstudio/elephc/blob/8d19942c2ff7d91ccbef71d08587dfde73e048ce/docs/php/arrays.md),
[classes](https://github.com/illegalstudio/elephc/blob/8d19942c2ff7d91ccbef71d08587dfde73e048ce/docs/php/classes.md).
The eval path is hybrid, not globally unsupported; see the current-source
[compiler review](compiler-canvas-2026-09.md).

Manticore's `extract()` gap is in its 0.11 release README. Uninitialized/private
property observations remain the source review of `69310ff`, not new runtime
tests; details are preserved in the parked original slide.

## New executed checks

[Probe sources and output](../../bench/semantic-probes/README.md): the shown
foreach-mutation example agrees between PHP and TypePHP 0.9.2. Native integer
division disagrees: `7 / 2` returns `3` from a declared float function instead
of PHP's `3.5`. Slides were removed/clarified accordingly.

Overflow results are the existing September 23 measurements, not fresh runs:
PHP and TypePHP varint are positive float, native TypePHP produces zero, and
elephc 0.27.0 produces the incorrect negative float on repeated doubling.
The observed elephc error does not invalidate every checked arithmetic path.

## Historical project stories

HipHop facts retain [the inventory's named sources](php-compilers.md#dead):
~1.5 GB deployed executable; gcc rebuilding affected iteration; <20 minutes
was a deployment-cadence requirement quoted for the HHVM migration, not a
universal timing for all HPHPc builds. HPHPc retired in February 2013.

JPHP's [README](https://github.com/jphp-group/jphp) names DevelNext as the
production use case and excludes implementing Zend's entire runtime library.
GitHub API checked on this turn: JPHP default branch last commit is
`eefaac6d8195025ba53c2b7b0996a9c128b2ffb7`, 2020-07-07; the linked
[develnext-ide repository](https://github.com/jphp-group/develnext-ide) is
`8a9127799cb64aba22b725e11a181e14197aa3e0`, 2020-10-22. Do not confuse it
with the older `develnext` repository, last updated 2018. Their shared period
of inactivity suggests dependency on the product; it does not prove causality.
The 1,710-star figure is explicitly the August 25 inventory snapshot.

KPHP's product-owner argument and dialect limits retain the inventory's basis.
Dumbledore and the PHP elephant protest sign are comic metaphors,
not reconstructions of historical scenes. The final assets contain neither
Zuckerberg nor Durov, and the Laravel machine image contains no person.

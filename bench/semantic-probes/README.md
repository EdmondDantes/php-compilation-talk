# Focused semantic probes — 2026-09-27/28

Executed while editing the compatibility slides. These are correctness probes,
not performance benchmarks or a general compatibility certification.

Environment: PHP 8.4 CLI; TypePHP 0.9.2 at
`43e85b8866de03b933aa93f3985fa0a5adec1853`, ordinary Zend-backed binary,
native scalar default, `-O2 -j 2`. Both compilations succeeded. The linked
private PHP/PHPX environment is described by `../env-2026-09.sh`.

## Mutation during foreach

`foreach-mutation.php` preserves the slide's mutation operations and adds
an iteration trace plus final JSON. Both PHP and the TypePHP binary printed:

```text
0:10
2:30
3:40
{"0":10,"2":30,"3":40}
```

Therefore this specific example does not demonstrate a TypePHP failure.
It was removed from the active deck. Other foreach/reference cases were not
inferred to work from this result.

## Native integer division

`native-division.php` obtains both inputs from environment variables at runtime
to avoid constant folding. With `PROBE_A=7 PROBE_B=2`, PHP printed `3.5` and
TypePHP native printed `3`. The declared float return type does not recover
the fractional part lost by integer division.

Run the PHP baselines with `php8.4 -r 'require "...php"; main();'`.
For TypePHP, source the September environment and invoke its `bin/tpc.php`
with `-O2 -j 2 -o <output> --build-dir <temporary-directory>` on each source.
No checks for division by zero or varint-mode division were run here.

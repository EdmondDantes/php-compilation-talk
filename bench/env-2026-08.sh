# Source this before run.py to measure the August 2026 toolchains: TypePHP 0.6.7,
# elephc 0.26.5, PHP 8.4.22. Its twin, env-2026-09.sh, names the September builds;
# each file sets its generation's paths outright, so sourcing one after the other in
# the same shell switches cleanly instead of keeping the first one's values.
#
# Nothing here is installed system-wide: PHP_HOME is a private PHP 8.4 built with
# --enable-embed=shared (the distribution package ships CLI only), PHPX_HOME is the
# C++ runtime TypePHP links against, and CPATH/LIBRARY_PATH carry the mpfr headers
# that libphpx needs and that this machine has only as a runtime package.
#
# The machine-wide paths below are overridable before sourcing; the generation's
# own paths are not, because a mix of two generations is not a measurement of either.

: "${BENCH_PHP:=/usr/bin/php8.4}"
: "${BENCH_SCRATCH:=$HOME/.cache/php-compilation-talk-bench}"
: "${PHP_HOME:=$HOME/.typephp}"
: "${LOCALDEV:=$BENCH_SCRATCH/localdev}"

BENCH_PROFILE=2026-08
BENCH_PHP_EXTRA=""
MANTICORE_BIN=""
TYPEPHP_ROOT="$BENCH_SCRATCH/typephp"
ELEPHC_BIN="$BENCH_SCRATCH/elephc/target/release/elephc"
PHPX_HOME="$TYPEPHP_ROOT/vendor/swoole/phpx"

# 0.6 keeps PHP int semantics by default and compiles int as int64_t on request.
TYPEPHP_PHP_INTS=""
TYPEPHP_NATIVE_INTS="use native_types;"

export BENCH_PHP BENCH_PROFILE BENCH_PHP_EXTRA TYPEPHP_ROOT ELEPHC_BIN MANTICORE_BIN PHP_HOME PHPX_HOME
export TYPEPHP_PHP_INTS TYPEPHP_NATIVE_INTS
export CPATH="$LOCALDEV/root/usr/include"
# Shared-object symlinks only. Never point this at the unpacked .deb tree: it also
# holds the static libmpfr.a, ld prefers the archive, and a non-PIC archive breaks
# the link of libphpx with an error that names gmp instead of mpfr.
export LIBRARY_PATH="$LOCALDEV/lib"
export LD_LIBRARY_PATH="$PHPX_HOME/lib:$PHP_HOME/lib"

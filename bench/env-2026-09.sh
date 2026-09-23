# Source this before run.py to measure the September 2026 toolchains: TypePHP 0.9.2
# (43e85b88), elephc 0.27.0 (8d19942c2), Manticore 0.11.0 (the release tarball),
# PHP 8.4.22 as the baseline and PHP 8.5.10 beside it. The August builds stay where
# env-2026-08.sh names them; these live under $BENCH_SCRATCH/2026-09, so either
# generation can be rerun on any day.
#
# Same layout and the same private PHP 8.4 embed build as env-2026-08.sh, whose
# header explains the pieces. PHP 8.5.10 is the Ubuntu PPA package unpacked with
# dpkg -x, not installed; its OPcache is compiled in, which run.py detects.

: "${BENCH_PHP:=/usr/bin/php8.4}"
: "${BENCH_SCRATCH:=$HOME/.cache/php-compilation-talk-bench}"
: "${PHP_HOME:=$HOME/.typephp}"
: "${LOCALDEV:=$BENCH_SCRATCH/localdev}"

BENCH_PROFILE=2026-09
GENERATION="$BENCH_SCRATCH/2026-09"
BENCH_PHP_EXTRA="$GENERATION/php85/root/usr/bin/php8.5"
TYPEPHP_ROOT="$GENERATION/typephp"
ELEPHC_BIN="$GENERATION/elephc/target/release/elephc"
# The linux-amd64 tarball of the v0.11.0 release, checked against its SHA256SUMS.
# It assembles with the host clang (18 here) and links the host's pcre2 and OpenSSL.
MANTICORE_BIN="$GENERATION/manticore/manticore-0.11.0-linux-amd64/bin/manticore"
PHPX_HOME="$TYPEPHP_ROOT/vendor/swoole/phpx"

# 0.9 inverted the default: int is int64_t unless the file asks for PHP's widening,
# and `use native_types` is now a compile error.
TYPEPHP_PHP_INTS="use varint_types;"
TYPEPHP_NATIVE_INTS=""

export BENCH_PHP BENCH_PROFILE BENCH_PHP_EXTRA TYPEPHP_ROOT ELEPHC_BIN MANTICORE_BIN PHP_HOME PHPX_HOME
export TYPEPHP_PHP_INTS TYPEPHP_NATIVE_INTS
export CPATH="$LOCALDEV/root/usr/include"
# Shared-object symlinks only; see env-2026-08.sh.
export LIBRARY_PATH="$LOCALDEV/lib"
export LD_LIBRARY_PATH="$PHPX_HOME/lib:$PHP_HOME/lib"

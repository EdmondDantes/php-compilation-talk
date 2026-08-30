# Source this before run.py. It names the three toolchains the benchmark drives.
#
# Nothing here is installed system-wide: PHP_HOME is a private PHP 8.4 built with
# --enable-embed=shared (the distribution package ships CLI only), PHPX_HOME is the
# C++ runtime TypePHP links against, and CPATH/LIBRARY_PATH carry the mpfr headers
# that libphpx needs and that this machine has only as a runtime package.
#
# Override any of these before sourcing; the file only fills in what is unset.

: "${BENCH_PHP:=/usr/bin/php8.4}"
: "${BENCH_SCRATCH:=$HOME/.cache/php-compilation-talk-bench}"
: "${PHP_HOME:=$HOME/.typephp}"
: "${TYPEPHP_ROOT:=$BENCH_SCRATCH/typephp}"
: "${ELEPHC_BIN:=$BENCH_SCRATCH/elephc/target/release/elephc}"
: "${MPFR_PREFIX:=$BENCH_SCRATCH/localdev/root/usr}"

PHPX_HOME="${PHPX_HOME:-$TYPEPHP_ROOT/vendor/swoole/phpx}"

export BENCH_PHP TYPEPHP_ROOT ELEPHC_BIN PHP_HOME PHPX_HOME
export CPATH="$MPFR_PREFIX/include${CPATH:+:$CPATH}"
export LIBRARY_PATH="$MPFR_PREFIX/lib/x86_64-linux-gnu${LIBRARY_PATH:+:$LIBRARY_PATH}"
export LD_LIBRARY_PATH="$PHPX_HOME/lib:$PHP_HOME/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

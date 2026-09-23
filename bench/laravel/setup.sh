#!/usr/bin/env bash
# Rebuilds the Laravel application of dev/research/typephp-laravel.md and both of
# its TypePHP builds: laravel_whole (attempt A, the application as one binary) and
# hot.so (attempt B, one class as an extension beside an unchanged Laravel).
#
# Uses the September toolchain; the private PHP 8.4 embed build serves Laravel,
# because hot.so must load into the same PHP that libphp was built from.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
. "$here/../env-2026-09.sh"

dest="${1:-$BENCH_SCRATCH/2026-09/laravel}"
php="$PHP_HOME/bin/php"
composer=(env COMPOSER_NO_INTERACTION=1 "$php" -d error_reporting=0 "$(command -v composer)")

"${composer[@]}" create-project laravel/laravel:v13.10.1 "$dest" --no-install --no-scripts
cp -r "$here/overlay/." "$dest/"
cat "$here/overlay/routes-bench.php" >> "$dest/routes/web.php"
rm "$dest/routes-bench.php"

cd "$dest"
"${composer[@]}" install --no-progress
cp .env.example .env
sed -i 's/^SESSION_DRIVER=.*/SESSION_DRIVER=array/' .env
touch database/database.sqlite
"$php" artisan key:generate
"$php" artisan migrate --force

"$php" "$TYPEPHP_ROOT/bin/tpc.php" tp-whole-built.yml --no-progress --no-color
"$php" "$TYPEPHP_ROOT/bin/tpc.php" tp-hot.yml --no-progress --no-color

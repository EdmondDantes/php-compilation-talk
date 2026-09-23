#!/usr/bin/env python3
"""Times Manticore's own `loop` case the way its bench/run.sh does, and against the JIT.

loop.php is bench/cases/loop.php of manticorephp/compiler, unchanged. Manticore's
README reports it at 22.8x over PHP 8.5, timing whole processes and running `php`
with no flags, so OPcache and the JIT are off there. This script times the same
whole processes, startup included, against PHP 8.5 without OPcache, with it, and
with the tracing JIT.

Usage, after sourcing env-2026-09.sh:
    python3 manticore-loop/measure.py results/<date>-manticore-loop.json
"""

import json
import os
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from run import PHP_REPEATS, busy_share, measure, split_modes  # noqa: E402

HERE = Path(__file__).resolve().parent


def main():
    source = HERE / "loop.php"
    php85 = os.environ["BENCH_PHP_EXTRA"].split()[0]
    binary = Path(tempfile.mkdtemp(prefix="manticore-loop-")) / "loop"
    subprocess.run([os.environ["MANTICORE_BIN"], "compile", str(source), "-o", str(binary)],
                   check=True, capture_output=True)
    # PHP 8.5 compiles OPcache in, so unlike run.py's 8.4 columns nothing is loaded.
    opcache = ["-n", "-d", "opcache.enable_cli=1"]
    configs = {
        "manticore": ([str(binary)], 7),
        "php85 bare (-n)": ([php85, "-n", str(source)], PHP_REPEATS),
        "php85 opcache": ([php85, *opcache, "-d", "opcache.jit=disable", str(source)], PHP_REPEATS),
        "php85 jit": ([php85, *opcache, "-d", "opcache.jit_buffer_size=64M", "-d", "opcache.jit=tracing",
                       str(source)], PHP_REPEATS),
    }
    out = {"busy_before": busy_share()}

    for name, (argv, repeats) in configs.items():
        samples, output, code = measure(argv, repeats)

        if code != 0:
            out[name] = {"status": "failed", "output": output}
            print(f"{name:18} failed: {output}", flush=True)
            continue

        modes = split_modes(samples)
        out[name] = {
            "min_s": min(samples),
            "median_s": statistics.median(samples),
            "output": output,
            "split": None if modes is None else [len(modes[0]) / len(samples),
                                                 statistics.median(modes[0]), statistics.median(modes[1])],
            "samples_s": sorted(samples),
        }
        print(f"{name:18} min {min(samples):.3f} s  median {statistics.median(samples):.3f} s  out={output}",
              flush=True)

    out["busy_after"] = busy_share()
    Path(sys.argv[1]).write_text(json.dumps(out, indent=2))

    return 0


if __name__ == "__main__":
    sys.exit(main())

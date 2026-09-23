#!/usr/bin/env python3
"""Times one Laravel route under Zend, with a TypePHP extension, and as a TypePHP binary.

The route calls `App\\Support\\Hot::checksum($n)`, the int loop of
bench/cases/int_arith, so `n` sets how much of a request is the hot code: at
n=1000 the request is almost all framework, at n=1,000,000 the loop dominates.

Two shapes of process are measured, because they answer different questions:

- `cold`: one request per process, the price of starting and bootstrapping
  Laravel every time, as a CLI command or a fresh worker pays it;
- `warm`: the same process serves many requests, as a php-fpm worker or an
  Octane server does. The per-request figure is (t(K+1) - t(1)) / K, so the
  bootstrap cancels out.

Every configuration uses the private PHP 8.4 that the binary links: hot.so must
load into the PHP it was built against, and the comparison must not mix builds.
PHP gets OPcache with a warm file cache, the closest a CLI process comes to a
php-fpm worker whose scripts are already compiled; the binary carries its opcodes
embedded, which is the same state.
"""

import argparse
import json
import os
import statistics
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from run import busy_share, measure, run_once, split_modes  # noqa: E402

WARM_REQUESTS = 200
PATHS = {"n1e3": "/bench?n=1000", "n1e6": "/bench?n=1000000"}


def configurations(app, php, file_cache):
    opcache = ["-n", "-d", "zend_extension=opcache.so", "-d", "opcache.enable_cli=1",
               "-d", f"opcache.file_cache={file_cache}"]
    jit = [*opcache, "-d", "opcache.jit_buffer_size=64M", "-d", "opcache.jit=tracing"]
    hot = ["-d", f"extension={app / 'hot.so'}"]
    driver = str(app / "serve-bench.php")

    return {
        "php-opcache": [php, *opcache, "-d", "opcache.jit=disable", driver],
        "php-jit": [php, *jit, driver],
        "php-opcache+hot.so": [php, *opcache, "-d", "opcache.jit=disable", *hot, driver],
        "php-jit+hot.so": [php, *jit, *hot, driver],
        "typephp-binary": [str(app / "laravel_whole")],
    }


def describe(samples):
    row = {"n": len(samples), "samples_s": [round(s, 6) for s in sorted(samples)],
           "min_s": round(min(samples), 6), "median_s": round(statistics.median(samples), 6)}
    modes = split_modes(samples)

    if modes is not None:
        fast, slow = modes
        row["split"] = {"fast_share": round(len(fast) / len(samples), 3),
                        "fast_median_s": round(statistics.median(fast), 6),
                        "slow_median_s": round(statistics.median(slow), 6)}

    return row


def last_line(output):
    """The binary prints `$_ENV` warnings on stdout before the body; the body is last."""
    return output.strip().splitlines()[-1] if output.strip() else ""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("app", type=Path, help="the application built by setup.sh")
    parser.add_argument("--repeats", type=int, default=15)
    parser.add_argument("--json", required=True)
    args = parser.parse_args()

    app = args.app.resolve()
    php = str(Path(os.environ["PHP_HOME"]) / "bin" / "php")
    file_cache = Path(tempfile.mkdtemp(prefix="laravel-opcache-"))
    configs = configurations(app, php, file_cache)
    busy_before = busy_share()
    results = {}

    for label, path in PATHS.items():
        # One discarded run per configuration fills the file cache and the page cache.
        for argv in configs.values():
            measure([*argv, path, "1"], 1, cwd=app)

        # Configurations take turns within each repeat, as in run.py, so a burst of
        # outside load is spread over all of them instead of one configuration's row.
        samples = {name: {"cold": [], "one": [], "many": [], "busy": []} for name in configs}
        outputs = {}
        failed = set()

        for _ in range(args.repeats):
            for name, argv in configs.items():
                if name in failed:
                    continue

                cold, output, code, busy = run_once([*argv, path, "1"], cwd=app)
                one, _, _, busy_one = run_once([*argv, path, "1"], cwd=app)
                many, _, code_many, busy_many = run_once([*argv, path, str(WARM_REQUESTS + 1)], cwd=app)

                if code != 0 or code_many != 0:
                    failed.add(name)
                    outputs[name] = output
                    continue

                outputs[name] = output
                sample = samples[name]
                sample["cold"].append(cold)
                sample["one"].append(one)
                sample["many"].append(many)
                sample["busy"].append(max(busy, busy_one, busy_many))

        for name in configs:
            if name in failed:
                results.setdefault(label, {})[name] = {"status": "failed", "output": outputs[name]}
                print(f"{label} {name:20} failed", flush=True)
                continue

            sample = samples[name]
            per_request = (statistics.median(sample["many"]) - statistics.median(sample["one"])) / WARM_REQUESTS
            results.setdefault(label, {})[name] = {
                "status": "ok",
                "output": last_line(outputs[name]),
                "cold": describe(sample["cold"]),
                "warm_per_request_s": round(per_request, 7),
                "warm_runs": {"one": describe(sample["one"]), "many": describe(sample["many"])},
                "busy_per_repeat": sample["busy"],
            }
            split = " SPLIT" if "split" in results[label][name]["cold"] else ""
            print(f"{label} {name:20} cold min {min(sample['cold']) * 1000:7.1f} ms{split}   "
                  f"warm {per_request * 1000:7.3f} ms/request   busy max {max(sample['busy']):.2f}   "
                  f"out={last_line(outputs[name])}", flush=True)

    busy_after = busy_share()
    outputs = {row["output"] for rows in results.values() for row in rows.values() if row["status"] == "ok"}
    payload = {
        "busy_share": {"before": busy_before, "after": busy_after},
        "php": php,
        "warm_requests": WARM_REQUESTS,
        "paths": PATHS,
        "configurations": {name: argv for name, argv in configs.items()},
        "results": results,
    }
    Path(args.json).write_text(json.dumps(payload, indent=2))
    print(f"busy before {busy_before:.2f}, after {busy_after:.2f}; distinct outputs {sorted(outputs)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

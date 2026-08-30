#!/usr/bin/env python3
"""Compares one PHP loop across Zend, TypePHP, elephc and C on a single machine.

Every case is a `body.php` written once and wrapped per engine, so the measured
source is byte-identical everywhere except for the wrapper a compiler demands.
A run reports the loop time with the engine's own startup subtracted: the
startup of an empty program is measured separately and removed, because a
native binary starts in a millisecond and a PHP process does not, and that
difference says nothing about the loop.
"""

import argparse
import json
import os
import shutil
import statistics
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CASES = ROOT / "cases"

# Startup is measured with an empty program of the same engine and subtracted
# from every case, so the table compares loops rather than process boot.
EMPTY_BODY = 'echo "0\\n";'


class Engine:
    """One way of running a case: how its source is written, built and invoked.

    `name` is the column in the report. `build` receives the case body and a
    scratch directory and returns the argv to run, or None when the engine
    cannot express this case — a skip, never a zero.
    """

    def __init__(self, name, kind, build, body_file="body.php"):
        self.name = name
        self.kind = kind
        self.build = build

        # A variant that rewrites the source names its own body; a case without that
        # file is reported unsupported rather than silently measured on the shared one.
        self.body_file = body_file


def php_wrapper(body):
    return "<?php\n" + body + "\n"


def typephp_wrapper(body, directives=""):
    indented = "\n".join(("    " + line) if line.strip() else "" for line in body.splitlines())

    return "<?php\n" + directives + "\nfunction main(): int\n{\n" + indented + "\n\n    return 0;\n}\n"


def run_once(argv, cwd=None):
    started = time.perf_counter()
    result = subprocess.run(argv, cwd=cwd, capture_output=True, text=True)
    elapsed = time.perf_counter() - started

    return elapsed, result.stdout.strip(), result.returncode


def measure(argv, repeats, cwd=None):
    """Returns (min seconds, median seconds, stdout, returncode) over `repeats` runs.

    The minimum is the estimate used for reporting — noise on a shared machine
    only ever adds time. The median travels with it so a wide spread is visible.
    """
    samples = []
    output = ""
    code = 0

    for _ in range(repeats):
        elapsed, output, code = run_once(argv, cwd)
        samples.append(elapsed)

        if code != 0:
            break

    return min(samples), statistics.median(samples), output, code


def make_php_engine(name, binary, extra_args):
    def build(body, workdir):
        source = workdir / "case.php"
        source.write_text(php_wrapper(body))

        return [binary, *extra_args, str(source)]

    return Engine(name, "php", build)


EMPTY_C = '#include <stdio.h>\n\nint main(void)\n{\n    printf("0\\n");\n    return 0;\n}\n'


def make_c_engine(name, cflags):
    def build(body, workdir, case_dir=None):
        if body == EMPTY_BODY:
            source = workdir / "empty.c"
            source.write_text(EMPTY_C)
        else:
            source = case_dir / "main.c"

        if not source.exists():
            return None

        binary = workdir / "case_c"
        compiled = subprocess.run(["gcc", *cflags, "-o", str(binary), str(source)],
                                  capture_output=True, text=True)

        if compiled.returncode != 0:
            return None

        return [str(binary)]

    return Engine(name, "c", build)


def make_typephp_engine(name, tpc_php, tpc_root, php_binary, directives, opt_flags, body_override=None):
    """`body_override` names an alternative body file, for variants that rewrite the source.

    The std-container variant is such a rewrite: it swaps the PHP array for
    `std::vector`, so it measures a different program and is reported as its own
    column rather than folded into the compiled-PHP number.
    """

    def build(body, workdir):
        source = workdir / "case.php"
        source.write_text(typephp_wrapper(body, directives))

        binary = workdir / "case_tp"

        compiled = subprocess.run(
            [php_binary, str(tpc_php), str(source), *opt_flags, "-o", str(binary),
             "--no-progress", "--no-color", "--build-dir", str(workdir / "build")],
            cwd=str(tpc_root), capture_output=True, text=True)

        if compiled.returncode != 0 or not binary.exists():
            (workdir / "tpc.log").write_text(compiled.stdout + compiled.stderr)
            return None

        return [str(binary)]

    return Engine(name, "typephp", build, body_override or "body.php")


def make_elephc_engine(name, elephc_bin, opt_flags):
    def build(body, workdir):
        source = workdir / "case.php"
        source.write_text(php_wrapper(body))

        # elephc has no output flag: the binary lands beside the source, minus the .php suffix.
        binary = workdir / "case"

        compiled = subprocess.run([elephc_bin, str(source), *opt_flags],
                                  capture_output=True, text=True)

        if compiled.returncode != 0 or not binary.exists():
            (workdir / "elephc.log").write_text(compiled.stdout + compiled.stderr)
            return None

        return [str(binary)]

    return Engine(name, "elephc", build)


def build_argv(engine, body, workdir, case_dir):
    if engine.kind == "c":
        return engine.build(body, workdir, case_dir)

    return engine.build(body, workdir)


def run_case(case_dir, engines, repeats, startup, keep):
    rows = {}

    for engine in engines:
        body_path = case_dir / engine.body_file

        if not body_path.exists():
            rows[engine.name] = {"status": "unsupported"}
            continue

        body = body_path.read_text()
        workdir = Path(tempfile.mkdtemp(prefix=f"bench_{case_dir.name}_{engine.name}_"))

        try:
            argv = build_argv(engine, body, workdir, case_dir)

            if argv is None:
                rows[engine.name] = {"status": "unsupported"}
                continue

            best, median, output, code = measure(argv, repeats)

            if code != 0:
                rows[engine.name] = {"status": "failed", "output": output}
                continue

            overhead = startup.get(engine.name, 0.0)
            rows[engine.name] = {
                "status": "ok",
                "total_s": round(best, 6),
                "loop_s": round(max(best - overhead, 0.0), 6),
                "median_s": round(median, 6),
                "output": output,
            }
        finally:
            if not keep:
                shutil.rmtree(workdir, ignore_errors=True)

    return rows


def measure_startup(engines, repeats):
    """Time of an empty program per engine, subtracted from every case."""
    startup = {}

    for engine in engines:
        workdir = Path(tempfile.mkdtemp(prefix=f"bench_startup_{engine.name}_"))

        try:
            argv = build_argv(engine, EMPTY_BODY, workdir, CASES / "int_arith")

            if argv is None:
                continue

            best, _, _, code = measure(argv, repeats)

            if code == 0:
                startup[engine.name] = best
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

    return startup


def collect_engines(args):
    engines = []
    php = args.php

    engines.append(make_php_engine("php-interp", php, ["-n"]))
    engines.append(make_php_engine("php-opcache", php, [
        "-n", "-d", "zend_extension=opcache.so", "-d", "opcache.enable_cli=1", "-d", "opcache.jit=disable"]))
    engines.append(make_php_engine("php-jit", php, [
        "-n", "-d", "zend_extension=opcache.so", "-d", "opcache.enable_cli=1",
        "-d", "opcache.jit_buffer_size=64M", "-d", "opcache.jit=tracing"]))

    if args.typephp:
        tpc_root = Path(args.typephp)
        tpc_php = tpc_root / "bin" / "tpc.php"
        engines.append(make_typephp_engine("typephp", tpc_php, tpc_root, php, "", ["-O2"]))
        engines.append(make_typephp_engine("typephp-native", tpc_php, tpc_root, php,
                                           "use native_types;\n", ["-O2"]))
        engines.append(make_typephp_engine("typephp-std", tpc_php, tpc_root, php,
                                           "use native_types;\n", ["-O2"], "body-std.php"))

    if args.elephc:
        engines.append(make_elephc_engine("elephc", args.elephc, ["-q"]))

    engines.append(make_c_engine("c-gcc-O2", ["-O2"]))

    return engines


def format_table(results, engines):
    header = "| case | " + " | ".join(e.name for e in engines) + " |"
    divider = "|---" * (len(engines) + 1) + "|"
    lines = [header, divider]

    for case, rows in results.items():
        cells = []

        for engine in engines:
            row = rows.get(engine.name, {"status": "unsupported"})

            if row["status"] != "ok":
                cells.append(row["status"])
            else:
                cells.append(f"{row['loop_s'] * 1000:.1f} ms")

        lines.append(f"| {case} | " + " | ".join(cells) + " |")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--php", default=os.environ.get("BENCH_PHP", "/usr/bin/php8.4"),
                        help="release PHP CLI used as the baseline")
    parser.add_argument("--typephp", default=os.environ.get("TYPEPHP_ROOT"),
                        help="path to a TypePHP checkout with vendor/ installed")
    parser.add_argument("--elephc", default=os.environ.get("ELEPHC_BIN"),
                        help="path to the elephc binary")
    parser.add_argument("--case", action="append", help="run only these cases")
    parser.add_argument("--repeats", type=int, default=5, help="timed runs per engine and case")
    parser.add_argument("--json", help="write machine-readable results here")
    parser.add_argument("--keep", action="store_true", help="keep the per-run scratch directories")
    args = parser.parse_args()

    engines = collect_engines(args)
    names = sorted(p.name for p in CASES.iterdir() if (p / "body.php").exists())

    if args.case:
        names = [n for n in names if n in args.case]

    print("measuring startup", flush=True)
    startup = measure_startup(engines, args.repeats)

    for name, seconds in sorted(startup.items()):
        print(f"  {name}: {seconds * 1000:.1f} ms", flush=True)

    results = {}

    for name in names:
        print(f"case {name}", flush=True)
        results[name] = run_case(CASES / name, engines, args.repeats, startup, args.keep)

        for engine in engines:
            row = results[name].get(engine.name, {"status": "unsupported"})
            detail = f"{row['loop_s'] * 1000:.1f} ms  out={row['output']}" if row["status"] == "ok" else row["status"]
            print(f"  {engine.name:16} {detail}", flush=True)

    print()
    print(format_table(results, engines))

    if args.json:
        payload = {
            "host": os.uname().nodename,
            "startup_s": startup,
            "results": results,
        }
        Path(args.json).write_text(json.dumps(payload, indent=2))

    return 0


if __name__ == "__main__":
    sys.exit(main())

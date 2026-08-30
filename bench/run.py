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

    def __init__(self, name, kind, build, body_file="body.php", repeats=None):
        self.name = name
        self.kind = kind
        self.build = build

        # None means "take the run's default"; a column known to be bimodal names
        # its own count, because two modes cannot be told apart from few samples.
        self.repeats = repeats

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
    """Returns (samples, stdout, returncode) — every timing, not a summary of them.

    Summarising here was the original defect: a minimum estimates a time only
    when the distribution has one mode, and by the time the caller saw one number
    the evidence for that precondition was gone.
    """
    samples = []
    output = ""
    code = 0

    for _ in range(repeats):
        elapsed, output, code = run_once(argv, cwd)
        samples.append(elapsed)

        if code != 0:
            break

    return samples, output, code


def make_php_engine(name, binary, extra_args):
    def build(body, workdir):
        source = workdir / "case.php"
        source.write_text(php_wrapper(body))

        return [binary, *extra_args, str(source)]

    return Engine(name, "php", build, repeats=PHP_REPEATS)


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


DIVERGENCE_MARKER = "divergence.md"

# A split is judged against the distribution's own spread, not against a fixed
# ratio: the arrays separate by 3x and the int loop by 1.28x, and both are two
# modes. What distinguishes a split from a tail is that the widest step between
# neighbouring samples dwarfs the typical step.
MODE_STEP_FACTOR = 8.0

# Floors, so that a flat distribution and jitter near zero are not split. The
# widest step must be a real fraction of the value and worth real time.
MODE_MIN_STEP = 0.15
MODE_MIN_GAP_S = 0.005

# A group of one is an outlier — a descheduled process, a stray interrupt. A mode
# is a state the program lands in repeatedly.
MODE_MIN_GROUP = 2
MODE_MIN_SHARE = 0.05

# Modes cannot be told apart from a handful of samples. The PHP columns are the
# ones observed to be bimodal, and they are cheap to repeat.
PHP_REPEATS = 31


def split_modes(samples):
    """Returns (fast, slow) when the samples fall in two groups, else None.

    The split is taken at the widest step between adjacent sorted samples, and
    only when that step dwarfs the typical step by MODE_STEP_FACTOR — a tail
    rises gradually, a second mode does not — and when both groups are large
    enough to be states rather than accidents. Fewer than eight samples cannot
    show the shape of a distribution and are never split.
    """
    if len(samples) < 8:
        return None

    ordered = sorted(samples)
    steps = [(ordered[i] / ordered[i - 1] - 1.0) if ordered[i - 1] > 0 else 0.0
             for i in range(1, len(ordered))]
    widest = max(steps)
    at = steps.index(widest) + 1
    typical = statistics.median(steps)

    if widest < MODE_MIN_STEP or ordered[at] - ordered[at - 1] < MODE_MIN_GAP_S:
        return None

    if widest < MODE_STEP_FACTOR * typical:
        return None

    smaller = min(at, len(ordered) - at)

    if smaller < MODE_MIN_GROUP or smaller / len(ordered) < MODE_MIN_SHARE:
        return None

    return ordered[:at], ordered[at:]


def check_outputs(case_dir, rows):
    """Returns the disagreeing outputs, or an empty dict when the engines agree.

    A case that is expected to disagree declares it by carrying a
    `divergence.md` saying why; for those the disagreement is the result and no
    complaint is raised.
    """
    if (case_dir / DIVERGENCE_MARKER).exists():
        return {}

    seen = {}

    for name, row in rows.items():
        if row.get("status") == "ok":
            seen.setdefault(row["output"], []).append(name)

    return seen if len(seen) > 1 else {}


def run_case(case_dir, engines, repeats, startup, keep):
    """Builds and times one case on every engine, returning a row per engine name.

    A row is `unsupported` when the engine cannot express the case or its build
    failed, `failed` when the program ran and exited non-zero, and otherwise the
    summary `summarize` produces. Nothing here decides which figure represents a
    row that split — see `summarize`.
    """
    rows = {}

    # A case carrying divergence.md exists to compare answers, not times.
    timed = not (case_dir / DIVERGENCE_MARKER).exists()

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

            samples, output, code = measure(argv, engine.repeats or repeats)

            if code != 0:
                rows[engine.name] = {"status": "failed", "output": output}
                continue

            overhead = startup.get(engine.name, 0.0)
            rows[engine.name] = summarize(samples, overhead, output, timed)
        finally:
            if not keep:
                shutil.rmtree(workdir, ignore_errors=True)

    return rows


def summarize(samples, overhead, output, timed=True):
    """Describes one engine's timings on one case, in loop seconds.

    Startup is removed from every sample before anything is computed, so the
    minimum, the median and the split all speak about the loop. A unimodal set
    is reported as a minimum, a fair estimator where noise only adds time. A
    split set gets no single figure: both groups with their spreads and the
    share, and the median of everything beside them. `timed` is
    false for a case that exists to compare answers rather than times; splitting
    jitter around zero into modes would say nothing there.
    """
    loops = [max(s - overhead, 0.0) for s in samples]
    row = {
        "status": "ok",
        "n": len(loops),
        "samples_s": [round(v, 6) for v in sorted(loops)],
        "median_s": round(statistics.median(loops), 6),
        "output": output,
    }
    modes = split_modes(loops) if timed else None

    if modes is None:
        row["bimodal"] = False
        row["loop_s"] = round(min(loops), 6)
        return row

    fast, slow = modes
    row["bimodal"] = True
    row["fast_group_s"] = [round(statistics.median(fast), 6), round(min(fast), 6), round(max(fast), 6)]
    row["slow_group_s"] = [round(statistics.median(slow), 6), round(min(slow), 6), round(max(slow), 6)]
    row["fast_share"] = round(len(fast) / len(loops), 3)

    # No `loop_s` here on purpose. Which figure represents a split row is a
    # decision for whoever writes the claim, and burying it in the summary is the
    # mistake this function already made once. `median_s` is above it, and it
    # needs no faith in the split being the right description.

    return row


def measure_startup(engines, repeats):
    """Time of an empty program per engine, subtracted from every case."""
    startup = {}

    for engine in engines:
        workdir = Path(tempfile.mkdtemp(prefix=f"bench_startup_{engine.name}_"))

        try:
            argv = build_argv(engine, EMPTY_BODY, workdir, CASES / "int_arith")

            if argv is None:
                continue

            samples, _, code = measure(argv, repeats)

            if code == 0:
                startup[engine.name] = min(samples)
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
            elif row.get("bimodal"):
                cells.append(f"{row['median_s'] * 1000:.1f} ms *")
            else:
                cells.append(f"{row['loop_s'] * 1000:.1f} ms")

        lines.append(f"| {case} | " + " | ".join(cells) + " |")

    return "\n".join(lines)


def resummarize(source, target):
    """Recomputes every row from its stored samples under the current rules.

    Startup is already subtracted in `samples_s`, so summarizing them again is
    exact. This is what storing the samples buys: a rule about distributions can
    be corrected without the machine time, and without the temptation to keep a
    number whose evidence has been thrown away.
    """
    payload = json.loads(source.read_text())

    for case, rows in payload["results"].items():
        timed = not (CASES / case / DIVERGENCE_MARKER).exists()

        for name, row in rows.items():
            if row.get("status") != "ok":
                continue

            rows[name] = summarize(row["samples_s"], 0.0, row["output"], timed)

    target.write_text(json.dumps(payload, indent=2))
    print(f"re-summarized {source} -> {target}")

    return 0


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
    parser.add_argument("--from-json", help="re-summarize the samples in this file instead of measuring")
    args = parser.parse_args()

    if args.from_json:
        return resummarize(Path(args.from_json), Path(args.json or args.from_json))

    engines = collect_engines(args)
    names = sorted(p.name for p in CASES.iterdir() if (p / "body.php").exists())

    if args.case:
        unknown = sorted(set(args.case) - set(names))

        if unknown:
            parser.error(f"no such case: {', '.join(unknown)}; have {', '.join(names)}")

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
            figure = row.get("loop_s", row.get("median_s"))
            detail = f"{figure * 1000:.1f} ms  out={row['output']}" if row["status"] == "ok" else row["status"]
            print(f"  {engine.name:16} {detail}", flush=True)

            if row.get("bimodal"):
                fast, slow = row["fast_group_s"], row["slow_group_s"]
                print(f"  {'':16} SPLIT {fast[1] * 1000:.0f}–{fast[2] * 1000:.0f} ms in "
                      f"{row['fast_share'] * 100:.0f}% of {row['n']} runs, "
                      f"{slow[1] * 1000:.0f}–{slow[2] * 1000:.0f} ms in the rest; "
                      f"median of all {row['median_s'] * 1000:.1f} ms", flush=True)

        disagreement = check_outputs(CASES / name, results[name])

        for output, who in disagreement.items():
            print(f"  DISAGREEMENT {', '.join(who)} printed {output!r}", flush=True)

    print()
    print(format_table(results, engines))

    if args.json:
        payload = {
            "host": os.uname().nodename,
            "startup_s": startup,
            "results": results,
        }
        Path(args.json).write_text(json.dumps(payload, indent=2))

    bimodal = [f"{case}/{name}" for case, rows in results.items()
               for name, row in rows.items() if row.get("bimodal")]

    if bimodal:
        print(f"\n* two groups of samples, tabled as the median of all runs: {', '.join(bimodal)}",
              flush=True)

    return 1 if bimodal else 0


if __name__ == "__main__":
    sys.exit(main())

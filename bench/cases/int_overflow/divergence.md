# int_overflow: the engines are meant to disagree

This case is not timed. It asks what each engine answers when an integer
overflows, and the answers differ by design in two of the three compiled
columns and by defect in the third. `run.py` reads the presence of this file as
"do not report the disagreement as a fault"; `dev/BENCHMARKS.md` records what
each engine answers and why.

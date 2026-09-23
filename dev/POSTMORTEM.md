# POSTMORTEM

Mistakes that cost more than an hour, broke something that worked, sent
the work down a false path, or repeated themselves.

Format per entry: what happened (the symptom as it was seen), the root
cause (why it was possible and why it was not caught), and what changed
so it does not happen again.

## 2026-08-31 — A layout change was checked against a list, not against the deck

Symptom: after the player's vertical rhythm was reworked, five slides came
back broken to the eye — a statement's lines printed on top of each other,
`.names` and the line under it on the same baseline, a card grid running into
the closing note, the theme menu over the slide number. All of it was visible
on the first slides a reader opens.

Root cause has two halves. The check was a script that tested ten
hand-named pairs of selectors — `.slide-title` against `.ghost`, `.detail`
against `.note` — so a pair nobody had thought of could not fail it, and the
broken pairs were exactly those. The defect it failed to catch was a cascade
one: the new rules were appended at the end of `slides.css`, where they tie on
specificity with the earlier rules for the same elements and win on file
order, so `transform: translateY(-50%)` landed on a stack laid out in flow and
`top: var(--band-top)` overwrote the calculated offset that held a second
block clear of the first.

What changed: the check now walks every element that carries text of its own,
on every slide, and reports any two boxes that intersect and anything that
leaves the 1920x1080 field — `player/tools/sweep-layout.mjs`, which exits
non-zero when it reports anything. Every top that positions a body block is
declared in one place, the "vertical rhythm" section at the end of
`slides.css`, so no earlier rule can be silently taken over.

## 2026-09-23 — PHP was measured at file scope, the compilers inside a function

Symptom: an outside review asked why PHP's tracing JIT ran a pure integer loop
at five times the cost of C. The same loop inside a function took 110 ms under
the JIT against 431 ms at file scope, and 363 against 552 ms under OPcache alone.
Every PHP column since 2026-08-30 had been timed at file scope, so every
"× the JIT" ratio was inflated in the compilers' favour, and the September
headline "elephc 0.27 is 1.7× faster than the JIT" was false: elephc's 246 ms
is about twice the JIT's.

Root cause: `bench/run.py` wrapped each case per engine, and the wrappers were
written to satisfy each compiler's syntax, not to give every engine the same
program. TypePHP demands `main()`, so its body sat in a function; PHP, elephc
and Manticore accept top-level code, so theirs did not. At file scope Zend
keeps the variables in the global symbol table, and the JIT cannot hold them in
registers. Two Critic rounds and a Sage in August, two Critics and a code
review in September read the wrapper and the numbers and did not ask the one
plausibility question that exposes it: a JIT that is 5× slower than C on
`$h * 31 + $i` is not a JIT working normally. The Laravel run contained the
contradiction in plain sight — the same loop as a method, 11 ms per 10^7 under
the JIT against 42 ms in the suite — and it was filed as a Laravel mystery.

What changed: `php_wrapper` puts the body inside `bench_main()` for every engine
that takes plain PHP, the reason is in its docstring, and both toolchain
generations were rerun (results `2026-09-23c-*`). Slides and journals that used
the file-scope figures are corrected or marked as such. The rule this adds to
the method: before quoting a ratio, compare each engine with the floor it
should be near (C for a native int loop) and explain any gap larger than 2×.

## 2026-09-23 — The layout sweep reported clean on a page with no slides

Symptom: the sweep printed "clean" twice for a deck it had never loaded. Port
8765, where the deck was supposed to be served, belonged to a service in another
WSL distribution that answers every path with a JSON 404; the Python server had
failed to bind, silently, in the background.

Root cause: the sweep counted problems and never counted slides, so zero slides
and zero problems looked the same.

What changed: the sweep counts slides first, exits 2 when there are none, and
prints the count with its verdict.

## 2026-09-23 — "Update the repository" was read as "update the compilers"

Symptom: a whole slide pass was made against a local deck ten commits behind
GitHub; Edmond had restructured the benchmark block from another machine. The
pass had to be redone after a rebase.

Root cause: the session never fetched `origin` before starting, and an
ambiguous request was resolved toward the task at hand instead of toward the
repository it named.

What changed: a memory note makes `git fetch && git status` the first action of
a session in this repository.

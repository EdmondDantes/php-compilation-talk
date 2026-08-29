# Handoff — 2026-08-25

Written at the end of a long session, for whoever picks this up next.
Read `dev/INDEX.md` first for the map, then this for the state.

## Where the work stands

The talk has a through-line, an outline and ten sections of spoken text.
What it does not have is a rehearsal, a visual direction, and numbers for
the business part.

**Through-line:** compilation buys not faster instructions but the absence
of opacity. Every helper call in a hot path wipes the optimizer's memory
of what it had established.

**Second thesis:** the survivor is not the best compiler but the one with
an owner who controls a single codebase — because only such an owner can
afford to cut the infrastructure.

Those two are the same thesis, resolved late in the session: the value of
PHP is the **infrastructure** (stdlib, Composer, packages, tooling,
people), the language's simplicity is what produced it, and a compiler
cuts the infrastructure first.

## What is in the repository

- `dev/OUTLINE.md` — the running order. Currently 46 slides, which is too
  many; renumbering was deliberately deferred until the introduction
  settles.
- `dev/script/00…09` — the speaker's own text, dictated then edited.
  Every file carries its slide composition and the places that need a
  decision.
- `dev/research/php-compilers.md` — the inventory, eight categories,
  ~50 projects, with sourcing and explicit gaps.
- `dev/research/php-governance-and-money.md` — funding, the RFC process,
  and why generics are missing.
- `dev/research/typephp-review.md`, `ai-oriented-languages.md` — two
  articles, the second also published as a page.
- `design/` — four visual directions, published as a canvas.

Two artifacts are live: the design directions and the outline as a page.
The article on AI-oriented languages is a third.

## Corrections already made — do not reintroduce them

Three claims were checked and turned out false. They are corrected in the
files; if they reappear, they came from memory, not from the sources.

- **HipHop did not die of "a flattened performance curve."** That phrase
  is Wikipedia's editorial wording, cited to a post that never says it.
  It died of deploy economics: 1.5 GB pushes, gcc on every change, and a
  20-minute deploy cadence the compiler could not keep.
- **KPHP's "3–10×" does not survive VK's own material.** Their tutorial
  publishes a case where KPHP is 5.6× *slower* on untyped code, and an
  ex-VK engineer measured most real pages within ±10% of PHP. The gain is
  the return on typing, not on compiling.
- **Phalcon did not simply die, and its niche was not empty.** Yaf held it
  a year and a half earlier; Phalcon v6 ships as pure PHP.

Two of my own statements were also wrong and are fixed: Zephir is no
longer "the only PHP-like language with an industrial user" (Phalcon is
leaving it), and Go is not "stable in the top ten" (TIOBE 14th, below
PHP).

## What is still open

**Blocking the talk:**

1. **Economics.** Slide 34 has no numbers at all. What a PHP worker fleet
   costs, and what share of request time is PHP. Without them the business
   part describes a method rather than money. Only the speaker can supply
   this.
2. **Timing.** 46 slides against 45 minutes. Nothing has been rehearsed.
   Part 3 is designated as the first thing to cut.

**Unverified claims still standing in the text:**

- "A week of AI accumulates the technical debt that used to take six
  months" — no source. Check GitClear's churn and duplication reports and
  DORA 2024–2026.
- The report said to show AI threatening PHP and Python — no source found;
  currently kept off the slides.
- What TIOBE, RedMonk and the Stack Overflow survey actually measure —
  their methodologies were never fetched.
- "Rewrite everything in Rust works" — the only evidence collected is VHP,
  which stalled in January 2026.

**The web-search budget was exhausted** (200/200) before these could be
checked. `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` is now set to 20000 in
the user's global settings and takes effect in a new session. Do these
four first.

**Also unresearched:** Bun and Deno as the outside parallel — Bun is
written in Zig (not Rust, as was assumed in conversation), Deno in Rust;
Deno dropped npm and had to restore it, which is the infrastructure thesis
on someone else's field. None of this is verified yet.

## What the hostile review found and nobody has fixed

A three-listener adversarial review ran over the whole talk. The fatal
items:

- **"После чужого вызова оптимизатор обязан считать протухшим всё"** —
  "обязан" is wrong; the JIT knows its own helpers' semantics. Restate as
  observation: in the current implementation the type tag is re-read three
  times per iteration, visible in the trace. Otherwise slide 35 (the IR
  framework already in the engine) contradicts part 1.
- **"LLVM просто перестали мешать"** — needs one line naming what
  semantics the pilot does not hold: modification during `foreach`,
  references, exceptions, `IS_UNDEF`, property hooks.
- **The `ext/mlir` numbers have no methodology on the slide** — units,
  iterations, machine, runs, spread. And beating C by 4% is noise: say
  parity with C, which is stronger and unarguable.
- **"Барьера записи нет"** — `retain`/`release` *is* a write barrier. Say
  "no additional barrier on top of ARC". And `RC − IN > 0` is Bacon and
  Rajan's trial deletion (2001) — cite it or it reads as claiming an
  invention.
- **"SSA есть, промежуточного представления нет"** — SSA is an
  intermediate representation. Say "no separate low-level IR between
  analysis and code generation".
- **Nothing in the talk tells a working developer what to do on Monday.**
- **Swoole, RoadRunner and FrankenPHP are absent** — the way real teams
  actually got multiples without compiling. The room will ask first.

The full review is in the session transcript, not in a file.

## How the work goes

Dictate a section, it gets rephrased and filed under `dev/script/`, its
slide composition agreed, then wired into `dev/OUTLINE.md`. Claims that
cannot be sourced are named in the file rather than smoothed over. Other
people's numbers are presented as theirs; ours are presented as measured,
with the method named. The two in-house projects — `ext/mlir` and
Limelight — carry an in-development disclaimer on every slide they appear
on.

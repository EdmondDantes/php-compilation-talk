# INDEX

Map of this repository for an agent. Pointers only — no content.

## What this is

A conference talk (40–45 min, developer audience, Russian) titled
"PHP и компиляция" — why PHP compilers keep getting written, what they
buy, what they cost, and whether to expect one in production.

## Entry points

- `mock/index.html` — the first deck draft, 32 slides, self-contained
  (open in a browser, nothing to build). Its own `mock/readme.md`
  explains the slide grammar.
- `mock/css/industry.css` — design tokens of the "Industry" system.
- `mock/css/deck.css` — slide layouts built on those tokens.
- `mock/js/deck-stage.js` — the `<deck-stage>` element: scaling,
  navigation, thumbnail rail, speaker notes, print.
- `player/tools/sweep-layout.mjs` — drives a headless Chrome over the whole
  deck and reports any two pieces of text that collide, or anything that
  leaves the 1920x1080 field. Run it after touching `player/css/`.
- `design/*.dc.html` — design-direction artboards (Poster, Terminal,
  Blueprint, Editorial). `design/canvas.json` lays them out.
  `design/php-compilation-deck-directions.html` is the generated,
  published canvas — a build product, do not hand-edit.

## Content sources

- `dev/research/php-compilers.md` — the verified inventory of projects
  that compile PHP, with status, target and sourcing. Feeds the
  "Ландшафт" part of the talk.
- `dev/research/php-governance-and-money.md` — what the language costs to
  develop, how decisions are made, and why generics are missing.
- `dev/research/typephp-review.md` — a full read of one live compiler.
- `dev/research/refresh-2026-09.md` — what changed by 2026-09-23 in TypePHP,
  elephc, KPHP and Manticore, and what it does to the deck's numbers.
- `dev/research/typephp-laravel.md` — TypePHP tried on a Laravel application.
- `dev/research/ai-oriented-languages.md` — languages built for models.
- `dev/OUTLINE.md` — the running order, slide by slide.

## Spoken text

- `dev/script/` — the talk's narration, one file per part, in the
  speaker's own words. Dictated first, edited for print second; slide
  copy is derived from it, never the other way round. Russian, like the
  deck.

## Handoff

- `dev/HANDOFF.md` — where the work stands, what was corrected and must
  not come back, what is still unverified, and what the adversarial review
  found. Read it after this file.

## Working documents

- `dev/PLAN.md` — stages and steps; the task list is rebuilt from it.
- `dev/BENCHMARKS.md` — our own measurements, with the method and the
  machine. `bench/` holds the cases and the runner that produced them, one env
  profile per toolchain generation, and `bench/results/`, one file per run.
  `bench/laravel/` rebuilds the Laravel experiment; `bench/manticore-loop/`
  re-times Manticore's own benchmark.
- `dev/WORKFLOW.md` — rules specific to this project.
- `dev/DECISIONS.md` — why the talk and the deck are shaped this way.
- `dev/POSTMORTEM.md` — mistakes that cost time.

## Conventions

- Deck text is Russian; everything else in the repository is English.
- Slide type never drops below 24 px at 1920×1080.
- Numbers on slides are either measured or flagged as placeholders.

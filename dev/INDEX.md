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
- `design/*.dc.html` — design-direction artboards (Poster, Terminal,
  Blueprint, Editorial). `design/canvas.json` lays them out.
  `design/php-compilation-deck-directions.html` is the generated,
  published canvas — a build product, do not hand-edit.

## Content sources

- `dev/research/php-compilers.md` — the verified inventory of projects
  that compile PHP, with status, target and sourcing. Feeds the
  "Ландшафт" part of the talk.

## Working documents

- `dev/PLAN.md` — stages and steps; the task list is rebuilt from it.
- `dev/WORKFLOW.md` — rules specific to this project.
- `dev/DECISIONS.md` — why the talk and the deck are shaped this way.
- `dev/POSTMORTEM.md` — mistakes that cost time.

## Conventions

- Deck text is Russian; everything else in the repository is English.
- Slide type never drops below 24 px at 1920×1080.
- Numbers on slides are either measured or flagged as placeholders.

# WORKFLOW

Rules that apply to this project on top of the general ones.

## Language

The deck is in Russian and stays in Russian. Everything else —
file names, this folder, commit messages, research notes — is English.

## Facts on slides

Every number that reaches a slide is either measured in this repository
or carries a visible placeholder flag. A claim about a project (status,
target, PHP version, benchmark) is backed by a link in
`dev/research/php-compilers.md`; a claim the research marks *unverified*
is either dropped from the slide or spoken as unverified.

Project-authored benchmarks are quoted as project-authored, never as
independent measurements.

## Deck sources

`mock/` holds the first draft. Design directions live in `design/` as
`.dc.html` artboards; the published canvas
`design/php-compilation-deck-directions.html` is generated from them and
is never edited by hand — edit the artboards and re-seed.

## Typography

Faces must carry Cyrillic. Barlow does not, which is why the draft falls
back per glyph to Fira Sans. A new direction picks faces with Cyrillic
coverage instead of relying on a fallback.

Nothing below 24 px on a 1920×1080 slide.

## Steps

Work runs through `dev/PLAN.md`: a step is one sitting, closed in the
file. State lives in the plan, not in a task list.

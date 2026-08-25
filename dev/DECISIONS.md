# DECISIONS

Architectural and editorial decisions, newest last. Format: date, what
was decided, why, what was rejected, what it costs.

## 2026-08-25 — The talk is a survey, not a product pitch

Decided: the subject is why PHP compilers exist at all, what they buy
and what they cost. Limelight stays as a live example rather than as the
subject.

Why: there is little to say about Limelight yet, and the question the
audience actually has is whether any of this reaches their production.

Rejected: a Limelight-first talk with the landscape as background.

Cost: the talk cannot lean on our own measurements; it must be built on
other people's numbers, most of which are project-authored.

## 2026-08-25 — Slide claims are sourced or flagged

Decided: every factual claim on a slide points at an entry in
`dev/research/php-compilers.md`, and project-authored benchmarks are
named as such on the slide.

Why: most performance numbers in this field come from the projects
themselves. Repeating them unqualified would make the talk exactly the
folklore it argues against.

Cost: several attractive numbers (44×, 10×, 3–10×) can only be shown
with a qualifier, which weakens them on a slide.

## 2026-08-25 — Design directions are drafted before the template

Decided: four visual directions (Poster, Terminal, Blueprint, Editorial)
are drafted as artboards — cover plus one content slide each — and one
is chosen before the deck's CSS is rewritten.

Why: the draft's look was rejected, and rewriting the whole deck to find
that out again is expensive.

Rejected: patching the existing "Industry" look in place.

Cost: two rounds instead of one, and the artboards are throwaway work
once a direction wins.

## 2026-08-25 — Faces must carry Cyrillic

Decided: a direction picks typefaces with Cyrillic coverage instead of
relying on a per-glyph fallback.

Why: the draft sets Barlow, which has no Cyrillic, so every Russian word
silently renders in Fira — two faces on one slide, unmatched metrics.

Cost: rules out most of the display faces the draft was built around.

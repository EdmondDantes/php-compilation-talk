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

## 2026-08-31 — The slide body is centred on a band, not hung from the title

Decided: a slide's body block is centred between the rule under the title
and the closing note (`--band-top`, `--band-bottom`, `--band-mid` in
`player/css/theme.css`). The running head moves up to 56px and the title
to 108px. Slides that carry two body blocks keep the band's top edge.

Why: with every block anchored at a fixed 372px, 17 slides of 62 ended
more than 250px above the foot, one of them 497px — the head read as
hanging low and the field as unfinished.

Cost: a body shorter than the band now floats between two smaller voids
instead of sitting under the title, and a body taller than the band
overflows it symmetrically rather than downwards.

## 2026-08-31 — The part number moves to the corner

Decided: on a divider the oversized part number sits in the bottom right
corner instead of behind the title.

Why: set beside the title it overlapped every heading longer than two
words — five dividers, 84 to 166px of overlap — and the heading is the
half of the pair that has to be read.

Cost: the number stops reading as a watermark behind the title, which is
what the direction's artboard drew.

## 2026-08-31 — Notes reach the reader through the slide's own detail line

Decided: hovering a project name or a chip writes its note into the
slide's `.detail` line; the CSS hover tooltip is gone. A click still pins
the full note with its link.

Why: the tooltip covered the three timeline rows under the name — the
rows being compared — could not be dismissed, and never appeared on a
touch screen.

Cost: the note is read at the foot of the slide rather than next to the
cursor, so the eye travels further.

## 2026-08-31 — The centred body is a default with no specificity

Decided: the rule that centres a slide's body is written through `:where()`,
so it carries no specificity at all, and every layout with geometry of its own
outranks it whatever the order in `slides.css`. A body that declares its own
`top` declares `transform: none` beside it.

Why: the first version of the rule sat at the end of the file and tied on
specificity with the layouts it was meant to leave alone, so it won on line
order and silently took `.rows.cards`, `.stack.low`, `.stack.after-figures`
and the statement's stack. Four slides were destroyed and the cause was
invisible in the rule itself.

Cost: the contract between `top` and `transform` is held by a comment and by
`player/tools/sweep-layout.mjs`, not by the language.

## 2026-08-31 — The layout sweep covers the states a slide is left in

Decided: `player/tools/sweep-layout.mjs` checks each slide three times — at
rest, with its longest note pinned, and with a row's panel open — and in the
expanded state compares only what is outside the opaque panel.

Why: a note pinned by a click fills the detail line from its top edge, and the
timeline's last two rows were under it in all three directions. The slide at
rest is clean; the slide the room looks at for a minute was not.

Cost: three passes over 62 slides in three directions, about twenty seconds.

## 2026-08-31 — The integer-loop result is a bar chart, not four cards

Decided: slide 48 draws each engine's time as a horizontal bar on one linear
scale, zero to the slowest engine, with the figure direct-labelled beside it.
The bar carries the verdict colour and the figure stays in the body ink.

Why: the four numbers span 58x — 90 ms against 5202 — and the slide drew them
as four boxes of equal height with a coloured rule on top, which reads as a
column chart whose columns were never given a height. The room saw four equal
things and had to get the comparison from the digits.

Rejected: a log scale, which would have made 90 and 485 comparable to the eye
and hidden the size of the gap the slide is about.

Cost: at a linear scale the fastest bar is a 17px stub. That is the finding,
but it carries no length a reader can compare — the number beside it does.

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

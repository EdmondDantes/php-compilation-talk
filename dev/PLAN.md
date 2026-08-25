# PLAN

Updated: 2026-08-25 · Active: S1

Destination: a 40–45 minute talk that answers one question — why PHP
compilers keep getting written, and whether a working developer should
expect to use one — backed by a verified landscape rather than by
folklore.

## Fog

- The through-line ("compilation buys hardware cost and tail latency,
  not 'speed', and pays in dialect and hiring") is a claim, not yet a
  measured argument. The numbers behind it do not exist in this
  repository.
- Limelight stays in the talk as a live example, but there is little to
  say about it yet; how much room it gets is undecided.
- Which visual direction the deck takes is open — four are drafted.
- No benchmark of our own is planned; whether the talk needs one is
  undecided.

## S1. Structure of the talk

Goal: an agreed part-by-part outline with slide counts, so slides can be
written without renegotiating the shape.

- [ ] S1.1 Agree the six-part outline (entry, why the question, what
      "compiling PHP" means, landscape, business case, what to expect).
- [ ] S1.2 Fix the through-line as one sentence and write it at the top
      of the outline.
- [ ] S1.3 Decide how much of the talk Limelight occupies.

## S2. Content sources

Goal: every factual slide has a source in the repository.

- [x] S2.1 Collect the inventory of projects that compile PHP —
      `dev/research/php-compilers.md`.
- [ ] S2.2 Decide which projects appear on slides and in what order;
      drop the rest into an appendix list.
- [ ] S2.3 Find or discard the economics: what a PHP worker fleet costs
      and where request time actually goes. Without a source, the
      business part is framed as a method, not as figures.

## S3. Visual direction

Goal: one direction chosen and built into a slide template.

- [x] S3.1 Draft four directions as artboards, cover plus content slide.
- [ ] S3.2 Pick one.
- [ ] S3.3 Establish what the draft calls "side slides" and remove them.
- [ ] S3.4 Build the chosen direction into the deck's CSS, replacing the
      draft's look; keep the layout classes that still fit.

## S4. Slides

Goal: the deck exists end to end and runs in a browser.

- [ ] S4.1 Write parts 1 and 2 (why the question, what compiling means).
- [ ] S4.2 Write part 3 (landscape) from S2.2.
- [ ] S4.3 Write parts 4 and 5 (business case, what to expect).
- [ ] S4.4 Write speaker notes into `data-speaker-notes` for every slide.

## S5. Rehearsal

Goal: the talk fits the slot and survives questions.

- [ ] S5.1 Time a full run; cut to fit 45 minutes with questions.
- [ ] S5.2 Collect the likely hostile questions and prepare answers.

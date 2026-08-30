# PLAN

Updated: 2026-08-30 · Active: S4

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
- How much of part 3 survives the cut once S5.1 times a full run.

## S1. Structure of the talk

Goal: an agreed part-by-part outline with slide counts, so slides can be
written without renegotiating the shape.

- [x] S1.1 Agree the outline — six parts, 30 slides, written up in
      dev/OUTLINE.md.
- [x] S1.2 Fix the through-line: a PHP compiler is stopped by the
      language semantics and by the absence of an owner, not by a lack of
      compiler craft.
- [ ] S1.3 Decide how much of the talk Limelight occupies.
- [x] S1.4 Decide TypePHP is the running example rather than a chapter.

## S2. Content sources

Goal: every factual slide has a source in the repository.

- [x] S2.1 Collect the inventory of projects that compile PHP —
      `dev/research/php-compilers.md`.
- [x] S2.2 Decide which projects appear on slides and in what order —
      part 3 of dev/OUTLINE.md.
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
- [x] S4.5 Rebuild the post-landscape technical block by semantic
      obstacle: JIT speculation, int-to-float overflow, method dispatch,
      then performance. Implemented in `player/deck/04-next.html`.

## S7. Our own measurement of TypePHP and elephc

Goal: the deck stops quoting only other people's numbers. One machine, one
PHP release build, four workloads — int arithmetic, foreach over an array,
indexed read, indexed write — plus the int-overflow semantics probe.

- [x] S7.1 Build the three toolchains from source: PHP 8.4.22 with
      `--enable-embed=shared`, PHPX, TypePHP 0.6.7, elephc 0.26.5.
- [x] S7.2 Write the cases and the runner — `bench/`. One body per case,
      wrapped per engine, so the measured source is identical everywhere.
- [x] S7.3 Run the suite and file the numbers in `dev/BENCHMARKS.md`.
- [-] S7.4 Report the elephc overflow divergence upstream. Declined by
      Edmond, 2026-08-30. The finding stays in dev/BENCHMARKS.md and on
      the slide.
- [x] S7.5 Put the results on slides in `player/deck/04-next.html`, next to
      the authors' own benchmark rather than merged into it. Six slides,
      rendered and checked at 1920x1080.

## S5. Rehearsal

Goal: the talk fits the slot and survives questions.

- [ ] S5.1 Time a full run; cut to fit 45 minutes with questions.
- [ ] S5.2 Collect the likely hostile questions and prepare answers.

## S6. Player

Goal: a deck player of its own, separate from the `mock/` draft, good
enough to present from.

- [x] S6.1 Build `player/` — stage scaling, keyboard navigation, overview,
      theme switching between Терминал and Чертёж, presenter screen with
      notes and a talk clock, print to one slide per page.
- [ ] S6.2 Publish it as a GitHub Pages site.
- [ ] S6.3 Move the real deck into it once S4 has written the slides.

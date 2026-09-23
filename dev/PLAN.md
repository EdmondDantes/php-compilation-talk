# PLAN

Updated: 2026-09-23 · Active: S8

Destination: a 40–45 minute talk that answers one question — why PHP
compilers keep getting written, and whether a working developer should
expect to use one — backed by a verified landscape rather than by
folklore.

Review 2026-09-23: code since 08ae6e6 — bench/run.py has four nesting
  sites over three levels, a 78-line `main`, and single-use `build_argv`,
  `Engine.kind`, `run_once`, `opt_flags` and the `timed` flag; folded into
  S8.2. The player has a 129-line sweep callback, a 77-line `command`
  switch and six duplicated fragments; new step S6.6. The split detector's
  step factor never decided a row on the stored samples; kept as a guard.
  Plan: Fog item on missing numbers stale since S7, rewritten; S6.5 split;
  the hostile review's open items attached to S5.2; no talk date recorded.

## Fog

- The through-line ("compilation buys hardware cost and tail latency,
  not 'speed', and pays in dialect and hiring") rests on four loops
  measured in S7. Nothing measured yet touches strings, objects or a
  request; S8 adds two cases and a Laravel route.
- The date of the talk is not recorded anywhere, so whether S8 fits
  before S4 and S5 cannot be judged.
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
- [x] S4.6 Extend the opening visual sequence after the first spoken
      rehearsal: add an AI crossroads illustration to the existing
      uncertainty slide, add the new-language paradox and a visual map of
      four non-agent language motives, and surface the Rust question where
      it is first spoken. Extend the AI thesis into a three-slide arc: cheap
      code, measured change cost, and the guardrails that contain complexity.
      Replace the ranking table with four measurements of one language,
      add a project-choice diagram, and connect the ratings discussion to
      the empirical adoption evidence. Implemented in
      `player/deck/00-intro.html`.
- [x] S4.7 Remove the separate Goro and PXP portraits from the active
      running order. Both remain represented on the interactive compiler
      inventory slide; `player/deck/03-two-paths.html` stays as parked
      source material.

## S7. Our own measurement of TypePHP and elephc [done]

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
      the authors' own benchmark rather than merged into it. Seven slides,
      rendered and checked at 1920x1080.
- [x] S7.6 Explain the times from machine code and profiles —
      `dev/research/hot-loop-anatomy.md`. perf, objdump, the JIT's own
      disassembly on a capstone build, elephc `--emit-asm`.
- [x] S7.7 Draw the comparison as a page of its own —
      `bench/infographic.html`.
- [x] S7.8 Two rounds of Critic and two of Sage over S7. One published claim
      retracted, the JIT baseline changed twice, four defects found that were
      never asked about. Recorded in `dev/BENCHMARKS.md`.

Stage closed. What outlives it: `dev/BENCHMARKS.md`, `dev/research/hot-loop-anatomy.md`,
`bench/`. Open question left behind: the cause of the JIT's two states.

## S8. September refresh of the compilers and our measurements [done]

Goal: TypePHP, elephc, KPHP and Manticore are described as they stand on
2026-09-23, every number the deck quotes from S7 is checked against current
builds, and TypePHP is tried on an application instead of a loop.
Done when: each S7 claim on the slides is marked holds, changed or
retracted, and dev/research/refresh-2026-09.md says so with the sources.
Code Reviewer 2026-09-23: five places where a failure passed silently (an
  unreadable PHP version renamed the baseline's columns, ignored exit codes in
  both new scripts, --php-extra appending to the env default, startup built in
  a case directory) and three copies of the PHP flag sets. The five fixed; the
  flag sets differ by PHP build and say so in comments.

- [x] S8.1 Record what changed in TypePHP, elephc, KPHP and Manticore since
      2026-08-25: versions, releases, stated performance, compatibility,
      activity, and whether elephc issue #623 or the overflow sign moved.
      done: a dated update per project in dev/research/php-compilers.md and
      dev/research/typephp-review.md, each claim linked.
      tier: T1 · role: —
      handoff: updates dated 2026-09-23 under each entry of php-compilers.md
        and a new first section of typephp-review.md. TypePHP 0.8 made int64
        the default (`use varint_types` restores PHP ints); elephc PR #817
        targets our int loop; Manticore publishes a near-identical loop at
        22.8x. Both local clones are shallow: commit counts come from full clones.
- [x] S8.2 Build current TypePHP and elephc next to the August builds, not
      over them; one env profile per toolchain generation; run.py stamps
      engine versions and commits into its JSON and writes one file per
      run; simplify run.py as the 2026-09-23 review found.
      done: both generations run int_overflow; the August results.json is
      frozen under a dated name and re-summarizes unchanged.
      tier: T2 · role: —
      handoff: bench/env-2026-08.sh and env-2026-09.sh; September builds under
        ~/.cache/php-compilation-talk-bench/2026-09. int_overflow runs on both;
        results/2026-08-30.json re-summarizes byte-identical. PHPX 2.9.1 must be
        configured from a path without "bench" in it (its CMake filters
        mpdecimal sources by that word), hence the ~/.cache/phpx-2026-09 symlink.
        The `timed` flag and MODE_STEP_FACTOR were kept against the review:
        both guard cases the stored samples do not contain.
- [x] S8.3 Re-run the suite twice: the August builds on today's machine
      (23 GB instead of 8), then the current builds, plus PHP 8.5.
      done: a dated section in dev/BENCHMARKS.md separates the machine's
      effect from the versions'; each S7 claim on player/deck/04-next.html
      is marked holds, changed or retracted.
      tier: T2 · role: Critic
      Critic 2026-09-23: every cell matched the JSON; the conclusions did not.
        "Keeps PHP's arithmetic" was unproven (the masked loop never
        overflows), load bursts landed on one engine's whole row, "8-13 %"
        was 6-17 %, method_call had no control, C was no floor for strings,
        the slide table missed six claims. All accepted: int_overflow_chain
        and function_call added, run.py made engines take turns and record
        /proc/stat load per sample, the suite rerun, the section rewritten.
      handoff: dev/BENCHMARKS.md, section 2026-09-23; tables from
        results/2026-09-23-toolchain-2026-08.json and
        2026-09-23b-toolchain-2026-09.json. elephc 0.27.0 beats the JIT on
        int_arith with PHP's overflow answer; the JIT slow state did not appear
        with engines in turns (cause still unknown).
- [x] S8.4 Try TypePHP on Laravel two ways: the whole application, and ext
      mode with one typed hot class called from a route, timed with and
      without it.
      done: dev/research/typephp-laravel.md gives the commands and, for
      each way, either the timing or the first blocking error verbatim,
      and names which claim of the vendor each way tests.
      tier: T2 · role: Critic
      Critic 2026-09-23: "warm" is an Octane worker, not php-fpm; the JIT was
        called production-default though 8.4 ships it off; TypePHP does have a
        fallback, just not for file-scope code; "works" was only in-process;
        the JIT row may not be JIT. All accepted: fpm-shaped figure (9 %) added,
        fallback described from SourcePipelineTrait, scope of "works" stated;
        the JIT was on and still compiled almost nothing inside Laravel, kept
        as an unexplained observation.
      handoff: dev/research/typephp-laravel.md; bench/laravel/setup.sh rebuilds
        both builds (verified from scratch); timings in
        results/2026-09-23-laravel.json and 2026-09-23b-laravel.json.
- [x] S8.5 Add two cases tied to slide claims: method dispatch and strings.
      done: cases under bench/cases, rows in dev/BENCHMARKS.md; the other
      candidates (recursion, hash arrays, exceptions, startup and memory,
      compile time, KPHP and Manticore as engines) listed with reasons in
      the report.
      tier: T2 · role: Critic
      Critic 2026-09-23 (same review as S8.3): method_call needs a control.
        Accepted: function_call added; with it the loss is interface dispatch
        (58 ns per call in TypePHP, 219 ns in elephc), not calls.
      handoff: bench/cases/{method_call,function_call,string_build,
        int_overflow_chain}; decl.php carries declarations outside main().
- [x] S8.6 Carry changed numbers onto player/deck/04-next.html and
      bench/infographic.html.
      done: both match the new results file; player/tools/sweep-layout.mjs
      reports 0 collisions.
      tier: T1 · role: —
      handoff: Edmond chose on 2026-09-23 to keep the August slides as history:
        the August integer slide and both elephc 0.26.5 slides stay, labelled
        «История»; September slides follow them, plus new slides on interface
        calls, Laravel and Manticore's 22.8x. The infographic stays an August
        snapshot with a pointer. Sweep: 67 slides clean in all three themes;
        the sweep now exits 2 on a page without slides (it had reported a 404
        page as clean).
- [x] S8.7 Write dev/research/refresh-2026-09.md: what changed, the Laravel
      outcome, the new numbers, what is still open.
      done: every figure in it traces to a results file or a link.
      tier: T1 · role: —
      handoff: dev/research/refresh-2026-09.md; its last section lists the
        slide decisions that S8.6 waits on.
- [x] S8.8 Analyze Manticore's progress since June, requested 2026-09-23:
      history, what works and how it is shown, and its prebuilt 0.11.0 run
      as an engine on our cases, set against its own published loop figure.
      done: a Manticore section in dev/research/refresh-2026-09.md with
      sources, and a manticore column in a dated results file.
      tier: T2 · role: Critic
      Critic 2026-09-23: "a quarter" divided an x86 ratio by an M1 one, and
        "its speed comes from dropped semantics" was asserted, not measured.
        Accepted: ratios restated per machine (15x, 13x, 5.4x), the reading
        limited to the one disassembled loop.
      handoff: Manticore section of refresh-2026-09.md; manticore column in
        results/2026-09-23b-toolchain-2026-09.json; its own loop re-timed by
        bench/manticore-loop/measure.py.

## S5. Rehearsal

Goal: the talk fits the slot and survives questions.

- [ ] S5.1 Time a full run; cut to fit 45 minutes with questions.
- [ ] S5.2 Collect the likely hostile questions and prepare answers.
      Includes the open items of the adversarial review in
      dev/HANDOFF.md: Swoole, RoadRunner and FrankenPHP as the way teams
      got multiples without compiling, and what a developer does on Monday.

## S6. Player

Goal: a deck player of its own, separate from the `mock/` draft, good
enough to present from.

- [x] S6.1 Build `player/` — stage scaling, keyboard navigation, overview,
      theme switching between Терминал and Чертёж, presenter screen with
      notes and a talk clock, print to one slide per page.
- [ ] S6.2 Publish it as a GitHub Pages site.
- [ ] S6.3 Move the real deck into it once S4 has written the slides.
- [x] S6.4 Fix the chrome and the vertical rhythm after a full read at
      1920x1080: head lifted, bodies centred on a band, five divider
      collisions and two detail/note collisions removed, the prompter panel
      given a close button and the stage's own edges, the timeline tooltip
      replaced by the detail line, PHP plates coloured by `js/highlight.js`.
      Verified by `player/tools/sweep-layout.mjs` across 62 slides x 3
      directions: 0 collisions, nothing off the field. Critic ran over the
      change and found twelve defects, of which the cascade tie that broke
      `.rows.cards` was confirmed by measurement; ten are fixed, two are
      recorded below.
- [ ] S6.5 The offsets that hold a second body clear of the first are
      fixed numbers with measured slack: 47px between `.figures` and
      `.stack.after-figures`, whose lines are 35px, so one added line of
      the figure's caption closes it; 131px between `.names` and
      `.stack.low`, whose lines are 64px.
- [ ] S6.6 The player's own chrome is in physical pixels while the stage
      scales, so on a 3840x2160 screen the prompter's 24px text reads half
      the size of the 30px slide text beside it.
- [ ] S6.7 Simplify the player code found in the 2026-09-23 review: split
      the 129-line callback in `player/tools/sweep-layout.mjs` into
      enter/collect/check/reset, replace the `command` switch in
      `player/js/player.js` with a key table, and merge the six duplicated
      fragments (note line, expand-panel close, two-digit counter, `perYear`,
      `openNote` in build-map.mjs, `clearDetails` in the sweep).
      done: sweep-layout reports 0 collisions before and after.

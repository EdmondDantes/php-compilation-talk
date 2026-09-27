# PLAN

Updated: 2026-09-23 · Active: S4

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
  not 'speed', and pays in dialect and hiring") now rests on seven loops
  and one Laravel route (S7, S8; dev/BENCHMARKS.md, corrected section). With PHP
  measured inside a function the JIT still beats compiled PHP with PHP semantics
  (elephc 2.5x, TypePHP 10x), but the gap fell from 34-44x in a month; the Sage
  review of 2026-09-23 suggests re-anchoring the through-line on runtime
  representation and the framework boundary rather than on semantics alone.
- The date of the talk is not recorded anywhere, so the time left for S4
  and S5 cannot be judged.
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
- [x] S4.8 Review speaker notes with the speaker (2026-09-27), retain
      slides explicitly approved unchanged, edit the remaining technical
      narration, refresh TIOBE, and add the closing ecosystem-migration
      thesis with a generated illustration matching the existing deck.
- [x] S4.9 Apply the subsequently approved opening reduction (15 to 10
      slides; preserve five slides in reserve), synchronize the Bun card
      with its narration, group August measurements before September,
      and add a generated TypePHP 0.9.3 architecture infographic after
      the four compilation approaches. No performance measurements rerun.
- [x] S4.10 Replace the TypePHP raster diagram with theme-aware Canvas,
      make the PHP-AST SSA boundary explicit, add source-checked elephc
      and Manticore diagrams, and reveal stages with space/back navigation.
      Redraw canvases for overview, presenter, theme changes and printing.
      Add the requested zval/object/array representation comparison after
      Manticore, then replace the table with three logical memory diagrams
      titled "Как реализуются абстракции", as requested. Keep the table in
      reserve; the three consecutive slides advance normally with space.
- [x] S4.11 Rebuild the memory schematics on one aligned grid: equal
      columns, fixed storage rows, centred cells and identical connectors.
      Align the compiler output panels and their runtime captions too.
      Remove the dynamic-call target and three-dialect examples from the
      active deck at the speaker's request; retain their markup in reserve.
- [x] S4.12 Annotate memory diagrams with checked 64-bit sizes, explain
      field density separately from the existing interface-call benchmark,
      review hash lookup/storage algorithms, and add a reproducible memory
      model comparison. These are structural byte counts, not RSS results.
- [x] S4.13 Put the existing corrected packed-int foreach timings directly
      inside the packed-array cards. Show PHP JIT and TypePHP std::vector
      baselines and state that hash-array foreach was not measured.
- [x] S4.14 Add the speaker-selected source-review findings: TypePHP native
      arithmetic/error behavior and Manticore property state/visibility.
      Distinguish source deductions from fresh executable reproductions.

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

- [x] S6.8 Add the default Pyhnik 2026 theme alongside the three existing
      directions. Use the conference's original SVG logo, locally stored
      Bounded font, navy ground and green accents. Preserve illustration
      backgrounds and contrast overlays, and respect a saved theme choice.
      Verified: 59 slides in four themes at rest/note/expand with no text
      collisions or overflows; browser checks for fonts, logos, default and
      persisted selection, unchanged illustration backgrounds. The conference
      logo clears content; faint decorative divider numerals are background art.

- [x] S6.9 Extend the Pyhnik theme with 12 active navy/green illustrations
      and restrained Matrix details, preserving the original theme assets.
      Blend the cover into the navy background, correct its event caption,
      and increase the Rust question line height from 0.94 to 1.12.
      Park the six-slide foreach chapter and former penultimate conclusion
      at the speaker's request. Add a scannable conference QR tail tag to
      the last slide. Verification: 52 slides x four themes x three states,
      no text collisions or overflows; QR decoded from the actual final
      screenshot at 1920/1280/960 widths. Prompts are stored with the assets.

- [x] S6.10 Replace the CSS QR plate with a painted sign on a closer elephant.
      The final PNG includes the working QR, matched to the enamel and tilt;
      the frame, rope and shadows remain painted. The speaker authorized the
      precise raster correction. The HTML/CSS tag is removed. ZXing decoded
      the actual final slide at 1920/1280/960 widths to the conference URL.

- [x] S6.11 Illustrate the language/infrastructure slide with Don Corleone's
      elephant weighing PHP against a heavier Laravel ecosystem. Rename the
      rankings slide to the PHP survival question and add the Revenant chase
      illustration. Keep text clear of both scenes; resize the survival title
      in other themes too. Verified 52 slides in all four themes and three states.

- [x] S6.12 Reorder the opening argument: complexity, evidence about libraries
      and existing code, then the Don elephant infrastructure metaphor.
      Add the qualified claim that higher abstractions may save time. Park
      the redundant infrastructure-value slide. Verified 51 slides across
      all four themes and rest/note/expand states, with no text collisions
      or overflows.

- [x] S6.13 Add the speaker's language-efficiency thesis below the four
      ranking cards on the PHP survival slide. Verified 51 slides in four
      themes and three states with no collisions or overflows.

- [x] S6.14 Reframe hosting as the shift from shared hosting to controllable
      cloud images, without claiming PHP uniquely isolates tenants or that
      C++ is intrinsically forbidden. Replace the DI-only example with three
      build-time cards: services, routes and Twig. Use the realistic Rust
      Cohle interview/grinder illustration on the compilation-attempts divider.
      Restore a qualitative compatibility table and add TypePHP vector and
      elephc packed-buffer examples. Move eight architecture/memory slides
      after the renamed "What is under the hood?" divider. Source evidence:
      dev/research/hosting-buildtime-compatibility-2026-09.md. Verified all
      54 slides in four themes and three states; no collisions or overflows.

- [x] S6.15 Fold the fixed-build-configuration example into a fourth card
      on "What can compilation give us?" and park its standalone slide.
      Keep the requirement that configuration is known at build time.
      Verified 53 slides across all themes and states without overlaps.

- [x] S6.16 Split the ecosystem evidence into a detailed adoption-study slide
      and a Deno dinosaur comic with factual chronology and fictional dialogue.
      Add concrete per-compiler restrictions and consolidate the separate
      dynamic-code, TypePHP structure/native-restrictions and Manticore property
      slides. Park the redundant representation slide. Verify the foreach
      mutation and native-division examples on TypePHP 0.9.2: foreach agrees,
      division returns 3 instead of PHP's 3.5. Preserve probes in bench/semantic-probes.
      Rewrite overflow as a measured comparison plus the Diamond Arm parody;
      refine the actress with a face reference and Chinese-inspired TypePHP
      costume. Add PHP source to the interface-call benchmark. Repair the
      Laravel layout; the final image retains only the crate and machine.
      Add HipHop, JPHP and KPHP stories after the timeline: Dumbledore,
      a plain JPHP slide, and the PHP elephant without Durov. Retain the practical
      execution-choice slide. Verify 52 slides across four themes and three
      states, and inspect the changed slide screenshots.

- [x] S6.17 Add the hyperrealistic Reaper visiting PHP after other languages
      on the language-obituary slide. Preserve living windows for earlier
      languages and readable left-column copy. Verified the Pyhnik deck layout.

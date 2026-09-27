# Narrative review — 2026-09-27

Independent read-only review of all 57 active slides, speaker notes and
expandable cards, against `dev/PLAN.md` and `dev/WORKFLOW.md`.
No external fact-check or rehearsal was performed. These are reviewer
proposals, not approved changes. The current delivery preserves the slides
that the speaker explicitly asked to leave unchanged.

## Findings, in priority order

Follow-up approved by the speaker: the opening now has ten slides, with five
preserved in reserve. The Bun card has been synchronized with the approved
notes. August results and their explanation now precede September results;
the 5202/4512 ms distinction is explicitly dated. Other proposals below
remain review observations, not automatically accepted edits.

1. **The opening delays the central question.** The first 15 slides cover
   AI, new languages, rewrites, productivity, rankings and ecosystem value.
   The question about new large PHP projects is raised but not answered.
   Add a spoken link to the bounded question: can PHP change its execution
   and capabilities while retaining its ecosystem? Budget 8–10 minutes for
   the opening. Do not turn every expandable card into a separate topic.

2. **The rewrite slide has inconsistent layers.** In `00-intro.html`,
   "Перепишем всё на RUST?" now has qualified Bun narration, but its card
   still stresses eleven days and passing tests. The expansion's nineteen
   fixed regressions needs a publication date; it is not a current total.
   Phargo is described as ongoing in the notes but stopped on the screen.
   The Android expansion generalizes one experience into a sufficient rule.
   Synchronize screen and expansions with the approved qualifications.

3. **A premise is stronger than the argument.** "Языки наследуют решения
   прошлого" says the original reasons no longer exist. The later talk
   itself shows that memory, complexity and compatibility still matter.
   Replace that line with a statement that languages retain decisions made
   for the tasks and constraints of their time.

4. **A customer is not proven to cause survival.** The timeline and
   "У долгоживущих проектов есть конкретный заказчик" support a practical
   argument about sustained need and resources, not a universal causal law.
   Remove causal "alive because" language from project details; scope the
   observation to the projects shown. A customer does not guarantee success.

5. **Measurement chronology obscures the mechanism.** `04-next.html`
   alternates August results, September results, August implementation
   details and new elephc behavior. Historical elephc figures of 5202 and
   4512 ms require an explanation. Prefer current results, generated C++
   and the elephc improvement in the main flow; put the historical results
   in reserve, or present the historical block before the current one.

6. **The paired TypePHP example is not behavior preserving.** In
   "Структура программы должна быть известна при сборке", the right-hand
   example drops the output and changes a nested declaration into a call.
   Label the examples as independent illustrations of restrictions, not an
   equivalent transformation, or split them into individual examples.

7. **The Manticore headline overstates the comparison.** "...2,9 раза,
   не в 22,8" contrasts different machines and baselines. The notes explain
   this correctly. Use a neutral headline about the choice of baseline;
   show 15x against PHP without OPcache and 2.9x against JIT as local results.

8. **The final direction is not yet a demonstrated general capability.**
   The talk demonstrates partial migration, incompatibilities and one
   compiled Laravel module. Preserve the user's ecosystem-migration thesis,
   but distinguish it from full compatibility delivered today. Identify
   Limelight's relationship to the speaker without beginning a new topic.

## Suggested narrative spine

1. AI reduces code-writing cost; a proven system and its ecosystem retain value.
2. Ask how PHP can evolve without replacing the entire ecosystem.
3. Explain JIT and build-time work as different forms of compilation.
4. Use compiler history to introduce compatibility and sustained sponsorship.
5. Explain numbers, dynamic calls and arrays as concrete semantic constraints.
6. Measure representations and then application-level effects.
7. Separate the practical entry point (a module) from the long-term direction
   (gradual language extension with an explicit compatibility boundary).

## Timing and acceptance

The reviewer counted approximately 3227 words of notes, 1347 in the first
20 slides. These are estimates from HTML, not rehearsal measurements.
Reading alone is roughly 25–30 minutes; code explanations, tables and pauses
could bring the talk to 40–50 minutes before questions. The 40–45 minute
plan has no demonstrated reserve.

Before accepting a structural revision, rehearse once, verify that each
screen agrees with its notes and expanded details, and check that every
question raised is either answered or explicitly outside the talk's scope.
Do not cut technical qualifications merely to recover time.

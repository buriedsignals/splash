# Stress findings, round four — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Close the twenty-five defects the fourth stress test found, and — for every defect that
can happen in more than one skill — close it as a **rule in the catalogue**, so the trait
derivation carries it everywhere its traits reach.

**Source:** `2026-08-21-stress-findings-round-four.md` and its `-raw` companion (every
reproduction command is in the raw file). Acceptance is the four frozen stress stories
`stress-p-transport-ridership`, `stress-q-safety-incidents`, `stress-r-greek-schools`,
`stress-s-unspent-fund`.

**The theme, and what it demands of every task in this plan.** Round three's redesign began
"a checker that recognises shapes will always be one shape behind." Round four's finding is one
layer up: **every mechanism that failed here failed silently, and several were verified green while
failing.** A superlative that can never resolve prints `unverifiable` and looks honest. Eighteen
dead runners sat under a green suite that only exercises the seed. Two gates agreed in their
fixtures and disagreed on a first delivery. Two files nothing writes went unnoticed because every
skill ships its own copy.

So this plan adds one requirement to the usual mutation check. For every mechanism you touch:
**demonstrate the failing path on real material, not on a fixture built to fail.** If a decision
function has a branch that no story in `stories/` or `proof/` can reach, say so in the commit
body and name what would reach it. A branch nothing can reach is the defect, not the evidence.

## Global Constraints

- Runtime is **Bun**. Tests are `bun:test`. TDD: the failing test comes first, watched failing.
- English only in code, comments and commits. A beat's own delivered TEXT may be in the story's
  language. **No mention of any AI tool anywhere.** **Never `git commit --amend`** in this tree.
- **No cross-skill runtime imports.** A decision reaching a second skill is COPIED byte-identically
  and registered in `COPIES` (`skills/splash/test/guard-copies-parity.test.ts`).
- Edit through `Bash` (heredocs / sed), never Edit/Write — a global formatter hook breaks
  byte-identical copies.
- Every mechanism is **mutation-checked**, exact red message in the commit body.
- `owedRows()`, `unstatedRows()` and `strayRows()` empty when a task finishes; an exception needs a
  MEASURED reason.
- Never modify anything under a story's `source/`.
- A new catalogue rule declares the **traits** it requires, never skills.

---

### Task A — the editorial check stops reporting confidence it does not have (findings 1, 2, 3, 4, 6)

Five findings, one cause, and the third consecutive round to open here. Round one taught the
checker directions, round two totality, round three superlatives — and it still closes G1
`supported` on a false headline's correction for three reasons all of which are wrong.

**Do not add a sixth shape.** Change what a verdict is allowed to mean.

- [ ] **A bare numeral inside a column's range is not editorial support.** Today `233` "confirms"
  a takeaway because it falls inside `incidents [96, 412]`, and `100` — the *k* of "100k" — does
  the same. Establish, with the corpus in front of you, what a numeral-in-range is actually worth,
  and give it a verdict name that says so. It must not be the same word the checker uses when it
  has genuinely confirmed a claim. `groundingScalar` must not be able to close G1 on these alone.
- [ ] **`resolveSuperlative` gets rows, or it goes.** It resolves an entity to its row; the profile
  has never carried rows, so it has returned `unverifiable` for every superlative ever put to it,
  in every story. Decide with evidence: give the check the frozen CSV alongside the profile, or
  extend the profile, or retire the shape. Whichever you choose, prove the check can now return
  `supported` AND `contradicted` on real story material — name both stories and both sentences in
  the commit body. A shape that still cannot decide anything must be deleted, not documented.
- [ ] **The vocabulary stops being a list of four phrases.** `the worst`, `the best`, `the
  largest`, `the biggest`, `the fewest`, `the greatest`, `the smallest`, `worst-hit` are all
  invisible today. Widen it — and where a word carries a polarity the data cannot supply ("worst"
  needs to know whether high is bad), return `unverifiable` NAMING the missing polarity. Invisible
  is the one thing it may not be.
- [ ] **`groundingScalar` stops discarding `coverage`.** Round three built `coverage` so silence
  would stop looking like confirmation, and the scalar throws it away: `stress-s` closes G1
  `supported` on `2026` matching `year [2026, 2026]` — a column whose `min === max`, so the match
  cannot fail. A check that cannot fail is not support. The scalar must reflect what fraction of
  the takeaway was actually evaluated, and a tautological match must not count.
- [ ] **A column the profiler refused disarms every claim about it, silently.** `stress-r`'s
  `σχολεία_2026` is typed `text` for one corrupt cell in thirteen, so the takeaway's real numbers
  are never attempted and the verdict is an `unverifiable` indistinguishable from a genuinely hard
  claim. When a claim's numbers would have been checked against a column the profiler refused, say
  so, and name the column and the refusal's reason.
- [ ] **Acceptance:** every sentence in the raw findings file's Task-A section, run against its own
  frozen profile, with verdicts in the commit body. **Local to `storyboard`; the catalogue cannot
  reach it — say so in the commit.**

---

### Task B — the toolchain learns that a count can have a denominator (finding 5)

Nothing in `skills/` or `scripts/` reasons about a count against its denominator. `stress-q`'s
headline is false per resident with `residents` one column away; `stress-p` inverts at the top
(Porto 416 trips per resident against Lisboa's 393). Four of twenty-one frozen stories carry an
explicit denominator and none was ever asked about it. Two of four producers found it unprompted
and built the honest chart; the other two were never in a position to.

**The constraint that shapes this task.** `stress-a-energy-bills` carries `households` beside
`price_eur` and draws it raw — correctly, because a household bill is already a per-household
figure. So this must never divide anything. It reports, and it asks.

- [ ] The profile names a candidate denominator column when one is present, by NAME, excluding the
  year column. Reporting, never repair — the doctrine `gaps` and `mixedUnits` already follow.
- [ ] Grounding refuses to confirm a raw-count superlative or comparison while a denominator
  candidate exists, and its detail names **both rankings** so the journalist chooses with the
  numbers in front of them.
- [ ] **Sharing:** the producing half. A beat drawn from a count column that has a denominator
  beside it must state, in its own `BRIEF.md`, which reading it draws. Declare it as a rule
  requiring `materialises-a-beat`, detected on the beat's own record.
- [ ] Acceptance: `stress-q` and `stress-p` both surface the question; `stress-a` does not become
  a false positive.

---

### Task C — `whereIs` and `deliver` stop disagreeing (findings 7, 8, 9, 10)

Four findings, one shape: two gates that agree in their fixtures and disagree on a real story.
`splash/SKILL.md`'s own "one gotcha" section records this class as fixed for G2. It is not fixed
for G3, G4, or the closing offer.

- [ ] **First delivery.** `whereIs` returns `{"phase":"delivery","missing":[]}` on a beat where
  `materialise` throws *"this output has no bound review"*. `where.mjs` reads `OUTPUT-REVIEW.json`
  only inside `feedbackRevisionState`, behind a `FEEDBACK.md` that cannot exist before a first
  delivery ever happened. Make the two gates read the same requirement. And note what the grep
  found: `writeOutputReview` has **no caller outside its own test**, and none of
  `splash/SKILL.md`, `storyboard/SKILL.md` or `chart-beat/SKILL.md` names `OUTPUT-REVIEW.json`,
  `planVersion` or `findingIds`. A required record no documented path produces is half the defect.
- [ ] **The closing offer.** `whereIs` returned `done` while all three of `stress-p`'s exports
  carried `.another-format: pending` and `.other-subjects: pending`. `deliver/SKILL.md` names this
  gap in its own parenthesis — *"(The story-level gate does not consult it yet; that wiring belongs
  to `where.mjs`, which another chantier owns.)"* This is that chantier.
- [ ] **`language`.** Required by `deliver`, in neither Gate 2's `REQUIRED_SCALARS`. The refusal in
  `format-handover.mjs:30` is deliberate and well written and fires after the storyboard, palette,
  component, render and approval are all done — for a field ruling R4 exists because *"a hand-over
  came out in English on a French story."* Ask for it when it is cheap to answer.
- [ ] **The hosted-embed disagreement.** Preflight probes and gets 403; `offerForms` checks for the
  presence of two env vars and offers the form anyway. Both skills' documented rules held and the
  journalist was told two different things. Reconcile them, or state in the commit why a
  present-but-refused credential must still be offered — with the measurement.
- [ ] Ask the sharing question for each and answer it in the commit.

---

### Task D — what a delivered artefact is allowed to say (findings 11, 15, and the credit half of 12)

- [ ] **An invented source is printed on three delivered artefacts.** All of `stress-p`'s beats
  carry *"Source: city network figures for 2025, compiled by Buried Signals"*. The frozen article
  names no source. `credit` is a REQUIRED scalar with no honest empty value, so an unattended run
  filled it with something plausible — round two's finding 9 recurring, with attribution to a real
  named organisation as the consequence. Give `credit` an honest way to say *the journalist gave
  none*, and make the delivered artefact carry that state visibly rather than a plausible
  invention.
- [ ] **Sharing:** a rule requiring `materialises-a-beat` — the credit a delivered artefact prints
  traces to the story's own record. Detected on the DELIVERED artefact.
- [ ] **A double hyphen reaches the pixels, the `<desc>`, and the hand-over's alt text.** Scanned:
  22 files in the tree contain ` -- `, 21 only in code comments; `stress-q`'s is the first to reach
  a reader. Declare a rule requiring `materialises-a-beat` over the delivered artefact's own
  reader-visible text. Keep it to what is unambiguous — do not invent a prose style checker.

---

### Task E — a label belongs to its own row (findings 12, 13, 14)

`stress-r`'s delivered chart states that the Peloponnese has no 2026 figure and that Eastern
Macedonia and Thrace has 392 schools. Both false. The left labels are de-collided in 2020 rank
order, the right values independently against their own 2026 y, and the one `null` borrows its
2020 y — so exactly two rows cross. Every other row is right, `inspectSvg` passed 31/31,
`assertDeliveredSize` and `assertTypeFloor` passed, and it was approved and delivered.

The same beat's FIRST version drew a 1104-school region above an 1802-school one.

`types/slope.md` REQUIRES vertical de-collision for a many-category slope and **no skill provides a
helper for it**, unlike `wrap()` which the seed does carry. Two data-integrity bugs from one
hand-rolled pass, in one beat, by a careful author.

- [ ] Provide the de-collision, where an author reaches for it — the same place `wrap()` lives.
  Copy it to every skill that draws its own geometry and register the copies.
- [ ] **Sharing:** a rule requiring `draws-own-geometry` — a de-collided label stack preserves the
  order of the values it names, and a row's label and its value name the same row. Detected on the
  delivered artefact, where R1 is visible and every assertion that ran was blind to it.
- [ ] Acceptance: re-render `stress-r`'s beat and show the two rows correct. Mutation-check that
  the guard reddens on the shipped SVG as it stands today.

---

### Task F — the machinery that quietly stopped working (findings 16, 19, 20, 21)

- [ ] **Eighteen dead runners.** `runs=5 fails=18` across `proof/*/render-web.mjs`; the five that
  run belong to another skill. All eighteen die on round two's own `assertRecordedLanguage`, whose
  callers were never migrated. Measured for contrast: `proof/*/render-still.mjs` and
  `render-map.mjs` are **14 of 14 green**, so the rot is `chart-web`'s alone — but the sweep that
  would have caught it exists for none of them. Migrate the eighteen. Two of them
  (`web-income-life-expectancy`, `web-co2-decline-slope`) also still assert `<html lang="fr">`, a
  shell `renderWeb` no longer emits.
- [ ] **Sharing:** the sweep. A test that CALLS every example runner, not one that reads them.
  `chart-web/SKILL.md:29` already warns about this exact failure from a previous occurrence, and
  the suite was green both times because it exercises the seed. Declare it as a rule requiring
  `materialises-a-beat`. `SKILL.md:287`'s Quick start names a runner that has been dead since the
  round-two fix — fix that too.
- [ ] **No slopegraph can pass `verify-web`.** The HOVER check probes each mark at the centre of
  its bounding box; for a diagonal that is the line's midpoint, and two crossing lines share it
  exactly. The format's own committed slopegraph fails. Real pointer events at 15% and 85% along
  each line answer 12 out of 12. Fix the probe point. **Sharing:** the same bounding-box probe
  lives in five verifiers across three skills (`chart-web/verify-web.mjs`,
  `chart-web/verify-entrance.mjs`, `map-web/verify-interaction.mjs`, `map-web/verify-live-map.mjs`,
  `scrolly/verify-scrolly.mjs`) — measure which of them share the defect before choosing where the
  fix lands.
- [ ] **`runPreflight` has no default for `fetchFn`** and reports every capability closed, with a
  reason a journalist reads as "MapTiler is down". With one passed: map 200, datawrapper 200,
  hostedEmbed 403. Default it or throw naming it — never report a capability closed for a reason
  that is not about the capability.
- [ ] **`chart-web` is not vendored.** `shared/` holds `chart-beat/` and `chart-video/` only, so a
  story's web beat imports four levels up into `skills/` — a path that would not resolve in an
  installed root, and which all eighteen `proof/` beats also take.

---

### Task G — two files nothing writes (findings 17, 18)

Both were invisible for the same reason: every skill ships its own copy in its own directory, so
the seed resolves by walking up, and nobody noticed a STORY has none.

- [ ] **`TYPEFACE.md`.** Five render paths refuse without it (`chart-beat`, `chart-web`,
  `chart-video`, `map-beat`, `shared/`); `grep -rn "TYPEFACE.md" skills/ shared/ | grep -i write`
  returns nothing. There is no typeface movement in `exchange.md`, no gate in `checkStoryboard`,
  no owning skill. A runner that calls `readTypeface` cannot proceed; one that does not rasterises
  in `Helvetica, Arial, sans-serif` — a face nobody chose, which is exactly what `PALETTE.md`
  exists to have closed for colour. Decide who owns it and give it a writer. (`NEWSROOM.md` records
  `Space Grotesk`, and `familyResolves` is `false` for it on this machine — the refusal is right,
  there is simply no path to answer it.)
- [ ] **Sharing:** a rule that a beat's typeface is recorded rather than silently defaulted.
  Choose the trait from what the witnesses prove, not from this sentence.
- [ ] **`SUBJECTS.md`.** `exchange.md` ⑩ requires that what the journalist DROPPED be written down;
  nothing writes it. `stress-p` went through three renders, three approvals and three deliveries
  with none on disk, and `otherSubjectsFor` at the end of `deliver` reads a file whose only writer
  is a call nobody is obliged to make — the "lives in a conversation and dies with it" failure the
  file exists to prevent.

---

### Task H — the recommender stops treating column types as evidence of a story (findings 22, 23, 24)

`chart.streamgraph` is recommended **first, confidently, with zero unresolved requirements**, for
a table of one row whose only "measure" is an identifier equal to 1.

- [ ] **Row count is evidence.** Of 46 requirements in `requirementFinding`, **2** consult
  `rowCount`. `temporal`, `ordered-axis`, `numeric-series`, `multiple-series`, `numeric-pair`,
  `few-series`, `part-to-whole` and `rank` are all satisfied by column TYPE alone. The vocabulary
  already holds the right idea in exactly one entry — `two-moments` asks for `distinct >= 2`.
  A time axis with one moment is not an axis.
- [ ] **`year` is not a measure.** `facts.numeric` and `facts.temporal` are computed independently,
  so a year column lands in both and a plain (year, value) table claims two numeric columns —
  satisfying `multiple-series` on the strength of its own x-axis. **9 of 21 stories.** Note what
  makes this sharp: `ground-claim.mjs`'s `findValueColumn` already excludes the year column. Two
  modules inside one skill answer the same question opposite ways. Give the skill one answer, in
  one place, and let both read it.
- [ ] **A treatment is checked against its own sheet's refusals.** A six-row Scatter closed the
  gate although `types/scatter.md` refuses it outright (*"fewer than about eight or ten points … a
  cloud needs enough members to have a shape"*). `formatCandidates` lifts a sheet's *What it is for*
  sentence and never reads its *When NOT to use it*.
- [ ] **`assertDistinctWays` compares names.** It accepts `["Bar and column","Lollipop","Treemap"]`
  though `types/lollipop.md` calls a lollipop *"a bar chart's thin sibling: same job … 'a bar,
  minus the fill'"*. Two labels for one idea is what the function exists to refuse.
- [ ] Acceptance: `stress-s`'s profile recommends nothing, or recommends with its refusal visible;
  the nine year-column stories stop claiming two measures.

---

### Task I — the documentation that describes a toolchain two skills ago (finding 11 of the raw file, P11)

- [ ] `chart-beat/SKILL.md`'s Overview still says *"**SP1 scope: the static format only.**
  Interactive and video chart beats are later sub-projects. `renderStill` is the first rung of the
  render ladder; the rungs above it do not exist yet."* Both exist and both ship beats;
  `splash/SKILL.md`'s phase table dispatches to them by name. A reader following that sentence
  refuses work the orchestrator hands them.
- [ ] Sweep the other producing skills' SKILL.md for the same shape — a scope or a limitation
  stated as current that the tree has since outgrown — and report what you find, fixing what is
  plainly wrong and naming anything that needs a decision.

---

## Deferred, and why — for Rémy, not for an implementer

**Finding 25 — no producer anywhere for "one confirmed figure".** `chart-choice.md`'s nine intent
tables each need two comparable values or a series; `visual-catalog.json`'s 41 treatments hold
nothing for a single number (the nearest, `chart.bullet`, still needs an actual AND a target);
`image-beat` needs the journalist's own photographs. So the honest answer to `stress-s` — a big
number on a card — has no cell in the catalogue.

This is a gap, not a break: `chart-beat` draws its own geometry and could render it. But adding a
treatment to the catalogue is a product decision about what Splash offers, and it is Rémy's to
make. Task H makes the refusal honest either way; the treatment is not built by this plan.

## Self-review

**Coverage.** Twenty-five findings, nine tasks plus one deferred decision. Six ask the sharing
question and answer it in the catalogue (B, D×2, E, F, G); A, C, H and I are local to the one
checker, the two gates, the one recommender and the documentation, and each says so.

**Two tasks may not pick their answer before measuring** — A's superlative decision (rows,
extension, or retirement) and F's probe-point fix across five verifiers.

**The acceptance test is the four frozen round-four stories**, plus the corpus measurements the
raw findings file already recorded, which every task must leave true or improve.

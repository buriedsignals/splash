# Stress findings, round six — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Close the round-six defects, and — for every defect that can happen in more than one skill
— close it as a rule in the catalogue so the derivation carries it everywhere its traits reach.

**Source:** `2026-08-21-stress-findings-round-six-raw.md` and the six per-beat reports. Acceptance is
the six frozen round-six stories plus the twenty-one before them.

## What round six changed about the round-five triage

The triage put "guards that measure nothing" in tier 2, arguing that *"not one line of it changes
what a reader sees today"*. **Round six disproved that.** `fills-its-frame` caught a real defect on
`stress-ab` — 16.6% and 14.8% against a 17.9% floor — and its eight copies have zero callers. An
unwired guard is not inert; it is a defect that ships. Tier 2 is promoted, and Task WIRE below is
the consequence.

## The three themes, in the order they matter

1. **A missing lexicon is a FALSE CONFIRMATION, not a missing prompt.** Same table, same sentence,
   only the denominator column's name changes language: `ludność` → `supported`, `population` →
   `unverifiable`. The undeclared language switches the round-four downgrade OFF and leaves a verdict
   more confident than an unreadable claim receives.
2. **A requirement that cannot fire is worse than a missing one**, because it reads as covered.
   `part-to-whole` needs two numeric columns and a part-to-whole table is long-form, so five
   treatments have been unreachable for six rounds.
3. **A guard that is distributed but not called has not landed.** Measured on eight skills, twice.

## Global Constraints

- Runtime is **Bun**. Tests are `bun:test`. TDD: the failing test first, watched failing.
- English only in code, comments and commits. No mention of any AI tool. **Never `--amend`.**
- **No cross-skill runtime imports.** A decision reaching a second skill is COPIED and registered.
- Edit through `Bash`, never Edit/Write.
- **Shared tree**: commit with explicit paths, never `git add -A`; never `checkout`/`restore` a file
  you did not write; commit early.
- Every mechanism **mutation-checked**, and its failing path demonstrated on **real material**.
- `owedRows()`/`unstatedRows()`/`strayRows()` empty at the end.
- Never modify a story's `source/`.

---

### Task LEX — an undeclared language must not raise confidence

- [ ] `findDenominatorColumn` is bound to `DENOMINATOR_NAME_TOKENS` in four languages. When a
  profile carries a numeric column the detector cannot classify, the raw-count superlative must not
  come back MORE confident than it would in English. Decide the honest mechanism: the check knows
  its own coverage, so it can say "there may be a denominator here I cannot name".
- [ ] The same shape for `isShareColumn` and for the claim vocabulary: a Latin-script language
  outside the four declared produces `scriptsNotRead: []` and a confident empty answer. The
  script-based net cannot see it. Find the mechanism that can, or state the limit where a journalist
  reads it rather than where only a maintainer would.
- [ ] Acceptance: `stress-ad-polish-hospital-beds` and the isolation in the raw findings file.
- [ ] Local to `storyboard` and `intake`; say so.

---

### Task WIRE — a distributed guard that nothing calls

- [ ] `fills-its-frame`: `detect-fills-its-frame.mjs` is present in all eight producing skills and
  has **zero callers** in all eight. Wire it where each skill's own render already refuses things,
  the way `assertExportedSize` is wired. It works — `stress-ab` proved it — it is simply never run.
- [ ] `staggerLacksAnOrder` is imported only by `chart-video/scripts/render-video.mjs`, which renders
  the SKILL's seed. `shared/chart-video/` carries `sizes.mjs` and `timing.ts` and nothing else, so no
  story beat can reach it. Give a beat a sanctioned route, or move the check to where a beat passes.
- [ ] `reveal-fills-the-frame` still walks a hard-coded list of four proof beats. **Derive the
  population.** Extending the list is not a fix.
- [ ] 5 of 13 `verify-scrolly` guards are never called by its driving run, and AC reports nine more
  guard kinds declared beyond those. Not one guard in `verify-map.mjs` is reachable from a command.
  Five of `dw-beat`'s and three of `image-beat`'s have no caller outside their own tests.
- [ ] `guard-wired-to-run` is the discipline that was supposed to prevent all of this. Decide whether
  it can become a guard now — a rule whose decision function asks whether a declared detector has a
  caller — and if it cannot, say precisely what would let it.

---

### Task REQ — requirements that cannot fire, and refusals that are cut in half

- [ ] **`part-to-whole` requires `measures.length >= 2`** and a part-to-whole table is long-form, so
  it fails by construction. Five treatments depend on it: Diverging stacked bar, Marimekko, Pie and
  donut, Stacked bar, Treemap. Measured: none has been chosen in twenty-seven stories.
- [ ] **`raw-observations` and `distribution` read the wrong count, at a floor of five.** A floor of
  five is not a distribution, and these are the only two of 46 requirements that consult row count.
- [ ] **The survey lifts only the FIRST sentence of a type sheet's refusal**, and `REFUSAL_FLAT_RE`
  truncates a flat-form refusal at the first line break. `flow-map.md` refuses many-to-many
  origin-destination data in its SECOND sentence — the sentence that would have stopped `stress-ab`.
  This is round-four finding 24 recurring one level down.
- [ ] Five of fifteen Datawrapper treatment names match no type-survey row, silently disabling the
  only mechanically enforced row limit the survey has. Two scrolly-only types in `MATRIX.md` exist in
  no type sheet. `flow-map.md` names a type the catalogue does not hold.
- [ ] Acceptance: `stress-z` reaches a part-to-whole treatment or is refused for a stated reason;
  `stress-aa` reaches a distribution; `stress-ab`'s refusal reaches the gate.

---

### Task GROUND — the check that keeps answering with the wrong evidence

Fifth consecutive round. Every item is a wrong-evidence answer, not a missing one.

- [ ] **The totality check confirms a sentence that DENIES totality.** `"La somme des parts est
  supérieure à 100."` → `supported`, *"equals the sum of column part_pct (100)"*. It read the numeral
  and not the relation. And `"Les parts font ensemble 100 %"` → `supported` on a column that reaches
  100 only because a −9.7 member cancels a +9.7 overshoot: the parts do not make a whole, they cancel.
- [ ] A numeral equal to a column's `min` or `max`, or present verbatim in a row, is only
  `consistent` — never `supported`. `rowCount` and `column.missing` are never a numeral's home.
- [ ] Coordinate columns are read as measures, so every geographic superlative is ambiguous. A
  four-digit measure value is placed on the period column. A year is placed inside a numeric range.
- [ ] Comma-grouped numerals are refused as ambiguous in an English story; a thousands separator
  makes a claim unverifiable.
- [ ] The two-year comparison only matches when the direction word comes first.
- [ ] Local to `storyboard`; say so.

---

### Task SURF — colour and type against the surface that will actually carry them

- [ ] **`proposePalette` measures a house palette only against the ground `NEWSROOM.md` records.**
  `stress-ad` delivered to PRINT and the newsroom's PRIMARY accent measures **2.20:1** there, with
  nothing anywhere objecting. The documented unattended rule would have sent a near-black full-bleed
  frame to a printer.
- [ ] **The `typeface-is-recorded` exception for `chart-web` is argued on the wrong path.** Its
  reason cites the vendored `render-still.mjs`; the format's delivered artefact is the HTML page, and
  `render-web.mjs` imports `readTypeface` zero times and hard-codes
  `font-family: Helvetica, Arial, sans-serif` at line 524 while `NEWSROOM.md` records Space Grotesk.
  An exception whose measured reason covers a path the format does not deliver is not an exception.
- [ ] `proposePalette` answers "there is no `NEWSROOM.md`" about a complete one.
- [ ] On a dark ground with a light accent, no rule can cross both, and there is no helper.

---

### Task GATE — the records a gate requires and no gate produces

- [ ] **`SUBJECTS.md` is required at G4, produced at G2, and required by no gate between.** Reported
  independently by U, V, W, Y, AC and AD — **six formats across two rounds**, the most-reported
  defect in this project's history. `whereIs` answered `production, missing: []` on a story that
  could not close.
- [ ] **A slot carries exactly one `medium` and one `size`.** A mixed-media scrolly cannot say what
  it is; a journalist asking for portrait AND square gets one slot. Decide whether that is one slot
  with several, or several slots, and make the record able to say it.
- [ ] `writeOutputReview`/`offerForms`/`materialise` require a `planVersion` and `findingIds` the
  caller must repeat; `whereIs`'s approval refusal does not name the file it wants.

---

### Task MAPFLOW — a medium the gate offers and the skill cannot draw

- [ ] `map/web` reports reachable and `map-web` has **no flow machinery**: seed, pure core,
  live-plan builder and interaction model are all proportional-symbol. Five silent failures came out
  of that gap, every one found by driving the page and none by a test.
- [ ] Either `map-web` gains the flow path, or `confirmFormatReachable` stops reporting a
  medium × format the skill cannot produce. The second is the smaller, more honest change if the
  measurement supports it.
- [ ] The map's HEIGHT comes from an inline style inside the file a beat is told to replace; the
  camera and basemap are consts inside the skill a beat may not edit; a beat with no filter dimension
  cannot render and the crash names nothing.

## Self-review

**Coverage.** Seven tasks. Three ask the sharing question and answer it in the catalogue (WIRE, REQ,
SURF); LEX and GROUND are local to the two readers every story passes through and say so; GATE and
MAPFLOW are repairs to machinery that already exists.

**One task may not pick its answer before measuring**: MAPFLOW's choice between building the flow
path and narrowing what the gate offers.

**The acceptance test is the twenty-seven frozen stories.**

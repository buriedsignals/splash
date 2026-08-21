# Stress findings, round five — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Close the eighty-two defects the fifth stress test found, and — for every defect that can
happen in more than one skill — close it as a **rule in the catalogue**, so the trait derivation
carries it everywhere its traits reach.

**Source:** `2026-08-21-stress-findings-round-five-raw.md` and the six per-beat reports. Acceptance
is the six frozen round-five stories.

## The two themes this round found, and what they demand

**1. Every name-based lexicon in this toolchain matches English.** The denominator detector,
`palette`'s subject conventions, the claim vocabulary, `familyResolves`' probe string, and
`creditTracesToRecord`'s case handling were each written against the language its first story
happened to be in. The tree has now shipped a Greek story and an Arabic one. A task that fixes one
of these and not the others has not understood the finding.

**2. A mechanism whose population is typed rather than derived measures nothing.** Round four built
the traits derivation to abolish exactly this, and round five found it in five more places:
`reveal-fills-the-frame` walks a hard-coded list of four; 45 of the 116 members of the
example-runner sweep are libraries with no entrypoint; `verify-map.mjs`'s guards are reachable from
no command; `claimViolations` knows one claim, the CO2 seed's. **Where you fix one of these, derive
the population — do not extend the list.**

## Global Constraints

- Runtime is **Bun**. Tests are `bun:test`. TDD: the failing test comes first, watched failing.
- English only in code, comments and commits. A beat's own delivered TEXT may be in the story's
  language. **No mention of any AI tool anywhere.** **Never `git commit --amend`.**
- **No cross-skill runtime imports.** A decision reaching a second skill is COPIED byte-identically
  and registered in `COPIES`.
- Edit through `Bash`, never Edit/Write — a formatter hook breaks byte-identical copies.
- **This tree is SHARED with other agents.** Commit with explicit paths (`git commit -- a b`),
  never `git add -A`/`.`; never `checkout`/`restore`/`stash` a file you did not write; commit early.
- Every mechanism is **mutation-checked**, and the failing path demonstrated on **real material**
  from `stories/` or `proof/` — not only on a fixture built to fail.
- `owedRows()`, `unstatedRows()`, `strayRows()` empty at the end; an exception needs a MEASURED reason.
- Never modify anything under a story's `source/`.

---

### Task A — the number reader stops inventing measures (C1, Y2, Y3, Y5, T12)

- [ ] **A `<letters>-<digits>` identifier is not a signed number.** `Commune-001` is typed `number`
  with `unit: "Commune"`, `min: -186`, `sum: -17391`; `COVID-19` becomes `-19`. The unit reader
  takes the alphabetic prefix as a unit and the hyphen as a minus sign. Decide what a unit may
  legitimately be, with the corpus in front of you, and refuse the rest. `"12 %"` and `"1,234.5"`
  must keep working — they are round one and round two's own fixtures.
- [ ] The corrupt column poisons three downstream readers: it is offered as a value column, counted
  toward `numeric-pair`/`multiple-series`, and had a denominator attached. Verify each is clean
  after the fix, on `stress-y`'s own frozen profile.
- [ ] **A percentage above 100.** Nothing anywhere notices `104.2` in a column the article itself
  calls a percentage. Report it; never repair it. Decide honestly whether the profiler can know a
  column is a percentage, and if it cannot, say so rather than guessing from a name.
- [ ] Local to `intake`; say so in the commit.

---

### Task B — the editorial check stops answering with the wrong evidence (U1, Y1, Y4, T13, X7, V15)

The fourth consecutive round to open here, and this time the defects are in code round four wrote.

- [ ] **An "equals" that is 27% out.** `matchesAggregate`'s absolute floor of 0.5 declared
  `0.61` equal to a column summing to `0.482` and returned `supported` — the strongest verdict
  there is. The floor has a real reason in its own comment; it scales catastrophically downward.
  **Measured: 7 of 27 frozen stories carry a column summing under 50.** Fix the floor so it cannot
  exceed the value it is comparing.
- [ ] **A year placed inside a household count, reported `consistent`.** Decide what `consistent`
  may mean when the matched column is not plausibly the sentence's subject.
- [ ] **Two clauses of one takeaway decided against different evidence** (T13), and **a superlative
  attached to a REFUSED column on an incidental word** (T12) — the round-four refused-column fix,
  matching on a word the sentence used incidentally.
- [ ] **A stated multiplier is never read**: `"142 million"` cannot be grounded against a column in
  base units. Decide whether to read the multiplier or to say plainly that it cannot.
- [ ] **A takeaway the frozen data refutes closed G1 as `unverifiable`** (Y1). That is the shape
  this whole checker exists to prevent.
- [ ] Local to `storyboard`; say so.

---

### Task C — the lexicons stop being English (X3, X8, C3, X4, X6, X1)

**Theme 1. Fix these together or not at all.**

- [ ] `palette`'s `SUBJECT_CONVENTIONS`, the denominator detector, and `groundTakeaway`'s claim
  vocabulary each match English (and sometimes French) words. Decide the honest general answer:
  either these lexicons declare their language and REFUSE to conclude outside it — naming what they
  could not read — or they gain the languages the tree has shipped. **A silent miss is the defect**;
  a stated one is not.
- [ ] `familyResolves` probes a **Latin** string, so the typeface gate certifies a face that draws
  Arabic as empty boxes. Probe the text the story will actually draw.
- [ ] `creditTracesToRecord` cannot see a fabricated credit in a non-cased script.
- [ ] `resvg` ignores SVG `direction` and lays Arabic out left-to-right. A rasteriser limitation:
  establish it, and make the toolchain SAY so rather than ship silently-wrong punctuation.
- [ ] **Sharing:** at least one of these is a rule. Choose the trait from what the witnesses prove.

---

### Task D — a size the gate can choose is a size a producer can honour (T2, T3, W1, W12, V2, V3, V4, V12)

The first round ever to pin `portrait` found two of eight producing skills unable to honour it.

- [ ] `map-beat` and `image-beat` ship **no size table**. Give them one, or make gate 2c unable to
  offer a size the chosen medium cannot produce. The second is the better shape if the measurement
  supports it.
- [ ] `chart-video/scripts/sizes.mjs` points three times at a file that is not in this skill;
  `shared/chart-video/` does not vendor `render-still.mjs`; the two portrait refusals are
  unreachable from a chart-video beat; the two shared size guards read markup a video never yields.
- [ ] **A stage is `{top, bottom}` only** and the 6%-per-side reserve is enforced by nothing.
- [ ] **A slot records ONE size** and V's journalist asked for two frames of one argument
  (portrait for stories, square for the feed). Decide whether that is a slot with two sizes or two
  slots, and make the record able to say it.
- [ ] **Sharing:** a rule that a producing skill can honour every size the gate may pin. Derive the
  population; do not list the skills.

---

### Task E — the frame, and the motion inside it (the owner's point, T2-controller, T4, T5, T6)

**THE OWNER'S RULING, and it is not up for debate.** `stress-t`'s map video stipples every
reporting country with "pending" dots and fills them in a staggered cascade. The component's own
comment justifies the dots as distinct from "no data" — coherent, and beside the point. The dots
exist only to service a staggered reveal, and `motion-grammar.md` forbids that reveal twice over:

> The only thing that earns an animation is **evidence appearing** … If a layer moves and no new
> evidence arrived with it, that motion is `anti-patterns.md`'s "decoration that encodes nothing"
> with a time axis.

> The order is chronological, or it is argumentative … It never follows an arbitrary order chosen
> for visual interest — bars bouncing in by index, categories popping in at random.

**A choropleth of one snapshot has no order across its shapes.** Eleven countries measured in March
2025 have no chronology and no argument that ranks them, so staggering their fills is exactly the
arbitrary order the doctrine bans, and the pending dots are a placeholder invented to service it.
The hatch stays: "did not report" encodes a fact.

- [ ] Rebuild the beat's build as the events it actually has — the values arrive together, then the
  subject is accented, then the conclusion appears — and re-render.
- [ ] **Sharing:** a rule requiring `timed-build-that-ends`. A reveal staggered across marks that
  carry no order is decoration. State the decision function so it can tell a time series (ordered,
  stagger legitimate) from a snapshot (unordered, stagger arbitrary).
- [ ] **No frame-fill rule reaches a fixed frame.** `fills-its-frame` requires
  `ships-standalone-html`, so the question is asked of web formats — whose container varies — and
  never of static or video, whose frame is fixed and known at render time. Re-declare it against
  the trait that describes the property.
- [ ] `decollide` is unreachable from every video component (it imports a rasteriser); a map label
  clipped by the plate is silent; `claimViolations` knows one claim, the CO2 seed's.

---

### Task F — colour, credit and the surface the producer will actually use (Y6, Y7, Y8, Y9, X2, W2)

- [ ] **`credit: unattributed` reaches no producer.** `buildChartPayload` would print the word
  "unattributed" under a published chart. `creditLine`/`UNATTRIBUTED_CREDIT` are read by
  `storyboard` and `deliver` and by nothing that draws pixels. Round four's fix is half-landed.
- [ ] **The honest absence defeats the guard built to see it.** `every-photo-says-what-it-shows`
  reads `Source: not stated` as a source and answers `missingCredit: 0`. Between the agent's own
  passes 2 and 3 nothing changed but the WORDING of the absence. Whatever you do here, the rule
  must be able to tell "recorded as absent" from "present".
- [ ] **The accent reaches no non-bar chart type** — `base-color` is set only when the type matches
  `/bars|column/`, so a scatter falls back to `custom-colors`, which round three measured as inert.
  Measured: 2014 px of Datawrapper blue against 1811 px of house colour, all of it rule and label.
- [ ] **A dark-ground newsroom cannot use the Datawrapper path and finds out after publishing.**
  Preflight says available, the producer gate never mentions the surface, `proposePalette` offers
  this newsroom only dark grounds, and the refusal fires after the chart is live. Move the question
  to where it can still be answered.
- [ ] `proposeCredit` recommended `unattributed` on an article that names its source.
- [ ] **Sharing:** the credit rule already exists (`credit-traces-to-the-record`). Make it reach
  the producers.

---

### Task G — the last mile (Y11, Y12, Y13, Y15, Y16, Y17, T10, T11, V7, V8, V10, W9, W10, and SUBJECTS.md)

- [ ] **`cms-insertion` reads a PNG as UTF-8** — `length 73479, U+FFFD 30131` — and would post that
  into a CMS. It is offered `available: true` and is the form Y's journalist explicitly wanted.
- [ ] **`owned-file` ships the beat's internals**, the whole `renders/` tree unfiltered, in every
  format — reported independently by T, V and W.
- [ ] **The hand-over promises a vector that does not exist** (Y13), its role table is keyed on
  extension and ignores the format it is given (V8), and it carries ONE alt and ONE credit where an
  image beat has one of each per photograph (W10).
- [ ] **`SUBJECTS.md` is required at G4 and checked by neither G2 gate** — reported independently by
  U, V, W and Y. Four formats, one gap, and it is round-four finding 9 one file over.
- [ ] `source-bundle` offered for a beat with no source; `whereIs`'s approval refusal does not name
  the file it wants; `writeOutputReview` makes the caller repeat a digest it computes itself;
  `DATAWRAPPER.json` does not record the size; the closing offer asks for a word the recorder rejects.

---

### Task H — the guards that measure nothing (theme 2: T7, T8, T9, W7, W8, X5, X9, Y20, U2, U's 5-of-13)

**Derive every population. Do not extend a list.**

- [ ] **`reveal-fills-the-frame` walks a hard-coded list of four** proof beats, asserted only
  `> 0`, never against the floor the guard defines. A new scrolly is measured by none of it.
- [ ] **45 of the 116 members of the example-runner sweep have no entrypoint** — they are library
  modules; spawning them renders nothing and exits 0. The sweep reports "55 ran to completion" and
  39% of what it counts proves nothing. Also: `example-runners.mjs`'s header claims "IT DOES NOT
  WRITE INTO THE REPOSITORY" while testing for the STRING `outDir` rather than the ability to be
  aimed — `stress-x`'s beat, written from `chart-beat`'s own Quick start, rewrote its committed
  renders while the scratch directory stayed empty. **These sweeps are in `ci.yml`.**
- [ ] **Not one guard in `verify-map.mjs` is reachable from a command**; five of `dw-beat`'s and
  three of `image-beat`'s declared guards have no caller outside their own tests; `inspectSvg` is
  called by nothing outside its test file *and it caught a real defect this round*.
- [ ] `plateFollowsGround` passes a reading that never happened; `verify-map.mjs` declares
  `surfaceLuminance` twice, byte for byte.
- [ ] This is what the `guard-wired-to-run` discipline was supposed to prevent. Decide whether that
  discipline can become a guard now, and if not, say what would let it.

---

### Task I — the residue, each small and each real

- [ ] T1 nothing maps a country NAME to a shape key, and `unmatched-value-hides` only worked
  because the beat keyed by the raw source string, a convention nothing documents · T14
  `formatCandidates` documents a field it does not accept · V1 `framingMeasurement` cannot read a
  series that crosses zero · V6 a `csvSplitByHand` false positive · V11 `rampsFromSource` throws on
  the shape its own guard list implies · V13 the last rung of the ladder has no mechanical form ·
  V14 `assertDistinctWays` accepts treatments that exist in no type sheet · W3 the refusal is one
  field at a time, so three gaps take three round trips · W5 the seed uses `captionTop` as a
  baseline and `creditTop` as a top · W6 the letterbox bar is never measured · W13 recording a
  typeface for an image story needs a cross-skill import · W14 `stress-h`'s `source/data.csv` is
  JSON · Y10 a scatter's x axis is unmanaged and landscape ships `-4,000 households` · Y18 a type
  sheet's refusal in an unrecognised unit is not machine-checkable · Y19 the Datawrapper treatment
  map has no distribution type · T5 profile `duplicates` has a writer and no reader.
- [ ] For each: fix it, or state in the commit why it stands. Ask the sharing question for each.

## Self-review

**Coverage.** Eighty-two findings, nine tasks. Four ask the sharing question and answer it in the
catalogue (C, D, E, F); A and B are local to the one profiler and the one checker every story
passes through and say so; G, H and I are repairs to machinery that already exists.

**Two tasks may not pick their answer before measuring** — C's lexicon decision (declare-and-refuse
versus extend) and D's size decision (give two skills a table versus stop the gate offering).

**The acceptance test is the six frozen round-five stories**, plus every corpus measurement the raw
findings file records, which each task must leave true or improve.

---

## Rulings

**The CMS payload gets no catalogue rule, and that is the correct answer, not a shortcut.**

The agent that fixed it proposed `insertion-payload-is-markup`, a guard requiring a new trait
`delivers-to-a-cms`. Measured:

    PRODUCING_SKILLS: chart-beat, chart-web, chart-video, dw-beat, map-beat, map-web, image-beat, scrolly
    deliver among them? false

The traits derivation exists to spread a decision across the skills that DRAW, and `deliver` is not
one of them — it is the single phase every beat passes through afterwards. A rule declared against a
trait no producing skill can carry would derive an empty population, which is the "stray row" the
parity test refuses by design. Inventing a trait to make one rule fit would be typing the population
by hand in a costume.

So this is local to `deliver`, the way round three's Task A was local to `storyboard`, and it is
guarded where it lives: `skills/deliver/test/honest-forms.test.ts`, 14 new assertions.

Verified after the fix, and it discriminates rather than blanket-disabling:

    stress-y (delegated, PNG only)   owned-file offered · cms-insertion DISABLED · source-bundle DISABLED
    stress-w (image beat, SVG + tsx) all three offered

**The decision inside the fix was the right one too.** The brief allowed either "offer the form only
where markup exists" or "build a payload a CMS can accept". The agent chose the first and said why:
an `<img>` tag would point at an asset nothing in this toolchain uploads, and a base64 data URI
would be a claim about We.Publish and Livingdocs that this tree cannot back. `owned-file` already
delivers `stress-y` correctly, and the disabled row names it.

**And the mutation check earned its place.** Dropping `{fatal: true}` from the decoder left the test
GREEN — a real PNG is refused twice over, as invalid UTF-8 and as full of NUL bytes, so the case
proved nothing about the decode it was written to test. A Latin-1 SVG was added to isolate it.

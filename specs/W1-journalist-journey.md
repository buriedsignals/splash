# W1 — the journalist's journey

Closes Part A of `twin/FEEDBACK-2026-08-10.md`: A1–A15, collapsed by `twin/survey/journalist-journey.md`
into eight items (Ⓐ–Ⓗ). Written to be executed by an agent with no prior context.

**Read first**: `twin/PLAN-2026-08-10.md` (the method and the four invariants), then
`twin/survey/journalist-journey.md` (the measured evidence — do not re-measure it, it is accurate
except for the three corrections in §12).

**Two of these eight items are defects that made the tool say something false.** Ⓑ refused a true
takeaway; Ⓒ reported `production` on a storyboard the storyboard's own guard refused. They are T1
and T2 and they land first. Everything after them is a conversation defect.

**The method, restated because it constrains every answer below.** A skill directory stays
copy-pasteable on its own, so helpers are duplicated rather than imported
(`no-cross-skill-imports.test.ts`). A `test/` directory is the one place a cross-skill import is
allowed, and only to assert that two deliberate duplicates agree. Nothing in this spec may be
answered with a shared runtime module.

---

## 1. The phase order — the contract every task below serves

Current, as documented at `skills/splash/SKILL.md:196-211` and
`skills/storyboard/references/exchange.md:8-98`:

```
preflight → intake → ① restitution → ② takeaway (G1) → ③ hand (5 questions)
→ ④ reference loop → ⑤ slots + candidates (G2: medium + genre + vehicle + treatment, all at once)
→ ⑥ brief → production (G3 = "a file exists in renders/") → delivery
```

Settled order. **Bold = new or moved.**

| # | Phase | Gate | Closes into |
|---|---|---|---|
| 0 | **PREFLIGHT — capabilities AND identity, each STATED, each OFFERED once** | — | `.env` / `NEWSROOM.md` (only if the journalist filled something) |
| 1 | INTAKE — silent | — | `source/article.md`, `source/profile.json` |
| 2 | RESTITUTION — claims read back | — | — |
| 3 | TAKEAWAY — confirmed verbatim, **and grounded here** | **G1** | `takeaway:`, **`grounding:`** |
| 4 | HAND — **four questions**, destinations rewritten medium-neutral | — | the six hand fields |
| 5 | **SURVEY — every type the frozen profile could support, each marked reachable / not** | — | (prose; ground for G2a) |
| 6 | **MEDIUM — the journalist validates the KIND** | **G2a** | slot `medium:` |
| 7 | **GENRE — static / web / video / scrolly, offered only where reachable for that medium** | **G2b** | slot `genre:`, slot **`reachable:`** |
| 8 | **SIZE — portrait / square / landscape, or the fluid web form** | **G2c** | slot `size:` |
| 9 | REFERENCE — indexed by argument structure; **ends in a question** | — | **`reference:`** |
| 10 | PALETTE — **subject first, newsroom second, journalist third** | — | `PALETTE.md` |
| 11 | BRIEF | — | `BRIEF.md` |
| 12 | PRODUCTION — render | — | `beats/<n>-<slug>/renders/*` |
| 13 | **SHOW — the artifact in front of the journalist. Nothing about delivery is said here.** | **G3** | **`beats/<n>-<slug>/APPROVED.md`** |
| 14 | DELIVERY — forms per genre; named files, where they go, the advice | **G4** | `export/*`, **`export/HANDOVER.md`** |
| 15 | CLOSE — journalist-facing only | — | defects to `NOTES-FOR-MAINTAINER.md`, never to the journalist |

Two things about that order are load-bearing and not obvious:

- **Grounding moves from step 12-ish to step 3.** In the run it fired at transcript `[1620]`, after
  the slot was pinned at `[1553]`. That is A6's whole complaint.
- **The hand SPLITS rather than moves.** `subject` is what the survey at 5 and the palette at 10 are
  *of*, so it must stay early. Only the *destinations* presume a medium, and only *one* question
  (placement) actually decides anything downstream. Four questions stay; placement's
  "also feeds channel and size" half becomes phase 8.

## 2. The recorded-verdict contract

Ⓐ, Ⓑ and Ⓒ all land in one place: **`STORYBOARD.md`'s front matter grows four scalars, and each
expensive semantic check runs ONCE, in the skill that owns it, and records a resolved verdict.**
Both gates then read a recorded field instead of re-deriving it. That is what closes the divergence
class *by construction* — neither gate can run a check the other cannot.

Story-level scalars:

```yaml
takeaway:  "…"                       # unchanged
grounding: supported                 # | unverifiable | overridden — "<reason>"
reference: "The Pudding, redraft — mid-table deviation"   # or: none — both rejected
```

Slot-level scalars (`slots: [{...}]`):

```yaml
  - id: 1
    proves: "…"
    medium: chart          # G2a
    genre: static          # G2b
    size: landscape        # G2c
    reachable: yes         # recorded verdict of genreGap + capabilityGap, run once at G2b
    candidates: [...]
    chosen: "…"
```

Rules, identical in both gates:

- `grounding:` must be present and must be one of `supported`, `unverifiable`, or
  `overridden — "<non-empty reason>"`. **`contradicted` is never a closing value**: a contradicted
  takeaway is corrected, or the journalist records an override with a reason (exactly what the run
  improvised at `[1743]`).
- `reference:` must be present and non-empty. "The journalist rejected both" is a recorded fact
  (`none — both rejected`), not a lost one.
- Every slot must carry `medium`, `genre`, `size`, `reachable: yes`, and `chosen ∈ candidates`.

This is not a new kind of trust. `where.mjs:120-122` already closes Gate 2 on the presence of six
recorded scalars, and `storyboard.mjs:108` mirrors it. The four new scalars extend the mechanism
that exists; they do not invent one.

---

## 3. T1 (Ⓑ) — the grounding check stops calling "I could not place this" a contradiction

*Lands first. It is the defect that refused a true takeaway.*

### Measured state

`skills/storyboard/scripts/ground-claim.mjs:260-292`, `checkNumericRanges`:

```js
// :278 — membership in a single column's [min, max]
const inRange = numericColumns.filter((c) => value >= c.min && value <= c.max);
// :285-291 — and NOT-a-member is reported as CONTRADICTED
} else {
  claims.push({ claim: m[0], verdict: "contradicted",
    detail: `outside the range of every numeric column (…)` });
}
```

The membership test is not the defect. **The `else` is.** Everywhere else in this file a shape the
function cannot check returns `unverifiable` with a reason (`:180`, `:183`, `:199`, `:203`, `:208`),
and the file's own header states the rule at `:10-14`. Here the symmetric error is made in the other
direction. A total is by construction ≥ the max of the column it sums, so **every part-to-whole
takeaway lands in that `else`** — systematic, not an edge case. The run: `34` (= 14+11+9 of
`glace_fondue_mt`) reported `contradicted` at `[1652-1661]`.

Two aggravating facts. `NUMBER_RE` (`:34`) matches every bare integer, so years, counts and ordinals
are all range-tested. And `intake`'s `profileTable` (`skills/intake/scripts/profile.mjs:20-35`)
emits no `rows`, so on a real profile `checkNumericRanges` is the **only** check that ever fires —
and it was the broken one.

### The change, file by file

1. `skills/storyboard/scripts/ground-claim.mjs`
   - `:285-291` — `verdict: "contradicted"` → `verdict: "unverifiable"`, detail rewritten to say what
     it is: *"could not be placed in any numeric column's range (…) — this check has no way to
     confirm or refute it"*. **Only a value that contradicts a fact this function DID establish stays
     `contradicted`** (the year-comparison and superlative branches, untouched).
   - `checkNumericRanges` gains an aggregate arm, tested **before** the `else`: a value equal to a
     numeric column's `sum` within `AGGREGATE_TOLERANCE` returns `supported`, detail
     *"equals the sum of column \"X\" (34)"*.
   - New tuning knob, one number: `AGGREGATE_TOLERANCE = 0.01` — the relative slack a rounded total
     is allowed against the exact sum (`|value − sum| <= max(0.5, |sum| * 0.01)`), so a takeaway
     writing "34" against a sum of 33.8 still resolves. Add it to the skill's Tuning-knobs table.
   - Header comment: update the numbered claim-shape list (`:26-32`) with the aggregate shape, and
     state that an unplaceable number is now information, not a refusal.
2. `skills/intake/scripts/profile.mjs:20-35` — `profileTable` emits `sum` beside `min`/`max`
   for numeric columns (`sum: numbers.length ? numbers.reduce((a, b) => a + b, 0) : null`). One line.
   Nothing else in the tree reads a column object positionally; the added key is additive.
3. `skills/storyboard/SKILL.md` — the `groundTakeaway` paragraph in "How it works" (step 5) and
   the Architecture row for `ground-claim.mjs`: name the aggregate check and the `unverifiable`
   rule. `skill-md-matches-code.test.ts` reads the Architecture File column and the Tuning-knobs
   Where column, so both must name real files.
4. `skills/intake/SKILL.md` — the profile shape statement gains `sum`.

Duplication: none. `ground-claim.mjs` exists once; `profileTable` exists once.

### The guard, and the mutation that reddens it

`skills/storyboard/test/ground-claim.test.ts` gains three cases, driven by the **real** run
data rather than invented numbers (`emissions_tco2e` [600000, 930000], `glace_fondue_mt` [9, 14],
`manteau_neigeux_km2` [1.5, 2.3], rows 14 / 11 / 9):

| case | expected |
|---|---|
| takeaway citing `34` against a profile whose `glace_fondue_mt.sum === 34` | `supported`, detail names the column |
| takeaway citing `2026` (a year, in no column's range, matching no sum) | `unverifiable` — never `contradicted` |
| `groundTakeaway` over the whole verbatim run takeaway | zero `contradicted` verdicts |

**Mutations, each run in a copy of the tree outside it, each must turn the suite red:**

- restore `verdict: "contradicted"` in the `else` → cases 2 and 3 red.
- delete `sum` from `profileTable` → case 1 red (falls to `unverifiable`).
- widen `AGGREGATE_TOLERANCE` to `10` → add a fourth case asserting a value 30 % off the sum stays
  `unverifiable`; that case reddens.

### What T1 does not close

`profileTable` still emits no `rows`, so every comparison shape in `ground-claim.mjs` (`:199`,
`:203`) still returns `unverifiable` on a real intake profile. That is now honest rather than
harmful — an unplaceable claim is reported as unplaceable — so freezing row-level data is a separate
piece of work, named in §11.

---

## 4. T2 (Ⓒ) — the two gates converge, and the parity test stops lying

*Lands second. It is the defect that reported `production` on a refused storyboard.*

### Measured state

| Gate | File | Skill |
|---|---|---|
| `whereIs` / `missingForGate2` | `skills/splash/scripts/where.mjs:116-143, 154-178` | **`splash`** |
| `checkStoryboard` | `skills/storyboard/scripts/storyboard.mjs:105-161` | **`storyboard`** |

Different skills, so a shared module is not available; `where.mjs:41-48` documents that choice in its
own comment. `missingForGate2` has no `profile` and no `capabilities` argument, so it structurally
cannot run grounding (`storyboard.mjs:110-116`), `genreGap` (`:147-150`) or `capabilityGap`
(`:156-159`). `checkStoryboard` can therefore refuse for three reasons the other gate cannot see.
The run put both verdicts side by side: `whereIs` → `phase: "production", missing: []`
(`[1666-1670]`); `checkStoryboard` → Gate 2 not closed (`[1658-1661]`).

**The false green is one line.** `skills/splash/test/where.test.ts:325`:

```ts
const checkStoryboardClosed = checkStoryboard(meta).length === 0;
```

One argument. `profile` and `capabilities` are omitted, so grounding and the capability check are
switched off *inside the test that exists to prove the two gates agree*; the genre check is switched
off separately, because none of the nine hand-written fixtures (`:276-313`) carries a `genre` at all.
The test compares two gates it has made artificially identical. Its own comment (`:6-9`) claims the
opposite of what it does.

### The change, file by file

**Part 1 — take the three expensive checks out of the re-derivation business.**

1. `skills/storyboard/scripts/storyboard.mjs`
   - `checkStoryboard(meta)` returns to **one argument**. Delete the `profile` block (`:110-116`) and
     the `capabilities` block (`:156-159`); delete the `genreGap` call (`:147-150`).
   - It instead checks the recorded scalars of §2: `grounding` present and in vocabulary,
     `reference` present and non-empty, and per slot `medium`, `genre`, `size`, `reachable: yes`.
   - Export the required-field lists as constants so the parity test can drive off them:
     `export const REQUIRED_SCALARS = ["takeaway", ...HAND, "grounding", "reference"];`
     `export const REQUIRED_SLOT_FIELDS = ["medium", "genre", "size", "reachable", "chosen"];`
   - `groundTakeaway`, `genreGap` and `capabilityGap` stay exported from this skill and are now
     called by the **phases** (G1 and G2b) rather than by the gate. Say so in the header comment.
2. `skills/splash/scripts/where.mjs`
   - `missingForGate2` (`:116-143`) gains the same four scalars and the same slot fields, using the
     existing `hasScalarField` / `parseSlotsForGate` machinery — no new parsing.
   - Export the same two constants, spelled independently (this is the deliberate duplicate).
   - Update the mirror comment at `:41-48` to name the four new scalars.
3. `skills/storyboard/SKILL.md` and `skills/splash/SKILL.md` — the Gate-2 rows and the
   `checkStoryboard` signature descriptions. `skills/splash/SKILL.md:205`'s phase table gains
   the three sub-gates and the G3 row from T8.

**Part 2 — make the guard walk.**

4. `skills/splash/test/where.test.ts` — delete the nine hand-written fixtures (`:276-313`) and
   generate them: **one complete Gate-2 template, mutated field by field, with the field list read
   from both sides' exported constants** (union of `REQUIRED_SCALARS` and `REQUIRED_SLOT_FIELDS` from
   each gate). For each field, three fixtures: absent, bare-`null`, and (for slot fields) a value
   outside its vocabulary. Keep the two shape regressions the old list carried that no constant
   implies — quoted `"null"` as a literal, and a quoted comma inside an inline array — as explicit
   extra fixtures with a comment saying why they cannot be generated.
   `checkStoryboard(meta)` is now honestly one-argument; the line at `:325` becomes correct rather
   than a false green.

This is the property `render-still-parity.test.ts` has and `helper-parity.test.ts` lacks: a rule
added to either gate produces its own fixture the moment it lands.

### The guard, and the mutation that reddens it

The regenerated `where.test.ts` is the guard. **Mutations, each must turn it red:**

- remove `"grounding"` from `where.mjs`'s `REQUIRED_SCALARS` only → the generated
  "grounding absent" fixture makes the two gates disagree.
- remove `"reachable"` from `storyboard.mjs`'s `REQUIRED_SLOT_FIELDS` only → same, on the slot axis.
- re-hard-code the fixture list instead of generating it, then add a fifth scalar to both gates →
  the suite stays green with an unguarded rule, which is the failure this task exists to end.

### What T2 does not close

A recorded verdict can be written by a conversation that never ran the check. The closed vocabulary
and the mandatory non-empty override reason are what is mechanically checkable; the honesty of the
model writing the scalar is not. That is the same trust `takeaway:` has carried since G1 existed,
and this task does not widen it. Named, not solved.

---

## 5. T3 — reachability becomes medium × genre, and `scrolly` becomes reachable

### Measured state

`skills/storyboard/scripts/genre-catalog.mjs:21-25`:

```js
static: { producerSkill: "chart-beat", delivered: true },
web:    { producerSkill: "chart-web",  delivered: true },
video:  { producerSkill: "chart-video", delivered: true },
```

Three genres, three **chart** producers. A `medium: map` + `genre: web` slot passes `genreGap` by
naming `chart-web` — the wrong producer. `map-beat`, `map-web`, `image-beat` and
`scrolly` are unreachable through this table. `genreGap("scrolly")` refuses outright (`:34-37`)
and `offerForms({genre:"scrolly"})` throws (`skills/deliver/scripts/deliver.mjs:88-93`) — yet
`MATRIX.md:46` records a real scrolly beat (`mapmore-scrolly-danube`) and `scrolly` ships as a
complete skill whose seed carries four tracks including a chart and a map.

`skills/splash/test/genre-shippability.test.ts:24-44` already asserts, in both directions, that
each `producerSkill` exists on disk and that `delivered: true` matches a real `FORMS_BY_GENRE` key.
It is the right guard; it cannot see a wrong producer because **medium is not in the table**.

### The change, file by file

1. `skills/storyboard/scripts/genre-catalog.mjs` — `GENRE_CATALOG` keyed on the pair:

   ```js
   export const GENRE_CATALOG = {
     "chart/static":  { producerSkill: "chart-beat",  delivered: true },
     "chart/web":     { producerSkill: "chart-web",   delivered: true },
     "chart/video":   { producerSkill: "chart-video", delivered: true },
     "chart/scrolly": { producerSkill: "scrolly",     delivered: true },
     "map/static":    { producerSkill: "map-beat",    delivered: true },
     "map/web":       { producerSkill: "map-web",     delivered: true },
     "map/video":     { producerSkill: "map-beat",    delivered: true },
     "map/scrolly":   { producerSkill: "scrolly",     delivered: true },
     "image/static":  { producerSkill: "image-beat",  delivered: true },
     "image/scrolly": { producerSkill: "scrolly",     delivered: true },
   };
   ```

   `image/web` and `image/video` are **absent, deliberately** — no producer exists, and an absent row
   is what the journalist is told at the genre gate instead of at the last phase. Say so in the
   header. `genreGap(medium, genre)` takes the pair, and its refusal names both: *"map beats in the
   web genre are not one this toolchain can produce or deliver yet"*.
2. `skills/deliver/scripts/deliver.mjs:26-76` — `FORMS_BY_GENRE` gains a `scrolly` entry. A
   scrolly delivers one self-contained HTML page, exactly as `web` does, so its forms are `web`'s
   four (`owned-file`, `source-bundle`, `embed`, `cms-insertion`) with the `gives` strings rewritten
   to say "scroll-driven page". `offerForms` (`:88-98`) then stops throwing on `scrolly` with no
   other change.
3. `skills/splash/test/genre-shippability.test.ts` — walks **pairs**: for every
   `"<medium>/<genre>"` key, the producer directory exists on disk; `delivered: true` matches a real
   `FORMS_BY_GENRE[genre]` key; and, the reverse direction, every `FORMS_BY_GENRE` genre appears in
   at least one catalog pair marked delivered.
4. `skills/storyboard/scripts/storyboard.mjs` — the G2b phase (not the gate) calls
   `genreGap(slot.medium, slot.genre)` and `capabilityGap(capabilities, slot.medium)`, and records
   `reachable: yes` or refuses the pair before it is ever offered.
5. `skills/splash/SKILL.md:222` — the production dispatch table gains `map-web`,
   `image-beat` and `scrolly`, which it does not name today.
6. `skills/storyboard/SKILL.md` — the Architecture row for `genre-catalog.mjs`.

Duplication: `GENRE_CATALOG` is, and stays, a reimplementation of `deliver`'s knowledge —
two copies, cross-checked by `genre-shippability.test.ts`, never imported. `capabilityGap` stays two
copies (`preflight.mjs:213-217` and `capability-gap.mjs:20-24`), guarded by the existing
`capability-gap-parity.test.ts`.

### The guard, and the mutation that reddens it

`genre-shippability.test.ts` walking the pairs. **Mutations:**

- point `"map/web"` at `chart-web` → still green today (both directories exist); so add the
  third assertion the pair form makes possible: **the producer skill's own `SKILL.md` front-matter
  `name` must equal `producerSkill`, and its description must name the medium** — then the mutation
  reddens. Without that assertion this task's central claim is unguarded.
- drop the `scrolly` entry from `FORMS_BY_GENRE` while leaving the two scrolly catalog rows → red on
  the `delivered` direction.

### What T3 does not close

`image/web` and `image/video` genuinely have no producer, and this task does not build one. A
journalist choosing medium `image` is told at G2b that only `static` and `scrolly` exist for it.
Whether a scrolly pair is *proven on disk* is a different question from whether it is *deliverable*
— that is T4's job, and the two must not be conflated.

---

## 6. T4 (finding #1) — the survey step, built from material that already exists and is invisible

### Measured state

Both of these return **nothing**:

```
grep -rn "MATRIX" skills/
grep -rn "references/types" skills/storyboard/
```

`skills/chart-beat/references/types/` holds 33 files (32 type sheets + README);
`skills/map-beat/references/types/` holds 9 (8 + README). Each sheet answers what the type is
for and when not to reach for it (`types/README.md:1-7`). `twin/MATRIX.md` is generated from the
tree by `twin/scripts/matrix.mjs`, counts an artifact only when it exists on disk (`matrix.mjs:13-17`),
and records 17 chart types × 3 genres plus 6 map types. **The exchange has never heard of any of it.**
In the run, three candidates were offered at `[1533-1545]` and all three were stacked-or-grouped bars
of the same three numbers.

### The change, file by file

A `storyboard` script may not read `chart-beat/references/types/` — that literal resolves
inside another skill and `no-cross-skill-imports.test.ts` flags it whatever it points at. The twin's
own answer to that is already on the shelf: **generate the material into the skill, and drift-check
the copy.**

1. `twin/scripts/type-survey.mjs` — new, modelled on `twin/scripts/matrix.mjs` (same CLI:
   bare = write, `--check` = fail on drift; scripts under `twin/scripts/` are outside `skills/` and
   may read the whole tree). It walks the 40 type sheets and, for each, emits one row:
   **medium · type · the sheet's own "What it is for" first sentence, verbatim · the genres proven on
   disk**, the last read exactly the way `matrix.mjs` reads them (an artifact exists, or the cell is
   empty). It writes `skills/storyboard/references/type-survey.md`.
2. `skills/storyboard/references/type-survey.md` — generated, header marked
   **"Generated — do not edit by hand"**, same wording as `MATRIX.md`.
3. `skills/storyboard/references/exchange.md` — new movement between ③ and the proposal:
   **⑤ The survey.** Not a question: the ground the medium question stands on. It lists the types the
   frozen profile could support (a type whose required shape the profile cannot supply is listed as
   *not applicable, and why*), each annotated *reachable* / *not reachable, and why* from
   `type-survey.md` and `genre-catalog.mjs`. The discipline line at `:103-107` ("always carry a
   recommendation") stands; what changes is that **a recommendation may not be drawn as a chart
   before a chart has been chosen** — add that as a discipline bullet, because the run drew bars five
   times before any medium existed (`[1182]`, `[1223]`, `[1318]`).
4. `skills/storyboard/SKILL.md` — Files section gains `references/type-survey.md` and names the
   generator.

### The guard, and the mutation that reddens it

`skills/storyboard/test/type-survey.test.ts` runs `bun twin/scripts/type-survey.mjs --check` and
asserts a clean exit, plus asserts every type sheet on disk has a row. **Mutations:** add a type sheet
without regenerating → red. Hand-edit a "for" sentence in the generated file → red.

### What T4 does not close

The survey is prose read by a conversation; nothing mechanically forces the exchange to *use* it.
The lever that exists is the medium gate (T2/T3): a slot cannot close without `medium` and
`reachable: yes`, and reachability is computed from the same tables the survey prints. A guard that
the survey was *shown* would need a transcript check, which this branch has no machinery for.

---

## 7. T5 (Ⓐ) — the order, in doctrine, plus the palette inversion

### Measured state

`skills/storyboard/references/exchange.md:21-36`, five questions and their destinations:

| # | line | destination | presumes? |
|---|---|---|---|
| 1 | `:30` subject | "the single semantic accent… a scatter labelled its max-y" | **yes** — presumes a mark, cites a chart |
| 2 | `:31` comparison | "baseline, second series, annotation" | **yes** — a map, an image scrolly and a video reveal have no "second series" |
| 3 | `:32` limits | the anti-overclaim check | no |
| 4 | `:33` placement | "…**Also feeds channel and size**" | **yes, and worse** — it *decides* genre and size at movement ③ |
| 5 | `:34` credit | the source line | no |

Palette: `skills/palette/scripts/palette.mjs:167-225`. House pushed first (`:176`), subject
second and only on a match (`:190-206`), and `recommended` prefers house explicitly (`:219-222`).
The comment at `:211-212` states the inverse of what the owner now asks for.
`SUBJECT_CONVENTIONS` (`:98-131`) holds four entries; `matchConvention` (`:140-145`) returns nothing
when several match.

### The change, file by file

1. `skills/storyboard/references/exchange.md`
   - Q1 destination → *"the one element the visual emphasises, whatever its medium."*
   - Q2 destination → *"the reference the reader measures against — the mechanism that carries it is
     chosen with the medium, not here."*
   - **Q4 splits.** The editorial half ("what does the text already say next to it" → do not
     duplicate) stays in the hand and keeps landing in `placement`. The "also feeds channel and size"
     clause is **deleted from `:33`** and becomes movement ⑧, the size gate.
   - Movements renumbered: ① restitution · ② takeaway **+ grounding (G1)** · ③ hand (four questions)
     · ④ survey · ⑤ medium (G2a) · ⑥ genre (G2b) · ⑦ size (G2c) · ⑧ reference · ⑨ palette · ⑩ brief.
     Renumber every cross-reference to a movement in `storyboard/SKILL.md`,
     `doctrine/references/reference-set.md:1-8` and `storyboard.mjs`'s comments — grep for
     `movement ` and for the circled digits.
2. **The size gate, specified so it cannot offer what nothing renders.** The vocabulary is
   `portrait` / `square` / `landscape` for static and video, `fluid` for web and scrolly. Today only
   one value per genre is reachable (`landscape`, `fluid`) — W4 is what widens it. So movement ⑦
   **states** the size and names that one value is reachable, rather than asking, whenever the
   reachable set has one member; it asks when it has more. Either way it records `size:` on the slot,
   so W4 widens a set and re-plumbs nothing.
3. `skills/palette/scripts/palette.mjs` — move the subject push (`:190-206`) above the house
   push (`:176`); invert `recommended` (`:219-222`) to prefer `subject` then `house` then any passing
   option; the escape branch stays third (`:223`). Rewrite the comment at `:211-212`, which states
   the old intent. When no convention matches, `proposePalette` returns a new field
   `noConventionReason` and `format-proposal.mjs` prints it as a sentence — *"no convention applies
   to this subject, so the newsroom's colours lead"* — rather than silently showing one option, which
   is what the run did at `[1976-1994]`.
4. `skills/splash/SKILL.md:196-211` — the phase table becomes §1's table.
5. `skills/palette/SKILL.md` — the proposal-order paragraph.

### The guard, and the mutation that reddens it

- `skills/palette/test/palette.test.ts`: with a matching subject **and** a valid house profile,
  `options[0].id === "subject"` and `recommended === "subject"`; with no match,
  `noConventionReason` is non-empty and `recommended === "house"`. **Mutation:** restore the original
  push order → red.
- `skills/storyboard/test/exchange-shape.test.ts` (new, cheap, text-level): `exchange.md` names
  each of the ten movements exactly once as a heading, the hand table has **four** rows, and the
  string "channel and size" does not appear in the hand table. **Mutation:** re-add the clause to Q4
  → red. This is a prose guard and it is worth the twenty lines: A3 is a documentation defect and the
  documentation is the only artifact it lives in.

### What T5 does not close

Nothing forces the conversation to ask the four questions in the order documented, and nothing
detects a chart drawn in an ASCII preview before a medium is chosen. The mechanical lever is the
slot's `medium` scalar, which cannot be back-filled after the fact without leaving the gate open.

---

## 8. T6 (Ⓓ) — preflight states, and offers once

### Measured state

`skills/splash/scripts/preflight.mjs:142-192`. `capabilities` rows are built by `checkCapability`
(`:136-140`) out of `keys.mjs` probe results (`:45-60`), whose refusal strings already name the exact
variable (`"MAPTILER_KEY is not set"`). `assertPreflightReady` (`:199-203`) never inspects
`capabilities`; `capabilityGap` (`:213-217`) only formats a closed row. **There is no code path
anywhere in the twin that accepts a key from a journalist.** In the run, `DATAWRAPPER_TOKEN` closed
`dw-beat` silently for the whole story (`[1520]`) with no moment at which it could have been
opened.

`checkNewsroom` (`:94-128`) **discards the parsed profile** — `runPreflight` puts only the status into
`checks` (`:145`) — and `SKILL.md:182` says preflight runs "silently when `ready`". In the run the
profile passed at `[31]` and the journalist heard about it nine phases later, from `palette` at
`[1994]`. `newsroom.mjs:3` — `FIELDS = ["name","url","language","brandColor","ground","typefaces"]` —
**has no credit field**, which the run hit exactly at `[1341]`.

### The change, file by file

1. `skills/splash/scripts/preflight.mjs`
   - each capability definition in `runPreflight` (`:147-178`) gains a `fill` string: the env var
     name, where the key is obtained, and the file it goes in. `checkCapability` (`:136-140`) carries
     it onto the row.
   - `checkNewsroom` (`:94-128`) returns `profile` beside `status`/`detail` on the `pass` and `fail`
     branches, and `runPreflight` puts it into the `newsroom-profile` check. Nothing about `ready`
     changes: `blockers` (`:189`) is untouched.
2. `skills/splash/scripts/keys.mjs` — new `recordKey({ root, name, value })`: writes or replaces
   one `NAME=value` line in the root `.env`, creating it if absent, returning nothing. **It never
   returns, logs or echoes the value.** Validate `name` against the `KEY_ALIASES` key set
   (`:12-17`) — an unknown name throws — so nothing a journalist pastes can name an arbitrary
   variable.
3. `skills/splash/scripts/newsroom.mjs:3` — a **seventh, optional** field `credit`: the
   newsroom's standing credit convention. Optional, not required: `validateNewsroom` (`:27-36`) is
   unchanged, so every existing `NEWSROOM.md` and every `declined` stub stays valid.
   `parseNewsroom` already reads any front-matter key, so it needs no change.
4. `skills/splash/assets/root-template/NEWSROOM.example.md` — the `credit` line and its
   one-line explanation, in the same shape as the six existing ones.
5. `skills/splash/SKILL.md:182` — preflight is **never silent**. Its step becomes:
   - **state** the six (or seven) profile values and which are present; on `missing`, offer the three
     branches by name — derive it with `newsroom-charter` · supply your own (hand over
     `NEWSROOM.example.md`) · decline, recorded;
   - **state** credits: the profile's `credit` if present, or plainly *"no house credit convention is
     recorded, so credit is asked per story"* (it is already hand field 5);
   - when **any** capability row is closed, ask **once**: *"these are closed — paste a key now, or
     continue without them"*, `recordKey` what is given, re-probe **that one capability**, and move
     on either way. One question, one re-probe, "continue" always available. It never branches, never
     installs, never blocks — `ready` still depends only on `dependencies` and `newsroom-profile`.

### The guard, and the mutation that reddens it

`skills/splash/test/preflight.test.ts`: every capability row carries a non-empty `fill` naming
its own env var; a passing `newsroom-profile` check carries the parsed `profile`.
`skills/splash/test/keys.test.ts`: `recordKey` creates a `.env`, replaces an existing line
rather than appending a duplicate, throws on an unknown name, and — the case that matters — a probe
run after `recordKey` reads the new value. **Mutations:** drop `fill` from one capability row → red;
make `recordKey` append instead of replace → the duplicate-line case reddens.

### What T6 does not close

A key pasted into a chat is a secret in a transcript. `recordKey` writes it to the root `.env` and
never echoes it, which is the most this seam can do; the transcript is outside the twin's reach.
Named, and it should be said to the journalist in the same turn that asks.

---

## 9. T7 (Ⓔ) — the reference loop gets a key and a question

### Measured state

`skills/doctrine/references/reference-set.md:1-8` opens by promising *"a named argument
structure"* — and the table at `:84-92` has columns `Reference | Moment | Transferable lesson`.
**There is no argument-structure column**, so the loop cannot look one up; it can only read seven long
prose cells. `check-reference-set.mjs:63-74` validates link, locator and lesson, and has no concept of
structure either. `exchange.md:72-84` says "the journalist picks or rejects", but there is no gate and
`STORYBOARD.md` has no field for it. In the run, block `[1505]` carried the references and the
storyboard proposal in one message and the next question (`[1524]`) was about the slot. **④ is the one
movement in the journey with no question behind it** — every other one has one (`[1120]`, `[1171]`,
`[1524]`, `[2013]`, `[2960]`, `[3232]`).

### The change, file by file

1. `skills/doctrine/references/reference-set.md` — a fourth column, **Argument structure**,
   first: a short lookup key per row (*"a profile whose two dimensions disagree"*, *"deviation from a
   local expected rank"*). Written from each row's existing lesson, not invented — the lessons already
   state the structure in prose. Update the file's own header paragraph, which claims the index that
   is about to exist.
2. `skills/doctrine/scripts/check-reference-set.mjs:63-74` — the row split now yields four cells;
   a row is invalid when the structure cell is shorter than `MIN_STRUCTURE_CHARS = 12` (a new tuning
   knob, one number). `splitRow`/`tableRows`/`countReferenceRows` are unchanged.
3. `skills/storyboard/references/exchange.md` movement ⑧ (was ④) — **ends in a real question**,
   and the answer lands in the `reference:` scalar of §2. "Both rejected" is recorded as
   `none — both rejected`, which gives `BRIEF.md` something to derive from and makes the rejection a
   fact rather than a loss.
4. `skills/doctrine/SKILL.md` — the reference-set description gains the column.

**A15, scoped separately because it is research, not code.** One verified row for *"a total whose
majority escapes the subject named in the title"*, found and checked to the file's own round-4 bar
(`reference-set.md:33-44`: look at the real pixels **and** read the text beside them). The floor in
`skills/doctrine/test/reference-set.test.ts:94-110` moves from 7 to 8 **in the same commit as the
row**. If the bar cannot be met, the task ships nothing and the floor stays 7 — an unverified row is
the exact failure that cut this file back twice, and shipping one to satisfy a number would repeat it.

### The guard, and the mutation that reddens it

`skills/doctrine/test/reference-set.test.ts`: `checkReferenceSet` rejects a fixture row with an
empty structure cell, and the shipped file passes. Plus, from T2, `reference:` is now a required
scalar in both gates, so its generated fixture already exists. **Mutation:** blank the structure cell
of one shipped row → red.

---

## 10. T8, T9, T10 — show, deliver, and who the message is for

### T8 (Ⓖ) — G3 becomes a real gate, and delivery cannot be discussed before it closes

**Measured.** `skills/splash/SKILL.md:205` — G3 closes into `beats/<n>-<slug>/renders/*`, the
existence of a file. `where.mjs:145-152`: `hasAnyRender` returns true when any `renders/` directory is
non-empty, and `whereIs` then returns `delivery` (`:175`). **Approval is not a condition of leaving
production.** In the run the renders were read into the model's context (`[2774]`, `[2891]`) and the
journalist received prose; the Gate-3 question at `[2964]` — *"the beat, as you see it. Do you
validate?"* — presupposed sight in a turn where nothing was put in front of anyone to open.

And delivery was discussed first, twice, **wrongly**: at `[1772]`, before production began, and inside
the Gate-3 approval option itself at `[2971]` ("hosted embed = closed"), then retracted at `[3228]`
once `offerForms` was actually called. This ordering defect produced a false statement, not just an
untidy one.

**The change.**

1. `skills/splash/scripts/where.mjs` — a beat leaves `production` only when every beat directory
   holding renders also holds `APPROVED.md`. `hasAnyRender` (`:145-152`) becomes
   `beatsAwaitingApproval(storyDir)` returning the list; `whereIs` reports
   `{phase: "production", missing: ["beat 1-…: rendered but not approved"]}`. A directory read —
   exactly what this file already does — and it needs no slot↔beat mapping.
2. `skills/splash/SKILL.md:205` — the `production` row's gate closes into
   `beats/<n>-<slug>/APPROVED.md`, and the phase description says: **surface the artifact** (the file
   path to open for a static, the opened HTML for a web or scrolly beat, the mp4 for a video), ask
   approve-or-correct, and **say nothing about delivery**, because delivery's forms are `offerForms`'
   output and cannot be known before it runs.
3. `skills/splash/SKILL.md:239` never-list — one absolute: *"never state a delivery constraint
   that did not come from `offerForms`."*
4. `skills/deliver/scripts/deliver.mjs` — `offerForms` gains a required `beatDir` and **throws**
   when `beatDir/APPROVED.md` is absent: *"this beat has not been approved yet — show it first"*.
   That is the mechanical backstop: the wrong warning at `[2971]` was possible only because delivery
   was talked about without calling `offerForms`, and now calling it early fails loudly.

**Guard + mutation.** `skills/splash/test/where.test.ts` gains a phase case: renders present,
`APPROVED.md` absent → `production`; both present → `delivery`.
`skills/deliver/test/deliver.test.ts`: `offerForms` throws without `APPROVED.md`.
**Mutations:** restore `hasAnyRender` → the phase case reddens; delete the `APPROVED.md` check in
`offerForms` → the deliver case reddens.

### T9 (Ⓕ) — the forms, and the hand-over document

**Measured.** `deliver.mjs:26-76`. `static` and `video` offer `owned-file` + `source-bundle` only;
`cms-insertion` is web-only, and the file **already says why** (`:49-53`: *"'static'/'video' could
plausibly host or insert their single owned file too; that is left to a follow-up"*). A9 is that
follow-up. `singleOwnedFile` (`:142-152`) refuses when `renders/` holds anything but one file — and a
static beat legitimately holds two (`still.png` + `still.svg`, seen at `[3269-3271]`).
`materialise` returns every path it wrote, and in the run that array was printed as raw absolute-path
JSON (`[3268-3271]`); the final message (`[3299]`) gave two filenames and two sizes, no statement of
which file goes where, no alt text, no credit line, no caveat. `placement` is already recorded
(hand field 4; in the run *"after the 34 Mt paragraph, article-web, full width"*, `[1339]`) and
nothing reads it back.

**The change.**

1. `deliver.mjs:26-76` — `cms-insertion` added to `static` and `video`, its `gives` reusing the
   existing UNPROVEN wording at `:59-62` **verbatim** (it is still not wired to a live CMS).
2. `deliver.mjs:142-152` — `singleOwnedFile` is joined by `ownedFileForInsertion(beatDir, genre)`
   driven by a per-genre preference table, so "two files" stops being ambiguity:
   `{static: [".svg", ".png"], web: [".html"], scrolly: [".html"], video: [".mp4"]}` — the first
   extension with exactly one match wins; zero matches, or two files at the winning extension, throws
   naming what was found. `embed` keeps `singleOwnedFile`'s strictness (a hosted page is one file).
3. **`source-bundle` — a decision, taken here for the owner to overrule in one line.** The owner names
   it in none of the three per-genre lists; it is a developer artifact. It is **kept** (it works, and
   a newsroom with a developer wants it) but **demoted**: `offerForms` tags it
   `audience: "developer"`, and the delivery question offers the journalist-facing forms as the real
   choice with source-bundle mentioned in one line below them.
4. **`export/HANDOVER.md`**, new — the delivery phase closes into a file like every other phase. A new
   `skills/deliver/scripts/format-handover.mjs` exports `formatHandover({files, placement, alt,
   credit, caveat, genre})` → markdown: each delivered file **named, with its role** ("the SVG is the
   one to give the CMS"), the placement read back from `STORYBOARD.md:placement`, the alt text read
   from the component, the credit line, and the one caveat the `limits` field carries. Every input is
   already recorded somewhere; nothing new is derived. `materialise` writes it beside the chosen
   form's own output.
5. `skills/deliver/SKILL.md` — Files, Tuning knobs (the preference table), and the forms table.

**Guard + mutation.** `skills/deliver/test/deliver.test.ts`: `ownedFileForInsertion` picks
`still.svg` from a two-file static `renders/`, throws on an empty one, and throws on two `.html` files
for `web`; `cms-insertion` materialises for `static` and `video`; `HANDOVER.md` exists after every
form and names every path in `written`. **Mutations:** remove `.svg` from the static preference row →
the two-file case reddens; stop writing `HANDOVER.md` → the naming case reddens.

### T10 (Ⓗ) — the journalist never reads about us

**Measured.** Nothing in the twin says who a message is for. The closing message (`[3298-3311]`) is
four fifths internals — the three paragraphs that became A13, A14 and A15, valuable and **for the
maintainer**. Earlier turns leak the same way (`[1620]` narrates reading `ground-claim.mjs`;
`[1673-1695]` presents a table of gate verdicts; `[2908]` explains `#shared/*` resolution), and at
`[1699]` the journalist is asked to arbitrate an internal defect, with options naming
`ground-claim.mjs` and `where.mjs` by filename.

**The change.** A prose rule is the softest surface in this project by its own account, and the twin
already has the right pattern twice over (`palette/scripts/format-proposal.mjs`,
`newsroom-charter/scripts/format-proposal.mjs`): render the journalist-facing text from
structured input, so nothing the function was not given can appear in it.

1. `formatHandover` (T9) takes a **closed** parameter set. There is no free-text `notes` field, and
   adding one is the change this task exists to prevent.
2. `formatHandover` **throws** when any string it was given matches `/\bskills\//` or
   `/\.(mjs|mts|cjs|ts|tsx|js|jsx)\b/` — a maintainer-facing sentence physically cannot pass through
   it. The refusal message says where it belongs instead. Accepted cost, stated in the header: a
   legitimate caveat that names a filename is refused; no real caveat does.
3. Defects found mid-run are appended to `stories/<slug>/NOTES-FOR-MAINTAINER.md` — the story root,
   **never** `export/`, never the conversation. This is what the run already did correctly twice
   (`groundingOverride` at `[1743]`, the latent-defect note in `BRIEF.md` at `[2931]`); what was wrong
   was repeating them to the journalist.
4. `skills/splash/SKILL.md:239` never-list — *"a defect in this toolchain is written to
   `NOTES-FOR-MAINTAINER.md` and never spoken to the journalist; a question to the journalist is never
   about our code."*

**Guard + mutation.** `skills/deliver/test/format-handover.test.ts`: a payload whose caveat
contains "ground-claim.mjs" throws; a clean payload renders and its output contains no `skills/` and
no module extension. **Mutation:** delete the throw → the first case reddens.

---

## 11. What W1 does not close

- **Row-level data in the frozen profile.** `profileTable` still emits no `rows`, so every comparison
  shape in `ground-claim.mjs` returns `unverifiable` on a real profile. Honest after T1, still a gap.
- **A recorded verdict is trusted.** §2's scalars are checked for vocabulary, not for having been
  computed. Same trust `takeaway:` has always carried.
- **`image/web` and `image/video` have no producer.** T3 makes the absence honest at the genre gate;
  it does not build them.
- **The size gate offers one value per genre** until W4 lands. T5 records `size:` from day one so W4
  widens a set and re-plumbs nothing.
- **The A15 reference row** may not be found to the file's own bar. Then the floor stays 7.
- **Nothing checks that the survey was shown**, or that a chart was not drawn before a medium was
  chosen. The `medium` scalar is the only mechanical lever.
- **Scrolly is now reachable and deliverable, not yet proven per pair.** `MATRIX.md:46` records one
  scrolly beat. Proving `chart/scrolly` and `image/scrolly` on disk is W3/W8 territory.
- **`map-web-discipline.md`'s reversal (ruling R1)** is W6, not here.

## 12. Three places I disagree with the survey after reading the code

1. **The false green is not "all three checks switched off by the one argument".** Grounding and
   `capabilityGap` are switched off by the two omitted arguments; **`genreGap` is not gated by any
   argument** — `storyboard.mjs:147-150` runs it whenever `slot.genre` exists. It is off because none
   of the nine hand-written fixtures carries a `genre` at all. Same conclusion, and it strengthens the
   survey's own point: the *fixtures* are the second hole, independently of the call.
2. **`genre-shippability.test.ts` widened to pairs still would not catch the wrong producer.** Both
   `chart-web` and `map-web` exist on disk, so `"map/web" → chart-web` passes the
   existence assertion the survey proposes to keep. The pair form only becomes a real guard with the
   third assertion added in T3: the producer skill's own `SKILL.md` `name` must equal `producerSkill`
   and its description must name the medium. Without it, T3's central claim ships unguarded.
3. **The survey leaves the size gate's vocabulary open** ("or the gate will offer sizes nothing can
   render"). T5 closes it without waiting for W4: the gate offers the *reachable* set, states rather
   than asks when that set has one member, and records `size:` regardless. A gate that states one
   honest option is not a defect; a gate that offers three unrenderable ones is.

## 13. The proof — opened artifacts, not "tests pass"

The whole chantier is a conversation, so the proof is a run, and every claim below is something
somebody opens.

1. **Re-run the Heidi.news case end to end** — the article and the three-row CSV are recoverable from
   the run transcript. It is the case that produced eight of these fifteen items.
   - `STORYBOARD.md` opened and read: `grounding: supported` with the aggregate detail naming
     `glace_fondue_mt`, `reference:` filled, and slot 1 carrying `medium` / `genre` / `size` /
     `reachable` / `chosen`. **The takeaway that was refused at `[1660]` now passes.**
   - `whereIs(storyDir)` and `checkStoryboard(meta)` printed side by side at the same moment — the
     two-row table the run showed at `[1666-1670]`, now agreeing.
   - The static beat's `still.png` **opened and looked at**, at its rendered size, before any delivery
     sentence exists in the transcript.
   - `export/HANDOVER.md` opened and read **as a journalist would**: does it say which file goes where
     in the article, what the alt text is, what the credit line is, and what the caveat is — and does
     it contain no filename of ours?
2. **A second run choosing `scrolly`** — the pair that throws today. The proof is the delivered HTML
   **opened in a browser and scrolled**, and `export/HANDOVER.md` naming it.
3. **A third, deliberately closed run**: unset `MAPTILER_KEY`, ask for a map. The proof is the
   preflight turn stating the closed capability *and offering to fill it*, and the genre gate naming
   the map pair as unreachable **at the gate**, not at delivery.
4. `bun test` green across the tree, and each mutation in §3–§10 run in a copy outside the tree,
   each producing the named red. A guard that cannot go red is worse than no guard.

## 14. Execution order

```
T1 (Ⓑ grounding)          ─┐ the two false-statement defects, first
T2 (Ⓒ gates + parity)     ─┘   T2 depends on T1's verdict vocabulary
T3 (medium × genre, scrolly)   depends on T2's recorded `reachable`
T4 (type survey)               independent of T3, both feed T5
T5 (Ⓐ order + palette)         depends on T3 and T4
T6 (Ⓓ preflight)               independent — may run in parallel from the start
T7 (Ⓔ reference loop)          depends on T2 (the `reference:` scalar)
T8 (Ⓖ show before delivery)    independent of T3–T7
T9 (Ⓕ delivery)                depends on T3 (scrolly forms) and T8 (APPROVED.md)
T10 (Ⓗ audience)               depends on T9 (formatHandover)
```

T6 and T8 have no dependency on the chain and are the two that can run alongside it.

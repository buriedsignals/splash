# Audit — W4, three export sizes and web as a range

Read-only audit of `twin/specs/W4-export-sizes.md` and everything it governs, against the tree at
`dd01abf0` on `experiment/doctrine-twin`, 2026-08-10. Method and invariants:
`twin/PLAN-2026-08-10.md`. Ruling R2: `twin/SESSION-2026-08-09-10.md` §2. Owner items B2.1 and B3.2:
`twin/FEEDBACK-2026-08-10.md:59, :66`.

Nothing in this audit is taken from another agent's summary. Every count was re-measured, every
guard was mutated in a copy under `/tmp/w4mut/`, and the two claims that turned out to be wrong were
both claims a guard made about itself.

**The headline.** The table is real and its walker is real — ten recorded mutations, ten reproduced,
including the two deliberate greens. Tasks 1, 4, 5, 9 and the seed half of 3 landed and hold. What
did not land is the whole of the delivery: **0 of 17 chart statics, 0 of 19 chart videos and 0 of 18
chart webs draw at a size from the table.** The gate now refuses a storyboard that does not name a
size, and nothing downstream of the gate reads the name it took. And one guard's own mutation table
records a RED that cannot happen — `three-sizes-no-collision.test.ts:44`.

---

## 1. Was the spec followed?

Five of the ten tasks landed, each in its own commit, and each does what §4 describes. The
divergences are below; none is a regression except the last two.

### Followed, verified by mutation

| Task | Commit | Evidence |
|---|---|---|
| 1 — `SIZES` + `sizeFor` + the walking guard | `a42717c4` | `skills/twin-chart-beat/scripts/sizes.mjs:58-80`; `skills/splash-twin/test/size-table-parity.test.ts` — §5 below |
| 4 — `twin-dw-beat` | `ceaa25e0` | `skills/twin-dw-beat/scripts/produce.mjs:33-43, 76-82` |
| 5 — narrow the two `no @media` assertions | `664ebde7` | `skills/twin-chart-web/test/seed-fluid-frame.test.ts:148-176, 195` |
| 9 — `size` in both gate readings | `031818d2` | `skills/twin-storyboard/scripts/storyboard.mjs:33, 39, 50, 62-71`; `skills/splash-twin/scripts/where.mjs:64, 85-93` |
| 3a — the static SEED only | `ee55c95a` | `skills/twin-chart-beat/assets/ChartSeed.tsx:21, 297` |

### Divergences — improvements

1. **The doctrine record landed in a different file than the spec named.** §4 Task 1 asks for
   `skills/twin-doctrine/references/static-discipline.md`. That path does not exist and never did —
   `skills/twin-doctrine/references/` holds seven files and none is `static-discipline.md`. The
   record landed at `skills/twin-chart-beat/references/static-discipline.md:199-238`, which is where
   every other reference in the tree points (`SKILL.md:105`). The spec named the wrong path; the
   execution used the right one and did not say so.

2. **§5 assertion 2 was replaced, with a written reason.** The spec asks for *"the walk finds at
   least as many copies as the tree has craft skills using the table."* The shipped guard replaces
   it with a two-directional mirror pairing (`size-table-parity.test.ts:141-197`), on the argument —
   stated in the test — that the only mechanical way to count "craft skills using the table" is to
   count the copies, which makes the assertion check itself. The reasoning is sound and the
   replacement is stronger: I reddened both directions independently (M6b, M7 in §5).

3. **`sizeFor` returns a copy of the row** (`sizes.mjs:79`) with its own assertion
   (`size-table-parity.test.ts:283-287`). Not asked for. Correct.

4. **Task 4's IHDR pin became a runtime check.** §4 Task 4 says *"measure once what Datawrapper
   actually returns for each size and pin the returned IHDR against it."* There is no
   `DATAWRAPPER_TOKEN` on this branch, so `assertExportedSize` (`produce.mjs:33-43`) reads the
   returned PNG's own IHDR and throws instead. Recorded in the spec's own §6b. This is the better
   answer and the reason given is the project's own rule.

### Divergences — unnoticed drift

5. **A fourth copy of the table exists that the spec did not foresee, and it forced a guard fix.**
   `skills/splash-twin/assets/root-template/shared/twin-chart-beat/sizes.mjs` is byte-identical to
   the canonical copy and is the one a `cp -r root-template/` install carries into a newsroom root.
   §4 Task 1 counts *"1 of an eventual 5"* plus one mirror; it does not mention the vendored copy.
   The guard's first mirror assertion failed on it and had to be anchored at `twin/shared/`
   (`size-table-parity.test.ts:163-176`).

6. **The mirror the spec justified has no consumer, and the one beat that uses the table bypasses
   it.** §4 Task 1 creates `shared/twin-chart-beat/sizes.mjs` because *"`proof/` beats consume craft
   helpers through the `#shared/*` alias … so the beat-facing copy must exist or every render script
   reaches across a skill boundary."* Measured today: **zero** files under `proof/` contain the
   string `#shared/twin-chart-beat/sizes.mjs`, and the single beat that uses the table —
   `proof/palette-proof/render.mjs:23` — imports
   `../../skills/twin-chart-beat/scripts/sizes.mjs` directly, which is exactly the reach-across the
   mirror exists to prevent. `no-cross-skill-imports.test.ts` cannot see it: its own header scopes it
   to *"every source file … under a skill"*, and `proof/` is not under a skill. The mirror assertion
   is written to fire only on `#shared/…` specifiers (`size-table-parity.test.ts:184-189`), so it
   cannot see it either. The guard's own recorded green — *"delete a mirror NO beat imports →
   GREEN"* (`:66`) — is honest, and I reproduced it (M10).

### Divergences — regressions

7. **`twin-chart-beat/SKILL.md`'s Quick start is now instructions that throw.** `:143-144` still
   passes `width: 900, height: 560` and passes no `size` prop, while the seed derives its frame from
   `sizeFor(size)` (`ChartSeed.tsx:297`). Run with exactly the Quick start's props:

   ```
   Quick start THROWS: Unknown export size undefined. This skill draws at exactly three:
   landscape, square, portrait — …
   ```

   `skill-md-matches-code.test.ts` cannot catch this by construction: its own header scopes it to
   three claim shapes — a path resolves, a credited identifier is present in the file, a tuning
   constant exists in the file its row names. A code block's argument list is none of the three.

8. **The doctrine states in the past tense a thing that is still true.**
   `static-discipline.md:206-207`: *"`rasterise` **used to** render at `fitTo: { mode: "width",
   value: width * 2 }`."* It still does, in all three copies —
   `skills/twin-chart-beat/scripts/render-still.mjs:262`, `shared/twin-chart-beat/render-still.mjs:262`,
   `skills/splash-twin/assets/root-template/shared/twin-chart-beat/render-still.mjs:262`. The
   sequencing paragraph two lines below (`:219-221`) contradicts the tense and is the correct
   statement. The skill's tuning-knob row still carries `2` (`SKILL.md:168`), which is the honest
   half.

---

## 2. What the spec promises that is NOT in the tree

The session record's *"17 written statics and 19 video beats are not migrated"*
(`SESSION-2026-08-09-10.md` §5 item 5) is **right on both counts and incomplete**. Re-measured today.

| genre | beats | of which map | mine (chart) | draw at a size from the table |
|---|---|---|---|---|
| static (`render.mjs` → `renderStill`) | 23 | 6 | **17** | **0** |
| video (`Root.tsx`) | 25 | 6 | **19** | **0** |
| web (`render-web.mjs`) | 23 | 5 | **18** | n/a — web takes no size; the **fill rule** is unwritten |
| dw | 1 call site | — | 1 | **1** |
| image | 1 seed | — | 1 | **0** |

Method: `grep -rl renderStill proof --include="*.mjs"` filtered to beat scripts (`render.mjs` /
`render-map.mjs`; the `render-still.mjs` hits are the parity copies of the helper); `find proof -name
Root.tsx`; `find proof -name render-web.mjs`. Consumers of the table: `grep -rn "sizeFor" proof
skills shared` — the only non-test consumers are `ChartSeed.tsx`, `render-preview.mjs`,
`twin-dw-beat/produce.mjs` and `proof/palette-proof/render.mjs`.

**What is left, per genre:**

- **Static, 17 beats.** Every one still states its frame twice as literals. Sixteen at
  `width: 900` with heights of 560 / 620 / 760 / 800 / 820 / 860 / 1000; one
  (`proof/static-bump-emitter-rank/render.mjs`) at `width: FRAME.width`. No delivered static is at a
  canonical size — measured from the PNGs' own IHDR:
  `proof/static-carbon-footprint-spread/static-carbon-footprint-spread-still.png` is **1800×1120**,
  `proof/static-swiss-age-pyramid/…-still.png` is **1800×1640**. The `× 2` retires with this task, in
  the same step, per `static-discipline.md:219-221`.
- **Video, 19 beats.** `useVideoConfig()` still destructures only `fps`; every `*Video.tsx` keeps its
  own `const FRAME`; every `Root.tsx` registers exactly **one** `<Composition>` (measured: 27
  `Root.tsx` in the tree, all with a single composition, e.g. `twin-chart-video/assets/Root.tsx:40-41`
  `width={1080} height={1080}`). Neither guard §5 promises for this task exists:
  **`video-size-comes-from-the-composition.test.ts` is absent** from
  `skills/splash-twin/test/` (32 files, listed), and `render-video.mjs` has no `ffprobe` rendered-size
  throw. The spec records the reason (a file collision with the visual-mechanisms chantier), not a
  cost.
- **Web, 18 beats.** Task 5 cleared the mechanism; **Task 6's fill rule is unwritten** — `buildCss`
  (`skills/twin-chart-web/scripts/render-web.mjs:186`) contains no `@media` at all, so B3.2's second
  half ("a mobile version") is still the honest gap `web-discipline.md:242-245` names. Task 7's
  retrofit is not done: `proof/more-heatmap-co2-per-capita-decades/render-web.mjs:256, 262` still
  carries `.chart-figure { max-width: …px }` and a `@media (max-width: …)` rung — the exact defect
  Task 5's narrowed assertion describes.
- **Image, 1 seed.** `ImageBeatSeed.tsx:48, 56` — `FRAME_WIDTH = 900`, `BOX_HEIGHT = 420`, height
  content-derived at `:158`. Dropped on the spec's own instruction.
- **Map — not W4's**, and named here only so the count is complete: 6 statics, 6 videos, 5 webs,
  W5/W6.

**Also promised and absent:** §7's proof rows 2, 3, 6 and 7 (the video mp4s at three sizes; the
pyramid, small-multiples and diverging-bar statics at three sizes; `webx-carbon-footprint` at the
phone viewport; the heatmap at 1400px). The only proof artifacts in the tree are row 0's probe
(`proof/static-carbon-footprint-spread/probe/`, 8 PNG/SVG pairs) and the seed's own three renders
(`skills/twin-chart-beat/output-proof/sizes/{landscape,square,portrait}.png` — IHDR verified
1920×1080, 1080×1080, 1080×1920).

---

## 3. What was built that the spec did not ask for

1. **`skills/twin-chart-beat/test/three-sizes-no-collision.test.ts`** — a render-based guard that
   draws the seed at all three sizes, measures the real ink box of every `<text>` run with resvg, and
   refuses a run that crosses the frame edge or overlaps another. Not in the spec. Its own header
   says it exists because a mutation run came back green. It is genuinely capable of red (§5, M11e/f)
   and its stated RED is false (§5, M11).

2. **`tokens(typeScale)` and `BASE` as exported module surface** (`ChartSeed.tsx:44-86`). §4 Task 3
   asks for the tokens to *become functions of `typeScale`*; the shipped shape is one exported
   factory plus an exported base table, which is what made the collision guard and the CSS-px
   measurement in §4 below possible from outside.

3. **`render-preview.mjs --size` and `output-proof/sizes/`** (`render-preview.mjs:26-27, 71-73`;
   `SKILL.md:190-192`). The spec's proof table only names the Task 0 probe. Three opened renders of
   the seed are extra evidence, and `--check` passes today (verified:
   `preview.png matches a fresh render of the seed`).

4. **The gate's `SIZED_GENRES` generalisation.** §4 Task 9 asks for a refusal on `static`/`video`
   with no size and on `web` with one. The shipped rule is a list
   (`storyboard.mjs:50`, `SIZED_GENRES = ["static", "video"]`) that also silently exempts `scrolly`,
   with its reason written at `:43-45`. Correct, and wider than asked.

5. **`assertExportedSize` as an exported function** with its own test
   (`twin-dw-beat/test/produce.test.ts` — *"should throw, naming both sizes, when Datawrapper returns
   something other than the row"*). See divergence 4.

---

## 4. The holes

### (a) The per-size TYPE SCALE is a width ratio wearing three hats — and it is the defect the spec names

The table ships `landscape 2.1 / square 1.2 / portrait 1.2` (`sizes.mjs:58-62`). Those are exactly
`width / 900` for all three rows. So the type scale encodes **frame width only** — the viewing
distance the spec spends two paragraphs arguing for (`spec §2`, the 1.20/1.58/1.80 diverging-bar
measurement) is not encoded anywhere.

Measured, by calling `tokens()` against each row and converting to phone CSS px at a 360 dp
full-bleed story (`1 frame px = width/360` CSS px):

| size | title | axis label | source | → at 360 dp: title / axis / source |
|---|---|---|---|---|
| landscape 1920×1080 | 55 | 27 | 29 | 10.3 / **5.1** / **5.4** |
| square 1080×1080 | 31 | 16 | 17 | 10.3 / **5.3** / **5.7** |
| portrait 1080×1920 | 31 | 16 | 17 | 10.3 / **5.3** / **5.7** |

Identical apparent size at all three, because the scale is a pure width ratio. The floor the
concurrent portrait probe grounds from three independent sources is **11–12 CSS px**, target 16
(`proof/portrait-aspect-probe/MOBILE-FIRST-WIREFRAME.md` §1.1: Datawrapper's own 12px statement, the
U.S. federal Data Visualization Standards' 9pt, Apple's 11pt as weak corroboration). The seed's axis
labels land at **5.3**.

`sizes.mjs:41-44` records this as **KNOWN OPEN for `square` only** — *"`square` is a SOCIAL POST …
where 1.2 puts the title at ~11px on screen"*. **Portrait carries the same 1.2 and is not recorded.**
R2 assigns portrait to **stories** — the most phone-native of the three — so the reference the file
itself calls wrong for square is wrong for portrait by the same argument, and only square is named.

That is the shape the spec, the table's own header and the guard's own header all identify as the
original engine's defect: *"one `scale: 1.7` shared by square AND portrait … a number that cannot be
right for both"* (`size-table-parity.test.ts:30-33`). The twin ships the same number for the same two
rows.

**And the concurrent probe's finding lands in `sizes.mjs`, not in a type sheet.** Its verdict
(`MOBILE-FIRST-VERDICT.md`) is that a beat typeset for a phone rather than for an article column
comes back at its own native aspect with the clamp never binding, and that *"at phone type sizes the
979 px stage holds a headline, a chart and a credit — that is all."* Nothing in the tree can express
that: `SIZES` carries `{width, height, typeScale}` and §2 forbids it learning a second question;
`references/types/*.md` does not exist in this branch; and `genre-catalog.mjs` keys on
medium × genre, not size. **The finding currently has no home.**

### (b) Every other place that still hard-codes a frame, and would silently disagree

Ordered by how quietly it fails.

| # | site | what disagrees |
|---|---|---|
| 1 | `twin-chart-beat/SKILL.md:143-144` | Quick start passes `width: 900, height: 560` and no `size`. **Throws if followed** (run above). The instruction file for writing a new beat. |
| 2 | the 17 chart statics' `render.mjs` | frame stated twice as literals; delivered PNGs at 1800×1120 / 1800×1640 |
| 3 | `render-still.mjs:262` × 3 copies | `× 2` raster, against `render-preview.mjs:71-73`'s 1×. **Two rasterisers in one skill, obeying different rules.** Noted at `SKILL.md:105-108`; mis-tensed at `static-discipline.md:206` |
| 4 | `proof/palette-proof/render.mjs:23` | uses the table by reaching across a skill boundary; unguarded (divergence 6) |
| 5 | `twin-chart-video/assets/Root.tsx:40-41` + `EmissionsVideo.tsx:42` + 19 beats | one composition, `FRAME` beside it, **no guard at all** |
| 6 | `twin-image-beat/ImageBeatSeed.tsx:48, 56` | `FRAME_WIDTH = 900`; height content-derived at `:158` |
| 7 | `twin-map-beat/assets/Co2MapStill.tsx`, `Co2MapVideo.tsx` | W5's, listed for completeness |

`twin-chart-web`'s `WebFrame` and `PREVIEW_WIDTH = 900` (`ChartWebSeed.tsx:644`) are **not** on this
list: R2 makes web a range, and the frame there is documented as *"NOT a rendered pixel size and NOT
a cap"*. `twin-scrolly`'s `FRAME` is out of scope by the spec's own §Scope.

### (c) The gate takes a decision nothing downstream reads — the sharpest one

Task 9 landed the size into **both** gate readings, verbatim and cross-checked. Task 3b did not land.
So today a journalist who pins `size: portrait` on a `chart/static` slot passes gate 2c, and the beat
renders 900×560 at `× 2` regardless. Nothing throws: `renderStill`'s size assertion compares the
element's drawn frame against the `width`/`height` it was handed, and **both come from the same two
literals in `render.mjs`**, so they agree by construction and the storyboard is never consulted.

This is not confined to chart statics. `genre-catalog.mjs:35-44` lists ten medium × genre pairs;
`SIZED_GENRES` requires a size of `static` and `video`, which is **six** of them —
`chart/static`, `chart/video`, `map/static`, `map/video`, `image/static`, plus the dw path. Exactly
**one** producer honours it (`twin-dw-beat`). The gate asks a question five of six producers ignore,
which is the same defect `storyboard.mjs:46-49` documents itself closing from the other side.

**Measured on the tree's own artefacts.** The two `STORYBOARD.md` files in `proof/` were not updated
with the field their gate now requires. Running `checkStoryboard(parseStoryboard(text).meta)`:

```
proof/co2-suisse/STORYBOARD.md  → […, "slot 1: size is missing — gate 2c never closed"]
proof/seance/STORYBOARD.md      → […, "slot 1: size is missing — gate 2c never closed"]
```

(Both also fail on `grounding`, `reference` and `reachable`, which pre-date W4; the size refusal is
new.)

### (d) The parity guard's own stated blind spot is currently the whole story

`size-table-parity.test.ts:47-49` names it: *"Whether a beat USES the table. A component that kept
`const FRAME = { width: 900 … }` beside a perfectly-parity-checked `sizes.mjs` passes every assertion
below. That is Task 3's own guard's job, and for video it is
`video-size-comes-from-the-composition.test.ts`."* Task 3b did not land and that video guard does not
exist, so the deferred job is deferred to nothing. The header is honest; the hole is that both
referents are absent.

---

## 5. Every guard the spec promises, mutated

All mutations run in `/tmp/w4mut/twin` — a pristine `rsync` of the tree per mutation, `node_modules`
symlinked, never in this working tree. Baseline: `size-table-parity` 8 pass / 0 fail.

### `size-table-parity.test.ts` — 10 of 10 recorded mutations reproduce, including both greens

| mutation | recorded | observed | failing assertion |
|---|---|---|---|
| `portrait.height` 1920→1922, dw copy only | RED | **RED** | agree on width and height |
| fourth row `feed:` in one copy | RED | **RED** | identical SET of row names (+ `sizeFor` throw) |
| delete `landscape` from one copy | RED | **RED** | row set, dimensions, typeScale shape, even integers |
| `landscape.width` 1920→1921 | RED | **RED** | agree on w/h **and** even integers |
| rename the canonical `sizes.mjs` | RED | **RED** | the premise assertion, not silently green |
| orphan mirror, skill copy gone | RED | **RED** | mirror pairing (a) |
| a beat imports a mirror that does not exist | RED | **RED** | mirror pairing (b) |
| dw copy grows `typeScale: "large"` | RED | **RED** | typeScale shape |
| `square.typeScale` changed in one copy | **GREEN** | **GREEN** | — as designed |
| delete a mirror no beat imports | **GREEN** | **GREEN** | — as designed |

Two extras I added, both RED: `sizeFor` defaulting to `landscape` instead of throwing; the seed
keeping its own `FRAME` constant (reddens `render-still.test.ts` through `renderStill`'s own throw,
`asked to render at 1920x1080, but the element is drawn at 900x560`).

The orphan direction (a) needed a purpose-built case to test in isolation: only one skill has a
mirror and it is the canonical, so deleting it confounds with the premise assertion. Creating
`shared/twin-ghost-beat/sizes.mjs` isolates it — RED on the mirror assertion alone, 7 pass / 1 fail.

**Verdict: real, well-designed, and its two documented greens are documented for the right reason.**

### `seed-fluid-frame.test.ts`, Task 5's narrowing — 7 of 7 reproduce

Injected into `buildCss`'s stylesheet (`render-web.mjs:196`), which is what the test reads.

| injected rule | recorded | observed |
|---|---|---|
| a second `@media (max-width)` block | RED | **RED** — *at most ONE width query* |
| `@media { .chart-figure { max-width: 560px } }` | RED | **RED** — the cap defect, by pattern |
| `@media { .chart-plot { display: none } }` | RED | **RED** — ×3 assertions |
| `@media { .chart-source { display: none } }` | RED | **RED** — ×2 |
| `@media (orientation: portrait) { … }` | RED | **RED** — a rung under another name |
| `@media { .x-axis .tick:nth-child(2n) { display: none } }` | **GREEN** | **GREEN** |

**Verdict: real.** The narrowing is a narrowing, not a deletion.

### Task 9's two gate readings — RED in all three directions

| mutation | observed |
|---|---|
| `sizeGap` wording changed in `twin-storyboard` only | **RED** — *"gate 2c: both readings … string for string > web WITH a size"* |
| `web` allowed to carry a size, `twin-storyboard` only | **RED** — 2 assertions |
| the missing-size refusal dropped from `where.mjs` only | **RED** — 3 assertions |

**Verdict: real.** The string-for-string cross-check is load-bearing; the two gates cannot diverge
silently on this field.

### Task 4's `assertExportedSize` — RED

`if (got.width !== row.width || got.height !== row.height)` → `if (false)` reddens
`twin-dw-beat/test/produce.test.ts`. **Verdict: real.** Note it has never run against the API — there
is no `DATAWRAPPER_TOKEN` on this branch and the round-trip test skips.

### `three-sizes-no-collision.test.ts` — the guard is real, its mutation table is not

Its header (`:41-52`) records six mutations, **one RED and five GREEN**. The one RED does not
reproduce:

```
X_TICK_DROP: sp(BASE.X_TICK_DROP)  →  X_TICK_DROP: BASE.X_TICK_DROP
  recorded: RED, "the source line struck through 2016 and 2018, here by 58.2 x 1.9 px"
  observed: GREEN, 9 pass / 0 fail
```

It cannot go red, and the arithmetic says why. `padding.bottom` is
`height − sourceBaseline + SOURCE.fontSize + X_TICK_DROP + X_AXIS_TO_SOURCE_GAP`
(`ChartSeed.tsx:351-356`); the plot floor is `height − padding.bottom` (`:193`); the tick baseline is
`plot.bottom + X_TICK_DROP` (`:422`). Substituting, the baseline is
`height − PAD − SOURCE.fontSize − X_AXIS_TO_SOURCE_GAP` — **`X_TICK_DROP` cancels out entirely.**
Un-scaling it moves the plot floor and moves nothing else. `git log ee55c95a..HEAD --
skills/twin-chart-beat/assets/ChartSeed.tsx` is empty, so the seed has not changed since the guard
was written: the claim was already false when it was typed.

Three further mutations, all recorded or implied as the class this guard exists for, all **GREEN**:

| mutation | observed |
|---|---|
| `sp = (v) => v` — **spacing stops scaling entirely**, the probe's own defect | **GREEN** |
| `HEADER_TO_PLOT` frozen at its bare 34 | **GREEN** |
| `X_AXIS_TO_SOURCE_GAP` frozen at its bare 8 | **GREEN** |

Two controls confirm the machinery works: `TITLE.fontSize × 3` → **RED** (clipping and overlap, all
three sizes); `PAD` frozen at 0 → **RED** (clipping, all three sizes).

**Verdict: the guard is not decorative — it detects clipping and overlap for real — but its recorded
mutation table has no true RED row, and the header's confident narrative ("it reproduces this seed's
own recorded defect verbatim … by 58.2 × 1.9 px") is the kind of statement invariant 4 exists to stop
being taken on faith.** The guard's real range is narrower than its header claims: it sees a literal
that is the **whole** of a gap, and this seed has none whose position it actually controls. That
should be written into its header, and the false row struck.

### Guards promised and absent

- **`video-size-comes-from-the-composition.test.ts`** (§5) — does not exist.
- **The `ffprobe` rendered-size throw in `render-video.mjs`** (§5, and the spec's own answer to the
  original engine exempting landscape) — does not exist.

Nothing else in the tree asserts a video's frame agrees with its composition. That drift is exactly
as unguarded today as §1a measured it before the chantier started.

---

## 6. Tree state at the time of this audit

`bun test skills/twin-chart-beat skills/twin-dw-beat skills/splash-twin skills/twin-storyboard` —
**1268 pass, 3 skip, 1 fail** (48 files, 131s). The one fail is
`claims-grounded-in-data.test.ts:751` — *"should find a beat script in the ancestry of every rendered
artifact under `proof/`"* — listing 22 PNGs under `proof/portrait-aspect-probe/`. That is the
concurrent portrait chantier's working directory, not W4's, and not touched here.

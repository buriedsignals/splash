# W5 + W6 — the map camera, and map × web on live MapTiler

**Chantiers:** W5 (the camera) and W6 (live tiles), specified together because `PLAN-2026-08-10.md:61`
requires it: both rewrite how a map web beat is built, and W4's map half waits on this spec's answer
to "how does the target aspect enter the camera".

**Feedback closed:** B4.1, B4.2, B5.1, B5.3, B6.10, B6.14, B6.17, B6.18a. **Rulings implemented:** R1
(live tiles, the key in the delivered file) and R2's map half (three fixed export sizes for static
and video, a range for web).

**Method, non-negotiable** (`PLAN-2026-08-10.md:7-21`): no change below is answered with a shared
module. Every change is made identically in each copy, and a **walking** parity test — one that finds
the copies rather than being told them — keeps them in step. Every new guard ships with the mutation
that reddens it, run in a copy outside the tree (`PLAN-2026-08-10.md:31-32`).

---

## 0. The one-paragraph answer

The camera is decided sixteen times in `proof/` and three more times in the skill seeds — **nineteen
hand-written `BEAT` literals in nineteen bakes** — and each is compensated for downstream by pixel
constants tuned by eye. The tree already spans zoom 0.707 to 11.398 (1,660×), so the machinery *can*
hold a city and a planet; it cannot hold them with the same code. The single enabling fact:
**`geometry.json` throws away everything the camera knows except `zoom`**, so every size decision
downstream re-guesses it. Task 1 makes the bake record what it already computes. Everything else in
this spec is arithmetic over those recorded facts, plus two walks that make nineteen bakes and
eighteen geometry cores visible to the suite for the first time.

Then R1 turns map × web inside out: the plate stops being the interactive surface and becomes the
**fallback**, and a live MapLibre map with MapTiler tiles is what a reader moves through. That closes
B6.14b's out-of-map zoom button and B6.18a's centre-only hover by construction, and it costs more
than the key — §7 prices all of it.

---

## 1. The measured state

### 1.1 Nineteen cameras, nineteen bakes, nothing compared

Twelve `bake.mjs` under `proof/`, four `bake-plate.mjs` under `proof/`, three `bake-plate.mjs` under
`skills/` (`twin-map-beat`, `twin-map-web`, `twin-scrolly`). 4,644 lines total. Shared function names
across them: `resolveChrome` 19/19, `parseEnvFile` 19/19, `partsOf` 4, `ringsOf` 5, `simplifyRing` 3,
`keepRing` 3.

**Nothing walks them.** `render-still-parity.test.ts:68-87,149` walks the tree for files named
exactly `render-still.mjs`; its own header names the hole at `:48-51`. `helper-parity.test.ts:61-132`
imports a hand-written list in which **not one `geo-*` or `bake*` function appears**.
`twin-map-beat/test/geo.test.ts` exercises only `../assets/geo` — the skill's own copy.

The emitted `geometry.json` spine is `frame, bounds, style, gatedBy, zoom` in 18 of 19
(`twin-scrolly/scripts/bake-plate.mjs:214-219` has no `bounds` — it fixes a camera by centre + zoom,
`CAMERA` at `:44`). Beyond that spine:

| Fact | Present in | Absent from |
|---|---|---|
| `frameCorners` | `map-quake-density/bake.mjs:250`, `mapvid-hexgrid-quakes/bake.mjs:254`, `mapgen-hexgrid-web/bake-plate.mjs:208` | 16 of 19 |
| `worldWidthPx` | `map-quake-density/bake.mjs:254`, `mapvid-hexgrid-quakes/bake.mjs:258` | 17 of 19 |
| `normaliseLon` | `map-quake-density/bake.mjs:111`, `mapvid-hexgrid-quakes/bake.mjs:115` | 17 of 19 |
| the two camera invariants | `map-quake-density/bake.mjs:192-211`, `mapvid-hexgrid-quakes/bake.mjs:196-215` | 17 of 19 |
| `degreesPerPixel` / `metresPerPixel` | **nowhere** | 19 of 19 |

`mapgen-hexgrid-web/bake-plate.mjs:30-39` runs the same global camera Greenwich-centred, without
`normaliseLon`, under a comment claiming it is *"The SAME real, world-spanning camera
`proof/map-quake-density/bake.mjs` uses"*. The comment is false and the cost is measured in the
sibling's own brief (`map-quake-density/BRIEF.md:66-71`): 1,374 events in the Fiji–Tonga cell against
1,724, with a rival cell three behind.

**`map-quake-density/bake.mjs:210` prints `Math.ceil(width * 0.5685)`** as the minimum frame height
for the asked latitude range. Measured here, not assumed: `(mercY(78°) − mercY(−60°)) / 2π =
0.568145`. At the current 836 px width the typed constant advises 476 px and the derivation advises
475 — **a one-pixel difference, so replacing the constant changes no render.** The constant is also
prose at `:41` and duplicated verbatim at `mapvid-hexgrid-quakes/bake.mjs:45,214`.

### 1.2 Eighteen geometry cores, and the fourteen names that already disagree

Sixteen `proof/*/geo-*.ts` plus `twin-map-beat/assets/geo.ts` (427 lines) and
`twin-map-web/assets/geo-symbol.ts` (125 lines). 6,453 lines. Guarded by nothing.

A body-by-body comparison of every function name appearing in more than one file (brace-matched,
comments stripped, whitespace normalised — the `render-still-parity.test.ts:89-106` method) finds
**fourteen names that disagree today**:

| Name | Copies | Disagreement |
|---|---|---|
| `sequentialRamp` | 6 | `FROM/TO` = `0.1/0.78` in the three choropleth copies (`mapgen-choropleth-video/geo-choropleth.ts:262-263`, `mapgen-choropleth-web/geo-choropleth.ts:251-252`, `twin-map-beat/assets/geo.ts:291-292`) vs `0.14/0.82` in the three hex copies (`map-quake-density/geo-hex.ts:254-255`, `mapgen-hexgrid-web/geo-hex.ts:282-283`, `mapvid-hexgrid-quakes/geo-hex.ts:278-279`). Same name, same docstring (`geo-hex.ts:247` claims *"Same construction as the choropleth's ramp"*), different numbers |
| `binIndex` | 6 | **Semantic**: hex trio tests `value > breaks[i]`, choropleth trio tests `value >= breaks[i]` — different boundary membership |
| `readingOrder` | 5 | Four different sort keys, one reversed: `b.value-a.value` (`mapgen-choropleth-web:350`, `twin-map-web:57`), `b.population-a.population` (`mapgen-dot-web:325`), **ascending** `a.priority-b.priority` (`mapgen-locator-web:170`), delegate to `drawOrder` on `.mag` (`mapgen-symbol-web:155`) |
| `en` | 4 | `"en-US"` in the two choropleth copies, `"en-GB"` in `mapgen-dot-web:331` and `mapgen-symbol-web:304` — **one project, two locales for the same numbers** |
| `radiusScale` | 3 | d3 `scaleSqrt` in the two proof copies vs hand-rolled `Math.sqrt` in `twin-map-web/assets/geo-symbol.ts:32` |
| `niceReferenceValues` | 3 | Hard-coded `0.5` step (magnitude domain) vs `top/count` |
| `simplifyRing` | 9 | 3 shapes: typed `Ring`, typed `PixelRing`, and untyped `.mjs` transcriptions inside three dot bakes |
| `keepRing` | 9 | Same: 6 typed cores vs 3 untyped bake transcriptions |
| `labOf`, `channels`, `drawOrder`, `groupsOf`, `valuesFromCsv`, `quakePointsFromCsv` | 2–6 each | field names, guard-regex names, an extra argument, a delegate |
| `resolveChrome` (bakes) | 19 | Two variants: 14 copies vs 5 whose error message appends *"Set CHROME_PATH, or run: bunx puppeteer browsers install chrome"* |

Byte-identical after normalisation, and therefore already in step: `declutterLabels` (4),
`labelSide` (3), `labelPlacement` (3), `pointInRing` (6), `pointInRings` (3), `mixHex` (6),
`deltaE76` (4), `clipToBBox` (3), `pointOnFeature` (3), `chooseHexSize` (3), `chooseDotValue` (3),
`fillTightness` (3), `separateOverlappingMarkers` (2), `parseEnvFile` (19), `partsOf` (4),
`ringsOf` (5).

**This measurement changes the guard design and §4 is written around it.** A naive "every shared name
must agree" walk goes red on fourteen families on day one, and at least four of those disagreements
are correct code. That is `helper-parity.test.ts`'s own failure mode at six times the scale — a guard
that reddens for correct work is a guard someone disables (`PLAN-2026-08-10.md:16-18`).

### 1.3 What is extent-dependent, per type

- **Choropleth** — everything derived except the label anchor, which is a hand-typed lon/lat nudged by
  eye to compensate for `textAnchor="end"`: `mapgen-choropleth-video/bake.mjs:42-47`, drawn at
  `ChoroplethStill.tsx:161,241,252,335` and `ChoroplethVideo.tsx:193,389,400,511,521`. **That is B6.10
  entire.**
- **Proportional symbol** — four answers to "how big is the biggest circle", none data-relative:
  `QuakeSymbolStill.tsx:25` `MAX_RADIUS = 30`, `QuakeSymbolVideo.tsx:39` `= 46`,
  `map-quake-symbol/render.mjs:64` `STILL_MAX_RADIUS = 30`, `QuakeSymbolWeb.tsx:59`
  `MARK_MAX_RADIUS_FRACTION = 0.045`, `MapWebSeed.tsx:78` `= 0.062`. Overlap (B6.17) is
  nearest-neighbour distance versus radius, and nothing measures the first. The hit target is the same
  number from the other side (B6.18a): a fixed 28 px button under a disc that reaches 90 px across at a
  1000 px frame — a reader entering the circle is 31 px from firing anything.
- **Dot density** — `chooseDotValue` is data-derived (`geo-dot.ts:71-82`) and camera-independent, good;
  the drawn dot radius is `DOT_RADIUS_FRACTION = 0.002` of frame width
  (`DotDensityWeb.tsx:45,124`), and `fillTightness` (`geo-dot.ts:257-271`) already measures dots per
  1,000 drawn px — **for the alt text only, never as a constraint**, in either direction.
- **Hex grid** — the closest to scale-general already: `chooseHexSize` derives cell size from frame
  area and verifies against the real bin count (`geo-hex.ts:182-198`). Residuals are the pole clip and
  the seam, both camera-level.
- **Locator** — markers are uniform by type invariant (`references/types/locator.md:28`), so no size
  problem; the extent problem is the labels (6 of 11 dropped — `map-geneva-locator/BRIEF.md:70,93`,
  confirmed against the committed `render/static.svg`) and the flip margin. It also holds the **only**
  bake that validates the camera against the subject's own footprint rather than against a typed box:
  `mapvid-locator-geneva/bake.mjs:239-244`.
- **Flow / route** — holds the machinery the others need: `clipToBBox` (`geo-flow.ts:145-172`) and
  `pointOnFeature` (`:189`), i.e. the pole of inaccessibility over the **camera-clipped** ring. Three
  copies, byte-identical, already shipped.

### 1.4 The two rungs that have never been produced

Against B4.1's own list — planet · several continents · one continent · one country · a region · a
city — the committed `geometry.json` files hold planet (360° lon), several-continents (83°),
continent (59–66°), a multi-country corridor (23.7°), and a city (0.135°). **Between 23.7° and 0.135°
there is nothing: a factor of 175 with no beat in it.** One country and one region — the two extents a
local newsroom asks for most — have never been produced by this tree. Task 11 produces them; nothing
in this spec may assume they behave.

### 1.5 Map × web today, and what R1 overturns

Two generations ship. `mapgen-dot-web` and `mapgen-symbol-web` are on the fit-the-window API
(`100svh` / `container-type: size` / `100cqw`, one SSR). **`mapgen-choropleth-web`,
`mapgen-hexgrid-web` and `mapgen-locator-web` are still on the old two-rung `layouts` API**
(`ChoroplethWeb.tsx:619,635`; `mapgen-hexgrid-web/render-web.mjs:69`;
`mapgen-locator-web/render-web.mjs:45,60`), plates baked to fixed desktop sizes (496, 836×520, 420).

The delivered HTML is one file: SSR'd React (`render-web.mjs:93`), inline CSS from `buildCss:185`,
`interaction.mjs` inlined as a classic script (`:100,122-139`), and the plate as a base64 `data:` URI
(`:480-484`). Committed sizes: 186 KB (symbol) to 642 KB (dot).

R1 overturns `map-web-discipline.md:357-381` and `SKILL.md:48-51` (*"the shipped HTML makes zero
external request once the plate is inlined as a data URI"*). The bounded `ZOOM_SCALE` step
(`MapWebSeed.tsx:91` = 1.4; `DotDensityWeb.tsx:53` = **2.2** — already diverged) is the out-of-map
button B6.14b asks to remove.

Verified live for this spec: `twin/.env`'s `MAPTILER_KEY` answers `200` for both
`dataviz-light` and `dataviz-dark` style JSON (24.9 KB). `twin/.env` is git-ignored
(`.gitignore:1`), untracked, and **no tracked file in the repository contains the key today** —
§7.3 exists to keep that true.

---

## 2. The two doctrine rewrites this spec owes

### 2.1 `geo-discipline.md` rule 12 — a second clause

Rule 12 (`:204-215`) says the camera is chosen from the geography and the layout is built around the
plate. It is correct, it is obeyed (aspects in the tree run 1.0 → 2.238), and it is **half-written**:
it does not say what happens when the layout *cannot* adapt because a channel fixed it. R2 rules that
direction. The rewrite adds, without deleting the existing clause or its defect note:

> **The camera takes three inputs, not one: the geography, the study set, and the target aspect.**
> An export size fixes the frame. The beat's furniture takes the height its own measured text needs.
> What is left is the **stage**, and the stage's aspect is what the camera is fitted to — the same
> computation `map-web-discipline.md`'s "Fit the window" already performs for a window, performed for
> a frame. Where the target aspect and the geography disagree, the resolution is **stated in the beat
> and asserted at the bake**, never absorbed silently by `fitBounds`. Silent absorption is the
> recorded defect: a 900 × 560 frame asked for `[-11,35] → [31,66]` and got −30° to +45°.

The circularity a reader will look for, named so it is not discovered: the stage depends on the
furniture, and a proportional-symbol legend's height could depend on the drawn marks, which depend on
the camera. It does not, and must not — **the legend's reserve is measured from its own longest
label-plus-unit string and its own capped reference circle** (`LEGEND_MAX_RADIUS_PX`, already fixed
and already independent of the drawn marks), never from the plate. Task 7 makes that a rule rather
than an accident.

### 2.2 `map-web-discipline.md` "Pan and zoom" — rewritten to record a reversal

`:357-381` must be **rewritten, not edited quietly** (R1's own instruction). The section keeps the old
argument verbatim as the position that was overturned, adds the ruling verbatim, and adds the price
list from §7 — so a future reader meets a decision with its cost attached, not a tidied page. The
same reversal is due in `twin-map-web/SKILL.md:21,48-51,63-73,124` and in its Tuning-knobs rows
(`:229-232`), which `skill-md-matches-code.test.ts:538` will fail on the moment `ZOOM_SCALE`
disappears — that red is expected, not discovered.

`map-web-discipline.md`'s **"The plate strategy"** (`:102-135`) survives with its subject changed: the
plate is no longer the display surface, it is the fallback, so `PLATE_SIZE` stops being a resolution
argument and becomes a payload argument (§7.1).

---

## 3. The sequence, and why it is this order

| # | Task | Blocks | Touches |
|---|---|---|---|
| T1 | The bake records what it already knows | everything | 19 bakes |
| T2 | The two camera invariants, `0.5685` derived | T11, T12 | 18 bakes (+1 exempt) |
| T3 | `bake-parity` walk + `resolveChrome` unified | T4… | 1 new test, 14 bakes |
| T4 | `geo-parity` walk, and the fourteen disagreements resolved in writing | T5–T10 | 1 new test, 18 cores |
| T5 | One label-anchor mechanism (closes B6.10) | — | 3 choropleth + 3 dot cores, 5 components, 2 bakes |
| T6 | Symbol radius and hit target derived (B6.17, B6.18a — static/video half) | T13 | 3 symbol cores, 3 components, 1 runner |
| T7 | One reserve rule: legend box and label margin measured on both dimensions | — | 3 symbol + 3 locator cores, 1 seed |
| T8 | Dot density bounded at both ends, and Mercator stated | T13 | 3 dot cores |
| T9 | Hex pole clip and seam derived | — | 3 hex cores, 3 bakes |
| T10 | Locator camera validated against the subject's footprint | T11 | 3 locator bakes/cores |
| T11 | **The two missing rungs, produced** | T12 | 2 new beats |
| T12 | The target aspect enters the camera (R2, rule 12) | W4's map half | 14 bakes, 7 video Roots |
| T13 | Live MapTiler in the web seed (R1) | T14 | `twin-map-web` |
| T14 | The five web beats retrofitted, three of them off the two-rung API (B5.1) | — | 5 proof beats |
| T15 | The two doctrine rewrites, and the SKILL.md that contradicts them | — | 2 references, 2 SKILL.md |

**T1 lands before anything depends on it** and changes no render — that is the whole reason it is
first. **T6's web half is deliberately deferred into T13**: once marks are MapLibre layers, a
frame-fraction radius constant is the wrong shape entirely, so deriving it twice would be work thrown
away. **T12 lands after T11** because an aspect gate that has never been run at a country or a region
extent is a gate nobody has tested.

---

## 4. The two walks, and the one place this spec departs from precedent

### 4.1 `bake-parity.test.ts` — keyed on both basenames

`findAll(TWIN, "bake.mjs")` **and** `findAll(TWIN, "bake-plate.mjs")`. Keying on one name would miss
four `proof/` files and all three skill seeds — the identical mistake to a hand-written import list,
made with a walk. Canonical: `skills/twin-map-beat/scripts/bake-plate.mjs` (the richest skill copy;
a `proof/` canonical would invert the tree's own direction of authority).

Compares **top-level `function NAME(…)` declarations only**, by the
`render-still-parity.test.ts:109-146` brace-matching method, with its normalisation
(`:89-106`) unchanged. This gives the legitimate divergence for free: **`BEAT` is a module-level
`const`, so it is never compared** — the camera literal is the journalist's frame and must stay
per-beat. Superset/subset is fine (`render-still-parity.test.ts:20-25`): a point bake has no polygon
join.

Anti-vacuity pin, in the shape of `render-still-parity.test.ts:152-163`: the canonical must carry
`resolveChrome`, `parseEnvFile`, `mercY`, `minFrameHeightPx`, `frameCornersOf`, `normaliseLon`,
`assertCameraReachesBounds`. And `copies.length >= 12`.

**Expected day-one red, resolved inside T3, not discovered later:** `resolveChrome` has two variants
across the 19. The five-copy variant's error message names the fix
(*"Set CHROME_PATH, or run: bunx puppeteer browsers install chrome"*); it is strictly better, so T3
adopts it in all 19.

**The mutation that reddens it:** in a copy of the tree outside `twin/`, change `normaliseLon`'s
`+ 360` to `+ 180` in `proof/mapvid-hexgrid-quakes/bake.mjs` and run the walk. It must name that file
and that function. Then delete `normaliseLon` from that copy entirely and confirm the walk stays green
— a missing function is a legitimate subset, and a guard that cannot tell the two apart is reporting
something else.

### 4.2 `geo-parity.test.ts` — and why it does not take a canonical

`findAll` for `geo-*.ts` (18 files today). **This is where the spec departs from
`render-still-parity.test.ts`, and the departure is argued, not assumed.**

That guard works because its family is one file copied wholesale: every shared name really is the same
function, so a single canonical is meaningful. The geometry family is six type-specific cores that
share a namespace **as much by accident as by design** — measured in §1.2, fourteen multi-copy names
disagree today and at least four of the disagreements are correct (`readingOrder`'s four sort keys are
four beats' reading orders; `drawOrder` sorts `.mag` in one data shape and `.value` in another). A
single hard-coded canonical is worse still: it would silently unguard every function the canonical
lacks, and no one file holds all six type families. That is the hand-written-list mistake wearing a
walk's clothes.

**The mechanism: the code states the claim, the walk finds it.** A function meant to be one function
everywhere carries a `@parity` tag in its docblock. The walk compares **every tagged name across every
file that declares it**, pairwise — no canonical, and the failure message names all disagreeing
copies. The omission hole is closed by the second assertion: **a file declaring a name that is tagged
anywhere must either carry the tag too, or carry `@parity-exempt <reason>` on that declaration.** You
cannot silently create an untagged twin of a tagged function; you must write down why it is different,
in the diff, where a reviewer sees it.

Anti-vacuity pin: at least 10 distinct tagged names, each found in ≥ 2 files.

**T4's real content is not the test — it is the fourteen decisions the test forces**, each recorded in
the beat or the core it belongs to:

- **`sequentialRamp` 0.1/0.78 vs 0.14/0.82** — the survey could not establish whether this is per-type
  tuning or drift, and neither can this spec. The comment claims sameness while the code differs, so
  one of the two is wrong today. **Decide and write it down**: either one tagged function (and the hex
  beats re-render, which must be looked at — a ramp's low end moving from 0.14 to 0.10 changes what a
  sparse cell reads as), or two functions with two names and two docstrings.
- **`binIndex` `>` vs `>=`** — a real semantic disagreement about which side of a break a value falls
  on. One of the six beats is drawing a boundary value in the wrong bin. Resolve against the type
  sheets, not by preference.
- **`en` `en-US` vs `en-GB`** — a defect, not a divergence: one project formats the same numbers two
  ways. Pick one, tag it.
- **`readingOrder` × 4, `drawOrder` × 2, `groupsOf` × 2, `valuesFromCsv` × 2** — legitimately
  different; each takes `@parity-exempt` with the reason on the line.
- **`radiusScale` d3 vs hand-rolled, `niceReferenceValues` fixed-step vs computed** — the skill seed
  and the proof beats have drifted apart on the type's own core arithmetic. Reconcile toward the seed
  (a seed is what a new beat is copied from — the W2 argument applies here unchanged).
- **`simplifyRing` / `keepRing` in three dot bakes** — not a normalisation problem to be papered over.
  `mapgen-choropleth-video/bake.mjs:27` already imports both from its own `./geo-choropleth.ts`; the
  three dot bakes transcribe them into untyped JS instead. **Move them into `geo-dot.ts` (3 copies) and
  import within the beat** — this is not a cross-skill import (`no-cross-skill-imports.test.ts:4-12`
  forbids leaving a skill, not moving inside a beat), it deletes six duplicate bodies, and it removes
  the `.ts`/`.mjs` comparison problem at the root rather than teaching the normaliser about types.

**The mutation that reddens it:** in a copy outside the tree, change `keepRing`'s `margin = 40` to
`30` in `proof/mapmore-flow-danube/geo-flow.ts`. The walk must name `keepRing` and all six files.
Then add a new, untagged `keepRing` to a file that has none and confirm the **second** assertion goes
red for the missing tag — the first assertion cannot see it, and that is precisely the hole this
mechanism exists to close.

---

## 5. The camera work, task by task

### T1 — the bake records what it already knows

**No render changes.** Inside the `page.evaluate` that already returns the gate, add what
`map-quake-density/bake.mjs:165-186` already computes, and emit it into `geometry.json`:

- `frameCorners { west, north, east, south }` from `map.unproject([0,0])` and
  `map.unproject([width,height])` — **the extent actually shown, which is not `BEAT.bounds`**:
  `fitBounds` preserves the frame's aspect by zooming out, as `mapgen-hexgrid-web/bake-plate.mjs:167-170`
  says in its own comment.
- `worldWidthPx = 512 * 2 ** map.getZoom()`.
- `degreesPerPixel` and `metresPerPixel` at the frame's **centre latitude** — the two numbers every
  downstream "big enough / too big / too close together" decision actually needs, and the reason every
  one of them is a typed pixel constant today.

**Copies: 19** (16 `proof/`, 3 `skills/`). ~10 lines each. `twin-scrolly/scripts/bake-plate.mjs`
included: it has no `bounds`, but it has a camera, and the facts are derived from the map.

**Guard:** T3's walk, once it exists; within T1, the pin is that all 19 committed `geometry.json`
files carry the four new keys, asserted by a re-bake.

**Proof:** re-bake all 19 plates and diff the PNGs byte-for-byte against the committed ones. A single
differing byte means T1 changed a render, which it must not.

### T2 — the two invariants everywhere, and the constant derived

Copy `map-quake-density/bake.mjs:188-211` into every bake, with one change: replace
`Math.ceil(width * 0.5685)` with

```
minFrameHeightPx(width, south, north) = width * (mercY(north) - mercY(south)) / (2π)
```

so the error message is correct for **any** latitude range, not only `[-60°, 78°]`. Measured above:
0.568145 against the typed 0.5685 — one pixel at the current width, so this lands without touching a
plate.

Both invariants travel together, always. The recorded measurement is the reason: *the world must fill
the frame's width* AND *the frame must reach the bounds that were asked for*, and **either alone can
be satisfied by a plate that lies** (`renderWorldCopies: false` satisfies the first while dropping
1,057 of 14,175 events).

**Copies: 18.** `twin-scrolly/scripts/bake-plate.mjs` carries `@parity-exempt: this bake fixes its
camera by centre and zoom, not by bounds; there is no asked-for extent to fall short of` — an
exemption written down, which is the point of the mechanism.

**Proof:** the assertion must fire. Temporarily narrow one beat's frame height below `minFrameHeightPx`
and confirm the thrown message names a height that actually fixes it — the exact failure the typed
constant would produce at any other latitude range.

### T5 — one label anchor, the one that is already right (closes B6.10)

Copy `clipToBBox` (`mapmore-flow-danube/geo-flow.ts:145-172`) and `pointOnFeature` (`:189`) — three
byte-identical copies, already shipped, no new idea — into `geo-choropleth.ts` (**3 copies**:
`mapgen-choropleth-video`, `mapgen-choropleth-web`, `twin-map-beat/assets/geo.ts`) and `geo-dot.ts`
(**3 copies**: `mapgen-dot-web`, `mapmore-dot-population`, `mapvid-dot-population`), tagged `@parity`.

Then:

- delete `anchors.label` from `mapgen-choropleth-video/bake.mjs:42-47` and
  `twin-map-beat/scripts/bake-plate.mjs:45`; the anchor is computed from the subject's own clipped
  rings at bake time.
- `textAnchor="end"` → `"middle"` at `ChoroplethStill.tsx:241,252,335` and
  `ChoroplethVideo.tsx:389,400,511,521`. **The end-anchor is half of B6.10**: with a derived interior
  anchor there is nothing left to compensate for by eye.
- `mapgen-dot-web/geo-dot.ts:303`'s `shapeAnchor` (a singleton — the only copy in the tree) is replaced
  by `pointOnFeature`, keeping the existing snap-to-nearest-real-dot step after it.

**Why this closes B6.10 by construction and not by tuning:** the current anchor is a country centroid
plus half a measured string, expressed in degrees. It is wrong the moment the camera, the frame width,
the country name, the typeface (W7) or the plate size changes. `pointOnFeature` over the **clipped**
ring is the point deepest inside the visible part of the shape, and it follows the camera because it
is derived from it.

**Proof:** re-render the choropleth still and video and **look at the Poland label** at each of the
three export sizes T12 introduces. Then re-render with a deliberately different camera (shift
`BEAT.bounds` 6° east so Poland sits near the frame edge) and confirm the label follows into the
visible part of the shape rather than off it.

### T6 — the two numbers that produce B6.17 and B6.18a

- **`maxRadiusPx` from the plate's own nearest-neighbour distance**, not from the frame width. With
  `degreesPerPixel` recorded by T1, the nearest-neighbour distance between projected points is a
  measurement, not a guess. The existing constants stay as the **ceiling**, so nothing gets bigger than
  it is today; overlap at a tight camera is what shrinks. Copies: `map-quake-symbol/QuakeSymbolStill.tsx:25`,
  `QuakeSymbolVideo.tsx:39`, `map-quake-symbol/render.mjs:64`, plus the geometry in three
  `geo-symbol.ts` copies.
- **`hitDiameter = max(28, 2 × drawnRadius)`** — the fixed 28 px becomes a **floor**, never the value.
  `MapWebSeed.tsx:83-86`'s reasoning for a fixed touch target survives intact (a frame-unit target
  shrinks to a few physical pixels at 375 px); only the "never larger" reading of it goes. Note the
  knob is currently a lie: `HIT_TARGET_PX` at `MapWebSeed.tsx:87` is documentation only — the real
  28 px lives at `render-web.mjs:384-385`. The derived value must land where the pixel actually is.

**The web half of both lands in T13**, where a mark is a MapLibre layer and its hit area is the
rendered mark.

**Proof:** re-render the symbol still at a camera where the study points are 20 px apart and at one
where they are 200 px apart, and look at both. B6.17 is "it becomes unreadable fast" — the check is
the picture, not the number. `declutterLabels` dropping labels (`geo-symbol.ts:216-246`) was the old
answer to overlap; if it still drops as many after this, the radius derivation is not doing its job.

### T7 — one reserve rule, closing `geo-discipline.md`'s own open problem

`geo-discipline.md:218-230` leaves a problem open by name: a proportional-symbol legend box sized from
the widest circle diameter alone clips a word-length unit ("8 magnitud…"), and the file itself says
this is *"the same failure class as a fixed label gutter (a reserved space sized against one dimension
of the content while another dimension of the same content grows past it)"*.

It is the same class as the flip margin, measured: `margin = 170` in the three `geo-locator.ts` copies
(`:118`, `:133`, `:118`), `130` in the two `geo-symbol.ts` proof copies (`:191`, `:187`), `90` in
`twin-map-web/assets/geo-symbol.ts:73`. Six values, none derived, for "how near the edge before I
flip" — while `measureText` exists and is already parity-guarded.

**So it is one piece of work, not two.** The reserve — legend box or label gutter — is measured
against **both** dimensions of the content it reserves for: the widest reference circle **and** the
longest label-plus-unit string, via `measureText`. This is exactly the move rule 7a made for colour:
replace *"reads as different at a glance"* with a number derived from the plate itself, carrying no
free parameter (`geo-discipline.md:110-119`).

Two further defects fall out of doing it once:

- `labelSide` (`geo-locator.ts:115-121`) tests **only the right edge** — `return px > frameWidth -
  margin ? "left" : "right"`. A marker near the left edge gets a right-hand label that is correct by
  luck, and a marker in a frame where labels can legitimately flip left has no path back to "flip
  right". It is a one-edge check wearing a two-sided name. Fix both edges while the measurement is
  being written.
- `map-geneva-locator/BRIEF.md:97-101` records a rejected fix: letting a dropped label try one line up
  or down recovered a sixth label but pushed *"United Nations Office at Geneva"* far enough from its
  marker to read as naming a different one. **At a wider camera the same nudge is harmless.** So the
  acceptable displacement is a fraction of **marker spacing on this plate**, which T1's
  `degreesPerPixel` finally makes measurable.

**Copies:** 3 `geo-symbol.ts`, 3 `geo-locator.ts`, 1 web seed. **Proof:** the locator still, re-rendered
— count the labels that survive, and read them: a sixth label is only a win if it still names its own
marker.

### T8 — dot density bounded at both ends

`fillTightness` (`geo-dot.ts:257-271`) already returns dots per 1,000 drawn pixels and is used only
for alt text. Make it a **constraint with a stated ceiling and floor**, evaluated at bake time against
the recorded `degreesPerPixel`: no region may exceed N dots per 1,000 px² (a solid slab is not a
density), and the study set as a whole may not fall below a floor (four dots in a country is not a
map). Both numbers derived from the drawn dot radius, not typed: a field is saturated when the drawn
dot area exceeds the available area, which is arithmetic.

And the honest part, which is not a rendering choice: `geo-dot.ts:250-254` says in its own words that
*"Mercator inflates area with latitude, so this ranking is not identical to a people-per-km² one — it
is the ranking of the thing actually drawn."* At continent extent that is a footnote. At planet extent
it is a loud false statement. **At wide extents the bake refuses, or the dots carry a latitude
correction — and whichever is chosen is written in the beat's caveat**, because
`geo-discipline.md`'s converse rule (`:148-150`) applies: a reader must not be left to infer whether a
sparse region holds few people or was drawn small by the projection.

**Copies: 3.** **Proof:** produce the same dot beat at country extent and at planet extent and look at
both. The country render is the one that would have been a slab.

### T9 — hex pole clip and seam derived

The pole clip is a hand-picked latitude range recorded in prose (`map-quake-density/BRIEF.md:63-65`);
derive it from the data's own latitude distribution against a stated distortion budget. `normaliseLon`
(2 of 19 today) goes into all bakes with a wrapping camera, and the seam longitude is derived from
where the data's own densest cluster sits rather than typed.

**The measurable consequence, which is the proof:** `mapgen-hexgrid-web` currently reports 1,374
events in the Fiji–Tonga cell where its siblings report 1,724, with a rival cell three behind
(`map-quake-density/BRIEF.md:66-71`). After T9, re-bake and re-render `mapgen-hexgrid-web` and read
the number off the delivered page. **1,724, or T9 did not land.** Delete the false "SAME camera"
comment at `mapgen-hexgrid-web/bake-plate.mjs:30-39` in the same commit that makes it true.

### T10 — the locator camera validated against the subject, not against a box

`mapvid-locator-geneva/bake.mjs:238-243` is the only bake that asserts the camera holds the subject's
own footprint (the search ring) rather than a typed bounds box, and it tells you what to widen. Copy
it into the other two locator bakes and generalise the shape: the assertion takes the marker set's own
footprint plus the subject's declared catchment.

Add the ceiling `separateOverlappingMarkers` has never had: `minSeparation` is passed in pixels and is
extent-correct as written, but it changes the map's meaning — two organisations 13 m apart are drawn
apart. **Express the ceiling in ground units** (available from T1's `metresPerPixel`): at a wider
camera the same pixel nudge means "two cities apart", and nothing checks today.

**Copies: 3 bakes, 3 cores.**

### T11 — the two rungs, produced (this is a task, not an assumption)

Two new beats, each a **real beat** — `BRIEF.md`, a claim, frozen data — because
`claims-grounded-in-data.test.ts:622,643,743` will refuse anything less and because a camera proof with
no argument is not what this tree ships.

- **One country**, roughly 4–12° of longitude. Cheapest honest subject: **Switzerland**, whose data is
  already frozen in this tree (`proof/co2-suisse`, `proof/static-swiss-age-pyramid`). Cantonal geometry
  is the new freeze.
- **One region**, roughly 0.5–3°. Cheapest honest subject: **the Lake Geneva region**, adjacent to
  `mapvid-locator-geneva`'s already-frozen Geneva data at 0.135°.

Each is baked at **all three export sizes** (T12), and each must pass T2's invariants and T12's aspect
gate without any of them being relaxed to accommodate it. **If a gate has to be loosened to let a rung
through, the gate is wrong and the loosening is the finding** — that is what the rung is for.

**Proof:** six plates, six stills, opened and looked at, plus the `geometry.json` figures added to the
survey's zoom table so the 175× hole is closed with measurements rather than with a claim.

### T12 — the target aspect enters the camera (R2)

The mechanism, in the order it runs:

1. The export size fixes the frame — three fixed sizes for static and video, named by
   `specs/W4-export-sizes.md` (which states in its own §1 that the map half is not its own). This spec
   takes `{width, height}` as an input and does not choose the numbers; it must read them from W4's
   table rather than restating them, so the same three sizes are declared once for charts and maps
   alike, which is what R2 asks for.
2. The beat's furniture takes the height its own measured text needs. `HexGridStill.tsx:76`'s
   `stillFrameHeight({ plateHeight, caveat })` already does exactly this, including the number of
   wrapped caveat lines — the precedent exists inside the map family.
3. What is left is the **stage**. `stageAspect = stageWidth / stageHeight`.
4. The bake is called with `--width` / `--height` = the stage box. **Five of nineteen bakes already
   take `--width`/`--height`** (`map-quake-density`, `mapvid-hexgrid-quakes`, `mapgen-hexgrid-web`,
   `twin-scrolly`, and `mapgen-dot-web`/`mapmore-*`/`mapvid-dot-population` via `--size WxH`); the
   remaining fourteen take a square `--size N`. **This is a generalisation of a shape the tree already
   has, not a new one.**
5. `fitBounds(studyBounds, { padding: 0 })` at that stage box; T2's two invariants assert the result.
6. `geometry.json` records the consequence: `admittedLonRatio` / `admittedLatRatio` — how much extra
   geography this aspect admitted over the study set's own extent. **A number the beat records rather
   than a fact `fitBounds` absorbs silently.**

**The gate, with no free parameter**, in rule 7a's spirit — three assertions, each derived:

- every study feature is inside the frame with a margin of at least its own measured label height
  (`measureText`);
- the subject's drawn extent is at least as wide as its own measured label, or it carries an external
  label with a leader (T7's machinery, reused);
- both camera invariants hold.

If any fails, **the bake refuses that size for that beat, loudly, naming the measured numbers and the
two honest options**: recompose the study set, or drop this size for this beat. Stretching is not among
them — `map-web-discipline.md:88-92` rules a non-uniform scale out in writing, and this spec does not
reopen it: *"this genre would rather draw a smaller true map than a larger false one."*

The editorial consequence, stated plainly because it is a real cost and not a bug: a 2.24:1 Danube
corridor in a 4:5 portrait frame can only be widened (adding geography the story did not ask for) or
drawn smaller with the leftover room going to furniture. **The second is the default** — rule 12's
existing "text beside a square plate" clause, now applied in both directions.

**Copies:** 14 bakes converted from `--size N` to `--width`/`--height`; 7 map video `Root.tsx`
compositions (`mapgen-choropleth-video/Root.tsx:52-53`, `map-quake-symbol/Root.tsx:31-32`,
`mapvid-hexgrid-quakes/Root.tsx:50-51`, `mapgen-flowmap-video/Root.tsx:38-39`,
`mapvid-locator-geneva/Root.tsx:54-55`, `mapvid-dot-population/Root.tsx:47-48`,
`twin-map-beat/assets/Root.tsx:51-52`) — where the export-sizes survey also records that the
`<Composition>` dimensions and the component's own `FRAME` are declared twice with **no guard between
them** (`survey/export-sizes.md:12-16`). That guard belongs to W4; this spec's map half must not
introduce a third place to state the same number.

---

## 6. W6 — live MapTiler, and the fallback that keeps every existing guarantee

### 6.1 The architecture

R1 is binding: *a web map you cannot move through is a picture*. The straightforward reading — delete
the plate, ship a live map — throws away four things the genre already proved, all of them measurable:
a complete no-JS render, a page that works offline, a page that works when the key lapses, and a guard
suite that does not need the network to drive it (`interaction-promises-are-kept.test.ts:273` drives
**every** delivered `.html` under `proof/` in a real browser, `canon.test.ts:55` runs
`verify-interaction.mjs` inside `bun test`).

**None of that is required by the ruling, and all of it is cheap to keep.** The delivered page ships
in two layers:

1. **`#mw-fallback`** — the SSR'd beat exactly as it renders today: the baked plate as a `data:` URI,
   the marks, the labels, the legend, the region table. Complete, script-free, request-free.
2. **`#mw-map`** — an empty box, plus inlined `maplibre-gl` (JS + CSS) and a boot script that
   constructs a live MapTiler map, adds the marks, and **only on `map.on("load")`** hides layer 1 and
   shows layer 2. A style or tile failure leaves layer 1 in place.

So: reader with a browser and a network gets a map they can move through — R1, honoured. Reader with
JavaScript off, or offline, or after the key is rotated, gets today's beat — every existing guarantee,
kept. The genre's stated rule survives verbatim (`map-web-discipline.md:386-388`): *"the unzoomed
state is not a preview of the real view — it IS the full claim"*, now read as the fallback state.

### 6.2 What the live map is made of

- **Ground**: `https://api.maptiler.com/maps/${style}/style.json?key=…`, the same style the bake
  already uses at `twin-map-web/scripts/bake-plate.mjs:149` — so the live ground and the fallback plate
  are the same cartography, including rule 7's water override, which must be re-applied to the live
  style on `style.load` exactly as the bake applies it at `:175-176`. **If the live map and its own
  fallback disagree about the colour of water, the swap is visible and the beat is broken.**
- **Marks as MapLibre layers**, from GeoJSON in the file — circle layers for symbol and dot, fill
  layers for choropleth, line for flow. `geo-discipline.md` rule 4 is **not** violated by this: it
  forbids handing **labels** to the map's symbol layer, and its reason is typography — *"the provider's
  font, the provider's halo and the provider's collision rules"*. A circle has no font. Labels stay
  HTML overlays positioned by `map.project()`, exactly as rule 4 requires, now repositioned on
  `map.on("move")` instead of being fixed percentages.
- **The layer spec is a pure function in the geo core** (`markLayers(geometry, palette)`), tagged
  `@parity` — so the new draw path is under T4's walk from the day it lands, and the SVG path and the
  layer path consume the same `radiusOf`. Two draw paths for one geometry is the new duplication
  family this ruling creates; naming it and guarding it now is cheaper than discovering it in a month.
- **Hover**: `map.on("mousemove", { layers: [marks] })` + `queryRenderedFeatures`. **This closes B6.18a
  and B6.14a by construction** — the hit area *is* the rendered mark, at every size and every zoom, so
  there is no fixed 28 px button under a 90 px disc and no country whose hover only fires over its
  capital. The per-point `<button>` overlay stays for keyboard reach and for `aria-label`, repositioned
  on move.
- **Controls**: MapLibre's own `NavigationControl`. **B6.14b's out-of-map "Zoom in (2.2×, bounded) —
  then scroll or use the arrow keys to pan" button and both `ZOOM_SCALE` constants
  (`MapWebSeed.tsx:91` = 1.4, `DotDensityWeb.tsx:53` = 2.2) are deleted.**

### 6.3 "Constrained to the subject's area" — where the constraint comes from

Directly from T1's recorded facts, which is the second reason T1 is first:

- `maxBounds` = `frameCorners`, padded by the beat's own furniture margin.
- `minZoom` = `geometry.zoom` — a reader cannot zoom out past the camera the beat chose, so the claim
  the title makes is always fully on screen.
- `maxZoom` — **derived per type, and this is where the types differ most**:
  - **locator**: the zoom at which marker separation exceeds marker diameter, from
    `separateOverlappingMarkers`' own `minSeparation`. Street level, naturally.
  - **proportional symbol / choropleth**: marks keep their pixel size (a circle encodes a value, not a
    ground area), so the bound is where the study set stops filling the frame.
  - **hex grid**: bins are emitted as **geographic** polygons, so they reproject correctly and a cell
    keeps its ground area. The bound is where too few cells remain visible for the field to read as a
    field — derived from `chooseHexSize`'s own `targetCells`.
  - **dot density**: see §8 — the hardest, because the type is scale-locked by construction.

### 6.4 B5.1, and the three beats still on the old API

`map-web-discipline.md:51-100` ("Fit the window") already specifies what B5.1 asks for and records the
defect it closes (a 2,275 px page at 1600×900, the claim 800 px below the fold). It reached
`mapgen-dot-web` and `mapgen-symbol-web` and not the other three. **Retrofitting
`mapgen-choropleth-web`, `mapgen-hexgrid-web` and `mapgen-locator-web` off the two-rung `layouts` API
is the cheapest visible win in this whole spec, and it is not camera work.**

With live tiles the conflict the survey flagged dissolves: B5.1 says the map takes the full available
width; `map-web-discipline.md:88-92` refused that when the plate's aspect did not match the window's,
because scaling a raster non-uniformly is a lie. **A live map has no plate aspect to preserve** — the
canvas is the container and the camera fills it. The fallback layer keeps `aspect-ratio` for its
plate, unchanged.

`render-web.test.ts:487-494` asserts the literal strings `container-type: size`,
`width: min(100cqw, calc(100cqh * 1))` and `height: calc(100svh - var(--page-pad) * 2)`. Those
assertions move to the fallback layer and gain a sibling for the live layer. **Expected red, named in
advance.**

---

## 7. What live tiles cost beyond the key

Every figure below is measured, not estimated.

### 7.1 Payload

`maplibre-gl@4.7.1` (the version the bakes already load from unpkg at
`map-quake-density/bake.mjs:60-61`): **803 KB of JS** (211 KB gzipped) and **65.5 KB of CSS**, inlined.
Today's committed pages run 186 KB (`quake-symbol.html`) to 642 KB (`dot-population.html`), almost all
of it the plate. Keeping the fallback plate **and** adding the library roughly doubles the file.

Two reductions, both real: bake the fallback at the **static** beat's size rather than
`PLATE_SIZE = 1000` (it is no longer the interactive surface — this is what `map-web-discipline.md`'s
"The plate strategy" becomes), and note that a CDN `<script src>` would trade payload for a **second**
third-party host. Inlining keeps the count at one external host, `api.maptiler.com`, which is the
honest reading of R1.

### 7.2 The archive stops being frozen

`mapgen-choropleth-video/bake.mjs:13-16` states the reason the plate is committed beside the beat:
*"MapTiler restyles, so a re-bake months later is a different picture under the same marks."* A live
map has no frozen ground. **A published article's map can change appearance years after publication,
without anybody touching the file** — and the same beat's static and video genres, which keep their
plate, will drift away from their own web sibling. This is not recoverable by engineering; it is a
property of the ruling, and it belongs in the discipline file's rewrite where an editor will meet it.

### 7.3 The key must not enter git

Verified for this spec: `twin/.env` is git-ignored (`.gitignore:1`), untracked, and **no tracked file
contains the key today**. But every map × web beat commits its rendered HTML
(`mapgen-*/render-web.mjs` default their output to the beat directory, and
`beat-genre-produces-artifact.test.ts:67` requires the artifact to exist), so a naive implementation
writes a live key into sixteen-plus committed files and, at MIT release, into a public repository
forever.

R1 accepted the key being visible to a reader of a published article. **It did not accept an unbounded
public leak, and the two are different exposures.** So:

- the committed proof artifact carries a documented placeholder token;
- `twin-deliver`'s `owned-file` / `embed` / `cms-insertion` forms substitute the real key at delivery
  (`deliver.mjs:37-62` is where the web genre's forms live);
- **a new guard** asserts that no tracked file under `twin/` contains the value of `twin/.env`'s
  `MAPTILER_KEY`. Mutation: write the key into a scratch file inside a copy of the tree and confirm the
  guard names that file.

MapTiler's own documentation supports this shape: an API key is *"a simple and easy-to-use
authentication for client-side use"* and access through it is read-only, with the documented
mitigation being **Allowed HTTP origins** — a per-key domain restriction, enforced server-side, that
must be set on a **newly created** key because the default key cannot be restricted
(<https://docs.maptiler.com/cloud/api/authentication-key/>). **So the delivered key should be a
second, origin-restricted key, not the one in `twin/.env`** — one line of operational advice that
turns "the key is visible" from a liability into MapTiler's intended usage.

The failure mode when it does go wrong is also documented: at 100% of a spending limit *"all your API
keys are temporarily invalidated"*
(<https://docs.maptiler.com/guides/maps-apis/maps-platform/how-to-control-expenses-in-your-user-account/>).
Tiles stop; the map goes blank. **§6.1's fallback layer is what stands between that and an article with
a hole in it** — which is the strongest argument for keeping it, independent of accessibility.

### 7.4 The guard suite meets the network

`interaction-promises-are-kept.test.ts:273` drives every delivered `.html` under `proof/` in a real
browser; `canon.test.ts:55` runs `verify-interaction.mjs` inside `bun test`; the suite already takes
~126 s (`AUDIT-VERIFY2-2026-08-09.md:24-25`) and **no CI runs it** — `.github/workflows/ci.yml` covers
only the root `skills/` tree. Two consequences:

- With a live map, `document.elementFromPoint` at a mark's centre returns the **WebGL canvas**, not a
  `.pt` button. `verify-interaction.mjs:82`'s `probePoint` and the `elementFromPoint` assertions go
  **blind** — they would pass in a world where nothing works. They must be rewritten against
  `queryRenderedFeatures` and driven with real `page.mouse.move`, and the rewrite ships with the same
  four-mutation proof the original earned (`verify-interaction.mjs:1-32`).
- The offline path must stay testable. Because the fallback layer is complete and script-free, **every
  existing assertion can run against it with the network unavailable**, and the live-map assertions gate
  on the key exactly as `keys.test.ts:216-219` already gates its own live probe. That is the reason the
  fallback is not merely a courtesy.

### 7.5 Two smaller costs, named

- **CSP and privacy.** Reader IP addresses reach MapTiler on every article view, and a newsroom CMS with
  a strict `Content-Security-Policy` may block `api.maptiler.com` outright. The fallback layer is what
  that newsroom sees.
- **`twin-scrolly` is not affected and must not be.** `twin-scrolly/SKILL.md:45` states the map track
  shows one baked plate because *"a scroll-driven `flyTo` would mean…"* — rule 2 (a moving camera needs
  a fixed plate) is untouched by R1, which is about a **reader-driven** camera. The assertion at
  `twin-scrolly/test/seed-tracks.test.ts:380-381` (`expect(html).not.toContain("api.maptiler.com")`)
  **stays green**, and its map × web mirror is inverted: the map-web page must contain the style URL
  **and** the fallback's `data:image/png;base64,` — one assertion proving the reversal landed, one
  proving the fallback did not get dropped on the way.

---

## 8. Which types fight hardest

In order, with the reason each is a fight and not a chore:

1. **Dot density.** Its semantics are scale-locked by construction. Zoom into a live dot map and the
   dots spread while each keeps its value, so a reader watching the field thin out reads a change that
   did not happen. The honest answer is that a dot's **ground area** must be constant, i.e. its radius
   interpolates exponentially with zoom (base 2) rather than staying a fixed pixel size — the opposite
   of the rule proportional symbol needs. On top of that sit T8's two unbounded ends and a Mercator
   area distortion the code acknowledges in a comment (`geo-dot.ts:250-254`) and corrects nowhere. This
   is the one type where R1 collides with the type's own meaning, and the resolution may be a
   deliberately narrow zoom range plus a caveat rather than free navigation.
2. **Proportional symbol.** Four copies, four values, zero derivation, and **both** of the owner's
   per-beat complaints (B6.17, B6.18) fall out of the same missing measurement. The work is tractable
   but it is spread across static, video and web with three different draw paths after T13.
3. **Locator.** The type most tied to one extent by construction, holding the worst label machinery
   (one candidate position, drop on collision) and the best camera check
   (`mapvid-locator-geneva/bake.mjs:238-243`) at the same time. Its labels degrade worst as the camera
   moves, and B4.1's region rung lands right on top of it.

Closest to scale-general, and expected to be cheap: **hex grid** (cell size already derived and
verified against the real bin count), **choropleth** (everything derived once T5 lands), **flow/route**
(the best anchor machinery in the tree; its gap is a missing genre, which is W8's).

---

## 9. What this spec does NOT close

- **B5.2** (no rendered table, or an accordion) is W3's. This spec must not decide it, but it moves the
  ground under it and says so: with live tiles the map channel becomes **more** spatial and no more
  accessible, and §7.3's quota-invalidation failure mode makes the table the only channel that always
  renders. That strengthens the case for keeping it; the decision stays with whoever owns B5.2.
- **B6.18b** (the highlighted symbol's label surviving a filter) is a rule collision W3's survey already
  diagnosed (`survey/web-genre-and-specifics.md:605-618`): the honest fix is editorial — a filter must
  not offer an option that excludes the subject — not a CSS one. T13 must not "fix" it by adding
  `.point-label` to the hide list.
- **B6.15** (flow/route × web) is W8's, and it needs W3's hoverable-line primitive.
- **B6.11 / B6.19** (the video not starting empty; symbol outlines arriving before their fills) are
  reveal-ordering in the Remotion components (`ChoroplethVideo.tsx:240-253`), not camera work.
- **B6.16** (a highlighted hexagon with nothing said about it) is furniture/editorial.
- **The three export sizes themselves** are W4's to name. This spec consumes them.
- **The typeface** (W7) changes every `measureText` result this spec depends on. T7's reserves are
  measured rather than typed precisely so that they survive it — but they must be **re-run and looked
  at** after W7 lands, not assumed.
- **Rule 11 and `normaliseLon` are still two answers to one problem** — rule 11 drops the
  antimeridian streak after projection, `normaliseLon` prevents it before. T9 makes the second
  universal; reconciling the two in one place is left open, deliberately, because doing it inside a
  camera chantier would mean rewriting the cull path for six types at once.
- **`shapeAnchor`'s snap-to-nearest-real-dot** survives T5 as a dot-only step. Whether a choropleth
  should have the same "the anchor must be on something the reader can see" property is a real question
  this spec does not answer.

---

## 10. The proof — what gets re-rendered, at what size, and what is looked at

Not "tests pass". Opened artifacts, in this order:

| After | Artifact | Opened at | What is looked at |
|---|---|---|---|
| T1 | all 19 plates | native | **byte-identical PNGs**. A single differing byte means T1 changed a render |
| T2 | one deliberately-too-short frame | — | the thrown message names a height that actually fixes it |
| T5 | choropleth still + video, and a 6°-shifted camera | 3 export sizes | the Poland label centred on the country, and still inside it when the country moves to the frame edge |
| T6 | symbol still, two cameras (points ~20 px and ~200 px apart) | 900 and 1600 | circles readable at both; `declutterLabels` dropping fewer labels than before |
| T7 | locator still | 900 | how many of the 11 labels survive, **and whether each still names its own marker** |
| T8 | dot beat at country and at planet extent | 3 export sizes | neither a slab nor four dots |
| T9 | `mapgen-hexgrid-web` re-baked | 1600, 375 | the Fiji–Tonga cell reads **1,724**, not 1,374 |
| T11 | 2 new beats × 3 sizes | all three | the two rungs exist, and no gate was loosened to let them through |
| T12 | one wide beat (Danube, 2.24:1) in portrait | portrait | either an honest refusal with numbers, or a smaller true map with the leftover room given to furniture |
| T13 | the web seed, live | 1600×900, 1024×768, 768×1024, 375×667 | pan and zoom inside the subject's area; hover firing **on entering** a mark; no out-of-map zoom button; the swap from fallback to live invisible (same water colour) |
| T13 | the same page, JavaScript **off** | 1600×900 | today's beat, complete |
| T13 | the same page, network **off** | 1600×900 | today's beat, complete — the quota-invalidation rehearsal |
| T14 | all five web beats | the four widths | the whole beat inside one window, nothing scrolling inside the visual |

And one check that belongs to no single task: after T13, `bun scripts/matrix.mjs --check` must still
pass. The matrix counts a cell proven only when the artifact exists on disk, and this chantier
re-renders most of the map half of it.

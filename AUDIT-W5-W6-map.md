# Audit — W5/W6, the map camera and live MapTiler tiles

Read-only audit of `specs/W5-W6-map-camera-and-live-tiles.md` against the tree on
`experiment/doctrine-twin`. Nothing in the product was changed. Every mutation below was run in a
copy outside the tree; the copy's path is named where it matters. Where evidence was ambiguous the
weaker claim is recorded.

**Method note, stated because it decides how to read the rest:** no commit message, doc sentence or
agent summary is treated as evidence here. Every claim is a file:line, a commit hash, a number read
off a rendered artifact, or a mutation that was watched.

---

## 0. The short version

Four of fifteen tasks landed. **T1, T2, T3 and T4 landed well** — the bakes record what their camera
knows, both invariants reach every bake with a derivation that beats the constant it replaced, and
two walking guards were built that genuinely redden. **T5–T12 did not land**, except T6's hit-target
half and T11 as a survey table instead of the two beats it specified. **T13 landed in the skill seed
only. T14 is zero of five.** T15 landed for one of the three documents it owed.

The single most consequential finding is not a missing task. It is that **the whole of W6 can be
deleted from the rendered page and nothing in the suite goes red** — measured, §5.6 — and that
**W6 has no committed rendered artifact anywhere in the repository**: its only live page is
`/tmp/mw-live/population.html`, untracked, outside the tree, written by hand on 10 August at 01:27.

---

## 1. Was the spec followed?

### 1.1 Per-task verdict

| # | Task | Verdict | Commit |
|---|---|---|---|
| T1 | the bake records what it knows | **landed** | `eef5c4f3` |
| T2 | two invariants everywhere, `0.5685` derived | **landed** | `51730c1e` |
| T3 | `bake-parity` walk + `resolveChrome` unified | **landed** | `51730c1e` |
| T4 | `geo-parity` walk + the fourteen decisions | **landed, 10 of 14 decided** | `dcc71f79` |
| T5 | one label anchor (B6.10) | **did not land** | — |
| T6 | symbol radius + hit target derived | **half — hit target only** | `20665b2c` |
| T7 | one reserve rule, both dimensions | **did not land** (deferred in-tree) | — |
| T8 | dot density bounded at both ends | **did not land** | — |
| T9 | hex pole clip and seam derived | **did not land** | — |
| T10 | locator camera vs the subject's footprint | **did not land** | — |
| T11 | the two missing rungs, produced | **a survey table, not two beats** | `5d6d4b61` |
| T12 | the target aspect enters the camera | **did not land** | — |
| T13 | live MapTiler in the web seed | **landed in the seed only** | `68b9bcf5` |
| T14 | the five web beats retrofitted | **zero of five** | — |
| T15 | the two doctrine rewrites | **one of three documents** | `68b9bcf5` |

### 1.2 What landed, and where it is better than the spec asked

- **T1 reached 20 bakes, not 19.** `proof/mapscrolly-one-map-europe-carbon/bake.mjs` was added
  afterwards by `6d8356c3` and was born carrying all four keys — the walk caught it, which is the
  walk working. All 20 tracked `geometry.json` carry `frameCorners`, `worldWidthPx`,
  `degreesPerPixel`, `metresPerPixel` with real values (`proof/mapvid-locator-geneva/plate/geometry.json`
  → `metresPerPixel: 20.0713` at zoom 11.398).
- **T2's derivation is not cosmetic.** Extracted from `skills/map-beat/scripts/bake-plate.mjs:152`
  and run outside the tree: `minFrameHeightPx(900, 35, 66) = 129 px` where the constant it replaced
  said `Math.ceil(900 × 0.5685) = 512`. For the choropleth's own European band the old message
  demanded four times the height that actually fixes the frame. `0.5685` survives in the tree only as
  prose and as one deliberate test comparison (`skills/splash/test/bake-parity.test.ts:161`).
- **T3's anti-vacuity pin is stronger than the spec's**, adding `cameraFacts` and
  `assertWorldFillsFrame` to the seven names (`bake-parity.test.ts:112-122`).
- **T4 resolved `sequentialRamp` a third way** the spec did not offer: `from`/`to` became arguments,
  one tagged body in 8 copies, each call site keeping its own numbers, so no render moved
  (`proof/map-quake-density/render.mjs:130` still `0.14, 0.82`; `proof/mapgen-choropleth-video/render.mjs:158`
  still `0.1, 0.78`). Better than either option the spec named.
- **`geo-parity` gained a third assertion the spec did not ask for**: an exemption reason under 12
  characters is rejected (`geo-parity.test.ts:246-251`). Verified red — §5.3.

### 1.3 Divergences and drift, named

**Regressions / unnoticed drift**

1. **`livePlan`'s three camera fields are dead.** `skills/map-web/scripts/render-web.mjs:151-153`
   writes `maxBounds`, `minZoom`, `maxZoom` into every live page. `grep "plan.maxBounds\|plan.minZoom\|plan.maxZoom"`
   returns nothing: `assets/live-map.mjs` recomputes all three at runtime in `leash()` (`:229-241`).
   Proved by mutation: replacing `maxBounds: corners` with a deliberately cropping box changed
   nothing at all (§5.5).
2. **The same arithmetic exists twice, and the tested copy is the dead one.**
   `maxZoomForStudySet` (`assets/geo-symbol.ts:206`) is `@parity`-tagged and under T4's walk; it is
   called only at `render-web.mjs:153`, i.e. into the dead field. The number that runs is re-derived
   inline at `live-map.mjs:235`, untagged, unrounded, under no walk.
3. **`§6.3`'s per-type `maxZoom` is one formula, not four.** Only the proportional-symbol derivation
   exists (`geo-symbol.ts:196-208`). Locator, hex and dot have none; `live-map.mjs:96-101` says dot is
   not shipped live for that reason. The spec's four-way table is one type implemented, three unwritten.
4. **`map-web-discipline.md:419-423` states the dead fields as fact** — "`minZoom` is the bake's zoom
   … `maxBounds` is `frameCorners` … `maxZoom` is derived per type in the geometry core". All three
   are false of the running code. `:529-533` quotes the dead field's 4.419-vs-3.879 as the measured
   leash.
5. **`68b9bcf5`'s commit message is wrong about its own scope.** It claims both `ZOOM_SCALE`
   constants were deleted (B6.14b). Its `--stat` touches nothing under `proof/`.
   `proof/mapgen-dot-web/DotDensityWeb.tsx:53` still exports `ZOOM_SCALE = 2.2` and `:142` still
   renders the button. Confirmed on the delivered artifact in a browser: `dot-population.html`
   contains "Zoom in" (§4.3).
6. **`simplifyRing` and `labOf` were never decided**, contrary to `dcc71f79`'s "each is now a
   decision". `simplifyRing`: 7 typed copies, 2 bodies, zero tags — the two bodies differ only by
   `const kept: PixelRing` vs `const kept: Ring`, a difference the guard's own header claims is
   erased but which the eraser (`geo-parity.test.ts:93-119`) only reaches in *parameters*.
   `labOf`: 4 copies, 2 bodies, no tag and no exemption, while its caller `deltaE76` is `@parity` in
   all four — a guarded function with an unguarded dependency.
7. **`binIndex` was split out of the guard rather than into it.** `binIndexUpperInclusive` (4 hex
   copies, e.g. `proof/map-quake-density/geo-hex.ts:227`) carries neither tag nor exemption and has
   no docblock at all; the reasoning for `>` versus `>=` lives only in a commit message.
8. **`niceReferenceValues` was renamed, not reconciled toward the seed.** The seed's copy is now a
   singleton at `skills/map-web/assets/geo-symbol.ts:39` with no tag; the beats' variant became
   `halfMagnitudeReferenceValues` whose own docblock says it is "NOT what this beat's legend uses any
   more" — dead code kept alive.
9. **The three untyped `simplifyRing`/`keepRing` transcriptions survive in the dot bakes**
   (`proof/mapgen-dot-web/bake.mjs:293,304` and the two siblings), which §4.2 instructed be moved into
   `geo-dot.ts`. They sit in the exact blind spot of both walks: the name is absent from the bake
   canonical, and the file is not a `geo-*.ts`.

**Improvements not asked for** — see §3.

### 1.4 `map-web-discipline.md` — was R1's reversal recorded, or the old argument quietly deleted?

**Recorded, and close to honestly.** `skills/map-web/references/map-web-discipline.md:357` is
retitled "— OVERTURNED 2026-08-10 by ruling R1"; `:362-382` keeps the overturned position as a
blockquote headed "The position that was overturned, kept verbatim"; `:384-394` carries the ruling
verbatim in the owner's own French; `:510-533` is the price list (payload, frozen archive, IP/CSP,
quota, the short leash) and `:535-548` the key discipline. This is the shape R1 demanded and it is
the best-executed doc work in the chantier.

**Two qualifications, both real:**

- "Verbatim" is qualified. `git show 68b9bcf5 -- .../map-web-discipline.md` shows the 20-line
  section reduced to ~13, with two elisions marked `…` at `:380-382`. The *argument* — both options
  and the reason live tiles were rejected — survives word for word. The implementation tail
  (the `zoomable` prop, native scroll, `tabIndex`) does not.
- **"The plate strategy" (`:102-135`) survived but was not reframed**, which §2.2 required. It still
  reads end to end as a *resolution* argument: `:124-126` "the widest tested viewport (1600px) draws
  the plate at ~1568 CSS px", `:132-135` "if a future beat needs to look crisp at containers wider
  than 1600px, the fix is raising `PLATE_SIZE`". Not one word says the plate is now the fallback or
  that `PLATE_SIZE` became a payload argument. §7.1's proposed reduction was not taken either —
  `render-web.mjs:88` is still `PLATE_SIZE = 1000`.

**Stale prose describing the deleted mechanism, in the same file**: `:553` "every non-zoomable beat",
`:570` "`zoomable` stays `false` … (`render-web.mjs`'s `SEED.zoomable`)" — `SEED` has no such key —
`:572` "a fixture with `zoomable: true`", which no longer exists, `:592`, `:601` "the zoom checkbox
when present".

**`map-web/SKILL.md`**: `:48-57` is a properly reversed bullet quoting the old "zero external
request" claim and stating that the file now requests `api.maptiler.com`. But **`:21` still says the
component "draws an `<image>` and some `<circle>`s, never a live map"** — the exact line the spec
named at §2.2, unrewritten and now false. `:97`, `:224` still tell a verifier to Tab to "the zoom
checkbox"; `:318` still claims the unit suite covers "checkbox present/absent matching `zoomable`".

**`geo-discipline.md` rule 12's second clause was not added.**
`skills/doctrine/references/geo-discipline.md:204-215` is byte-unchanged; the last commits
touching the file predate W5. The words "the geography, the study set, and the target aspect" appear
nowhere in it.

---

## 2. What the spec promises that is NOT in the tree — R1b, clause by clause

R1b has four clauses. **Two exist, one is advice rather than a mechanism, one has no instance.**

| Clause | State |
|---|---|
| committed artifacts carry a PLACEHOLDER | **mechanism yes, instance no** |
| `deliver` substitutes the real key at delivery | **yes** |
| a guard asserts no tracked file holds a real key | **yes, and it reddens — with three holes** |
| the delivered key is a SECOND, domain-restricted key | **advice in a comment, not enforced** |

**Clause 1 — placeholder.** `KEY_PLACEHOLDER = "__MAPTILER_KEY__"` at
`skills/map-web/scripts/render-web.mjs:121`, written into the style URL at `:141`. But **no
tracked file in the repository contains it**, because no live page is committed:
`grep -rl "api.maptiler.com" --include="*.html"` over `proof/` and `skills/` returns nothing, and
`skills/map-web/output-proof/` holds one file, `preview.png` — a picture of the *fallback*
(square plate, no MapLibre controls; opened and looked at). The placeholder is correct and
unexercised.

**Clause 2 — delivery substitution.** Real: `skills/deliver/scripts/deliver.mjs:216-222`
(`substituteKeys`), applied to every `.html` copied by `copyTree` (`:183`).

**Clause 3 — the guard.** `skills/splash/test/no-key-in-the-repository.test.ts`. It reads the
key out of `twin/.env`, scans `git ls-files` output, and its header names its own limits. Mutated in
a copy at `<scratch>/mut` (§5.2): **it goes red on a tracked file carrying the key and stays green
when the same file is untracked** — the distinction it exists to make. It also confirms `.env` is
untracked, which is true here (root `.gitignore:1` is `.env`; `git ls-files twin/.env` is empty).

**Verifying the concurrent agent's report:** yes — `twin/.env` exists, is git-ignored and untracked,
and holds a real `MAPTILER_KEY` that the bakes and the live probe use. That is exactly what the guard
is built around and it is safe **as scanned**. But the guard does not cover what it can be read as
covering. Three holes, each watched:

- **a tracked `.html` over 8 MB carrying the key passes** — `:79` skips anything over 8 000 000
  bytes. Written a 9 MB tracked `.html` with the key in line 1: **3 pass, 0 fail.**
- **a tracked file with a binary-looking name passes** — `:78` skips by extension, not by content.
  Wrote the key into a tracked `leak.png`: **3 pass, 0 fail.**
- **a different key passes** — and this is the structural one. R1b's own fourth clause says the
  delivered key is a *second* key. The guard looks only for the value in `twin/.env`. So **the one
  key R1b intends to put into delivered files is precisely the key the guard cannot see.** Wrote a
  16-character non-`.env` key into a tracked file: **3 pass, 0 fail.** The header states the
  limitation; its interaction with clause 4 is not stated anywhere.
- (minor) the scan does `readFileSync` on every tracked path with no directory check, so a tracked
  symlink-to-directory or a submodule throws `EISDIR` at `:80` instead of reporting. Observed
  accidentally while setting up the copy.

**Clause 4 — the second, domain-restricted key.** Not a mechanism. `deliver.mjs:216-217` reads
`MAPTILER_DELIVERY_KEY || MAPTILER_KEY`; the ordering and the MapTiler *Allowed HTTP origins* advice
live in the docblock at `:192-215`. `twin/.env` holds only `MAPTILER_KEY`, so **as configured today a
delivery substitutes the unrestricted development key** and nothing refuses, warns, or records it.
The fallback of last resort — "with neither set, the placeholder travels through untouched" — is well
handled; the fallback of *first* resort is the development key.

---

## 3. What was built that the spec did not ask for

Most of it is good work. It is listed because it is unbudgeted surface and because two items replace
mechanisms the spec named.

1. **`scripts/verify-live-map.mjs`** (346 lines) — a real browser probe that drives a keyed temp copy
   at two container aspects, compares the drawn radius against an *independently derived* camera
   radius, counts marks on screen, walks a real `page.mouse.move` outward to the disc edge, and checks
   both halves of the filter with an anti-vacuity pin. The spec asked instead for
   `verify-interaction.mjs` to be rewritten against `queryRenderedFeatures`; this file argues that
   `queryRenderedFeatures` compares the same number twice and is **right** (its header `:13-18`
   records that its own first version was vacuous for exactly that reason). Genuinely non-vacuous —
   proved in §5.4. But see §5.6: it is skipped by default.
2. **Runtime camera-relative mark scaling** (`bb075f6a`): `cameraScale` / `applyMarkScale`
   (`live-map.mjs:105-110`), so a mark covers the ground it covered when baked whatever the
   container's shape. Not in the spec; it fixes a defect the spec did not anticipate.
3. **`fitToStudy` re-fit on container resize** (`live-map.mjs:248-262`) — R2's "web is a range"
   implemented as a runtime consequence. Not specified.
4. **A third page layer.** The spec specifies two (`#mw-fallback`, `#mw-map`); the implementation
   ships `.mw-overlay` as a sibling (`MapWebSeed.tsx:286`, CSS `render-web.mjs:465-474`) because
   nesting the labels and `.pt` buttons inside the fallback took every Tab stop when the fallback was
   hidden. Pinned by `render-web.test.ts:323-333`. A correct deviation, documented.
5. **`planIsUnkeyed` graceful degradation** (`live-map.mjs:48-57`) — a page whose placeholder was
   never substituted stays on the fallback rather than booting a broken map. Sound; it is also what
   makes `verify-interaction.mjs` silently blind (§5.6).
6. **`keyedCopy`** (`verify-live-map.mjs:104-109`) — the keyed page is written to `mkdtemp`, never
   inside the tree, so the live guard cannot defeat the key guard. Neat, unspecified.
7. **`geo-parity`'s third assertion** — exemption reasons must exceed 12 characters
   (`geo-parity.test.ts:246-251`).
8. **`binIndexLowerInclusive` / `binIndexUpperInclusive`** — a rename-and-split where the spec asked
   for a resolution "against the type sheets". One half ended up outside the guard (§1.3.7).

---

## 4. The holes

### 4.1 B4.1 — production at any focus area. What the tree actually holds

Every committed `geometry.json`, by the longitude actually shown (`frameCorners`):

| lon span | lat span | zoom | frame | beat |
|---|---|---|---|---|
| 360.0° | 138.8° | 0.877 | 940×540 | `mapvid-hexgrid-quakes` |
| 360.0° | 138.8° | 0.707 | 836×480 | `map-quake-density` |
| 359.8° | 144.3° | 0.708 | 836×520 | `mapgen-hexgrid-web`, `mapscrolly-quakes-three-ways` |
| 83.0° | 72.7° | 3.083 / 2.393 / 2.071 | 1000² / 620² / 496² | `mapgen-symbol-web`, `map-quake-symbol` ×2 |
| 67.2° | 37.0° | 3.388 | 1000² | `mapgen-dot-web` |
| 59.5° | 31.0° | 3.467 / 3.345 | 936×827 / 860×760 | `mapvid-`/`mapmore-dot-population` |
| 59.0° | 34.8° | 4.575 … 2.563 | 2000² … 496² | choropleth family, `mapscrolly-one-map-europe-carbon` |
| 24.4° | 7.5° | 4.761 | 940×420 | `mapgen-flowmap-video` |
| 23.7° | 7.6° | 4.739 | 900×420 | `mapmore-flow-danube`, `mapmore-scrolly-danube` |
| 0.172° | 0.119° | 11.398 | 660² | `mapvid-locator-geneva` |
| 0.137° | 0.095° | 11.311 / 11.071 | 496² / 420² | `map-geneva-locator`, `mapgen-locator-web` |

**The hole the spec measured is still empty: 23.70° → 0.172° is a factor of 138 with no beat in
it.** Total span 2,628× in longitude, 10.43 zoom levels. T11 produced `survey/map-camera.md:640-646`
— Switzerland at 4.53° lon (zoom 7.39–8.03) and Lake Geneva at 0.82° (zoom 9.86–10.59), each
measured at three export sizes — and no beat: `5d6d4b61` is 36 lines of markdown in one file, and its
own body concedes "camera measurements, not beats — no BRIEF, no claim, no frozen data". No
`geometry.json`, no plate, no render. So the two rungs a local newsroom asks for most have still
never been produced, and the spec's own instruction — "nothing in this spec may assume they behave" —
still binds.

The rungs did establish one thing worth keeping, and it is the sharpest B4.1 result in the tree:
**in portrait both admit ≈2× the latitude their study set asked for (×1.95 and ×2.08) against ×1.00
at landscape.** `fitBounds` widens whichever axis does not bind, silently — which is T12's entire
motivation, recorded and not acted on.

**What breaks at each extreme, measured rather than reasoned:**

- **Planet (360°, hex) — the seam decides the headline.** `mapgen-hexgrid-web`'s delivered page still
  reports **1,374** events in the Fiji–Tonga cell (`proof/mapgen-hexgrid-web/hex-grid.html:86`, in the
  `<desc>`), against its Pacific-centred siblings' **1,724** on the same 14,175 rows, with its own
  runner-up at 1,371 — **the headline is 25% low and its ranking is decided by three events.** The
  spec's acceptance test was "1,724, or T9 did not land". The false comment that causes it survives
  verbatim at `proof/mapgen-hexgrid-web/bake-plate.mjs:30` ("The SAME real, world-spanning camera …"),
  over unchanged Greenwich-centred bounds at `:33-36`, and `normaliseLon` is still absent from that
  file. **A published beat states a ranking its own camera makes wrong.**
- **Planet (360°, hex) — Mercator inside one frame.** Hexes are drawn at uniform screen size.
  sec²(78.22°N) = **24.0×** the equator's ground area per cell; the north row against the south row is
  **5.81×**; a top-of-frame cell covers **4.2%** of the ground an equatorial one covers. The legend
  ("1–13 / 14–51 / 52–284 / 285–663 / 664+") compares them as equals. `targetCells = 220`,
  `maxCells = 400` (`geo-hex.ts:195-196` ×6 copies) pin the count to frame **area**, so 220 cells mean
  ~800 km across at planet extent and ~200 m at city extent with an identical-looking picture.
- **Planet (dot density) — untested, and already wrong at continent extent.** No dot beat exists above
  67°. At `mapgen-dot-web`'s own 34.5–71.5°N the ground-area ratio south edge to north edge is
  **6.75×**, while the page draws 2,997 circles for *"one dot for every 199,000 people"*.
  `geo-dot.ts:250-254` says in its own words that this ranking "is not identical to a people-per-km²
  one"; no latitude correction, no wide-extent refusal, and `fillTightness` is still consumed only by
  a `console.log` and the alt string (`proof/mapgen-dot-web/render-web.mjs:396-408`).
- **City (0.137–0.172°, locator) — the labels, counted at three frame sizes.** Same eleven
  organisations, same ground extent:

  | beat | plate | orgs in data | labels drawn | dropped |
  |---|---|---|---|---|
  | `mapgen-locator-web` | 420 px | 11 | 3 | **8 (73%)** |
  | `map-geneva-locator` | 496 px | 11 | 5 | **6 (55%)** |
  | `mapvid-locator-geneva` | 660 px | 11 | 4 | **7 (64%)** |

  I opened `proof/map-geneva-locator/render/static.png` and counted the 496 px row by eye: eleven
  markers, five labels. The video's own title reads *"All 11 of these international organisations sit
  inside 4.4 km"* and its readout says *"11 of 11 found"*, with seven identifiable only by colour.
  Nothing in the tree counts this. Why, in numbers: nearest-neighbour pair **0.6 px (12 m)** on the
  496 px plate, median pair 61.4 px, separation forced to `MARKER_R * 2 + 4` = 14 px — the cluster is
  nudged, not resolved. `labelSide` still tests one edge (`geo-locator.ts:123`) and its 170 px margin
  is **34% of the 496 px map, 40% of the 420 px map, 52% of the 324 px narrow layout** — with only
  1 of 11 markers ever landing in that band, so the constant is mis-sized and idle at the same time.
- **City extent would break proportional symbol, and is never tested.** Applying the seed's own
  `MARK_MAX_RADIUS_FRACTION = 0.062` to these frames gives a max radius of 26–41 px, at which
  **28 of 55 pairs (51%)** — 33/55 at 660 px — sit closer than two radii. No proportional-symbol beat
  exists below 23.7°.
- **Continent (83°, proportional symbol) — the encoding is flat.** Read the radii straight out of the
  committed `proof/map-quake-symbol/render/static.svg`: **every circle on the map lies between
  27.77 px and 30.00 px.** The largest mark is 1.08× the smallest across M7.8 → M9.1. The beat's own
  caveat says a 1.3-unit step "is orders of magnitude bigger"; the picture encodes it as an 8% radius
  difference no reader can rank. That is B6.17 at its root, and it is exactly the measurement T6 was
  meant to introduce.

**Every typed constant that is still wrong at the other extreme** (all still typed today):

| value | file:line | what it decides |
|---|---|---|
| `MAX_RADIUS = 30` | `proof/map-quake-symbol/QuakeSymbolStill.tsx:25` | biggest circle, static |
| `= 46` | `proof/map-quake-symbol/QuakeSymbolVideo.tsx:39` | biggest circle, video |
| `STILL_MAX_RADIUS = 30` | `proof/map-quake-symbol/render.mjs:64` | biggest circle, runner |
| `MARK_MAX_RADIUS_FRACTION = 0.045` | `proof/mapgen-symbol-web/QuakeSymbolWeb.tsx:59` | biggest circle, web |
| `= 0.062` | `skills/map-web/assets/MapWebSeed.tsx:79`, duplicated inline at `render-web.mjs:162` | biggest circle, seed |
| `margin = 170` ×3 | `map-geneva-locator/geo-locator.ts:121`, `mapvid-locator-geneva/…:121`, `mapgen-locator-web/…:136` | label flip |
| `margin = 130` ×2 | `map-quake-symbol/geo-symbol.ts:197`, `mapgen-symbol-web/geo-symbol.ts:194` | label flip |
| `margin = 90` | `skills/map-web/assets/geo-symbol.ts:77` | label flip |
| `minSeparationPx: 14` | `proof/mapvid-locator-geneva/render.mjs:52,141` | how far apart two organisations are drawn |
| `label: [20.3, 52.2]` | `proof/mapgen-choropleth-video/bake.mjs:42-47` | where "Poland" sits |
| `label: [6.05, 46.62]` | `skills/map-beat/scripts/bake-plate.mjs:45-50` | the seed's own label |
| `DOT_RADIUS_FRACTION = 0.002` | `proof/mapgen-dot-web/DotDensityWeb.tsx:45,124` | drawn dot size |
| `[-60, 78]` pole clip | `proof/mapgen-hexgrid-web/bake-plate.mjs:34-35` | which latitudes exist |
| `targetCells = 220` / `maxCells = 400` ×6 | `geo-hex.ts:195-196` | cell size, pinned to frame area |
| `routeBBoxWithin(…, 0.6)` — **0.6 degrees** | `mapgen-flowmap-video/bake-plate.mjs:198`, `mapmore-flow-danube/bake.mjs:184`, `mapmore-scrolly-danube/bake.mjs:189` | route framing. 2.5% of the Danube frame; **4× the entire Geneva frame** |
| `LEGEND_MAX_RADIUS_PX` = **22** vs **16** | `MapWebSeed.tsx:83` vs `QuakeSymbolWeb.tsx:63` | one identifier, two values |
| `maxZoom: 22` hard literal | `live-map.mjs:149` | sits beside the derived clamp at `:234-235` |
| marker radius 5 / 6 / 6 / 5, hit 14 / 13 | `LocatorStill.tsx:23`, `LocatorVideo.tsx:57`, `LocatorWeb.tsx:572,588,573,589` | one type, four values |
| `keepRing margin = 40` px ×10 | 10 copies | 4% of a 1000 px world plate, 8% of a 496 px city plate |
| tooltip `160 / 28 / −14 / 8` | 6× `interaction.mjs` + `live-map.mjs:381-384` | seven byte-identical copies |
| `6.6 / 110.9`, `6.6 / 77.05` | `proof/mapvid-locator-geneva/bake.mjs:40-52` | bounds by hand; 77.05 is cos(46.2°), valid only at Geneva |

`metresPerPixel` is recorded by all 20 bakes and **consumed by nothing**. Every derivation T6–T10
needed has its input on disk and unused.

**The aspect cost T12 was to record, measured live.** Driving the one live page at four viewports
(study set span 32.87° lon, 21.35° lat):

| viewport | fitted zoom | visible lon | admitted lon | zoom headroom |
|---|---|---|---|---|
| 1600×900 | 3.374 | 106.17° | **×3.23** | 1.69 |
| 1024×768 | 2.918 | 92.07° | ×2.80 | 1.49 |
| 768×1024 | 3.702 | 39.67° | ×1.21 | **0.27** |
| 375×667 | 1.914 | 63.61° | ×1.94 | 0.95 |

At a wide article column the reader is shown **3.2× the geography the story asked for** — mostly
ocean and western Russia, visible in the render. No `admittedLonRatio`/`admittedLatRatio` is recorded
anywhere in code (`grep` returns only spec and survey prose), and no gate refuses a size. At
768×1024 the reader can zoom in by **0.27 of a zoom level** — a factor of 1.2 — which is the amount
of "moving through the map" that R1 buys at that aspect. Nothing asserts a minimum headroom, so the
ruling's own purpose is the one property no guard checks.

### 4.2 The `maxBounds` cropping class, swept

**The defect and its fix are real.** Recorded verbatim at `skills/map-web/assets/live-map.mjs:136-143`:
a `maxBounds` taken from the square plate's `frameCorners` (47.8° of longitude) raised MapLibre's
minimum zoom to 4.526 on a 1566 px canvas, where 583 px of height held ~11° of latitude against the
study set's 21 — **six of thirteen points off the canvas, in a beat whose title claims all thirteen**.
Introduced by `68b9bcf5`, fixed by `bb075f6a`: `maxBounds` removed from the constructor, the map
fitted to `studyBounds`, and the leash set *after* the fit from the view that actually resulted
(`:127-151`, `:229-241`, `:252-263`).

**The recorded defect is not taken on trust.** Re-derived independently from a Mercator model with no
network, using the beat's own `BEAT.bounds [-14,34]→[28,64]` and 1000 px plate: the old
`maxBounds = frameCorners` (47.80° × 30.00°) forces `minZoom = 4.526`, at which a 1566×583 canvas
holds 11.49° of latitude and drops exactly **{madrid, barcelona, rome, athens, lisbon, stockholm}** —
the repo's own figure, digit for digit. It bit at both ends (7/13 at 1566×400, 4/13 at 343×700) and
was invisible only near the plate's own square aspect (0/13 at 1000×1000). After the fix, 0/13
outside at every shape tested — and 13/13 on screen in a real browser at all four viewports I drove.

**The sweep is short because the class has exactly one instance.** Only one page in the whole tree
holds a `maxBounds` at all:

| beat | live map | `maxBounds` in the artifact | points | outside |
|---|---|---|---|---|
| `map-web` seed (`/tmp/mw-live/population.html`, untracked) | yes | runtime leash from the fitted view | 13 | **0** |
| `mapgen-symbol-web` | no | — | — | n/a |
| `mapgen-dot-web` | no | — | — | n/a |
| `mapgen-choropleth-web` | no | — | — | n/a |
| `mapgen-hexgrid-web` | no | — | — | n/a |
| `mapgen-locator-web` | no | — | — | n/a |

`grep -c "api.maptiler.com\|maplibre\|mw-fallback\|mw-map"` is **0 on all five** committed proof
pages, and `grep maxBounds` over the whole tree returns 6 files, all `map-web` or docs. There is
no second live instance to sweep because T14 never happened.

**`minZoom` is the same defect in the other coordinate, and it is worse in the shipped beats.** For
three of the four delivered map-web pages `minZoom == maxZoom ==` the baked zoom: the reader can zoom
neither out nor in, so whatever the plate crops is permanently unreachable. `ZOOM_SCALE = 2.2`
survives in `dot-population.html`.

**The class's static twin is open, and it is where the same shape actually ships.** Counted
mechanically, each beat's own frozen data against its own recorded `frameCorners`:

| beat | kind | lon ext | features | outside `frameCorners` | outside `BEAT.bounds` |
|---|---|---|---|---|---|
| `map-quake-density` | hex | 360.0° | 14,175 | **104 (0.73%)** | 131 |
| `mapgen-hexgrid-web` | hex | 359.8° | 14,175 | **118 (0.83%)** | 204 |
| `mapscrolly-quakes-three-ways` | hex | 359.8° | 14,175 | **118 (0.83%)** | 204 |
| `mapvid-hexgrid-quakes` | hex | 360.0° | 14,175 | **102 (0.72%)** | 131 |
| symbol ×3, locator ×3, flow ×3 | — | 0.137–83° | 17 / 11 / 911 | 0 | 0 |
| choropleth ×4 | choropleth | 59.0° | 41 regions | 0 invisible, **8/41 partly clipped** (ESP FIN FRA NLD NOR PRT SWE UKR) | — |
| `mapgen-dot-web` | dot | 67.2° | 41 regions | 0 invisible, 5/41 clipped | — |
| `mapmore-`/`mapvid-dot-population` | dot | 59.5° | 41 regions | 0 invisible, **10/41 clipped — Malta cut in half by the frame's south edge (36.00°)** | — |

The three hex counts match each beat's own published caption exactly, so those are disclosed, not
hidden. The weaker claim is recorded for choropleth/dot: counting centroids flagged NOR/FRA/MLT, but
that is a multipart-territory artefact; by vertex containment **no region carrying a value is entirely
off-frame**.

**Why they ship green.** `assertCameraReachesBounds` validates the camera against the beat's **typed
`BEAT.bounds` box**, not against the study set — 19 of 19 call sites. Extracted and run outside the
tree: given `frameCorners = {west:-11, north:66, east:31, south:35}` and `bounds = [[-11,35],[31,66]]`
it returns green, while a study point at 45°E would be off the plate. A hand-typed box that already
excludes points passes by construction — which is how `map-quake-density` ships 104 cropped events
with a green bake. **Every bake that counts the crop prints it and never asserts it**: `offFrame` at
`map-geneva-locator/bake.mjs:246`, `map-quake-symbol/bake.mjs:256`, `map-quake-density/bake.mjs:283-288`,
`mapvid-hexgrid-quakes/bake.mjs:287-292` — a `console.log` and nothing more. The one bake that checks
the subject's own footprint is still the singleton the spec named
(`proof/mapvid-locator-geneva/bake.mjs:322-329`); the other two locator bakes carry only the typed-box
check (`proof/map-geneva-locator/bake.mjs:223`, `proof/mapgen-locator-web/bake-plate.mjs:246`). T10
was the task that would have closed it.

**The padding is typed, and it is pointed at the wrong box.** All 19 bakes use
`fitBoundsOptions: { padding: 0 }`; every margin is hand-typed **in degrees inside `BEAT.bounds`**,
ranging 0.026° (Geneva) to 7.05° (quake symbol) — a 270× spread — and **negative at planet extent**
(`map-quake-density` pads −5.30° south / −8.61° north, i.e. it deliberately crops, which is the 104
events). The live map types 48 px twice (`live-map.mjs:148`, `:260`), which must stay equal or a
resize re-fit jumps. §6.3's *"`maxBounds` = `frameCorners`, padded by the beat's own furniture
margin"* is implemented nowhere — `grep furnitureMargin` returns 0 hits, and the live leash uses
neither `frameCorners` nor `BEAT.bounds` but the runtime-fitted view.

### 4.3 B5.1, measured on the committed artifacts

Four committed proof pages driven at 1600×900 in a real browser:

| page | page height | window | widest visual | width used | "Zoom in" button |
|---|---|---|---|---|---|
| `mapgen-hexgrid-web/hex-grid.html` | **5127 px** | 900 | 900×794 | 56% | no |
| `mapgen-dot-web/dot-population.html` | **2092 px** | 900 | 664×664 | 42% | **yes** |
| `mapgen-choropleth-web/render/choropleth.html` | **1705 px** | 900 | 860×492 | 54% | no |
| `mapgen-locator-web/locator.html` | 910 px | 900 | 860×492 | 54% | no |

The hex page is 5.7 folds tall. B6.14b's button is in the delivered file. B5.1 is open on all four.

### 4.4 The fallback layer fails B5.1 by construction

Driven with JavaScript disabled — the state R1's own cost list says a reader gets when the key is
rotated, the quota trips, the CMS blocks `api.maptiler.com`, or scripts are off:

| viewport | fallback plate box | width used |
|---|---|---|
| 1600×900 | 583×583 | **36%** |
| 1024×768 | 451×451 | **44%** |
| 768×1024 | 707×707 | 92% |
| 375×667 | 273×273 | 73% |

The live layer fills the window; the fallback keeps the square plate's `aspect-ratio` and sits in the
corner of a wide one. §6.4 argued that live tiles dissolve the aspect conflict — they dissolve it for
the live layer only. **The swap is also not invisible**: at 1600×900 the live map shows
−45.79°…60.38° and the fallback shows the square plate's own corners, so the picture jumps extent as
well as size. The water colour does match (`#aac9e0` both sides — `bake-plate.mjs:257`,
`render-web.mjs:77`), but as two independent literals with nothing tying them.

With the network cut, the page correctly stays on the fallback (`mw-live` never set) — the
quota-invalidation rehearsal passes.

### 4.5 Other holes worth naming

- **No guard pins the four camera keys in committed `geometry.json`**, which the spec named as T1's
  own in-task pin. `grep` for the key names across `*.test.ts` finds only a hand-built fixture at
  `skills/map-web/test/live-map.test.ts:42`.
- **Nothing asserts the two invariants are *called*.** `bake-parity` compares bodies. A bake that
  deletes its two call lines and keeps the functions stays green in both walks.
- **`proof/mapscrolly-quakes-three-ways/plate/geometry.json` has no bake behind it** — that camera is
  outside `bake-parity` entirely.
- **Four non-bake `.mjs` carry an un-unified `resolveChrome`** outside both walks
  (`proof/mapscrolly-one-map-europe-carbon/drive.mjs`, `proof/scrolly-one-chart-swiss-life-expectancy/drive.mjs`,
  `skills/chart-web/scripts/verify-web.mjs`, `skills/scrolly/scripts/verify-scrolly.mjs`).
- **`§7.5`'s inverted mirror does not exist.** The green side is kept
  (`skills/scrolly/test/seed-tracks.test.ts:381`). Nothing anywhere asserts a map-web page
  *contains* the style URL; `render-web.test.ts:317-322` asserts only the fallback half.
- **`bun scripts/matrix.mjs --check` — §10's closing check — is RED in the tree today.** The drift is
  not W5/W6's: it names `portrait-aspect-probe`, `mapscrolly-one-map-europe-carbon` and
  `scrolly-one-chart-swiss-life-expectancy` as beats with no declared type. One of the three is a map
  beat.

---

## 5. Every guard the spec promises — can it go red?

All mutations run in `<scratch>/mut`, an rsync copy outside the tree with its own git repository,
never in `twin/`. Baseline in that copy: **139 pass / 0 fail** on the three parity/key guards; the
real tree is identically green.

### 5.1 `bake-parity.test.ts` — **load-bearing**

| mutation | expected | observed |
|---|---|---|
| `normaliseLon` `+ 360` → `+ 180` in `proof/mapvid-hexgrid-quakes/bake.mjs` | red, naming file and function | **red** — `["proof/mapvid-hexgrid-quakes/bake.mjs", ["normaliseLon"]]`, 24 pass / 1 fail |
| delete `normaliseLon` from that file entirely | green (a subset is legitimate) | **green** — 25 pass / 0 fail |
| rename the canonical's `resolveChrome` | anti-vacuity pin fires | **red** — 24 pass / 1 fail on `"resolveChrome"` |

Exactly the three-way behaviour §4.1 specified, including the distinction between drift and omission.

### 5.2 `no-key-in-the-repository.test.ts` — **load-bearing, with three holes**

| mutation | observed |
|---|---|
| key in a **tracked** `proof/mapgen-symbol-web/leak.html` | **red** — offender named |
| same file **untracked** | **green** — the distinction holds |
| key in a **tracked 9 MB `.html`** | **green** — the `>8 MB` skip at `:79` |
| key in a **tracked `leak.png`** | **green** — the extension skip at `:78` |
| a **different** 16-char key in a tracked file | **green** — by construction; and this is the key R1b says will be delivered |

### 5.3 `geo-parity.test.ts` — **load-bearing, both assertions and the pin**

| mutation | observed |
|---|---|
| `keepRing` `margin = 40` → `30` in `proof/mapmore-flow-danube/geo-flow.ts` | **red** on `@parity keepRing`, 110 pass / 1 fail |
| add an **untagged** `keepRing` to `proof/map-quake-symbol/geo-symbol.ts` | **red** on the second assertion — "should not carry an untagged twin of a function tagged elsewhere" |
| same twin with a bare `@parity-exempt` and no reason | **red** — the reason is genuinely required |
| strip `@parity` from one core / from every core | **red** both times — the ≥10-names pin fires |

### 5.4 The two camera invariants — **they fire, with messages that fix the frame**

Functions extracted from `skills/map-beat/scripts/bake-plate.mjs` and run outside the tree:

- `assertCameraReachesBounds({west:-11,north:60,east:31,south:35}, [[-11,35],[31,66]], 900)` throws
  *"this plate crops the study area — north edge is 60.00°, asked for 66°. A 900px-wide frame needs at
  least 129px of height to hold 35°–66° without cropping."* The number is correct and actionable;
  the constant it replaced would have said 512.
- `assertWorldFillsFrame({worldWidthPx: 400}, 836)` throws naming 48%.
- **The gap:** with `frameCorners` reaching the typed box exactly, a study point outside that box is
  invisible to it (§4.2).

### 5.5 `verify-live-map.mjs` — **non-vacuous, and I watched it fail**

Rendered the seed page from the mutation copy into a scratch directory and drove it.

- **Control:** 13/13 on screen at both shapes, pointer reaches Paris to 44 px of 43.7 px drawn, the
  four filter states paint 13/4/3/6 marks with labels and hit targets matching. Exit 0.
- **Mutation — size the marks from the plate's box instead of the camera** (`cameraScale` replaced by
  `min(w/frameW, h/frameH)`): **red**, one FAIL per mark, e.g. *"paris is drawn at 36.1px but this
  camera implies 43.7px (17% out) — the mark is being sized by something other than the camera,
  which is what the plate's own box does."* The independent second opinion works.
- **Mutations that did NOT reproduce the historic crop** — `maxBounds` restored on the constructor,
  and `maxBounds` set from the plate's corners after the fit — both stayed green, because the runtime
  fit now dominates. Recorded so nobody re-derives it: the crop cannot be re-created by putting
  `maxBounds` back; it needed the *absence* of the runtime fit.

### 5.6 The guard that matters most — **decorative in practice**

Two findings, in order of weight.

**(a) The entire live map can be deleted and nothing goes red.** In the mutation copy, changed
`render-web.mjs:188` `const liveBlock = live ? …` to `const liveBlock = false ? …`, which strips
maplibre-gl, the `mw-live-plan` JSON and the boot script from every rendered page. Ran
`skills/map-web/` plus `interaction-promises-are-kept.test.ts`: **354 pass / 0 fail.** The whole
of R1 is removable in silence.

**(b) The one guard that would have caught it is skipped by default.**
`skills/map-web/test/live-map.test.ts:151-153` gates the browser probe on a key **and** on
`existsSync("/tmp/mw-live/population.html")` — a path **no script produces**
(`render-web.mjs:91` defaults to `/tmp/map-web-twin`; `verify-live-map.mjs:311` defaults to
`/tmp/mw-live`). On this machine the file exists because someone rendered it by hand at 01:27 on
10 August; it is 1.1 MB, untracked, in the system temp directory, and stale with respect to every
change I made. On a fresh clone the test prints *"live map not driven"* and passes. This also
violates PLAN invariant 3 — a beat's outputs live in the beat's own folder.

**(c) `verify-interaction.mjs` was not rewritten, and now measures the fallback only.** Unchanged
since `e11084c2` (pre-ruling): `probePoint` at `:82-100` still uses `document.elementFromPoint`, and
`:230-234` still asserts the drawn box matches the *baked plate's* aspect — a rule the live layer
deliberately overrides (`render-web.mjs:479` `aspect-ratio: auto !important`). It never sees the live
layer because `render()` always writes the placeholder, so `planIsUnkeyed` returns true and
`initLiveMap` exits at `live-map.mjs:121`. `canon.test.ts:55` runs it inside `bun test`, so **the
suite proves the fallback and calls it the beat.** Its "four mutation copies" provenance
(`SKILL.md:110-115`) is a proof about the pre-ruling page and was not re-earned.

**(d) `markLayers` and `livePlan` have zero test coverage.** `grep livePlan|markLayers|maxZoomForStudySet`
across `skills/map-web/test/` returns nothing. `renderMapWeb`'s `live` parameter defaults to
`false` (`render-web.mjs:170`) and the test helper never passes it, so **no test in the suite ever
assembles the live block**.

---

## 6. What I would put in front of the owner first

1. **W6 exists in one untracked file in `/tmp`.** No live page is committed, the seed's own
   `output-proof/preview.png` is a picture of the fallback, and deleting the live block reddens
   nothing. Before any more camera work: commit a live artifact with its placeholder, point the
   probe at it, and let the key guard and `§7.5`'s mirror assertion do their jobs on a real file.
2. **T14 is zero of five, and the commit message says otherwise.** The button the owner named by
   name (B6.14b) is still in `dot-population.html`; three of the five beats are still on the two-rung
   `layouts` API and one delivers a 5127 px page into a 900 px window.
3. **R1b clause 4 is advice.** As configured, delivery ships the development key. One env var and a
   refusal would close it.
4. **The proportional-symbol beat encodes M7.8→M9.1 as a 27.8→30.0 px radius.** Read off the
   committed SVG. The type's whole job is not being done, and T6 was the task that would have found
   it. Its neighbour: `mapgen-locator-web` draws 3 labels for 11 organisations while the family's
   video title says "All 11".
5. **The camera invariant validates a typed box, not the study set** — 19 of 19 call sites. It is the
   same defect as the `maxBounds` crop, in the half that still ships, and four bakes already *count*
   the cropped points into a `console.log` without asserting on them. `mapgen-hexgrid-web`'s headline
   number is 25% low because of it.

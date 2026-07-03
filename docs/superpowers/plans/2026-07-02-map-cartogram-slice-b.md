# Map Cartogram — Slice B (video + interactive scrolly) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the cartogram type to full six-format parity — add the three video formats (reveal,
storytelling, scrolly) + the interactive HTML scrolly — inheriting the grid-neutral-background rule in
every format via a shared helper.

**Architecture:** A pure `deriveCartogramStory` produces the shared `Beat[]` (title → establish → reveal
the highest-value regions → takeaway; camera stays framed on the zone). Video components port the
hex-grid siblings: `CartogramReveal`/`CartogramStory`/`CartogramScrolly`. `ScrollyCartogramMap` +
`Scrolly.tsx` dispatch + a per-type smoke gate give the interactive scrolly (the point-types lesson). A
shared `applyCartogramBasemap(map, dark, variant)` helper (extracted from `CartogramMap`) enforces the
grid-neutral / scaled-basemap rule across ALL formats.

**Tech Stack:** Bun, TypeScript, Remotion, MapTiler SDK, turf, React, `bun:test`, Playwright smoke.

**Prereq:** cartogram Slice A merged to main (f2cbece): `cartogram-geo.ts`, `CartogramMap.tsx`
(static+interactive, grid-neutral-bg inline), validation, conformance, samples, KB, roadmap S✓ I✓ V◻.

## Global Constraints

- Runtime **Bun** always — never npm/node. Tests `bun test`; build `bunx vite`.
- Code, comments, commits, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key in `atelier/.env` (gitignored) — never commit/log it; load with
  `set -a; source /Users/rmdms/Sites/Professional/atelier/.env; set +a`.
- **Frame-determinism (video):** the cartogram layout is computed ONCE and held; camera animates per
  frame; no `Date.now`/`Math.random`/argless `new Date()`; render `--gl=angle --concurrency=1`.
- **Grid-neutral-background rule (SYSTEM):** the `grid` variant renders on a flat neutral background
  (tone by mapStyle light/dark), the `scaled` variant keeps the basemap. This MUST be applied in EVERY
  format via the shared helper — never re-implemented per component, never dropped in a video/scrolly.
  See the KB `types/cartogram.md` + the design spec.
- **Camera stays on zone:** a reveal frames the region expanded to keep the data extent visible (never a
  single over-zoomed region — the locator lesson).
- **Interactive scrolly needs a real component:** `ScrollyCartogramMap` + `Scrolly.tsx` dispatch + smoke
  gate — never claim the format from the story contract alone.
- After writing any `.tsx`, verify NUL-free: `python3 -c "print(open('<file>','rb').read().count(b'\\x00'))"` prints 0.

---

## File structure

**Create:** `src/cartogram-story.ts`, `src/components/CartogramReveal.tsx`, `CartogramStory.tsx`,
`CartogramScrolly.tsx`, `src/theme/cartogram-basemap.ts` (shared helper), `tests/cartogram-story.test.ts`,
`skills/scrolly/src/ScrollyCartogramMap.tsx`.
**Modify:** `src/CartogramMap.tsx` (use the shared helper), `src/route-story.ts` (scrollyStepCount
branch), `src/components/MapScrolly.tsx` (dispatch), `remotion/src/Root.tsx`, `scripts/produce.mjs`,
`skills/scrolly/src/Scrolly.tsx` (dispatch + union), `skills/scrolly/src/mount.tsx` (union),
`skills/scrolly/scripts/smoke.mjs` (cartogram layer gate), KB `types/cartogram.md`, `SKILL.md`.

**Reference (read, do not modify):** `src/components/HexGridReveal.tsx` / `HexGridStory.tsx` /
`HexGridScrolly.tsx` (the video sibling ports), `skills/scrolly/src/ScrollyHexMap.tsx` (the interactive
scrolly sibling), `src/hex-grid-story.ts` (deriveHexGridStory as the story template), `src/CartogramMap.tsx`
(cell build + the inline neutral-bg logic to extract).

---

## Task 1: shared basemap helper + `deriveCartogramStory` + scrolly step count

**Files:** Create `src/theme/cartogram-basemap.ts`, `src/cartogram-story.ts`,
`tests/cartogram-story.test.ts`; Modify `src/CartogramMap.tsx`, `src/route-story.ts`.

**Interfaces:**
- Produces:
  - `function applyCartogramBasemap(map: maptilersdk.Map, dark: boolean, variant: "scaled" | "grid"): void`
    — for `grid`: remove symbol layers, hide non-cell basemap layers, set a neutral background
    (`dark ? "#1b1d21" : "#f2f3f5"`); for `scaled`: strip symbol/label layers only (keep basemap). This
    is the EXACT logic currently inline in `CartogramMap.tsx` on `map.on("load")` — extract it verbatim.
  - `interface CartogramStoryMeta { title: string; description?: string; insight?: string }`
  - `function deriveCartogramStory(layout: CartogramLayout, meta: CartogramStoryMeta, opts?: { maxReveals?: number }): Beat[]`

- [ ] **Step 1: Extract the shared basemap helper.** Create `src/theme/cartogram-basemap.ts` exporting
  `applyCartogramBasemap(map, dark, variant)` — move the neutral-bg / symbol-strip logic OUT of
  `CartogramMap.tsx`'s `map.on("load")` into this function (verbatim behaviour: grid → hide basemap +
  neutral background + add `neutral-background` layer if no `background` layer; scaled → remove symbol
  layers only). Then in `CartogramMap.tsx`, replace the inline block with a call to
  `applyCartogramBasemap(map, dark, layout.variant)`. Run `cd skills/map-native && bunx tsc --noEmit && bun test` (267 pass, no behaviour change) and render-verify one grid + one scaled still are UNCHANGED from Slice A.

- [ ] **Step 2: Write the failing story test** — `tests/cartogram-story.test.ts`: build a small
  `CartogramLayout` (reuse the geo core on 3-4 regions with distinct values), then assert
  `deriveCartogramStory` emits `title → establish → reveal(s) → takeaway`; reveals ordered by value
  DESCENDING; the top reveal's `copy` contains the top region's value + a rank descriptor
  ("the highest"/"2nd highest"/`#k`) + the region id; `highlight` carries the region id (matched later by
  the components); reveal camera keeps the full extent visible (span ≥ 50% of the data extent); `maxReveals`
  cap respected. Mirror `tests/hex-grid-story.test.ts`.

- [ ] **Step 3: Run to verify it fails.** `cd skills/map-native && bun test tests/cartogram-story.test.ts`

- [ ] **Step 4: Implement `deriveCartogramStory`** — port `src/hex-grid-story.ts` (read it fully). Deltas:
  rank `layout.cells` by `value` desc (tie-break by index); reveal caption = formatted value +
  `layout.valueLabel` + rank descriptor + the region id (`cell.id`); `highlight = [cell.id]`; camera =
  `frameCell(bbox(cell.feature), layout.bounds, 0.5)` (the same ≥50%-extent framing helper — copy it);
  title/establish/takeaway on the full `layout.bounds`. Reuse the `Beat` shape from `./map-story`.

- [ ] **Step 5: Add the `cartogram` branch to `scrollyStepCount`** in `src/route-story.ts` (BEFORE the
  symbol branch), mirroring the hex-grid branch: `computeCartogram(config, world) → deriveCartogramStory →
  mapStoryToChapters(...).steps.length`. Add imports (`computeCartogram`, `deriveCartogramStory`). (world =
  the geojson `scrollyStepCount` already loads for the region types.)

- [ ] **Step 6: Full suite.** `cd skills/map-native && bun test` (267 + new story tests pass).

- [ ] **Step 7: Commit**
```bash
git add skills/map-native/src/theme/cartogram-basemap.ts skills/map-native/src/cartogram-story.ts skills/map-native/tests/cartogram-story.test.ts skills/map-native/src/CartogramMap.tsx skills/map-native/src/route-story.ts
git commit -m "feat(map-native): deriveCartogramStory (highest-region beats) + shared cartogram basemap helper + scrolly step count"
```

---

## Task 2: CartogramReveal + CartogramStory + Root + produce + render-verify

**Files:** Create `src/components/CartogramReveal.tsx`, `CartogramStory.tsx`; Modify `remotion/src/Root.tsx`,
`scripts/produce.mjs`.

**Interfaces:**
- Consumes: `deriveCartogramStory` + `applyCartogramBasemap` (Task 1), `computeCartogram`, `resolveMapStyle`,
  the reveal/story pipeline helpers (as HexGridReveal/HexGridStory use them), `MapFrame`, `StoryCards`.
- Produces: `CartogramReveal`, `CartogramStory` React components `{ config }`.

### CartogramReveal — port `src/components/HexGridReveal.tsx` (read fully). Deltas:
1. `computeCartogram(config, world)` ONCE on load; build the cell FeatureCollection tagged
   `{ __color, __id, __value }` (as CartogramMap does). Fill layer id `cartogram-cells`
   (`fill-color:["get","__color"]`, fill-opacity ramps 0→0.85 by reveal progress) + outline.
2. **Call `applyCartogramBasemap(map, dark, layout.variant)`** on load — grid gets the neutral background,
   scaled keeps the basemap. (The video MUST honour the rule.)
3. Fixed camera `revealCameraPlan(layout.bounds)`; sequential/diverging bin legend + `valueLabel`; title
   scene + MapFrame — like HexGridReveal.

### CartogramStory — port `src/components/HexGridStory.tsx` (read fully). Deltas:
1. Beats from `deriveCartogramStory(computeCartogram(config, world), meta)`.
2. Same cell build, tag each cell with `__id`; on a reveal beat dim non-highlighted cells (fill-opacity via
   a `["case", ["==", ["get","__id"], highlightKey], full, dim]` expression) synced to the beat; all full
   on title/establish/takeaway. **Call `applyCartogramBasemap`** on load.
3. Camera flies per beat via the story timeline; caption = `CaptionCard` with `beat.copy`; title scene;
   bin legend. No on-map callout.

- [ ] **Step 1: Write `CartogramReveal.tsx`** per deltas. Verify NUL-free.
- [ ] **Step 2: Write `CartogramStory.tsx`** per deltas. Verify NUL-free.
- [ ] **Step 3: Register compositions in `Root.tsx`** — mirror the HexGrid registrations:
  `CartogramReveal{,Square,Portrait}` (`REVEAL_FRAMES + TITLE_SCENE_FRAMES`) and
  `CartogramStory{,Square,Portrait}` (`buildTimeline(...).totalFrames` from a sample-derived beat list),
  1280×720 / 1080×1080 / 1080×1350, `defaultProps={{ config: sampleCartogram }}` — props `{config:...}`-wrapped.
  Use `cartogram-scaled.json` as the sample for reveal/story frame-count derivation.
- [ ] **Step 4: Wire `produce.mjs`** — replace Slice A's `isCartogram ? []` so cartogram gets reveal +
  story (+ scrolly in Task 3): `format === "reveal" ? ["reveal"] : "story" ? ["story"] : "scrolly" ?
  ["scrolly"] : "all" ? ["reveal","story","scrolly"] : []`. Add `isCartogram` arms to `VIDEO_COMPS.reveal`
  (`CartogramReveal{,Square,Portrait}`) and `storyComps` (`CartogramStory{,Square,Portrait}`).
- [ ] **Step 5: Typecheck + full suite.** `cd skills/map-native && bunx tsc --noEmit && bun test` (clean; pass).
- [ ] **Step 6: Render-verify reveal + story, BOTH variants (scaled + grid), landscape.** COMMIT first, then:
```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/atelier/.env; set +a
for CFG in cartogram-scaled cartogram-grid; do node -e "const fs=require('fs');fs.writeFileSync('/tmp/cb-$CFG.json',JSON.stringify({config:JSON.parse(fs.readFileSync('assets/sample-data/$CFG.json','utf8'))}))"; done
for C in CartogramReveal CartogramStory; do
  bunx remotion render remotion/src/index.ts $C /tmp/cb/scaled-$C.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/cb-cartogram-scaled.json
  bunx remotion render remotion/src/index.ts $C /tmp/cb/grid-$C.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/cb-cartogram-grid.json
done
```
Capture a mid still per composition: reveal = cells fade in on fixed camera, title scene, correct mapStyle,
AND the grid sample on a NEUTRAL background / the scaled sample on the basemap; story = camera frames the
top region with context, that region emphasised while others dim, caption = value + valueLabel + rank +
region id. **If the grid video shows the real map behind the tiles, the neutral-bg helper is not applied —
STOP and fix.** If a render exceeds ~8 min, STOP → DONE_WITH_CONCERNS.
- [ ] **Step 7: Commit**
```bash
git add skills/map-native/src/components/CartogramReveal.tsx skills/map-native/src/components/CartogramStory.tsx skills/map-native/remotion/src/Root.tsx skills/map-native/scripts/produce.mjs
git commit -m "feat(map-native): cartogram video reveal + storytelling (grid-neutral-bg honoured) + wiring"
```

---

## Task 3: CartogramScrolly + MapScrolly dispatch + render-verify

**Files:** Create `src/components/CartogramScrolly.tsx`; Modify `src/components/MapScrolly.tsx`.

### CartogramScrolly — port `src/components/HexGridScrolly.tsx` (read fully) + reuse ChoroplethScrolly's `stepSlide`. Deltas:
1. Beats from `deriveCartogramStory(computeCartogram(config, world), meta)`; `story = mapStoryToChapters(...)`;
   step 0 = title, rest = reveals; camera per step via `cameraForFrame`.
2. Same cell build tagged `__id`; per-step dim-emphasis (`__id` case expression) synced to the panel slide.
   **Call `applyCartogramBasemap(map, dark, layout.variant)`** on load.
3. `ScrollyPanel` per reveal step (prose = beat.copy); overview(establish) + takeaway panel-free (visual only).
   Bin legend.

- [ ] **Step 1: Write `CartogramScrolly.tsx`** per deltas. Verify NUL-free.
- [ ] **Step 2: Dispatch in `MapScrolly.tsx`** — add before the choropleth fallback:
  `if (config?.type === "cartogram") return <CartogramScrolly config={config} />;` + the import.
- [ ] **Step 3: Confirm `Root.tsx` MapScrolly sizes cartogram** via `scrollyStepCount` (Task 1 branch) —
  read `scrollyMeta`; do NOT add a new composition (reuse the existing `MapScrolly{,Square,Portrait}`).
- [ ] **Step 4: Typecheck + full suite.** `cd skills/map-native && bunx tsc --noEmit && bun test` (clean; pass).
- [ ] **Step 5: Render-verify scrolly, BOTH variants, landscape.** COMMIT first:
```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/atelier/.env; set +a
bunx remotion render remotion/src/index.ts MapScrolly /tmp/cb/scaled-MapScrolly.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/cb-cartogram-scaled.json
bunx remotion render remotion/src/index.ts MapScrolly /tmp/cb/grid-MapScrolly.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/cb-cartogram-grid.json
```
Confirm the panel advances per top region, dim-emphasis synced, overview/takeaway panel-free, correct
mapStyle, grid on neutral bg. Same slow-render stop rule.
- [ ] **Step 6: Commit**
```bash
git add skills/map-native/src/components/CartogramScrolly.tsx skills/map-native/src/components/MapScrolly.tsx
git commit -m "feat(map-native): cartogram scrolly video via MapScrolly dispatch"
```

---

## Task 4: ScrollyCartogramMap (interactive scrolly) + Scrolly dispatch + smoke gate

**Files:** Create `skills/scrolly/src/ScrollyCartogramMap.tsx`; Modify `skills/scrolly/src/Scrolly.tsx`,
`skills/scrolly/src/mount.tsx`, `skills/scrolly/scripts/smoke.mjs`.

### ScrollyCartogramMap — port `skills/scrolly/src/ScrollyHexMap.tsx` (read fully). Deltas:
1. `computeCartogram(config, world)` ONCE (import world.geojson like the other scrolly maps); cell
   FeatureCollection tagged `{__color,__id,__value}`; fill layer id `cartogram-cells` + outline.
2. **Import + call `applyCartogramBasemap(map, dark, layout.variant)`** from
   `../../map-native/src/theme/cartogram-basemap` — grid neutral, scaled basemap (the rule in the
   interactive scrolly too).
3. Beats from `deriveCartogramStory`; precompute per-beat cameras; `flyTo`/`jumpTo` on `currentStep`;
   per-step `__id` dim-emphasis; expose `window.__map__` + `window.__scrolly_step__`; bin legend.
   `export interface ScrollyCartogramConfig` = the cartogram config shape. Do NOT import `mapStoryToChapters`
   in the component.

- [ ] **Step 1: Write `ScrollyCartogramMap.tsx`** per deltas. Verify NUL-free.
- [ ] **Step 2: `Scrolly.tsx` cartogram branch + dispatch** — story branch
  (`deriveCartogramStory(computeCartogram(config, world), meta) → mapStoryToChapters`, `regionsWithData` =
  `layout.cells.length`) BEFORE the choropleth fallback; render slot `config.type === "cartogram" ?
  <ScrollyCartogramMap .../> :`; imports; widen the config union with `ScrollyCartogramConfig`.
- [ ] **Step 3: Widen `mount.tsx` union** with `ScrollyCartogramConfig`.
- [ ] **Step 4: Smoke gate** — in `smoke.mjs`'s type→layer map add `cartogram → "cartogram-cells"`; for
  cartogram assert the layer present AND `choropleth-fill` ABSENT (the regression guard). Keep the
  regime-aware camera logic (a static camera is fine when step advanced + layer present).
- [ ] **Step 5: Typecheck + full suite.** `cd skills/scrolly && bunx tsc --noEmit && bun test`.
- [ ] **Step 6: Render-verify the interactive scrolly, BOTH variants.** COMMIT first; build each with
  `CONFIG=<sample> bunx vite build` then run `smoke.mjs`; confirm `getLayer("cartogram-cells")` truthy,
  `choropleth-fill` absent, step advances, grid on neutral bg + scaled on basemap. (Read smoke.mjs for the
  build/config mechanism — `CONFIG=<path> bunx vite build` → `dist/index.html`.)
- [ ] **Step 7: Commit**
```bash
git add skills/scrolly/src/ScrollyCartogramMap.tsx skills/scrolly/src/Scrolly.tsx skills/scrolly/src/mount.tsx skills/scrolly/scripts/smoke.mjs
git commit -m "feat(scrolly): interactive scrolly renders cartogram (ScrollyCartogramMap)"
```

---

## Task 5: KB + SKILL roadmap + final matrix

**Files:** Modify `knowledge/references/map/types/cartogram.md`, `knowledge/references/map/formats/*.md`,
`skills/map-native/SKILL.md`.

- [ ] **Step 1: Update the cartogram KB type doc** — the Slice-A/B scope note now says video (reveal +
  storytelling + scrolly) and interactive scrolly are SHIPPED; note the highest-region story structure +
  camera-on-zone; note the grid-neutral-background rule holds across ALL formats via
  `applyCartogramBasemap`. Name `ScrollyCartogramMap`. Remove any "Slice B not built" caveat.
- [ ] **Step 2: Add cartogram to the format KB docs** — in `formats/video-reveal.md`,
  `video-storytelling.md`, `video-scrolly.md`, add a one-line cartogram entry where they enumerate types.
- [ ] **Step 3: Refresh SKILL.md roadmap** — the Cartogram row V column → `✓`, note "all six formats built".
- [ ] **Step 4: Final full suite + matrix.** `cd skills/map-native && bun test`; then confirm produce emits
  the cartogram video blocks: `bun scripts/produce.mjs assets/sample-data/cartogram-scaled.json /tmp/cb/prod all`
  → `PRODUCE_RESULT` with `reveal`/`story`/`scrolly` × 3 sizes + static/interactive.
- [ ] **Step 5: Commit**
```bash
git add knowledge/references/map/types/cartogram.md knowledge/references/map/formats/ skills/map-native/SKILL.md
git commit -m "docs(map-native): cartogram video + interactive scrolly shipped — KB + roadmap (all six formats)"
```

---

## Self-Review

**Spec coverage (Slice B):** shared basemap helper + `deriveCartogramStory` + scrollyStepCount → Task 1;
reveal + storytelling → Task 2; scrolly video → Task 3; interactive scrolly (`ScrollyCartogramMap` +
dispatch + smoke gate) → Task 4; KB + roadmap → Task 5. The grid-neutral rule is enforced in every format
via `applyCartogramBasemap` (Task 1 helper, called in CartogramMap + all four Slice B components).
Camera-on-zone + no-double-caption restated. All formats reach 3 sizes.

**Placeholder scan:** Task 1 carries the helper-extraction + story deriver as concrete port-with-code;
Tasks 2-4 port NAMED in-repo siblings (HexGridReveal/Story/Scrolly, ScrollyHexMap) with enumerated deltas +
exact render commands. No "TBD".

**Type consistency:** `applyCartogramBasemap(map, dark, variant)`, `deriveCartogramStory(layout, meta,
opts?)`, `CartogramStoryMeta`, `CartogramReveal`/`CartogramStory`/`CartogramScrolly`/`ScrollyCartogramMap`,
the `cartogram` scrollyStepCount branch, and the smoke `cartogram → cartogram-cells` mapping match across
tasks. Cell build (`{__color,__id,__value}` [+ dim by `__id`]) consistent across all components and Slice A's
CartogramMap. `Beat` shape matches `map-story.ts`. Layer id `cartogram-cells` matches everywhere.

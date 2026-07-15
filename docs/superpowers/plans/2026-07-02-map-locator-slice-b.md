# Map Locator — Slice B (video: reveal · storytelling · scrolly) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three video formats (simple-reveal, storytelling, scrolly) + interactive scrolly to
the locator map type, so locator reaches full format parity with the other map types.

**Architecture:** A pure `deriveLocatorStory` produces the shared `Beat[]` (few-regime → one beat per
place with its note; categorized-regime → one beat per category). Video components port from the
symbol siblings: `LocatorReveal` (glyph drop/fade-in, from `SymbolReveal`), `LocatorStory` (beat-driven
guided tour, from `SymbolStory`), `LocatorScrolly` (from the scrolly renderers, dispatched by
`MapScrolly`). `deriveLocatorStory → mapStoryToChapters` feeds BOTH the scrolly video and the
interactive scrolly (the same shared contract), so interactive scrolly comes nearly free.

**Tech Stack:** Bun, TypeScript, Remotion, MapTiler SDK, `bun:test`.

**Prereq:** Slice A (locator-geo, locator-labels, LocatorMap static+interactive, validation,
conformance) is merged to main. This plan builds on it.

## Global Constraints

- Runtime **Bun** always — never npm/node. Tests: `bun test`.
- Code, comments, commit messages, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key lives in `splash/.env` (gitignored) — never commit/log it. Render commands load it via
  `set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a`.
- Frame-deterministic Remotion: no `Date.now`/`Math.random`/argless `new Date()`; map updates use
  `delayRender → jumpTo/setData/setPaintProperty → map.once("idle") → continueRender`; render with
  `--gl=angle --concurrency=1`.
- A locator marker is **uniform-size** — never value-scaled (holds in the video too).
- Reuse existing building blocks (`deriveSymbolStory`/`SymbolReveal`/`SymbolStory` patterns, the
  reveal/story/scrolly pipeline, `resolveScene`, `StoryCards`, `buildTimeline`/`cameraForFrame`,
  `mapStoryToChapters`, `locatorGeometry`, `resolveMapStyle`). Do not fork them.
- After writing any `.tsx`, verify it is NUL-free: `grep -c $'\\x00' <file>` must print 0 (a stray NUL
  once made a component binary).

---

## File structure

**Create:**
- `skills/map-native/src/locator-story.ts` — `deriveLocatorStory` (Beat[]) + `locatorScrollyStepCount`.
- `skills/map-native/src/components/LocatorReveal.tsx` — simple-reveal video (port of SymbolReveal).
- `skills/map-native/src/components/LocatorStory.tsx` — storytelling video (port of SymbolStory).
- `skills/map-native/src/components/LocatorScrolly.tsx` — scrolly video (port of SymbolScrolly).
- `skills/map-native/tests/locator-story.test.ts`

**Modify:**
- `skills/map-native/src/route-story.ts` — add a `locator` branch to `scrollyStepCount`.
- `skills/map-native/src/components/MapScrolly.tsx` — dispatch `config.type === "locator"` → `LocatorScrolly`.
- `skills/map-native/remotion/src/Root.tsx` — register `LocatorReveal{,Square,Portrait}`,
  `LocatorStory{,Square,Portrait}` (3 sizes each).
- `skills/map-native/scripts/produce.mjs` — locator video kinds (replace Slice A's `isLocator ? []`).
- `knowledge/references/map/formats/*.md` + `types/locator.md` — note locator video shipped.
- `skills/map-native/SKILL.md` — roadmap row: locator video built.

---

## Task 1: `deriveLocatorStory` + scrolly step count

**Files:**
- Create: `skills/map-native/src/locator-story.ts`
- Modify: `skills/map-native/src/route-story.ts`
- Test: `skills/map-native/tests/locator-story.test.ts`

**Interfaces:**
- Consumes: `Beat` (from `./map-story`), `LocatorMarker`/`locatorGeometry` (from `./locator-geo`), `mapStoryToChapters` (from `../../scrolly/src/chapters`).
- Produces:
  - `interface LocatorStoryMeta { title: string; description?: string; insight?: string }`
  - `function deriveLocatorStory(markers: LocatorMarker[], meta: LocatorStoryMeta, opts?: { maxReveals?: number }): Beat[]`
  - `function locatorScrollyStepCount(config: { markers: LocatorMarker[]; title?: string; description?: string; insight?: string; source?: { name: string; url: string } }): number`

**Beat model** (from `map-story.ts`, unchanged): `{ kind: "title"|"establish"|"reveal"|"takeaway"; camera: [number,number,number,number]; highlight: string[]; dim: boolean; callout: { region: string; name: string; value: string; text: string } | null; copy: string }`.

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/locator-story.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { deriveLocatorStory } from "../src/locator-story";

const few = [
  { lon: 2.35, lat: 48.85, label: "Eiffel Tower", note: "Opening ceremony start" },
  { lon: 2.34, lat: 48.86, label: "Louvre", note: "Riverfront stage" },
];
const many = [
  { lon: 2.35, lat: 48.85, label: "A", category: "port" },
  { lon: 9.19, lat: 45.46, label: "B", category: "port" },
  { lon: 12.5, lat: 41.9, label: "C", category: "cultural" },
];

describe("deriveLocatorStory", () => {
  it("few-regime: title + establish + one reveal per place + takeaway", () => {
    const beats = deriveLocatorStory(few, { title: "Where the ceremony unfolded" });
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBe(2);
    expect(beats[beats.length - 1].kind).toBe("takeaway");
  });

  it("few-regime reveal copy uses the marker note (falls back to label)", () => {
    const beats = deriveLocatorStory(few, { title: "Where the ceremony unfolded" });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[0].copy).toBe("Opening ceremony start");
    expect(reveals[0].highlight).toEqual(["Eiffel Tower"]);
  });

  it("categorized-regime: one reveal per category (not per marker)", () => {
    const beats = deriveLocatorStory(many, { title: "Landmark sites across Europe" });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBe(2); // "cultural" + "port", NOT 3 markers
    // categories are sorted; each reveal highlights all its markers and states the count
    expect(reveals[0].copy).toContain("cultural");
    const portReveal = reveals.find((r) => r.copy.includes("port"));
    expect(portReveal?.highlight.sort()).toEqual(["A", "B"]);
  });

  it("caps the reveals at maxReveals", () => {
    const beats = deriveLocatorStory(few, { title: "Where the ceremony unfolded" }, { maxReveals: 1 });
    expect(beats.filter((b) => b.kind === "reveal").length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/locator-story.test.ts`
Expected: FAIL — `deriveLocatorStory` not exported.

- [ ] **Step 3: Write the implementation**

Create `skills/map-native/src/locator-story.ts`:

```typescript
// Beat derivation for locator videos — the sibling of deriveSymbolStory. Two regimes:
// few-annotated (a beat per PLACE, camera on a tight box, caption = the marker note) and
// categorized (a beat per CATEGORY, camera on that category's markers, caption = category + count).
// title → establish (all markers) → reveals → takeaway. Same Beat shape as choropleth/symbol.
import type { Beat } from "./map-story";
import type { LocatorMarker } from "./locator-geo";
import { computeChoropleth } from "./choropleth-geo"; // (unused import guard removed below)

export interface LocatorStoryMeta {
  title: string;
  description?: string;
  insight?: string;
}

const CITY_DELTA = 1.5; // half-width (deg) of a tight place-framing box
const DEFAULT_MAX_REVEALS = 5;

function bboxOf(ms: LocatorMarker[]): [number, number, number, number] {
  const lons = ms.map((m) => m.lon);
  const lats = ms.map((m) => m.lat);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

export function deriveLocatorStory(
  markers: LocatorMarker[],
  meta: LocatorStoryMeta,
  opts: { maxReveals?: number } = {},
): Beat[] {
  const cap = Math.max(1, opts.maxReveals ?? DEFAULT_MAX_REVEALS);
  const allBounds = bboxOf(markers);

  const beats: Beat[] = [];
  beats.push({ kind: "title", camera: allBounds, highlight: [], dim: false, callout: null, copy: meta.title });
  beats.push({ kind: "establish", camera: allBounds, highlight: [], dim: false, callout: null, copy: "" });

  const categories = [
    ...new Set(markers.map((m) => m.category).filter((c): c is string => !!c && c.trim().length > 0)),
  ].sort();

  if (categories.length > 0) {
    // Categorized regime: a beat per category (capped).
    for (const cat of categories.slice(0, cap)) {
      const inCat = markers.filter((m) => m.category === cat);
      const count = inCat.length;
      const text = `${cat} — ${count} ${count === 1 ? "site" : "sites"}`;
      beats.push({
        kind: "reveal",
        camera: bboxOf(inCat),
        highlight: inCat.map((m) => m.label),
        dim: true,
        callout: { region: cat, name: cat, value: `${count}`, text },
        copy: text,
      });
    }
  } else {
    // Few-annotated regime: a beat per place (capped), caption = note ?? label.
    for (const m of markers.slice(0, cap)) {
      const copy = m.note?.trim() ? m.note : m.label;
      beats.push({
        kind: "reveal",
        camera: [m.lon - CITY_DELTA, m.lat - CITY_DELTA, m.lon + CITY_DELTA, m.lat + CITY_DELTA],
        highlight: [m.label],
        dim: true,
        callout: { region: m.label, name: m.label, value: "", text: copy },
        copy,
      });
    }
  }

  beats.push({
    kind: "takeaway",
    camera: allBounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.insight && meta.insight !== meta.title ? meta.insight : "",
  });

  return beats;
}
```

Remove the unused `computeChoropleth` import line — it is not needed; it is listed only to warn you
NOT to add stray imports. The file imports only `Beat` and `LocatorMarker` (both type-only).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/locator-story.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the `locator` branch to `scrollyStepCount`**

In `skills/map-native/src/route-story.ts`, `scrollyStepCount` currently branches on `config.type ===
"route"` / `"symbol"` / else (choropleth). Add a `locator` branch BEFORE the symbol branch:

```typescript
if (config.type === "locator") {
  const beats = deriveLocatorStory(config.markers, {
    title: config.title ?? "",
    description: config.description,
    insight: config.insight ?? config.title ?? "",
  });
  return mapStoryToChapters(beats, {
    title: config.title ?? "",
    description: config.description,
    source: config.source,
    regionsWithData: config.markers.length,
  }).steps.length;
}
```

Add the import at the top of `route-story.ts`: `import { deriveLocatorStory } from "./locator-story";`.
(`mapStoryToChapters` is already imported there.)

- [ ] **Step 6: Run the full suite**

Run: `cd skills/map-native && bun test`
Expected: all pass (Slice A's 201 + the new locator-story tests).

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/locator-story.ts skills/map-native/src/route-story.ts skills/map-native/tests/locator-story.test.ts
git commit -m "feat(map-native): deriveLocatorStory (per-place / per-category beats) + scrolly step count"
```

---

## Task 2: LocatorReveal + LocatorStory + Root + produce + render-verify

**Files:**
- Create: `skills/map-native/src/components/LocatorReveal.tsx`, `LocatorStory.tsx`
- Modify: `skills/map-native/remotion/src/Root.tsx`, `skills/map-native/scripts/produce.mjs`

**Interfaces:**
- Consumes: `deriveLocatorStory` (Task 1), `locatorGeometry` (Slice A), `resolveMapStyle` (route-geo), `easedRevealProgress`/`revealCameraPlan`/`REVEAL_FRAMES` (reveal), `resolveScene`/`TITLE_SCENE_FRAMES` (video-scene), `buildTimeline`/`cameraForFrame` (story-timeline), `TitleCard`/`CaptionCard` (StoryCards), `MapFrame`/`resolveMapFrame`, `placeLabels`/`labelRadialOffset` (locator-labels).
- Produces: `LocatorReveal`, `LocatorStory` React components `{ config: LocatorConfigShape }`.

### LocatorReveal — port `skills/map-native/src/components/SymbolReveal.tsx` (read it fully). Deltas:
1. **Geometry from `locatorGeometry(config)`** (not `symbolGeometry`). Features carry `{ label, color, category, note, priority, labelText, labelOffset, __showLabel }`.
2. **Glyph layer is uniform-size** — a `circle` layer (dot mode) with a FIXED radius ramped ONLY by
   progress: `"circle-radius": ["*", 6, progress]`, `"circle-color": ["get","color"]`, white stroke.
   (For pin/icon `markerStyle`, use a symbol `icon-image` layer with `icon-opacity`/size ramped by
   progress; keep the port simple — dot is the reveal default. Do NOT scale by any value field.)
3. **mapStyle-adaptive** via `resolveMapStyle(config.mapStyle)` → DATAVIZ.DARK/LIGHT + adapt label ink
   (dark: near-white ink + dark halo; light: dark ink + white halo). Background matches.
4. **Labels via `placeLabels`** (Slice A's declutter), not `text-optional` culling: project markers,
   build boxes, set `__showLabel`, filter the label layer on it; `text-opacity` ramps with progress.
5. Keep the fixed-camera `revealCameraPlan(geo.bounds)` + title scene + MapFrame furniture unchanged.

### LocatorStory — port `skills/map-native/src/components/SymbolStory.tsx` (read it fully). Deltas:
1. Beats from `deriveLocatorStory(config.markers, meta)` (not `deriveSymbolStory`); meta from config.
2. Glyph rendering as in LocatorReveal (uniform circle/icon, `["get","color"]`, mapStyle-adaptive) —
   markers all visible; the "reveal" is the camera flying to each beat's `camera` + the highlighted
   markers emphasised (highlight stroke / opacity) synced to the beat, and the caption (`CaptionCard`
   / callout) showing the beat `copy`. Reuse SymbolStory's `buildTimeline`/`cameraForFrame` +
   `resolveScene` title scene + StoryCards exactly.
3. Category legend rendered when the config has categories (reuse the Slice A legend model from
   `locatorGeometry`); none otherwise. Never a size legend.

- [ ] **Step 1: Write `LocatorReveal.tsx`** per the deltas. Verify `grep -c $'\\x00'` = 0.

- [ ] **Step 2: Write `LocatorStory.tsx`** per the deltas. Verify NUL-free.

- [ ] **Step 3: Register compositions in `Root.tsx`**

Mirror the Symbol registrations. Add imports and 6 compositions:
```tsx
import { LocatorReveal } from "../../src/components/LocatorReveal";
import { LocatorStory } from "../../src/components/LocatorStory";
import { deriveLocatorStory } from "../../src/locator-story";
import sampleLocator from "../../assets/sample-data/locator-many.json";
```
Derive the story-frame count from the sample (mirror `SYMBOL_FRAMES`):
```tsx
const sampleLocatorBeats = deriveLocatorStory(sampleLocator.markers, {
  title: sampleLocator.title ?? "",
  insight: (sampleLocator as any).insight ?? sampleLocator.title ?? "",
});
const LOCATOR_STORY_FRAMES = buildTimeline(sampleLocatorBeats.map((b) => b.kind), 30).totalFrames;
const locatorDefaultProps = { config: sampleLocator };
```
Register `LocatorReveal{,Square,Portrait}` (durationInFrames `REVEAL_FRAMES + TITLE_SCENE_FRAMES`) and
`LocatorStory{,Square,Portrait}` (durationInFrames `LOCATOR_STORY_FRAMES`), at 1280×720 / 1080×1080 /
1080×1350, `defaultProps={locatorDefaultProps}`. (`REVEAL_FRAMES`, `TITLE_SCENE_FRAMES`, `buildTimeline`
are already imported in Root.tsx.)

- [ ] **Step 4: Wire `produce.mjs`**

Replace Slice A's `const kinds = isLocator ? [] : …` so locator gets reveal + story (+ scrolly in Task
3). For now (reveal + story land in this task; scrolly in Task 3), use:
```js
const kinds = isLocator
  ? (format === "static" ? [] : format === "reveal" ? ["reveal"] : format === "story" ? ["story"] : format === "scrolly" ? ["scrolly"] : format === "all" ? ["reveal", "story", "scrolly"] : [])
  : isRoute ? (/* unchanged */) : (/* unchanged */);
```
Add locator to `VIDEO_COMPS.reveal` and the `storyComps` dispatch:
```js
// VIDEO_COMPS.reveal — add a locator arm:
reveal: isLocator
  ? [["LocatorReveal","landscape"],["LocatorRevealSquare","square"],["LocatorRevealPortrait","portrait"]]
  : isSymbol ? [/* symbol */] : [/* choropleth */],
```
```js
// storyComps(): add, in the guided-tour branch, a locator arm returning
// [["LocatorStory","landscape"],["LocatorStorySquare","square"],["LocatorStoryPortrait","portrait"]].
```
(Locator's cameraMode is the default `guided-tour`.)

- [ ] **Step 5: Typecheck + full test suite**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: clean tsc (apart from pre-existing react-dom TS2688); all tests pass.

- [ ] **Step 6: Render-verify reveal + story, both regimes, 3 sizes**

```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
for CFG in locator-few locator-many; do
  node -e "const fs=require('fs');fs.writeFileSync('/tmp/lb-$CFG.json',JSON.stringify({config:JSON.parse(fs.readFileSync('assets/sample-data/$CFG.json','utf8'))}))"
done
# smoke: landscape reveal + story for each regime, then square/portrait
for C in LocatorReveal LocatorStory; do
  bunx remotion render remotion/src/index.ts $C /tmp/lb/few-$C.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/lb-locator-few.json
  bunx remotion render remotion/src/index.ts $C /tmp/lb/many-$C.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/lb-locator-many.json
done
```
Commit the code BEFORE rendering (renders are slow). Capture a mid still per composition and confirm:
reveal = glyphs fade/grow in on a fixed frame, title scene played, mapStyle correct; story = camera
flies to each place (few) / category (many), caption shows the note/category, category legend on the
many case. If a render exceeds ~8 min, STOP and report DONE_WITH_CONCERNS with what completed.

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/components/LocatorReveal.tsx skills/map-native/src/components/LocatorStory.tsx skills/map-native/remotion/src/Root.tsx skills/map-native/scripts/produce.mjs
git commit -m "feat(map-native): locator video reveal + storytelling (per-place/per-category beats) + wiring"
```

---

## Task 3: LocatorScrolly + MapScrolly dispatch + scrolly wiring + render-verify

**Files:**
- Create: `skills/map-native/src/components/LocatorScrolly.tsx`
- Modify: `skills/map-native/src/components/MapScrolly.tsx`, `skills/map-native/remotion/src/Root.tsx` (calculateMetadata), `skills/map-native/scripts/produce.mjs` (scrolly already added in Task 2's kinds)

**Interfaces:**
- Consumes: `deriveLocatorStory` + `mapStoryToChapters` (locator → ScrollyStory), `locatorScrollyStepCount`/`scrollyStepCount` locator branch (Task 1), `ScrollyPanel`/`stepSlide` (scrolly), `locatorGeometry`, `resolveMapStyle`, the flyTo scrolly pattern.
- Produces: `LocatorScrolly` React component `{ config }`.

### LocatorScrolly — port `skills/map-native/src/components/SymbolScrolly.tsx` (read it + ChoroplethScrolly for `stepSlide`). Deltas:
1. Beats from `deriveLocatorStory(config.markers, meta)`; `story = mapStoryToChapters(beats, {...})`;
   step timeline as in SymbolScrolly (step 0 = title, rest = reveal). Camera per step = the beat's
   camera solution (fit each beat's `camera` bbox), driven by `cameraForFrame`.
2. Glyph rendering as LocatorReveal/LocatorStory (uniform circle/icon, `["get","color"]`,
   mapStyle-adaptive). The per-step data emphasis (highlighted markers for that beat) ramps in synced
   to the panel slide-in (reuse SymbolScrolly's synced-reveal approach).
3. `ScrollyPanel` per reveal step (prose = beat copy = note/category); overview (establish) + takeaway
   render no panel (visual only), matching the cho/sym scrolly convention.
4. Category legend when categories present.

- [ ] **Step 1: Write `LocatorScrolly.tsx`** per the deltas. Verify `grep -c $'\\x00'` = 0.

- [ ] **Step 2: Dispatch in `MapScrolly.tsx`**

Add before the choropleth fallback: `if (config?.type === "locator") return <LocatorScrolly config={config} />;`
and `import { LocatorScrolly } from "./LocatorScrolly";`.

- [ ] **Step 3: `calculateMetadata` already handles locator**

`Root.tsx`'s `MapScrolly` compositions use `scrollyFrames(scrollyStepCount(props.config, world), 30)`.
Task 1 added the `locator` branch to `scrollyStepCount`, so the existing `MapScrolly{,Square,Portrait}`
compositions size a locator config correctly — no new Root composition needed. Confirm by reading the
current `scrollyMeta` in Root.tsx (do not duplicate compositions).

- [ ] **Step 4: Typecheck + full test suite**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: clean; all pass.

- [ ] **Step 5: Render-verify scrolly, both regimes, 3 sizes**

```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
for C in MapScrolly MapScrollySquare MapScrollyPortrait; do
  bunx remotion render remotion/src/index.ts $C /tmp/lb/few-$C.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/lb-locator-few.json
  bunx remotion render remotion/src/index.ts $C /tmp/lb/many-$C.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/lb-locator-many.json
done
```
Commit BEFORE rendering. Confirm the scrolly panel advances per place (few) / per category (many), the
data emphasis syncs to the panel, overview/takeaway are panel-free, mapStyle correct. Same slow-render
stop rule.

- [ ] **Step 6: Note — interactive scrolly is now available**

`deriveLocatorStory → mapStoryToChapters` is the same contract the sibling `scrolly` skill consumes, so
the interactive locator scrolly works via that skill with no map-native change. No code step here; the
KB (Task 4) documents it.

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/components/LocatorScrolly.tsx skills/map-native/src/components/MapScrolly.tsx
git commit -m "feat(map-native): locator scrolly video (per-place/per-category) via MapScrolly dispatch"
```

---

## Task 4: KB + SKILL roadmap + final matrix

**Files:**
- Modify: `knowledge/references/map/types/locator.md`, `knowledge/references/map/formats/*.md` (as relevant), `skills/map-native/SKILL.md`

- [ ] **Step 1: Update the locator KB type doc** — change the Slice-A/B scope note: video (reveal +
  storytelling + scrolly) and interactive scrolly are now SHIPPED. State the two story regimes
  (per-place with note; per-category with count). Remove any "not yet implemented" video caveat.

- [ ] **Step 2: Note locator in the format KB docs** — in `formats/video-reveal.md`,
  `video-storytelling.md`, `video-scrolly.md`, add locator to the per-type coverage where those docs
  enumerate types (a line each; do not restructure).

- [ ] **Step 3: Refresh SKILL.md roadmap** — mark the locator row's video as built (all six formats
  now shipped for locator). Do not restructure the table.

- [ ] **Step 4: Final full test suite + matrix confirmation**

Run: `cd skills/map-native && bun test` (all pass). Then confirm produce emits the locator video block
end-to-end for one regime:
```bash
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
bun scripts/produce.mjs assets/sample-data/locator-many.json /tmp/lb/prod all
```
Expected: `PRODUCE_RESULT` with `reveal`, `story`, `scrolly` blocks (each `{landscape,square,portrait}`)
plus the static/interactive snaps.

- [ ] **Step 5: Commit**

```bash
git add knowledge/references/map/types/locator.md knowledge/references/map/formats/ skills/map-native/SKILL.md
git commit -m "docs(map-native): locator video shipped — KB + roadmap (all six formats)"
```

---

## Self-Review

**Spec coverage (Slice B):** `deriveLocatorStory` two regimes → Task 1; reveal + storytelling → Task 2;
scrolly video + interactive scrolly (shared contract) → Task 3; KB + roadmap → Task 4. `calculateMetadata`
duration via the `scrollyStepCount` locator branch (Task 1) reused by the existing MapScrolly comps
(Task 3). All formats reach 3 sizes. Uniform-marker invariant restated for the video glyph.

**Placeholder scan:** Task 1 (pure story core) carries complete code + tests. Tasks 2-3 (components)
port named sibling components with enumerated deltas — complete-by-reference to real in-repo code, the
established pattern; the render steps give exact commands. No "TBD". The `computeChoropleth` line in the
Task 1 code block is explicitly called out to be removed (a deliberate stray-import guard).

**Type consistency:** `deriveLocatorStory(markers, meta, opts?)`, `LocatorStoryMeta`,
`locatorScrollyStepCount`, `LocatorReveal`/`LocatorStory`/`LocatorScrolly`, and the `scrollyStepCount`
locator branch names are consistent across tasks. `Beat` shape matches `map-story.ts`. Composition ids
`LocatorReveal*`/`LocatorStory*` match between Root (Task 2) and produce (Task 2); `MapScrolly*` (Task 3)
reuse the existing scrolly comps. Regime detection (category presence) is consistent between
`deriveLocatorStory` and the scrolly step count.

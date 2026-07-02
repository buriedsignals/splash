# SP4 — Map Scrolly-as-Video Design

**Date:** 2026-07-01
**Status:** Approved (design phase)
**Depends on:** SP1 (simple-reveal), SP2 (storytelling parity + camera-modes), SP-scene-model, SP3a (route type), SP3b (route-reveal video)

## Goal

Add the last missing video format to the map-native engine: **scrolly-as-video** — the
interactive map-scrolly experience captured as a deterministic MP4 in 3 sizes
(landscape / square / portrait), for all three map types (choropleth, symbol, route).

The video is faithful to the interactive scrolly on **both** axes:
- **Content**: it consumes the same `ScrollyStory` (same chapters, same prose with rank
  descriptors) the interactive scrolly renders — the interactive version and the video tell
  the identical story.
- **Look**: a scrolling text column with a pinned map that reacts per step, honoring the
  per-step actions `flyTo` (choropleth/symbol) and `drawTo` (route).

This is a genuinely new format, not a re-skin of the existing guided-tour storytelling video.

## Non-goals

- No new camera-movement mode. Scrolly-video reuses the `guided-tour` camera pipeline
  (`buildTimeline` / `cameraForFrame`) plus the `route-reveal` draw-on for `drawTo` steps.
  The distinction "scrolly vs storytelling" is about **presentation** (scrolling text column)
  and **content source** (locked to `ScrollyStory`), not about how the camera moves.
- No `crossfade` action (that is the image visual; out of scope for the maps engine).
- No wiring of the interactive route-scrolly into the sibling `scrolly` skill. SP4 defines
  the shared `routeStoryToChapters` contract; consuming it interactively is a follow-up that
  becomes nearly free once the contract exists.
- No change to the existing `reveal` or `story` formats.

## Architecture

### Data flow

```
config (type + data)
   │
   ├─ choropleth → deriveMapStory ──┐
   ├─ symbol     → deriveSymbolStory ┼─→ Beat[] ─→ mapStoryToChapters ─┐
   │                                                                    ├─→ ScrollyStory
   └─ route → computeRouteReveal ─→ RouteRevealLayout ─→ routeStoryToChapters ┘
                                                                         │
                                                          MapScrolly.tsx (Remotion, 3 sizes)
```

- **choropleth / symbol**: nothing new narratively. The derived `Beat[]` passes through the
  existing `mapStoryToChapters` (sibling `scrolly` skill, `src/chapters.ts`) → `ScrollyStory`
  with `action: "flyTo"` steps.
- **route**: a **new** converter `routeStoryToChapters(layout, meta) → ScrollyStory` produces
  one `action: "drawTo"` step per crossed territory (plus an intro step), reusing the
  `stop` / `border` / `anchor` fields already computed by `computeRouteReveal`. No change to
  the `ScrollyStep` type — `drawTo` and `ref` already exist in it.

### The `ScrollyStory` / `ScrollyStep` contract (existing — do not modify)

Defined in `skills/scrolly/src/chapters.ts`:

```typescript
export type StepAction = "flyTo" | "drawTo" | "crossfade";

export interface ScrollyStep {
  id: string;
  visual: VisualKind;              // "map" for this engine
  action: StepAction;              // "flyTo" | "drawTo"
  ref: number | string;            // flyTo: beat index; drawTo: territory index
  prose: string;
  align?: "left" | "right" | "center";
}

export interface ScrollyStory {
  title: string;
  description?: string;
  source?: { name: string; url: string };
  visual: VisualKind;
  steps: ScrollyStep[];
}
```

For `flyTo`, `ref` is the beat index (as `mapStoryToChapters` already sets it). For `drawTo`,
`ref` is the territory index into `RouteRevealLayout.territories`; the renderer looks up that
territory's `stop` (entry arc-length fraction).

## Components & presentation

One new Remotion component, `MapScrolly.tsx`, dispatches by `config.type` internally and
orchestrates existing, battle-tested building blocks:

| Block | Reused from | Role in scrolly-video |
|---|---|---|
| `buildTimeline` / `cameraForFrame` | `src/story-timeline.ts` | per-step pacing + `flyTo` camera (steps → phases) |
| electric draw-head (glow/core/head) | `src/components/RouteReveal.tsx` | `drawTo`, bounded to the current step's `stop` |
| `resolveScene` | `src/video-scene.ts` | opening title scene |

### Scroll model (the "look")

Pacing is step-based, reusing `buildTimeline` phase durations. For step `i`:

1. **Move phase**: the prose panel for step `i` slides up from below into the pinned reading
   zone; simultaneously the map transitions (`flyTo` to the beat camera, or `drawTo` advances
   the draw-head from `stop[i-1]` → `stop[i]`).
2. **Hold phase**: the panel is pinned in the reading zone; the map is settled.
3. On entry of step `i+1`, panel `i` slides up and out as panel `i+1` slides in.

The scroll position is derived deterministically from `frame` via the existing timeline
(`cameraForFrame` returns `beatIndex` + intra-phase progress); no `Date.now`/`Math.random`.

### Three sizes

- **Landscape 1280×720**: side text column. Honors per-step `align` (left / right / center);
  the slide-transition between panels absorbs any side change. Map fills the frame.
- **Square 1080×1080** and **Portrait 1080×1350**: bottom pinned caption card that advances
  per step (side columns do not fit these aspect ratios). `align` collapses to bottom.

`ScrollyPanel.tsx` is extracted so the panel (side column vs bottom card, prose typography,
slide animation) stays a focused, independently testable unit.

### `drawTo` for route

At step `i` (territory `i`), the route line is drawn up to territory `i`'s `stop` fraction.
During the move phase the draw-head animates from `stop[i-1]` (or 0 for the first) to
`stop[i]`. The camera frames the bounds of (route-drawn-so-far ∪ current territory) via
`cameraForBounds`. This reuses `RouteReveal`'s draw-head rendering; only the target
arc-length is fed per step instead of a single continuous sweep.

## File structure

**Create:**
- `skills/map-native/src/route-story.ts` — `routeStoryToChapters(layout, meta) → ScrollyStory`
  and `scrollyFrames(stepCount, fps) → number` (total frames incl. title scene).
- `skills/map-native/src/components/MapScrolly.tsx` — the type-dispatching scrolly component.
- `skills/map-native/src/components/ScrollyPanel.tsx` — prose panel (side column / bottom card).
- `skills/map-native/knowledge/references/map/formats/video-scrolly.md` — KB reference.
- `skills/map-native/tests/route-story.test.ts`
- `skills/map-native/tests/scrolly-contract.test.ts`

**Modify:**
- `skills/map-native/remotion/src/Root.tsx` — register `MapScrolly`, `MapScrollySquare`,
  `MapScrollyPortrait` (1280×720 / 1080×1080 / 1080×1350), `durationInFrames` from
  `scrollyFrames`.
- `skills/map-native/scripts/produce.mjs` — new `format: "scrolly"` → the 3 compositions,
  dispatched for all 3 types. `scrolly` is a first-class value of the format selector
  (`static | reveal | story | scrolly | all`); `all` includes `scrolly`. Route's format
  matrix, previously `story`-only, gains `scrolly` (route has no `static`/`reveal` video).
- `skills/map-native/src/validate-config.ts` — validate the scrolly contract when the scrolly
  format is requested (steps present or derivable, prose non-empty, refs in range).
- `skills/map-native/src/conformance.ts` — `checkScrollyConformance`.
- `skills/map-native/SKILL.md` — document the scrolly format.

## Error handling & edge cases

- **No explicit `steps`**: derive them (choropleth/symbol via `mapStoryToChapters`, route via
  `routeStoryToChapters`) — same fallback posture as the `story` format.
- **`ref` out of range** (`drawTo` territory index or `flyTo` beat index): clamp to valid
  range and log a warning; never throw mid-render.
- **Empty prose on a step**: conformance forbids it upstream; the renderer additionally skips
  a step whose prose is empty so a blank panel never appears.
- **Single-step story** (e.g., a route crossing one territory): valid; the video is intro +
  one panel; `scrollyFrames` handles `stepCount === 1`.
- **Frame determinism**: pure `f(frame)`; MapTiler `jumpTo`/`setData` → `map.once("idle")` →
  `continueRender`, `--gl=angle --concurrency=1`, world geojson via plain JSON import.

## Testing

- `route-story.test.ts`: `routeStoryToChapters` emits one `drawTo` step per territory plus an
  intro step; prose non-empty on every step; `ref` values ascending and in range;
  `scrollyFrames` grows with step count and includes the title scene.
- `scrolly-contract.test.ts`: `checkScrollyConformance` accepts a well-formed story and
  rejects empty prose, out-of-range refs, and unknown actions.
- **Render verification** (manual, sequential, `--gl=angle --concurrency=1`): all 3 types ×
  3 sizes, capturing stills at frame 0 / middle / final to confirm title scene, panel
  advance, map transition (`flyTo` / `drawTo`), and no viewport overflow.

## Global constraints

- Runtime: **Bun** always (never npm/node).
- Code, comments, commits, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer in
  any commit / PR / file / README / doc.
- MapTiler key + Datawrapper token live in `atelier/.env` (gitignored) — never commit/log the
  value.
- Frame-deterministic Remotion: no `Date.now` / `Math.random` / argless `new Date()`.
- Reuse existing building blocks (camera pipeline, draw-head, title scene); do not fork them.

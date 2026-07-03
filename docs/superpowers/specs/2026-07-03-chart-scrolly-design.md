# Chart scrollytelling — design

## Goal

Add a **chart** visual track to the scrolly engine so a chart (not only a map) can be
the sticky graphic of a scroll-driven story. Closes the one remaining producer gap
surfaced by the workflow tests: the `scrolly` engine is map-only, and `chart-native`
ships static/interactive/video but no scrolly. After this, suggest-chart's Gate 3 can
route a chart story to a real scrollytelling output.

## Context (what already exists)

- **Scrolly engine** (`skills/scrolly`): a sticky-graphic scaffold. `Scrolly.tsx` builds a
  `ScrollyStory` (chapters) from config via `derive<Type>Story` → `mapStoryToChapters`,
  then dispatches to a `Scrolly<Type>Map` sticky component driven by `currentStep` (an
  IntersectionObserver picks the step). `Scrolly.tsx`'s own comment anticipates this work:
  "to add a `chart` track, switch on `story.visual`; the step model (`ScrollyStep.visual`)
  already carries the per-step visual kind."
- **chart-native** components are each driven by a single `progress` prop (0→1) — the
  reveal — and support highlighting: `LineChart`(reveal via `revealLine`/`revealHead`),
  `BarChart`(`highlightIndex` + progress), `ScatterChart`(named story points to label +
  progress). These are reused verbatim; no new chart rendering is written.
- **F11 ranking** (`map-native/src/map-story.ts`): `magnitudeRevealRows` (leaders + tail)
  and rank-aware captions already exist and are reused for the bar track's beat order.

## Non-goals

- No new chart TYPES or chart rendering — only the three already mapped by
  `chart-native/src/spec-to-config.ts` (line, bar, scatter). Pie is excluded (a part-to-
  whole pie does not scroll well).
- No change to the map scrolly track, to chart-native's static/interactive/video paths,
  or to the IntersectionObserver scaffold.
- No suggester (②) routing changes in this spec — this builds the PRODUCER; wiring Gate 3
  to emit a chart-scrolly config is a separate, later change.

## Architecture

A chart track that mirrors the map track, in three isolated units:

### 1. `deriveChartStory(spec) → ChartBeat[]` (chart-native, pure)

Deterministic from the chart spec. Emits the ordered beats:
- **title** — copy = spec.title; no reveal.
- **establish** — the whole chart visible (line at progress 1, or all bars/points), no
  per-item highlight; copy = the description (see all the data first).
- **reveal** beats, per chart kind:
  - **line**: progressive reveal to the data's NOTABLE points (first, the biggest
    jumps/peaks, the most recent) — reuse the existing `temporalRevealRows` selection.
    Each beat carries `progress` = the point's x-fraction (0→1) so the line draws to it.
  - **bar**: the ranked bars — reuse `magnitudeRevealRows` (leader, 2nd, 3rd, tail). Each
    beat carries `highlightIndex` (post-sort) so that bar is highlighted, others dimmed.
  - **scatter**: the story points named by ② (`spec.labels`/outliers). Each beat carries
    `labelKey` (the point's label value) so only that point is labelled/highlighted.
- **takeaway** — full chart again; copy = spec.insight.

Captions are rank-aware / data-tied (the same discipline as F11): "X leads", "the 2nd",
"the long tail", or for line the informative first/peak/most-recent descriptors — never a
bare "then".

### 2. `chartStoryToChapters(beats, meta) → ScrollyStory` (scrolly, pure)

The chart analog of `mapStoryToChapters`. Emits `ScrollyStep{ id, visual:"chart", action,
ref, prose, align }`. `action` is `"drawTo"` for line reveals and `"crossfade"`/highlight
for bar/scatter (the existing `StepAction` union already lists these). `ref` is the beat
index. Prose is the beat's caption. Title + establish steps carry the description; the
takeaway carries the insight — same structure as the map version.

### 3. `ScrollyChart` component (scrolly, sticky graphic)

`Props { config; currentStep }`. Builds the chart config once (via chart-native's
`specToNativeConfig`), maps `currentStep → the beat`, and drives the chart-native
component:
- **line** → `<LineChart progress={beat.progress ?? 1} .../>`.
- **bar** → `<BarChart progress={1} highlightIndex={beat.highlightIndex} .../>`.
- **scatter** → `<ScatterChart progress={1} labels={beat.labelKey ? [beat.labelKey] : []} .../>`.
Non-highlighted items are dimmed by the chart-native component's existing highlight
support (so no new dim logic). At `establish`/`takeaway`, no highlight / full reveal.

### Data model

A dedicated `ChartBeat { kind: "title"|"establish"|"reveal"|"takeaway"; progress?: number;
highlightIndex?: number; labelKey?: string; callout: {name,value,text}|null; copy: string;
rank?: number; rankRole?: "leader"|"tail" }`. It is NOT the map `Beat` (which carries a
`camera` bbox), keeping the two tracks isolated — a chart has no camera, a map has no
progress/highlightIndex.

### Wiring

- `Scrolly.tsx`: a top-level `switch` on the config's visual kind. A chart config (a
  chart-native `NativeSpec` with `producer:"chart-native"` + a `scrolly:true`/kind marker)
  builds the chart story + renders `<ScrollyChart>`; everything else keeps the existing map
  dispatch. The story build for a chart needs NO geojson.
- `mount.tsx`: dispatch chart configs to the chart path.
- `produce.mjs` (scrolly): unchanged mechanics (Vite single-file build bakes the config);
  a chart config produces a smaller bundle (no world.geojson inlined).

## Data flow

`chart NativeSpec` → `specToNativeConfig` (type + config) → `deriveChartStory` (ChartBeat[])
→ `chartStoryToChapters` (ScrollyStory) → `Scrolly` renders prose steps + sticky
`ScrollyChart` → IntersectionObserver sets `currentStep` → `ScrollyChart` maps step→beat →
drives `LineChart`/`BarChart`/`ScatterChart` by `progress`/`highlightIndex`/`labels`.

## Error handling

- An unsupported chart type (not line/bar/scatter) → `deriveChartStory` throws a clear
  error ("chart-scrolly supports line, bar, scatter; got <type>") so the caller can route
  to a non-scrolly output. Mirrors `spec-to-config`'s loud fallback.
- A spec with fewer than the scrolly minimum (Gate 3 wants 4+ discrete states) is still
  produced but `deriveChartStory` emits whatever beats the data supports (title +
  establish + N reveals + takeaway); no invented beats.

## Testing

- **Pure unit tests**: `deriveChartStory` — line beats reveal notable points in x-order
  with increasing `progress`; bar beats = leaders+tail with correct `highlightIndex` and
  rank-aware copy; scatter beats carry the named `labelKey`s; unsupported type throws.
  `chartStoryToChapters` — title/establish carry the description, takeaway the insight,
  reveal steps carry rank-aware prose, `visual:"chart"`.
- **Smoke test** (headless): build a line chart-scrolly, load it, assert the chart SVG
  renders, and that advancing `currentStep` changes the drawn `progress` (the reveal
  head moves); repeat for a bar scrolly (a different bar highlighted per step).
- **Render-verify** (controller): scroll each of a line, bar, and scatter chart-scrolly
  and confirm the reveal/highlight tracks the prose, light build, at desktop + mobile.

## Decomposition (two slices, each a working chart-scrolly)

- **Slice A — LINE reveal**: `ChartBeat` model, `deriveChartStory` (line), `chartStoryTo
  Chapters`, `ScrollyChart` (line dispatch), `Scrolly.tsx` + `mount.tsx` wiring, produce,
  smoke, render-verify. Ships a working line chart-scrolly.
- **Slice B — BAR + SCATTER highlight**: extend `deriveChartStory` (bar via
  `magnitudeRevealRows`, scatter via named points), `ScrollyChart` bar/scatter dispatch,
  tests, render-verify. Ships bar + scatter chart-scrollies.

Each slice is spec-complete and independently testable; Slice A is the exemplar Slice B
follows.

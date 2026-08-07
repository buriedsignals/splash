---
name: scrolly
description: "Use to build a SCROLL-DRIVEN interactive (scrollytelling) where the reader scrolls and a sticky graphic advances through narrative steps. A thin ORCHESTRATOR engine — it owns the scroll scaffold, the chapters[] storyboard, and the step dispatcher; it imports the visual renderers from the other engines. Three tracks ship: the MAP track (reusing map-native's mapStory), the CHART track (chart-native's renderers, via `nativeType`), and the IMAGE track (via `visual`). Keywords scrollytelling, scrolly, scroll, sticky graphic, waypoints, flyTo, chapters, steps, IntersectionObserver, scrollama, map scrolly, chart scrolly, image scrolly, narrative, interactive, newsroom, prose, storyboard."
---

# scrolly — the scrollytelling orchestrator

## What it is

A **scroll-driven** interactive: a sticky graphic (a map, later a chart) stays pinned while prose
**steps** scroll past; as each step crosses the viewport, the graphic advances (the map flies to that
beat). The engine is an **orchestrator** — it knows about *scrolling*, not *drawing*. It owns the scroll
scaffold + the `chapters[]` storyboard + the `onStepEnter` dispatcher, and **imports** the visual
renderers from the other engines. It never re-implements a map or a chart.

This is the second interactive format alongside map-native's free-explore interactive. The narrative
**video** comes from the SAME `mapStory` via map-native — so one storyboard yields both motion (video)
and scroll (this engine): one story, two outputs.

## Embeddable module — self-contained, data-tied, never article text

A scrolly is a **module embedded into a newsroom's article** to support it — NOT the article itself, and
NOT a transform of the whole article. So (grounded in `docs/splash/embeddable-module-best-practices.md`):

- **Captions are data-tied and self-contained** — derived from the data + the insight, NEVER pulled from
  the article (verbatim excerpts duplicate the prose and bloat the module; embeds also circulate out of
  context and must stand alone). Reveal captions add the rank that matters
  ("Norway — 99%, the highest of the 8 shown" / "Poland — 21%, the lowest"), generated from the
  `mapStory` max→min order in `mapStoryToChapters`; the journalist edits them downstream.
- **Comparative/rank claims in a caption MUST match the data ordering.** Any step caption asserting a
  rank or comparison — "devant" / "ahead of", "top 3", "the highest", "the lowest" — is checked against
  the ACTUAL sorted values BEFORE production: the named entity must really hold the asserted position
  relative to EVERY entity it is compared to (a shipped beat caption claimed a value ranked "devant"
  two others while it was LOWER than both — the caption inverted the on-screen order). Auto-generated
  rank captions derive from the real sort; a journalist-edited caption or an explicit-`beats` `text`
  gets the SAME check, and the orchestrator's render-review (splash Gate 3a) re-verifies each step
  caption against what the step visually shows.
- **Each furniture element appears once**: the **insight title** in a persistent header (never a
  step caption — it is the chart's confirmed takeaway, so a scrolly that opened on it opened on
  its own chute), the **opening line** as the intro step caption (`opening`, defaulting to the
  **description** — what/when/where), the **source** in the footer. The on-map
  text label is dropped — the map is visual feedback (zoom + highlight), the captions carry the words.
- **Short**: 3–6 steps for an embedded scrolly. `checkScrollyConformance` requires title + description +
  source (a module must stand alone when shared out of context).

## The step model — `chapters[]` (generalizable)

`src/chapters.ts` (pure, unit-tested) defines the storyboard:

```ts
ScrollyStep = { id; visual:"map"|"chart"|"image"; action:"flyTo"|"drawTo"|"crossfade"; ref; prose; align? }
ScrollyStory = { title; source?; visual; steps: ScrollyStep[] }
```

v1 implements `visual:"map"` only, but the schema already carries `chart`/`image` so they plug in as new
dispatcher cases, not a rewrite. `mapStoryToChapters(beats, meta) → ScrollyStory` turns a map-native
`mapStory` into one scroll step per beat (`ref` = beat index, `prose` = the beat copy, falling back to
the title when a beat is caption-less).

## Chart track — beat model + explicit narrative control (`beats`)

A chart-track config (carries `nativeType`: line/bar/scatter) derives its steps via chart-native's
`deriveChartStory` + `chartStoryToChapters`. **Default (auto-pick):** line = first + last + the 2
biggest step-to-step moves (progressive draw); bar = top-3 leaders + the tail (ranked highlight walk);
scatter = 3 outliers (label walk). **Explicit override — the journalist-confirmed plan wins:** the
config's optional `beats` array (`NativeSpec.beats`, chart-native `spec-to-config.ts`) replaces the
auto-pick for line and bar:

- **line**: `{ x, xEnd?, text? }` per beat — anchored on x values from the data; a range beat draws to
  `xEnd` and captions the span; the takeaway then closes on the FULL line.
- **bar**: `{ category, text? }` per beat — the walk follows the LIST (length and order), so 5 confirmed
  categories = a 5-step walk and a listed category is guaranteed its own step.
- **Order is the narrative**: beats render exactly as given, even non-chronological (the line scrubs
  back). `text` absent → the auto data-tied caption for that anchor.
- **Fail-loud tripwire**: an anchor that does not exist in the data throws (`narrativeBeatErrors`,
  chart-native `chart-story.ts`) — surfaced at the orchestrator's spine validation gate before
  production, and again at derive. **Scatter has no override.** The chart-track `beats` field is
  rejected on a map-track config (`beats` is chart-only narrative control; a map uses `arcBeats`
  instead — a mis-placed `beats` on a map fails loud at the gate). **The MAP track's own override is
  region-anchored `arcBeats`** (`{ region, role, text }` — `region` is the join-key/label value the
  beat anchors on; same arc shape as chart-native, `mapArcErrors`) — every map-native type now honours
  it (choropleth/symbol/locator/cartogram/dot-density/route/hex-grid — `ARC_CAPABLE_MAP_TYPES`,
  `skills/map-native/src/map-arc.ts`, `hex-grid` was the last to gain it); absent ⇒ map steps come from
  `deriveMapStory`'s (or the type's own deriver's) temporal/magnitude ordering. An `arcBeats` plan
  submitted on a type string outside this list is still refused BY NAME rather than silently dropped
  (`unsupportedArcBeatsErrors`) — defence-in-depth for a hypothetical future type; every real map type
  today carries it.

## Architecture

```
ScrollyStory (chapters[])            ── src/chapters.ts (pure, bun:test)
   ▼
Scrolly.tsx  (scaffold)
   ├── sticky graphic  (CSS position:sticky; top:0; height:100vh)   ── the visual
   │      └── ScrollyMap.tsx  (v1 map renderer, driven by currentStep)
   └── prose steps  (one .step block per chapter; margin-top:-100vh pulls them up over the graphic)
          └── IntersectionObserver(rootMargin -50% 0 -50% 0) → setCurrentStep(index)
                 └── dispatcher: switch(step.visual) — v1 case "map" → map.flyTo(beat camera) + highlight
```

- **Stickiness is pure CSS** (`position: sticky`). The negative margin goes on the **prose column**
  (`margin-top: -100vh`), NOT the graphic — putting it on the graphic collapses the document height so
  the page can't scroll and the observer never fires. (This was the one real bug; the smoke now asserts
  the document is scrollable.)
- **Step changes come from an `IntersectionObserver`**, never scroll-position math (no jank).
- **`ScrollyMap`** builds the choropleth from map-native's pure pieces (`computeChoropleth`,
  `deriveMapStory`, `theme/colors`) and is driven by a `currentStep` prop: on change it `flyTo`s the
  step's beat camera and applies the beat's highlight stroke + the on-map name/value annotation — the
  SAME visual language as the video. Live browser → real animated `flyTo` (with `prefers-reduced-motion`
  → `jumpTo`), not the frame-deterministic `jumpTo` the video needs.
- **Camera flight is shared + PEAK-BOUNDED** (`src/scrolly-camera.ts` `flyToBeat`, used by ALL six
  Scrolly*Map types). A reveal beat's camera is already the focused feature's tight bounds (the
  DESTINATION is correct — the camera settles tightly when the reader pauses). The failure was in the
  TRANSITION: `flyToBeat` caps the flight's peak zoom (`flyTo`'s `minZoom` = zoom at the arc apex; no
  `curve` passed, else maplibre ignores it) so the arc never widens past the tighter endpoint. It caps to
  the TIGHTER endpoint itself, **with NO margin** — an earlier version subtracted `min(from,to) − 0.5`,
  which was the bug: a reveal is a zoom-IN (`to > from`), so `from − 0.5` sits BELOW the current zoom → the
  flight first pulls BACK to (roughly) the full extent, and because the reader outscrolls the 1200 ms
  flight and `map.getZoom()` is read live mid-flight, each interrupted step re-subtracted the margin from
  an already-dipped zoom → the camera RATCHETED wider every step and never zoomed in. Capping to the
  tighter endpoint makes a zoom-in monotonic (floor = the current zoom, which only rises — a reveal's
  fit-zoom is always ≥ the extent zoom), so it can never drift past the establish extent. Only an
  establish⇄takeaway transition (whose endpoint IS the extent) widens to it. Endpoints unchanged.

## Inherited interactive best-practices (from `map-native/references/interactive-map-best-practices.md`)

- Water blue via the shared `theme/colors` — the scrolly matches the interactive and the video.
  No-data regions stay unpainted (basemap default, never tinted) in all three; `NO_DATA_COLOR` is
  only a paint-expression fallback, not a rendered layer.
- Hover only on regions WITH data (no no-data hover). The map keeps its event system but disables the
  navigation handlers (`dragPan`/`scrollZoom`/etc. `false`) — the SCROLL drives the camera, so manual
  pan/zoom would fight the narrative; there is no `NavigationControl`.
- `prefers-reduced-motion` (WCAG 2.3.3, checked via `lib/core/motion.ts`) → the map camera jumps
  instead of flying (`scrolly-camera.ts`'s `flyToBeat`) and the image track's crossfade becomes a hard
  cut (`ScrollyImage.tsx`, `transition:none`) — every step's end-state still renders, just without the
  tween. Enforced render-time by `scripts/snap-reduced-motion.mjs` (wired into `produce.mjs`): loads the
  built `scrolly.html` under Playwright's emulated `reducedMotion:"reduce"` and asserts the sticky
  graphic (map / chart / image, whichever the config produced) shows its informational end-state and
  never keeps animating after a step settles. The scroll never steals focus to the map (disorients
  keyboard users mid-scroll); the prose steps ARE the screen-reader narrative; source/credit always
  visible. Scrolly has no video format — nothing to exempt there.

## Reused from map-native (relative import, never copied)

`computeChoropleth` + `ChoroplethLayout`, `deriveMapStory` + `Beat`, `theme/colors`, the BLUES/DIVERGING
scales, and the on-map annotation visual language. Geometry itself is NOT a reused static asset — every
geometry-joining renderer (`ScrollyMap`, `ScrollyDotDensityMap`, `ScrollyCartogramMap`, `Scrolly`) takes
`config.geometry`, injected by produce, same contract as map-native's own components (D5); there is no
bundled fallback geometry, and `assets/` here holds only `sample-data`. (The `CountryLabel` is
re-implemented inline because map-native's is Remotion-coupled; a shared remotion-free label is a future
refactor.)

## Build / run

```bash
cd skills/scrolly
bun install
bun test                                                    # chapters + conformance
bun run audit:scrolly                                       # render-free narrative gate
# produce the single-file scrollable HTML (key from .env):
set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/scrolly.json output-proof   # → output-proof/scrolly.html
bun run smoke                                               # real-browser: scrollable + camera moves on scroll
```

## Files

- `src/chapters.ts` — pure `chapters[]` model + `mapStoryToChapters`. Unit-tested.
- `src/ScrollyMap.tsx` — v1 map renderer, driven by `currentStep` (flyTo + highlight + annotation + data-only hover).
- `src/scrolly-camera.ts` — shared `flyToBeat` (peak-bounded flight: reveals stay tight, never pull back to the full extent) + pure `peakFlightZoom`. Used by every Scrolly*Map type. Unit-tested.
- `src/Scrolly.tsx` — the scaffold: sticky graphic + prose steps + IntersectionObserver dispatcher.
- `src/mount.tsx` — reads the baked `__CONFIG__`, renders `<Scrolly>`.
- `src/conformance.ts` — `checkScrollyConformance` (≥3 steps, prose on every step, map refs in beat range).
- `scripts/produce.mjs` — build the single-file `scrolly.html`.
- `scripts/audit-scrolly.mjs` — render-free gate (`bun run audit:scrolly`).
- `scripts/snap-reduced-motion.mjs` — render-time reduced-motion guard (fail-hard in `produce.mjs`, WCAG 2.3.3): loads the built `scrolly.html` under Playwright's emulated `reducedMotion:"reduce"`, track-agnostic (map/chart/image). Asserts the takeaway step's end-state isn't blank, and — using a genuine mid-story reveal transition, since establish/takeaway often share a camera (see `smoke.mjs` above) — that nothing keeps animating once a step settles.
- `scripts/smoke.mjs` — real-browser scroll smoke (scrollable + camera moves; compares a reveal step,
  since the title and takeaway beats share a full-extent camera).
- `assets/sample-data/scrolly.json` — runnable sample (EU renewables, same shape as map-native).
- `output-proof/scrolly.html` — the produced single-file artifact.

## Roadmap (same engine)

`chart` steps (bind chart-native's draw-to-`progress`) and `image` crossfades are new dispatcher cases
on the same `chapters[]` model. Reader-authored prose / `/viznews-revise` editing, graphic swaps
mid-piece, and a scrolly-specific video export (the video already comes from map-native) are later.

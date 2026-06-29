# scrolly engine (v1 — map) — design

**Date:** 2026-06-28
**Status:** approved (brainstorming)
**Scope:** a new thin **orchestrator** engine `skills/scrolly/` that turns a storyboard into a
**scroll-driven** interactive (sticky graphic + scrolling prose). v1 drives the **map** visual only,
reusing map-native's `mapStory`; the `chapters[]` step model is designed so `chart`/`image` visuals
plug in later without a redesign.

## Goal

Give newsrooms a second interactive format — **scrollytelling** — where the reader scrolls and the
visual advances through narrative steps. The engine is a renderer-agnostic orchestrator: it owns the
scroll scaffold + the `chapters[]` storyboard + the step dispatcher, and imports the actual visual
renderers from the existing engines (map-native now, chart-native next). One storyboard already drives
the **video** (map-native's `ChoroplethStory` from the same `mapStory`); this adds the **scroll**
output, so a single narrative produces both motion and interactive.

## Why a separate engine (not inside map-native)

The scrolly must orchestrate **maps AND charts**. Putting it in map-native would force chart logic
into a map engine later. So `skills/scrolly/` is a thin orchestrator that knows about *scrolling*, not
about *drawing*; it depends on the visual engines, never the reverse.

## The step model — `chapters[]` (generalizable from day one)

A pure, framework-free module `src/chapters.ts`:

```ts
export type VisualKind = "map" | "chart" | "image"; // v1 implements "map" only
export type StepAction = "flyTo" | "drawTo" | "crossfade";

export interface ScrollyStep {
  id: string;            // unique slug → DOM id + scrollama target
  visual: VisualKind;    // which visual this step drives
  action: StepAction;    // how it transitions
  ref: number | string;  // map → mapStory beat index; chart → progress target; image → asset id
  prose: string;         // the step's text, shown in the scrolling panel beside the sticky graphic
  align?: "left" | "right" | "center"; // prose panel side (default "left")
}

export interface ScrollyStory {
  title: string;
  source?: { name: string; url: string };
  visual: VisualKind;            // v1: "map" (the single sticky graphic for the piece)
  steps: ScrollyStep[];
}
```

v1 builder: `mapStoryToChapters(beats: Beat[], meta) → ScrollyStory` — one step per `mapStory` beat,
`visual:"map"`, `action:"flyTo"`, `ref: <beat index>`, `prose: beat.copy` (the title beat's copy seeds
the opening step; reveal beats seed `Name — value`; the takeaway seeds the insight when present). The
prose is auto-derived and editable downstream (the `/viznews-revise` path), never invented. Unit-tested
like every pure core.

## Architecture (mirrors the canonical scrollytelling pattern)

```
ScrollyStory (chapters[])            ── chapters.ts (pure, bun:test)
   │
   ▼
Scrolly.tsx  (the scaffold)
   ├── sticky graphic  (position: sticky; top:0; height:100vh)  ── the visual
   │      └── ScrollyMap.tsx  (v1 map renderer, driven by currentStep)
   └── scrolling prose  (one .step block per chapter)
          └── IntersectionObserver / scrollama → onStepEnter(index)
                 └── dispatcher: step.visual === "map" → map.flyTo(beat camera) + highlight
```

- **Scaffold `src/Scrolly.tsx`** — renders the sticky graphic + the prose steps; a scroll observer
  (IntersectionObserver, the dependency-light equivalent of scrollama's `onStepEnter`) fires when a
  `.step` crosses the viewport midpoint and sets `currentStep`. Stickiness is pure CSS
  (`position: sticky`) — NO scroll-position listeners driving layout (the Pudding lesson: no jank).
- **Dispatcher** — on `currentStep` change, route by `step.visual`. v1 has one branch (`"map"`); the
  `switch` makes adding `"chart"`/`"image"` a new case, not a rewrite.
- **Map renderer `src/ScrollyMap.tsx`** — a MapTiler map built from map-native's pure pieces
  (`computeChoropleth` + `theme/colors` + `deriveMapStory`), driven by a `currentStep` prop instead of
  a Remotion frame. On step change it `flyTo`s the step's beat camera and applies the beat's highlight
  (the `__highlight` stroke) + the on-map `Name`/`value` annotation — the SAME visual language as the
  video (`ChoroplethStory`), so the two formats look identical. Live browser → real animated `flyTo`
  (with `prefers-reduced-motion` → `jumpTo`), not the frame-deterministic `jumpTo` the video needs.

## Reused from map-native (no duplication)

`computeChoropleth` + `ChoroplethLayout`, `deriveMapStory` + `Beat`, `theme/colors`
(`WATER_COLOR`/`NO_DATA_COLOR`), the BLUES/DIVERGING scales, `assets/geo/world.geojson`, and the
on-map annotation visual language (name + value, highlight stroke). The scrolly engine adds only the
scroll scaffold + the `chapters[]` model + the dispatcher + the live `flyTo` driving.

## Inherited best-practices (from `map-native/references/interactive-map-best-practices.md`)

- Water blue / land light / no-data grey (the shared `theme/colors`).
- Hover only on regions with data (no no-data hover).
- `NavigationControl` is **omitted** for the scrolly map — the SCROLL drives the camera, so manual
  pan/zoom would fight the narrative; the map is non-interactive (drag/scroll-zoom disabled) except
  hover. (Controls belong to the free-explore interactive, not the guided scrolly.)
- `prefers-reduced-motion` → `jumpTo` instead of `flyTo`; suppress the eased transitions.
- **Focus is NOT stolen** to the map on step change (disorients keyboard users mid-scroll) — the scroll
  drives the map; focus only moves on explicit user control interaction.
- Container `aria-label`; the prose steps are real readable text (a built-in screen-reader narrative —
  the scrolly's prose IS the text alternative).
- Legend + source always visible; loading state while tiles fetch.

## Output (v1)

A self-contained scrollable **HTML** (Vite + `vite-plugin-singlefile`, like the interactive build):
the sticky map + the prose steps in one file the newsroom embeds. `produce(config, outDir)` →
`scrolly.html`. The video is NOT re-produced here — it already exists from the same `mapStory` via
map-native; the spec's "one storyboard, two outputs" is satisfied (video = map-native, scroll = scrolly).

## Audit / conformance

- `chapters.ts` unit tests: `mapStoryToChapters` yields one step per beat, steps carry non-empty prose,
  ids are unique, the opening step maps to the title beat and the last to the takeaway.
- A render-free `audit-scrolly` assertion (mirrors `audit-story`): ≥ 3 steps, every step has prose +
  a resolvable `ref`, the map steps' beat indices are in range.
- A real-browser smoke (Playwright, like `snap-proof`): load the built `scrolly.html`, scroll through
  the steps, assert the sticky graphic stays pinned and the map camera changes between the first and a
  later step (the scroll actually drives the map). Green before the eye.

## Testing

| Case | Expectation |
| --- | --- |
| `mapStoryToChapters` on the sample mapStory | one step per beat; prose non-empty; ids unique; first→title, last→takeaway |
| Reduced motion | `flyTo` replaced by `jumpTo`; no eased transition |
| Scroll smoke (browser) | sticky graphic pinned; camera differs between step 1 and step 3 |
| Conformance | < 3 steps, or a step with empty prose / out-of-range ref → flagged |

## Out of scope (v1 — built later on the same engine)

- `chart` and `image` visuals (the `chapters[]` schema accepts them; the dispatcher gains cases). The
  chart case binds chart-native's draw-to-`progress` renderer.
- Multiple sticky graphics / graphic swaps mid-piece (v1 is one sticky map for the whole story).
- Reader-authored steps / the `/viznews-revise` editing path (v1 auto-derives prose from the mapStory).
- A scrolly-specific video export (the video already comes from the `mapStory` via map-native).
- Filters inside the scrolly (a free-explore concern, not guided scroll).

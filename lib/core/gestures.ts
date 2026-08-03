// The closed vocabulary of what an engine can make move. A storyboard proposal composes ONLY
// from what the target engine declares here (spec 2026-08-03 § 6), so a proposal is feasible
// by construction rather than by the proposer's vigilance.
//
// Two families, deliberately not merged: a map has a camera that travels; a chart does not —
// it grows, draws and highlights in a fixed frame. Asking a chart to "fly" is meaningless, and
// the split is what lets a caller refuse that without string-matching a name.
//
// Every name below is grounded in docs/splash/gesture-inventory-2026-08-03.md (Task 1's
// read-only, file:line-cited measurement) — not the brief's placeholder draft. See that
// document's §8 summary table and §7 findings before changing this file.

/** How the beats of a video express themselves. A scrolly is always step-driven. */
export const NARRATIVE_KINDS = ["story", "scrolly", "reveal"] as const;
export type NarrativeKind = (typeof NARRATIVE_KINDS)[number];

// Camera gestures — a frame that travels. Maps only; chart-native has no camera concept at all
// (inventory §4: no flyTo/fitBounds/jumpTo/map instance anywhere under skills/chart-native/src).
export const CAMERA_GESTURES = [
  // A discrete, un-eased reposition between beats/steps. Every map-native Story component and
  // every map-native video-Scrolly component uses `map.jumpTo`, never `flyTo` — six file headers
  // say so explicitly ("Deterministic jump — never flyTo", e.g. LocatorStory.tsx:329) and the
  // per-frame call sites were read to confirm it (ChoroplethStory.tsx:453-460,
  // ChoroplethScrolly.tsx:1-6/§2 table). Named "jump" rather than the brief's "cut" to mirror the
  // actual measured primitive 1:1, not a film-editing gloss on it.
  "jump",
  // A smooth, eased camera transition. Confirmed only in skills/scrolly's browser-interactive
  // ScrollyMap.tsx:448 (`flyToBeat` → MapLibre `flyTo`) — the live-browser sibling of the video
  // Story/Scrolly families, which deliberately do NOT use this (they need frame-determinism).
  "fly",
  // The camera does not move once framed. All six non-route map-native Reveal components call
  // `map.fitBounds(plan.bounds, { duration: 0 })` exactly once at load, then never move it again
  // (inventory §3 table, e.g. ChoroplethReveal.tsx:210).
  "hold",
  // A continuous, non-beat camera move — zoom and pitch lerp every frame by the clip's own
  // progress fraction. The one exception to "reveal holds its camera": RouteReveal.tsx:449-455,
  // the inventory's own words for it: "a push-in" (§3.1). Not "fly" (that name is reserved for
  // the eased browser primitive) and not "jump" (this is continuous, not a beat-to-beat cut).
  "push",
] as const;

// Data gestures — a fixed frame whose contents change. Every engine that animates something.
export const DATA_GESTURES = [
  // A size ramps from zero to full: bar/stem height from baseline (BarChart.tsx:1-3), point
  // radius (SymbolReveal.tsx:218-233, LocatorReveal.tsx:219-234), cell scale-in (Waffle/
  // Marimekko/Treemap, inventory §4 table).
  "grow",
  // A path or region progressively reveals along one dimension by a monotonic scalar: a line by
  // cumulative length (LineChart.tsx via revealLine/revealHead), an area by left→right wipe
  // (StackedAreaChart.tsx:1-4), an angle by sweep (PieChart.tsx:1-4), a border by trail
  // (ChoroplethStory/CartogramStory/HexGridStory, story-choreography.ts), a route's line drawing
  // continuously through every crossed territory (RouteReveal.tsx §3.1, RouteScrolly.tsx §2.1).
  "draw",
  // One subject is emphasised while its siblings dim, WITHOUT a size or opacity ramp on the
  // emphasised subject itself: the per-beat/per-step spotlight in map-native's Story and video-
  // Scrolly families (dim to ~0.2-0.25, CartogramScrolly.tsx:6-9), ScrollyChart's bar/scatter
  // "highlight walk" (progress pinned at 1, one bar/point accented per step, ScrollyChart.tsx:
  // 110-138), and chart-native's interactive hover/keyboard-focus state (LineChart.tsx:131,173,
  // 438-441) — the last one present in the interactive format only (inventory §4.1).
  "highlight",
  // An element fades or pops into visibility from nothing, uniformly (no stagger — see the
  // ChoroplethReveal finding below): opacity 0→1 across the whole map-native Reveal family
  // (CartogramReveal.tsx:202-208, DotDensityReveal.tsx:223-225), a chart node fading in
  // (SankeyChart.tsx:1-3), a dot-density stipple-in (DotDensityStory.tsx header:8-14).
  //
  // IMPORTANT — do not read this as a staggered/ordered reveal. ChoroplethReveal.tsx:3's header
  // claims regions reveal "in ascending-value order (stagger by bin index)"; the code does not:
  // `__binIdx` is written at :150/:163 and read nowhere, and the per-frame paint (:249-269)
  // applies one identical scalar `progress` to every data region in a single setPaintProperty
  // call. All six non-route Reveal siblings share this: one uniform ramp, not an ordered
  // appearance. "appear" names that uniform ramp only.
  "appear",
  // Two frames swap by opacity, one fading in as the other fades out — genuinely distinct from
  // "appear" (a single element from nothing) because a second element is present throughout.
  // The only place this exists: ScrollyImage.tsx:88-89 (`opacity: i === active ? 1 : 0`, 600ms
  // transition), image-native's sole gesture (format-support.ts:1-7 — scrolly only, v1).
  "crossfade",
] as const;

export const GESTURES = [...CAMERA_GESTURES, ...DATA_GESTURES] as const;
export type Gesture = (typeof GESTURES)[number];

export type GestureVocabulary = Partial<
  Record<NarrativeKind, readonly Gesture[]>
>;

export function isCameraGesture(g: Gesture): boolean {
  return (CAMERA_GESTURES as readonly string[]).includes(g);
}

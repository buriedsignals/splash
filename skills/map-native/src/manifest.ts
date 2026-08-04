// map-native's producer manifest — self-registers with the shared registry on import.
// Dispatch data (scriptPath / skillDir / threadsChannel) is colocated with the engine
// here, replacing adapters.ts's hard-coded SCRIPT / SKILL_DIR / CHANNEL_THREADED maps.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerProducer } from "../../../lib/core/registry";
import type { GestureVocabulary } from "../../../lib/core/gestures";
import { mapNativeConfigErrors } from "./validate-config";
import { MAP_TYPES } from "./map-types";
import "./feature-limits";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// What each map type makes move, per narrative kind — measured, not aspired to. See
// docs/splash/gesture-inventory-2026-08-03.md §1-3 for the per-component evidence; this
// task's own reading of skills/map-native/src/story-choreography.ts (the shared areal
// entrance envelope) is cited inline where it goes beyond the inventory's own text.
//
// `story`: 6 of 7 types (§1) — there is no RouteStory.tsx (§1.1, a deliberate design
// decision, not an omission), so `story` is OMITTED for route entirely, per this task's
// governing rule: a narrative kind a component does not implement is left off, not
// filled with an empty or guessed vocabulary.
//
// `scrolly` here means the map-native VIDEO Scrolly family (§2) — Remotion compositions
// that simulate a scroll narrative as a deterministic frame sequence, NOT the
// browser-interactive scrolly (that lives in the `scrolly` package and reuses these same
// map-native types, MAP_SCROLLY_TYPES minus route — see scrolly/src/manifest.ts).
// Reachability caveat (inventory §2.2, not resolved by this task): none of the 7
// video-Scrolly compositions are reachable from any current producer path. This
// declares CAPABILITY (what the component does when it renders), not reachability —
// the same distinction `deferred` already draws for chart-native's family-B types.
//
// `reveal`: 7 of 7 types (§3) — fixed camera (`fitBounds(duration:0)` once, or for
// route alone a continuous non-beat push, §3.1). ChoroplethReveal.tsx:3's header claims
// a per-region stagger ("ascending-value order (stagger by bin index)"); the paint code
// (§7.1, :249-269) applies ONE identical scalar to every region — so `reveal` for
// choropleth (and its 4 non-route, non-locator/symbol siblings) declares `appear` only,
// never `stagger`. Locator/Symbol Reveal grow a point radius (gestures.ts's own `grow`
// citation) — declared `grow`, matching Task 2's precedent exactly, not `appear`.
const AREAL_ENTRANCE_BEAT: GestureVocabulary = {
  // Border-draw + fill-bloom, both gated per-subject by the beat that introduces it
  // (story-choreography.ts:60-76 `stagedByKey`/`stagedEntrance`, keyed by a per-subject
  // trigger frame — the beat-gated entrance, not one shared scalar) — draw (border
  // trail, gestures.ts's own citation for these three files) + stagger (fill-bloom +
  // label-rise, per-subject), plus the dim/spotlight multiplier for beats that are not
  // the current subject's own (highlight).
  story: ["jump", "draw", "stagger", "highlight"],
  // ChoroplethScrolly.tsx:1-4 states it ports ChoroplethStory's fill/stroke layers
  // "UNCHANGED", driving the same per-subject entrance per SCROLLY STEP instead of per
  // beat (confirmed: `setPaintProperty` on fill-opacity present, :417); the six sibling
  // headers make the identical claim for their own Story sibling. Camera moves per step
  // (`jumpTo`) instead of per beat — same primitive, different trigger.
  scrolly: ["jump", "draw", "stagger", "highlight"],
  reveal: ["hold", "appear"],
};
const POINT_ENTRANCE_BEAT: GestureVocabulary = {
  // SymbolStory.tsx/LocatorStory.tsx: "grow each point's radius + fade + raise its
  // label" — grow (radius), gated per-subject to the beat that introduces it (stagger),
  // plus the dim/spotlight multiplier (highlight).
  story: ["jump", "grow", "stagger", "highlight"],
  // SymbolScrolly.tsx:1-5/LocatorScrolly.tsx:1-6 port the Story sibling's layers
  // "UNCHANGED", per-step instead of per-beat.
  scrolly: ["jump", "grow", "stagger", "highlight"],
  // LocatorReveal.tsx/SymbolReveal.tsx: radius 0→full by the SAME shared `progress` —
  // gestures.ts's own `grow` citation for these two files.
  reveal: ["hold", "grow"],
};

const MAP_GESTURES: Record<string, GestureVocabulary> = {
  choropleth: AREAL_ENTRANCE_BEAT,
  cartogram: AREAL_ENTRANCE_BEAT,
  "hex-grid": AREAL_ENTRANCE_BEAT,
  // DotDensityStory.tsx (header :6-16): each region's dot stipple-in is gated on ITS OWN
  // beat trigger — gestures.ts's own cited `stagger` example. Circle radius is fixed
  // ("uniform circle-radius 2 NEVER value-scaled", DotDensityScrolly.tsx header) — no
  // `grow`, no areal fill/border (`bloom: false`) — no `draw`.
  "dot-density": {
    story: ["jump", "stagger", "highlight"],
    scrolly: ["jump", "stagger", "highlight"],
    reveal: ["hold", "appear"],
  },
  symbol: POINT_ENTRANCE_BEAT,
  locator: POINT_ENTRANCE_BEAT,
  // No RouteStory.tsx exists (§1.1) — `story` omitted entirely, the honest signal per
  // this task's governing rule (not a guess at what a beat-driven route tour would do).
  route: {
    // RouteScrolly.tsx:1-8: replaces RouteReveal's single continuous sweep with a
    // per-STEP target — the line draws up to the active step's territory, and each
    // territory's border/fill/label triggers off the step that reveals it (draw, gated
    // per-step — stagger). Camera still `jumpTo` per step (§2, same discipline as the
    // other six).
    scrolly: ["jump", "draw", "stagger"],
    // RouteReveal.tsx:449-455: a continuous, non-beat camera push (zoom+pitch lerp by
    // frame progress — gestures.ts's own citation for `push`), while the line draws
    // continuously through every crossed territory (§3.1, gestures.ts's own `draw`
    // citation for this exact file).
    reveal: ["push", "draw"],
  },
};

registerProducer({
  name: "map-native",
  // Single-format CLI vocabulary map-native's produce.mjs accepts (scrolly is the scrolly
  // engine's; it fails hard here too — see adapters.ts header).
  formats: ["static", "interactive", "video"],
  types: MAP_TYPES.map((id) => ({ id, gestures: MAP_GESTURES[id] })),
  validate: mapNativeConfigErrors,
  execution: "subprocess",
  subprocess: {
    scriptPath: join(skillDir, "scripts/produce.mjs"),
    skillDir,
    // A native map renders at the channel's size/aspect (Slice 2): SPLASH_CHANNEL is threaded.
    threadsChannel: true,
  },
});

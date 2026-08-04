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

// What each map type makes move, per narrative kind — measured PER TYPE, from each
// component's own code, not from a shared constant. A prior version of this file shared
// one `AREAL_ENTRANCE_BEAT` object across choropleth/cartogram/hex-grid and one
// `POINT_ENTRANCE_BEAT` across symbol/locator: that sharing let one wrong reading (a
// header comment taken at face value) silently propagate to six types at once — see the
// per-type notes below for the two concrete cases (choropleth·story, symbol·story) where
// the shared shape was wrong for one member and right for its siblings. Every cell below
// is written out on its own type, even where two types happen to agree, so a future
// divergence can never again be hidden by a shared object.
//
// `story`: 6 of 7 types — there is no RouteStory.tsx (a deliberate design decision, not
// an omission), so `story` is OMITTED for route entirely: a narrative kind a component
// does not implement is left off, not filled with an empty or guessed vocabulary.
//
// `scrolly` here means the map-native VIDEO Scrolly family — Remotion compositions
// (skills/map-native/src/components/*Scrolly.tsx) that simulate a scroll narrative as a
// deterministic frame sequence.
//
// IMPORTANT — this is a DIFFERENT PRODUCT from "a reader scrolling a map story in the
// browser". That reader-facing experience is `skills/scrolly`'s own component family
// (ScrollyMap.tsx, ScrollyCartogramMap.tsx, ScrollyDotDensityMap.tsx, ScrollyHexMap.tsx,
// ScrollyLocatorMap.tsx, ScrollySymbolMap.tsx — living in skills/scrolly/src/, not here),
// dispatched for exactly MAP_SCROLLY_TYPES (scrolly-types.ts: symbol, hex-grid,
// dot-density, locator, cartogram, choropleth — route excluded). That browser family
// camera-flies (`flyToBeat`, e.g. ScrollyMap.tsx:448) — a gesture no map-native
// video-Scrolly component ever performs (every one below uses `jumpTo` only). The two
// families do not even share source files, only a name.
//
// This manifest's `scrolly` key can only honestly speak for the video family declared
// here, because that is what map-native itself renders — but that means the READER-
// REACHABLE map+scrolly vocabulary (including `fly`) is declared NOWHERE in this
// registry today: `skills/scrolly`'s own producer registers zero `types` (it is a
// mechanism, not a type owner — see scrolly/src/manifest.ts), and this key is already
// spoken for by the unreachable video family. Collapsing the two under one `scrolly` key
// would misrepresent whichever one loses the argument; giving the browser family a
// second, distinct kind is a vocabulary change (a possible fourth NarrativeKind) that
// this sub-project's brief reserves for the controller, not this pass. Left an open gap,
// not silently resolved — see the final-fix-report for the same note.
//
// Reachability caveat (separate from the above, also not resolved by this task): none of
// the 7 video-Scrolly compositions are reachable from any current producer path. This
// declares CAPABILITY (what the component does when it renders), not reachability — the
// same distinction `deferred` already draws for chart-native's family-B types.
//
// `reveal`: 7 of 7 types — fixed camera (`fitBounds(duration:0)` once, or for route alone
// a continuous non-beat push).

const CHOROPLETH_GESTURES: GestureVocabulary = {
  // ChoroplethStory.tsx: per-subject emphasis is `addSubjectEmphasisLayers` +
  // `stagedByKey` (:405,467) — a border trail draws on (`sliceBorder`, :478) and the
  // fill blooms with a transient overshoot, both gated per-subject to the beat that
  // introduces it (draw + stagger). There is NO sibling-dim mechanism anywhere in this
  // file (0 hits for DIM_OPACITY/beat.dim/dimNow) — the base `choropleth-fill` layer
  // (:527-532) applies ONE shared `fillReveal*0.9` to every data region alike in
  // "context" mode. That is `appear` (a uniform ramp, no per-subject offset), not
  // `highlight` (which requires siblings to dim while one is emphasised) — this type's
  // own header never claimed sibling-dimming either. Choropleth is the one areal type
  // where this base-fill wash is a real, config-reachable ramp (`resolveRevealMode`,
  // :159); cartogram/hex-grid's equivalent base layer only ever toggles between two
  // CONSTANTS (FULL_OPACITY / DIM_OPACITY), never ramps — so `appear` does NOT belong on
  // those two despite the identical-looking "branches on revealMode" comment shape.
  story: ["jump", "draw", "stagger", "appear"],
  // ChoroplethScrolly.tsx: the base `choropleth-fill` layer (:417-422) paints ONE shared
  // `fillReveal*0.9` across every data region each step — `appear`, not `stagger` (no
  // `stagedByKey`/`stagedEntrance`/trail machinery exists in this file at all — 0 hits,
  // confirming no border ever draws here, unlike its Story sibling). The SEPARATE
  // `choropleth-highlight-stroke` layer (:434-444) ramps ONE region's stroke `line-width`
  // 0 → 2.5*dataReveal while every other region stays at a constant 0 (never dimmed FROM
  // something, simply never drawn) — a size ramp literally FROM ZERO on the emphasised
  // subject itself, which gestures.ts's own definition of `highlight` explicitly
  // excludes ("WITHOUT a size or opacity ramp on the emphasised subject itself"). That
  // exclusion is exactly the test C3 applied to this file's Story sibling; applied here
  // it disqualifies `highlight` too. A 0→full size ramp on one subject is `grow` by
  // definition (matches this manifest's own "ribbon strokeWidth... widens... a real
  // grow" precedent for SankeyChart in chart-native's manifest).
  scrolly: ["jump", "appear", "grow"],
  // ChoroplethReveal.tsx:249-269: `fill-opacity` ramps 0 → 0.85 via ONE shared
  // `easedRevealProgress` — no per-region offset, no highlight stroke of any kind in
  // this file.
  reveal: ["hold", "appear"],
};

const CARTOGRAM_GESTURES: GestureVocabulary = {
  // CartogramStory.tsx: `stagedByKey` (:357) drives a per-subject border draw-on +
  // fill-bloom (draw + stagger, same primitive as Choropleth). SEPARATELY, a real
  // sibling-dim toggle exists (:406-421, `beat.dim` + DIM_OPACITY, 3 hits) — the
  // highlighted cell's fill-opacity is pinned to the CONSTANT FULL_OPACITY while every
  // other cell is pinned to the CONSTANT DIM_OPACITY; neither value ramps, so this
  // cleanly matches `highlight`'s "no ramp on the emphasised subject" test.
  story: ["jump", "draw", "stagger", "highlight"],
  // CartogramScrolly.tsx: cells `addLayer` at a STATIC `fill-opacity: FULL_OPACITY`
  // (:181) — no fade-from-zero anywhere, so no `appear`. No `stagedByKey`/trail/
  // `sliceBorder` (0 hits) — no `draw`, no `stagger`. The per-step emphasis (:289-304)
  // pins the highlighted cell at the CONSTANT FULL_OPACITY and ramps every OTHER cell's
  // opacity down toward DIM_OPACITY via `dimNow` — siblings dim, the emphasised subject
  // itself never ramps: `highlight`, cleanly.
  scrolly: ["jump", "highlight"],
  // CartogramReveal.tsx:82-88,208: `fill-opacity` ramps 0 → 0.85 via ONE shared
  // `easedRevealProgress` (`progress * 0.85`) — no per-cell offset.
  reveal: ["hold", "appear"],
};

const HEX_GRID_GESTURES: GestureVocabulary = {
  // HexGridStory.tsx: identical shape to CartogramStory — `stagedByKey` (:332) for the
  // per-subject border draw + fill bloom (draw + stagger); a real sibling-dim CONSTANT
  // toggle (:382-421, `beat.dim` + DIM_OPACITY, 3 hits) for `highlight`.
  story: ["jump", "draw", "stagger", "highlight"],
  // HexGridScrolly.tsx: identical shape to CartogramScrolly — static
  // `fill-opacity: FULL_OPACITY` at addLayer (no `appear`), 0 hits for staged/trail
  // machinery (no `draw`, no `stagger`), and the per-step emphasis (:265-280) pins the
  // highlighted cell at the constant FULL_OPACITY while siblings ramp down to
  // DIM_OPACITY — `highlight`.
  scrolly: ["jump", "highlight"],
  // HexGridReveal.tsx:75-81,186: `fill-opacity` ramps 0 → 0.8 via ONE shared
  // `easedRevealProgress` — no per-cell offset.
  reveal: ["hold", "appear"],
};

const DOT_DENSITY_GESTURES: GestureVocabulary = {
  // DotDensityStory.tsx: `addSubjectEmphasisLayers(..., { bloom: false })` (:356-365)
  // disables the FILL bloom layer only — it does NOT disable the border trail. The
  // per-subject border still draws on via `stagedByKey` + `sliceBorder` (:418-429,
  // real `trail-${key}` sources are built and `setData`-updated every frame) — a prior
  // reading inferred "no draw" from `bloom:false` alone, without opening these lines;
  // the trail IS a real draw, so it belongs in this declaration. The fill CHANNEL is the
  // dot layer's own circle-opacity, data-driven off the same staged entrance (`stagger`,
  // gestures.ts's own cited example for this exact file). Real sibling-dim CONSTANT
  // toggle for `highlight` (3 hits).
  story: ["jump", "draw", "stagger", "highlight"],
  // DotDensityScrolly.tsx: `circle-radius: DOT_RADIUS_PX` is a fixed constant (no
  // `grow`), `circle-opacity: 1` at addLayer (no fade-from-zero, no `appear`), 0 hits
  // for staged/trail machinery (no `draw`, no `stagger`). The per-step emphasis
  // (:303-323) pins the highlighted region's dots at the CONSTANT 1 while siblings ramp
  // down to DIM_OPACITY via `dimNow` — `highlight`, cleanly, same shape as Cartogram/
  // Hex-grid.
  scrolly: ["jump", "highlight"],
  // DotDensityReveal.tsx:84,182-195: `circle-opacity` ramps 0 → 1 via ONE shared
  // `progress`; `circle-radius` is the fixed DOT_RADIUS_PX (never value-scaled) — no
  // `grow`.
  reveal: ["hold", "appear"],
};

const SYMBOL_GESTURES: GestureVocabulary = {
  // SymbolStory.tsx: `stagedEntrance` (imported :46, driving `__radius`/`__opacity`
  // data-driven paint properties, :229-231) is the per-subject entrance — grow (radius
  // 0→full) gated per-subject to its own beat (stagger). There is NO sibling-dim
  // mechanism anywhere in this file (0 hits for DIM_OPACITY/beat.dim/dimNow, matching
  // C3's finding) — the prior shared `POINT_ENTRANCE_BEAT` constant borrowed
  // LocatorStory's real highlight for this type too; Symbol has no such mechanism.
  story: ["jump", "grow", "stagger"],
  // SymbolScrolly.tsx: `circle-radius = radius * fillReveal` (:299-303) is ONE shared
  // scalar applied to every symbol identically — `grow` (uniform, not per-subject), same
  // primitive already declared for `reveal` below. `text-opacity = fillReveal` (:307) is
  // its own paint property with its own 0-start (story-timeline.ts:79: `fillReveal = 0`
  // for the entire title beat, before ramping 0→1 across establish) — the SAME rule this
  // manifest applies to `reveal` below (`appear`, not folded into `grow`, "the label
  // channel is its own paint property with its own 0-start"). A prior version of this
  // cell folded it into `grow` on the strength of SymbolReveal's summary comment ("grow
  // radii + fade labels by progress") — but that comment is a one-line gloss, and
  // SymbolReveal's own DECLARATION two cells below splits the same two properties into
  // `grow` + `appear`. Folding here while splitting there was inconsistent for identical
  // code; corrected to match. No DIM_OPACITY anywhere in this file (0 hits) — no sibling
  // ever dims, so no `highlight`. The highlighted symbol's `circle-stroke-width` ramps
  // 1.5 → 1.5 + 3*dataReveal (:322-327) while every other symbol stays at the constant
  // 1.5 — the file's OWN comment calls this "the highlighted symbol's stroke width grows
  // in" (:314-315) — a ramp on the emphasised subject, `grow` again (not `highlight`, by
  // the same exclusion rule applied to Choropleth above), already covered by the `grow`
  // entry.
  scrolly: ["jump", "grow", "appear"],
  // SymbolReveal.tsx:225-231: `circle-radius = radius * progress` (grow) AND
  // `text-opacity = progress` (:169 starts opacity at 0, :231 ramps it by the SAME
  // shared `progress`) — a genuine `appear` (opacity 0→1, one shared scalar) alongside
  // the radius grow, not merely folded into it: the label channel is its own paint
  // property with its own 0-start. RULE applied to both `scrolly` and `reveal` above:
  // a channel that starts its OWN paint property at literal 0 and ramps to 1, even by a
  // scalar shared with a `grow` ramp on a different property, is an `appear` of its own —
  // "one gesture, two properties" is not a valid fold just because the driving scalar is
  // shared; the property, not the scalar, is what a gesture names.
  reveal: ["hold", "grow", "appear"],
};

const LOCATOR_GESTURES: GestureVocabulary = {
  // LocatorStory.tsx: `stagedEntrance` (imported :57, driving `__radius`, :410-436) —
  // grow (radius 0→full) gated per-subject (stagger). Real sibling-dim CONSTANT toggle
  // for `highlight` (4 hits, `beat.dim` + DIM_OPACITY, :338 `emphasise`).
  story: ["jump", "grow", "stagger", "highlight"],
  // LocatorScrolly.tsx: `circle-radius: DOT_RADIUS_PX` is fixed (no primary-mark
  // `grow`). The main glyph opacity is a STATIC case expression set once at addLayer
  // (:160-171, `__highlight ? 0.95 : DIM_OPACITY` — both constants, re-evaluated by
  // MapLibre when the source's `__highlight` property changes via setData) — siblings
  // sit at DIM_OPACITY while the emphasised marker sits at the constant 0.95: real
  // `highlight`, same test as Cartogram. SEPARATELY, `circle-stroke-width` ramps
  // 1.5 → 1.5 + 3*dataReveal for the highlighted marker only (:354-359) while others
  // stay at the constant 1.5 — the same accent-ring `grow` pattern as Symbol/Choropleth,
  // present here ALONGSIDE the genuine highlight (unlike Symbol, which has the ring but
  // no sibling-dim, and unlike Cartogram, which has the dim but no ring).
  scrolly: ["jump", "highlight", "grow"],
  // LocatorReveal.tsx:224-232: `circle-radius = DOT_RADIUS_PX * progress` (grow) AND
  // `circle-opacity`/`circle-stroke-opacity`/`text-opacity` all ramp by the SAME shared
  // `progress` (:229-232) — a genuine `appear` alongside the grow, matching the same
  // reasoning as SymbolReveal above.
  reveal: ["hold", "grow", "appear"],
};

const ROUTE_GESTURES: GestureVocabulary = {
  // No RouteStory.tsx exists — `story` omitted entirely, the honest signal per this
  // file's governing rule (not a guess at what a beat-driven route tour would do).
  //
  // RouteScrolly.tsx: the route LINE itself draws progressively and continuously across
  // the whole clip (`reveal` fraction, cumulative distance via `turf.lineSliceAlong`,
  // :540-573) — `draw`, ONE continuous scalar for the one line, not per-subject.
  // SEPARATELY, each crossed territory's FILL bloom ramps from a baseline overview tint
  // to full opacity (:660-676, `lerp(OVERVIEW_FILL_OPACITY, FILL_OPACITY, fp)`) gated to
  // the STEP that names it (:609-613, `revealStep`, per-territory) — an entrance whose
  // timing depends on which territory it is: `stagger`. The territory BORDER itself
  // never partially draws (always `sliceBorder(d, 0, d.total)`, full or `EMPTY_FEATURE`
  // — no partial slice at any step) — the border is not an additional `draw` source,
  // already covered by the line's own.
  scrolly: ["jump", "draw", "stagger"],
  // RouteReveal.tsx:449-455: a continuous, non-beat camera push (zoom+pitch lerp by
  // frame progress) — `push`. The route line draws continuously through every crossed
  // territory (:540-573, `reveal` scalar) — `draw`. SEPARATELY, each territory's own
  // border-trail + fill-bloom is gated by a PER-TERRITORY `trigger(terr)` time
  // (:189-190, `RIVER_START + t.stop * (RIVER_END - RIVER_START)`) feeding
  // `stagedEntrance` (:415-416) — an entrance whose timing depends on which territory it
  // is: `stagger`, missing from a prior reading of this cell.
  reveal: ["push", "draw", "stagger"],
};

// Exported so a drift test can check every key here resolves to a real MAP_TYPES id —
// same rationale as chart-native's own CHART_GESTURES export (see its comment).
export const MAP_GESTURES: Record<string, GestureVocabulary> = {
  choropleth: CHOROPLETH_GESTURES,
  cartogram: CARTOGRAM_GESTURES,
  "hex-grid": HEX_GRID_GESTURES,
  "dot-density": DOT_DENSITY_GESTURES,
  symbol: SYMBOL_GESTURES,
  locator: LOCATOR_GESTURES,
  route: ROUTE_GESTURES,
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

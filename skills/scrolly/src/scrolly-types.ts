// scrolly-types — leaf module, imports nothing. The types each scrolly track actually hosts.
//
// Extracted out of Scrolly.tsx so this data can be read (by tests, or anything else) WITHOUT
// pulling in the full dispatch component tree — which transitively imports ScrollyMap.tsx, whose
// module-scope key guard throws when VITE_MAPTILER_KEY is unset. On a clean checkout (no .env),
// that throw leaves Scrolly.tsx's exports in the temporal dead zone, so anything importing these
// Sets through Scrolly.tsx fails with a TDZ ReferenceError instead of the actual missing-key
// error. Reading this leaf module instead sidesteps the throw entirely.
//
// EXPORTED because they are the source of truth for two readers that must never disagree:
// Scrolly.tsx's dispatch (which re-exports them, so existing importers of "../src/Scrolly" keep
// working), and the KB drift test that checks which sheets may declare the `scrolly` format.
export const CHART_SCROLLY_TYPES = new Set(["line", "bar", "scatter"]);
// `choropleth` is the dispatch's default branch (ScrollyMap + computeChoropleth), so it is
// hosted — but the default must not swallow types that are NOT. `route` has no branch and was
// being drawn as a choropleth: a wrong render, silently.
/**
 * THE ONE WORDING for "an authored beat plan does not belong on the map track".
 *
 * It was written three times — the loop's assembler (lib/loop/assemble/scrolly.ts), this
 * package's own spec validator (manifest.ts), and, in a third register, the brain's drafter
 * refusal (lib/brain/beats.ts) — two of them journalist-facing and saying the same thing
 * differently. A journalist meeting the rule twice in two wordings has to work out whether they
 * are the same rule. They are, so there is one sentence, here, where both readers already look.
 *
 * (skills/splash/src/validate-gate.ts states a NEIGHBOURING rule in the V1 path's own vocabulary
 * — a map's plan goes in `arcBeats`, not `beats` — and keeps its own wording because it names a
 * different field, not a different version of this.)
 */
// UPDATED (map-storyboard-and-video-geography): the wording used to say a map scrolly "derives
// its own walk from the data" full stop, as if no authored override existed for it at all — true
// when this was written, false since every map-native type gained a confirmed claim-arc
// (`arcBeats`, `skills/map-native/src/map-arc.ts`'s `ARC_CAPABLE_MAP_TYPES`). The refusal itself
// stays correct — `beats` (the CHART track's own field) still never applies to a map — but the
// reason must name the actual way out, or a journalist reading it concludes a map has no
// named-step control at all, which `skills/splash/SKILL.md` now explicitly forbids saying.
export const MAP_TRACK_BEATS_REFUSAL =
  "`beats` is chart-track narrative control and never applies to a map scrolly — a map's own " +
  "confirmed walk is `arcBeats` (region-anchored: `{region, role, text}`); move the plan there, " +
  "or leave it unset for the salience default";

export const MAP_SCROLLY_TYPES = new Set([
  // `route` joined 2026-08-04 (ScrollyRouteMap.tsx). It was the ONE arc-capable map type with no
  // browser scrolly — the walk existed (resolveRouteWalk gives territory + camera + confirmed
  // text per step) and had no renderer to consume it, so a journalist could produce a video of a
  // trajectory but never a page a reader scrolls.
  "route",
  "symbol",
  "hex-grid",
  "dot-density",
  "locator",
  "cartogram",
  "choropleth",
]);

/**
 * THE ONE WORDING for "this map type has no scrolly host" — a "route" today, the one
 * ARC_CAPABLE_MAP_TYPES member missing from MAP_SCROLLY_TYPES above (map-arc.ts's own
 * comment: every one of the seven real map types is arc-capable now, so route's
 * `arcBeats` validates fine at map-native's own gate — the layer this function's callers
 * sit in front of is a NARROWER one, "does scrolly itself host this type at all").
 *
 * Two readers must refuse a "route" scrolly the same way: the V1 editorial gate
 * (skills/splash/src/validate-gate.ts's validateScrolly) and this package's own producer
 * validator (manifest.ts's scrollySpecErrors, which produce.mjs runs before it will build
 * anything). Before this function existed they were two hand-written strings that agreed
 * by accident, and manifest.ts's had silently fallen out of date — it never checked
 * MAP_SCROLLY_TYPES membership at all, so a route+arcBeats config that validate-gate.ts
 * refused passed scrollySpecErrors with zero errors (measured; the CLI's own comment
 * claiming "the CLI and the spine refuse identically" was false for exactly this case).
 * One function, called from both places, cannot drift that way again.
 */
export function unsupportedMapScrollyType(
  mapType: string,
  hasArcBeats: boolean,
): string {
  return (
    `a "${mapType}" scrolly does not exist yet — MAP_SCROLLY_TYPES has no branch for it, ` +
    "so nothing walks it (Scrolly.tsx renders an empty story for it, and produce " +
    `refuses format "scrolly" for it outright).` +
    (hasArcBeats
      ? " The confirmed claim-arc on this spec would reach no reader-facing output — " +
        `do not author one for a "${mapType}" scrolly.`
      : ` Build this "${mapType}" as a static image, an interactive map, or a video instead.`)
  );
}

// skills/map-native/scripts/lib/story-comps.mjs
// The story-format video dispatch — extracted from produce.mjs so it can be unit-tested
// directly. produce.mjs itself cannot be imported in a test: it has top-level side effects
// (process.argv parsing, process.exit, env reads) that run the moment the module loads (see
// reveal-is-reachable.test.ts, which works around this by matching the script's SOURCE TEXT
// instead of calling into it). storyComps has no such side effect, so it moves here and
// produce.mjs imports it — one behaviour, testable by calling it, not by grepping for it.

/** Returns the composition set for the story-format video, dispatched on cameraMode: an
 *  array of [compositionId, aspect] triples (landscape/square/portrait — one per aspect the
 *  producer always builds for the "video" format).
 *
 *  cameraMode:
 *    "guided-tour"  — a beat-driven camera tour between the data's own highlights (SP2).
 *    "route-reveal" — a route drawn on as the camera follows it (SP3b).
 *    "simple"       — a fixed camera; the data animates in place (the *Reveal family).
 *    "stepped"      — discrete steps advanced by TIME rather than by a reader (the MapScrolly
 *                     family). The fourth narrative kind; see src/camera-mode.ts.
 */
export function storyComps(config, cameraMode) {
  const isSymbolMap = config.type === "symbol";
  const isLocatorMap = config.type === "locator";
  const isDotDensityMap = config.type === "dot-density";
  const isHexGridMap = config.type === "hex-grid";
  const isCartogramMap = config.type === "cartogram";
  const isRouteMap = config.type === "route";
  if (cameraMode === "guided-tour") {
    // route: a route has exactly ONE registered video composition family — RouteReveal
    // (remotion/src/Root.tsx registers no RouteStory/tour composition at all; a route's
    // "guided tour" and its "draw-on" are the same animation, because there is nothing for a
    // camera-guided fly-through to add over a line that already draws itself on-screen point
    // by point). So a route's guided-tour is RouteReveal, identically to what cameraMode
    // "route-reveal" already returns below — an explicit case, not a silent fallthrough to
    // a composition (ChoroplethStory) that has nothing to do with a route's data at all.
    if (isRouteMap)
      return [["RouteReveal", "landscape"], ["RouteRevealSquare", "square"], ["RouteRevealPortrait", "portrait"]];
    return isCartogramMap
      ? [["CartogramStory", "landscape"], ["CartogramStorySquare", "square"], ["CartogramStoryPortrait", "portrait"]]
      : isHexGridMap
      ? [["HexGridStory", "landscape"], ["HexGridStorySquare", "square"], ["HexGridStoryPortrait", "portrait"]]
      : isDotDensityMap
      ? [["DotDensityStory", "landscape"], ["DotDensityStorySquare", "square"], ["DotDensityStoryPortrait", "portrait"]]
      : isLocatorMap
      ? [["LocatorStory", "landscape"], ["LocatorStorySquare", "square"], ["LocatorStoryPortrait", "portrait"]]
      : isSymbolMap
      ? [["SymbolStory", "landscape"], ["SymbolStorySquare", "square"], ["SymbolStoryPortrait", "portrait"]]
      : [["ChoroplethStory", "landscape"], ["ChoroplethStorySquare", "square"], ["ChoroplethStoryPortrait", "portrait"]];
  }
  if (cameraMode === "route-reveal") {
    // Defence in depth: validate-config.ts's cameraModeError already refuses "route-reveal" on
    // a non-route config, named, before render. A gate can be bypassed (a hand-edited config, a
    // caller that skips validation) — this assertion is what stops the engine from THEN
    // rendering a route's line-draw-on for data that was never a route, quietly. Same posture as
    // the "not implemented" throw below: an invalid combination fails loud, never silently
    // returns the wrong composition.
    if (!isRouteMap)
      throw new Error(
        `camera mode 'route-reveal' does not apply to a "${config.type}" map — it is a route's own line draw-on`,
      );
    return [["RouteReveal", "landscape"], ["RouteRevealSquare", "square"], ["RouteRevealPortrait", "portrait"]];
  }
  // The reveal kind: fixed camera, the data animates in. All 21 reveal compositions are registered
  // (remotion/src/index.ts — 7 types x 3 aspects) and until now only route's was reachable here, so
  // six of them rendered correctly and nothing could ask for them. `guided-tour` stays the default
  // and the documented preference for most articles; this is the explicit opt-in, not a new default.
  // THE STEPPED KIND — one dispatcher for every type, unlike the two modes above. MapScrolly
  // (src/components/MapScrolly.tsx) switches on `config.type` itself and renders the matching
  // *Scrolly component, so there is no per-type composition to pick here: the three registered
  // aspects ARE the family. Its duration is computed per run (Root.tsx's `scrollyMeta`), because
  // a stepped video is as long as its walk has steps.
  if (cameraMode === "stepped") {
    return [["MapScrolly", "landscape"], ["MapScrollySquare", "square"], ["MapScrollyPortrait", "portrait"]];
  }
  if (cameraMode === "simple") {
    const base = isCartogramMap
      ? "CartogramReveal"
      : isHexGridMap
      ? "HexGridReveal"
      : isDotDensityMap
      ? "DotDensityReveal"
      : isLocatorMap
      ? "LocatorReveal"
      : isSymbolMap
      ? "SymbolReveal"
      : config.type === "route"
      ? "RouteReveal"
      : "ChoroplethReveal";
    return [[base, "landscape"], [`${base}Square`, "square"], [`${base}Portrait`, "portrait"]];
  }
  throw new Error(`camera mode '${cameraMode}' is not implemented`);
}

/** The no-choice default: unset `cameraMode`, a route always drew on (route-reveal — the only
 *  animation it has ever had) and everything else toured (guided-tour, the documented
 *  preference). Same values produce.mjs computed inline before this extraction — kept as one
 *  function so the "nothing chosen" path and the tested dispatch above can never drift apart. */
export function defaultCameraMode(config) {
  return config.type === "route" ? "route-reveal" : "guided-tour";
}

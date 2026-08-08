// What a ROUTE video frame actually has to ship to MapLibre — and, far more often, what it does
// not.
//
// THE ASYMMETRY THIS CLOSES. Every map-scrolly composition renders one frame as
// `delayRender → jumpTo → setData → setPaintProperty → settle → continueRender`. Two of them say
// so in their own source and mean it: ChoroplethScrolly.tsx keeps a `lastBeatIndex` ref ("Update
// source data only when the step's ref beat changes") and LocatorScrolly.tsx keeps a
// `lastRefBeatIndex` ("so we avoid setData on every frame"). RouteScrolly.tsx had no such guard:
// it called `setData` on `river`, on `river-head`, and on `trail-<key>` for EVERY crossed
// territory, on EVERY frame — and the trail payload it shipped was the SAME full border ring set
// each time. Every `setData` re-serializes the feature, hands it to MapLibre's worker and
// re-tiles it; the route is also the type whose payloads are the biggest (a territory's whole
// outline, a slice of a line that can carry tens of thousands of points from a real GPS trace).
// A 17-territory route over 2 469 frames asked for 46 911 source updates where ~1 200 carry
// information. That is the one thing the route composition does that the compositions rendering
// beside it do not.
//
// The guard is expressed here rather than inline so the invariant can be asserted over a whole
// timeline instead of trusted: run the plan across every frame of a render and count what it
// asks to ship.

/** A territory's border trail has exactly TWO states across an entire render, and this names
 *  them. `none` is the title scene (nothing tinted or outlined yet); `full` is every step after
 *  it — the overview outlines every crossed territory at once and no later step ever draws a
 *  PARTIAL border again (the fill blooms, the outline does not). So a whole render owes each
 *  territory at most two trail updates, not one per frame. */
export type TrailPayload = "none" | "full";

export function trailPayloadFor(activeStep: number): TrailPayload {
  return activeStep === 0 ? "none" : "full";
}

/** Per-render memory of what has already been shipped to each MapLibre source, so a frame ships
 *  only what CHANGED since the last frame that did.
 *
 *  Lossless by construction: the comparison is on the exact value the caller would have shipped
 *  (a payload name, or the drawn length in km as a raw number — no quantization, no tolerance),
 *  so a suppressed update is one MapLibre would have rendered identically. The rendered frames
 *  are unchanged; only the work behind them is. */
export interface RouteSourceCache {
  /** True when this territory's trail payload differs from the last one shipped for it. */
  trailChanged(territoryKey: string, payload: TrailPayload): boolean;
  /** True when the route's drawn extent differs from the last one shipped. Covers `river` and
   *  `river-head` together: both are slices of the same line taken at the same drawn length, so
   *  they change on exactly the same frames. */
  riverChanged(drawnKm: number): boolean;
}

export function makeRouteSourceCache(): RouteSourceCache {
  const trails = new Map<string, TrailPayload>();
  let river: number | null = null;
  return {
    trailChanged(territoryKey, payload) {
      if (trails.get(territoryKey) === payload) return false;
      trails.set(territoryKey, payload);
      return true;
    },
    riverChanged(drawnKm) {
      if (river === drawnKm) return false;
      river = drawnKm;
      return true;
    },
  };
}

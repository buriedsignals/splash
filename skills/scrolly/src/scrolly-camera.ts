// Shared scroll-driven camera flight for every Scrolly*Map component.
//
// Why this exists — the "camera stays zoomed out on the full extent, never zooms
// into the revealed feature" bug:
// a scrolly reveals ONE region/feature per step, and each reveal beat's camera is
// already the focused feature's tight bounds (deriveMapStory/deriveSymbolStory →
// cameraForBounds). The DESTINATION is correct — when the reader pauses on a step
// the camera settles tightly on the feature. The failure is in the TRANSITION.
//
// maplibre's `flyTo` `minZoom` is the zoom at the APEX of the arc — the flight's
// most-zoomed-out point. An earlier fix set it to min(from,to) − 0.5 to keep a
// far-apart reveal→reveal move from arcing all the way back to the full extent.
// But that subtracted margin was itself the bug on the COMMON case:
//   1. A reveal is a zoom-IN (to > from). min(from,to) − margin = from − margin,
//      which is BELOW the current zoom → the flight first pulls BACK (wider than
//      where it started) before zooming in. A visible full-extent flash.
//   2. The reader scrolls faster than the 1200 ms flight, so each step interrupts
//      the last. `map.getZoom()` is read LIVE mid-flight — already dipped — and the
//      margin is subtracted AGAIN from that dipped value. The floor RATCHETS lower
//      every step, so the camera drifts wider and wider, sits at/below the full
//      extent, and never reaches the tight reveal. (Reproduced: continuous scroll
//      held zoom in [2.07, 3.17] while the reveal targets were 3.99–5.71.)
//
// The correct cap is the TIGHTER endpoint itself, with NO margin. On a zoom-in the
// apex then equals `from`, so the flight only zooms IN (floor = the current zoom):
// it can never pull below where it already is, which makes it monotonic and
// immune to the interruption ratchet (a reveal's fit-zoom is always ≥ the extent
// zoom, so the camera provably never widens past the establish extent). A
// reveal→reveal move still stays at the tighter reveal (even tighter than before),
// and only an establish/takeaway transition — whose endpoint IS the extent — widens
// to it. Extracted here so all six scrolly map types inherit one behaviour.

import type * as maptilersdk from "@maptiler/sdk";

export interface BeatCamera {
  center: [number, number];
  zoom: number;
}

// Fixed flight duration for every scrolly step (ms).
export const FLIGHT_DURATION = 1200;

// The most-zoomed-out point the flight is allowed to reach: the TIGHTER of the two
// endpoints, never wider. On a zoom-in (to > from) this is `from`, so the flight
// only zooms IN — no backwards pull-back, and no ratchet under scroll interruption.
// Pure + tested.
export function peakFlightZoom(fromZoom: number, toZoom: number): number {
  return Math.min(fromZoom, toZoom);
}

// Move the camera to a beat's precomputed camera. Reduced-motion → instant jump.
// Otherwise a peak-bounded flyTo that stays tight on the focus between steps.
export function flyToBeat(
  map: InstanceType<typeof maptilersdk.Map>,
  cam: BeatCamera,
): void {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    map.jumpTo({ center: cam.center, zoom: cam.zoom });
    return;
  }
  map.flyTo({
    center: cam.center,
    zoom: cam.zoom,
    // Apex = the tighter endpoint (never wider). On a reveal (zoom-in) this equals
    // the current zoom, so the camera only zooms IN toward the focused feature —
    // no full-extent pull-back, no interruption ratchet.
    minZoom: peakFlightZoom(map.getZoom(), cam.zoom),
    duration: FLIGHT_DURATION,
    essential: true,
  });
}

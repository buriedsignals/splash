// Shared scroll-driven camera flight for every Scrolly*Map component.
//
// Why this exists — the "camera pulls back to the full extent between steps" bug:
// a scrolly reveals ONE region/feature per step, and each reveal beat's camera is
// already the focused feature's bounds. But maplibre's DEFAULT flyTo follows a
// parabolic curve that zooms OUT to a wide "peak" partway through the flight; for
// reveals that are far apart on the map, that peak pulls the camera all the way
// back to (roughly) the full data extent. The reader loses the focused region
// mid-scroll ("on ne comprend pas"), and a wide camera also drops the focus label
// under text-allow-overlap:false. The endpoints are tight; the TRANSITION is not.
//
// The fix caps the flight's peak zoom (flyTo's `minZoom` = the zoom at the apex of
// the arc; note maplibre ignores it if `curve` is also set, so we pass no curve)
// to a small margin below the TIGHTER of the two endpoints. A reveal→reveal
// transition therefore stays tightly framed and never widens past its own reveal;
// only a transition whose endpoint IS the full extent (establish ⇄ takeaway)
// legitimately widens to it. Extracted here so all six scrolly map types inherit
// the same behaviour from one place.

import type * as maptilersdk from "@maptiler/sdk";

export interface BeatCamera {
  center: [number, number];
  zoom: number;
}

// Gentle contextual zoom-out allowed at the apex of a transit — enough to read as
// motion, never enough to lose the focused region. Peak zoom = min(from,to) − this.
// Tuning knob: larger = more zoom-out between steps (toward the old full-extent
// pull-back); 0 = a flat pan that never zooms out below the tighter endpoint.
export const PEAK_ZOOM_MARGIN = 0.5;

// Fixed flight duration for every scrolly step (ms).
export const FLIGHT_DURATION = 1200;

// The most-zoomed-out point the flight is allowed to reach. Bounded to just below
// the TIGHTER endpoint so a reveal→reveal move keeps its framing; pure + tested.
export function peakFlightZoom(
  fromZoom: number,
  toZoom: number,
  margin: number = PEAK_ZOOM_MARGIN,
): number {
  return Math.min(fromZoom, toZoom) - margin;
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
    // Cap the arc's apex just under the tighter endpoint → no full-extent
    // pull-back between reveals; the focus (and its label) stays on screen.
    minZoom: peakFlightZoom(map.getZoom(), cam.zoom),
    duration: FLIGHT_DURATION,
    essential: true,
  });
}

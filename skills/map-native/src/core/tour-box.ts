// tour-box.ts — HOW BIG A BOX A GUIDED TOUR FRAMES AROUND ONE STOP.
//
// ★ A TOUR'S STOP BOX IS A FRACTION OF THE SET'S OWN SPREAD, NEVER A CONSTANT.
//
// The stop box used to be a constant half-width of 1.5° — a "city framing box", written when the
// only tours anyone ran were between places far enough apart that 1.5° was tight. Measured on
// Rémy's own run, 2026-08-06: a locator `story` of four Alpine glaciers, all inside 90 km, toured
// as guided-tour. Every one of the four beats solved to zoom 6.25 ± 0.02 on a 230 × 334 km box,
// while the box holding all four markers is 65 × 71 km. So each stop was framed 3.5× WIDER than
// the establishing shot, the four boxes overlapped almost completely, and the video read exactly
// as the journalist reported it: "le cadre reste sur la même vue large des Alpes aux quatre
// étapes, et ce sont les repères qui s'allument tour à tour."
//
// The bug is arithmetic, not a capability limit: the stop box was constant and the spread was
// not, so the TIGHTER the cluster the MORE the tour flattened — the camera zoomed out to a fixed
// window and then panned inside it by a fraction of a frame. 90 km is plenty of distance to
// travel; nothing about a 90 km spread forbids a tour.
//
// So: a stop is framed at HALF the linear extent of the set it belongs to — one clean zoom level
// in from the establishing shot — which puts consecutive stops 1.5–3 frame-widths apart and makes
// each stop a genuinely new view. Bounded on both ends:
//   · never wider than WIDE_TOUR_DELTA, so a set already spread across a continent is framed
//     EXACTLY as it is today (the cap binds whenever the half-spread reaches 3°, i.e. any set
//     spanning ≥ 6°);
//   · never tighter than MIN_TOUR_DELTA, so markers a few hundred metres apart do not put the
//     camera in the street — the single-marker over-zoom ScrollyLocatorMap explicitly relies on
//     not happening.
// A set with NO spread (one marker, or all coincident) has no tour to serve, so it keeps the wide
// "where is this place" box rather than diving to the floor.

/** Half-width (deg) of the widest stop box — the "where is this place" framing, and the value
 *  every stop box used to be unconditionally. */
export const WIDE_TOUR_DELTA = 1.5;
/** A stop is framed at this fraction of the set's half-spread: 0.5 = twice the establishing
 *  scale. Lower flies further per beat; 1.0 would frame every stop as wide as the whole set and
 *  put the camera back where this file found it. */
export const TOUR_SCALE = 0.5;
/** Half-width (deg) below which a stop box may not go — ~5.5 km across. */
export const MIN_TOUR_DELTA = 0.05;

/**
 * The half-width (degrees) of the box a tour beat frames around its own stop.
 *
 * Reads the WIDER of the two axes: a set strung out north–south has a narrow longitude spread
 * that says nothing about how far the camera has to travel, and framing off it would over-zoom
 * every stop.
 *
 * Longitude is read RAW (no antimeridian unwrapping) on purpose — this is a magnitude, not a
 * frame. A set straddling the antimeridian reads as ~360° wide here, which saturates the cap and
 * yields WIDE_TOUR_DELTA: the same box those markers get today. The camera's own antimeridian
 * correctness lives in core/longitude.ts, where the bounds are computed.
 */
export function tourBoxDelta(marks: { lon: number; lat: number }[]): number {
  if (marks.length === 0) return WIDE_TOUR_DELTA;
  const lons = marks.map((m) => m.lon);
  const lats = marks.map((m) => m.lat);
  const halfSpread = Math.max(
    (Math.max(...lons) - Math.min(...lons)) / 2,
    (Math.max(...lats) - Math.min(...lats)) / 2,
  );
  if (halfSpread <= 0) return WIDE_TOUR_DELTA;
  return Math.min(
    WIDE_TOUR_DELTA,
    Math.max(MIN_TOUR_DELTA, halfSpread * TOUR_SCALE),
  );
}

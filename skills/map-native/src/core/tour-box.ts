// tour-box.ts — HOW BIG A BOX A GUIDED TOUR FRAMES AROUND ONE STOP.
//
// ★ A STOP IS THE ESTABLISHING BOX, HALVED ON BOTH AXES, CENTRED ON THE STOP.
//
// ONE rule, for every walk that tours: the locator video tour, the symbol story's confirmed
// arc and its salience walk, the locator scrolly, and every scrolly track that reads their
// beats. It used to be two, and they disagreed — see "WHY ONE FUNCTION" below.
//
// The stop box began as a constant half-width of 1.5° — a "city framing box", written when
// the only tours anyone ran were between places far enough apart that 1.5° was tight.
// Measured on Rémy's own run, 2026-08-06: a locator `story` of four Alpine glaciers, all
// inside 90 km, toured as guided-tour. Every one of the four beats framed a box 3.5× WIDER
// than the box holding all four markers, the four frames overlapped almost completely, and
// the video read exactly as the journalist reported it: "le cadre reste sur la même vue
// large des Alpes aux quatre étapes, et ce sont les repères qui s'allument tour à tour."
//
// The bug is arithmetic, not a capability limit: the stop box was constant and the spread
// was not, so the TIGHTER the cluster the MORE the tour flattened — the camera zoomed out to
// a fixed window and then panned inside it by a fraction of a frame. 90 km is plenty of
// distance to travel; nothing about a 90 km spread forbids a tour.
//
// ★ WHY ONE FUNCTION, AND WHY THIS ONE.
//
// The first answer to "how tight is a stop" was a SCALAR half-width — max(lonSpread,
// latSpread)/4, floored at 0.05°, capped at 1.5° — applied as a SQUARE box around the mark.
// A scalar can only be right for a set that is about as tall as it is wide, and it fails a
// RIBBON in the direction that matters. Both failures are measured off rendered mp4s at
// 1280×720, by the pixel distance between marks of known coordinates (never by a whole-frame
// pixel metric, which measures ink and not camera).
//
// ★ THAT MEASUREMENT IS NOW A COMMITTED TOOL, not a number to re-derive by hand:
//   `bun skills/map-native/scripts/measure-camera.mjs <mp4> <config.json> locator|symbol`
//   prints the zoom of every beat, and lib/core/camera-measure.ts holds the arithmetic, its
//   stated limits, and unit tests. The four rows below are pinned as GROUND TRUTH in
//   lib/core/camera-measure.fixture.json — the real hue masks of these very renders — so a
//   change that breaks the instrument reddens the gate instead of quietly re-deriving:
//
//   set shape                         establish   stop (scalar)   stop (this box)
//   four Alpine glaciers, 0.85×0.64°  z 8.478     z 9.06  (+0.58)  z 9.47  (+0.99)
//   five Seine sites, 0.0804×0.0103°  z 13.258    z 11.07 (−2.19)  z 14.26 (+1.00)
//   six European cities, 17.1×12.1°   z 4.224     the ±1.5° box    the same ±1.5° box
//
// (a zoom is only readable where TWO marks share the frame. Under the scalar the glacier
// walk had that at two of its four stops and the continental walk at none of its five —
// which is itself the reading: the tighter the true framing, the fewer neighbours remain.)
//
// (and on the SCROLLY track, which is a different renderer at 900×700 — the Seine sites read
// off the built page's own `window.__map__`: establish 12.721, every stop 11.370 before and
// 13.721 after, i.e. −1.35 levels becoming +1.00.)
//
// The ribbon row is the whole argument. A scalar spends its entire budget on the set's empty
// axis: for the Seine sites the floor bound (half-spread 0.0402 × 0.5 = 0.0201 < 0.05), so
// the "stop" was a 0.1° square — WIDER than the 0.0804° box holding all five sites — and the
// camera zoomed OUT 2.19 levels at every beat, the exact flattening this file exists to end,
// two orders of magnitude down from where it was first found. Halving each axis on its own
// is one clean zoom level in BY CONSTRUCTION, for any set shape: halve both extents and you
// halve the frame, whichever axis `cameraForBounds` ends up fitting to.
//
// Two bounds, and only two:
//
//   · THE CAP, per axis. A half-extent is never wider than WIDE_TOUR_DELTA. This is the one
//     ABSOLUTE statement the rule makes, and it is an editorial one: a tour of places a
//     continent apart should arrive at a PLACE, not at half a continent. Rendered both ways
//     on the six European cities and counted off the frames: with the cap, every stop frame
//     holds exactly ONE city — the reader lands on it. Without it, a "stop" is an 8.55° ×
//     6.05° box (z 5.05–5.17, still ~1 level in) and the Paris beat holds FOUR of the six
//     cities, labels and all — the callout says Paris while the frame re-shows the whole
//     distribution, which is the "same wide view with a different pin lit" this file exists
//     to end. The cap can only TIGHTEN a stop, never widen it, so it cannot re-introduce the
//     zoom-out: every stop is at least one clean level in from the establishing shot, and a
//     capped one is further in still.
//     It is also why a continental set is framed EXACTLY as it was before any of this: every
//     beat's camera box is bit-identical to the old constant. ⚠ That identity is NOT
//     checkable by SHA-256 of the mp4, which is what the commit before this one used: the
//     video render is not byte-deterministic. Measured 2026-08-07 — the same config rendered
//     three times by the SAME code produced three different hashes (sizes 10359783 /
//     10359802 / 10359730). What IS checkable is the frames: diffed at every beat's settled
//     frame, before vs after this change comes to max|Δ| 13 on one channel and 0.0000% of
//     channels past the ±40 codec tolerance — inside the noise floor of two same-code
//     renders (max|Δ| 7).
//
//   · NO FLOOR, and none is needed — the box is defined RELATIVE to a shot the reader has
//     just been shown, and half of a frame you have already read cannot disorient you. The
//     scalar's 0.05° floor is precisely what broke the ribbon.
//
// A set with NO spread (one marker, or all coincident) has nothing to halve and no tour to
// serve: `tourStopBox` returns null and the caller keeps its establishing box, which
// `establishBox` widens to the "where is this place" framing for exactly that case.
//
// Longitude is read as the caller hands it over. Each engine computes its own bounds through
// core/longitude.ts's `shortWayLongitudeExtent`, so an antimeridian-straddling set arrives
// here already unwrapped (east may exceed +180) and is framed off its TRUE spread rather
// than off a 359°-wide tear. The box is centred on the mark's own longitude, so it inherits
// the same unwrapped frame the camera uses.

/** Half-width (deg) of the widest box a tour ever frames — the "where is this place"
 *  framing, and the value every stop box used to be unconditionally. */
export const WIDE_TOUR_DELTA = 1.5;
/** A stop is framed at this fraction of the establishing box: 0.5 = one zoom level in.
 *  Lower flies further per beat; 1.0 would frame every stop as wide as the whole set and put
 *  the camera back where this file found it. */
export const TOUR_SCALE = 0.5;

/**
 * The box the establishing / takeaway beats frame: the set's own bounds — EXCEPT when the
 * set has no spread at all (one mark, or all coincident), where that bbox is a zero-area
 * point and `cameraForBounds` solves it to zoom 22, a blank tile with nothing on it. Such a
 * set keeps the wide "where is this place" framing instead. Any set with real spread on
 * EITHER axis is returned untouched, byte for byte.
 */
export function establishBox(
  bbox: readonly [number, number, number, number],
): [number, number, number, number] {
  const [w, s, e, n] = bbox;
  if (e > w || n > s) return [w, s, e, n];
  return [
    w - WIDE_TOUR_DELTA,
    s - WIDE_TOUR_DELTA,
    e + WIDE_TOUR_DELTA,
    n + WIDE_TOUR_DELTA,
  ];
}

/**
 * The box a tour beat frames around its own stop: the establishing box halved on both axes
 * and centred on the stop, with each half-extent clamped DOWN to `WIDE_TOUR_DELTA`.
 *
 * `allBounds` must be the box the tour's own establishing shot frames — what the reader has
 * just seen — and NOT a widened stand-in for it: sizing a stop off padding would manufacture
 * a tour out of nothing, giving a lone mark an establish-zoom-in-pull-back it has no data
 * reason to perform. Callers therefore pass their raw data bounds and fall back to their
 * establishing box on null.
 *
 * Returns null when the set has no spread at all — nothing to halve, no tour to serve.
 */
export function tourStopBox(
  allBounds: readonly [number, number, number, number],
  mark: { lon: number; lat: number },
): [number, number, number, number] | null {
  const [w, s, e, n] = allBounds;
  const dLon = Math.min(((e - w) / 2) * TOUR_SCALE, WIDE_TOUR_DELTA);
  const dLat = Math.min(((n - s) / 2) * TOUR_SCALE, WIDE_TOUR_DELTA);
  if (dLon <= 0 && dLat <= 0) return null;
  return [mark.lon - dLon, mark.lat - dLat, mark.lon + dLon, mark.lat + dLat];
}

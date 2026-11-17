// The ladder of removes, framed: what each radius around the subject holds, draws and frames. Pure, so the
// render and the radii a refusal offers read the SAME windows.
//
// gx-locator web (Qwen3.5-9B, mvq55): "frames no peer: widen its radius" and "frame the same window" named no
// radius that works, and the model walked the four radii between 130/320/800 and 470/1150/2900 render after
// render. The radii that work are computed here from the peers' own distances.

const RAD = Math.PI / 180;
/** How many peers one remove may draw, however many its frame holds. */
export const OTHERS_DRAWN = 12;
/** How many settlements one remove may draw. */
export const PLACES_DRAWN = 6;
/** How much wider each remove's frame must be than the one before it: vantage.ts's MIN_STEP, held equal by a test. */
export const MIN_STEP = 2;
/** Room a remove leaves around what it draws, as a fraction of its own box. */
const WINDOW_PAD = 0.1;

export function frameRemoves(beat, subject) {
  const kmPerDegLon = 111.32 * Math.cos(subject.lat * RAD);
  const kmPerDegLat = 110.574;
  const boxAround = (radiusKm) => ({
    west: subject.lon - radiusKm / kmPerDegLon,
    east: subject.lon + radiusKm / kmPerDegLon,
    south: subject.lat - radiusKm / kmPerDegLat,
    north: subject.lat + radiusKm / kmPerDegLat,
  });
  const extent = {
    west: Math.min(subject.lon, ...beat.others.map((s) => s.lon)),
    east: Math.max(subject.lon, ...beat.others.map((s) => s.lon)),
    south: Math.min(subject.lat, ...beat.others.map((s) => s.lat)),
    north: Math.max(subject.lat, ...beat.others.map((s) => s.lat)),
  };
  const inWindow = (w, p) => p.lon >= w.west && p.lon <= w.east && p.lat >= w.south && p.lat <= w.north;
  const frame = (rung) => {
    const selection = rung.radius === null ? extent : boxAround(rung.radius);
    const heldOthers = beat.others.filter((s) => inWindow(selection, s)).sort((a, b) => b.priority - a.priority);
    const heldPlaces = beat.places.filter((p) => inWindow(selection, p)).sort((a, b) => b.priority - a.priority);
    const drawnOthers = heldOthers.slice(0, OTHERS_DRAWN);
    const drawnPlaces = rung.places === false ? [] : heldPlaces.slice(0, PLACES_DRAWN);
    const drawn = [subject, ...drawnOthers, ...drawnPlaces];
    const raw = {
      west: Math.min(...drawn.map((m) => m.lon)),
      east: Math.max(...drawn.map((m) => m.lon)),
      south: Math.min(...drawn.map((m) => m.lat)),
      north: Math.max(...drawn.map((m) => m.lat)),
    };
    const padLon = Math.max((raw.east - raw.west) * WINDOW_PAD, 0.25);
    const padLat = Math.max((raw.north - raw.south) * WINDOW_PAD, 0.25);
    const window = { west: raw.west - padLon, east: raw.east + padLon, south: raw.south - padLat, north: raw.north + padLat };
    const spanKm = (window.east - window.west) * kmPerDegLon;
    // What Mercator costs THIS type, per remove: ground scale runs as cos(latitude), so a bar true at
    // the centre of the frame is wrong at its edges by the ratio of the two cosines.
    const edgeError = Math.max(Math.cos(window.south * RAD), Math.cos(window.north * RAD)) / Math.min(Math.cos(window.south * RAD), Math.cos(window.north * RAD));
    return { ...rung, window, spanKm, edgeError, heldOthers, heldPlaces, drawnOthers, drawnPlaces };
  };
  return { frame, removes: beat.removes.map(frame), kmPerDegLon, kmPerDegLat };
}

/** The window as vantage.ts compares it: two removes with one box are one picture. */
export const boxOf = (w) => [w.west, w.south, w.east, w.north].map((v) => v.toFixed(4)).join(",");

/** A radius a journalist would write: the next round number above `km`. */
const roundUp = (km) => {
  const step = km < 100 ? 10 : km < 1000 ? 50 : 100;
  return Math.ceil(km / step) * step;
};

/**
 * Rising radii, one per remove that has one, such that every remove but the default holds a peer and frames at least MIN_STEP
 * times the width of the remove before it (the null remove included, so its frame must stay MIN_STEP times the
 * last sized one). Candidates stand just past each peer, so the narrowest that works is found first. Returns
 * { [key]: radius }, or null when the peers cannot fill this many removes.
 */
export function radiiThatWork(beat, subject, { defaultAlone = true } = {}) {
  const { frame, kmPerDegLon, kmPerDegLat } = frameRemoves(beat, subject);
  const sized = beat.removes.filter((r) => r.radius !== null);
  const last = beat.removes[beat.removes.length - 1];
  const reach = (p) => roundUp(Math.max(Math.abs(p.lon - subject.lon) * kmPerDegLon, Math.abs(p.lat - subject.lat) * kmPerDegLat) * 1.05);
  // A frame widens only when a mark joins it: a peer, or a settlement on a remove that draws them.
  const candidates = [...new Set([...beat.others, ...beat.places].map(reach))].sort((a, b) => a - b);
  const out = {};
  let previousSpan = 0;
  let at = 0;
  for (const rung of sized) {
    let chosen = null;
    for (; at < candidates.length && chosen === null; at += 1) {
      const framed = frame({ ...rung, radius: candidates[at] });
      // The default remove may stand alone with the subject: its note does not name a neighbour.
      if ((framed.heldOthers.length || (defaultAlone && rung.key === beat.defaultKey)) && framed.spanKm >= MIN_STEP * previousSpan) {
        chosen = candidates[at];
        previousSpan = framed.spanKm;
      }
    }
    if (chosen === null) return null;
    out[rung.key] = chosen;
  }
  if (last.radius === null && frame(last).spanKm < MIN_STEP * previousSpan) return null;
  return out;
}

/** Each remove's step out from the one before, as `{ from, to, step }`, for the ones under MIN_STEP. */
export function shortSteps(removes) {
  return removes.slice(1).map((r, i) => ({ from: removes[i].key, to: r.key, step: r.spanKm / removes[i].spanKm })).filter((s) => s.step < MIN_STEP);
}

/**
 * The nearest ladder that works, as `{ removes, radii, placesOff, dropped }`, a default framing a peer before one
 * standing alone with the subject; within each, the removes as written first; then
 * the sized ones drawing no settlement (settlements widen a frame before any peer joins it); then each
 * non-default sized remove dropped, the same two ways. Null when nothing near the beat works.
 */
export function ladderThatWorks(beat, subject) {
  const sizedKeys = beat.removes.filter((r) => r.radius !== null && r.key !== beat.defaultKey).map((r) => r.key);
  // A default that frames a peer first: it is the picture a reader lands on.
  for (const defaultAlone of [false, true])
  for (const dropped of [null, ...sizedKeys])
    for (const placesOff of [false, true]) {
      const removes = beat.removes
        .filter((r) => r.key !== dropped)
        .map((r) => (placesOff && r.radius !== null ? { ...r, places: false } : r));
      const radii = radiiThatWork({ ...beat, removes }, subject, { defaultAlone });
      if (radii) return { removes, radii, placesOff: placesOff && beat.removes.some((r) => r.radius !== null && r.places !== false), dropped };
    }
  return null;
}

/** The sentence a refusal ends with: the ladder that works, spelled out, or why none does. */
export function radiiHint(beat, subject) {
  const found = ladderThatWorks(beat, subject);
  if (!found) return `no ladder of ${beat.removes.length} removes works on these peers: keep two, the default and the last`;
  const keep = beat.removes[beat.removes.length - 1].radius === null ? "; keep the last null" : "";
  const changes = [
    found.dropped ? `drop remove ${found.dropped} (the peers cannot fill ${beat.removes.length} removes at ${MIN_STEP}x each)` : "",
    found.placesOff ? "set places: false on every remove (settlements widen a frame before a peer joins it)" : "",
  ].filter(Boolean);
  return `${changes.length ? `${changes.join(", and ")}; then ` : ""}radii that work, rising: ${Object.entries(found.radii).map(([k, r]) => `${k} ${r}`).join(" · ")} (radius in km${keep})`;
}

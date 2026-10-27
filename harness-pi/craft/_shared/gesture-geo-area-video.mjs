// The video scheduler for the AREA maps (GRAMMAR.md §5): six events — establish (the title card) and reference (the
// map arriving on its classes) are the scheduler's; the three composed gestures fill reveal, subject and conclusion
// in order; hold repeats the conclusion. The core already refuses a list that is not three long, and a zoom or filter
// in the conclusion (it must show the whole map, doctrine rule 9).
//
// A video state is FLAT and numeric, so the frame interpolates it linearly (research/families.md §4.8): per place
// `a:KEY` (accent ring), `r:KEY` (ink ring), `b:KEY` (washed back), `n:KEY` (named), `f:KEY` (inside a reference's
// floor), plus `classes` (how many classes have arrived, lowest first — a reveal climbs it), `zoom` (0 whole, 1 at the
// close-up), `title`, `map`, `credit` and `g0..g2` (a gesture's note shown). Names are words: they exist only at a
// measured camera, so a state that travels (zoom moving) carries `travel: 1` and the frame gates the names off.
// Browser-safe: the Remotion bundle imports it.
import { accentKey } from "./gesture-geo-area-static.mjs";

export const GEO_VIDEO_EVENTS = ["establish", "reference", "reveal", "subject", "conclusion", "hold"];

/** One geo state as the flat record a frame interpolates. */
export function flatGeoState(geo, s, extra = {}) {
  const out = { classes: s.classesShown, zoom: s.camera === "closeUp" ? 1 : 0, ...extra };
  const floorKeys = s.floor === null ? new Set() : new Set(geo.marks.filter((m) => geo.classOf(m.key) >= s.floor).map((m) => m.key));
  for (const m of geo.marks) {
    out[`a:${m.key}`] = s.accent === m.key ? 1 : 0;
    out[`r:${m.key}`] = s.rings.includes(m.key) && s.accent !== m.key ? 1 : 0;
    out[`b:${m.key}`] = s.kept && !s.kept.includes(m.key) ? 1 : 0;
    out[`n:${m.key}`] = s.named.includes(m.key) ? 1 : 0;
    out[`f:${m.key}`] = floorKeys.has(m.key) ? 1 : 0;
  }
  return out;
}

/**
 * @param valid  validateGestures' gestures (format "video": exactly three)
 * @returns      { events: [{ event, state, flat, gesture? }], focus } — focus: the keys the close-up frames, if any
 */
export function scheduleGeoVideo({ valid, geo }) {
  const accent = accentKey(geo, valid);
  const hasReveal = valid.some((g) => g.do === "reveal");
  let s = { ...geo.rest(), accent: null, classesShown: hasReveal ? 0 : geo.classes.length };
  const notes = { g0: 0, g1: 0, g2: 0 };
  const events = [
    { event: "establish", state: s, flat: flatGeoState(geo, { ...s, classesShown: 0 }, { title: 1, map: 0, credit: 0, travel: 0, ...notes }) },
    { event: "reference", state: s, flat: flatGeoState(geo, s, { title: 0, map: 1, credit: 0, travel: 0, ...notes }) },
  ];
  // The subject takes its accent ring with the first gesture that touches anything.
  let focus = null;
  valid.forEach((g, k) => {
    let next = geo.apply(k === 0 && accent ? { ...s, accent } : s, g);
    if (g.do === "reveal") next = { ...next, classesShown: geo.classes.length };
    // The conclusion shows the whole map (doctrine rule 9): what was filtered or zoomed returns, what was shown stays ringed.
    if (k === 2) next = { ...next, kept: null, camera: "whole", focus: null, factor: null };
    if (g.do === "zoom") focus = next.focus;
    notes[`g${k}`] = g.note ? 1 : 0;
    const travel = (s.camera !== next.camera) ? 1 : 0;
    events.push({ event: GEO_VIDEO_EVENTS[2 + k], gesture: k, state: next, flat: flatGeoState(geo, next, { title: 0, map: 1, credit: k === 2 ? 1 : 0, travel, ...notes }) });
    s = next;
  });
  events.push({ event: "hold", state: s, flat: { ...events.at(-1).flat, travel: 0, credit: 1 } });
  return { events, focus };
}

/** The state at frame t of an event of `n` frames: linear between the previous event's flat state and this one's. */
export function geoFrameState(events, index, t) {
  const to = events[index].flat;
  const from = index > 0 ? events[index - 1].flat : to;
  const out = {};
  for (const k of Object.keys(to)) out[k] = (from[k] ?? 0) + ((to[k] ?? 0) - (from[k] ?? 0)) * Math.max(0, Math.min(1, t));
  // Words only at a measured camera: names fade in after a travelling event lands.
  if (to.travel) for (const k of Object.keys(out)) if (k.startsWith("n:")) out[k] = t >= 1 ? to[k] : 0;
  return out;
}

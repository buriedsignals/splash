// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-proportional-symbol-europe-capacity/subject.mjs,
// which read the frozen register of 8 900 stations. The derivation is the proof's: rank the sites, keep the `drawCount`
// largest (the proof's hundred), their share of the whole, the share after each one in turn (what the count climbs
// through), the largest value (the circles' scale). The proof ASSERTED its answers (a hundredth of the sites, over a
// third of the capacity); here the claim is beat.mjs's `check()`.
//
// Runs in Bun only.

/** The window the sites must stand in: the camera fits every site, and the map is Europe's. */
export const SITE_WINDOW = { west: -32, east: 60, south: 27, north: 82 };

const n = (v) => String(+Number(v).toPrecision(4));

/** The key's two named circles: the largest round value (1, 2, 4 or 5 × 10ⁿ) under ¾ of the largest site, and a tenth of it. */
export function keyValuesOf(max) {
  const cap = 0.75 * max;
  const p = 10 ** Math.floor(Math.log10(cap));
  const big = [5, 4, 2, 1].map((m) => m * p).find((v) => v <= cap);
  return [big, big / 10];
}

/** What `check(map)` receives, and the sites ranked — computed before any refusal of the gesture's. */
export function readingOf(beat) {
  if (!Array.isArray(beat.symbols) || !beat.symbols.length) throw new Error("beat.mjs: symbols must be a non-empty array of { lon, lat, value } — one per site");
  const bad = beat.symbols.filter((s) => ![s?.lon, s?.lat, s?.value].every((v) => typeof v === "number" && Number.isFinite(v)));
  if (bad.length) throw new Error(`symbols hold ${bad.length} row(s) whose lon, lat or value is not a number (${JSON.stringify(bad[0])}): convert with Number(), or leave the rows out`);
  const stations = beat.symbols.map((s) => ({ lon: s.lon, lat: s.lat, mw: s.value }));
  const ranked = stations.map((s, i) => ({ ...s, index: i })).sort((a, b) => b.mw - a.mw);
  const sum = stations.reduce((a, s) => a + s.mw, 0);
  const shareOf = (k) => (ranked.slice(0, k).reduce((a, s) => a + s.mw, 0) / sum) * 100;
  const TOP = beat.drawCount ?? 100;
  const helpers = { ranked: ranked.map((s) => ({ lon: s.lon, lat: s.lat, value: s.mw })), total: stations.length, sum, drawCount: TOP, shareTop: shareOf(TOP), shareOf };
  return { stations, ranked, sum, TOP, helpers };
}

/**
 * @returns the shape the proof's `loadSubject` returned: `{ stations, total, mwAll, ranked, shareTop, cumulative, maxMw }`,
 *          plus `TOP` (how many circles) and `keyValues` (the key's two named circles)
 */
export function subjectOf({ stations, ranked, sum, TOP }, beat) {
  if (!(Number.isInteger(TOP) && TOP >= 10 && TOP <= 150)) throw new Error(`drawCount is ${JSON.stringify(beat.drawCount)}: the video draws between 10 and 150 circles, one by one`);
  if (stations.length < 2 * TOP) throw new Error(`symbols has ${stations.length} sites and drawCount is ${TOP}: the video argues the few largest against the many others, so the others must outnumber the circles — lower drawCount`);
  const neg = stations.filter((s) => !(s.mw > 0));
  if (neg.length) throw new Error(`a circle's area is its value, so every value must be above 0; ${neg.length} are not (${n(neg[0].mw)}): leave those rows out`);
  const w = SITE_WINDOW;
  const out = stations.filter((s) => !(s.lon >= w.west && s.lon <= w.east && s.lat >= w.south && s.lat <= w.north));
  if (out.length) throw new Error(`${out.length} site(s) stand outside Europe (${w.west}..${w.east}° E, ${w.south}..${w.north}° N), e.g. ${n(out[0].lon)}, ${n(out[0].lat)}: the camera holds every site — leave them out, or check lon/lat are not swapped`);
  let running = 0;
  const cumulative = ranked.slice(0, TOP).map((s) => ((running += s.mw) / sum) * 100);
  const shareTop = cumulative[TOP - 1];
  const maxMw = ranked[0].mw;
  const keyValues = beat.keyValues ?? keyValuesOf(maxMw);
  if (!(Array.isArray(keyValues) && keyValues.length === 2 && keyValues[0] > keyValues[1] && keyValues[1] > 0 && keyValues[0] <= maxMw))
    throw new Error(`keyValues is ${JSON.stringify(beat.keyValues)}: two values for the key's named circles, larger first, each above 0 and at most the largest site (${n(maxMw)}) — or leave it out`);
  return { stations, total: stations.length, mwAll: sum, ranked, shareTop, cumulative, maxMw, TOP, keyValues };
}

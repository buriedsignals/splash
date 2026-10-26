// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-dot-density-europe-stations/subject.mjs, which
// read the frozen register of 8 900 stations. The derivation is the proof's: every site a dot, grouped (the proof's
// fuels), the groups arriving one after another — the most sites first, the subject's group last whatever its count —,
// the subject's share of the sites and of the summed value. The proof ASSERTED its answers (nuclear under 1 % of the
// sites, over 30 % of the capacity, the most concentrated fuel); here the claim is beat.mjs's `check()`.
//
// Runs in Bun only.

/** The window the sites must stand in: the camera fits every site, and the map is Europe's. */
export const SITE_WINDOW = { west: -32, east: 60, south: 27, north: 82 };
/** How many groups arrive one after another (each is its own set of map layers). */
export const MAX_GROUPS = 12;

const n = (v) => String(+Number(v).toPrecision(4));
const nice = (raw, multiples) => {
  const p = 10 ** Math.floor(Math.log10(raw));
  return multiples.map((m) => m * p);
};

/** The count's step: the proof's hundred for 8 900 sites — a round step giving at most 89 steps, never under 1. */
export const countStepOf = (total) => Math.max(1, nice(total / 89, [1, 2, 5, 10]).find((s) => s >= total / 89 - 1e-9));
/** The key's size reference: the proof's 1 000 MW for a largest site of 6 000 — the largest round value under a quarter of the largest. */
export const referenceOf = (max) => [...nice(max / 4, [1, 2, 5, 10])].reverse().find((v) => v <= max / 4 + 1e-9);

/** What `check(map)` receives, and the groups — before any refusal of the gesture's. */
export function readingOf(beat) {
  if (!Array.isArray(beat.dots) || !beat.dots.length) throw new Error("beat.mjs: dots must be a non-empty array of { lon, lat, value, group } — one per site");
  const bad = beat.dots.filter((s) => ![s?.lon, s?.lat, s?.value].every((v) => typeof v === "number" && Number.isFinite(v)) || typeof s?.group !== "string");
  if (bad.length) throw new Error(`dots hold ${bad.length} row(s) whose lon, lat or value is not a number, or whose group is not a string (${JSON.stringify(bad[0])}): convert with Number(), or leave the rows out`);
  const stations = beat.dots.map((s) => ({ fuel: s.group, mw: s.value, lon: s.lon, lat: s.lat }));
  const total = stations.length;
  const sum = stations.reduce((a, s) => a + s.mw, 0);
  const byFuel = {};
  for (const s of stations) {
    byFuel[s.fuel] ??= { fuel: s.fuel, n: 0, mw: 0 };
    byFuel[s.fuel].n++;
    byFuel[s.fuel].mw += s.mw;
  }
  const SUBJECT = beat.subject;
  const mine = byFuel[SUBJECT];
  const shareSites = mine ? (mine.n / total) * 100 : 0;
  const shareCapacity = mine ? (mine.mw / sum) * 100 : 0;
  const helpers = {
    total,
    sum,
    subjectCount: mine?.n ?? 0,
    shareSites,
    shareCapacity,
    groups: Object.values(byFuel).map((g) => ({ group: g.fuel, n: g.n, sum: g.mw, perSite: g.mw / g.n })).sort((a, b) => b.perSite - a.perSite),
  };
  return { stations, total, sum, byFuel, SUBJECT, shareSites, shareCapacity, helpers };
}

/** @returns the shape the proof's `loadSubject` returned, plus `SUBJECT`, `countStep` and `referenceValue` */
export function subjectOf({ stations, total, byFuel, SUBJECT, shareSites, shareCapacity }, beat) {
  if (!byFuel[SUBJECT]) throw new Error(`subject is ${JSON.stringify(SUBJECT)}, which no dot's group is: set subject to one of ${Object.keys(byFuel).map((g) => JSON.stringify(g)).join(", ")}`);
  const groups = Object.keys(byFuel);
  if (groups.length < 2) throw new Error("every dot is in the subject's group: the video steps the other groups back to show the subject's, so it needs at least two groups");
  if (groups.length > MAX_GROUPS) throw new Error(`dots fall in ${groups.length} groups; the video brings in at most ${MAX_GROUPS} one after another — merge the small ones into one group (say so in the source)`);
  const neg = stations.filter((s) => !(s.mw > 0));
  if (neg.length) throw new Error(`a dot grows to an area proportional to its value, so every value must be above 0; ${neg.length} are not (${n(neg[0].mw)}): leave those rows out`);
  const w = SITE_WINDOW;
  const out = stations.filter((s) => !(s.lon >= w.west && s.lon <= w.east && s.lat >= w.south && s.lat <= w.north));
  if (out.length) throw new Error(`${out.length} dot(s) stand outside Europe (${w.west}..${w.east}° E, ${w.south}..${w.north}° N), e.g. ${n(out[0].lon)}, ${n(out[0].lat)}: the camera holds every site — leave them out, or check lon/lat are not swapped`);
  /** The order the dots arrive in: group by group, the most sites first, the subject last whatever its count. */
  const arrival = Object.values(byFuel)
    .filter((f) => f.fuel !== SUBJECT)
    .sort((a, b) => b.n - a.n)
    .map((f) => f.fuel)
    .concat(SUBJECT);
  const maxMw = Math.max(...stations.map((s) => s.mw));
  const referenceValue = beat.referenceValue ?? referenceOf(maxMw);
  if (!(referenceValue > 0 && referenceValue <= maxMw)) throw new Error(`referenceValue is ${JSON.stringify(beat.referenceValue)}: the key's size reference, above 0 and at most the largest value (${n(maxMw)}) — or leave it out`);
  return { stations, total, nuclear: byFuel[SUBJECT].n, shareSites, shareCapacity, byFuel, arrival, maxMw, SUBJECT, countStep: countStepOf(total), referenceValue };
}

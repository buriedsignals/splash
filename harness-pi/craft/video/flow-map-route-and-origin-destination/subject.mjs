// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-flow-map-ukraine-protection/subject.mjs, which
// read that beat's frozen CSV (one month of Ukrainians under temporary protection, by host country). The derivation is
// the proof's: the hosts ranked, the total, the two largest and their share; the camera holds the origin and the ten
// largest hosts. The proof ASSERTED its answers (Germany first, the two largest about half, over four million); here
// the claim is beat.mjs's `check()`.
//
// Runs in Bun only.
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The static beat's rule for the camera and the names: the ten largest hosts. */
export const FOCUS_HOSTS = 10;

const n = (v) => String(+Number(v).toPrecision(4));

/** The width scale's two named bands: the largest round value (1, 2 or 5 × 10ⁿ) at most the largest flow, and a tenth of it. */
export function scaleValuesOf(max) {
  const p = 10 ** Math.floor(Math.log10(max));
  const big = [5, 2, 1].map((m) => m * p).find((v) => v <= max);
  return [big, big / 10];
}

/** What `check(map)` receives, and the hosts ranked — before any refusal of the gesture's. */
export function readingOf(beat, here) {
  const geo = JSON.parse(readFileSync(join(here, "shapes.geojson"), "utf8"));
  const known = new Set(geo.features.map((f) => f.properties.iso).filter((c) => c !== "-99"));
  if (!Array.isArray(beat.flows) || !beat.flows.length) throw new Error("beat.mjs: flows must be a non-empty array of { iso, name, value } — one per destination");
  const unknown = beat.flows.filter((f) => !known.has(f.iso)).map((f) => JSON.stringify(f.iso));
  if (unknown.length) throw new Error(`flows carry codes the map has no country for: ${unknown.join(", ")} — use the ISO alpha-3 code of a European country (DEU, POL…)`);
  if (!known.has(beat.origin)) throw new Error(`origin is ${JSON.stringify(beat.origin)}: the ISO alpha-3 code of the country every flow leaves (UKR…)`);
  const seen = new Set();
  for (const f of beat.flows) {
    if (seen.has(f.iso)) throw new Error(`flows hold ${f.iso} twice: keep ONE row per destination (filter data.json to one month / one series)`);
    seen.add(f.iso);
    if (f.iso === beat.origin) throw new Error(`flows hold the origin ${f.iso} as a destination: leave it out`);
    if (!(typeof f.value === "number" && Number.isFinite(f.value) && f.value > 0)) throw new Error(`the flow to ${f.iso} is ${JSON.stringify(f.value)}: a band's width is its value, so every value must be a number above 0 (leave out a destination with none)`);
    if (typeof f.name !== "string" || !f.name.trim()) throw new Error(`the flow to ${f.iso} has no name: give every destination its name in the story's language`);
  }
  const ranked = beat.flows.map((f) => ({ code: f.iso, people: f.value, name: f.name })).sort((a, b) => b.people - a.people);
  const total = ranked.reduce((s, f) => s + f.people, 0);
  const topTwoShare = ranked.length >= 2 ? ((ranked[0].people + ranked[1].people) / total) * 100 : 100;
  const helpers = {
    total,
    ranked: ranked.map((f) => ({ iso: f.code, name: f.name, value: f.people })),
    topTwoShare,
    origin: beat.origin,
  };
  return { geo, ranked, total, topTwoShare, helpers };
}

/** @returns the shape the proof's `loadSubject` returned (`{ ranked, total, topTwo, topTwoShare, geo }`), plus the origin,
 *  the largest host (`SUBJECT`), the names and the width scale */
export function subjectOf({ geo, ranked, total, topTwoShare }, beat) {
  if (ranked.length < 3) throw new Error(`flows holds ${ranked.length} destination(s): the video draws the bands out of the origin, then steps back every band but the two largest, so it needs at least three`);
  const max = ranked[0].people;
  const scaleValues = beat.scaleValues ?? scaleValuesOf(max);
  if (!(Array.isArray(scaleValues) && scaleValues.length === 2 && scaleValues[0] > scaleValues[1] && scaleValues[1] > 0))
    throw new Error(`scaleValues is ${JSON.stringify(beat.scaleValues)}: two values for the key's width scale, larger first, above 0 — or leave it out`);
  const names = Object.fromEntries(ranked.map((f) => [f.code, f.name]));
  return { ranked, total, topTwo: ranked.slice(0, 2).map((f) => f.code), topTwoShare, geo, ORIGIN: beat.origin, SUBJECT: ranked[0].code, names, scaleValues, maxValue: max, smallest: n(ranked.at(-1).people) };
}

// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-locator-zaporizhzhia/subject.mjs, which read
// that beat's frozen CSVs (the largest station, the six largest settlements, its French names). The derivation is the
// proof's: the subject's point, the six largest settlements, the close-up window the still frames (the point ± 9° of
// longitude, ± 5.2° of latitude), the shapes a country's name is kept inside. The proof ASSERTED its answers (the
// largest is in Ukraine, 6 000 MW); here the claim is beat.mjs's `check()`, and what is refused is what the gesture
// would show falsely: a point outside the country the map tints, a name the close-up cannot hold.
//
// Runs in Bun only.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ISO3_TO_ISO2 } from "#shared/map-beat/iso-codes.mjs";

export const EUROPE_WINDOW = { west: -25, east: 45, south: 34, north: 72 };
/** How many settlements the close-up names (the proof's six, largest first). */
export const PLACES = 6;
/** How far the close-up reaches around the subject, in degrees (the still's window). */
export const CLOSE_LON = 9;
export const CLOSE_LAT = 5.2;

const n = (v) => String(+Number(v).toPrecision(4));

function insideRing(ring, x, y) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The shapes beside the beat, and the questions `check(map)` may ask of them. */
export function mapOf(here) {
  const geo = JSON.parse(readFileSync(join(here, "shapes.geojson"), "utf8"));
  const countryOf = (lon, lat) => {
    for (const f of geo.features) {
      if (f.properties.iso === "-99") continue;
      // A polygon's first ring is its outline; a point inside a hole (an enclave) is not inside it.
      for (const poly of f.geometry.coordinates) if (insideRing(poly[0], lon, lat) && !poly.slice(1).some((hole) => insideRing(hole, lon, lat))) return f.properties.iso;
    }
    return null;
  };
  const km = (a, b) => {
    const rad = Math.PI / 180;
    const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };
  return { geo, countryOf, km };
}

/** The step the count climbs by: the proof's hundred for 6 000, a round step giving at most 60 steps for any value. */
export function countStepOf(value) {
  const raw = value / 60;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw - 1e-12);
}

const isPoint = (p) => p && typeof p.lon === "number" && typeof p.lat === "number" && Number.isFinite(p.lon) && Number.isFinite(p.lat);

/**
 * @param beat  beat.mjs's default export: `subject` { lon, lat, name, label?, priority }, `country`, `areas`, `places`, `waters`
 * @returns     the shape the proof's `loadSubject` returned: `{ biggest: { lon, lat, mw }, places, closeWindow, geo }`,
 *              plus `focus` (the country the map tints) and `countStep`
 */
export function subjectOf(beat, map) {
  const { geo, countryOf } = map;
  const s = beat.subject;
  if (!isPoint(s)) throw new Error("subject must be { lon, lat, name, priority } — the one place the map is about, from its row of data.json");
  const w0 = EUROPE_WINDOW;
  if (!(s.lon >= w0.west && s.lon <= w0.east && s.lat >= w0.south && s.lat <= w0.north))
    throw new Error(`subject is at ${n(s.lon)}°, ${n(s.lat)}°, outside the Europe the video opens on (${w0.west}..${w0.east}° E, ${w0.south}..${w0.north}° N): this kit locates a place in Europe`);
  if (!(typeof s.priority === "number" && s.priority > 0)) throw new Error(`subject.priority is ${JSON.stringify(s.priority)}: the number the close-up counts up to (e.g. its capacity), above 0`);
  const focus = beat.country;
  if (!geo.features.some((f) => f.properties.iso === focus) || !ISO3_TO_ISO2[focus])
    throw new Error(`country is ${JSON.stringify(focus)}: the ISO alpha-3 code of the European country the subject is in (UKR, FRA…) — the map tints it`);
  const inside = countryOf(s.lon, s.lat);
  if (inside !== focus)
    throw new Error(`the subject's point falls in ${inside ?? "no country on the map (the sea, or outside the shapes)"}, not in ${focus}: the map tints ${focus} and rings the point inside it — set country to ${inside ?? "the country the point is in"}, or check the subject's lon/lat`);

  const closeWindow = { west: s.lon - CLOSE_LON, east: s.lon + CLOSE_LON, south: s.lat - CLOSE_LAT, north: s.lat + CLOSE_LAT };
  const inClose = (p) => p.lon >= closeWindow.west && p.lon <= closeWindow.east && p.lat >= closeWindow.south && p.lat <= closeWindow.north;

  if (!beat.areas || typeof beat.areas !== "object" || Array.isArray(beat.areas)) throw new Error("areas must be { <iso3>: <name> } — the countries the close-up names, the subject's country first");
  if (!(focus in beat.areas)) throw new Error(`areas must name the subject's own country ${focus} (it is named on the continent and in the close-up)`);
  const inFrame = geo.features
    .filter((f) => f.properties.iso !== "-99")
    .filter((f) => f.geometry.coordinates.flat(2).some(([lon, lat]) => inClose({ lon, lat })))
    .map((f) => f.properties.iso);
  const unknown = Object.keys(beat.areas).filter((iso) => !geo.features.some((f) => f.properties.iso === iso));
  if (unknown.length) throw new Error(`areas names ${unknown.join(", ")}, which the map has no country for: use ISO alpha-3 codes (${inFrame.join(", ")} stand around the subject)`);
  // A country with no ground inside the close-up's window is not named there (the proof's Turkey): said, not refused.
  const outside = Object.keys(beat.areas).filter((iso) => !inFrame.includes(iso));
  if (outside.length) console.log(`areas: ${outside.join(", ")} has no ground in the close-up's window and is not named there (the window holds ${inFrame.join(", ")})`);
  for (const [iso, name] of Object.entries(beat.areas)) if (typeof name !== "string" || !name.trim()) throw new Error(`areas.${iso} must be the country's name in the story's language`);

  if (!Array.isArray(beat.places)) throw new Error("places must be an array of { lon, lat, name, priority } — settlements that help place the subject ([] names none)");
  const bad = beat.places.filter((p) => !isPoint(p) || typeof p.name !== "string" || !(typeof p.priority === "number"));
  if (bad.length) throw new Error(`places hold ${bad.length} row(s) that are not { lon, lat, name, priority }: ${JSON.stringify(bad[0])}`);
  // The close-up names the six largest settlements IN ITS FRAME, as the still does.
  const places = beat.places
    .filter(inClose)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, PLACES)
    .map((p) => ({ name: String(p.name), label: String(p.label ?? p.name), lon: p.lon, lat: p.lat, pop: p.priority }));
  if (new Set(places.map((p) => p.name)).size !== places.length) throw new Error("places hold two settlements with the same name: give each its own name");

  const waters = beat.waters ?? [];
  if (!Array.isArray(waters) || waters.some((w) => !isPoint(w) || typeof w.name !== "string"))
    throw new Error("waters is optional: an array of { name, lon, lat } — the seas, gulfs and rivers the close-up names, each at a point on open water");
  const farWater = waters.filter((w) => !inClose(w));
  if (farWater.length) throw new Error(`waters ${farWater.map((w) => w.name).join(", ")} lie outside the close-up (±${CLOSE_LON}° of longitude, ±${CLOSE_LAT}° of latitude around the subject): drop them`);

  return { biggest: { lon: s.lon, lat: s.lat, mw: s.priority }, places, waters, closeWindow, geo, focus, countStep: countStepOf(s.priority) };
}

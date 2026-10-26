// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for what proof/video-choropleth-europe-lowcarbon read from its
// static sibling (`loadSubject` in proof/static-choropleth-europe-lowcarbon/beat.mjs). The derivation is the proof's:
// the study set joined to the shapes, the classes cut at the stated breaks, the floor at the last break, the subject's
// neighbours derived from the frozen rings (a vertex within a tenth of a degree), the neighbours without a row found
// the same way. The proof ASSERTED its answers (seven above 94 %, Albania, three neighbours under 60 %); here the claim
// is beat.mjs's `check()`, run between `readingOf` (what the data says) and `subjectOf` (what the gesture can show).
//
// Runs in Bun only.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ISO3_TO_ISO2 } from "#shared/map-beat/iso-codes.mjs";
import { interiorSeatOf } from "./build.mjs";
import { SEATS } from "./map-plan.mjs";

/** How many names the close-up places around the subject: every order of them is tried (build.mjs), so it is bounded. */
export const MAX_CLOSE_NAMES = 5;
const NEAR_DEGREES = 0.1;

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+Number(v).toPrecision(4));

/** The feature's every vertex, and its box (a cheap first test before the vertex-by-vertex one). */
function verticesOf(feature) {
  const pts = feature.geometry.coordinates.flat().flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { pts, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}

/**
 * What the data says, before any claim is checked: the join, the classes, the floor, the subject's neighbours.
 * Refuses only what makes the data unreadable as a choropleth (a code with no shape, a value that is not a number,
 * breaks that do not rise).
 *
 * @returns {{ reading, helpers }} `helpers` is what beat.mjs's `check(map)` receives.
 */
export function readingOf(beat, here) {
  const geo = JSON.parse(readFileSync(join(here, "shapes.geojson"), "utf8"));
  const byIso = new Map(geo.features.filter((f) => f.properties.iso !== "-99").map((f) => [f.properties.iso, f]));
  if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("beat.mjs: rows must be a non-empty array of { iso, name, value }");
  const unknown = beat.rows.filter((r) => !byIso.has(r.iso)).map((r) => JSON.stringify(r.iso));
  if (unknown.length)
    throw new Error(`rows carry codes the map has no country for: ${unknown.join(", ")} — iso must be the ISO alpha-3 code of a European country (FRA, DEU…); resolve names with countries.mjs \`iso3Of\``);
  const noA2 = beat.rows.filter((r) => !ISO3_TO_ISO2[r.iso]).map((r) => r.iso);
  if (noA2.length) throw new Error(`rows carry codes MapTiler Countries cannot paint (no ISO A2 code): ${noA2.join(", ")}`);
  const seen = new Set();
  for (const r of beat.rows) {
    if (seen.has(r.iso)) throw new Error(`rows hold ${r.iso} twice: keep ONE row per country (filter data.json to one year / one series)`);
    seen.add(r.iso);
    if (typeof r.name !== "string" || !r.name.trim()) throw new Error(`the row for ${r.iso} has no name: give every row the country's name in the story's language`);
    if (r.value !== null && !(typeof r.value === "number" && Number.isFinite(r.value)))
      throw new Error(`the row for ${r.iso} has value ${JSON.stringify(r.value)}: a number, or null for a country the source does not report (never 0)`);
  }
  const BREAKS = beat.breaks;
  if (!Array.isArray(BREAKS) || BREAKS.length < 2 || BREAKS.length > 5 || BREAKS.some((b) => !(typeof b === "number" && Number.isFinite(b))) || BREAKS.some((b, i) => i > 0 && !(b > BREAKS[i - 1])))
    throw new Error(`breaks is ${JSON.stringify(BREAKS)}: give 2 to 5 rising numbers — the bornes the floor climbs, the takeaway's threshold LAST`);
  const FLOOR = BREAKS.at(-1);

  const value = new Map();
  for (const r of beat.rows) if (r.value !== null) value.set(r.iso, { iso: r.iso, label: r.name, value: r.value });
  const studySet = beat.rows.map((r) => r.iso);
  const unreported = beat.rows.filter((r) => r.value === null).map((r) => ({ iso: r.iso, name: r.name }));
  if (value.size < 3) throw new Error(`only ${value.size} rows carry a value: a choropleth needs the countries the source reports`);
  const ranked = [...value.values()].sort((a, b) => b.value - a.value);
  const classOf = (v) => BREAKS.filter((b) => v >= b).length;
  const counts = new Array(BREAKS.length + 1).fill(0);
  for (const v of value.values()) counts[classOf(v.value)]++;
  const above = ranked.filter((r) => r.value >= FLOOR);
  const nameOf = (iso) => beat.rows.find((r) => r.iso === iso)?.name ?? byIso.get(iso)?.properties.name ?? iso;

  const ODD_ONE = beat.subject;
  if (!byIso.has(ODD_ONE) || !value.has(ODD_ONE))
    throw new Error(`subject is ${JSON.stringify(ODD_ONE)}: it must be the ISO alpha-3 code of a row with a value — the country the close-up is about`);

  // THE NEIGHBOURS, DERIVED FROM THE FROZEN RINGS (the static proof's rule): a vertex within a tenth of a degree.
  const keyOf = (f) => (f.properties.iso === "-99" ? `-99:${f.properties.name}` : f.properties.iso);
  const mine = verticesOf(byIso.get(ODD_ONE));
  const touching = geo.features.filter((f) => {
    if (f.properties.iso === ODD_ONE) return false;
    const other = verticesOf(f);
    const [a0, b0, a1, b1] = mine.box;
    const [c0, d0, c1, d1] = other.box;
    if (c0 > a1 + NEAR_DEGREES || c1 < a0 - NEAR_DEGREES || d0 > b1 + NEAR_DEGREES || d1 < b0 - NEAR_DEGREES) return false;
    return other.pts.some(([x, y]) => mine.pts.some(([u, v]) => Math.abs(x - u) < NEAR_DEGREES && Math.abs(y - v) < NEAR_DEGREES));
  });
  const neighbours = touching.filter((f) => value.has(f.properties.iso)).map((f) => f.properties.iso);
  const unmeasured = touching
    .filter((f) => !value.has(f.properties.iso))
    .map((f) => ({ key: keyOf(f), iso: f.properties.iso, name: f.properties.iso === "-99" ? f.properties.name : nameOf(f.properties.iso), seat: interiorSeatOf(f).seat }));

  // Every study country's seat: the proof's frozen seats where it has one, else found the way they were found.
  const seats = { ...SEATS };
  for (const iso of studySet) if (!seats[iso]) seats[iso] = interiorSeatOf(byIso.get(iso)).seat;

  const reading = { geo, value, studySet, unreported, ranked, above, counts, BREAKS, FLOOR, ODD_ONE, neighbours, unmeasured, seats, nameOf };
  const row = (iso) => ({ iso, name: nameOf(iso), value: value.get(iso)?.value ?? null });
  const helpers = {
    value: (iso) => value.get(iso)?.value ?? null,
    ranked: ranked.map((r) => row(r.iso)),
    above: above.map((r) => row(r.iso)),
    counts: [...counts],
    subject: row(ODD_ONE),
    neighbours: neighbours.map(row),
    unmeasured: unmeasured.map((u) => ({ name: u.name })),
    seat: (iso) => {
      if (!seats[iso]) throw new Error(`check(): no seat for ${iso} — only the rows' countries have one`);
      return [...seats[iso]];
    },
  };
  return { reading, helpers };
}

/**
 * What the choreography can show for this data, or a refusal naming why it cannot: the subject in the top class
 * (the close-up comes after the floor has landed on it), at least one measured neighbour (the gauges compare it),
 * few enough names for the close-up, every close-up share on the gauge's scale.
 */
export function subjectOf(reading, beat) {
  const { value, above, FLOOR, ODD_ONE, neighbours, unmeasured, seats, nameOf } = reading;
  const SCALE_MAX = beat.scaleMax ?? 100;
  if (!(typeof SCALE_MAX === "number" && SCALE_MAX > 0)) throw new Error(`scaleMax is ${JSON.stringify(beat.scaleMax)}: the gauges' full width, a number above 0 (100 for a share in %)`);
  if (!above.some((r) => r.iso === ODD_ONE))
    throw new Error(
      `subject ${nameOf(ODD_ONE)} is at ${n(value.get(ODD_ONE).value)}, under the last break (${n(FLOOR)}): the video raises the floor to the last break and then closes in on a country still standing above it — set subject to one of ${above.map((r) => nameOf(r.iso)).join(", ") || "nothing (no country reaches the last break: lower it)"}, or put the takeaway's threshold last in breaks`,
    );
  if (!neighbours.length)
    throw new Error(`${nameOf(ODD_ONE)} has no neighbour with a value on the map (an island, or its neighbours carry no row): the close-up measures the subject against its neighbours, so this video cannot tell this story — choose the static or web format`);
  // THE CLOSE-UP IS AN EXCEPTION'S: the subject alone in the top class among its neighbours (the proof's Albania). A
  // neighbour in the same class wears the subject's fill, and the close-up's names, leaders and gauges read that fill
  // as the subject's own ground.
  const alsoAbove = neighbours.filter((iso) => value.get(iso).value >= FLOOR);
  if (alsoAbove.length)
    throw new Error(
      `${alsoAbove.map(nameOf).join(", ")} ${alsoAbove.length > 1 ? "are" : "is"} above the last break (${n(FLOOR)}) like the subject ${nameOf(ODD_ONE)}: the close-up argues the subject against neighbours that stay under the floor, so choose a subject whose neighbours are all under it, or this video cannot tell this story — choose the static or web format`,
    );
  if (neighbours.length + unmeasured.length > MAX_CLOSE_NAMES)
    throw new Error(
      `${nameOf(ODD_ONE)} has ${neighbours.length + unmeasured.length} neighbours on the map (${[...neighbours.map(nameOf), ...unmeasured.map((u) => u.name)].join(", ")}); the close-up names at most ${MAX_CLOSE_NAMES} around the subject, so this video cannot tell this story — choose the static or web format`,
    );
  const close = [ODD_ONE, ...neighbours];
  const off = close.filter((iso) => !(value.get(iso).value >= 0 && value.get(iso).value <= SCALE_MAX));
  if (off.length)
    throw new Error(`the close-up's gauges run 0 → ${n(SCALE_MAX)} (scaleMax), and ${off.map((iso) => `${nameOf(iso)} = ${n(value.get(iso).value)}`).join(", ")} is off that scale: set scaleMax to the top of the measure (100 for a share in %)`);
  if (!(FLOOR > 0 && FLOOR <= SCALE_MAX)) throw new Error(`the last break (${n(FLOOR)}) is notched on the gauges, which run 0 → ${n(SCALE_MAX)}: it must lie inside`);
  const closeUpSeats = [...neighbours.map((iso) => seats[iso]), ...unmeasured.map((u) => u.seat)];
  return { ...reading, SCALE_MAX, closeUpSeats };
}

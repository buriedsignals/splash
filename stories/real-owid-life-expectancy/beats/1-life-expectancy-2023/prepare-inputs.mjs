// Freeze this beat's two inputs from material that is NOT this beat's to invent:
//   - `life-expectancy-2023.csv`, one year lifted out of the story's frozen long-form panel;
//   - `countries.geojson`, Natural Earth 1:50m Admin 0, trimmed to the one property the join uses.
//
// The story's own `source/` holds 21 565 rows across 265 entities and 1543–2023. A choropleth draws
// ONE year, so the year is cut here, once, beside the beat — never re-derived at render time, and
// never by touching the frozen source.
//
// WHY THE CUT IS A SCRIPT AND NOT A ONE-LINER SOMEBODY RAN. The map's title states how many
// countries it draws, and that number is a product of this cut and of the join below it. A csv
// pasted in by hand carries no record of which rows were dropped or why, and the aggregates in this
// source (World, Africa, Asia, the income groups, "Less developed regions") are exactly the rows a
// choropleth must never paint on a country shape.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");
const YEAR = "2023";

/** RFC 4180 row tokeniser — this source quotes two entity names that carry their own comma
 *  ("Less developed regions, excluding China"), and a naive split fragments them into a row with
 *  five fields and a blank code, which is an aggregate silently turning into a country. */
function rows(text) {
  const out = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); out.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); out.push(row); }
  return out;
}

/** Our World in Data mixes real countries and its OWN aggregates in one column. An aggregate has
 *  either no code at all (15 of them in 2023 — "Least developed countries", "Northern America") or
 *  an `OWID_`-prefixed one (10 more — the continents, the income bands, and the World). Neither is a
 *  territory a choropleth may paint. Kosovo is the single exception and it is NOT an aggregate:
 *  it has no ISO code of its own, so OWID gives it `OWID_KOS`, and it is aliased onto Natural
 *  Earth's `KOS` at the join rather than dropped here. */
const KOSOVO = "OWID_KOS";
const isAggregate = (code) => code === "" || (code.startsWith("OWID_") && code !== KOSOVO);

const source = rows(await readFile(join(STORY, "source", "data.csv"), "utf8"));
const head = source[0];
const at = (name) => {
  const index = head.indexOf(name);
  if (index < 0) throw new Error(`the frozen source has no column ${JSON.stringify(name)}`);
  return index;
};
const [ENTITY, CODE, YEAR_COL, VALUE] = [at("entity"), at("code"), at("year"), at("life_expectancy_0")];

const kept = [];
const droppedAggregates = [];
for (const row of source.slice(1)) {
  if (row[YEAR_COL] !== YEAR) continue;
  if (isAggregate(row[CODE])) { droppedAggregates.push(row[ENTITY]); continue; }
  const value = Number(row[VALUE]);
  if (!Number.isFinite(value)) throw new Error(`${row[ENTITY]} carries a life expectancy this script cannot read: ${JSON.stringify(row[VALUE])}`);
  kept.push({ code: row[CODE], entity: row[ENTITY], value });
}
kept.sort((a, b) => a.code.localeCompare(b.code));

// `Code,Entity,Year,value` — the column names this format's own reader (`valuesFromCsv`,
// `labelsFromCsv`) already knows, and the shape Our World in Data exports in.
const csv = ["Code,Entity,Year,value", ...kept.map((r) => `${r.code},${JSON.stringify(r.entity)},${YEAR},${r.value}`)].join("\n") + "\n";
await writeFile(join(HERE, `life-expectancy-${YEAR}.csv`), csv);

/** Natural Earth 1:50m Admin 0, keyed the way this toolchain's own geo discipline says to key it:
 *  `ADM0_A3`, never `ISO_A3` — eight features in this file carry `ISO_A3 = "-99"`, France, Norway
 *  and Kosovo among them. Everything except that one property is dropped: the hover label reads the
 *  country's name from the DATA (`entity`, above), so a basemap's own English NAME field would be a
 *  second, competing source of truth for the same string. */
/** Ramer-Douglas-Peucker on one ring, in DEGREES.
 *
 *  WHY THE SHAPES ARE SIMPLIFIED BEFORE THEY ARE FROZEN, and not left to the bake. The bake already
 *  thins the PROJECTED rings to 0.6 plate pixels, which is the right resolution for the picture and
 *  is applied after the camera is known. It cannot help the LIVE layer, which ships the same
 *  coastlines a second time in lon/lat so a reader who zooms is not looking at plate quantisation.
 *  At 1:50m the world is 99 613 coordinates; carried twice, that is a page several megabytes before
 *  a single class colour is written. This drops the source to a resolution the delivered camera can
 *  actually show and the reader's own leash never gets far past.
 *
 *  It runs on the frozen INPUT, once, so both halves draw the same coastline — simplifying only one
 *  of them is how the two layers come to disagree about where a border is. */
function simplifyLonLat(ring, tolerance) {
  if (ring.length <= 4) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    if (last - first < 2) continue;
    const [ax, ay] = ring[first];
    const [bx, by] = ring[last];
    const dx = bx - ax;
    const dy = by - ay;
    const span = Math.hypot(dx, dy);
    let worst = -1;
    let at = -1;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = ring[i];
      const distance = span === 0
        ? Math.hypot(px - ax, py - ay)
        : Math.abs(dy * px - dx * py + bx * ay - by * ax) / span;
      if (distance > worst) { worst = distance; at = i; }
    }
    if (worst > tolerance) {
      keep[at] = 1;
      stack.push([first, at], [at, last]);
    }
  }
  const out = [];
  for (let i = 0; i < ring.length; i++) if (keep[i]) out.push(ring[i]);
  // A ring that collapses below a triangle is not a simpler shape, it is a lost country. Keep the
  // original rather than drop it: a shape that disappears here disappears from the map with no
  // error anywhere, which is the silent-join failure this whole beat is written to refuse.
  return out.length >= 4 ? out : ring;
}

const TOLERANCE_DEGREES = 0.09;

const raw = JSON.parse(await readFile(process.argv[2] ?? "/tmp/ne50.geojson", "utf8"));
let before = 0;
let after = 0;
const simplifyGeometry = (geometry) => {
  const walk = (rings) => rings.map((ring) => {
    before += ring.length;
    const next = simplifyLonLat(ring.map(([x, y]) => [Number(x.toFixed(4)), Number(y.toFixed(4))]), TOLERANCE_DEGREES);
    after += next.length;
    return next;
  });
  if (geometry.type === "Polygon") return { type: "Polygon", coordinates: walk(geometry.coordinates) };
  if (geometry.type === "MultiPolygon")
    return { type: "MultiPolygon", coordinates: geometry.coordinates.map((poly) => walk(poly)) };
  throw new Error(`unexpected geometry type ${geometry.type}`);
};
const features = raw.features
  .filter((f) => f.geometry && f.properties.ADM0_A3 !== "ATA")
  .map((f) => ({ type: "Feature", properties: { ADM0_A3: f.properties.ADM0_A3 }, geometry: simplifyGeometry(f.geometry) }));
await writeFile(join(HERE, "countries.geojson"), JSON.stringify({ type: "FeatureCollection", features }));
console.log(`shapes simplified at ${TOLERANCE_DEGREES} deg: ${before} coordinates in, ${after} out`);

console.log(`${kept.length} coded entities kept for ${YEAR}; ${droppedAggregates.length} aggregate rows dropped (${droppedAggregates.join(", ")})`);
console.log(`${features.length} shapes written (Antarctica dropped: no reading, and it fills a quarter of any world frame)`);

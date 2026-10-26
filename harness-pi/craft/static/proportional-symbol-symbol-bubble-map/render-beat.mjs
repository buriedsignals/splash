// The generic half of a proportional-symbol map beat: the bake, the camera, the square-root scale,
// the ink-floor threshold ladder, the occupancy-guarded colour and the render, taken from
// proof/static-proportional-symbol-europe-capacity/render-directions.mjs with everything about ITS
// subject removed. Everything about THIS story — which columns hold the coordinates and the value,
// which rows are the subject, the words and the checks — lives in ./beat.mjs, the one file the model
// writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { plateWasPaintedWith } from "#shared/map-beat/plate-cache.mjs";
import { markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { composeDirections, filedDirections, guardColour, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { plateWaterField } from "./plate-water.mjs";
import { DirectedProportionalSymbol, minMapShare, worstCellInk } from "./DirectedProportionalSymbol.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertDrawsClaimColumn } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
applyStoryboard(beat, HERE, { basemap: "©MapTiler ©OpenStreetMap contributors" });
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const EXPORT_FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "lon", "lat", "value", "subject", "unit", "format", "dotIs", "subjectNote", "limitNote", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
const forms = (v) => [v].flat();

// ── the points, read from data.json by the columns the beat names ──────────
const table = JSON.parse(readFileSync(join(HERE, "data.json"), "utf8"));
const at = (name, field) => {
  const i = (table.columns ?? []).findIndex((c) => c.name === name);
  if (i < 0)
    throw new Error(`beat.mjs's ${field} names the column ${JSON.stringify(name)}, which data.json does not have; its columns are ${table.columns.map((c) => c.name).join(", ")}`);
  return i;
};
const num = (raw) => (typeof raw === "number" ? raw : Number(String(raw).replace(/\s/g, "").replace(",", ".")));
const [LON, LAT, VALUE] = [at(beat.lon, "lon"), at(beat.lat, "lat"), at(beat.value, "value")];
const filters = Object.entries(beat.where ?? {}).map(([column, v]) => [at(column, "where"), String(v)]);
const rows = table.rows.filter((r) => filters.every(([i, v]) => String(r[i]) === v));
if (!rows.length) throw new Error(`no row of data.json matches where ${JSON.stringify(beat.where)}`);
const subjectRule = beat.subject;
if (!subjectRule?.column || subjectRule.equals === undefined)
  throw new Error(`beat.mjs's subject must be { column, equals }: the column whose value marks the rows the takeaway is about, and that value`);
const SUBJ = at(subjectRule.column, "subject.column");
const nameAt = beat.name ? at(beat.name, "name") : -1;
const stations = rows.map((r) => ({
  name: nameAt >= 0 ? String(r[nameAt]) : "",
  lon: num(r[LON]),
  lat: num(r[LAT]),
  value: num(r[VALUE]),
  subject: String(r[SUBJ]) === String(subjectRule.equals),
}));
assertNumbers(stations.map((s, i) => [`${beat.value}[${s.name || i}]`, s.value]), beat.value);
assertNumbers(stations.flatMap((s, i) => [[`${beat.lon}[${s.name || i}]`, s.lon], [`${beat.lat}[${s.name || i}]`, s.lat]]), "coordinates");
/** THE JOIN OF A SYMBOL MAP IS ITS COORDINATES, and the way it fails silently is two columns swapped:
 *  every circle lands somewhere real, in the wrong hemisphere. A latitude past ±85 is not on this
 *  basemap at all, and a longitude inside ±90 under a latitude outside it is the swap. */
const offGlobe = stations.filter((s) => Math.abs(s.lat) > 85 || Math.abs(s.lon) > 180);
if (offGlobe.length)
  throw new Error(`${offGlobe.length} rows have coordinates off the map (e.g. lon ${offGlobe[0].lon}, lat ${offGlobe[0].lat}): check that lon names the longitude column and lat the latitude column`);
const negative = stations.filter((s) => s.value < 0);
if (negative.length)
  throw new Error(`${negative.length} rows have a negative ${beat.value} (e.g. ${negative[0].value}): a circle's area cannot be negative — filter them out with where, or draw another type`);
if (!stations.some((s) => s.subject))
  throw new Error(`no row has ${subjectRule.column} = ${JSON.stringify(subjectRule.equals)}: the subject matches nothing in data.json`);
assertDrawsClaimColumn(stations.map((s) => s.value), HERE);

const total = stations.length;
const valueAll = stations.reduce((a, s) => a + s.value, 0);
beat.check();

// ── the camera: the box THIS story's points need ──────────────────────────
const lons = stations.map((s) => s.lon);
const lats = stations.map((s) => s.lat);
const [west0, east0, south0, north0] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
/** A naive min/max across the date line frames the whole globe; this kit does not unwrap it. */
if (east0 - west0 > 180)
  throw new Error(`the points span ${(east0 - west0).toFixed(0)}° of longitude: across the antimeridian this kit would frame the whole globe. Filter the rows to one side with where, and say so in limits`);
const padOf = (span, floor) => Math.max(floor, span * 0.08);
const bounds = beat.bounds ?? [
  [Math.max(-180, west0 - padOf(east0 - west0, 0.5)), Math.max(-84, south0 - padOf(north0 - south0, 0.4))],
  [Math.min(180, east0 + padOf(east0 - west0, 0.5)), Math.min(84, north0 + padOf(north0 - south0, 0.4))],
];
const outside = stations.filter((s) => s.lon < bounds[0][0] || s.lon > bounds[1][0] || s.lat < bounds[0][1] || s.lat > bounds[1][1]);
if (outside.length)
  throw new Error(`${outside.length} of ${total} points fall outside beat.bounds: widen bounds, or filter those rows with where and say so in limits`);

const PLATE_SIZE = "1000x760";
const VIEW = 1000;
const LAND_DOSE = 0.07;
const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const plain = (s) => String(s).replace(/[   ]/g, " ");
const textFor = (cut) => ({
  display: forms(beat.title).join(" "),
  eyebrow: beat.eyebrow,
  body: `${forms(beat.limits).join(" ")} ${beat.source}`,
  axis: cut ? forms(beat.limitNote(cut)).join(" ") : "",
  annot: `${forms(beat.reading).join(" ")} ${beat.dotIs} ${cut ? beat.subjectNote(cut) : ""}`,
  value: `${total} ${stations.filter((s) => s.subject).length}`,
});

let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom: readPalette(HERE), filed: filedDirections(), beat: { evidenceLevels: 3 }, textPerRegister: textFor(null) });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

/** A PLATE BELONGS TO A DIRECTION, A SIZE, A CAMERA AND TWO TINTS. The worked example's cache asked
 *  only the tints; here the camera is computed from the data, so a plate baked for last run's
 *  points is stale the moment the rows change. */
const plateDir = (id) => join(HERE, "plate", nameAtSize(id, SIZE));
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  if (plateWasPaintedWith(dir, { water, land })) {
    const g = JSON.parse(readFileSync(join(dir, "geometry.json"), "utf8"));
    if (JSON.stringify(g.bounds) === JSON.stringify(bounds) && `${g.frame.width}x${g.frame.height}` === PLATE_SIZE) return;
  }
  console.log(`baking the ${id} plate (MapTiler, ${PLATE_SIZE}, bounds ${bounds.flat().map((v) => v.toFixed(2)).join(",")})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--bounds", bounds.flat().join(","), "--water", water, "--land", land, "--out", dir],
    { cwd: HERE, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status} for ${id}: the basemap could not be baked (is MAPTILER_KEY set?)`);
}

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const refused = [];
for (const { label: id, direction: picked } of chosen) {
  try {
    const tints = plateTints(picked, { landDose: LAND_DOSE });
    ensurePlate(id, tints.water, tints.land);
    const plateFacts = JSON.parse(await readFile(join(plateDir(id), "geometry.json"), "utf8"));
    const FRAME = plateFacts.frame;
    const CORNERS = plateFacts.frameCorners;
    const CAMERA_ASPECT = FRAME.width / FRAME.height;
    const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    const Y_NORTH = mercY(CORNERS.north);
    const Y_SOUTH = mercY(CORNERS.south);
    const project = ([lon, lat]) => {
      const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
      const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
      return [(px / FRAME.width) * VIEW, (py / FRAME.width) * VIEW];
    };

    // The country outlines over the plate — the worked example's own file (Europe and its neighbours).
    // Only the rings that reach this camera are drawn.
    const MIN_STEP = VIEW / 1400;
    const thin = (ring) => {
      const out = [ring[0]];
      for (const p of ring.slice(1)) {
        const q = out[out.length - 1];
        if (Math.abs(p[0] - q[0]) > MIN_STEP || Math.abs(p[1] - q[1]) > MIN_STEP) out.push(p);
      }
      return out.length >= 4 ? out : ring;
    };
    const viewH = VIEW / CAMERA_ASPECT;
    const inView = (ring) => ring.some(([x, y]) => x >= -50 && x <= VIEW + 50 && y >= -50 && y <= viewH + 50);
    const shapes = geo.features
      .map((f) => {
        const rings = f.geometry.coordinates.flatMap((poly) => poly).map((ring) => thin(ring.map(project))).filter(inView);
        if (!rings.length) return null;
        return { iso: f.properties.iso, d: rings.map((ring) => `M ${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`).join(" ") };
      })
      .filter(Boolean);

    /** AREA PROPORTIONAL TO THE VALUE, so the radius runs on a square root, and the same function
     *  computes the key's circles. */
    const MAX = Math.max(...stations.map((s) => s.value));
    if (!(MAX > 0)) throw new Error(`every ${beat.value} is 0: there is nothing to size`);
    const R_MAX = 0.017;
    const radiusOf = (v) => R_MAX * Math.sqrt(Math.max(0, v) / MAX);
    const symbols = stations.map((s) => {
      const [x, y] = project([s.lon, s.lat]);
      return { x: x / VIEW, y: y / VIEW, r: radiusOf(s.value), subject: s.subject };
    });

    const FRAME_PER_VIEW = FRAME.width / VIEW;
    const field = plateWaterField(plateDir(id), { scale: FRAME_PER_VIEW });
    /** LON AND LAT SWAPPED STILL LAND ON THE GLOBE — a European table swapped falls in the Atlantic and
     *  Africa, and every circle is drawn somewhere real. So the points' own seats are read off the
     *  plate: when most of them are at sea, the join is presumed wrong unless the beat says its places
     *  ARE at sea (atSea: true — wrecks, quakes offshore, ships). */
    const seats = symbols.map((s) => field.waterDepthAt(s.x * VIEW, s.y * VIEW)).filter((w) => w !== null);
    const atSeaShare = seats.filter((w) => w > 0).length / Math.max(1, seats.length);
    if (atSeaShare > 0.5 && beat.atSea !== true)
      throw new Error(`${(atSeaShare * 100).toFixed(0)} % of the points sit on water: lon and lat are probably swapped, or name the wrong columns. If these places really are at sea, set atSea: true in beat.mjs`);
    /** WHICH POINTS THE PLATE DRAWS, CHOSEN BY MEASUREMENT AND STATED ON THE PLATE: a ladder of value
     *  thresholds climbed until the busiest cell of the smallest camera this size gives is under the
     *  40 % ink floor. The rungs are the 1-2-5 series under the largest value. */
    const SMALLEST_MAP = SIZE === "landscape" ? 596 : Math.round((EXPORT_FRAME.height - 120) * minMapShare(EXPORT_FRAME.width, EXPORT_FRAME.height) * CAMERA_ASPECT);
    const THRESHOLDS = [0];
    for (let e = Math.floor(Math.log10(Math.max(1e-9, Math.min(...stations.map((s) => s.value).filter((v) => v > 0))))); 10 ** e <= MAX; e++)
      for (const m of [1, 2, 5]) if (m * 10 ** e <= MAX) THRESHOLDS.push(Number((m * 10 ** e).toPrecision(1)));
    let threshold = null;
    for (const t of THRESHOLDS) {
      const kept = symbols.filter((_, i) => stations[i].value >= t);
      if (kept.length && worstCellInk(kept, SMALLEST_MAP, CAMERA_ASPECT, 0.7) <= 40) {
        threshold = t;
        break;
      }
    }
    if (threshold === null) throw new Error("no value threshold leaves a legible field at this camera");
    const drawnIdx = stations.map((s, i) => [s, i]).filter(([s]) => s.value >= threshold);
    /** A FIELD, OR NOTHING: a cut that leaves a handful of circles out of many is a locator. */
    const FIELD_FLOOR = 50;
    if (threshold > 0 && drawnIdx.length < Math.min(FIELD_FLOOR, total))
      throw new Error(`at ${SIZE} the only threshold that keeps the map legible is ${threshold} — ${drawnIdx.length} of ${total} points. A proportional-symbol map is a field; this is a locator. Filter the rows to fewer, larger places with where${SIZE === "landscape" ? "" : ", or render at landscape"}`);
    const shown = drawnIdx.map(([, i]) => symbols[i]);
    const shownStations = drawnIdx.map(([s]) => s);
    const valueShown = shownStations.reduce((a, s) => a + s.value, 0);
    const cut = {
      threshold,
      drawn: shownStations.length,
      total,
      drawnSubject: shownStations.filter((s) => s.subject).length,
      totalSubject: stations.filter((s) => s.subject).length,
      drawnShare: (shownStations.length / total) * 100,
      drawnValueShare: (valueShown / valueAll) * 100,
    };
    const limitNote = forms(beat.limitNote(cut));
    if (threshold > 0 && !limitNote.every((f) => plain(f).includes(plain(beat.format(threshold)))))
      throw new Error(`the plate does not draw the points under ${beat.format(threshold)} ${beat.unit}, and every form of limitNote(cut) must say so with cut.threshold printed by format(): ${JSON.stringify(limitNote[0])}`);
    console.log(`threshold ${threshold} · ${cut.drawn} of ${total} drawn, carrying ${cut.drawnValueShare.toFixed(1)} % of the total · worst cell ${worstCellInk(shown, SMALLEST_MAP, CAMERA_ASPECT, 0.7).toFixed(0)} %`);

    /** The key: two named circles on the marks' own function, at one significant figure — the
     *  largest round value under the largest mark, and the smallest round value the plate draws. */
    const roundDown = (v) => {
      const e = 10 ** Math.floor(Math.log10(v));
      return Math.floor(v / e) * e;
    };
    const bigKey = roundDown(MAX);
    const smallKey = Math.max(threshold, roundDown(Math.max(MAX / 10, Math.min(...shownStations.map((s) => s.value).filter((v) => v > 0)))));
    const KEY = smallKey < bigKey ? [bigKey, smallKey] : [bigKey];
    const keyCircles = KEY.map((v) => ({ mw: v, r: radiusOf(v), label: plain(beat.format(v)) }));

    const OCCUPANCY = markOccupancy(
      shown.map((s) => ({ kind: "disc", x: s.x * VIEW, y: s.y * VIEW, r: s.r * VIEW })),
      field,
    );
    console.log(occupancyLine(OCCUPANCY));
    const colourProblems = guardColour(picked, plateGrounds(tints, OCCUPANCY));
    if (colourProblems.length) throw new Error(`this beat's colour cannot be carried here: ${colourProblems.join("; ")}`);

    const facts = beatFacts(
      stations.map((s, i) => ({ key: `${i}`, label: s.subject ? String(subjectRule.equals) : "", value: s.value })),
      { subject: String(subjectRule.equals), points: { count: total, locatedAt: "the row's own coordinates" }, overlapping: true, geography: { areas: 0, settlements: 0, waters: 0, basemap: true }, declaredSequence: "none" },
    );
    const offered = applicableTreatments(facts);
    const direction = resolveDirectionFamilies(picked, textFor(cut));
    await renderStill({
      element: createElement(DirectedProportionalSymbol, {
        frame: { width: EXPORT_FRAME.width, height: EXPORT_FRAME.height },
        plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
        shapes,
        symbols: shown,
        keyCircles,
        aspect: CAMERA_ASPECT,
        dotIs: beat.dotIs,
        subjectNote: beat.subjectNote(cut),
        limitNote,
        title: forms(beat.title),
        limits: forms(beat.limits),
        reading: forms(beat.reading),
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt(cut) : beat.alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
      width: EXPORT_FRAME.width,
      height: EXPORT_FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: EXPORT_FRAME.scale,
    });
    console.log(`rendered renders/${nameAtSize(id, SIZE)}.png`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`REFUSED — ${error.message}`);
  }
}
if (refused.length) process.exit(1);

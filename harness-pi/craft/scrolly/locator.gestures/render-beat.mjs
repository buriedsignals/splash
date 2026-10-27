// The generic half of a locator GESTURE beat: the per-type kit's runner (static/locator/render-beat.mjs) with its
// fixed staging — the subject ringed with its lines, the settlements named — replaced by the beat's `gestures`.
// Guard order: applyStoryboard → REQUIRED → the places and the join → check() → the gesture core (validateGestures,
// family geo, this variant's hooks, the claim read from STORYBOARD.md; a locator's marks are the subject and the
// settlements, valued by their distance to the subject in km — the one figure a locator draws) → the static
// scheduler → the bake, the camera → render. A gesture refusal prints REFUSED with the beat.mjs field and a value
// that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead. Everything about THIS story lives
// in ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by the model.
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
import { GestureGeoPointStatic } from "./GestureGeoPointStatic.tsx";
import { GestureRefusal } from "./gesture-core.mjs";
import { pointMarks, refusalText, stageGeoPoint } from "./gesture-geo-point-family.mjs";
import { composeGeoPointStatic } from "./gesture-geo-point-static.mjs";
import { importBeat, rowFacts, applyStoryboard, assertNumbers, errorText } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
/** The format this copy of the runner renders: the web, scrolly and video kits carry the same runner with FORMAT set. */
const FORMAT = "scrolly";
const beat = await importBeat(HERE).catch((error) => {
  console.log(`REFUSED — ${errorText(error)}`);
  process.exit(1);
});
applyStoryboard(beat, HERE, { basemap: "©MapTiler ©OpenStreetMap contributors" });
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const EXPORT_FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "subject", "subjectLines", "gestures", "areas", "places", "waters", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
const forms = (v) => [v].flat();
const plain = (s) => String(s).replace(/[   ]/g, " ");

// ── the places, read from data.json by the columns the beat names ──────────
const table = JSON.parse(readFileSync(join(HERE, "data.json"), "utf8"));
const at = (name, field) => {
  const i = (table.columns ?? []).findIndex((c) => c.name === name);
  if (i < 0)
    throw new Error(`beat.mjs's ${field} names the column ${JSON.stringify(name)}, which data.json does not have; its columns are ${table.columns.map((c) => c.name).join(", ")}`);
  return i;
};
const num = (raw) => (typeof raw === "number" ? raw : Number(String(raw).replace(/\s/g, "").replace(",", ".")));

/** A ROW OF data.json BY ITS NAME — the locator's join. A name that matches no row, or two, fails
 *  loud: a settlement drawn at the wrong row's coordinates is a dot in the wrong town. */
function rowNamed(column, value, what) {
  const ci = at(column, `${what}.column`);
  const hits = table.rows.filter((r) => String(r[ci]) === String(value));
  if (!hits.length) throw new Error(`${what}: no row of data.json has ${column} = ${JSON.stringify(value)}`);
  if (hits.length > 1) throw new Error(`${what}: ${hits.length} rows of data.json have ${column} = ${JSON.stringify(value)}; name one row`);
  const [lo, la] = [at(beat.lon, "lon"), at(beat.lat, "lat")];
  return { lon: num(hits[0][lo]), lat: num(hits[0][la]) };
}

/** The subject: `{ lon, lat }` numbers computed in beat.mjs, or `{ column, equals }` naming its row. */
const subjectAt =
  typeof beat.subject?.lon === "number" && typeof beat.subject?.lat === "number"
    ? { lon: beat.subject.lon, lat: beat.subject.lat }
    : beat.subject?.column !== undefined
      ? rowNamed(beat.subject.column, beat.subject.equals, "subject")
      : (() => {
          throw new Error("beat.mjs's subject must be { lon, lat } (numbers read from data.json) or { column, equals } naming its row");
        })();
/** A place is the value of its placeName cell, or { name, label } when the story's language prints
 *  it otherwise (data.json's "Kyiv" printed « Kiev »): the name finds the row, the label is drawn. */
const settlementRows = forms(beat.places).map((p) => {
  if (!beat.placeName) throw new Error("beat.mjs names places but no placeName column to find them by");
  const name = typeof p === "object" && p !== null ? p.name : p;
  const label = typeof p === "object" && p !== null ? (p.label ?? p.name) : p;
  return { name: plain(label), ...rowNamed(beat.placeName, name, `place ${JSON.stringify(name)}`) };
});
if (!Array.isArray(beat.waters)) throw new Error("beat.mjs's waters must be an array (possibly empty) of { forms, lon, lat }");
assertNumbers(
  [
    ["subject lon", subjectAt.lon], ["subject lat", subjectAt.lat],
    ...settlementRows.flatMap((p) => [[`${p.name} lon`, p.lon], [`${p.name} lat`, p.lat]]),
    ...beat.waters.flatMap((w) => [[`${forms(w.forms)[0]} lon`, w.lon], [`${forms(w.forms)[0]} lat`, w.lat]]),
  ],
  "coordinates",
);
const offGlobe = [subjectAt, ...settlementRows, ...beat.waters].filter((p) => Math.abs(p.lat) > 85 || Math.abs(p.lon) > 180);
if (offGlobe.length) throw new Error(`a place has coordinates off the map (lon ${offGlobe[0].lon}, lat ${offGlobe[0].lat}): check that lon names the longitude column and lat the latitude column`);
if (!forms(beat.subjectLines).length || !String(forms(beat.subjectLines)[0]).trim())
  throw new Error("subjectLines' first line is the subject's name, printed beside its ring");
beat.check();

// ── the gestures: checked against the places the plate names and the claim the journalist confirmed ─────────
const front = (() => {
  const file = join(HERE, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
})();
const SUBJECT_NAME = plain(forms(beat.subjectLines)[0]);
const marks = pointMarks("locator", [{ name: SUBJECT_NAME, lon: subjectAt.lon, lat: subjectAt.lat, subject: true }, ...settlementRows]);
const claim = {
  takeaway: front("takeaway") ?? forms(beat.title)[0],
  subject: front("subject"),
  comparison: front("comparison"),
  // The claim is about the subject the beat locates.
  entity: SUBJECT_NAME,
  facts: (() => {
    // A printed label stands for its row: the subject's figures are its row's (found by its coordinates), a
    // settlement printed « Kiev » has the figures of its row "Kyiv".
    const facts = rowFacts(HERE);
    const [lo, la] = [at(beat.lon, "lon"), at(beat.lat, "lat")];
    const numeric = table.columns.map((c) => c.type === "number");
    const own = table.rows.find((r) => num(r[lo]) === subjectAt.lon && num(r[la]) === subjectAt.lat);
    if (own) facts[SUBJECT_NAME] = own.map((c, i) => (numeric[i] ? Number(c) : NaN)).filter(Number.isFinite);
    for (const p of forms(beat.places))
      if (typeof p === "object" && p?.label && facts[p.name]) facts[plain(p.label)] = facts[p.name];
    return facts;
  })(),
  unit: "km",
};
let staged;
try {
  staged = stageGeoPoint({
    variant: "locator",
    gestures: beat.gestures,
    marks,
    claim,
    format: FORMAT,
    // The whole camera is the plate's own box (the subject ± span); a close-up holds a third of it.
    adapter: {
      bounds: [[subjectAt.lon - (beat.span?.lon ?? 9), subjectAt.lat - (beat.span?.lat ?? 5.2)], [subjectAt.lon + (beat.span?.lon ?? 9), subjectAt.lat + (beat.span?.lat ?? 5.2)]],
      span: { lon: (beat.span?.lon ?? 9) / 3, lat: (beat.span?.lat ?? 5.2) / 3 },
    },
    repair: process.env.SPLASH_GESTURE_REPAIR === "1",
    schedule: (valid, adapter) => composeGeoPointStatic({ gestures: FORMAT === "static" ? valid : [], adapter, format: (v) => `${plain(String(v))} km` }),
  });
} catch (error) {
  if (!(error instanceof GestureRefusal)) throw error;
  console.log(`REFUSED — ${refusalText(error)}`);
  process.exit(1);
}
for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
const plate = staged.scheduled;
// The subject's words: its name, then every note a gesture writes on it (else the beat's own subjectLines).
const onSubject = plate.notes.filter((n) => n.marks[0] === SUBJECT_NAME && n.kind !== "set").map((n) => plain(n.text));
const subjectLines = onSubject.length ? [SUBJECT_NAME, ...onSubject] : forms(beat.subjectLines).map(plain);
// A settlement's note is printed after its name.
const placeNote = new Map(plate.notes.filter((n) => n.marks[0] !== SUBJECT_NAME && n.kind !== "set").map((n) => [n.marks[0], plain(n.text)]));

// ── the camera: the box the SUBJECT needs ──────────────────────────────────
/** THE CAMERA'S BOUNDS ALWAYS COME FROM THE SUBJECT: a box of span.lon by span.lat degrees either
 *  side of it (the worked example's 9 by 5.2). At that scale Mercator's cost across the frame is a
 *  fraction of a per cent. */
const span = { lon: beat.span?.lon ?? 9, lat: beat.span?.lat ?? 5.2 };
if (!(span.lon > 0 && span.lon <= 30 && span.lat > 0 && span.lat <= 20))
  throw new Error(`span ${JSON.stringify(span)} must be between 0 and 30° of longitude and 20° of latitude either side: a locator frames a region, not a continent`);
const bounds = [
  [subjectAt.lon - span.lon, Math.max(-84, subjectAt.lat - span.lat)],
  [subjectAt.lon + span.lon, Math.min(84, subjectAt.lat + span.lat)],
];
if (bounds[0][0] < -180 || bounds[1][0] > 180)
  throw new Error("the subject's box crosses the antimeridian, which this kit does not frame");

const PLATE_SIZE = "1000x760";
const VIEW = 1000;
const LAND_DOSE = 0.07;
const NARROWEST_MAP = 596;
const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const areaCodes = Object.keys(beat.areas ?? {});
const textPerRegister = {
  display: forms(beat.title).join(" "),
  eyebrow: beat.eyebrow,
  body: `${forms(beat.limits).join(" ")} ${beat.source}`,
  axis: `${Object.values(beat.areas).join(" ")} ${beat.waters.flatMap((w) => forms(w.forms)).join(" ")}`,
  annot: `${forms(beat.reading).join(" ")} ${settlementRows.map((p) => p.name).join(" ")} ${forms(beat.subjectLines).join(" ")} ${plate.notes.map((n) => n.text).join(" ")}`,
  value: forms(beat.subjectLines).slice(1).join(" "),
};

let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom: readPalette(HERE), filed: filedDirections(), beat: { evidenceLevels: 4 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

/** A PLATE BELONGS TO A DIRECTION, A SIZE, A CAMERA AND TWO TINTS: the camera comes from the
 *  subject, so a plate baked for another subject is stale. */
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
const held = new Set(geo.features.map((f) => f.properties.iso));
const unknownAreas = areaCodes.filter((c) => !held.has(c));
if (unknownAreas.length)
  throw new Error(`areas names ${unknownAreas.join(", ")}, which the kit's country file does not hold. It holds ISO 3166 alpha-3 codes for Europe and its neighbours only: ${[...held].filter((c) => c !== "-99").sort().join(" ")}`);

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
    const viewH = VIEW / CAMERA_ASPECT;
    const inFrameView = ([x, y]) => x >= 0 && x <= VIEW && y >= 0 && y <= viewH;

    /** THE SEAT IS THE CENTRE OF THE PART IN FRAME, not of the country: a country with no vertex in
     *  the camera keeps no seat at all. */
    const shapes = geo.features
      .map((f) => {
        const rings = f.geometry.coordinates.flatMap((poly) => poly).map((ring) => ring.map(project));
        if (!rings.some((ring) => ring.some(([x, y]) => x >= -50 && x <= VIEW + 50 && y >= -50 && y <= viewH + 50))) return null;
        const inFrame = rings.flat().filter(inFrameView);
        const seat = inFrame.length
          ? { x: inFrame.reduce((a, p) => a + p[0], 0) / inFrame.length / VIEW, y: inFrame.reduce((a, p) => a + p[1], 0) / inFrame.length / VIEW }
          : null;
        return {
          iso: f.properties.iso,
          name: beat.areas[f.properties.iso] ?? f.properties.name,
          seat,
          d: rings.map((ring) => `M ${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`).join(" "),
        };
      })
      .filter(Boolean);
    const seatless = areaCodes.filter((c) => !shapes.find((s) => s.iso === c)?.seat);
    if (seatless.length)
      throw new Error(`areas names ${seatless.join(", ")}, which has no land inside this camera: name only the areas a reader can see on the plate`);

    const toUnit = ([x, y]) => ({ x: x / VIEW, y: y / VIEW });
    const outOfFrame = settlementRows.filter((p) => !inFrameView(project([p.lon, p.lat])));
    if (outOfFrame.length)
      throw new Error(`places ${outOfFrame.map((p) => p.name).join(", ")} fall outside the camera (${span.lon}° by ${span.lat}° around the subject): name only places inside it, or widen span`);
    const places = settlementRows.map((p) => {
      const note = placeNote.get(p.name);
      return { name: note ? (note.includes(p.name) ? note : `${p.name} · ${note}`) : p.name, ...toUnit(project([p.lon, p.lat])) };
    });
    const waterOut = beat.waters.filter((w) => !inFrameView(project([w.lon, w.lat])));
    if (waterOut.length) throw new Error(`waters ${waterOut.map((w) => forms(w.forms)[0]).join(", ")} sit outside the camera`);
    const waters = beat.waters.map((w) => ({ forms: forms(w.forms), ...toUnit(project([w.lon, w.lat])) }));
    const subject = { name: SUBJECT_NAME, ...toUnit(project([subjectAt.lon, subjectAt.lat])), lines: subjectLines };

    const field = plateWaterField(plateDir(id), { scale: FRAME.width / VIEW });
    /** WHERE THE PLATE SAYS THESE PLACES ARE. A settlement deep in the sea, or a sea's name deep in
     *  the land, is a coordinate typed wrong or two columns swapped — the dot is drawn somewhere real
     *  and wrong. A few pixels of slack for coastal towns and for rivers the plate paints thin. */
    const SLACK = 6;
    const deepAtSea = (p) => (field.waterDepthAt(p.x * VIEW, p.y * VIEW) ?? 0) > SLACK;
    /** A water's name may sit beside a river the plate paints a few pixels wide (the worked example's
     *  « Dniepr » seat is 8.9 px from painted water on a 1000 px plate), so it is held to 1.5 % of
     *  the plate's width rather than to the settlements' slack. */
    const WATER_SLACK = 15;
    const deepInland = (p) => (field.landDepthAt(p.x * VIEW, p.y * VIEW) ?? 0) > WATER_SLACK;
    const wet = places.filter(deepAtSea);
    if (wet.length) throw new Error(`places ${wet.map((p) => p.name).join(", ")} sit in the water on the plate: their coordinates are wrong or lon/lat are swapped`);
    if (deepAtSea(subject) && beat.atSea !== true)
      throw new Error(`the subject sits in the water on the plate: its coordinates are wrong or lon/lat are swapped. If it really is at sea, set atSea: true`);
    const dry = waters.filter(deepInland);
    if (dry.length) throw new Error(`waters ${dry.map((w) => w.forms[0]).join(", ")} sit on land on the plate: put each water's lon/lat on the water it names`);

    const OCCUPANCY = markOccupancy(
      [{ kind: "disc", name: subject.name, x: subject.x * VIEW, y: subject.y * VIEW, r: (5 / NARROWEST_MAP) * VIEW }],
      field,
    );
    console.log(occupancyLine(OCCUPANCY));
    const colourProblems = guardColour(picked, plateGrounds(tints, OCCUPANCY));
    if (colourProblems.length) throw new Error(`this beat's colour cannot be carried here: ${colourProblems.join("; ")}`);

    const facts = beatFacts([{ key: "subject", label: subject.name, value: 1 }], {
      subject: "subject",
      points: { count: 1 + places.length, locatedAt: "recorded coordinates" },
      geography: { areas: areaCodes.length, settlements: places.length, waters: waters.length, basemap: true },
      declaredSequence: "none",
    });
    const offered = applicableTreatments(facts);
    const direction = resolveDirectionFamilies(picked, textPerRegister);
    const notes = [];
    if (FORMAT !== "static") {
      // THE GEOMETRY THE OTHER FORMATS DRAW: this plate and these marks, in the plate's view units.
      const { renderGeoPointFormat } = await import("./gesture-geo-point-render.mjs");
      const km = new Map(staged.adapter.marks.map((m) => [m.name, m.value]));
      const geometry = {
        variant: "locator",
        W: VIEW,
        H: viewH,
        plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
        marks: [
          { name: SUBJECT_NAME, kind: "subject", x: subject.x * VIEW, y: subject.y * VIEW, r: 3, label: SUBJECT_NAME, detail: subjectLines.join(" · ") },
          ...settlementRows.map((p, i) => ({ name: p.name, kind: "point", x: places[i].x * VIEW, y: places[i].y * VIEW, r: 2.2, label: p.name, detail: `${p.name} · ${km.get(p.name)} km` })),
        ],
        furniture: [
          ...shapes.filter((sh) => beat.areas[sh.iso] && sh.seat).map((sh) => ({ text: plain(beat.areas[sh.iso]).toUpperCase(), x: sh.seat.x * VIEW, y: sh.seat.y * VIEW, kind: "area" })),
          ...waters.map((w) => ({ text: plain(w.forms[0]), x: w.x * VIEW, y: w.y * VIEW, kind: "water" })),
        ],
        whole: { x: 0, y: 0, w: VIEW, h: viewH },
      };
      await renderGeoPointFormat(FORMAT, { here: HERE, variant: "locator", beat, geometry, valid: staged.valid, adapter: staged.adapter, valueFormat: (v) => `${v} km`, land: tints.land, textPerRegister, alt: beat.alt });
      continue;
    }
    await renderStill({
      element: createElement(GestureGeoPointStatic, {
        variant: "locator",
        frame: { width: EXPORT_FRAME.width, height: EXPORT_FRAME.height },
        plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
        tints,
        shapes,
        areas: areaCodes,
        places,
        waters,
        subject,
        aspect: CAMERA_ASPECT,
        title: forms(beat.title),
        limits: forms(beat.limits),
        reading: forms(beat.reading),
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => {
          notes.push(note);
          console.log(`  ${note}`);
        },
      }),
      width: EXPORT_FRAME.width,
      height: EXPORT_FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: EXPORT_FRAME.scale,
    });
    const dropped = notes.find((n) => n.includes("no room for"));
    if (dropped) console.log(`NOTE — the placer could not place every label (${dropped.split("no room for: ")[1]}): shorten those names or give them a shorter form`);
    console.log(`rendered renders/${nameAtSize(id, SIZE)}.png`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`REFUSED — ${errorText(error)}`);
  }
}
if (refused.length) process.exit(1);

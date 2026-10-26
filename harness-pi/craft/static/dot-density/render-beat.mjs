// The generic half of a dot-density beat: camera, plate, projection, occupancy, colour guard, render
// and refusals, taken from proof/static-dot-density-europe-stations/render-directions.mjs with
// everything about ITS subject removed. Everything about THIS story — which columns are the
// coordinates, which value marks the subject, the words, the checks — lives in ./beat.mjs, the one
// file the model writes. Copied into the beat by the harness; never edited by the model.
//
// THE CAMERA HOLDS THE POINTS: their own extent, padded, baked once per direction as a MapTiler plate
// (bake.mjs, MAPTILER_KEY from the environment). The worked example baked a fixed Europe box and
// silently clipped 43 of its 8 900 stations north of 68°N; here a point the plate does not hold is
// refused, never clipped. The frozen country shapes (shapes.geojson) cover Europe and its
// neighbours, so points beyond them are refused too.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { readFileSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { composeDirections, filedDirections, guardColour, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { plateWasPaintedWith } from "#shared/map-beat/plate-cache.mjs";
import { markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { plateWaterField } from "./plate-water.mjs";
import { DirectedDotDensity } from "./DirectedDotDensity.tsx";
import { readPoints, readTable } from "./points.mjs";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
applyStoryboard(beat, HERE, { basemap: "©MapTiler ©OpenStreetMap contributors" });
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const EXPORT_FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "lon", "lat", "subject", "dotIs", "subjectNote", "limitNote", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);

// ── the points, read by the same reader the beat's words use ────────────────
const points = readPoints(readTable(HERE), { lon: beat.lon, lat: beat.lat, subject: beat.subject, where: beat.where ?? {} });
assertNumbers(points.flatMap((p, i) => [[`lon#${i}`, p.lon], [`lat#${i}`, p.lat]]), "coordinates");
const subjectCount = points.filter((p) => p.subject).length;
beat.check();
const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
// Every form, not only the first: the component's ladder may land on the shortest headline.
for (const t of titles) assertHeadlineNumbersDrawn(t, [subjectCount, points.length], "points (subject count and total)");
// The key names how many subject points are ringed; it must be the count the plate rings.
const noteNumbers = (String(beat.subjectNote).match(/\d+(?:[   .,]\d{3})*/g) ?? []).map((n) => Number(n.replace(/[   .,]/g, "")));
if (noteNumbers.length && !noteNumbers.includes(subjectCount))
  throw new Error(`subjectNote says ${noteNumbers.join(", ")}, but the plate rings ${subjectCount} points: compute it from the points (readPoints(...).filter((p) => p.subject).length)`);

// ── the direction: the run's own, or composed from PALETTE.md ───────────────
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: beat.limitNote,
  annot: `${reading.join(" ")} ${beat.dotIs} ${beat.subjectNote}`,
  value: `${subjectCount} ${points.length}`,
};
const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = { label: labelOf(run.id), direction: run };
} else {
  const composition = composeDirections({ newsroom: readPalette(HERE), filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 3 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = { label: labelOf(composition.offered[0].id), direction: composition.offered[0] };
}

// ── the plate: baked once per direction and size, reused while its tints hold ─
/** The worked example's measured land weight: the land passes in front of the water. */
const LAND_DOSE = 0.16;
const PLATE_SIZE = "1000x760";
const VIEW = 1000;
const tints = plateTints(chosen.direction, { landDose: LAND_DOSE });
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));

/** WHERE THE FROZEN SHAPES REACH. A point beyond them would sit on a plate this kit has no land for. */
const cover = { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity };
for (const f of geo.features)
  for (const poly of f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates])
    for (const [lon, lat] of poly[0]) {
      cover.west = Math.min(cover.west, lon);
      cover.east = Math.max(cover.east, lon);
      cover.south = Math.min(cover.south, lat);
      cover.north = Math.max(cover.north, lat);
    }
const uncovered = points.filter((p) => p.lon < cover.west || p.lon > cover.east || p.lat < cover.south || p.lat > cover.north);
if (uncovered.length)
  throw new Error(
    `${uncovered.length} of ${points.length} points lie outside the frozen country shapes (Europe and its neighbours, ` +
      `${cover.west.toFixed(0)}..${cover.east.toFixed(0)}°E, ${cover.south.toFixed(0)}..${cover.north.toFixed(0)}°N), e.g. ` +
      `${JSON.stringify(uncovered[0].row)}. This kit cannot draw another region; filter them out with \`where\` and say so in the standfirst.`,
  );

/** THE CAMERA'S BOX: the points' extent, padded by 4 % of its span (and never under 1.5° a side), so
 *  no dot sits on the frame's edge. The bake widens it to the plate's aspect and refuses a crop. */
const span = (a, b) => Math.max(b - a, 1.5);
const ext = {
  west: Math.min(...points.map((p) => p.lon)),
  east: Math.max(...points.map((p) => p.lon)),
  south: Math.min(...points.map((p) => p.lat)),
  north: Math.max(...points.map((p) => p.lat)),
};
const padX = span(ext.west, ext.east) * 0.04 + (1.5 - Math.min(1.5, ext.east - ext.west)) / 2;
const padY = span(ext.south, ext.north) * 0.04 + (1.5 - Math.min(1.5, ext.north - ext.south)) / 2;
const round = (v) => Math.round(v * 100) / 100;
const BOUNDS = [
  [round(Math.max(-180, ext.west - padX)), round(Math.max(-80, ext.south - padY))],
  [round(Math.min(180, ext.east + padX)), round(Math.min(84, ext.north + padY))],
];
const plateDir = join(HERE, "plate", nameAtSize(chosen.label, SIZE));
const plateHoldsBounds = () => {
  try {
    return JSON.stringify(JSON.parse(readFileSync(join(plateDir, "geometry.json"), "utf8")).bounds) === JSON.stringify(BOUNDS);
  } catch {
    return false;
  }
};
if (!plateWasPaintedWith(plateDir, tints) || !plateHoldsBounds()) {
  console.log(`baking the ${chosen.label} plate (MapTiler, ${PLATE_SIZE}, bounds ${JSON.stringify(BOUNDS)})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--countries", join(HERE, "shapes.geojson"), "--water", tints.water, "--land", tints.land, "--bounds", BOUNDS.flat().join(","), "--out", plateDir],
    { cwd: HERE, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status}: the basemap plate could not be baked (is MAPTILER_KEY set?)`);
}
const plateFacts = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
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

/** A POINT THE CAMERA DOES NOT HOLD IS REFUSED, NOT CLIPPED: a dot map that silently loses its
 *  outliers states a count it does not draw. */
const outside = points.filter((p) => p.lon < CORNERS.west || p.lon > CORNERS.east || p.lat < CORNERS.south || p.lat > CORNERS.north);
if (outside.length)
  throw new Error(
    `${outside.length} of ${points.length} points fall outside the baked plate (${CORNERS.west.toFixed(1)}..${CORNERS.east.toFixed(1)}°E, ` +
      `${CORNERS.south.toFixed(1)}..${CORNERS.north.toFixed(1)}°N), e.g. ${JSON.stringify(outside[0].row)}: the plate is stale — delete the beat's plate/ folder and render again.`,
  );

const MIN_STEP = VIEW / 1400;
function thin(ring) {
  const out = [ring[0]];
  for (const p of ring.slice(1)) {
    const q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) > MIN_STEP || Math.abs(p[1] - q[1]) > MIN_STEP) out.push(p);
  }
  return out.length >= 4 ? out : ring;
}
/** Sutherland–Hodgman against the camera's box (plus a margin). KIT CHANGE: a zoomed camera left a
 *  neighbour's ring running 2 000 units off the plate, and resvg panicked rasterising it. Clipped,
 *  every drawn ring stays near the frame; what the camera shows is unchanged. */
function clipRing(ring, { x0, y0, x1, y1 }) {
  const edges = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ];
  let out = ring;
  for (const [inside, cut] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[(i + input.length - 1) % input.length];
      const b = input[i];
      if (inside(b)) {
        if (!inside(a)) out.push(cut(a, b));
        out.push(b);
      } else if (inside(a)) out.push(cut(a, b));
    }
    if (!out.length) return out;
  }
  if (out.length) out.push(out[0]);
  return out;
}
const shapes = geo.features
  .map((f) => {
    // KIT CHANGE: rings wholly off the camera are culled. The worked example never zoomed, so it drew
    // every shape; a camera on one region projects the far ones tens of thousands of units out.
    const H = VIEW / CAMERA_ASPECT;
    const M = VIEW * 0.05;
    const onCamera = (ring) => {
      const xs = ring.map((p) => p[0]);
      const ys = ring.map((p) => p[1]);
      return Math.max(...xs) >= -M && Math.min(...xs) <= VIEW + M && Math.max(...ys) >= -M && Math.min(...ys) <= H + M;
    };
    const rings = f.geometry.coordinates
      .flatMap((poly) => poly)
      .map((ring) => ring.map(project))
      .filter(onCamera)
      .map((ring) => clipRing(ring, { x0: -M, y0: -M, x1: VIEW + M, y1: H + M }))
      .filter((ring) => ring.length >= 4)
      .map(thin);
    if (!rings.length) return null;
    return { iso: f.properties.iso, d: rings.map((ring) => `M ${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`).join(" ") };
  })
  .filter(Boolean);
const dots = points.map((p) => {
  const [x, y] = project([p.lon, p.lat]);
  return { x: x / VIEW, y: y / VIEW, subject: p.subject };
});
if (dots.filter((d) => d.subject).length !== subjectCount)
  throw new Error(`${subjectCount} subject points in the data and ${dots.filter((d) => d.subject).length} on the plate`);

/** WHICH GROUNDS THE DOTS OCCUPY, measured on the plate this beat baked, at the radius the component
 *  draws (its 1.1 px floor on the narrowest map the worked example measured). */
const NARROWEST_MAP = 596;
const DOT_R_VIEW = (1.1 / NARROWEST_MAP) * VIEW;
const OCCUPANCY = markOccupancy(
  dots.map((d) => ({ kind: "disc", x: d.x * VIEW, y: d.y * VIEW, r: DOT_R_VIEW })),
  plateWaterField(plateDir, { scale: FRAME.width / VIEW }),
);
console.log(occupancyLine(OCCUPANCY));
const colourProblems = guardColour(chosen.direction, plateGrounds(tints, OCCUPANCY));
if (colourProblems.length) throw new Error(`this beat's colour cannot be carried on this plate: ${colourProblems.join("; ")}`);

const facts = beatFacts(
  points.map((p, i) => ({ key: `p${i}`, label: p.subject ? "subject" : "field", value: 1 })),
  {
    subject: "subject",
    points: { count: points.length, locatedAt: "the source's own coordinates" },
    units: { count: points.length, thing: beat.thing ?? "point" },
    geography: { areas: 0, settlements: 0, waters: 0, basemap: true },
    declaredSequence: "none",
  },
);
const offered = applicableTreatments(facts);

const direction = resolveDirectionFamilies(chosen.direction, textPerRegister);
const name = nameAtSize(chosen.label, SIZE);
try {
  await renderStill({
    element: createElement(DirectedDotDensity, {
      frame: { width: EXPORT_FRAME.width, height: EXPORT_FRAME.height },
      shapes,
      dots,
      plate: `data:image/png;base64,${(await readFile(join(plateDir, "plate.png"))).toString("base64")}`,
      aspect: CAMERA_ASPECT,
      dotIs: beat.dotIs,
      subjectNote: beat.subjectNote,
      limitNote: beat.limitNote,
      title: titles,
      limits,
      reading,
      source: beat.source,
      alt: typeof beat.alt === "function" ? beat.alt(points) : beat.alt,
      eyebrow: beat.eyebrow,
      direction,
      treatments: offered.map((t) => t.id),
      onLadder: (note) => console.log(`  ${note}`),
    }),
    width: EXPORT_FRAME.width,
    height: EXPORT_FRAME.height,
    outDir: OUT,
    name,
    scale: EXPORT_FRAME.scale,
  });
  console.log(`rendered renders/${name}.png`);
} catch (error) {
  for (const ext of ["png", "svg"]) await rm(join(OUT, `${name}.${ext}`), { force: true });
  console.log(`REFUSED — ${error.message}`);
  process.exit(1);
}

// The generic half of a contour / isoline beat: the plate, the field carried onto it, the colour
// guard, the art direction and the render, taken from proof/static-contour-europe-distance/
// render-directions.mjs with everything about ITS subject removed. Everything about THIS story —
// the study area, the words, the checks — lives in ./beat.mjs, the one file the model writes.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
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
import { drawableField } from "./field.mjs";
import { DirectedContourField } from "./DirectedContourField.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
applyStoryboard(beat, HERE);
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "field", "unit", "limitNote", "levelLabel", "summitLabel", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
// THE ONE FIELD THIS KIT DRAWS. Anything else — elevation, temperature, travel time, a distance to
// the nearest record — has no frozen source in a story folder, and a field built from records is the
// type sheet's own prohibition (`no-build-field-records`).
if (beat.field?.kind !== "distance-to-sea" || !beat.field?._grid)
  throw new Error(
    "field must be measureSeaDistance(import.meta.dirname, { study }) from ./field.mjs — distance to the sea " +
      "is the only field this kit can draw honestly. A story whose field is something else (elevation, " +
      "temperature, distance to records) is not a contour beat this kit can make: say so, do not fake the field",
  );
const field = beat.field;
const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
for (const [name, forms] of [["title", titles], ["limits", limits], ["reading", reading]])
  if (!forms.length || forms.some((f) => typeof f !== "string" || !f.trim()))
    throw new Error(`${name} must be one or more non-empty sentences, longest first`);
if (typeof beat.levelLabel !== "function") throw new Error("levelLabel must be a function (level) => label printed on the line, e.g. (l) => `${l} km`");
const levelSample = beat.levelLabel(field.levels[0]);
if (!String(levelSample).includes(String(field.levels[0])))
  throw new Error(`levelLabel(${field.levels[0]}) prints "${levelSample}", which does not show the line's own value`);
if (!/\d/.test(beat.summitLabel)) throw new Error(`summitLabel is "${beat.summitLabel}": it must print the deepest point's distance, computed from field.deepest`);

assertNumbers([["median", field.median], ["deepest", field.deepest]], "field figures");
beat.check();
// The headline's figures are the field's: its median, its deepest point, a level drawn, or a quantile.
const figures = [field.median, field.deepest, ...field.levels, ...[0.1, 0.25, 0.75, 0.9].map((p) => field.quantile(p))].map(Math.round);
assertHeadlineNumbersDrawn(titles[0], figures, "field figures");
const summitKm = Math.round(field.deepest);
if (!String(beat.summitLabel).replace(/[\s  .,]/g, "").includes(String(summitKm)))
  throw new Error(`summitLabel "${beat.summitLabel}" must state the deepest point's distance, ${summitKm} — compute it from field.deepest`);

const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.limitNote} ${field.levels.map((l) => beat.levelLabel(l)).join(" ")} ${beat.unit} ${beat.summitLabel}`,
  annot: reading.join(" "),
  value: `${Math.round(field.median)} ${summitKm}`,
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = { label: labelOf(run.id), direction: run };
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 3 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = { label: labelOf(composition.offered[0].id), direction: composition.offered[0] };
}

// ── the plate: one MapTiler capture per direction and size, baked into the beat's own folder ──
const PLATE_SIZE = "1000x760";
const LAND_DOSE = 0.07;
const id = chosen.label;
const plateDir = join(HERE, "plate", nameAtSize(id, SIZE));
const tints = plateTints(chosen.direction, { landDose: LAND_DOSE });
if (!plateWasPaintedWith(plateDir, tints)) {
  console.log(`baking the ${id} plate (MapTiler, ${PLATE_SIZE})…`);
  const baked = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--countries", join(HERE, "shapes.geojson"), "--water", tints.water, "--land", tints.land, "--out", plateDir],
    { cwd: HERE, stdio: "inherit" },
  );
  if (baked.status !== 0) throw new Error(`bake.mjs exited with ${baked.status}: the plate could not be baked (a MapTiler key in the environment, and Chrome, are needed)`);
}
const plateFacts = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
const drawn = drawableField(field, { frame: plateFacts.frame, corners: plateFacts.frameCorners }, { summitLabel: beat.summitLabel });

// ── which grounds the marks occupy, measured on the plate, and the colour guard on those ──
const VIEW = 1000;
const NARROWEST_MAP = 596;
const ISOLINE_VIEW = (0.85 / NARROWEST_MAP) * VIEW;
const occupancy = markOccupancy(
  [
    ...drawn.contourSets.flatMap((set) =>
      set.flatMap((c) => c.lines.map((line) => ({ kind: "band", name: beat.levelLabel(c.level), points: line, width: ISOLINE_VIEW }))),
    ),
    { kind: "disc", name: "summit", x: drawn.summit.x, y: drawn.summit.y, r: (2.6 / NARROWEST_MAP) * VIEW },
  ],
  plateWaterField(plateDir, { scale: plateFacts.frame.width / VIEW }),
);
console.log(occupancyLine(occupancy));
const colourProblems = guardColour(chosen.direction, plateGrounds(tints, occupancy));
if (colourProblems.length) throw new Error(`this beat's colour cannot be carried on this plate: ${colourProblems.join("; ")}`);

const facts = beatFacts(
  [field.median, field.deepest, ...field.levels].map((v, i) => ({ key: `f-${i}`, label: `f-${i}`, value: v })),
  {
    scaleClasses: field.levels.length,
    geography: { areas: field.study.length, settlements: 0, waters: 0, basemap: true },
    declaredSequence: "distance to the sea",
  },
);
const offered = applicableTreatments(facts);

const direction = resolveDirectionFamilies(chosen.direction, textPerRegister);
const name = nameAtSize(id, SIZE);
try {
  await renderStill({
    element: createElement(DirectedContourField, {
      frame: { width: FRAME.width, height: FRAME.height },
      plate: `data:image/png;base64,${(await readFile(join(plateDir, "plate.png"))).toString("base64")}`,
      shapes: drawn.shapes,
      contourSets: drawn.contourSets,
      summit: drawn.summit,
      aspect: plateFacts.frame.width / plateFacts.frame.height,
      unit: beat.unit,
      limitNote: beat.limitNote,
      title: titles,
      limits,
      reading,
      source: beat.source,
      alt: typeof beat.alt === "function" ? beat.alt(field) : beat.alt,
      eyebrow: beat.eyebrow,
      direction,
      treatments: offered.map((t) => t.id),
      levelLabel: beat.levelLabel,
      onLadder: (note) => console.log(`  ${note}`),
    }),
    width: FRAME.width,
    height: FRAME.height,
    outDir: OUT,
    name,
    scale: FRAME.scale,
  });
  console.log(`rendered renders/${name}.png`);
} catch (error) {
  for (const ext of ["png", "svg"]) await rm(join(OUT, `${name}.${ext}`), { force: true });
  console.log(`REFUSED — ${error.message}`);
  process.exit(1);
}

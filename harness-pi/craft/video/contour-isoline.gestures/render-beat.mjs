// The generic half of a contour GESTURE beat: the per-type kit's runner (static/contour-isoline/render-beat.mjs)
// with its fixed staging — every line numbered, the summit marked — replaced by the beat's `gestures`. A contour's
// marks are its isolines (named by their label, levelLabel(level)) and its summit (named by summitLabel); a
// `reference` draws one more TRUE isoline of the same field at its value, in the accent, its note under the
// caption; a highlight puts a line in the accent. Guard order: applyStoryboard → REQUIRED → the field → check() →
// the gesture core (validateGestures, family geo, this variant's hooks, the claim read from STORYBOARD.md) → the
// static scheduler → the plate → render. A gesture refusal prints REFUSED with the beat.mjs field and a value that
// works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead. Everything about THIS story lives in
// ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by the model.
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
import { composeDirections, filedDirections, guardColour, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { plateWasPaintedWith } from "#shared/map-beat/plate-cache.mjs";
import { markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { plateWaterField } from "./plate-water.mjs";
import { WINDOW, drawableField, summitLonLat } from "./field.mjs";
import { GestureGeoPointStatic } from "./GestureGeoPointStatic.tsx";
import { GestureRefusal } from "./gesture-core.mjs";
import { pointMarks, refusalText, stageGeoPoint } from "./gesture-geo-point-family.mjs";
import { composeGeoPointStatic } from "./gesture-geo-point-static.mjs";
import { importBeat, rowFacts, applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, errorText } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
/** The format this copy of the runner renders: the web, scrolly and video kits carry the same runner with FORMAT set. */
const FORMAT = "video";
const beat = await importBeat(HERE).catch((error) => {
  console.log(`REFUSED — ${errorText(error)}`);
  process.exit(1);
});
applyStoryboard(beat, HERE, { basemap: "©MapTiler ©OpenStreetMap contributors" });
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "field", "gestures", "unit", "limitNote", "levelLabel", "summitLabel", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
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

// ── the gestures: checked against the lines and the summit the plate draws, and the claim confirmed ─────────
const front = (() => {
  const file = join(HERE, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
})();
const SUMMIT = String(beat.summitLabel);
const marks = pointMarks("contour", { levels: field.levels.map((l) => ({ name: String(beat.levelLabel(l)), value: l })), summit: { name: SUMMIT, value: field.deepest, ...(([lon, lat]) => ({ lon, lat }))(summitLonLat(field)) } });
let staged;
try {
  staged = stageGeoPoint({
    variant: "contour",
    gestures: beat.gestures,
    marks,
    claim: { takeaway: front("takeaway") ?? titles[0], subject: front("subject"), comparison: front("comparison"), entity: front("claimEntity"), facts: rowFacts(HERE), unit: "km" },
    format: FORMAT,
    // The whole camera is the measuring window; a close-up on the summit holds a region around it.
    adapter: { field, bounds: [[WINDOW.west, WINDOW.south], [WINDOW.east, WINDOW.north]], span: { lon: 8, lat: 5 } },
    repair: process.env.SPLASH_GESTURE_REPAIR === "1",
    schedule: (valid, adapter) => composeGeoPointStatic({ gestures: FORMAT === "static" ? valid : [], adapter, format: (v) => String(beat.levelLabel(Math.round(v))) , label: () => "" }),
  });
} catch (error) {
  if (!(error instanceof GestureRefusal)) throw error;
  console.log(`REFUSED — ${refusalText(error)}`);
  process.exit(1);
}
for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
const plate = staged.scheduled;
const levelOf = new Map(marks.filter((m) => m.line).map((m) => [m.name, m.value]));
// Lines of the numbered set in the accent: a highlighted line (a reference line is drawn apart, in the accent).
const accentLevels = plate.accent.filter((n) => levelOf.has(n)).map((n) => levelOf.get(n));
// The summit's label: a note a gesture writes on it, else summitLabel.
const summitNote = plate.notes.find((n) => n.marks[0] === SUMMIT && n.kind !== "set")?.text;
// A note on a line, a reference's note and a set's note are written under the caption, in story order.
const captionNotes = [
  ...plate.notes.filter((n) => n.marks[0] !== SUMMIT && !n.value).map((n) => n.text),
  ...plate.lines.filter((l) => l.text).map((l) => l.text),
];

const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.limitNote} ${captionNotes.join(" ")} ${field.levels.map((l) => beat.levelLabel(l)).join(" ")} ${beat.unit} ${summitNote ?? beat.summitLabel}`,
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
const drawn = drawableField(field, { frame: plateFacts.frame, corners: plateFacts.frameCorners }, { summitLabel: summitNote ?? beat.summitLabel, extraLevels: FORMAT === "static" ? plate.lines.map((l) => l.value) : staged.valid.filter((g) => g.do === "reference").map((g) => Number(g.value)) });

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
if (FORMAT !== "static") {
  // THE GEOMETRY THE OTHER FORMATS DRAW: this plate, its numbered isolines, its summit, its reference lines.
  const { renderGeoPointFormat } = await import("./gesture-geo-point-render.mjs");
  const path = (lines) => lines.map((l) => `M ${l.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")}`).join(" ");
  const H = VIEW / (plateFacts.frame.width / plateFacts.frame.height);
  const geometry = {
    variant: "contour",
    W: VIEW,
    H,
    plate: `data:image/png;base64,${(await readFile(join(plateDir, "plate.png"))).toString("base64")}`,
    marks: [
      ...drawn.contourSets[0].map((c) => {
        const longest = c.lines.reduce((a, l) => (l.length > a.length ? l : a), []);
        const [x, y] = longest[Math.floor(longest.length / 2)];
        const name = String(beat.levelLabel(c.level));
        return { name, kind: "line", x, y, d: path(c.lines), label: name, detail: `${name} · ${Math.round(field.within(c.level))} %` };
      }),
      { name: SUMMIT, kind: "summit", x: drawn.summit.x, y: drawn.summit.y, r: 3, label: String(summitNote ?? beat.summitLabel), detail: `${SUMMIT} · 100 %` },
    ],
    references: drawn.references.map((r) => ({ value: r.level, d: path(r.lines) })),
    whole: { x: 0, y: 0, w: VIEW, h: H },
  };
  try {
    await renderGeoPointFormat(FORMAT, { here: HERE, picked: chosen.direction, id, variant: "contour", beat, geometry, valid: staged.valid, adapter: staged.adapter, valueFormat: (v) => String(beat.levelLabel(Math.round(v))), land: tints.land, textPerRegister, alt: typeof beat.alt === "function" ? beat.alt(field) : beat.alt });
  } catch (error) {
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
  process.exit(0);
}
try {
  await renderStill({
    element: createElement(GestureGeoPointStatic, {
        variant: "contour",
      frame: { width: FRAME.width, height: FRAME.height },
      plate: `data:image/png;base64,${(await readFile(join(plateDir, "plate.png"))).toString("base64")}`,
      shapes: drawn.shapes,
      contourSets: drawn.contourSets,
      summit: drawn.summit,
      aspect: plateFacts.frame.width / plateFacts.frame.height,
      unit: beat.unit,
      limitNote: [beat.limitNote, ...captionNotes].join(" "),
      accentLevels,
      references: drawn.references,
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
  console.log(`REFUSED — ${errorText(error)}`);
  process.exit(1);
}

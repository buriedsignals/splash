// The generic half of a choropleth beat: art direction, the plan, the bake, the render and the
// refusals, taken from proof/static-choropleth-europe-lowcarbon/render-directions.mjs with everything
// about ITS subject removed. The camera, projection, plate, class scale and layers come from
// ./choropleth-machinery.mjs; everything about THIS story — the join, the values, words, checks —
// lives in ./beat.mjs, the one file the model writes. Copied into the beat by the harness.
//
// The first render bakes a MapTiler plate into plate/ beside the beat (MAPTILER_KEY from the
// environment); later renders reuse it until the plan changes.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { makePlan, validatePlan } from "#shared/map-beat/plan.mjs";
import { drawnSizeOf, assertPlateMatchesMarks } from "#shared/map-beat/geometry.mjs";
import { assertNoDoubledBasemap } from "#shared/map-beat/style.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { DirectedChoroplethMap, mapGeometryFor, placementsFor } from "./DirectedChoroplethMap.tsx";
import { plateIsCurrent } from "./plate-cache.mjs";
import { BEAT as BAKE } from "./bake.mjs";
import {
  CAMERA_ASPECT,
  assertPlateShowsTheCamera,
  assertRoundingIsSubPixel,
  loadSubject,
  rampFor,
  layersFor,
} from "./choropleth-machinery.mjs";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
applyStoryboard(beat, HERE);
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "rows", "subject", "named", "callout", "unit", "missingLabel", "format", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("rows must be one { iso, name, value } per country of the study set (see CONTRACT.md)");
if (typeof beat.format !== "function") throw new Error("format must be a function (v) => string");

assertNumbers(beat.rows.filter((r) => r.value !== null).map((r) => [r.iso, r.value]));
const subject = loadSubject(beat, HERE);
const { value, BREAKS, ODD_ONE, named, context, offered, ranked, values, waters, unreported } = subject;
assertLegibleLabels(BREAKS, beat.format);
if (unreported.length && !String(beat.missingLabel).trim())
  throw new Error(`${unreported.map((r) => r.iso).join(", ")} carry no value: missingLabel must name that absence on the key (e.g. "no data")`);

beat.check({
  value: (iso) => value.get(iso)?.value ?? null,
  ranked: ranked.map((r) => ({ iso: r.iso, name: r.label, value: r.value })),
  neighboursOf: (iso) => subject.neighboursOf(iso).filter((n) => value.has(n)),
  anchorOf: subject.anchorOf,
});
assertDrawsClaimColumn(values, HERE);
const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
assertHeadlineNumbersDrawn(titles[0], [...values, ...BREAKS], "classes");

const CALLOUT = { iso: ODD_ONE, forms: [beat.callout].flat().map((f) => [f].flat()) };
const format = beat.format;
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${[...named, ...context].map((iso) => value.get(iso).label).join(" ")} ${BREAKS.map(format).join(" ")} ${beat.unit} ${beat.missingLabel}`,
  annot: `${reading.join(" ")} ${CALLOUT.forms.flat().join(" ")} ${waters.flatMap((w) => w.forms).join(" ")}`,
  value: ranked.map((r) => format(r.value)).join(" "),
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: BREAKS.length + 1 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const PLANS_DIR = await mkdtemp(join(tmpdir(), "choropleth-plans-"));
const plateDir = (id) => join(HERE, "plate", nameAtSize(id, SIZE));
async function ensurePlate(id, { planPath, drawn, water, land }) {
  const dir = plateDir(id);
  if (await plateIsCurrent(dir, { ...drawn, water, land, planPath })) return;
  console.log(`baking the ${id} plate (MapTiler, ${drawn.width}x${drawn.height})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", `${drawn.width}x${drawn.height}`, "--plan", planPath, "--water", water, "--land", land, "--out", dir],
    { cwd: HERE, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status} for ${id} (is MAPTILER_KEY in the environment?)`);
}

const refused = [];
try {
  for (const { label: id, direction: chosenDirection } of chosen) {
    const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
    try {
      const g = mapGeometryFor({ frame: { width: FRAME.width, height: FRAME.height }, aspect: CAMERA_ASPECT, callout: CALLOUT, title: titles, limits, reading, source: beat.source, direction });
      const geometry = { ...g, plate: { x: g.mapX, y: g.mapY, width: g.mapW, height: g.mapH } };
      assertPlateMatchesMarks(geometry);
      const drawn = drawnSizeOf(geometry);
      assertRoundingIsSubPixel(id, drawn);
      const tints = plateTints(direction);
      const ramp = rampFor(direction, subject);
      const placement = placementsFor({
        shapes: subject.shapes,
        geometry: g,
        aspect: CAMERA_ASPECT,
        direction,
        named,
        context,
        waters,
        cellOf: (shape) => {
          if (!shape) return tints.water;
          if (shape.value !== null && shape.value !== undefined) return ramp.classFill(ramp.classOf(shape.value));
          return shape.inStudySet ? ramp.missingFill : ramp.landNoValue;
        },
        inkFor: ramp.inkFor,
        subject: ODD_ONE,
        namesWater: waters.length > 0 && offered.some((t) => t.id === "water-is-a-tint-not-a-grey"),
        waterRequired: false,
        onNote: (note) => console.log(`  ${note}`),
      });
      const plan = makePlan({ style: { name: BAKE.style }, camera: { bounds: BAKE.bounds, drawn }, layers: layersFor(direction, g, placement, subject) });
      const violations = [...validatePlan(plan), ...validateExpressions(plan)];
      if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);
      assertNoDoubledBasemap(plan);
      const planPath = join(PLANS_DIR, `${id}.plan.json`);
      await writeFile(planPath, JSON.stringify(plan));
      await ensurePlate(id, { planPath, drawn, water: tints.water, land: tints.land });
      const baked = JSON.parse(await readFile(join(plateDir(id), "geometry.json"), "utf8"));
      assertPlateShowsTheCamera(id, baked.frameCorners, drawn);

      await renderStill({
        element: createElement(DirectedChoroplethMap, {
          frame: { width: FRAME.width, height: FRAME.height },
          plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
          aspect: CAMERA_ASPECT,
          callout: CALLOUT,
          missingLabel: beat.missingLabel,
          breaks: BREAKS,
          unit: beat.unit,
          title: titles,
          limits,
          reading,
          source: beat.source,
          alt: typeof beat.alt === "function" ? beat.alt(ranked) : beat.alt,
          eyebrow: beat.eyebrow,
          format,
          direction,
          treatments: offered.map((t) => t.id),
          onLadder: (note) => console.log(`  ${note}`),
        }),
        width: FRAME.width,
        height: FRAME.height,
        outDir: OUT,
        name: nameAtSize(id, SIZE),
        scale: FRAME.scale,
      });
      console.log(`rendered renders/${nameAtSize(id, SIZE)}.png`);
    } catch (error) {
      for (const ext of ["png", "svg"]) await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
      refused.push({ id, why: error.message });
      console.log(`REFUSED — ${error.message}`);
    }
  }
} finally {
  await rm(PLANS_DIR, { recursive: true, force: true });
}
if (refused.length) process.exit(1);

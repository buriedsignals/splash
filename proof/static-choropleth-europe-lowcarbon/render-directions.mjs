// twin/proof/static-choropleth-europe-lowcarbon/render-directions.mjs
//
// Europe's low-carbon electricity share in 2024 — forty countries — drawn once per filed direction,
// through the design base. The first `map` beat in this tree, and the last of the harvest's twenty-one
// families to get a directed component.
//
// The shapes are FROZEN beside the beat, projected here rather than at draw time, and every figure
// is computed from the frozen CSV before a mark is drawn. The claim is asserted, INCLUDING the
// geography: Albania's neighbours are derived from the frozen rings, not typed from memory.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-choropleth-europe-lowcarbon/render-directions.mjs

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
} from "#shared/chart-beat/render-still.mjs";
import { readPalette, contrast } from "#shared/chart-beat/colour.mjs";
import { makePlan, validatePlan } from "#shared/map-beat/plan.mjs";
import { drawnSizeOf, assertPlateMatchesMarks } from "#shared/map-beat/geometry.mjs";
import { assertNoDoubledBasemap } from "#shared/map-beat/style.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { plateIsCurrent } from "./plate-cache.mjs";
import { BEAT } from "./bake.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report as reportComposition } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import {
  DirectedChoroplethMap,
  mapGeometryFor,
  placementsFor,
} from "./DirectedChoroplethMap.tsx";
import {
  YEAR,
  CAMERA_ASPECT,
  assertPlateShowsTheCamera,
  assertRoundingIsSubPixel,
  loadSubject,
  copyOf,
  rampFor,
  layersFor,
} from "./beat.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
/** THE PLANS GO TO A TEMP DIRECTORY, not beside the beat. A plan is ~2 MB of study geometry per
 *  direction — it is a bake INPUT, derived in full from the frozen data and shapes on every run, and
 *  committing three copies of the same rings would be committing a build artifact. What is committed
 *  is the plate the bake made from it, and the digest inside that plate's `geometry.json` is what
 *  ties the two together. */
const PLANS_DIR = await mkdtemp(join(tmpdir(), "choropleth-plans-"));
const refused = [];

/** THE SUBJECT AND ITS COPY LADDERS ARE `beat.mjs`'s — the frozen data and shapes, joined, the
 *  claim asserted. Handed the real `console`, loading it prints the report this file always printed. */
const subject = loadSubject({ dir: HERE, console });
const {
  value,
  shapes,
  BREAKS,
  FLOOR,
  ODD_ONE,
  NEIGHBOUR_CEILING,
  offered,
  format,
  one,
  ranked,
  above,
  neighbours,
} = subject;
const {
  title,
  limits,
  reading,
  source,
  callout: CALLOUT,
  waters: WATERS,
  textPerRegister,
  eyebrow: EYEBROW,
} = copyOf(subject);

const plateDir = (id) => join(HERE, "plate", id);
/** THE CACHE IS KEYED ON WHAT THE PLATE IS, NOT ON WHETHER A FILE IS THERE. It used to be existence
 *  alone, and that is a cache that cannot be invalidated: re-tinting the basemap, or baking at
 *  another size, left the old plate in place and the whole change appeared to work while nothing
 *  moved. Every input the bake takes — the drawn size, the tints, the bounds and style `bake.mjs`
 *  itself defaults to, and the PLAN it mounts — is compared against what the plate's own
 *  `geometry.json` recorded, in `plate-cache.mjs` beside this file. */
async function ensurePlate(id, { planPath, drawn, water, land }) {
  const dir = plateDir(id);
  if (await plateIsCurrent(dir, { ...drawn, water, land, planPath })) return;
  console.log(`  baking the ${id} plate (MapTiler, ${drawn.width}x${drawn.height}, water ${water}, land ${land})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", `${drawn.width}x${drawn.height}`, "--plan", planPath,
     "--water", water, "--land", land, "--out", dir],
    { cwd: HERE, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status} for ${id}`);
}
const factsOf = async (id) => JSON.parse(await readFile(join(plateDir(id), "geometry.json"), "utf8"));

/** THE BEAT'S CLAIM, ITS PLANS AND ITS GEOMETRY, PUBLISHED. `above` is the whole headline — the
 *  seven countries over the floor — and it was a local const nothing outside this file could read,
 *  so the one sentence the beat exists for was checkable only by looking at the picture. The plan
 *  and the drawn size go out beside it for the same reason: what a renderer will be handed is now
 *  something a test can hold. */
export const report = { above: above.map((r) => ({ iso: r.iso, lowCarbon: r.lowCarbon })) };
export const plans = {};
export const geometry = {};
/** WHERE EVERY WORD ENDED UP, PER DIRECTION — published so a test can hold the placement to the
 *  owner's own two rules (near its feature, never over another text label) against the run that
 *  actually drew the picture, rather than against a synthetic camera that proves nothing. */
export const placements = {};

/** THE PANEL'S COPY, PUBLISHED — every ladder rung the layout may spend, so a test can put the
 *  SAME words through `mapGeometryFor` in a different face and compare. A test that declared its own
 *  headline would be measuring a beat nobody ships. */
export const copy = {
  title,
  limits,
  reading,
  source,
  callout: CALLOUT,
  aspect: CAMERA_ASPECT,
  textPerRegister,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: BREAKS.length + 1 };
console.log(
  reportComposition(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), {
    beat: BEAT_FACTS,
  }),
);
console.log("");

// ── the plan: what this beat OWNS on the map, and nothing else ──────────────
//
// THE GEOGRAPHY IS MAPTILER'S AND IS NEVER REDRAWN. A layer here marks what belongs to the study —
// a class, a border between two of its own areas, the ringed subject, a word the beat placed. Land
// and coastline are the basemap's, and `assertNoDoubledBasemap` refuses a layer that claims them.
//
// The legend, the headline, the standfirst, the reading line, the source line and the callout's
// sentence live OUTSIDE the map rectangle. They are not layers, and they stay where they are.
//
// In 8a the plan is BUILT and VALIDATED, and nothing renders from it yet: the four guards run
// against the picture the beat already draws, so a plan that could not be rendered is caught before
// anything depends on it.

/** The bounds and the style are `bake.mjs`'s own `BEAT` — the bake's current defaults, not a second
 *  copy typed here and not a value read back off a plate that does not exist yet. The plan is built
 *  BEFORE the bake now, because the bake mounts it.
 *
 *  THE STYLE IS NAMED, NOT FETCHED. A style document is 42 layers and a URL carrying the key; the
 *  plan has to be serialisable, committable and key-free. `bake.mjs` fetches the document from this
 *  name, in the one place that already reads the key, and `transformStyle` rewrites it there. */
const BOUNDS = BEAT.bounds;
const STYLE = { name: BEAT.style };

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);

  console.log(id);
  for (const d of direction.decisions)
    console.log(
      `  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}` +
        (d.refused.length
          ? `   refused: ${d.refused.map((r) => `${r.family} [${r.missing.join(",")}]`).join(", ")}`
          : ""),
    );

  /** WHERE AND HOW LARGE THIS DIRECTION DRAWS ITS MAP — asked of the component's own layout rather
   *  than guessed here, and carrying the plate rectangle beside the map rectangle so the two can be
   *  compared instead of assumed equal. */
  const g = mapGeometryFor({
    aspect: CAMERA_ASPECT,
    callout: CALLOUT,
    title,
    limits,
    reading,
    source,
    direction,
  });
  geometry[id] = { ...g, plate: { x: g.mapX, y: g.mapY, width: g.mapW, height: g.mapH } };
  assertPlateMatchesMarks(geometry[id]);
  const drawn = drawnSizeOf(geometry[id]);
  const off = assertRoundingIsSubPixel(id, drawn);

  /** THE TWO TINTS A BASEMAP IS ALLOWED, AND THEY ARE THE TRUNK'S — `#shared/map-beat/tints.mjs`,
   *  the one definition, called by the bake and by the words that sit in the sea alike. The beat
   *  used to answer the question itself, at a fixed dose of the ACCENT, which put sea against land
   *  at 1.089:1 on creme and 1.158 on nocturne — under the 1.22:1 the trunk measured as the contrast
   *  at which a coastline stops reading as a coastline. */
  const tints = plateTints(direction);
  console.log(
    `  basemap: sea ${tints.water} on land ${tints.land} — ${tints.seaLandContrast.toFixed(3)}:1, ` +
      `${contrast(tints.water, direction.ground).toFixed(3)}:1 against the page`,
  );

  /** WHERE EVERY WORD ACTUALLY GOES — the search, run ONCE, here, and carried into the plan. The
   *  layer used to declare each country's DECLARED ANCHOR while the picture placed six of the seven
   *  names somewhere else entirely, out in open water on a leader. Nothing would have noticed: an
   *  anchor is a perfectly valid coordinate. */
  const placement = placementsFor({
    shapes,
    geometry: g,
    aspect: CAMERA_ASPECT,
    direction,
    named: above.map((r) => r.iso),
    // The other end of the ramp, named in the quiet administrative treatment: a reader gets both
    // ends of the scale by name, and the plate actually draws the three classes of place the
    // treatment claims rather than only two.
    context: ranked.slice(-3).map((r) => r.iso),
    waters: WATERS,
    /** THE COLOUR REALLY UNDER A POINT — the same three-way answer the `classes` layer paints, and
     *  the sea the plate is really baked in for a point that is not on land at all. */
    cellOf: (shape) => {
      const ramp = rampFor(direction, subject);
      if (!shape) return tints.water;
      if (shape.value !== null && shape.value !== undefined)
        return ramp.classFill(ramp.classOf(shape.value));
      return shape.inStudySet ? ramp.missingFill : ramp.landNoValue;
    },
    inkFor: rampFor(direction, subject).inkFor,
    subject: ODD_ONE,
    namesWater: offered.some((t) => t.id === "water-is-a-tint-not-a-grey"),
    onNote: (note) => console.log(`  ${note}`),
  });
  placements[id] = { placement, geometry: geometry[id], registers: placement.registers };

  const plan = makePlan({
    style: STYLE,
    camera: { bounds: BOUNDS, drawn },
    layers: layersFor(direction, g, placement, subject),
  });
  const violations = [...validatePlan(plan), ...validateExpressions(plan)];
  if (violations.length)
    throw new Error(`the plan for ${id} is not renderable:\n  ${violations.join("\n  ")}`);
  assertNoDoubledBasemap(plan);
  plans[id] = plan;
  console.log(
    `  plan: ${plan.layers.length} layers (${plan.layers.map((l) => l.id).join(", ")}) · ` +
      `drawn ${drawn.width} x ${drawn.height} · rounding costs ${off.toFixed(2)}px of camera`,
  );

  /** THE PLATE IS BAKED FROM THE PLAN, AT THE SIZE THE LAYOUT PUBLISHED. The plan goes to disk
   *  because the bake is a separate process — it is the one place that reads the MapTiler key — and
   *  its digest is what `plateIsCurrent` compares, so a plate whose marks have moved cannot survive
   *  as a cache hit. */
  const planPath = join(PLANS_DIR, `${id}.plan.json`);
  await writeFile(planPath, JSON.stringify(plan));
  await ensurePlate(id, { planPath, drawn, water: tints.water, land: tints.land });
  const baked = await factsOf(id);
  assertPlateShowsTheCamera(id, baked.frameCorners, drawn);

  try {
    await renderStill({
      element: createElement(DirectedChoroplethMap, {
        // The plate is inlined as a data URI because the rasteriser has no network and no CWD: a
        // plate referenced by path renders as a blank box and says nothing about it. It is no longer
        // only a basemap — the classes, the borders, the leaders, the ring and every placed word are
        // MapLibre layers inside it, baked at exactly the size the component draws it at.
        plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
        aspect: CAMERA_ASPECT,
        callout: CALLOUT,
        missingLabel: "donnée non rapportée",
        breaks: BREAKS,
        unit: "part bas-carbone de la production",
        title,
        limits,
        reading,
        source,
        alt:
          `Carte choroplèthe de l’Europe : part de l’électricité bas-carbone par pays en ${YEAR}, ` +
          `dans ${value.size} pays. Sept dépassent ${FLOOR} % — ` +
          `${above.map((r) => `${r.label} ${one(r.lowCarbon)} %`).join(", ")} — dont six au nord et ` +
          `à l’ouest du continent ; l’Albanie est la seule exception, et ses ${neighbours.length} ` +
          `voisins sont tous sous ${NEIGHBOUR_CEILING} %. L’est et le sud-est du continent sont dans ` +
          `les classes basses. L’Ukraine est en gris : sa production ${YEAR} n’est pas rapportée.`,
        eyebrow: EYEBROW,
        format,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
      // The beat pins `landscape` (1920 x 1080); 960 x 540 at scale 2 delivers exactly that.
      width: 960,
      height: 540,
      outDir: OUT,
      name: id,
      scale: 2,
    });
    console.log(`  -> renders/${id}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${id}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}

if (refused.length)
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);

// Europe measured from the sea, rendered once per FILED DIRECTION into a self-contained scrolly page. The
// `contour / isoline` type in the scrolly format.
//
// THE SUBJECT OF `static-contour-europe-distance`, CHOREOGRAPHED. The field, the study area, the claim and its
// assertions are the static beat's own (`contour-field.mjs` recomputes them and this runner checks the
// numbers); the scroll tells them with its own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. the land, bare;
//   2. a fill sweeps inland from every coast to 100 km, the line left behind, the share counted;
//   3. to the median: half the land, its line in the accent;
//   4. to 400 km: 89 %, two islands left;
//   5. the camera closes onto the last point, which the sweep reaches at 682 km, in Belarus;
//   6. the fill withdraws: every line with its number, the plate's reading line.
//
// Usage:  bun proof/scrolly-contour-europe-distance/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { CELL_KM, contourField } from "./contour-field.mjs";
import { DirectedContourScrolly } from "./DirectedContourScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Géographie · Europe";
const NB = "\u00A0";
/** The static beat's window, identical to the sibling map beats. */
const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const FRAME_WIDTH = 1000;
const NAMES = { BLR: "Biélorussie", UKR: "Ukraine", HUN: "Hongrie", SVK: "Slovaquie", POL: "Pologne", CZE: "Tchéquie", ROU: "Roumanie" };
const ISLAND_WORDS = { 1: "un seul îlot", 2: "deux îlots", 3: "trois îlots" };

// ── the field, and the static beat's own assertions ────────────────────────────────────────────
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const countries = (await readFile(join(HERE, "countries.csv"), "utf8")).trim().split(/\r?\n/);
/** Russia is not measured: the frame cuts its territory, and a distance to a coastline that stops at the
 *  edge of the paper is not a distance. */
const study = new Set(countries.slice(1).map((l) => l.split(",")[1]).filter((c) => c && c !== "RUS"));
const probe = contourField(geo, { study, window: WINDOW, width: FRAME_WIDTH, levels: [] });
if (probe.studyCount < 30) throw new Error(`the study area names ${study.size} countries and the basemap carries ${probe.studyCount}`);
if (!(probe.median < 200)) throw new Error(`the headline says half of Europe is within 200 km of the sea; the median is ${probe.median.toFixed(0)} km`);
if (!(probe.deepest < 1000)) throw new Error(`the headline says no point is 1 000 km from the sea; the farthest is ${probe.deepest.toFixed(0)} km`);
if (!probe.deepestIso || !NAMES[probe.deepestIso]) throw new Error(`the farthest point falls in ${probe.deepestIso}, which has no French name filed here`);

const MEDIAN = Math.round(probe.median);
const LEVELS = [100, MEDIAN, 200, 300, 400, 500];
const field = contourField(geo, { study, window: WINDOW, width: FRAME_WIDTH, levels: LEVELS });
for (const { level, d } of field.lines) if (d.length < 40) throw new Error(`the ${level} km isoline came out of the field as loose points, not as a line`);
const pct = (km) => Math.round(field.within[km]);
if (pct(MEDIAN) !== 50) throw new Error(`a card says ${MEDIAN} km holds half the land; it holds ${field.within[MEDIAN]} %`);
const islands = field.islandsBeyond(400).filter((p) => p.cells >= 10);
if (!ISLAND_WORDS[islands.length]) throw new Error(`a card counts the islands left beyond 400 km; there are ${islands.length}`);
const LAST_LAND = 600;
const summitPiece = field.islandsBeyond(LAST_LAND).find((p) => p.holdsSummit);
if (!summitPiece) throw new Error(`the farthest point is not inside the land beyond ${LAST_LAND} km`);

/** The close-up: CENTRED ON THE SUMMIT, reaching past every side of the last land beyond 600 km, and never
 *  closer than 90 units (about 570 km) each way, so the Baltic and the Black Sea the distance is measured from
 *  stay in the frame. `fitViewBox` keeps the centre when it widens the view to the stage. */
const [sx, sy] = field.summit;
const MIN_REACH = 90;
const reachX = Math.max(MIN_REACH, Math.max(sx - summitPiece.box.x0, summitPiece.box.x1 - sx) * 1.5);
const reachY = Math.max(MIN_REACH, Math.max(sy - summitPiece.box.y0, summitPiece.box.y1 - sy) * 1.5);
const aspect = field.width / field.height;
let zw = reachX * 2;
let zh = reachY * 2;
if (zw / zh < aspect) zw = zh * aspect;
else zh = zw / aspect;
const zoomBox = { x: sx - zw / 2, y: sy - zh / 2, w: zw, h: zh };
if (zoomBox.x < -400 || zoomBox.y < -250 || zoomBox.x + zoomBox.w > field.width + 400 || zoomBox.y + zoomBox.h > field.height + 250)
  throw new Error("the close-up reaches past the margin the land is drawn in");

const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const deepestName = NAMES[field.deepestIso];
console.log(
  `${field.studyCount} pays · médiane ${field.median.toFixed(1)} km · le plus continental ${field.deepest.toFixed(1)} km (${field.deepestIso}) · ` +
    `${pct(100)} % à 100 km · ${pct(400)} % à 400 km · ${islands.length} îlots au-delà de 400 km · raster ${field.raster.cols} x ${field.raster.rows}, ${(field.raster.data.length / 1024).toFixed(0)} Ko\n`,
);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `La moitié de l’Europe est à moins de ${n0(field.median)}${NB}km de la mer, et aucun point à plus de ${n0(field.deepest)}${NB}km`,
  `La moitié de l’Europe est à moins de ${n0(field.median)}${NB}km de la mer`,
  `L’Europe, mesurée depuis la mer`,
];
const prose = [
  [`Chaque point des terres est à une certaine distance de la mer. Elle est mesurée ici à vol d’oiseau, sur une grille de ${CELL_KM}${NB}km, dans les ${field.studyCount} pays du cadre.`],
  [`Partons de toutes les côtes à la fois. À 100${NB}km à l’intérieur des terres, ${pct(100)}${NB}% de l’Europe est déjà couverte.`],
  [`À ${MEDIAN}${NB}km, la moitié : la moitié des terres européennes est plus près de la mer que cela.`],
  [`À 400${NB}km, ${pct(400)}${NB}%. Il ne reste que ${ISLAND_WORDS[islands.length]} loin de toute mer.`],
  [`Le dernier point atteint est en ${deepestName}, à ${n0(field.deepest)}${NB}km de la mer : le plus continental des ${field.studyCount} pays mesurés.`],
  [`Lecture : entre deux lignes, la distance varie continûment — cette carte ne compte rien, elle mesure partout. Les lignes se resserrent là où la côte avance : le long des mers intérieures.`],
];
const levels = LEVELS.map((level) => ({ level, label: `${level}${NB}km` }));
const count = `{p}${NB}% des terres à moins de {km}${NB}km`;
const unit = "distance à la mer, en kilomètres";
const outsideLabel = "terres hors mesure, dont la Russie, que le cadre coupe";
const source = `Contours Natural Earth 50 m · champ mesuré sur une grille de ${CELL_KM}${NB}km en projection équivalente (LAEA)`;
const alt =
  `Carte de l’Europe en courbes de niveau : chaque ligne joint les points situés à la même distance de la mer et porte ` +
  `sa valeur en kilomètres. Les lignes forment des anneaux emboîtés autour d’un centre continental situé en ${deepestName}. ` +
  `La moitié des terres est à moins de ${n0(field.median)} km de la mer et aucun point à plus de ${n0(field.deepest)} km.`;

const LAST = Math.ceil(field.deepest) + 6;
/** One state per card; see `contour-drive.mjs` for what each field paints. */
const STATES = [
  { level: 0, tint: 1, median: 0, zoom: 0, summit: 0 },
  { level: 100, tint: 1, median: 0, zoom: 0, summit: 0 },
  { level: MEDIAN, tint: 1, median: 1, zoom: 0, summit: 0 },
  { level: 400, tint: 1, median: 1, zoom: 0, summit: 0 },
  { level: LAST, tint: 1, median: 1, zoom: 1, summit: 1 },
  { level: LAST, tint: 0, median: 1, zoom: 0, summit: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${levels.map((l) => l.label).join(" ")} ${unit} ${outsideLabel}`,
  annot: "",
  value: `${count} ${n0(field.deepest)} km 0123456789`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "contour-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["terres", "cent-km", "moitie", "quatre-cents", "dernier-point", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedContourScrolly, {
          field,
          levels,
          medianLevel: MEDIAN,
          zoomBox,
          count,
          unit,
          outsideLabel,
          alt,
          regs,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
        }),
        states: STATES,
        driver,
        apply: "applyContourState",
      },
      title,
      eyebrow: EYEBROW,
      source,
      ground: direction.ground,
      type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
      lang: "fr",
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
  } catch (error) {
    await rm(join(OUT, `${id}.html`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}

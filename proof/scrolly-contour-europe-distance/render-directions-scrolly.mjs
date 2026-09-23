// Europe measured from the sea, rendered once per FILED DIRECTION into a self-contained scrolly page. The
// `contour / isoline` type in the scrolly format, on a live MapTiler map (addendum 2026-09-15), matching the
// validated video beat's own visual treatment (`proof/video-contour-europe-distance`, `quality/video`, owner
// 2026-09-15: « comme dans la vidéo »).
//
// THE SUBJECT OF `static-contour-europe-distance`, CHOREOGRAPHED. The field, the study area, the claim and its
// assertions are the static beat's own (`contour-field.mjs` recomputes them and this runner checks the
// numbers); the scroll tells them with its own gestures:
//
//   1. the land, bare;
//   2. a fill sweeps inland from every coast to 100 km, the line left behind, the share counted;
//   3. to the median: half the land, its line in the accent;
//   4. to 400 km: 89 %, two islands left;
//   5. the camera closes onto the last point, which the sweep reaches at 682 km, in Belarus;
//   6. the fill withdraws: every line with its number, the plate's reading line.
//
// Usage:  set -a && . ./.env && set +a && bun proof/scrolly-contour-europe-distance/render-directions-scrolly.mjs [--only creme] [--no-bake]

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, readPalette, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { cameraFields, mercatorOf, lonLatOf, validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { SEA_LAND_MIN } from "#shared/map-beat/tints.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { openLiveMapCards, renderWithCardImages } from "../../skills/scrolly/scripts/live-map-cards-bake.mjs";
import { CELL_KM, contourField } from "./contour-field.mjs";
import { bestSeatOf, contourMapPlan, lonLatOfFrame, sweepOf } from "./plan.mjs";
import { DirectedContourScrolly } from "./DirectedContourScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FALLBACK = join(HERE, "fallback");
const EYEBROW = "Géographie · Europe";
const NB = " ";
const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const FRAME_WIDTH = 1000;
const NAMES = { BLR: "Biélorussie", UKR: "Ukraine", HUN: "Hongrie", SVK: "Slovaquie", POL: "Pologne", CZE: "Tchéquie", ROU: "Roumanie" };
const ISLAND_WORDS = { 1: "un seul îlot", 2: "deux îlots", 3: "trois îlots" };
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

// ── the field, and the static beat's own assertions (unchanged) ─────────────────────────────────
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const countries = (await readFile(join(HERE, "countries.csv"), "utf8")).trim().split(/\r?\n/);
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
/** The raster, raw: one byte per 6 km cell, `1 + distance / stepKm` over the study land, 0 elsewhere. */
const rasterBytes = gunzipSync(Buffer.from(field.raster.data, "base64"));

// ── the whole-map camera: the study window, padded ───────────────────────────────────────────────
const winPts = [[WINDOW.west, WINDOW.south], [WINDOW.east, WINDOW.south], [WINDOW.east, WINDOW.north], [WINDOW.west, WINDOW.north]].map(mercatorOf);
const PAD = 0.04;
const wx0raw = Math.min(...winPts.map((p) => p[0]));
const wx1raw = Math.max(...winPts.map((p) => p[0]));
const wy0raw = Math.min(...winPts.map((p) => p[1]));
const wy1raw = Math.max(...winPts.map((p) => p[1]));
const wpx = (wx1raw - wx0raw) * PAD;
const wpy = (wy1raw - wy0raw) * PAD;
const [wx0, wx1, wy0, wy1] = [wx0raw - wpx, wx1raw + wpx, wy0raw - wpy, wy1raw + wpy];
const REFERENCE = { width: 1280, height: Math.round((1280 * (wy1 - wy0)) / (wx1 - wx0)) };
const WHOLE_ZOOM = Math.log2(REFERENCE.width / ((wx1 - wx0) * 512));
const WHOLE_CENTER = lonLatOf([(wx0 + wx1) / 2, (wy0 + wy1) / 2]);
const whole = cameraFields({ center: WHOLE_CENTER, zoom: WHOLE_ZOOM });

// ── the close-up camera: the last land beyond 600 km, centred on the summit both ways ────────────
const [sx, sy] = field.summit;
const MIN_REACH = 90;
const reachX = Math.max(MIN_REACH, Math.max(sx - summitPiece.box.x0, summitPiece.box.x1 - sx) * 1.5);
const reachY = Math.max(MIN_REACH, Math.max(sy - summitPiece.box.y0, summitPiece.box.y1 - sy) * 1.5);
const zoomBox = { x0: sx - reachX, x1: sx + reachX, y0: sy - reachY, y1: sy + reachY };
const closeCorners = [
  [zoomBox.x0, zoomBox.y0], [zoomBox.x1, zoomBox.y0], [zoomBox.x1, zoomBox.y1], [zoomBox.x0, zoomBox.y1],
  [(zoomBox.x0 + zoomBox.x1) / 2, zoomBox.y0], [(zoomBox.x0 + zoomBox.x1) / 2, zoomBox.y1],
  [zoomBox.x0, (zoomBox.y0 + zoomBox.y1) / 2], [zoomBox.x1, (zoomBox.y0 + zoomBox.y1) / 2],
].map((p) => mercatorOf(lonLatOfFrame(field, p)));
const cx0 = Math.min(...closeCorners.map((p) => p[0]));
const cx1 = Math.max(...closeCorners.map((p) => p[0]));
const cy0 = Math.min(...closeCorners.map((p) => p[1]));
const cy1 = Math.max(...closeCorners.map((p) => p[1]));
const CLOSE_ZOOM = Math.log2(Math.min(REFERENCE.width / ((cx1 - cx0) * 1.15 * 512), REFERENCE.height / ((cy1 - cy0) * 1.15 * 512)));
const CLOSE_CENTER = lonLatOf([(cx0 + cx1) / 2, (cy0 + cy1) / 2]);
const close = cameraFields({ center: CLOSE_CENTER, zoom: CLOSE_ZOOM });

const cameras = [whole, whole, whole, whole, close, whole];

const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const deepestName = NAMES[field.deepestIso];
console.log(
  `${field.studyCount} pays · médiane ${field.median.toFixed(1)} km · le plus continental ${field.deepest.toFixed(1)} km (${field.deepestIso}) · ` +
    `${pct(100)} % à 100 km · ${pct(400)} % à 400 km · ${islands.length} îlots au-delà de 400 km\n`,
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
const source = `Contours Natural Earth 50 m · champ mesuré sur une grille de ${CELL_KM}${NB}km en projection équivalente (LAEA) · fond de carte © MapTiler © OpenStreetMap`;
const alt =
  `Carte de l’Europe en courbes de niveau : chaque ligne joint les points situés à la même distance de la mer et porte ` +
  `sa valeur en kilomètres. Les lignes forment des anneaux emboîtés autour d’un centre continental situé en ${deepestName}. ` +
  `La moitié des terres est à moins de ${n0(field.median)} km de la mer et aucun point à plus de ${n0(field.deepest)} km.`;

const LAST = Math.ceil(field.deepest) + 6;
/** One state per card; see `contour-drive.mjs` for what each field paints. */
const STATES = [
  { level: 0, tint: 1, median: 0, summit: 0 },
  { level: 100, tint: 1, median: 0, summit: 0 },
  { level: MEDIAN, tint: 1, median: 1, summit: 0 },
  { level: 400, tint: 1, median: 1, summit: 0 },
  { level: LAST, tint: 1, median: 1, summit: 1 },
  { level: LAST, tint: 0, median: 1, summit: 1 },
].map((state, k) => ({ ...state, ...cameras[k], card: k }));

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
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

// ── the live map: its key, its faces, its frozen cards ─────────────────────────────────────────
const cards = await openLiveMapCards();
const driver = `${cards.mapScript}\n${await readFile(join(HERE, "contour-drive.mjs"), "utf8")}`;
const refused = [];
try {
  for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
    const id = file.replace(/\.md$/, "");
    if (ONLY && id !== ONLY) continue;
    const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
    const { ink, muted } = deriveFurniture(direction.ground);
    const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
    try {
      const ground = direction.ground;
      const accent = direction.accent;
      // The static plate's own colour scheme (`DirectedContourScrolly.tsx`, unchanged): land a step off the
      // sea, the land outside the measurement half that step, the sweep a tint of the accent over the land.
      let dose = 0.085;
      while (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN && dose < 0.4) dose += 0.005;
      if (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN) throw new Error(`no step of the ink separates land from sea by ${SEA_LAND_MIN}:1 on ${ground}`);
      const land = mix(ground, ink, dose);
      const outside = mix(ground, ink, dose / 2);
      const tint = mix(land, accent, 0.22);
      const floorOn = (colour, floor, what) => {
        let c = colour;
        for (const bg of [land, tint]) {
          if (contrast(c, bg) >= floor) continue;
          const lifted = adjustToContrast(c, bg, floor);
          if (!lifted) throw new Error(`${what} cannot be told from ${bg}: nothing between it and the direction's poles clears ${floor}:1`);
          c = lifted;
        }
        for (const bg of [land, tint]) if (contrast(c, bg) < floor) throw new Error(`${what} clears ${floor}:1 on one of the land and the fill, not on both`);
        return c;
      };
      const plain = LEVELS.filter((l) => l !== MEDIAN);
      const lineInk = new Map(
        LEVELS.map((l) => [
          l,
          l === MEDIAN
            ? floorOn(accent, NON_TEXT_CONTRAST_MIN, "the median line")
            : floorOn(mix(mix(ground, ink, 0.35), accent, plain.length > 1 ? plain.indexOf(l) / (plain.length - 1) : 1), NON_TEXT_CONTRAST_MIN, `the ${l} km line`),
        ]),
      );
      const textInk = floorOn(ink, TEXT_CONTRAST_MIN, "a line's number");
      const accentText = floorOn(accent, TEXT_CONTRAST_MIN, "the median's number");
      const rim = floorOn(accent, NON_TEXT_CONTRAST_MIN, "the sweep's front");
      const colours = { ground, land, outside, tint, rim, lines: Object.fromEntries(lineInk), text: { median: accentText, plain: textInk } };

      const face = await cards.faceOf(regs.axis, "axis");
      const axisPx = Number.parseFloat(String(regs.axis.fontSize));
      const strokes = { line: (direction.stroke?.hairline ?? 0.6) * 1.4, median: (direction.stroke?.rule ?? 1) * 1.8, dot: 3.2, rule: direction.stroke?.hairline ?? 0.6, axisPx, face };

      // The numbers: one static seat per level, the best against every other level at once (`bestSeatOf`).
      const numberSeats = {};
      for (let li = 0; li < LEVELS.length; li++) {
        const L = LEVELS[li];
        const seat = bestSeatOf(field, li, 1);
        if (!seat) throw new Error(`the ${L} km line has no seat clear enough for its number`);
        numberSeats[L] = { lonLat: lonLatOfFrame(field, [seat[0], seat[1]]), text: String(L) };
      }
      const summitSeat = { seat: lonLatOfFrame(field, field.summit), text: n0(field.deepest), offset: 10 };

      // The sweep, resampled onto a Web Mercator grid at the whole camera and gzipped for the page.
      const sweepRaw = sweepOf(field, rasterBytes, whole, REFERENCE.width);
      const sweep = { cols: sweepRaw.cols, rows: sweepRaw.rows, stepKm: sweepRaw.stepKm, coordinates: sweepRaw.coordinates, bytes: gzipSync(Buffer.from(sweepRaw.bytes), { level: 9 }).toString("base64") };

      const plan = contourMapPlan({
        field,
        study: [...study],
        levels: LEVELS,
        medianLevel: MEDIAN,
        colours,
        strokes,
        cameras,
        statesForCards: STATES,
        referenceWidth: REFERENCE.width,
        referenceHeight: REFERENCE.height,
        numberSeats,
        summit: summitSeat,
      });
      const violations = [...validateScrollyPlan(plan, STATES), ...validateExpressions(plan)];
      if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

      const renderPage = (fallbacks, shapes) =>
        renderScrolly({
          steps: prose.map((p, i) => ({ id: ["terres", "cent-km", "moitie", "quatre-cents", "dernier-point", "lecture"][i], prose: p })),
          reveal: {
            element: createElement(DirectedContourScrolly, {
              plan: { ...plan, fallback: shapes },
              fallbacks,
              reference: REFERENCE,
              sweep,
              within: field.within,
              deepest: field.deepest,
              colours: { tint: colours.tint, rim: colours.rim },
              count,
              unit,
              outsideLabel,
              levels,
              alt,
              regs,
              ground,
              accent,
              ink,
              muted,
            }),
            states: STATES,
            driver,
            apply: "applyContourState",
          },
          vendor: [{ js: cards.maplibreJs, css: cards.maplibreCss }],
          title,
          eyebrow: EYEBROW,
          source,
          ground,
          type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
          lang: "fr",
          outDir: OUT,
          name: `${id}.html`,
        });

      const { outPath } = await renderWithCardImages(cards, {
        id,
        plan,
        states: STATES,
        fallbackDir: FALLBACK,
        stageGround: ground,
        cardOf: (baked) => ({ zoom: baked.zoom }),
        renderPage,
        noBake: process.argv.includes("--no-bake"),
      });
      console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
    } catch (error) {
      await rm(join(OUT, `${id}.html`), { force: true });
      refused.push({ id, why: error.message });
      console.log(`${id} REFUSED — ${error.message}`);
    }
  }
} finally {
  await cards.close();
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}

// Ukrainians under temporary protection in Europe, rendered once per FILED DIRECTION into a self-contained
// scrolly page. The `flow map` type in the scrolly format, on a live MapTiler map (addendum 2026-09-15),
// matching the validated video beat's own visual treatment (`proof/video-flow-map-ukraine-protection`,
// `quality/video`, owner 2026-09-15: « comme dans la vidéo »).
//
// THE SUBJECT OF `static-flow-map-ukraine-protection`, CHOREOGRAPHED. The flows, the claim and its assertions, the
// ten drawn bands and the camera fitted to them are the static beat's own; the scroll tells them with its own
// gestures:
//
//   1. Ukraine alone, the total;
//   2. the first band traced, to Germany;
//   3. the second, to Poland: half;
//   4. the eight next, one after another: 81 %;
//   5. the 21 countries too small for a band, a dot each;
//   6. the reading line, the key, the two largest named.
//
// Usage:  set -a && . ./.env && set +a && bun proof/scrolly-flow-map-ukraine-protection/render-directions-scrolly.mjs [--only creme] [--no-bake]

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { cameraFields, mercatorOf, lonLatOf, validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { openLiveMapCards, renderWithCardImages } from "../../skills/scrolly/scripts/live-map-cards-bake.mjs";
import { flowMapPlan } from "./plan.mjs";
import { DirectedFlowMapScrolly } from "./DirectedFlowMapScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FALLBACK = join(HERE, "fallback");
const EYEBROW = "Migrations · Europe";
const NB = " ";
const ORIGIN = "UKR";
const SUBJECT = "DEU";
/** The static beat's rule: bands to the ten largest hosts, the camera fitted to them. */
const DRAWN = 10;
const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const NAMES = {
  DEU: ["Allemagne", "l’Allemagne"], POL: ["Pologne", "la Pologne"], CZE: ["Tchéquie", "la Tchéquie"], ESP: ["Espagne", "l’Espagne"],
  ROU: ["Roumanie", "la Roumanie"], SVK: ["Slovaquie", "la Slovaquie"], NLD: ["Pays-Bas", "les Pays-Bas"], IRL: ["Irlande", "l’Irlande"],
  BEL: ["Belgique", "la Belgique"], AUT: ["Autriche", "l’Autriche"], NOR: ["Norvège"], BGR: ["Bulgarie"], CHE: ["Suisse"], FIN: ["Finlande"],
  PRT: ["Portugal"], FRA: ["France"], DNK: ["Danemark"], LTU: ["Lituanie"], HUN: ["Hongrie"], SWE: ["Suède"], GRC: ["Grèce"], ITA: ["Italie"],
  LVA: ["Lettonie"], EST: ["Estonie"], HRV: ["Croatie"], CYP: ["Chypre"], SVN: ["Slovénie"], ISL: ["Islande"], LUX: ["Luxembourg"],
  MLT: ["Malte"], LIE: ["Liechtenstein"],
};
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

// ── the flows, and the static beat's own assertions (unchanged) ─────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const flows = csv.slice(1).map((l) => {
  const c = l.split(",");
  return { code: c[at("code")], month: c[at("month")], people: Number(c[at("people")]) };
});
for (const f of flows) {
  if (!NAMES[f.code]) throw new Error(`${f.code} has no French name filed in this beat`);
  if (!Number.isFinite(f.people) || f.people <= 0) throw new Error(`a flow has no usable count: ${JSON.stringify(f)}`);
}
const month = flows[0].month;
if (flows.some((f) => f.month !== month)) throw new Error("the plate draws one month and the file holds more than one");
const total = flows.reduce((s, f) => s + f.people, 0);
const ranked = [...flows].sort((a, b) => b.people - a.people);
const topTwoShare = ((ranked[0].people + ranked[1].people) / total) * 100;
if (ranked[0].code !== SUBJECT) throw new Error(`the subject is the largest host; that is ${ranked[0].code}`);
if (!(topTwoShare > 45 && topTwoShare < 55)) throw new Error(`the headline says the two largest hosts take about half; they take ${topTwoShare.toFixed(1)} %`);
if (!(total > 4e6)) throw new Error(`the headline says over four million; the file totals ${total}`);
for (const f of ranked.slice(0, DRAWN)) if (NAMES[f.code].length < 2) throw new Error(`${f.code} has a band and no article filed for the cards`);
const drawn = ranked.slice(0, DRAWN);
const drawnShare = (drawn.reduce((s, f) => s + f.people, 0) / total) * 100;
const rest = ranked.slice(DRAWN);

// ── every country's seat, in lon/lat: the mean of its vertices inside the window, in Web Mercator ──
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
function seatsOf(win) {
  const sums = {};
  for (const f of geo.features)
    for (const [lon, lat] of f.geometry.coordinates.flat(2)) {
      if (!(lon >= win.west && lon <= win.east && lat >= win.south && lat <= win.north)) continue;
      const [x, y] = mercatorOf([lon, lat]);
      const s = (sums[f.properties.iso] ??= { x: 0, y: 0, n: 0 });
      s.x += x;
      s.y += y;
      s.n++;
    }
  return Object.fromEntries(Object.entries(sums).map(([iso, s]) => [iso, lonLatOf([s.x / s.n, s.y / s.n])]));
}
const seats = seatsOf(WINDOW);
for (const f of flows) if (!seats[f.code]) throw new Error(`${f.code} has no seat inside the frame`);
const origin = seats[ORIGIN];
if (!origin) throw new Error(`the origin ${ORIGIN} has no seat inside the frame`);

// ── the camera: the origin and the drawn hosts' seats, padded — the static beat's own box, fitted to a ─────────
// ── reference stage wide enough for the fan's host names (a symmetric pad; there is no side key column here) ───
const FOCUS_PAD_X = 0.32;
const FOCUS_PAD_Y = 0.26;
const pts = [origin, ...drawn.map((f) => seats[f.code])].map(mercatorOf);
const bx0 = Math.min(...pts.map((p) => p[0]));
const bx1 = Math.max(...pts.map((p) => p[0]));
const by0 = Math.min(...pts.map((p) => p[1]));
const by1 = Math.max(...pts.map((p) => p[1]));
const padX = (bx1 - bx0) * FOCUS_PAD_X;
const padY = (by1 - by0) * FOCUS_PAD_Y;
const [fx0, fx1, fy0, fy1] = [bx0 - padX, bx1 + padX, by0 - padY, by1 + padY];
const REFERENCE = { width: 1280, height: Math.round((1280 * (fy1 - fy0)) / (fx1 - fx0)) };
const ZOOM = Math.log2(REFERENCE.width / ((fx1 - fx0) * 512));
const CENTER = lonLatOf([(fx0 + fx1) / 2, (fy0 + fy1) / 2]);
// The fan sits in the upper part of the stage on a phone (a stage taller than the reference), above the resting card.
const camera = cameraFields({ center: CENTER, zoom: ZOOM, alignY: -1 });
const cameras = Array.from({ length: 6 }, () => camera);

/** Stage px at the fixed camera, centred on `REFERENCE` — the frame the arcs are sampled and their cumulative
 *  length measured in, ported from the validated video beat's `map-plan.mjs`. */
const worldPx = 512 * 2 ** camera.camZoom;
const project = (lonLat) => {
  const [x, y] = mercatorOf(lonLat);
  return [REFERENCE.width / 2 + (x - camera.camX) * worldPx, REFERENCE.height / 2 + (y - camera.camY) * worldPx];
};
const unproject = ([x, y]) => lonLatOf([camera.camX + (x - REFERENCE.width / 2) / worldPx, camera.camY + (y - REFERENCE.height / 2) / worldPx]);

// ── the bands: each a bow away from the fan's mean bearing, sampled in stage px, taken back to lon/lat ─────────
const WIDEST = 18;
const BAND_FLOOR = 2;
const NODE_R = 9;
const DOT_R = 3.2;
const OTHERS_R = 2.4;
const originPx = project(origin);
const topTwo = new Set([ranked[0].code, ranked[1].code]);
const mean = drawn.reduce((acc, f) => {
  const [x, y] = project(seats[f.code]);
  const len = Math.hypot(x - originPx[0], y - originPx[1]);
  return [acc[0] + (x - originPx[0]) / len, acc[1] + (y - originPx[1]) / len];
}, [0, 0]);
const maxPeople = drawn[0].people;
const widthOfPeople = (people) => Math.max(BAND_FLOOR, (WIDEST * people) / maxPeople);
const bandsGeo = drawn.map((f) => {
  const [sx, sy] = project(seats[f.code]);
  const dx = sx - originPx[0];
  const dy = sy - originPx[1];
  const len = Math.hypot(dx, dy);
  const side = Math.sign(mean[0] * dy - mean[1] * dx) || 1;
  const bow = len * 0.14 * side;
  const control = [(originPx[0] + sx) / 2 - (dy / len) * bow, (originPx[1] + sy) / 2 + (dx / len) * bow];
  const quad = (t) => [(1 - t) ** 2 * originPx[0] + 2 * (1 - t) * t * control[0] + t * t * sx, (1 - t) ** 2 * originPx[1] + 2 * (1 - t) * t * control[1] + t * t * sy];
  const samples = Array.from({ length: 41 }, (_, i) => quad(i / 40));
  const cumulative = [0];
  for (let i = 1; i < samples.length; i++) cumulative.push(cumulative[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
  return {
    code: f.code,
    name: NAMES[f.code][0],
    people: f.people,
    top: topTwo.has(f.code),
    width: Math.round(widthOfPeople(f.people) * 10) / 10,
    coordinates: samples.map(unproject),
    cumulative: cumulative.map((v) => Math.round(v * 100) / 100),
    seatLonLat: seats[f.code],
  };
});

const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const [first, second] = drawn;
console.log(`${flows.length} pays · total ${total} · ${first.code}+${second.code} ${topTwoShare.toFixed(1)} % · ${DRAWN} rubans ${drawnShare.toFixed(1)} %\n`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `${one(total / 1e6)} millions d’Ukrainiens sous protection temporaire — l’Allemagne et la Pologne en accueillent la moitié`,
  `${one(total / 1e6)} millions d’Ukrainiens sous protection temporaire en Europe`,
  `La protection temporaire, pays par pays`,
];
const [year, mm] = month.split("-");
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const when = `${MONTHS[Number(mm) - 1]} ${year}`;
const prose = [
  [`En ${when}, ${n0(total)} Ukrainiens bénéficient de la protection temporaire dans ${flows.length} pays européens.`],
  [`Un ruban par pays d’accueil ; sa largeur est le nombre de personnes. Le plus large va en ${NAMES[first.code][0]} : ${n0(first.people)} personnes, ${one((first.people / total) * 100)}${NB}%.`],
  [`Le deuxième, en ${NAMES[second.code][0]} : ${n0(second.people)}. À elles deux, ${one(topTwoShare)}${NB}% : la moitié.`],
  [`Les huit pays suivants, de ${NAMES[drawn[2].code][1]} à ${NAMES[drawn[DRAWN - 1].code][1]}. Les ${DRAWN} rubans portent ${Math.round(drawnShare)}${NB}% des personnes.`],
  [`Les ${rest.length} autres pays en accueillent ${Math.round(100 - drawnShare)}${NB}% : un point chacun, trop peu pour un ruban.`],
  [`Lecture : les rubans ne sont pas des itinéraires, personne n’a suivi ces courbes. Seule leur largeur est une mesure.`],
];
const source = `Source : Eurostat, bénéficiaires de la protection temporaire (migr_asytpsm), ${month} · fond de carte © MapTiler © OpenStreetMap`;
const words = {
  unit: `personnes sous protection temporaire, ${when}`,
  totalNote: `${n0(total)} personnes`,
  count: `{p}${NB}% des ${n0(total)} personnes`,
  othersNote: `${rest.length} autres pays${NB}: ${Math.round(100 - drawnShare)}${NB}%`,
  drawnNote: `${DRAWN} rubans, ${Math.round(drawnShare)}${NB}% des personnes`,
  othersKey: `${rest.length} autres pays, trop petits pour un ruban`,
};
const alt =
  `Carte des flux : un ruban part de l’Ukraine vers chacun des ${DRAWN} principaux pays d’accueil, sa largeur étant le nombre de personnes ` +
  `sous protection temporaire en ${when}. ${n0(total)} personnes au total ; l’Allemagne et la Pologne en accueillent ${one(topTwoShare)} %, ` +
  `les ${DRAWN} rubans ${Math.round(drawnShare)} %.`;

/** One state per card; see `flow-drive.mjs` for what each field paints. */
const STATES = [
  { bands: 0, others: 0, pair: 0, key: 0 },
  { bands: 1, others: 0, pair: 0, key: 0 },
  { bands: 2, others: 0, pair: 1, key: 0 },
  { bands: DRAWN, others: 0, pair: 0, key: 0 },
  { bands: DRAWN, others: 1, pair: 0, key: 0 },
  { bands: DRAWN, others: 1, pair: 1, key: 1 },
].map((state, k) => ({ ...state, ...camera, card: k }));

const otherPts = rest.map((f) => seats[f.code]).filter(Boolean);
const keySizes = [1e6, 1e5].map((people) => ({ people, label: `${n0(people)} personnes`, px: widthOfPeople(people) }));

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${bandsGeo.map((b) => b.name).join(" ")} ${words.drawnNote} ${words.othersKey} ${keySizes.map((k) => k.label).join(" ")}`,
  annot: "",
  value: `${words.totalNote} ${words.count} ${words.othersNote} Ukraine 0123456789,`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

// ── the live map: its key, its faces, its frozen cards ─────────────────────────────────────────
const cards = await openLiveMapCards();
const driver = `${cards.mapScript}\n${await readFile(join(HERE, "flow-drive.mjs"), "utf8")}`;
const refused = [];
try {
  for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
    const id = file.replace(/\.md$/, "");
    if (ONLY && id !== ONLY) continue;
    const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
    const { ink, muted } = deriveFurniture(direction.ground);
    const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
    try {
      const tints = plateTints(direction);
      // A band crosses both land and sea, so its colour is walked to clear both — the validated video's own
      // formula: an ordinary band the accent, the top two mixed 35 % toward the ink, one hue family.
      const onBoth = (c, floor, what) => {
        for (const on of [tints.land, tints.water]) {
          const w = adjustToContrast(c, on, floor);
          if (w && contrast(w, tints.land) >= floor - 1e-9 && contrast(w, tints.water) >= floor - 1e-9) return w;
        }
        throw new Error(`${what} has no variant that reads at ${floor}:1 on both the land and the sea`);
      };
      const colours = {
        land: tints.land,
        water: tints.water,
        band: onBoth(direction.accent, NON_TEXT_CONTRAST_MIN, "a band"),
        subjectBand: onBoth(mix(direction.accent, ink, 0.35), NON_TEXT_CONTRAST_MIN, "the subject's band"),
        node: onBoth(ink, NON_TEXT_CONTRAST_MIN, "the node's edge"),
      };

      const plan = flowMapPlan({
        tints: { water: tints.water, land: tints.land },
        colours,
        cameras,
        statesForCards: STATES,
        referenceWidth: REFERENCE.width,
        referenceHeight: REFERENCE.height,
        node: { seat: origin, r: NODE_R },
        bands: bandsGeo,
        seatDots: bandsGeo.map((b) => ({ code: b.code, seat: b.seatLonLat, top: b.top })),
        others: otherPts,
        dotR: DOT_R,
        othersR: OTHERS_R,
        hairline: (direction.stroke?.hairline ?? 0.6) * 1,
      });
      const violations = [...validateScrollyPlan(plan, STATES), ...validateExpressions(plan)];
      if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

      const renderPage = (fallbacks, shapes) =>
        renderScrolly({
          steps: prose.map((p, i) => ({ id: ["ukraine", "allemagne", "pologne", "dix-rubans", "autres-pays", "lecture"][i], prose: p })),
          reveal: {
            element: createElement(DirectedFlowMapScrolly, {
              plan: { ...plan, fallback: shapes },
              fallbacks,
              reference: REFERENCE,
              bands: bandsGeo.map(({ code, name, people, top }) => ({ code, name, people, top })),
              others: rest.length,
              total,
              keySizes,
              bandColour: colours.band,
              subjectColour: colours.subjectBand,
              landColour: colours.land,
              words,
              alt,
              regs,
              ground: direction.ground,
              accent: direction.accent,
              ink,
              muted,
            }),
            states: STATES,
            driver,
            apply: "applyFlowState",
          },
          vendor: [{ js: cards.maplibreJs, css: cards.maplibreCss }],
          title,
          eyebrow: EYEBROW,
          source,
          ground: direction.ground,
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
        stageGround: tints.water,
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

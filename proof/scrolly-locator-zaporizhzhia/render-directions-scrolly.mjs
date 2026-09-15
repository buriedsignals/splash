// Where Europe's largest low-carbon power station is, rendered once per FILED DIRECTION into a self-contained scrolly
// page. The `locator` type in the scrolly format.
//
// THE SUBJECT OF `static-locator-zaporizhzhia`, CHOREOGRAPHED, ON A LIVE MAPTILER MAP (addendum 2026-09-15):
//
//   1. the largest low-carbon stations in Europe: one in Ukraine, 6,000 MW, then three French;
//   2. Ukraine outlined: the one country with no reported 2024 generation;
//   3. the camera closes on the region; Ukraine's oblasts (MapTiler Countries, level 1) appear;
//   4. countries, settlements and water named — MapTiler's own label layers, filtered (`locator-drive.mjs`);
//   5. the station ringed and named;
//   6. the camera eases back: installed capacity, never output.
//
// Usage:  set -a && . ./.env && set +a && bun proof/scrolly-locator-zaporizhzhia/render-directions-scrolly.mjs [--only creme] [--no-bake]

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, readPalette, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { cameraFields, mercatorOf, lonLatOf } from "#shared/map-beat/scrolly.mjs";
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { openLiveMapCards, renderWithCardImages } from "../../skills/scrolly/scripts/live-map-cards-bake.mjs";
import { locatorPlan } from "./plan.mjs";
import { DirectedLocatorScrolly } from "./DirectedLocatorScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FALLBACK = join(HERE, "fallback");
const EYEBROW = "Énergie · Europe";
const NB = " ";
const WHOLE_WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const TOPS = 4;
const FRENCH_COUNTRY = { Ukraine: "Ukraine", France: "France", Russia: "Russie", Romania: "Roumanie", Moldova: "Moldavie", Belarus: "Biélorussie" };
const FRENCH_PLACE = { Kyiv: "Kiev", Kharkiv: "Kharkiv", Dnipro: "Dnipro", Odessa: "Odessa", Rostov: "Rostov", Bucharest: "Bucarest" };
const AREAS = [
  { iso2: "UA", name: "Ukraine" },
  { iso2: "RU", name: "Russie" },
  { iso2: "RO", name: "Roumanie" },
  { iso2: "MD", name: "Moldavie" },
  { iso2: "BY", name: "Biélorussie" },
];
const WATER_NAMES = ["Black Sea", "Sea of Azov"];
/** THE TRANSLITERATION BRIDGE. The tiles carry names MapTiler's own toponym layers already speak; the CSV carries
 *  the ones the WRI database ships. Two of the beat's six settlements are spelled differently in the two datasets —
 *  not a curated subject list (that stays derived from `places.csv`'s top six by population), only the two
 *  transliterations that differ. */
const CSV_TO_TILE_NAME = { Odessa: "Odesa", Rostov: "Rostov-on-Don" };
const DNIEPER_AT = [33.4, 47.0];
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

// ── the station and the unreported country, asserted (unchanged from the SVG beat) ─────────────
const readCsv = async (name) => {
  const lines = (await readFile(join(HERE, name), "utf8")).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
};
const stations = (await readCsv("stations.csv")).map((s) => ({ ...s, mw: Number(s.capacity_mw), lon: Number(s.lon), lat: Number(s.lat) }));
const ranked = [...stations].sort((a, b) => b.mw - a.mw);
const biggest = ranked[0];
if (biggest.country !== "Ukraine") throw new Error(`the headline says the largest is in Ukraine; it is in ${biggest.country}`);
if (!(biggest.mw >= 6000)) throw new Error(`the headline says 6 000 MW; it is ${biggest.mw}`);
const tops = ranked.slice(0, TOPS);
for (const s of tops) if (!FRENCH_COUNTRY[s.country]) throw new Error(`${s.country} holds one of the ${TOPS} largest stations and has no French name filed`);
if (!tops.slice(1).every((s) => s.country === "France")) throw new Error(`the first card says the next ${TOPS - 1} largest are French; they are in ${tops.slice(1).map((s) => s.country).join(", ")}`);
const electricity = await readCsv("electricity.csv");
const FUELS = Object.keys(electricity[0]).filter((h) => h.endsWith("__twh"));
const unreported = electricity.filter((r) => FUELS.reduce((s, k) => s + Number(r[k] || 0), 0) <= 0);
if (unreported.length !== 1 || unreported[0].entity !== "Ukraine") throw new Error(`the second card says Ukraine is the only European country with no reported 2024 generation; the file reports none for ${unreported.map((r) => r.entity).join(", ") || "no country"}`);

/** Settlements by the static beat's rule: the six largest, derived from the data — never a curated id list. */
const places = (await readCsv("places.csv")).map((p) => ({ ...p, pop: Number(p.pop), lon: Number(p.lon), lat: Number(p.lat) })).sort((a, b) => b.pop - a.pop).slice(0, 6);
for (const p of places) if (!FRENCH_PLACE[p.name]) throw new Error(`no French name recorded for ${p.name}`);
const placeTileNames = places.map((p) => CSV_TO_TILE_NAME[p.name] ?? p.name);

console.log(`${biggest.mw} MW · suivantes : ${tops.slice(1).map((s) => `${s.country} ${s.mw}`).join(", ")} · non rapporté : ${unreported[0].entity}\n`);

// ── the cameras, from the beat's own facts ────────────────────────────────────────────────────
const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const [bx0, by1] = mercatorOf([WHOLE_WINDOW.west, WHOLE_WINDOW.south]);
const [bx1, by0] = mercatorOf([WHOLE_WINDOW.east, WHOLE_WINDOW.north]);
const REFERENCE = { width: 1280, height: Math.round((1280 * (by1 - by0)) / (bx1 - bx0)) };
const WHOLE_ZOOM = Math.log2(REFERENCE.width / ((bx1 - bx0) * 512));
const WHOLE_CENTER = lonLatOf([(bx0 + bx1) / 2, (by0 + by1) / 2]);
/** THE CLOSE-UP CENTRES THE STATION ON BOTH AXES: the static plate's own window, ±9° of longitude and ±5.2° of
 *  latitude around it — symmetric, so the fitted centre IS the station, no separate centring step needed. */
const [zx0, zy1] = mercatorOf([biggest.lon - 9, biggest.lat - 5.2]);
const [zx1, zy0] = mercatorOf([biggest.lon + 9, biggest.lat + 5.2]);
const CLOSE_ZOOM = Math.log2(Math.min(REFERENCE.width / ((zx1 - zx0) * 512), REFERENCE.height / ((zy1 - zy0) * 512)));
const CLOSE_CENTER = [biggest.lon, biggest.lat];
/** CARD 6 EASES BACK PART-WAY: the same centre, a third of the way back toward the whole-map zoom. */
const PULLBACK_ZOOM = CLOSE_ZOOM - (CLOSE_ZOOM - WHOLE_ZOOM) * 0.35;

const whole = cameraFields({ center: WHOLE_CENTER, zoom: WHOLE_ZOOM, alignY: 1 });
const closeUp = cameraFields({ center: CLOSE_CENTER, zoom: CLOSE_ZOOM, alignY: 0 });
const pullback = cameraFields({ center: CLOSE_CENTER, zoom: PULLBACK_ZOOM, alignY: 0 });
const cameras = [whole, whole, closeUp, closeUp, closeUp, pullback];

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `La plus grosse centrale bas-carbone d’Europe est en Ukraine`,
  `La plus grosse centrale d’Europe est en Ukraine`,
  `Zaporijjia, ${n0(biggest.mw)}${NB}MW`,
];
const prose = [
  [`Les plus grosses centrales bas-carbone que la base mondiale du WRI recense en Europe : une en Ukraine, ${n0(biggest.mw)}${NB}MW, puis trois centrales nucléaires françaises, de ${n0(tops[3].mw)} à ${n0(tops[1].mw)}${NB}MW.`],
  [`La plus grosse est en Ukraine, le seul pays du continent dont la production électrique de 2024 n’est pas rapportée.`],
  [`Approchons : l’Ukraine, la mer Noire, la mer d’Azov.`],
  [`Pays en capitales, villes en bas de casse sur un point, eaux en italique : Kiev, Kharkiv, Dnipro, Odessa.`],
  [`Zaporijjia, sur le Dniepr : ${n0(biggest.mw)}${NB}MW de puissance installée, la plus grosse centrale bas-carbone d’Europe.`],
  [`Lecture : la base enregistre une puissance installée, jamais une production. La centrale est dessinée là où elle est, pas là où elle produit.`],
];
const source = "Source : WRI Global Power Plant Database v1.3.0 · fond de carte © MapTiler © OpenStreetMap";
const words = {
  unit: "centrales bas-carbone, puissance installée",
  topNote: `${n0(biggest.mw)}${NB}MW en Ukraine`,
  countryNote: "production 2024 non rapportée",
  zoomNote: "Ukraine et mer Noire",
  subjectNote: `Zaporijjia${NB}: ${n0(biggest.mw)}${NB}MW`,
  limitNote: "puissance installée, jamais une production",
};
const alt =
  `Carte de l’Europe puis de l’Ukraine : la centrale de Zaporijjia, ${n0(biggest.mw)} MW de puissance installée, la plus grosse centrale bas-carbone ` +
  `recensée en Europe, sur le Dniepr près de la mer d’Azov. L’Ukraine est le seul pays du continent sans production électrique rapportée en 2024.`;

/** One state per card; see `locator-drive.mjs` for what each field paints. */
const STATES = [
  { tops: 1, country: 0, zoom: 0, places: 0, subject: 0, limit: 0 },
  { tops: 0, country: 1, zoom: 0, places: 0, subject: 0, limit: 0 },
  { tops: 0, country: 1, zoom: 1, places: 0, subject: 0, limit: 0 },
  { tops: 0, country: 1, zoom: 1, places: 1, subject: 0, limit: 0 },
  { tops: 0, country: 1, zoom: 1, places: 1, subject: 1, limit: 0 },
  { tops: 0, country: 1, zoom: 1, places: 1, subject: 1, limit: 1 },
].map((state, k) => ({ ...state, ...cameras[k], card: k }));

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${AREAS.map((a) => a.name.toUpperCase()).join(" ")} ${tops.slice(1).map((s) => `${n0(s.mw)}${NB}MW`).join(" ")} ${words.limitNote}`,
  annot: `${places.map((p) => FRENCH_PLACE[p.name]).join(" ")} mer Noire mer d’Azov Dniepr`,
  value: `Zaporijjia · ${n0(biggest.mw)}${NB}MW installés ${words.topNote} ${words.countryNote} ${words.zoomNote} ${words.subjectNote} ${words.limitNote}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

// ── the live map: its key, its faces, its frozen cards ─────────────────────────────────────────
const cards = await openLiveMapCards();
const driver = `${cards.mapScript}\n${await readFile(join(HERE, "locator-drive.mjs"), "utf8")}`;
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
      const inkOnLand = adjustToContrast(ink, tints.land, TEXT_CONTRAST_MIN) ?? ink;
      const mutedOnLand = adjustToContrast(muted, tints.land, TEXT_CONTRAST_MIN) ?? muted;
      const waterInk = adjustToContrast(mix(direction.accent, ink, 0.2), tints.water, TEXT_CONTRAST_MIN) ?? inkOnLand;
      const accentMark = adjustToContrast(direction.accent, tints.land, NON_TEXT_CONTRAST_MIN) ?? direction.accent;
      const accentInk = adjustToContrast(direction.accent, tints.land, TEXT_CONTRAST_MIN) ?? direction.accent;
      // MEASURED AGAINST THE BASEMAP'S OWN TINTS (`tints.land`, `tints.water` — what the live sweep actually
      // paints), not the page ground, and against each other where one sits on the other (owner, 2026-09-15: a
      // no-data fill mixed only 7% toward ink measured 1.17:1 against land — practically invisible; every
      // neutral here now goes through `adjustToContrast` instead of a bare, unmeasured `mix`).
      const unreported = adjustToContrast(mix(tints.land, ink, 0.22), tints.land, NON_TEXT_CONTRAST_MIN) ?? mix(tints.land, ink, 0.22);
      const colours = {
        unreported,
        accentMark,
        accentInk,
        regionLine: adjustToContrast(mix(tints.land, ink, 0.45), unreported, NON_TEXT_CONTRAST_MIN) ?? mix(tints.land, ink, 0.45),
        stationDot: adjustToContrast(direction.accent, tints.land, NON_TEXT_CONTRAST_MIN) ?? direction.accent,
        inkOnLand,
        waterInk,
      };
      if (contrast(colours.unreported, tints.land) < NON_TEXT_CONTRAST_MIN) throw new Error(`Ukraine's no-data fill ${colours.unreported} measures under 3:1 against the land ${tints.land}`);
      const fonts = {
        axis: await cards.faceOf(regs.axis, "axis"),
        axisSize: Number.parseFloat(regs.axis.fontSize),
        annot: await cards.faceOf(regs.annot, "annot"),
        annotSize: Number.parseFloat(regs.annot.fontSize),
        waterFace: await cards.faceOf({ ...regs.annot, fontStyle: "italic" }, "water"),
        waterSize: Number.parseFloat(regs.annot.fontSize),
      };
      const plan = locatorPlan({
        tints: { water: tints.water, land: tints.land },
        subjectCountryIso: "UA",
        stations: tops.map((s) => ({
          lon: s.lon,
          lat: s.lat,
          r: Math.sqrt(s.mw / biggest.mw),
          isSubject: s === biggest,
          label: `${n0(s.mw)}${NB}MW`,
        })),
        subject: {
          lon: biggest.lon,
          lat: biggest.lat,
          label: `Zaporijjia · ${n0(biggest.mw)}${NB}MW installés`,
          riverAt: DNIEPER_AT,
          riverLabel: "Dniepr",
        },
        places: places.map((p) => ({ lon: p.lon, lat: p.lat })),
        colours,
        fonts,
        cameras,
        statesForCards: STATES,
        referenceWidth: REFERENCE.width,
        referenceHeight: REFERENCE.height,
        radiusPx: 9,
        subjectRadiusPx: { rest: 5, named: 9 },
        placeDotPx: 3,
      });
      const violations = [...validateScrollyPlan(plan, STATES), ...validateExpressions(plan)];
      if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

      const native = {
        countryCodes: AREAS.map((a) => a.iso2),
        countryColor: mutedOnLand,
        placeNames: placeTileNames,
        placeColor: inkOnLand,
        waterNames: WATER_NAMES,
        waterColor: waterInk,
        landHalo: tints.land,
      };

      const renderPage = (fallbacks, shapes) =>
        renderScrolly({
          steps: prose.map((p, i) => ({ id: ["europe", "ukraine", "approche", "lieux", "zaporijjia", "lecture"][i], prose: p })),
          reveal: {
            element: createElement(DirectedLocatorScrolly, {
              plan: { ...plan, fallback: shapes },
              fallbacks,
              reference: REFERENCE,
              native,
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
            apply: "applyLocatorState",
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
      console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")} · faces ${fonts.axis} / ${fonts.annot} / ${fonts.waterFace}`);
    } catch (error) {
      await rm(join(OUT, `${id}.html`), { force: true });
      refused.push({ id, why: error.message });
      console.log(`${id} REFUSED — ${error.message}`);
    }
  }
} finally {
  await cards.close();
}
console.log(`faces served by MapTiler, each checked against the Noto Sans fallback: ${[...cards.servedFaces.keys()].join(", ")}`);
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}

// Europe's low-carbon electricity, rendered once per FILED DIRECTION into a self-contained scrolly page.
// The `cartogram` type in the scrolly format, on a live MapTiler map while it shows geography, the tiles
// outside it once it leaves (addendum 2026-09-15 §5).
//
// THE SUBJECT, CHOREOGRAPHED — kept exactly as validated 2026-09-15 (« Trois façons de compter »), moved onto
// the live map for its geographic half:
//
//   1. the map — every country as its territory, shaded by class, live;
//   2. the country that takes the most room, picked out on the map; the area-weighted mean counts up;
//   3. the handover, then the morph — every country shrinks or swells into one equal tile; the country
//      mean counts up;
//   4. every tile resized to the electricity its country produces; the production-weighted mean counts up;
//   5. the three means on one rule, the tiles stepping back;
//   6. the equal tiles again, the country with no reading named.
//
// Usage:  set -a && . ./.env && set +a && bun proof/scrolly-cartogram-europe-lowcarbon/render-directions-scrolly.mjs [--only creme] [--no-bake]

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
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { openLiveMapCards, renderWithCardImages } from "../../skills/scrolly/scripts/live-map-cards-bake.mjs";
import { areaOf } from "./cartogram-geometry.mjs";
import { cartogramGeometry, cartogramMapPlan, fitCamera, iso2Of, projectorOf, withWidestName } from "./plan.mjs";
import { DirectedCartogramScrolly } from "./DirectedCartogramScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FALLBACK = join(HERE, "fallback");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const NB = " ";
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];

/** The layout is designed, not derived — the static plate's own grid, unchanged. */
const GRID = [
  "..  ISL ..  ..  ..  ..  ..  ..  NOR SWE FIN ..",
  "..  ..  ..  ..  ..  ..  ..  ..  ..  ..  EST ..",
  "..  ..  IRL GBR DNK ..  ..  ..  ..  LVA RUS ..",
  "..  ..  ..  ..  NLD DEU POL LTU BLR ..  ..  ..",
  "..  ..  ..  BEL LUX CZE SVK UKR ..  ..  ..  ..",
  "PRT ESP FRA CHE AUT HUN MDA ..  ..  ..  ..  ..",
  "..  ..  ..  ITA SVN HRV SRB ROU ..  ..  ..  ..",
  "..  ..  ..  MLT MNE BIH MKD BGR ..  ..  ..  ..",
  "..  ..  ..  ..  ..  ALB GRC TUR CYP ..  ..  ..",
];
/** The map's window, [west, south, east, north]: Europe as the grid names it. Area figures are whole-country. */
const WINDOW = [-25, 34, 50, 72];
const FRAME = { width: 1000, height: 680 };
/** Shapes are kept this far past the frame, so a stage of any aspect stays covered (`fitViewBox`). */
const MARGIN = 900;
/** A seat inside Russia's own territory, west of the Urals, north enough to clear the card that reads
 *  over the map's middle (the same band the prose card and the beam sit in on every other card). */
const RUSSIA_SEAT = [42, 65];

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const share = new Map();
const production = new Map();
let cleanSum = 0;
let totalSum = 0;
for (const line of csv.slice(1)) {
  const raw = Object.fromEntries(header.map((h, i) => [h, line.split(",")[i]]));
  if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
  const clean = CLEAN.reduce((s, k) => s + Number(raw[k] || 0), 0);
  const total = clean + FOSSIL.reduce((s, k) => s + Number(raw[k] || 0), 0);
  share.set(raw.code, total > 0 ? (clean / total) * 100 : null);
  production.set(raw.code, total);
  cleanSum += clean;
  totalSum += total;
}

const placed = [];
GRID.forEach((line, row) =>
  line.trim().split(/\s+/).forEach((code, col) => {
    if (code === "..") return;
    if (!share.has(code)) throw new Error(`the grid places ${code} and the data has no such code`);
    placed.push({ iso: code, col, row });
  }),
);
const missingFromGrid = [...share.keys()].filter((c) => !placed.some((p) => p.iso === c));
if (missingFromGrid.length) throw new Error(`the data has ${missingFromGrid.join(", ")} and the grid has no tile for them`);
for (const p of placed) iso2Of(p.iso); // every studied country joins MapTiler Countries, or refuses loudly here

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const area = {};
for (const f of geo.features) area[f.properties.iso] = (area[f.properties.iso] ?? 0) + areaOf(f);

// ── THE CLAIM, ASSERTED — the static beat's own two checks, unchanged ────────────────────────────
const withData = [...share.entries()].filter(([, v]) => v !== null);
const byCountry = withData.reduce((s, [, v]) => s + v, 0) / withData.length;
const areaSum = withData.reduce((s, [c]) => s + (area[c] ?? 0), 0);
const byArea = withData.reduce((s, [c, v]) => s + v * (area[c] ?? 0), 0) / areaSum;
if (!(byCountry - byArea > 15)) throw new Error(`the headline says the two readings are twenty points apart; they are ${(byCountry - byArea).toFixed(1)}`);
const widest = withData.reduce((a, b) => ((area[b[0]] ?? 0) > (area[a[0]] ?? 0) ? b : a));
if (!(share.get(widest[0]) < byCountry)) throw new Error(`a card says the largest country is below the country mean; ${widest[0]} is not`);
const widestShare = ((area[widest[0]] ?? 0) / areaSum) * 100;
const unreported = [...share.entries()].filter(([, v]) => v === null).map(([c]) => c);
const byProduction = (cleanSum / totalSum) * 100;
if (!(byArea < byProduction && byProduction < byCountry)) throw new Error(`card 5 orders the means km² < kWh < country; they are ${byArea.toFixed(1)}, ${byProduction.toFixed(1)}, ${byCountry.toFixed(1)}`);
const byOutput = withData.map(([c]) => c).sort((a, b) => production.get(b) - production.get(a));
if (byOutput[0] !== widest[0] || byOutput[1] !== "FRA") throw new Error(`card 4 says Russia then France produce most; they are ${byOutput[0]} and ${byOutput[1]}`);
const smallestTwo = byOutput.slice(-2).sort();
if (smallestTwo.join() !== "LUX,MLT") throw new Error(`card 4 names Malta and Luxembourg the smallest producers; they are ${smallestTwo.join(", ")}`);
if (unreported.length !== 1) throw new Error(`the sixth card names one country with no reading; there are ${unreported.length}`);

const BREAKS = [40, 60, 75, 94];
const CLASS_COUNT = BREAKS.length + 1;
const classOf = (v) => (v === null ? null : BREAKS.filter((b) => v >= b).length);
const NAMES = {
  RUS: { name: "Russie", article: "la Russie" },
  UKR: { name: "Ukraine", article: "l’Ukraine" },
  FRA: { name: "France", article: "la France" },
};
const nameOf = (iso) => {
  if (!NAMES[iso]) throw new Error(`${iso} is named by a card and this beat has no French name for it`);
  return NAMES[iso];
};
const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const twh = (iso) => plainSpaces(Math.round(production.get(iso)).toLocaleString("fr-FR"));

// ── the live map's own camera and shapes, ONE coordinate space with the tile grid ────────────────
const camera = fitCamera({ west: WINDOW[0], south: WINDOW[1], east: WINDOW[2], north: WINDOW[3] }, FRAME);
const project = projectorOf(camera, FRAME);
const geometry = cartogramGeometry({ geo, placed }, { project, stage: FRAME, margin: MARGIN });
const countries = geometry.countries.map((c) => ({ ...c, value: share.get(c.iso), classIndex: classOf(share.get(c.iso)), twh: production.get(c.iso) }));
const widestClassIndex = classOf(share.get(widest[0]));

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Compté par pays, le bas-carbone européen est à ${one(byCountry)}${NB}% ; compté au kilomètre carré, à ${one(byArea)}${NB}%`,
  `Par pays ${one(byCountry)}${NB}% de bas-carbone ; par territoire ${one(byArea)}${NB}%`,
  `Le bas-carbone européen, compté trois fois`,
];
const prose = [
  [`Part d’électricité bas-carbone de ${countries.length} pays européens en ${YEAR}, sur la carte : chaque pays prend la place de son territoire.`],
  [`Sur une carte, l’encre suit le territoire : ${nameOf(widest[0]).article} pèse ${Math.round(widestShare)}${NB}% de celui de ces pays, à ${one(share.get(widest[0]))}${NB}% de bas-carbone. Au kilomètre carré, la moyenne tombe à ${one(byArea)}${NB}%.`],
  [`Donnons à chaque pays la même place : une tuile égale, rangée à peu près comme la carte. Une tuile, une voix : comptée par pays, la moyenne monte à ${one(byCountry)}${NB}%.`],
  [`Donnons maintenant à chaque tuile la taille de sa production. ${capital(nameOf(byOutput[0]).article)} reste la plus grande, ${twh(byOutput[0])}${NB}TWh, devant ${nameOf("FRA").article}, ${twh("FRA")}${NB}; Malte et le Luxembourg ne sont plus qu’un point. Au kilowattheure, ${one(byProduction)}${NB}%.`],
  [`Trois moyennes, toutes vraies : ${one(byArea)}${NB}% au kilomètre carré, ${one(byProduction)}${NB}% au kilowattheure, ${one(byCountry)}${NB}% par pays. Chaque dessin n’en montre qu’une.`],
  [`${capital(nameOf(unreported[0]).article)} n’a pas de donnée ${YEAR} : sa tuile reste vide. La disposition est dessinée à la main pour rester reconnaissable ; elle n’est mesurée sur rien.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · fond de carte © MapTiler © OpenStreetMap";
const byAreaCounter = { template: `au km²${NB}: {n}${NB}%`, value: Number(byArea.toFixed(1)) };
const byProductionCounter = { template: `au kWh${NB}: {n}${NB}%`, value: Number(byProduction.toFixed(1)) };
const byCountryCounter = { template: `par pays${NB}: {n}${NB}%`, value: Number(byCountry.toFixed(1)) };
const subjectNote = `${nameOf(widest[0]).name} · ${Math.round(widestShare)}${NB}% du territoire · ${one(share.get(widest[0]))}${NB}%`;
const widestMapLabel = `${nameOf(widest[0]).name.toUpperCase()} · ${one(share.get(widest[0]))}${NB}%`;
const missingNote = `${nameOf(unreported[0]).name} · donnée non rapportée`;
const alt =
  `Carte de l’Europe qui devient un cartogramme en tuiles : ${countries.length} pays teintés par leur part d’électricité ` +
  `bas-carbone en ${YEAR}. Comptée par pays la moyenne est de ${one(byCountry)} % ; pondérée par le territoire, ${one(byArea)} %.`;

/** One state per card; see `cartogram-drive.mjs`. Unchanged from the validated 2026-09-15 choreography. */
const STATES_RAW = [
  { morph: 0, size: 0, subject: 0, area: 0, country: 0, production: 0, rule: 0, missing: 0 },
  { morph: 0, size: 0, subject: 1, area: 1, country: 0, production: 0, rule: 0, missing: 0 },
  { morph: 1, size: 0, subject: 0, area: 1, country: 1, production: 0, rule: 0, missing: 0 },
  { morph: 1, size: 1, subject: 0, area: 1, country: 1, production: 1, rule: 0, missing: 0 },
  { morph: 1, size: 1, subject: 0, area: 1, country: 1, production: 1, rule: 1, missing: 0 },
  { morph: 1, size: 0, subject: 0, area: 1, country: 1, production: 1, rule: 0, missing: 1 },
];
/** The live map's camera never moves; every card carries it, plus which card it is (`cartogram-drive.mjs`). */
const STATES = STATES_RAW.map((state, k) => ({ ...state, ...camera, card: k }));
/** ONLY CARDS 1–2 ARE EVER A DISTINCT LIVE-MAP PICTURE (`subject` is the map's only bound field, and it is
 *  0 on every card from 3 on): baking a frozen image per scroll card would bake the same bytes four times
 *  over and the fallback guard refuses that. So only these two are ever baked. Every card still gets its own
 *  fallback entry (`CARD_TO_BAKE`, below): a card whose `subject` is 0 points at card 1's bake, the one
 *  card whose `subject` is 1 points at card 2's — the picture that actually matches its own state, tile
 *  cards included, with no new bytes baked and so nothing for the fallback guard to refuse. */
const BAKE_STATES = STATES.slice(0, 2);
/** Card index → which of the two bakes is its own picture. */
const CARD_TO_BAKE = STATES_RAW.map((state) => (state.subject ? 1 : 0));

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${countries.map((c) => c.iso).join(" ")} ${BREAKS.map((b) => `${b}${NB}%`).join(" ")} part bas-carbone de la production donnée non rapportée`,
  annot: `${subjectNote} ${missingNote} ${widestMapLabel}`,
  value: `${byAreaCounter.template} ${byProductionCounter.template} ${byCountryCounter.template} 0123456789, 0 50 100`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: CLASS_COUNT };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log(`par pays ${byCountry.toFixed(1)} · au kWh ${byProduction.toFixed(1)} · au km² ${byArea.toFixed(1)} · ${widest[0]} ${widestShare.toFixed(0)} % du territoire\n`);

// ── the live map: its key, its faces, its frozen cards ─────────────────────────────────────────
const cards = await openLiveMapCards();
const driver = `${cards.mapScript}\n${await readFile(join(HERE, "cartogram-drive.mjs"), "utf8")}`;
const refused = [];
try {
  for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
    const id = file.replace(/\.md$/, "");
    if (ONLY && id !== ONLY) continue;
    const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
    const { ink, muted, grid } = deriveFurniture(direction.ground);
    const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
    try {
      const ground = direction.ground;
      const accent = direction.accent;
      const { water: sea, land } = plateTints(direction);
      const floorOnGround = (colour, what) => {
        if (contrast(colour, ground) >= NON_TEXT_CONTRAST_MIN) return colour;
        const lifted = adjustToContrast(colour, ground, NON_TEXT_CONTRAST_MIN);
        if (!lifted) throw new Error(`${what} cannot be told from the ground: nothing clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground}`);
        return lifted;
      };
      // The static plate's own colour rules, computed once here so the live map and the SVG tiles share the
      // exact same hex values (the video's own `build.mjs`).
      const low = floorOnGround(mix(accent, ground, 0.9), "the lowest class of the ramp");
      const high = mix(accent, ink, 0.3);
      const classFills = Array.from({ length: CLASS_COUNT }, (_, i) => mix(low, high, i / (CLASS_COUNT - 1)));
      const neutral = floorOnGround(mix(ground, ink, 0.22), "the neutral tile");
      const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
      const accentInk = adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
      const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
      const colours = { ground, sea, land, neutral, border: grid, missingEdge: mutedInk, classFills, text: { ink: inkOnGround, muted: mutedInk, accent: accentInk } };
      const hairline = direction.stroke?.hairline ?? 0.6;
      const strokes = { border: hairline, halo: hairline * 1.7 };

      const face = await cards.faceOf(regs.annot, "annot");
      const annotPx = Number.parseFloat(String(regs.annot.fontSize));
      let mapPlan = cartogramMapPlan({
        countries,
        widest: widest[0],
        colours,
        strokes,
        cameras: BAKE_STATES.map(() => camera),
        statesForCards: BAKE_STATES,
        referenceWidth: FRAME.width,
        referenceHeight: FRAME.height,
      });
      mapPlan = withWidestName(mapPlan, {
        at: RUSSIA_SEAT,
        text: widestMapLabel,
        register: { fontSize: annotPx },
        face,
        ink: inkOnGround,
        halo: strokes.halo,
        haloColour: classFills[widestClassIndex],
      });
      const violations = [...validateScrollyPlan(mapPlan, STATES), ...validateExpressions(mapPlan)];
      if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

      const renderPage = (fallbacks, shapes) =>
        renderScrolly({
          steps: prose.map((p, i) => ({ id: ["carte", "territoire", "tuiles", "production", "moyennes", "vide"][i], prose: p })),
          reveal: {
            element: createElement(DirectedCartogramScrolly, {
              plan: { ...mapPlan, fallback: shapes },
              // Every card gets its own fallback entry, reusing the two real bakes' bytes (`CARD_TO_BAKE`) —
              // no new images, so the fallback guard sees nothing duplicated.
              fallbacks: CARD_TO_BAKE.map((i) => fallbacks[i]),
              reference: FRAME,
              countries,
              width: FRAME.width,
              height: FRAME.height,
              breaks: BREAKS.map((b) => `${b}${NB}%`),
              unit: "part bas-carbone de la production",
              missingLabel: "donnée non rapportée",
              subject: widest[0],
              subjectNote,
              byArea: byAreaCounter,
              byCountry: byCountryCounter,
              byProduction: byProductionCounter,
              missingNote,
              alt,
              regs,
              colours,
            }),
            states: STATES,
            driver,
            apply: "applyCartogramState",
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
        plan: mapPlan,
        states: BAKE_STATES,
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

// Europe's low-carbon electricity, rendered once per FILED DIRECTION into a self-contained scrolly page.
// The `cartogram` type in the scrolly format.
//
// THE SUBJECT OF `static-cartogram-europe-lowcarbon`, CHOREOGRAPHED. The shares, the designed grid and its
// two-way check against the data, the area computation, both assertions and the colour rules are the
// static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the map — every country as its territory, shaded by class;
//   2. the country that takes the most room, picked out; the area-weighted mean counts up;
//   3. the morph — every country shrinks or swells into one equal tile; the country mean counts up;
//   4. every tile resized to the electricity its country produces; the production-weighted mean counts up;
//   5. the three means on one rule, the tiles stepping back;
//   6. the equal tiles again, the country with no reading named.
//
// Usage:  bun proof/scrolly-cartogram-europe-lowcarbon/render-directions-scrolly.mjs

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
import { plateTints } from "#shared/map-beat/tints.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { cartogramGeometry } from "./cartogram-geometry.mjs";
import { DirectedCartogramScrolly } from "./DirectedCartogramScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";

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
const COLS = 12;
const ROWS = GRID.length;
/** The map's window, [west, south, east, north]: Europe as the grid names it. Area figures are whole-country. */
const WINDOW = [-25, 34, 50, 72];
const FRAME = { width: 1000, height: 680 };

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

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const geometry = cartogramGeometry(geo, placed, { cols: COLS, rows: ROWS, ...FRAME, window: WINDOW });
const area = geometry.area;

// ── THE CLAIM, ASSERTED — the static beat's own two checks ────────────────────────────────────
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

const countries = geometry.countries.map((c) => ({ ...c, value: share.get(c.iso), classIndex: classOf(share.get(c.iso)), twh: production.get(c.iso) }));
const twh = (iso) => plainSpaces(Math.round(production.get(iso)).toLocaleString("fr-FR"));

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
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · fonds Natural Earth 50 m";
const byAreaCounter = { template: `au km²${NB}: {n}${NB}%`, value: Number(byArea.toFixed(1)) };
const byProductionCounter = { template: `au kWh${NB}: {n}${NB}%`, value: Number(byProduction.toFixed(1)) };
const byCountryCounter = { template: `par pays${NB}: {n}${NB}%`, value: Number(byCountry.toFixed(1)) };
const subjectNote = `${nameOf(widest[0]).name} · ${Math.round(widestShare)}${NB}% du territoire · ${one(share.get(widest[0]))}${NB}%`;
const missingNote = `${nameOf(unreported[0]).name} · donnée non rapportée`;
const alt =
  `Carte de l’Europe qui devient un cartogramme en tuiles : ${countries.length} pays teintés par leur part d’électricité ` +
  `bas-carbone en ${YEAR}. Comptée par pays la moyenne est de ${one(byCountry)} % ; pondérée par le territoire, ${one(byArea)} %.`;

/** One state per card; see `cartogram-drive.mjs`. */
const STATES = [
  { morph: 0, size: 0, subject: 0, area: 0, country: 0, production: 0, rule: 0, missing: 0 },
  { morph: 0, size: 0, subject: 1, area: 1, country: 0, production: 0, rule: 0, missing: 0 },
  { morph: 1, size: 0, subject: 0, area: 1, country: 1, production: 0, rule: 0, missing: 0 },
  { morph: 1, size: 1, subject: 0, area: 1, country: 1, production: 1, rule: 0, missing: 0 },
  { morph: 1, size: 1, subject: 0, area: 1, country: 1, production: 1, rule: 1, missing: 0 },
  { morph: 1, size: 0, subject: 0, area: 1, country: 1, production: 1, rule: 0, missing: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${countries.map((c) => c.iso).join(" ")} ${BREAKS.map((b) => `${b}${NB}%`).join(" ")} part bas-carbone de la production donnée non rapportée`,
  annot: `${subjectNote} ${missingNote}`,
  value: `${byAreaCounter.template} ${byProductionCounter.template} ${byCountryCounter.template} 0123456789, 0 50 100`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: BREAKS.length + 1 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log(`par pays ${byCountry.toFixed(1)} · au kWh ${byProduction.toFixed(1)} · au km² ${byArea.toFixed(1)} · ${widest[0]} ${widestShare.toFixed(0)} % du territoire\n`);

const driver = await readFile(join(HERE, "cartogram-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["carte", "territoire", "tuiles", "production", "moyennes", "vide"][i], prose: p })),
      reveal: {
        element: createElement(DirectedCartogramScrolly, {
          countries,
          context: geometry.context,
          seaFill: plateTints(direction).water,
          ...FRAME,
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
          pad: direction.pad,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
        }),
        states: STATES,
        driver,
        apply: "applyCartogramState",
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

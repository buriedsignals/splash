// Europe's low-carbon electricity in 2024, rendered once per FILED DIRECTION into a self-contained scrolly
// page. The `choropleth` type in the scrolly format.
//
// THE SUBJECT OF `static-choropleth-europe-lowcarbon`, CHOREOGRAPHED. The shares, the seven above the floor,
// Albania's neighbours derived from the frozen rings, the north-west measured on the shapes, the ramp and
// the plate's tints are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. forty reporting countries, empty;
//   2. the classes arrive one by one, lowest first;
//   3. filter to the floor: only the seven above 94 % keep their colour, counted;
//   4. the six of the north-west named;
//   5. the camera travels onto the Balkans: Albania ringed, its neighbours named with their shares;
//   6. back to Europe, every class, the country with no reading named.
//
// Usage:  bun proof/scrolly-choropleth-europe-lowcarbon/render-directions-scrolly.mjs

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
import { choroplethGeometry } from "./choropleth-geometry.mjs";
import { DirectedChoroplethScrolly } from "./DirectedChoroplethScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const NB = " ";
/** The static plate's own bake bounds and camera aspect (`bake.mjs` BEAT, `CAMERA_ASPECT`). */
const BOUNDS = [[-25, 34], [42, 68]];
const FRAME = { width: 1000, height: 760 };

const RENEWABLE = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh"];
const NUCLEAR = "nuclear_generation__twh";
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const ALL = [...RENEWABLE, NUCLEAR, ...FOSSIL];
const FRENCH = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herzégovine", BGR: "Bulgarie",
  HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", FRA: "France",
  DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro", NLD: "Pays-Bas",
  MKD: "Macédoine du Nord", NOR: "Norvège", POL: "Pologne", PRT: "Portugal", ROU: "Roumanie", RUS: "Russie",
  SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie",
  UKR: "Ukraine", GBR: "Royaume-Uni",
};
const french = (iso) => {
  if (!FRENCH[iso]) throw new Error(`no French name recorded for ${iso}`);
  return FRENCH[iso];
};

// ── the data ───────────────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const measured = csv.slice(1).map((l) => {
  const raw = Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]]));
  if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
  const total = ALL.reduce((s, k) => s + Number(raw[k] || 0), 0);
  return { iso: raw.code, raw, total };
});
const studySet = new Set(measured.map((m) => m.iso));
const value = new Map();
for (const m of measured.filter((m) => m.total > 0)) {
  const share = (k) => (Number(m.raw[k] || 0) / m.total) * 100;
  value.set(m.iso, RENEWABLE.reduce((s, k) => s + share(k), 0) + share(NUCLEAR));
}
const unreported = measured.filter((m) => !(m.total > 0)).map((m) => m.iso);

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const geometry = choroplethGeometry(geo, { bounds: BOUNDS, ...FRAME, keep: studySet });
const drawnWithValue = geometry.shapes.filter((s) => value.has(s.iso)).length;
if (drawnWithValue !== value.size) throw new Error(`the join dropped rows: ${value.size} countries report and ${drawnWithValue} shapes carry a value`);

// ── THE CLAIM, ASSERTED — the static beat's own checks, including its geography ────────────────
const FLOOR = 94;
const ranked = [...value.entries()].sort((a, b) => b[1] - a[1]);
const above = ranked.filter(([, v]) => v > FLOOR).map(([iso]) => iso);
if (above.length !== 7) throw new Error(`the headline says seven countries clear ${FLOOR} %; ${above.length} do`);
const ODD_ONE = "ALB";
if (!above.includes(ODD_ONE)) throw new Error(`the callout is about ${french(ODD_ONE)}, which is not above the floor`);
/** Neighbours from the frozen rings, in degrees: a vertex within a tenth of a degree of another's. */
const NEAR = 0.1;
const lonLatOf = (iso) => geo.features.filter((f) => f.properties.iso === iso).flatMap((f) => f.geometry.coordinates.flat().flat());
const mine = lonLatOf(ODD_ONE);
const neighbours = [...new Set(geo.features.map((f) => f.properties.iso))]
  .filter((o) => o !== ODD_ONE && value.has(o))
  .filter((o) => lonLatOf(o).some(([x, y]) => mine.some(([u, v]) => Math.abs(x - u) < NEAR && Math.abs(y - v) < NEAR)));
const CEILING = 60;
if (!neighbours.length) throw new Error(`${french(ODD_ONE)} has no neighbour with data`);
if (neighbours.some((iso) => value.get(iso) >= CEILING)) throw new Error(`a card says every neighbour of ${french(ODD_ONE)} is under ${CEILING} %`);
const seatOf = (iso) => geometry.shapes.find((s) => s.iso === iso).seat;
const odd = seatOf(ODD_ONE);
const notNorthWest = above.filter((iso) => iso !== ODD_ONE).filter((iso) => seatOf(iso).y > odd.y && seatOf(iso).x > odd.x);
if (notNorthWest.length) throw new Error(`the headline says the other six are north or west of ${french(ODD_ONE)}; ${notNorthWest.join(", ")} is not`);
if (unreported.length !== 1) throw new Error(`the last card names one reporting country with no reading; there are ${unreported.length}`);

const BREAKS = [40, 55, 70, 85, FLOOR];
const classOf = (v) => BREAKS.filter((b) => v >= b).length;
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const pct0 = (v) => `${Math.round(v)}${NB}%`;

/** The zoom box: Albania and its neighbours, padded, fitted to the frame's own aspect. */
const boxes = [ODD_ONE, ...neighbours].map((iso) => geometry.shapes.find((s) => s.iso === iso).box);
const bx0 = Math.min(...boxes.map((b) => b.x));
const by0 = Math.min(...boxes.map((b) => b.y));
const bx1 = Math.max(...boxes.map((b) => b.x + b.w));
const by1 = Math.max(...boxes.map((b) => b.y + b.h));
const aspect = FRAME.width / FRAME.height;
let zw = (bx1 - bx0) * 1.5;
let zh = (by1 - by0) * 1.5;
if (zw / zh < aspect) zw = zh * aspect;
else zh = zw / aspect;
/** Albania is placed in the upper third of the close-up rather than at its centre: the card that narrates
 *  it rests on the middle of the frame, and a subject under its own caption is not shown. */
const zoomBox = {
  x: Math.min(Math.max((bx0 + bx1) / 2 - zw / 2, 0), FRAME.width - zw),
  // Kept inside the frame: past its edge there is no geography, only the ground.
  y: Math.min(Math.max((by0 + by1) / 2 - zh * 0.32, 0), FRAME.height - zh),
  w: zw,
  h: zh,
};

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Sept pays européens dépassent ${FLOOR}${NB}% d’électricité bas-carbone — six au nord-ouest, et l’Albanie`,
  `Le bas-carbone européen est au nord-ouest — et en Albanie`,
  `Le bas-carbone européen, et son exception`,
];
const topSix = above.filter((iso) => iso !== ODD_ONE);
const prose = [
  [`Part de l’électricité produite à partir de sources bas-carbone — renouvelables et nucléaire réunis — en ${YEAR}, dans les ${value.size} pays européens dont la production est rapportée.`],
  [`La couleur est une classe, pas un nombre : de moins de ${BREAKS[0]}${NB}% à ${FLOOR}${NB}% et plus.`],
  [`Au-dessus de ${FLOOR}${NB}%, il n’en reste que sept.`],
  [`Six sont au nord ou à l’ouest : ${topSix.map(french).join(", ")}.`],
  [`Le septième est l’${french(ODD_ONE)}, ${one(value.get(ODD_ONE))}${NB}% — et ses ${neighbours.length} voisins sont tous sous ${CEILING}${NB}%.`],
  [`L’${french(unreported[0]).replace(/^U/, "U")} n’a pas de production rapportée en ${YEAR}. La Russie et la Turquie sont colorées sur leur part nationale ; le cadre n’en montre que l’extrémité occidentale.`],
];
const names = [
  ...topSix.map((iso) => ({ iso, text: french(iso), role: "top" })),
  { iso: ODD_ONE, text: `${french(ODD_ONE)} · ${pct0(value.get(ODD_ONE))}`, role: "odd" },
  ...neighbours.map((iso) => ({ iso, text: `${french(iso)} · ${pct0(value.get(iso))}`, role: "neighbour" })),
  { iso: unreported[0], text: `${french(unreported[0])} · donnée non rapportée`, role: "missing" },
];
const WATERS = [
  { text: "Mer du Nord", lon: 3.0, lat: 56.5 },
  { text: "Méditerranée", lon: 15.0, lat: 36.0 },
  { text: "Baltique", lon: 19.5, lat: 58.0 },
].map((w) => {
  const [x, y] = geometry.project([w.lon, w.lat]);
  return { text: w.text, x, y };
});
const topCount = { template: `{n} pays au-dessus de ${FLOOR}${NB}%`, value: above.length };
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · contours Natural Earth 50 m";
const alt =
  `Carte choroplèthe de l’Europe : la part d’électricité bas-carbone de ${value.size} pays en ${YEAR}, en six classes. ` +
  `Sept pays dépassent ${FLOOR} % : ${above.map(french).join(", ")}. L’${french(ODD_ONE)}, à ${one(value.get(ODD_ONE))} %, ` +
  `a ${neighbours.length} voisins tous sous ${CEILING} %.`;

const STATES = [
  { classes: 0, filter: 0, top: 0, zoom: 0, odd: 0, missing: 0 },
  { classes: 1, filter: 0, top: 0, zoom: 0, odd: 0, missing: 0 },
  { classes: 1, filter: 1, top: 0, zoom: 0, odd: 0, missing: 0 },
  { classes: 1, filter: 1, top: 1, zoom: 0, odd: 0, missing: 0 },
  { classes: 1, filter: 0, top: 0, zoom: 1, odd: 1, missing: 0 },
  { classes: 1, filter: 0, top: 1, zoom: 0, odd: 1, missing: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${names.map((n) => n.text).join(" ")} ${BREAKS.map((b) => `${b}${NB}%`).join(" ")} part bas-carbone de la production donnée non rapportée 0123456789`,
  annot: WATERS.map((w) => w.text).join(" "),
  value: `${topCount.template} 0123456789`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: BREAKS.length + 1 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log(`${french(ODD_ONE)} ${one(value.get(ODD_ONE))} · voisins ${neighbours.map((i) => `${french(i)} ${one(value.get(i))}`).join(", ")}\n`);

const driver = await readFile(join(HERE, "choropleth-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["pays", "classes", "sept", "nord-ouest", "albanie", "retour"][i], prose: p })),
      reveal: {
        element: createElement(DirectedChoroplethScrolly, {
          shapes: geometry.shapes.map((s) => ({
            iso: s.iso,
            path: s.path,
            seat: s.seat,
            value: value.has(s.iso) ? value.get(s.iso) : null,
            studied: studySet.has(s.iso),
            classIndex: value.has(s.iso) ? classOf(value.get(s.iso)) : null,
          })),
          ...FRAME,
          zoomBox,
          breaks: BREAKS.map((b) => `${b}${NB}%`),
          names,
          topCount,
          unit: "part bas-carbone de la production",
          missingLabel: "donnée non rapportée",
          waters: WATERS,
          alt,
          regs,
          pad: direction.pad,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
          grid,
          water: plateTints(direction),
        }),
        states: STATES,
        driver,
        apply: "applyChoroplethState",
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

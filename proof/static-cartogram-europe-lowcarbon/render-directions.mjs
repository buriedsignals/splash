// twin/proof/static-cartogram-europe-lowcarbon/render-directions.mjs
//
// Europe's low-carbon electricity, one equal tile per country, drawn once per filed direction through
// the design base. The first `cartogram` beat in this tree, and the fifth map beat.
//
// IT IS THE SECOND HALF OF A PAIR WITH `proof/static-choropleth-europe-lowcarbon`, and the pair is
// the argument: on a choropleth the ink is proportional to TERRITORY, and this beat computes what
// that costs — the area-weighted mean against the country mean, from the same frozen shapes the
// choropleth draws.
//
// Usage:  bun proof/static-cartogram-europe-lowcarbon/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedTileCartogram } from "./DirectedTileCartogram.tsx";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
/** THE SIZE THIS RUN DRAWS AT, and whether this beat's own type may enter it at all: a tall frame is a
 *  different drawing, not a stretched one, and `type-at-size.mjs` refuses a type whose range nobody has
 *  measured rather than shipping an aspect nobody chose. */
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const refused = [];

const CLEAN = [
  "hydro_generation__twh", "wind_generation__twh", "solar_generation__twh",
  "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh",
];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];

/** THE LAYOUT IS DESIGNED, NOT DERIVED, and that is stated on the plate. No algorithm placed these
 *  tiles: a person did, to keep each country roughly where a reader expects to find it. It is the
 *  one thing on this plate a reader cannot check against the source, so it is the one thing the
 *  plate says outright about itself. */
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

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rowsRaw = csv.slice(1).map((l) => {
  const cells = l.split(",");
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});

const share = new Map();
for (const raw of rowsRaw) {
  if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
  const clean = CLEAN.reduce((s, k) => s + Number(raw[k] || 0), 0);
  const total = clean + FOSSIL.reduce((s, k) => s + Number(raw[k] || 0), 0);
  share.set(raw.code, total > 0 ? (clean / total) * 100 : null);
}

/** THE GRID AND THE DATA HAVE TO AGREE, BOTH WAYS. A hand-authored layout is exactly the artefact
 *  that drifts from its data silently — a country renamed in the source, a tile mistyped — and the
 *  symptom is a blank square nobody notices. */
const placed = [];
GRID.forEach((line, row) => {
  line.trim().split(/\s+/).forEach((code, col) => {
    if (code === "..") return;
    if (!share.has(code)) throw new Error(`the grid places ${code} and the data has no such code`);
    placed.push({ iso: code, col, row });
  });
});
const missingFromGrid = [...share.keys()].filter((c) => !placed.some((p) => p.iso === c));
if (missingFromGrid.length)
  throw new Error(`the data has ${missingFromGrid.join(", ")} and the grid has no tile for them`);
if (placed.length !== share.size)
  throw new Error(`${placed.length} tiles for ${share.size} countries`);

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const RAD = Math.PI / 180;
const LAT0 = 52 * RAD;
const LON0 = 10 * RAD;
const laea = (lon, lat) => {
  const la = lat * RAD;
  const lo = lon * RAD - LON0;
  const c = Math.sin(LAT0) * Math.sin(la) + Math.cos(LAT0) * Math.cos(la) * Math.cos(lo);
  const k = Math.sqrt(2 / Math.max(1e-9, 1 + c));
  return [k * Math.cos(la) * Math.sin(lo), -k * (Math.cos(LAT0) * Math.sin(la) - Math.sin(LAT0) * Math.cos(la) * Math.cos(lo))];
};
/** THE AREA EACH COUNTRY OCCUPIES ON THE SIBLING CHOROPLETH, computed from the same frozen shapes in
 *  the same projection that plate uses — so the comparison is between two drawings of one dataset,
 *  not between a drawing and an idea of one. */
const areaOf = (f) => {
  let a = 0;
  for (const poly of f.geometry.coordinates)
    for (const ring of poly) {
      const pts = ring.map(([x, y]) => laea(x, y));
      let s = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
        s += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
      a += Math.abs(s) / 2;
    }
  return a;
};
const area = {};
for (const f of geo.features) area[f.properties.iso] = (area[f.properties.iso] ?? 0) + areaOf(f);

const withData = [...share.entries()].filter(([, v]) => v !== null);
const byCountry = withData.reduce((s, [, v]) => s + v, 0) / withData.length;
const areaSum = withData.reduce((s, [c]) => s + (area[c] ?? 0), 0);
const byArea = withData.reduce((s, [c, v]) => s + v * (area[c] ?? 0), 0) / areaSum;
if (!(byCountry - byArea > 15))
  throw new Error(
    `the headline says the two readings are twenty points apart; they are ` +
      `${(byCountry - byArea).toFixed(1)} (${byCountry.toFixed(1)} by country, ${byArea.toFixed(1)} by area)`,
  );
/** And the reason, derived: the country that takes the most room on the choropleth is below the
 *  country mean, which is what drags the area reading down. */
const widest = withData.reduce((a, b) => ((area[b[0]] ?? 0) > (area[a[0]] ?? 0) ? b : a));
if (!(share.get(widest[0]) < byCountry))
  throw new Error(
    `the standfirst says the largest country on the map is below the country mean; ` +
      `${widest[0]} is at ${share.get(widest[0]).toFixed(1)} against ${byCountry.toFixed(1)}`,
  );
const widestShare = ((area[widest[0]] ?? 0) / areaSum) * 100;

const unreported = [...share.entries()].filter(([, v]) => v === null).map(([c]) => c);
console.log(
  `${share.size} pays · moyenne par pays ${byCountry.toFixed(1)} % · pondérée par l’aire ` +
    `${byArea.toFixed(1)} % · ${widest[0]} occupe ${widestShare.toFixed(0)} % du dessin à ` +
    `${share.get(widest[0]).toFixed(1)} % · sans donnée : ${unreported.join(", ") || "aucun"}\n`,
);

const BREAKS = [40, 60, 75, 94];
const classOf = (v) => (v === null ? null : BREAKS.filter((b) => v >= b).length);
const tiles = placed.map((p) => ({
  ...p,
  short: p.iso,
  value: share.get(p.iso),
  classIndex: classOf(share.get(p.iso)),
}));

const facts = beatFacts(
  withData.map(([c, v]) => ({ key: c, label: c, value: v })),
  {
    subject: widest[0],
    cells: tiles.map((t) => ({ key: t.iso, value: t.value ?? 0 })),
    impossibleCells: unreported.length,
    scaleClasses: BREAKS.length + 1,
    units: { count: tiles.length, thing: "pays" },
    geography: { areas: tiles.length, settlements: 0, waters: 0, basemap: false },
    declaredSequence: "low-carbon share",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

const plain = (s) => s.replace(/[   ]/g, " ");
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

const title = [
  `Compté par pays, le bas-carbone européen est à ${one(byCountry)} % ; compté au kilomètre carré, à ${one(byArea)} %`,
  `Par pays ${one(byCountry)} % de bas-carbone ; par territoire ${one(byArea)} %`,
  `Une tuile par pays`,
];
const limits = [
  `Une tuile égale par pays, rangée à peu près comme la carte. Sur un choroplèthe l’encre est ` +
    `proportionnelle au TERRITOIRE : la ${widest[0] === "RUS" ? "Russie" : widest[0]} occupe ` +
    `${Math.round(widestShare)} % du dessin à ${one(share.get(widest[0]))} % de bas-carbone, et tire ` +
    `la lecture vers le bas. Les deux moyennes sont vraies ; un choroplèthe ne peut en montrer qu’une.`,
  `Une tuile égale par pays. Sur un choroplèthe l’encre suit le territoire : ${one(byArea)} % au ` +
    `kilomètre carré contre ${one(byCountry)} % par pays.`,
  `Une tuile égale par pays : ${one(byCountry)} % de bas-carbone en moyenne.`,
];
const reading = [
  `Lecture : chaque tuile est un pays et vaut autant que les autres — c’est ce que cette forme ` +
    `achète, et elle le paie en géométrie. La disposition est dessinée à la main pour rester ` +
    `reconnaissable ; elle n’est mesurée sur rien.`,
  `Lecture : une tuile par pays, toutes de même taille. La disposition est dessinée, pas mesurée.`,
];
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · fonds Natural Earth 50 m";

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${tiles.map((t) => t.short).join(" ")} ${BREAKS.map((b) => `${b} %`).join(" ")} part bas-carbone donnée non rapportée`,
  annot: reading.join(" "),
  value: `${one(byCountry)} ${one(byArea)}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: BREAKS.length + 1 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  console.log(id);
  try {
    await renderStill({
      element: createElement(DirectedTileCartogram, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        tiles,
        cols: COLS,
        rows: ROWS,
        breaks: BREAKS.map((b) => `${b} %`),
        missingLabel: "donnée non rapportée",
        unit: "part bas-carbone de la production",
        title,
        limits,
        reading,
        source,
        alt:
          `Cartogramme en tuiles : ${tiles.length} pays européens, une tuile égale chacun, rangés à ` +
          `peu près comme sur la carte et teintés par leur part d’électricité bas-carbone en ${YEAR}. ` +
          `Comptée par pays la moyenne est de ${one(byCountry)} % ; pondérée par le territoire que ` +
          `chaque pays occupe sur un choroplèthe, ${one(byArea)} %. L’Ukraine, sans donnée ${YEAR}, ` +
          `est dans un neutre hors rampe.`,
        eyebrow: EYEBROW,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
      // THE SLOT'S OWN SIZE. `--size` picks it; landscape is what an article's column asks for and
      // what this lineage's tuning was measured at. The frame is half the export size at scale 2.
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    console.log(`  -> renders/${nameAtSize(id, SIZE)}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"])
      await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}
if (refused.length) console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);

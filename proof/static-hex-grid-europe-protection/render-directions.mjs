// twin/proof/static-hex-grid-europe-protection/render-directions.mjs
//
// Ukrainians under temporary protection PER 1 000 INHABITANTS, one hexagon per country, once per
// filed direction, through the design base. The first `hex grid` beat in this tree, and the last of
// the catalogue's forty forms to get one.
//
// IT IS THE FLOW MAP'S PAIR. `proof/static-flow-map-ukraine-protection` draws the COUNTS: Germany's
// ribbon is the widest on the plate and Poland's is second. Divide by the population and the order
// turns over — Czechia first at 36 per 1 000, Germany eleventh at 15, France last at 0.7. Neither
// number is the truer one; they answer different questions, and the two plates are how a reader can
// see that rather than be told it.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-hex-grid-europe-protection/render-directions.mjs

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
import { DirectedHexGrid } from "./DirectedHexGrid.tsx";
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
const EYEBROW = "Migrations · Europe";
const ORIGIN = "UKR";
const SUBJECT = "CZE";
const refused = [];

/** THE LAYOUT IS DESIGNED, NOT DERIVED, and the plate says so. Odd rows are offset by half a cell,
 *  which is what makes every neighbour an EDGE neighbour — the one thing a hexagon buys over a
 *  square, and the reason the reference's own layout is offered as a file to be edited by hand. */
const GRID = [
  ".   ISL .   .   NOR SWE FIN .",
  ".   .   IRL DNK .   EST LVA .",
  ".   .   NLD DEU POL LTU UKR .",
  ".   BEL LUX CHE CZE SVK HUN ROU",
  "PRT ESP FRA LIE AUT SVN HRV BGR",
  ".   .   MLT ITA .   GRC CYP .",
];
const NAMES = {
  DEU: "Allemagne", POL: "Pologne", CZE: "Tchéquie", ESP: "Espagne", ROU: "Roumanie",
  SVK: "Slovaquie", NLD: "Pays-Bas", IRL: "Irlande", BEL: "Belgique", AUT: "Autriche",
  NOR: "Norvège", BGR: "Bulgarie", CHE: "Suisse", FIN: "Finlande", PRT: "Portugal",
  FRA: "France", DNK: "Danemark", LTU: "Lituanie", HUN: "Hongrie", SWE: "Suède", GRC: "Grèce",
  ITA: "Italie", LVA: "Lettonie", EST: "Estonie", HRV: "Croatie", CYP: "Chypre", SVN: "Slovénie",
  ISL: "Islande", LUX: "Luxembourg", MLT: "Malte", LIE: "Liechtenstein", UKR: "Ukraine",
};

// ── the readings ────────────────────────────────────────────────────────────
const readCsv = async (name) => {
  const lines = (await readFile(join(HERE, name), "utf8")).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
};
const protection = await readCsv("protection.csv");
const population = await readCsv("population.csv");
const people = Object.fromEntries(protection.map((r) => [r.code, Number(r.people)]));
const inhabitants = Object.fromEntries(population.map((r) => [r.code, Number(r.population_2023)]));
const month = protection[0].month;

const hosts = protection.map((r) => r.code);
for (const code of hosts) {
  if (!Number.isFinite(people[code]) || people[code] <= 0)
    throw new Error(`${code} has no usable count`);
  if (!Number.isFinite(inhabitants[code]) || inhabitants[code] <= 0)
    throw new Error(`${code} has no population in the frozen file`);
}
const rate = (code) => (people[code] / inhabitants[code]) * 1000;

/** THE GRID IS CHECKED BOTH WAYS, as the tile cartogram's is: every code in the layout has a
 *  reading, and every reading has a cell. A hand-drawn layout is the one thing on this plate a
 *  reader cannot check against the source, so nothing else about it may be left unchecked. */
const cells = [];
GRID.forEach((row, r) =>
  row
    .trim()
    .split(/\s+/)
    .forEach((code, c) => {
      if (code === ".") return;
      cells.push({ code, row: r, col: c });
    }),
);
const laidOut = new Set(cells.map((c) => c.code));
for (const c of cells)
  if (c.code !== ORIGIN && !hosts.includes(c.code))
    throw new Error(`the layout places ${c.code}, which the protection file does not report`);
for (const code of hosts)
  if (!laidOut.has(code)) throw new Error(`${code} is reported and has no cell in the layout`);
for (const c of cells) if (!NAMES[c.code]) throw new Error(`${c.code} has no French name filed`);
if (!laidOut.has(ORIGIN)) throw new Error(`the origin ${ORIGIN} has no cell`);

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const ranked = [...hosts].sort((a, b) => rate(b) - rate(a));
const byCount = [...hosts].sort((a, b) => people[b] - people[a]);
const top = ranked[0];
const last = ranked[ranked.length - 1];
if (top !== SUBJECT)
  throw new Error(`the headline says ${SUBJECT} leads per inhabitant; ${top} does`);
if (byCount[0] === top)
  throw new Error(
    `the headline says the ranking turns over between counts and rates; the same country ` +
      `(${top}) leads both, so the pair with the flow map has nothing to show`,
  );
const germanyRank = ranked.indexOf(byCount[0]) + 1;
if (!(germanyRank > 5))
  throw new Error(
    `the standfirst says the largest host falls a long way once divided by population; it is ` +
      `${germanyRank}th of ${ranked.length}`,
  );
console.log(
  `${hosts.length} pays · ${month} · par habitant : ${top} ${rate(top).toFixed(1)} / 1 000, ` +
    `${byCount[0]} ${rate(byCount[0]).toFixed(1)} (${germanyRank}e), ${last} ${rate(last).toFixed(1)}\n`,
);
console.table(
  ranked.slice(0, 6).map((c) => ({
    pays: NAMES[c],
    "pour 1 000": rate(c).toFixed(1),
    personnes: people[c].toLocaleString("fr-FR"),
    "rang par nombre": byCount.indexOf(c) + 1,
  })),
);

const BREAKS = [5, 12, 18, 25];
const classOf = (code) => BREAKS.filter((b) => rate(code) >= b).length;
const tiles = cells.map((c) => ({
  ...c,
  name: NAMES[c.code],
  rate: c.code === ORIGIN ? null : rate(c.code),
  classIndex: c.code === ORIGIN ? null : classOf(c.code),
  isSubject: c.code === SUBJECT,
}));

const facts = beatFacts(
  hosts.map((c) => ({ key: c, label: NAMES[c], value: rate(c) })),
  {
    subject: NAMES[SUBJECT],
    cells: tiles.map((t) => ({ key: t.code, value: t.rate ?? 0 })),
    impossibleCells: 1,
    scaleClasses: BREAKS.length + 1,
    units: { count: hosts.length, thing: "pays" },
    geography: { areas: tiles.length, settlements: 0, waters: 0, basemap: false },
    declaredSequence: "per 1 000 inhabitants",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders covers. */
const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

const title = [
  `Par habitant, ce n’est pas l’Allemagne : la ${NAMES[top]} accueille ${one(rate(top))} Ukrainiens pour 1 000 habitants`,
  `Par habitant, la ${NAMES[top]} accueille ${one(rate(top))} Ukrainiens pour 1 000 habitants`,
  `La protection temporaire, par habitant`,
];
const limits = [
  `Un hexagone par pays, tous de même taille, rangés à peu près comme la carte : la couleur est le ` +
    `nombre d’Ukrainiens sous protection temporaire pour 1 000 habitants en ${month}. En nombre, ` +
    `l’Allemagne est première avec ${n0(people[byCount[0]] / 1000)} 000 personnes ; par habitant ` +
    `elle est ${germanyRank}e, à ${one(rate(byCount[0]))} pour 1 000, et la ${NAMES[last]} ferme la ` +
    `marche à ${one(rate(last))}.`,
  `Un hexagone par pays, tous de même taille : la couleur est le nombre d’Ukrainiens sous ` +
    `protection pour 1 000 habitants. L’Allemagne, première en nombre, est ${germanyRank}e par habitant.`,
  `Un hexagone par pays : les Ukrainiens sous protection pour 1 000 habitants.`,
];
const reading = [
  `Lecture : chaque pays pèse une case, quelle que soit sa taille — c’est ce que cette forme ` +
    `achète, et elle le paie en géographie. La disposition est dessinée à la main.`,
  `Lecture : chaque pays pèse une case. La disposition est dessinée, pas mesurée.`,
];
const source = `Sources : Eurostat (migr_asytpsm), ${month} · population 2023, via Our World in Data`;
const unit = "Ukrainiens sous protection temporaire pour 1 000 habitants";
const originNote = `L’Ukraine est sur la carte et hors du compte : c’est d’elle que viennent les personnes que les autres cases comptent.`;

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${unit} ${originNote} ${BREAKS.join(" ")} ${tiles.map((t) => t.code).join(" ")}`,
  annot: reading.join(" "),
  value: tiles.map((t) => (t.rate === null ? "" : one(t.rate))).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 4 };
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
      element: createElement(DirectedHexGrid, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        tiles,
        columns: Math.max(...GRID.map((r) => r.trim().split(/\s+/).length)),
        rows: GRID.length,
        breaks: BREAKS.map((b) => one(b)),
        unit,
        originNote,
        originCode: ORIGIN,
        title,
        limits,
        reading,
        source,
        // grounded-by-hand: alt:1000 — the denominator of the rate the plate draws, declared by the
        // beat and printed in its own unit line; it is not a reading from either frozen file.
        alt:
          `Grille d’hexagones : un hexagone par pays européen, tous de même taille, rangés à peu ` +
          `près comme la carte. La teinte donne le nombre d’Ukrainiens sous protection temporaire ` +
          `pour 1 000 habitants en ${month}. La ${NAMES[top]} est la plus foncée à ` +
          `${one(rate(top))} pour 1 000, devant la ${NAMES[ranked[1]]} et la ${NAMES[ranked[2]]} ; ` +
          `l’Allemagne, première en nombre absolu, n’est que ${germanyRank}e ici avec ` +
          `${one(rate(byCount[0]))}, et la ${NAMES[last]} est la plus claire à ${one(rate(last))}. ` +
          `L’Ukraine a sa case, hors du compte.`,
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
    console.log(`  -> renders/${id}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${id}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}
if (refused.length) console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);

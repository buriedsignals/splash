// Six countries' electricity mixes, 2024, rendered once per FILED DIRECTION into a self-contained scrolly page. The
// `marimekko` type in the scrolly format.
//
// THE SUBJECT OF `static-marimekko-electricity-mix`, CHOREOGRAPHED. The columns, the stacking order and the assertions
// are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. six equal columns, each 100 %;
//   2. each column takes the width of its generation: an area becomes a quantity;
//   3. coal alone;
//   4. the coal bands gathered into one column, area kept;
//   5. back in their columns, every source named;
//   6. the static plate, shares written in.
//
// Usage:  bun proof/scrolly-marimekko-electricity-mix/render-directions-scrolly.mjs

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
import { DirectedMarimekkoScrolly } from "./DirectedMarimekkoScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const TRACKED = "Coal";
/** Stacked bottom to top in family order: fossil, nuclear, renewables — the order is the encoding. */
const SOURCES = [
  { key: "Coal", label: "charbon" },
  { key: "Oil", label: "pétrole" },
  { key: "Gas", label: "gaz" },
  { key: "Nuclear", label: "nucléaire" },
  { key: "Bioenergy", label: "bioénergie" },
  { key: "Other renewables", label: "autres renouv." },
  { key: "Hydropower", label: "hydraulique" },
  { key: "Solar", label: "solaire" },
  { key: "Wind", label: "éolien" },
];
const FRENCH = { France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"], Norway: ["Norvège", "la Norvège"], Poland: ["Pologne", "la Pologne"], Sweden: ["Suède", "la Suède"], Switzerland: ["Suisse", "la Suisse"] };

// ── the columns, and the static beat's own assertions ──────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rows = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]]))).filter((r) => Number(r.Year) === YEAR);
const missing = header.slice(3).filter((h) => !SOURCES.some((s) => s.key === h));
if (missing.length) throw new Error(`unstacked source(s): ${missing.join(", ")}`);
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const whole = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const percent = (share) => (share >= 0.095 ? `${Math.round(share * 100)}${NB}%` : share >= 0.005 ? `${plainSpaces((share * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }))}${NB}%` : "");
const columns = rows
  .map((r) => {
    if (!FRENCH[r.Entity]) throw new Error(`no French name recorded for ${r.Entity}`);
    const total = SOURCES.reduce((s, src) => s + Number(r[src.key]), 0);
    return {
      key: r.Code,
      entity: r.Entity,
      label: FRENCH[r.Entity][0],
      total,
      totalText: whole(total),
      trackedText: `${whole(Number(r[TRACKED]))}${NB}TWh`,
      bands: SOURCES.map((src) => ({ key: src.key, value: Number(r[src.key]), pct: percent(Number(r[src.key]) / total) })),
    };
  })
  .sort((a, b) => b.total - a.total);
for (const col of columns) if (Math.abs(col.bands.reduce((s, b) => s + b.value, 0) - col.total) > 1e-9) throw new Error(`${col.key}: bands do not sum to the column's total`);
const grand = columns.reduce((s, c) => s + c.total, 0);
const trackedOf = (c) => c.bands.find((b) => b.key === TRACKED).value;
const trackedTotal = columns.reduce((s, c) => s + trackedOf(c), 0);
const trackedShare = trackedTotal / grand;
const holders = [...columns].sort((a, b) => trackedOf(b) - trackedOf(a));
const topTwoShare = (trackedOf(holders[0]) + trackedOf(holders[1])) / trackedTotal;
if (topTwoShare < 0.95) throw new Error(`the headline says two countries hold nearly all of the coal; they hold ${(topTwoShare * 100).toFixed(1)} %`);
if (Math.round(trackedShare * 100) !== 12) throw new Error(`the headline says coal is 12 % of the six; it is ${(trackedShare * 100).toFixed(1)} %`);
const [h1, h2] = holders;
console.log(`${columns.length} colonnes · ${whole(grand)} TWh · charbon ${trackedTotal.toFixed(1)} (${(trackedShare * 100).toFixed(1)} %) · ${h1.key}+${h2.key} ${(topTwoShare * 100).toFixed(1)} %\n`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Le charbon fait ${Math.round(trackedShare * 100)}${NB}% de l’électricité de ces six pays, et il tient dans deux colonnes`,
  `Le charbon de six pays tient dans deux colonnes`,
  `Six mix électriques, ${YEAR}`,
];
const prose = [
  [`La production électrique de six pays européens en ${YEAR}, par source : du charbon, en bas, à l’éolien, en haut. Chaque colonne fait 100${NB}%.`],
  [`Donnons à chaque colonne la largeur de sa production, de ${whole(columns[0].total)}${NB}TWh en ${columns[0].label} à ${whole(columns[columns.length - 1].total)}${NB}TWh en ${columns[columns.length - 1].label}. L’aire d’une bande devient une quantité.`],
  [`Le charbon seul : ${one(trackedTotal)}${NB}TWh, ${Math.round(trackedShare * 100)}${NB}% de l’électricité des six.`],
  [`Rassemblons-le en une colonne. ${cap(FRENCH[h1.entity][1])} et ${FRENCH[h2.entity][1]} en produisent ${one(topTwoShare * 100)}${NB}%.`],
  [`Toutes les sources reprennent leur place, dans le même ordre dans chaque colonne.`],
  [`Lecture : la largeur d’une colonne est la production du pays, sa hauteur son mix. Les parts sous 0,5${NB}% sont dessinées mais pas chiffrées.`],
];
function cap(s) {
  return s[0].toUpperCase() + s.slice(1);
}
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  heightNote: "part de la production du pays",
  widthName: "largeur : production totale, en TWh",
  grandNote: `${whole(grand)}${NB}TWh au total`,
  trackedNote: `charbon${NB}: ${one(trackedTotal)}${NB}TWh, ${Math.round(trackedShare * 100)}${NB}%`,
  stackNote: `${FRENCH[h1.entity][0]} + ${FRENCH[h2.entity][0]}${NB}: ${one(topTwoShare * 100)}${NB}%`,
  stackLabel: `charbon ${Math.round(trackedShare * 100)}${NB}%`,
};
const alt =
  `Marimekko : six colonnes, une par pays, larges comme leur production électrique de ${YEAR} et découpées par source. ` +
  `Le charbon fait ${one(trackedShare * 100)} % du total, dont ${one(topTwoShare * 100)} % en ${FRENCH[h1.entity][0]} et en ${FRENCH[h2.entity][0]}.`;

/** One state per card; see `marimekko-drive.mjs` for what each field paints. */
const STATES = [
  { width: 0, tracked: 0, stack: 0, labels: 1, pct: 0 },
  { width: 1, tracked: 0, stack: 0, labels: 1, pct: 0 },
  { width: 1, tracked: 1, stack: 0, labels: 1, pct: 0 },
  { width: 1, tracked: 1, stack: 1, labels: 0, pct: 0 },
  { width: 1, tracked: 0, stack: 0, labels: 1, pct: 0 },
  { width: 1, tracked: 0, stack: 0, labels: 1, pct: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.heightNote} ${words.widthName} ${columns.flatMap((c) => c.bands.map((b) => b.pct)).join(" ")}`,
  annot: `${columns.map((c) => c.label).join(" ")} ${SOURCES.map((s) => s.label).join(" ")}`,
  value: `${columns.map((c) => `${c.label} ${c.trackedText}`).join(" ")} ${columns.map((c) => c.totalText).join(" ")} ${words.grandNote} ${words.trackedNote} ${words.stackNote} ${words.stackLabel}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "marimekko-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["mix", "largeur", "charbon", "rassemble", "sources", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedMarimekkoScrolly, { columns, sources: SOURCES, tracked: TRACKED, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
        states: STATES,
        driver,
        apply: "applyMarimekkoState",
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

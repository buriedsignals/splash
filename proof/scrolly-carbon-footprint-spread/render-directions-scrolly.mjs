// CO₂ emissions per person in 213 countries, 2023, rendered once per FILED DIRECTION into a self-contained scrolly page.
// The `histogram` type in the scrolly format.
//
// THE SUBJECT OF `static-carbon-footprint-spread`, CHOREOGRAPHED. The countries, the bins, the claim and its assertions
// are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. every country a dot at its own value, Qatar far out at 40 tonnes;
//   2. the dots falling into their 4-tonne bins: the histogram;
//   3. the 4-tonne cut: 127 of 213 under it;
//   4. the median, 3.1 tonnes;
//   5. the far tail named;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-carbon-footprint-spread/render-directions-scrolly.mjs

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
import { DirectedSpreadScrolly } from "./DirectedSpreadScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const NB = "\u00A0";
const YEAR = 2023;
const BIN_WIDTH = 4;
const BIN_COUNT = 10;
const THRESHOLD = 4;
/** The far tail: every country at or above this many tonnes is named on card 5. */
const TAIL_FROM = 16;
const TAIL_NAMES = { SXM: "Sint-Maarten", NCL: "Nouvelle-Calédonie", ARE: "Émirats arabes unis", SAU: "Arabie saoudite", TTO: "Trinité-et-Tobago", BHR: "Bahreïn", KWT: "Koweït", BRN: "Brunei", QAT: "Qatar" };

// ── the countries, and the static beat's own assertions ────────────────────────────────────────
const lines = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const countries = lines
  .slice(1)
  .map((l) => {
    const cells = l.split(",");
    return { entity: cells[0], code: cells[1], year: Number(cells[2]), value: Number(cells[3]) };
  })
  .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.value));
for (const r of countries) if (r.year !== YEAR) throw new Error(`${r.entity} is not ${YEAR}`);
const n = countries.length;
const bins = Array.from({ length: BIN_COUNT }, (_, i) => {
  const lo = i * BIN_WIDTH;
  const open = i === BIN_COUNT - 1;
  return { lo, open, count: countries.filter((c) => (open ? c.value >= lo : c.value >= lo && c.value < lo + BIN_WIDTH)).length, label: open ? `${lo}+` : `${lo}–${lo + BIN_WIDTH}` };
});
if (bins.reduce((s, b) => s + b.count, 0) !== n) throw new Error("the bins do not account for every country");
const under = countries.filter((c) => c.value < THRESHOLD).length;
const shareTenths = Math.round((under / n) * 10);
if (shareTenths !== 6) throw new Error(`the headline says six countries in ten emit under ${THRESHOLD} t; ${under} of ${n} is ${(under / n * 100).toFixed(0)} %`);
const sorted = [...countries].sort((a, b) => a.value - b.value);
const median = n % 2 ? sorted[(n - 1) / 2].value : (sorted[n / 2 - 1].value + sorted[n / 2].value) / 2;
if (!(median < THRESHOLD)) throw new Error(`card 4 says the median sits under the cut; it is ${median.toFixed(2)}`);
const tail = sorted.filter((c) => c.value >= TAIL_FROM).reverse();
const missingNames = tail.filter((c) => !TAIL_NAMES[c.code]).map((c) => c.code);
if (missingNames.length || tail.length !== Object.keys(TAIL_NAMES).length) throw new Error(`card 5 names ${Object.keys(TAIL_NAMES).join(", ")} as the countries at ${TAIL_FROM} t or more; the data has ${tail.map((c) => c.code).join(", ")}`);
const furthest = tail[0];
if (furthest.code !== "QAT") throw new Error(`card 1 names Qatar as the furthest out; it is ${furthest.code}`);
console.log(`${n} pays · ${under} sous ${THRESHOLD} t · médiane ${median.toFixed(2)} · queue ${tail.map((c) => c.code).join(", ")} · ${bins.map((b) => b.count).join("/")}\n`);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [`${shareTenths} pays sur 10 émettent moins de ${THRESHOLD} tonnes de CO₂ par personne`, `${shareTenths} pays sur 10 sous ${THRESHOLD} tonnes de CO₂ par personne`, `Le CO₂ par personne, pays par pays`];
const prose = [
  [`Les ${n} pays du monde en ${YEAR}, chacun un point placé à ses tonnes de CO₂ par personne. La plupart sont serrés à gauche ; le Qatar est seul tout à droite, à ${one(furthest.value)}${NB}t.`],
  [`Faisons tomber les points par tranche de ${BIN_WIDTH}${NB}tonnes. Chaque pays compte pour un, sans pondération par la population.`],
  [`Sous ${THRESHOLD}${NB}tonnes : ${under} pays sur ${n}, six sur dix.`],
  [`La moitié des pays émet moins de ${one(median)}${NB}t par personne : c’est la médiane.`],
  [`À l’autre bout, ${tail.length} pays dépassent ${TAIL_FROM}${NB}tonnes, surtout des producteurs de pétrole et de gaz.`],
  [`Lecture : chaque barre compte les pays d’une tranche de ${BIN_WIDTH}${NB}tonnes par personne ; la dernière réunit tous ceux au-delà de ${(BIN_COUNT - 1) * BIN_WIDTH}.`],
];
const source = "Source : Global Carbon Budget (2025), via Our World in Data";
const words = {
  unit: `tonnes de CO₂ par personne, ${YEAR}`,
  dotNote: `${n} pays, un point chacun`,
  binNote: `par tranche de ${BIN_WIDTH}${NB}t`,
  cutNote: `${under} pays sur ${n} sous ${THRESHOLD}${NB}t`,
  medianNote: `médiane${NB}: ${one(median)}${NB}t`,
  tailNote: `${tail.length} pays au-delà de ${TAIL_FROM}${NB}t`,
  readNote: "chaque pays compte pour un",
  cutLabel: `${under} pays sous ${THRESHOLD}${NB}t`,
  medianLabel: `médiane ${one(median)}${NB}t`,
};
const alt =
  `Histogramme : ${n} pays répartis selon leurs émissions de CO₂ par personne en ${YEAR}, par tranches de ${BIN_WIDTH} tonnes. ` +
  `${under} pays sur ${n} émettent moins de ${THRESHOLD} tonnes ; la médiane est de ${one(median)} tonnes ; le Qatar est à ${one(furthest.value)} tonnes.`;

/** One state per card; see `spread-drive.mjs` for what each field paints. */
const STATES = [
  { stack: 0, bars: 0, cut: 0, median: 0, tail: 1, note: 0 },
  { stack: 1, bars: 0, cut: 0, median: 0, tail: 0, note: 1 },
  { stack: 1, bars: 0, cut: 1, median: 0, tail: 0, note: 2 },
  { stack: 1, bars: 0, cut: 1, median: 1, tail: 0, note: 3 },
  { stack: 1, bars: 0, cut: 0, median: 0, tail: 2, note: 4 },
  { stack: 1, bars: 1, cut: 1, median: 0, tail: 0, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${bins.map((b) => b.label).join(" ")} ${Object.values(TAIL_NAMES).join(" ")}`,
  annot: `${words.cutLabel} ${words.medianLabel}`,
  value: `${bins.map((b) => b.count).join(" ")} ${Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "spread-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["points", "tranches", "seuil", "mediane", "queue", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedSpreadScrolly, {
          countries: countries.map((c) => ({ code: c.code, value: c.value })),
          bins,
          binWidth: BIN_WIDTH,
          threshold: THRESHOLD,
          median,
          tail: tail.map((c) => ({ code: c.code, label: TAIL_NAMES[c.code] })),
          words,
          alt,
          regs,
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
          grid,
        }),
        states: STATES,
        driver,
        apply: "applySpreadState",
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

// Solar's share of electricity in the EU's six most populous countries, 2010–2024, rendered once per FILED DIRECTION
// into a self-contained scrolly page. The `small multiples` type in the scrolly format.
//
// THE SUBJECT OF `static-small-multiples-solar-eu-six`, CHOREOGRAPHED. The six (a rule fixed before any solar figure
// was read), the readings, the claim and its assertions are the static beat's own; the scroll tells them with its own
// gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. six panels on one scale, 2010 alone: a point each, all under 3 %;
//   2. the lines drawn year by year to 2024;
//   3. the 10 % floor across every panel: four above;
//   4. the six lines laid on one chart;
//   5. the trap: every panel on its own scale, France climbing like Spain — said to be false;
//   6. back to the shared scale: the static plate.
//
// Usage:  bun proof/scrolly-small-multiples-solar-eu-six/render-directions-scrolly.mjs

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
import { DirectedSolarScrolly } from "./DirectedSolarScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Union européenne";
const NB = "\u00A0";
/** The six most populous member states: a rule external to the data, fixed before any solar figure was read. */
const EU_SIX = ["Germany", "France", "Italy", "Spain", "Poland", "Romania"];
const FIRST = 2010;
const LAST = 2024;
const FLOOR = 10;
const FRENCH = { Germany: ["Allemagne", "en Allemagne"], France: ["France", "en France"], Italy: ["Italie", "en Italie"], Spain: ["Espagne", "en Espagne"], Poland: ["Pologne", "en Pologne"], Romania: ["Roumanie", "en Roumanie"] };
const NUMBER_WORDS = ["aucun", "un", "deux", "trois", "quatre", "cinq", "six"];

// ── the readings, and the static beat's own assertions ─────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rows = csv.slice(1).map((l) => {
  if (l.includes('"')) throw new Error(`quoted field in frozen data: ${l}`);
  return Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]]));
});
const entities = [...new Set(rows.map((r) => r.Entity))].sort();
if (JSON.stringify(entities) !== JSON.stringify([...EU_SIX].sort())) throw new Error(`frozen data holds ${entities.join(", ")}, expected the six selected countries`);
const years = [];
for (let y = FIRST; y <= LAST; y++) years.push(y);
const base = EU_SIX.map((country) => {
  const readings = rows.filter((r) => r.Entity === country).map((r) => ({ year: Number(r.Year), value: Number(r.Solar) })).sort((a, b) => a.year - b.year);
  if (readings.length !== years.length) throw new Error(`${country} has ${readings.length} readings, expected ${years.length}`);
  readings.forEach((r, i) => {
    if (r.year !== years[i]) throw new Error(`${country} is missing ${years[i]}`);
    if (!(r.value >= 0 && r.value <= 100)) throw new Error(`${country} ${r.year} is ${r.value}, not a share`);
  });
  const values = readings.map((r) => r.value);
  return { key: country, values, first: values[0], last: values[values.length - 1] };
}).sort((a, b) => b.last - a.last);
for (const p of base) if (!(p.last > p.first)) throw new Error(`the headline says solar rose in every one; ${p.key} did not`);
const ceiling2010 = Math.ceil(Math.max(...base.map((p) => p.first)));
if (ceiling2010 !== 3) throw new Error(`card 1 says all six were under 3 % in 2010; the highest was ${Math.max(...base.map((p) => p.first)).toFixed(2)}`);
const aboveFloor = base.filter((p) => p.last > FLOOR);
if (aboveFloor.length !== 4) throw new Error(`card 3 says four of the six passed ${FLOOR} %; ${aboveFloor.length} did`);
const [top] = base;
const bottom = base[base.length - 1];
if (top.key !== "Spain" || bottom.key !== "France") throw new Error(`cards 4 and 5 compare Spain on top with France at the bottom; the order is ${base.map((p) => p.key).join(", ")}`);
const niceMax = (v) => Math.ceil(v / 5) * 5;
const sharedMax = niceMax(Math.max(...base.flatMap((p) => p.values)));
/** Card 5's sentence: on its own scale, France's line climbs as far up its panel as Spain's — a rise of 4 points drawn
 *  at the height of one of 18. Both own ceilings are asserted to be filled to within the same fifth. */
const fill = (p) => p.last / niceMax(Math.max(...p.values));
if (!(Math.abs(fill(bottom) - fill(top)) < 0.2)) throw new Error(`card 5 says France would climb like Spain on its own scale; their fills are ${fill(bottom).toFixed(2)} and ${fill(top).toFixed(2)}`);
console.log(`${base.map((p) => `${p.key} ${p.first.toFixed(1)}→${p.last.toFixed(1)}`).join(" · ")} · échelle ${sharedMax} · au-dessus de ${FLOOR} : ${aboveFloor.length}\n`);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const panels = base.map((p) => ({ key: p.key, label: FRENCH[p.key][0], values: p.values.map((v) => Math.round(v * 1000) / 1000), ownMax: niceMax(Math.max(...p.values)) }));
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Le solaire faisait moins de ${ceiling2010}${NB}% de l’électricité des six plus grands pays de l’UE en ${FIRST} ; en ${LAST}, plus d’un dixième dans ${NUMBER_WORDS[aboveFloor.length]} d’entre eux`,
  `Le solaire dépasse un dixième de l’électricité dans ${NUMBER_WORDS[aboveFloor.length]} des six plus grands pays de l’UE`,
  `Le solaire dans les six plus grands pays de l’UE`,
];
const prose = [
  [`Les six pays les plus peuplés de l’Union européenne, un panneau chacun, tous à la même échelle. En ${FIRST}, le solaire fait moins de ${ceiling2010}${NB}% de leur électricité : ${one(top.first)}${NB}% en Espagne, 0${NB}% en Pologne et en Roumanie.`],
  [`Année par année jusqu’en ${LAST}.`],
  [`Au-dessus de ${FLOOR}${NB}% en ${LAST} : ${listOf(aboveFloor.map((p) => FRENCH[p.key][0]))}.`],
  [`Les six courbes sur un même graphique : l’Espagne en haut, ${one(top.last)}${NB}% ; la France en bas, ${one(bottom.last)}${NB}%.`],
  [`Si chaque panneau avait sa propre échelle, la France monterait aussi haut que l’Espagne. C’est faux : c’est pourquoi les six panneaux partagent la même.`],
  [`Lecture : une courbe par pays, toutes à la même échelle, de 0 à ${sharedMax}${NB}%. Un panneau plat est une tendance plate.`],
];
const source = "Source : Ember, via Our World in Data · données annuelles jusqu’en 2024";
const words = {
  unit: "part du solaire dans l’électricité du pays, en %",
  startNote: `${FIRST}${NB}: tous sous ${ceiling2010}${NB}%`,
  yearNote: "{year}",
  floorNote: `${NUMBER_WORDS[aboveFloor.length]} sur six au-dessus de ${FLOOR}${NB}%`,
  mergeNote: `${FRENCH[top.key][0]} ${one(top.last)}${NB}% · ${FRENCH[bottom.key][0]} ${one(bottom.last)}${NB}%`,
  ownNote: `échelles propres${NB}: trompeur`,
  sharedNote: `même échelle, 0–${sharedMax}${NB}%`,
  floorLabel: `${FLOOR}${NB}%`,
};
const alt =
  `Six petits graphiques en courbes, un par pays parmi les six plus peuplés de l’UE, tous à la même échelle : la part du solaire dans l’électricité de ${FIRST} à ${LAST}. ` +
  `Tous partent sous ${ceiling2010} % ; en ${LAST} l’Espagne atteint ${one(top.last)} %, l’Allemagne, l’Italie et la Pologne dépassent ${FLOOR} %, la France reste à ${one(bottom.last)} %.`;

/** One state per card; see `solar-drive.mjs` for what each field paints. */
const STATES = [
  { year: FIRST, floor: 0, merge: 0, own: 0, note: 0 },
  { year: LAST, floor: 0, merge: 0, own: 0, note: 1 },
  { year: LAST, floor: 1, merge: 0, own: 0, note: 2 },
  { year: LAST, floor: 0, merge: 1, own: 0, note: 3 },
  { year: LAST, floor: 0, merge: 0, own: 1, note: 4 },
  { year: LAST, floor: 0, merge: 0, own: 0, note: 5 },
];
const ticks = [0, 10, 20].filter((t) => t <= sharedMax);

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${ticks.join(" ")} ${panels.map((p) => `${p.ownMax} %`).join(" ")} ${FIRST} 2017 ${LAST} ${words.floorLabel}`,
  annot: panels.map((p) => p.label).join(" "),
  value: `${Object.entries(words).filter(([k]) => !["unit", "floorLabel"].includes(k)).map(([, v]) => v).join(" ")} 0123456789,%`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "solar-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: [`panneaux-${FIRST}`, "annees", "seuil", "superposition", "echelles-propres", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedSolarScrolly, { panels, years, sharedMax, ticks, floor: FLOOR, xTicks: [FIRST, 2017, LAST], words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
        states: STATES,
        driver,
        apply: "applySolarState",
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

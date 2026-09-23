// Sixteen European countries' low-carbon electricity, 2000 and 2024, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `small multiples` type in the scrolly format.
//
// THE SUBJECT OF `static-small-multiples-lowcarbon`, CHOREOGRAPHED. The panels, the shared scale, the claim and its
// assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. sixteen panels in alphabetical order, the 2000 bars alone;
//   2. the 2024 bars growing, every change written: all sixteen rose;
//   3. the panels re-ordered by their 2000 level: the gains shrink along the grid;
//   4. every panel condensed into a point, 2000 level against gain: the correlation drawn;
//   5. back to panels ordered by gain, the two extremes in the accent;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-small-multiples-lowcarbon/render-directions-scrolly.mjs

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
import { DirectedMultiplesScrolly } from "./DirectedMultiplesScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FROM = 2000;
const TO = 2024;
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const FRENCH = {
  Austria: ["Autriche", "l’Autriche"], Belgium: ["Belgique", "la Belgique"], Czechia: ["Tchéquie", "la Tchéquie"], Denmark: ["Danemark", "le Danemark"],
  Finland: ["Finlande", "la Finlande"], France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"], Greece: ["Grèce", "la Grèce"],
  Ireland: ["Irlande", "l’Irlande"], Italy: ["Italie", "l’Italie"], Netherlands: ["Pays-Bas", "les Pays-Bas"], Poland: ["Pologne", "la Pologne"],
  Portugal: ["Portugal", "le Portugal"], Spain: ["Espagne", "l’Espagne"], Sweden: ["Suède", "la Suède"], "United Kingdom": ["Royaume-Uni", "le Royaume-Uni"],
};

// ── the panels, and the static beat's own assertions ───────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rowsRaw = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
const shareOf = (raw) => {
  const clean = CLEAN.reduce((s, k) => s + Number(raw[k] || 0), 0);
  const total = clean + FOSSIL.reduce((s, k) => s + Number(raw[k] || 0), 0);
  if (!(total > 0)) throw new Error(`${raw.entity} reports no generation in ${raw.year}`);
  return (clean / total) * 100;
};
const entities = [...new Set(rowsRaw.map((r) => r.entity))];
const base = entities.map((entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  const a = rowsRaw.find((r) => r.entity === entity && Number(r.year) === FROM);
  const b = rowsRaw.find((r) => r.entity === entity && Number(r.year) === TO);
  if (!a || !b) throw new Error(`${entity} is missing ${FROM} or ${TO}`);
  const from = shareOf(a);
  const to = shareOf(b);
  return { key: entity, label: FRENCH[entity][0], from, to, delta: to - from };
});
const fell = base.filter((p) => p.delta <= 0);
if (fell.length) throw new Error(`card 2 says all ${base.length} rose; ${fell.map((p) => p.key).join(", ")} did not`);
const n = base.length;
const mean = (xs) => xs.reduce((s, v) => s + v, 0) / n;
const mx = mean(base.map((p) => p.from));
const my = mean(base.map((p) => p.delta));
const cov = base.reduce((s, p) => s + (p.from - mx) * (p.delta - my), 0);
const vx = base.reduce((s, p) => s + (p.from - mx) ** 2, 0);
const r = cov / Math.sqrt(vx * base.reduce((s, p) => s + (p.delta - my) ** 2, 0));
if (!(r < -0.5)) throw new Error(`card 4 says the lowest starters gained most; the correlation is ${r.toFixed(2)}`);
const slope = cov / vx;
const fit = [slope, my - slope * mx];
const byGain = [...base].sort((a, b) => b.delta - a.delta);
const [biggest, smallest] = [byGain[0], byGain[n - 1]];
const highestStart = base.reduce((a, b) => (b.from > a.from ? b : a));
if (smallest.key !== highestStart.key) throw new Error(`card 5 says the smallest gain belongs to the highest starter; ${smallest.key} against ${highestStart.key}`);
const ceiling = Math.ceil(Math.max(...base.flatMap((p) => [p.from, p.to])) / 25) * 25;
if (ceiling !== 100) throw new Error(`the shared scale is written as 0–100 %; the data needs ${ceiling}`);
const lowest = base.reduce((a, b) => (b.from < a.from ? b : a));
console.log(`${n} panneaux · r ${r.toFixed(2)} · pente ${slope.toFixed(2)} · ${biggest.key} +${biggest.delta.toFixed(1)} · ${smallest.key} +${smallest.delta.toFixed(1)}\n`);

const panels = base.map((p) => ({ ...p, deltaText: `+${Math.round(p.delta)}`, thread: p === biggest || p === smallest }));
const indexOf = (p) => base.indexOf(p);
const orders = [
  [...base].sort((a, b) => a.label.localeCompare(b.label, "fr")).map(indexOf),
  [...base].sort((a, b) => a.from - b.from).map(indexOf),
  byGain.map(indexOf),
];
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const signedR = `−${plainSpaces(Math.abs(r).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [`Tous ont progressé, et les plus bas le plus vite`, `Tous en hausse, les plus bas le plus vite`, `Le bas-carbone, pays par pays`];
const prose = [
  [`Seize pays européens, un panneau chacun, par ordre alphabétique. La barre claire est la part de l’électricité bas-carbone en ${FROM}, de ${one(lowest.from)}${NB}% en ${lowest.label} à ${one(highestStart.from)}${NB}% en ${highestStart.label}. Tous les panneaux ont la même échelle.`],
  [`La barre foncée, ${TO}. Toutes montent : seize sur seize.`],
  [`Rangeons les panneaux du plus bas au plus haut en ${FROM}. Les gains diminuent le long de la grille.`],
  [`Chaque panneau devient un point : son niveau de ${FROM} en largeur, son gain en hauteur. Plus un pays partait bas, plus il a gagné : corrélation de ${signedR}.`],
  [`Rangés par gain : ${cap(FRENCH[biggest.key][1])}, +${Math.round(biggest.delta)}${NB}points, en tête ; ${FRENCH[smallest.key][1]}, qui partait de ${one(smallest.from)}${NB}%, +${Math.round(smallest.delta)}.`],
  [`Lecture : un panneau par pays, tous à la même échelle, de 0 à 100${NB}%. Le nombre sous chaque panneau est le gain, en points.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  startNote: `${FROM}${NB}: de ${one(lowest.from)} à ${one(highestStart.from)}${NB}%`,
  riseNote: `${n} sur ${n} en hausse`,
  orderNote: `rangés par niveau de ${FROM}`,
  corrNote: `corrélation${NB}: ${signedR}`,
  endsNote: `${biggest.label} +${Math.round(biggest.delta)} · ${smallest.label} +${Math.round(smallest.delta)}`,
  scaleNote: `même échelle, 0–100${NB}%`,
};
const axes = { xName: `part bas-carbone en ${FROM}, en %`, yName: `gain ${FROM}–${TO}, en points`, xTicks: [0, 50, 100], yTicks: [0, 25, 50, 75], yMax: 80 };
if (Math.max(...base.map((p) => p.delta)) > axes.yMax) throw new Error(`the scatter's gain axis stops at ${axes.yMax}; ${biggest.key} gained ${biggest.delta.toFixed(1)}`);
const alt =
  `Petits multiples : seize panneaux, un par pays européen, chacun deux barres à la même échelle — la part d’électricité bas-carbone en ${FROM} et en ${TO}. ` +
  `Toutes montent ; ${biggest.label} gagne ${Math.round(biggest.delta)} points, ${smallest.label} ${Math.round(smallest.delta)}. Plus un pays partait bas, plus il a gagné.`;

/** One state per card; see `multiples-drive.mjs` for what each field paints. */
const STATES = [
  { grow: 0, byFrom: 0, byGain: 0, scatter: 0, ends: 0, note: 0 },
  { grow: 1, byFrom: 0, byGain: 0, scatter: 0, ends: 0, note: 1 },
  { grow: 1, byFrom: 1, byGain: 0, scatter: 0, ends: 0, note: 2 },
  { grow: 1, byFrom: 1, byGain: 0, scatter: 1, ends: 0, note: 3 },
  { grow: 1, byFrom: 1, byGain: 1, scatter: 0, ends: 1, note: 4 },
  { grow: 1, byFrom: 1, byGain: 1, scatter: 0, ends: 0, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${axes.xName} ${axes.yName} ${[...axes.xTicks, ...axes.yTicks].join(" ")}`,
  annot: `${panels.map((p) => p.label).join(" ")} ${FROM} ${TO}`,
  value: `${panels.map((p) => p.deltaText).join(" ")} ${Object.values(words).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "multiples-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: [`panneaux-${FROM}`, `panneaux-${TO}`, "par-depart", "nuage", "par-gain", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedMultiplesScrolly, { panels, orders, fit, years: [String(FROM), String(TO)], axes, words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
        states: STATES,
        driver,
        apply: "applyMultiplesState",
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

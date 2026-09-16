// Sixteen European countries pinned on a strip, rendered once per FILED DIRECTION into a self-contained scrolly
// page. The `dot strip` type in the scrolly format.
//
// THE SUBJECT OF `static-dot-strip-lowcarbon-spread`, CHOREOGRAPHED. The shares, the floor, the ceiling, the
// spread and their assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. 2000: one strip, sixteen pins;
//   2. the pins slide to 2024, a tick left where each stood; the median moves with them;
//   3. the floor: Poland's trail, +30 points;
//   4. the ceiling: Sweden's trail, +2 points;
//   5. the spread: both years' floor-to-ceiling brackets;
//   6. the strip opens into the static plate's two.
//
// Usage:  bun proof/scrolly-dot-strip-lowcarbon-spread/render-directions-scrolly.mjs

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
import { DirectedDotStripScrolly } from "./DirectedDotStripScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const FROM = "2000";
const TO = "2024";
const SUBJECT = "POL";
const LOW_CARBON = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const NAMES = {
  FRA: ["France", "la France"], DEU: ["Allemagne", "l’Allemagne"], ESP: ["Espagne", "l’Espagne"], GBR: ["Royaume-Uni", "le Royaume-Uni"],
  SWE: ["Suède", "la Suède"], ITA: ["Italie", "l’Italie"], FIN: ["Finlande", "la Finlande"], AUT: ["Autriche", "l’Autriche"],
  NLD: ["Pays-Bas", "les Pays-Bas"], BEL: ["Belgique", "la Belgique"], POL: ["Pologne", "la Pologne"], CZE: ["Tchéquie", "la Tchéquie"],
  PRT: ["Portugal", "le Portugal"], DNK: ["Danemark", "le Danemark"], GRC: ["Grèce", "la Grèce"], IRL: ["Irlande", "l’Irlande"],
};

// ── the shares, and the static beat's own assertions ───────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const byCode = {};
for (const l of csv.slice(1)) {
  const c = l.split(",");
  const lc = LOW_CARBON.reduce((s, k) => s + Number(c[at(k)]), 0);
  const fossil = FOSSIL.reduce((s, k) => s + Number(c[at(k)]), 0);
  if (!(lc + fossil > 0)) throw new Error(`a country has no generation at all: ${l}`);
  (byCode[c[at("code")]] ??= {})[c[at("year")]] = (lc / (lc + fossil)) * 100;
}
const marks = Object.keys(byCode).map((code) => {
  if (!NAMES[code]) throw new Error(`${code} has no French name filed in this beat`);
  if (byCode[code][FROM] === undefined || byCode[code][TO] === undefined) throw new Error(`${code} is not read at both ${FROM} and ${TO}`);
  return { code, name: NAMES[code][0], before: byCode[code][FROM], after: byCode[code][TO] };
});
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const before = marks.map((m) => m.before);
const after = marks.map((m) => m.after);
const f = {
  floorBefore: Math.min(...before), floorAfter: Math.min(...after), ceilBefore: Math.max(...before), ceilAfter: Math.max(...after),
  medianBefore: median(before), medianAfter: median(after),
};
const spreadBefore = f.ceilBefore - f.floorBefore;
const spreadAfter = f.ceilAfter - f.floorAfter;
const floorRise = f.floorAfter - f.floorBefore;
const ceilRise = f.ceilAfter - f.ceilBefore;
if (!(floorRise > 20 && ceilRise < 5)) throw new Error(`the headline says the floor rose far and the ceiling barely; ${floorRise.toFixed(1)} and ${ceilRise.toFixed(1)}`);
if (!(spreadAfter < spreadBefore * 0.8)) throw new Error(`a card says the spread closed by more than a fifth; ${spreadBefore.toFixed(1)} to ${spreadAfter.toFixed(1)}`);
const floorMark = marks.reduce((a, b) => (b.before < a.before ? b : a));
if (floorMark.code !== SUBJECT) throw new Error(`the subject is the country that was the floor in ${FROM}; that is ${floorMark.code}`);
if (floorMark.after !== f.floorAfter) throw new Error(`the third card follows the floor from ${FROM} to ${TO}; ${SUBJECT} is no longer the floor in ${TO}`);
const ceilMark = marks.reduce((a, b) => (b.before > a.before ? b : a));
if (ceilMark.after !== f.ceilAfter) throw new Error(`the fourth card follows the ceiling from ${FROM} to ${TO}; ${ceilMark.code} is no longer the ceiling in ${TO}`);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const pct = (v) => `${one(v)}${NB}%`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const F = NAMES[SUBJECT];
const C = NAMES[ceilMark.code];

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Le plancher européen est monté de ${Math.round(floorRise)} points, le plafond de ${Math.round(ceilRise)}`,
  `Le plancher est monté de ${Math.round(floorRise)} points, le plafond de ${Math.round(ceilRise)}`,
  `Le bas-carbone des ${marks.length} pays, ${FROM} et ${TO}`,
];
const prose = [
  [`En ${FROM}, chaque pays est une épingle sur l’axe : la part de bas-carbone dans sa propre électricité. Le champ va de ${pct(f.floorBefore)} à ${pct(f.ceilBefore)}.`],
  [`Jusqu’en ${TO}, chaque épingle glisse ; un trait reste là où elle était. La médiane passe de ${pct(f.medianBefore)} à ${pct(f.medianAfter)}.`],
  [`Le plancher : ${F[1]}, de ${pct(floorMark.before)} à ${pct(floorMark.after)}. Il est monté de ${Math.round(floorRise)} points.`],
  [`Le plafond : ${C[1]}, de ${pct(ceilMark.before)} à ${pct(ceilMark.after)}. Il n’est monté que de ${Math.round(ceilRise)} points.`],
  [`L’écart entre le plus fossile et le plus propre passe de ${one(spreadBefore)} à ${one(spreadAfter)} points : il se referme de ${one(spreadBefore - spreadAfter)} points.`],
  [`Lecture : ce n’est pas un pays qu’il faut suivre mais la forme du champ, où il commence, où il finit, où il s’entasse. Les deux bandes portent la même échelle.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  unit: "part de bas-carbone dans l’électricité du pays, en %",
  figures: [
    { key: "range", label: `en ${FROM}, le champ va de`, value: `${one(f.floorBefore)} à ${pct(f.ceilBefore)}` },
    { key: "median", label: "la médiane", value: `{v}${NB}%` },
    { key: "floor", label: `le plancher, ${F[0]}`, value: `+${Math.round(floorRise)} points` },
    { key: "ceil", label: `le plafond, ${C[0]}`, value: `+${Math.round(ceilRise)} points` },
    { key: "spread", label: "l’écart plancher–plafond", value: `${one(spreadBefore)} puis ${one(spreadAfter)} points` },
  ],
  splitNote: `${FROM} en haut, ${TO} en bas, même échelle`,
  floorTrail: `+${Math.round(floorRise)} points`,
  ceilTrail: `+${Math.round(ceilRise)} points`,
  spreadBefore: `${FROM}${NB}: ${one(spreadBefore)} points`,
  spreadAfter: `${TO}${NB}: ${one(spreadAfter)} points`,
  medianLabel: `médiane {v}${NB}%`,
};
const alt =
  `Seize épingles, une par pays, sur un axe de 0 à 100 % : la part de bas-carbone dans l’électricité de chaque pays, en ${FROM} puis en ${TO}. ` +
  `Le plancher passe de ${one(f.floorBefore)} à ${one(f.floorAfter)} % (${F[1]}), le plafond de ${one(f.ceilBefore)} à ${one(f.ceilAfter)} % (${C[1]}) ; ` +
  `l’écart se referme de ${one(spreadBefore - spreadAfter)} points.`;

/** One state per card; see `dot-strip-drive.mjs` for what each field paints. */
const STATES = [
  { year: 0, median: 0, floor: 0, ceil: 0, spread: 0, split: 0 },
  { year: 1, median: 1, floor: 0, ceil: 0, spread: 0, split: 0 },
  { year: 1, median: 0, floor: 1, ceil: 0, spread: 0, split: 0 },
  { year: 1, median: 0, floor: 0, ceil: 1, spread: 0, split: 0 },
  { year: 1, median: 0, floor: 0, ceil: 0, spread: 1, split: 0 },
  { year: 1, median: 0, floor: 0, ceil: 0, spread: 0, split: 1 },
];
console.log(`plancher ${f.floorBefore.toFixed(1)} -> ${f.floorAfter.toFixed(1)} · plafond ${f.ceilBefore.toFixed(1)} -> ${f.ceilAfter.toFixed(1)} · écart ${spreadBefore.toFixed(1)} -> ${spreadAfter.toFixed(1)}\n`);

const textPerRegister = {
  display: `${title.join(" ")} ${words.figures.map((x) => x.value).join(" ")} 0123456789,%`,
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${words.figures.map((x) => x.label).join(" ")} ${marks.map((m) => m.code).join(" ")} ${FROM} ${TO} 0 20 40 60 80 100 ${words.splitNote} ${words.spreadBefore} ${words.spreadAfter} ${words.medianLabel} 0123456789,`,
  annot: "",
  value: `${words.floorTrail} ${words.ceilTrail} ${marks.map((m) => m.code).join(" ")} 0123456789,`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((file) => file.endsWith(".md"))
  .map((file) => readDirection(join(DIRECTIONS, file)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "dot-strip-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((name) => name.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: [`champ-${FROM}`, `vers-${TO}`, "plancher", "plafond", "ecart", "deux-bandes"][i], prose: p })),
      reveal: {
        element: createElement(DirectedDotStripScrolly, {
          marks,
          subject: SUBJECT,
          ceiling: ceilMark.code,
          years: [FROM, TO],
          ticks: [0, 20, 40, 60, 80, 100],
          words,
          alt,
          regs,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
        }),
        states: STATES,
        driver,
        apply: "applyDotStripState",
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

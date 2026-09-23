// Low-carbon electricity produced in 2000 and added by 2024, rendered once per FILED DIRECTION into a self-contained
// scrolly page. The `stacked bar` type in the scrolly format.
//
// THE SUBJECT OF `static-stacked-bar-lowcarbon-growth`, CHOREOGRAPHED. The twelve rows, the [level, growth] stack, the
// claim and its assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the 2000 levels alone, ordered by level: France far ahead;
//   2. the additions growing onto them, the 2024 totals written;
//   3. the rows re-sorted by what was added: Spain first, France seventh;
//   4. the additions detached onto one baseline;
//   5. Spain and France alone;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-stacked-bar-lowcarbon-growth/render-directions-scrolly.mjs

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
import { DirectedStackedScrolly } from "./DirectedStackedScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FROM = 2000;
const TO = 2024;
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const ADDER = "Spain";
const INCUMBENT = "France";
const DRAWN = 12;
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FRENCH = {
  Austria: ["Autriche", "l’Autriche"], Belgium: ["Belgique", "la Belgique"], Czechia: ["Tchéquie", "la Tchéquie"], Denmark: ["Danemark", "le Danemark"],
  Finland: ["Finlande", "la Finlande"], France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"], Greece: ["Grèce", "la Grèce"],
  Ireland: ["Irlande", "l’Irlande"], Italy: ["Italie", "l’Italie"], Netherlands: ["Pays-Bas", "les Pays-Bas"], Poland: ["Pologne", "la Pologne"],
  Portugal: ["Portugal", "le Portugal"], Spain: ["Espagne", "l’Espagne"], Sweden: ["Suède", "la Suède"], "United Kingdom": ["Royaume-Uni", "le Royaume-Uni"],
};
const ORDINALS = ["", "première", "deuxième", "troisième", "quatrième", "cinquième", "sixième", "septième", "huitième", "neuvième", "dixième", "onzième", "douzième"];

// ── the rows, and the static beat's own assertions ─────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rowsRaw = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
const cleanTwh = (raw) => CLEAN.reduce((s, k) => s + Number(raw[k] || 0), 0);
const entities = [...new Set(rowsRaw.map((r) => r.entity))];
const all = entities
  .map((entity) => {
    if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
    const a = rowsRaw.find((r) => r.entity === entity && Number(r.year) === FROM);
    const b = rowsRaw.find((r) => r.entity === entity && Number(r.year) === TO);
    if (!a || !b) throw new Error(`${entity} is missing ${FROM} or ${TO}`);
    const level = cleanTwh(a);
    const total = cleanTwh(b);
    return { key: entity, level, growth: total - level, total };
  })
  .sort((x, y) => y.growth - x.growth);
const shrank = all.filter((d) => d.growth <= 0);
if (shrank.length) throw new Error(`the stack is [level, growth] and ${shrank.map((d) => d.key).join(", ")} shrank; a negative segment belongs to a different form`);
const adder = all.find((d) => d.key === ADDER);
const incumbent = all.find((d) => d.key === INCUMBENT);
if (all[0].key !== ADDER) throw new Error(`the headline says ${ADDER} added the most; ${all[0].key} did`);
if (!(adder.growth > incumbent.growth)) throw new Error(`the headline says ${ADDER} added more than ${INCUMBENT}`);
const headStart = incumbent.level / adder.level;
if (!(headStart >= 4)) throw new Error(`card 5 says ${INCUMBENT} started several times higher; the ratio is ${headStart.toFixed(2)}`);
const largest = all.reduce((a, b) => (b.total > a.total ? b : a));
if (largest.key !== INCUMBENT) throw new Error(`card 5 says ${INCUMBENT} is still the largest producer; ${largest.key} is`);
const shown = all.slice(0, DRAWN);
for (const key of [ADDER, INCUMBENT]) if (!shown.some((d) => d.key === key)) throw new Error(`${key} is not among the ${DRAWN} largest adders`);
const byLevel = [...shown].sort((a, b) => b.level - a.level);
if (byLevel[0].key !== INCUMBENT) throw new Error(`card 1 says ${INCUMBENT} starts far ahead; ${byLevel[0].key} does`);
const incumbentRank = shown.indexOf(incumbent) + 1;
const ratio = adder.growth / incumbent.growth;
console.log(`${all.length} pays, ${DRAWN} dessinés · ${ADDER} +${adder.growth.toFixed(0)} · ${INCUMBENT} +${incumbent.growth.toFixed(0)} (${incumbentRank}e) · départ ×${headStart.toFixed(1)} · ajout ×${ratio.toFixed(1)}\n`);

const whole = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const rows = shown.map((d) => ({ key: d.key, label: FRENCH[d.key][0], level: d.level, growth: d.growth, total: d.total, levelText: whole(d.level), growthText: whole(d.growth), totalText: whole(d.total), pair: d === adder || d === incumbent }));
const orders = [byLevel.map((d) => shown.indexOf(d)), shown.map((_, i) => i)];

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis ${FROM}`,
  `L’Espagne a ajouté plus de bas-carbone que la France`,
  `Le bas-carbone ajouté depuis ${FROM}`,
];
const prose = [
  [`L’électricité bas-carbone produite en ${FROM}, renouvelables et nucléaire, dans les ${DRAWN} pays qui en ont le plus ajouté depuis, sur 16 étudiés. La France est loin devant : ${whole(incumbent.level)}${NB}TWh.`],
  [`Ajoutons ce que chacun a gagné d’ici ${TO}. Le total de ${TO} s’écrit au bout de chaque barre.`],
  [`Rangeons-les par ce qu’ils ont ajouté. L’Espagne passe en tête ; la France descend à la ${ORDINALS[incumbentRank]} place.`],
  [`Les ajouts seuls, sur la même ligne de départ : ${whole(adder.growth)}${NB}TWh pour l’Espagne, ${whole(incumbent.growth)}${NB}TWh pour la France.`],
  [`En ${FROM}, la France produisait ${one(headStart)} fois plus que l’Espagne. Depuis, l’Espagne a ajouté ${one(ratio)} fois plus. La France reste de loin la première, à ${whole(incumbent.total)}${NB}TWh.`],
  [`Lecture : chaque barre empile ce qui était produit en ${FROM} et ce qui a été ajouté depuis, en TWh ; le nombre au bout est le total de ${TO}.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  levelKey: `produit en ${FROM}`,
  growthKey: "ajouté depuis",
  levelNote: `${FRENCH[INCUMBENT][0]}${NB}: ${whole(incumbent.level)}${NB}TWh en ${FROM}`,
  totalNote: `totaux ${TO}, en TWh`,
  sortNote: "rangés par ajout",
  addNote: `${FRENCH[ADDER][0]} +${whole(adder.growth)} · ${FRENCH[INCUMBENT][0]} +${whole(incumbent.growth)}`,
  pairNote: `${FRENCH[INCUMBENT][0]}${NB}: ${whole(incumbent.total)}${NB}TWh en ${TO}, première`,
  unitNote: "en TWh",
};
const alt =
  `Barres empilées : ${DRAWN} pays européens, chaque barre l’électricité bas-carbone produite en ${FROM} puis ce qui a été ajouté d’ici ${TO}, en TWh. ` +
  `L’Espagne a ajouté ${whole(adder.growth)} TWh, la France ${whole(incumbent.growth)} ; la France reste la première, à ${whole(incumbent.total)} TWh.`;

/** One state per card; see `stacked-drive.mjs` for what each field paints. */
const STATES = [
  { grow: 0, sort: 0, detach: 0, pair: 0, note: 0 },
  { grow: 1, sort: 0, detach: 0, pair: 0, note: 1 },
  { grow: 1, sort: 1, detach: 0, pair: 0, note: 2 },
  { grow: 1, sort: 1, detach: 1, pair: 0, note: 3 },
  { grow: 1, sort: 1, detach: 0, pair: 1, note: 4 },
  { grow: 1, sort: 1, detach: 0, pair: 0, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: "",
  annot: `${rows.map((r) => `${r.label} ${r.levelText} + ${r.growthText}`).join(" ")} ${words.levelKey} ${words.growthKey}`,
  value: `${rows.map((r) => r.totalText).join(" ")} ${Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "stacked-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: [`niveaux-${FROM}`, "ajouts", "par-ajout", "ajouts-seuls", "espagne-france", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedStackedScrolly, { rows, orders, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
        states: STATES,
        driver,
        apply: "applyStackedState",
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

// Coal's share of electricity, 2010–2024, in the twelve EU-plus-UK countries that leaned on it most in 2010, rendered
// once per FILED DIRECTION into a self-contained scrolly page. The `heatmap` type in the scrolly format.
//
// THE SUBJECT OF `static-heatmap-coal-share-europe`, CHOREOGRAPHED. The twelve, the readings and the claim are the
// static beat's own; the static is set in English, so this beat is set in French through the filed directions. The
// scroll tells it with its own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. 2010 alone, Poland darkest;
//   2. the years filled one column at a time to 2021, the countries under 10 % counted;
//   3. 2022, the gas crisis: the relapse year outlined, the jumps marked;
//   4. 2024: the six under 10 % and Poland alone above half kept, the rest stepping back;
//   5. the rows sorted by relative fall, the United Kingdom first;
//   6. the static plate, the 2010 values beside the 2024 ones.
//
// Usage:  bun proof/scrolly-heatmap-coal-share-europe/render-directions-scrolly.mjs

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
import { DirectedCoalHeatmapScrolly } from "./DirectedCoalHeatmapScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const FROM = 2010;
const TO = 2024;
const COUNT_UNTIL = 2021;
const CRISIS = 2022;
const LOW = 10;
const HALF = 50;
const JUMP = 3;
const COUNTRIES = {
  Poland: { name: "Pologne", article: "la Pologne" },
  Czechia: { name: "Tchéquie", article: "la Tchéquie" },
  Greece: { name: "Grèce", article: "la Grèce" },
  Bulgaria: { name: "Bulgarie", article: "la Bulgarie" },
  Denmark: { name: "Danemark", article: "le Danemark" },
  Germany: { name: "Allemagne", article: "l’Allemagne" },
  Romania: { name: "Roumanie", article: "la Roumanie" },
  Slovenia: { name: "Slovénie", article: "la Slovénie" },
  "United Kingdom": { name: "Royaume-Uni", article: "le Royaume-Uni" },
  Netherlands: { name: "Pays-Bas", article: "les Pays-Bas" },
  Finland: { name: "Finlande", article: "la Finlande" },
  Hungary: { name: "Hongrie", article: "la Hongrie" },
};
const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];

// ── the readings, and every sentence's assertion ───────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const cells = csv.slice(1).map((l) => l.split(","));
const years = [];
for (let y = FROM; y <= TO; y++) years.push(y);
const entities = [...new Set(cells.map((c) => c[header.indexOf("Entity")]))];
if (entities.length !== 12) throw new Error(`the beat draws twelve countries; the frozen data has ${entities.length}`);
const countries = entities.map((entity) => {
  if (!COUNTRIES[entity]) throw new Error(`${entity} is in the frozen data and this beat has no French name for it`);
  const values = years.map((y) => {
    const row = cells.find((c) => c[header.indexOf("Entity")] === entity && Number(c[header.indexOf("Year")]) === y);
    if (!row) throw new Error(`no ${y} reading for ${entity}`);
    return Number(row[header.indexOf("Coal")]);
  });
  const at = (y) => values[y - FROM];
  return { entity, ...COUNTRIES[entity], values, at, fall: 1 - at(TO) / at(FROM) };
});
const byStart = [...countries].sort((a, b) => b.at(FROM) - a.at(FROM));
const byFall = [...countries].sort((a, b) => b.fall - a.fall);
const leader = byStart[0];
if (leader.entity !== "Poland") throw new Error(`card 1 names Poland the most coal-dependent in ${FROM}; it is ${leader.entity}`);
const underIn = (y) => countries.filter((c) => c.at(y) < LOW);
const countUntil = underIn(COUNT_UNTIL);
const jumped = countries.filter((c) => c.at(CRISIS) - c.at(CRISIS - 1) > JUMP).sort((a, b) => (b.at(CRISIS) - b.at(CRISIS - 1)) - (a.at(CRISIS) - a.at(CRISIS - 1)));
if (jumped.length !== 3) throw new Error(`card 3 names three countries up more than ${JUMP} points in ${CRISIS}; there are ${jumped.length}`);
const backOver = countries.filter((c) => c.at(CRISIS - 1) < LOW && c.at(CRISIS) >= LOW);
if (backOver.length !== 1 || backOver[0].entity !== "Greece") throw new Error(`card 3 says Greece alone went back over ${LOW} % in ${CRISIS}; ${backOver.map((c) => c.entity).join(", ") || "none"} did`);
const notFallen = countries.filter((c) => !(c.at(TO) < c.at(FROM)));
if (notFallen.length) throw new Error(`card 4 says all twelve are below their ${FROM} level; not ${notFallen.map((c) => c.entity).join(", ")}`);
const underEnd = underIn(TO);
if (underEnd.length !== 6) throw new Error(`card 4 says six are under ${LOW} % in ${TO}; ${underEnd.length} are`);
const overHalf = countries.filter((c) => c.at(TO) >= HALF);
if (overHalf.length !== 1 || overHalf[0] !== leader) throw new Error(`card 4 says Poland alone is above half in ${TO}; ${overHalf.map((c) => c.entity).join(", ") || "none"} are`);
if (byFall[0].entity !== "United Kingdom") throw new Error(`card 5 names the United Kingdom the steepest relative fall; it is ${byFall[0].entity}`);
const steepest = byFall[0];
console.log(countries.map((c) => `${c.entity} ${c.at(FROM).toFixed(1)}→${c.at(TO).toFixed(1)} (−${(c.fall * 100).toFixed(0)} %)`).join(" · "), "\n");

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const pct = (v) => `${one(v)}${NB}%`;
/** In a cell's column: one decimal under 10 %, a whole number above, so a narrow column holds it. */
const short = (v) => (v < 10 ? one(v) : String(Math.round(v)));
const list = (group) => (group.length === 1 ? group[0].name : `${group.slice(0, -1).map((c) => c.name).join(", ")} et ${group.at(-1).name}`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Le charbon a reculé dans les douze pays européens qui en dépendaient le plus ; seule ${leader.article} reste au-dessus de la moitié`,
  `Le charbon recule partout ; seule ${leader.article} dépasse encore la moitié`,
  `Le recul du charbon en Europe`,
];
const prose = [
  [`La part du charbon dans l’électricité des douze pays de l’Union européenne et du Royaume-Uni qui en dépendaient le plus en ${FROM}. En tête, ${leader.article} : ${pct(leader.at(FROM))}.`],
  [`Année après année, la teinte pâlit. En ${COUNT_UNTIL}, ${SPELLED[countUntil.length]} pays sont passés sous ${LOW}${NB}% : ${list(countUntil)}.`],
  [`En ${CRISIS}, la crise du gaz : ${list(jumped)} reprennent chacune plus de ${JUMP}${NB}points, et ${backOver[0].article} repasse au-dessus de ${LOW}${NB}%.`],
  [`En ${TO}, les douze sont sous leur niveau de ${FROM}. ${capital(SPELLED[underEnd.length])} sont sous ${LOW}${NB}% ; ${leader.article}, à ${pct(leader.at(TO))}, reste la seule au-dessus de la moitié.`],
  [`Rangés par recul, ${steepest.article} passe en tête : de ${pct(steepest.at(FROM))} à ${pct(steepest.at(TO))}, −${Math.round(steepest.fall * 100)}${NB}%. ${capital(leader.article)}, partie de plus haut, a reculé de ${Math.round(leader.fall * 100)}${NB}%.`],
  [`Lecture : ces douze pays sont ceux où le charbon pesait le plus en ${FROM}. Ils racontent le recul du charbon, pas l’électricité de toute l’Europe.`],
];
const source = `Source : Ember, via Our World in Data · part du charbon dans la production d’électricité, ${FROM}–${TO}`;
const words = {
  unit: "part du charbon dans la production d’électricité",
  legend: "part de la production du pays",
  fallHead: "recul",
  countTemplate: `{year}${NB}: {n} pays sous ${LOW}${NB}%`,
  startNote: `${leader.name} ${FROM}${NB}: ${pct(leader.at(FROM))}`,
  countNote: `${COUNT_UNTIL}${NB}: ${countUntil.length} pays sous ${LOW}${NB}%`,
  crisisNote: `${CRISIS}${NB}: la crise du gaz`,
  endNote: `${TO}${NB}: ${underEnd.length} sous ${LOW}${NB}%, 1 au-dessus de ${HALF}${NB}%`,
  sortNote: `${steepest.name}${NB}: −${Math.round(steepest.fall * 100)}${NB}%`,
  readNote: `${FROM} et ${TO}`,
};
const BREAKS = [LOW, 25, HALF, 75];
const alt =
  `Grille : la part du charbon dans l’électricité de douze pays européens, année par année de ${FROM} à ${TO}. ` +
  `Elle baisse dans les douze ; en ${TO}, ${underEnd.length} sont sous ${LOW} % et ${leader.article}, à ${one(leader.at(TO))} %, reste la seule au-dessus de la moitié.`;

/** One state per card; see `coal-heatmap-drive.mjs` for what each field paints. */
const STATES = [
  { reach: FROM, crisis: 0, focus: 0, sort: 0, both: 0, note: 0 },
  { reach: COUNT_UNTIL, crisis: 0, focus: 0, sort: 0, both: 0, note: 1 },
  { reach: CRISIS, crisis: 1, focus: 0, sort: 0, both: 0, note: 2 },
  { reach: TO, crisis: 0, focus: 1, sort: 0, both: 0, note: 3 },
  { reach: TO, crisis: 0, focus: 0, sort: 1, both: 0, note: 4 },
  { reach: TO, crisis: 0, focus: 0, sort: 0, both: 1, note: 5 },
];

const rows = byStart.map((c) => ({
  key: c.entity,
  label: c.name,
  values: c.values,
  valueTexts: c.values.map(short),
  fallText: `−${Math.round(c.fall * 100)}${NB}%`,
}));

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${words.legend} ${words.fallHead} ${years.join(" ")} ${rows.map((r) => r.label).join(" ")} ${BREAKS.map((b) => `${b}${NB}%`).join(" ")}`,
  annot: rows.map((r) => r.label).join(" "),
  value: `${rows.map((r) => `${r.valueTexts.join(" ")} ${r.fallText}`).join(" ")} ${Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" ")} 0123456789`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: BREAKS.length + 1 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "coal-heatmap-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["2010", "annees", "crise", "2024", "recul", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedCoalHeatmapScrolly, {
          rows,
          years,
          labelledYears: [FROM, 2015, 2020, TO],
          breaks: BREAKS.map((b) => ({ value: b, label: `${b}${NB}%` })),
          orders: { start: byStart.map((c) => c.entity), fall: byFall.map((c) => c.entity) },
          crisis: { year: CRISIS, marked: [...jumped, ...backOver].map((c) => c.entity) },
          words,
          alt,
          regs,
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
        }),
        states: STATES,
        driver,
        apply: "applyCoalHeatmapState",
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

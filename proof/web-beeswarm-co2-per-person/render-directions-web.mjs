// twin/proof/web-beeswarm-co2-per-person/render-directions-web.mjs
//
// Every country's CO₂ per person in 2023 as a beeswarm — circle area is population — rendered once
// per FILED DIRECTION into a self-contained interactive page.
//
// THE ONE READING THIS FORMAT ADDS: the share of humanity that emits LESS than the country under
// the pointer. It is computed here for all 213, from the same frozen file the marks are sized from,
// and baked into each mark's own detail string. The browser never formats a number.
//
// Usage:  bun proof/web-beeswarm-co2-per-person/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedSwarmWeb, FRAME } from "./DirectedSwarmWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const UNIT = "t/personne";
const YEAR = 2023;
const HEAVY = 20;
/** THE COUNTRY NAMES ON THIS PAGE ARE THE SOURCE'S OWN, and the page says so. 213 countries is far
 *  past the point where a hand-filed French name per country is safe: a wrong translation in a
 *  tooltip is a factual error nobody would catch. Only the two derived callouts — the largest circle
 *  and the farthest one out — are named in French, because they are also named in the headline's own
 *  prose and in the alt text, where the source's label would read as an error. */
const FR = { IND: "l'Inde", QAT: "le Qatar", CHN: "la Chine", USA: "les États-Unis" };
const frName = (code, fallback) => FR[code] ?? fallback;

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const people = (v) =>
  v >= 1e9 ? `${fr(v / 1e9)} milliard${v >= 2e9 ? "s" : ""} d'habitants`
  : v >= 1e6 ? `${fr(v / 1e6)} million${v >= 2e6 ? "s" : ""} d'habitants`
  : `${plain(Math.round(v).toLocaleString("fr-FR"))} habitants`;

// ── the countries ─────────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const all = csv.slice(1).map((line) => {
  const c = line.split(",");
  return {
    name: c[at("entity")],
    code: c[at("code")],
    value: Number(c[at("co2_t_per_person")]),
    pop: Number(c[at("population")]),
  };
});
for (const c of all)
  if (!c.code || !Number.isFinite(c.value) || !(c.pop > 0))
    throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);

const worldPeople = all.reduce((s, c) => s + c.pop, 0);
const worldCo2 = all.reduce((s, c) => s + c.value * c.pop, 0);
const worldAverage = worldCo2 / worldPeople;
const sorted = [...all].sort((a, b) => a.value - b.value);
const median = sorted[Math.floor(sorted.length / 2)].value;

/** Share of humanity emitting strictly less than this country's own figure. */
let below = 0;
const shareBelow = new Map();
for (const c of sorted) {
  shareBelow.set(c.code, (below / worldPeople) * 100);
  below += c.pop;
}

const heavy = all.filter((c) => c.value >= HEAVY);
const heavyShare = (heavy.reduce((s, c) => s + c.pop, 0) / worldPeople) * 100;
const underAverage =
  (sorted.filter((c) => c.value < worldAverage).reduce((s, c) => s + c.pop, 0) / worldPeople) * 100;
const biggest = all.reduce((a, b) => (b.pop > a.pop ? b : a));
const farthest = all.reduce((a, b) => (b.value > a.value ? b : a));

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(heavyShare < 1))
  throw new Error(`the headline says the heaviest emitters are under 1 % of humanity; they are ${fr(heavyShare)} %`);
if (!(underAverage > 60))
  throw new Error(`the headline says the world average sits above most people; it sits above ${fr(underAverage)} %`);
if (!(biggest.value < median))
  throw new Error(`the headline says the largest circle sits below the country median; it is at ${fr(biggest.value)} against ${fr(median)}`);

console.log(
  `${all.length} pays · ${fr(worldPeople / 1e9)} milliards d'habitants · médiane ${fr(median)} · ` +
    `moyenne mondiale ${fr(worldAverage)} (au-dessus de ${fr(underAverage)} % des gens) · ` +
    `${heavy.length} pays au-dessus de ${HEAVY} t = ${fr(heavyShare, 2)} % de l'humanité\n`,
);
console.table([
  { repère: "plus gros cercle", pays: biggest.name, t: fr(biggest.value), hab: people(biggest.pop) },
  { repère: "plus loin à droite", pays: farthest.name, t: fr(farthest.value), hab: people(farthest.pop) },
]);

// ── the marks ─────────────────────────────────────────────────────────────────────────────────
const xMax = Math.ceil(farthest.value / 5) * 5;
const R_MAX = 30;
const rOf = (pop) => Math.max(1.6, Math.sqrt(pop / biggest.pop) * R_MAX);
const marks = all.map((c) => ({
  code: c.code,
  name: c.name,
  value: c.value,
  r: rOf(c.pop),
  highlight: c.code === biggest.code || c.code === farthest.code ? (c.code === biggest.code ? "subject" : "far") : null,
  detail:
    `${fr(c.value)} ${UNIT} · ${people(c.pop)} · ${fr(shareBelow.get(c.code))} % de l'humanité ` +
    `émet moins`,
}));

const facts = beatFacts(
  all.map((c) => ({ key: c.code, label: c.name, value: c.value })),
  { subject: biggest.name, declaredSequence: UNIT },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Les ${heavy.length} pays au-dessus de ${HEAVY} tonnes de CO₂ par personne pèsent ${fr(heavyShare, 1)} % de l'humanité`;
const caveat =
  `Un cercle par pays (${all.length}), sa surface proportionnelle à sa population. L'axe est le CO₂ ` +
  `émis par personne en ${YEAR}. L'empilement est déterministe : les plus gros cercles sont posés ` +
  `d'abord, chacun au plus près de l'axe.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez n'importe quel cercle pour lire le pays, son chiffre, sa ` +
  `population et la part de l'humanité qui émet moins que lui — les ${all.length} lectures que ` +
  `l'image fixe ne pouvait pas nommer.`;
const source = `Source : Global Carbon Budget 2025 · population ${YEAR}, via Our World in Data · les noms de pays sont ceux publiés par la source`;
const xTicks = [0, 5, 10, 15, 20, 25, 30, 35, 40].filter((t) => t <= xMax);
const notes = [
  { code: biggest.code, text: `${frName(biggest.code, biggest.name)} · ${people(biggest.pop)} à ${fr(biggest.value)} t` },
  { code: farthest.code, text: `${frName(farthest.code, farthest.name)} · ${fr(farthest.value)} t` },
];
const levels = {
  median: { value: median, label: `médiane des pays ${fr(median)}` },
  average: { value: worldAverage, label: `moyenne mondiale ${fr(worldAverage)}` },
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${xTicks.join(" ")} ${UNIT}`,
  annot: `${levels.median.label} ${levels.average.label} ${notes.map((n) => n.text).join(" ")}`,
  value: marks.map((m) => fr(m.value)).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      component: DirectedSwarmWeb,
      props: {
        marks, xTicks, xMax,
        median: levels.median,
        average: levels.average,
        title, eyebrow: EYEBROW, caveat, source, unit: UNIT, reading: readingLine, notes,
        alt:
          `Un essaim de ${all.length} cercles, un par pays, posés le long d'un axe qui va de 0 à ` +
          `${xMax} tonnes de CO₂ par personne. La masse se concentre sous ${fr(median)} tonnes ; ` +
          `le plus gros cercle, ${frName(biggest.code, biggest.name)} et ses ${people(biggest.pop)}, est à ` +
          `${fr(biggest.value)} tonnes, sous la médiane des pays. La queue de droite est faite de ` +
          `petits cercles : les ${heavy.length} pays au-dessus de ${HEAVY} tonnes ne pèsent que ` +
          `${fr(heavyShare, 1)} % de l'humanité.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);

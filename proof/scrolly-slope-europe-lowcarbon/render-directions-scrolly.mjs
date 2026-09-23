// Sixteen European countries' low-carbon electricity, 2000 and 2024, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `slope` type in the scrolly format.
//
// THE SUBJECT OF `static-slope-europe-lowcarbon`, CHOREOGRAPHED. The countries, the shares, the claim and its
// assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the 2000 rail alone: sixteen points, named;
//   2. the slopes growing to 2024: all sixteen rise;
//   3. every crossing marked: the order changed;
//   4. France and Finland alone: the only country to pass France;
//   5. the largest gains;
//   6. the static plate's six lines.
//
// Usage:  bun proof/scrolly-slope-europe-lowcarbon/render-directions-scrolly.mjs

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
import { DirectedSlopeScrolly } from "./DirectedSlopeScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FROM = 2000;
const TO = 2024;
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const OVERTOOK = "Finland";
const OVERTAKEN = "France";
/** The static plate draws six lines: the pair, and the largest producers of 2024. */
const DRAWN = 6;
const GAINS = 2;
const RENEWABLE = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh"];
const NUCLEAR = "nuclear_generation__twh";
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const ALL = [...RENEWABLE, NUCLEAR, ...FOSSIL];
const FRENCH = {
  Austria: ["Autriche", "l’Autriche", "en Autriche"], Belgium: ["Belgique", "la Belgique", "en Belgique"], Czechia: ["Tchéquie", "la Tchéquie", "en Tchéquie"], Denmark: ["Danemark", "le Danemark", "au Danemark"],
  Finland: ["Finlande", "la Finlande", "en Finlande"], France: ["France", "la France", "en France"], Germany: ["Allemagne", "l’Allemagne", "en Allemagne"], Greece: ["Grèce", "la Grèce", "en Grèce"],
  Ireland: ["Irlande", "l’Irlande", "en Irlande"], Italy: ["Italie", "l’Italie", "en Italie"], Netherlands: ["Pays-Bas", "les Pays-Bas", "aux Pays-Bas"], Poland: ["Pologne", "la Pologne", "en Pologne"],
  Portugal: ["Portugal", "le Portugal", "au Portugal"], Spain: ["Espagne", "l’Espagne", "en Espagne"], Sweden: ["Suède", "la Suède", "en Suède"], "United Kingdom": ["Royaume-Uni", "le Royaume-Uni", "au Royaume-Uni"],
};

// ── the shares, and the static beat's own assertions ───────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rowsRaw = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
const lowCarbonOf = (raw) => {
  const total = ALL.reduce((s, k) => s + Number(raw[k] || 0), 0);
  if (!(total > 0)) throw new Error(`${raw.entity} reports no generation in ${raw.year}`);
  return ([...RENEWABLE, NUCLEAR].reduce((s, k) => s + Number(raw[k] || 0), 0) / total) * 100;
};
const entities = [...new Set(rowsRaw.map((r) => r.entity))].sort();
const base = entities.map((entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  const a = rowsRaw.find((r) => r.entity === entity && Number(r.year) === FROM);
  const b = rowsRaw.find((r) => r.entity === entity && Number(r.year) === TO);
  if (!a || !b) throw new Error(`${entity} is missing ${FROM} or ${TO}`);
  return { key: entity, from: lowCarbonOf(a), to: lowCarbonOf(b), total: ALL.reduce((s, k) => s + Number(b[k] || 0), 0) };
});
for (const d of base) d.delta = d.to - d.from;
const fell = base.filter((d) => d.delta <= 0);
if (fell.length) throw new Error(`card 2 says all ${base.length} rose; ${fell.map((d) => d.key).join(", ")} did not`);
const climber = base.find((d) => d.key === OVERTOOK);
const held = base.find((d) => d.key === OVERTAKEN);
if (!(climber.from < held.from && climber.to > held.to)) throw new Error(`card 4 says ${OVERTOOK} overtook ${OVERTAKEN}`);
const passed = base.filter((d) => d.key !== OVERTAKEN && d.from < held.from && d.to > held.to);
if (passed.length !== 1 || passed[0].key !== OVERTOOK) throw new Error(`card 4 says ${OVERTOOK} is the only country to pass ${OVERTAKEN}; ${passed.map((d) => d.key).join(", ")} did`);
const crossings = [];
for (let i = 0; i < base.length; i++)
  for (let j = i + 1; j < base.length; j++) {
    const [a, b] = [base[i], base[j]];
    const d0 = a.from - b.from;
    const d1 = a.to - b.to;
    if (d0 * d1 < 0) {
      const t = d0 / (d0 - d1);
      crossings.push([i, j, Math.round(t * 1000) / 1000, Math.round((a.from + t * (a.to - a.from)) * 100) / 100]);
    }
  }
const gains = [...base].sort((a, b) => b.delta - a.delta).slice(0, GAINS);
const pair = [climber, held];
const drawn = [...pair, ...base.filter((d) => !pair.includes(d)).sort((a, b) => b.total - a.total).slice(0, DRAWN - pair.length)];
const lowest = base.reduce((a, b) => (b.from < a.from ? b : a));
const highest = base.reduce((a, b) => (b.from > a.from ? b : a));
console.log(`${base.length} pays · ${crossings.length} croisements · ${OVERTOOK} ${(climber.from - held.from).toFixed(1)} → +${(climber.to - held.to).toFixed(1)} · hausses ${gains.map((g) => `${g.key} +${g.delta.toFixed(1)}`).join(", ")} · dessinés ${drawn.map((d) => d.key).join(", ")}\n`);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const signed = (v) => `${v >= 0 ? "+" : "−"}${one(Math.abs(v))}`;
const lines = base.map((d) => ({
  key: d.key,
  label: FRENCH[d.key][0],
  from: d.from,
  to: d.to,
  fromText: one(d.from),
  toText: one(d.to),
  deltaText: signed(d.delta),
  thread: pair.includes(d),
  gain: gains.includes(d),
  drawn: drawn.includes(d),
}));
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const NUMBER_WORDS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six"];

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Les seize pays ont tous gagné du bas-carbone depuis ${FROM} — un seul a doublé la France`,
  `Seize pays en hausse, un seul devant la France`,
  `Le bas-carbone en Europe, ${FROM} et ${TO}`,
];
const prose = [
  [`La part de l’électricité bas-carbone, renouvelables et nucléaire réunis, dans seize pays européens en ${FROM} : de ${one(lowest.from)}${NB}% ${FRENCH[lowest.key][2]} à ${one(highest.from)}${NB}% ${FRENCH[highest.key][2]}. La France est à ${one(held.from)}${NB}%, la Finlande à ${one(climber.from)}${NB}%.`],
  [`En ${TO}, chaque pays tire sa pente. Toutes montent : seize sur seize.`],
  [`Quand deux pentes se croisent, deux pays ont échangé leur rang : ${crossings.length} croisements.`],
  [`Un seul concerne la France. ${cap(FRENCH[OVERTOOK][1])} était ${one(held.from - climber.from)}${NB}points sous elle en ${FROM} ; en ${TO}, elle est ${one(climber.to - held.to)}${NB}point devant. C’est le seul pays à l’avoir dépassée.`],
  [`Les plus fortes hausses : ${listOf(gains.map((g) => `${FRENCH[g.key][1]}, ${signed(g.delta)}${NB}points`))}.`],
  [`Lecture : chaque ligne est un pays. Il n’y a pas d’axe : la pente donne le sens, les deux nombres donnent le niveau, l’écart est écrit à droite, en points. Le graphique garde la paire et les ${NUMBER_WORDS[DRAWN - pair.length]} plus gros producteurs.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  unit: "part bas-carbone de l’électricité, en %",
  railNote: `${FROM}${NB}: de ${one(lowest.from)} à ${one(highest.from)}${NB}%`,
  riseNote: `${base.length} pays sur ${base.length} en hausse`,
  crossNote: `${crossings.length} croisements`,
  pairNote: `${FRENCH[OVERTOOK][0]}${NB}: de ${signed(climber.from - held.from)} à ${signed(climber.to - held.to)} point`,
  gainNote: `${FRENCH[gains[0].key][0]} ${signed(gains[0].delta)}${NB}points`,
  sixNote: `${DRAWN} lignes${NB}: la paire et les plus gros producteurs`,
};
const alt =
  `Graphique en pente : la part d’électricité bas-carbone de seize pays européens en ${FROM} et en ${TO}. Les seize lignes montent. ` +
  `La Finlande passe de ${one(climber.from)} à ${one(climber.to)} % et dépasse la France (${one(held.from)} à ${one(held.to)} %) ; c’est le seul pays à la dépasser.`;

/** One state per card; see `slope-drive.mjs` for what each field paints. */
const STATES = [
  { right: 0, cross: 0, pair: 0, gains: 0, six: 0, note: 0 },
  { right: 1, cross: 0, pair: 0, gains: 0, six: 0, note: 1 },
  { right: 1, cross: 1, pair: 0, gains: 0, six: 0, note: 2 },
  { right: 1, cross: 1, pair: 1, gains: 0, six: 0, note: 3 },
  { right: 1, cross: 0, pair: 0, gains: 1, six: 0, note: 4 },
  { right: 1, cross: 0, pair: 0, gains: 0, six: 1, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${FROM} ${TO}`,
  annot: `${lines.map((l) => `${l.label} ${l.deltaText}`).join(" ")}`,
  value: `${lines.map((l) => `${l.fromText} ${l.toText}`).join(" ")} ${Object.entries(words).filter(([k]) => k !== "unit").map(([, v]) => v).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "slope-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: [`rail-${FROM}`, "pentes", "croisements", "finlande", "hausses", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedSlopeScrolly, { lines, crossings, years: [String(FROM), String(TO)], words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
        states: STATES,
        driver,
        apply: "applySlopeState",
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

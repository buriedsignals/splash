// Sixteen European electricity mixes, 2024, rendered once per FILED DIRECTION into a self-contained scrolly page. The
// `parallel coordinates` type in the scrolly format.
//
// THE SUBJECT OF `static-parallel-coordinates-electricity-mix`, CHOREOGRAPHED. The axes and their order, the floors,
// the claim and its assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. one axis, nuclear: sixteen points, five above 25 %, named;
//   2. wind beside it, a line from each point: ten above 20 %;
//   3. the crossing measured, and the two countries clearing both floors drawn in the accent;
//   4. the rest of the mix unfolded axis by axis;
//   5. the two followed across all seven axes, their values written;
//   6. the static plate, every line named once.
//
// Usage:  bun proof/scrolly-parallel-coordinates-electricity-mix/render-directions-scrolly.mjs

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
import { DirectedParallelScrolly } from "./DirectedParallelScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const YEAR = "2024";
/** THE AXIS ORDER IS THE ARGUMENT: only adjacent axes are compared, so nuclear stands beside wind; the rest runs
 *  low-carbon first, fossil last. */
const AXES = [
  { key: "nuclear_generation__twh", name: "Nucléaire" },
  { key: "wind_generation__twh", name: "Éolien" },
  { key: "solar_generation__twh", name: "Solaire" },
  { key: "hydro_generation__twh", name: "Hydraulique" },
  { key: "bioenergy_stacked_generation__twh", name: "Bioénergie" },
  { key: "gas_generation__twh", name: "Gaz" },
  { key: "coal_generation__twh", name: "Charbon" },
];
const ALL_SOURCES = [...AXES.map((a) => a.key), "oil_generation__twh", "other_renewables_generation__twh"];
const NUCLEAR_FLOOR = 25;
const WIND_FLOOR = 20;
const FOSSIL_CEILING = 2;
const NAMES = {
  FRA: ["France", "la France"], DEU: ["Allemagne", "l’Allemagne"], ESP: ["Espagne", "l’Espagne"], GBR: ["Royaume-Uni", "le Royaume-Uni"],
  SWE: ["Suède", "la Suède"], ITA: ["Italie", "l’Italie"], FIN: ["Finlande", "la Finlande"], AUT: ["Autriche", "l’Autriche"],
  NLD: ["Pays-Bas", "les Pays-Bas"], BEL: ["Belgique", "la Belgique"], POL: ["Pologne", "la Pologne"], CZE: ["Tchéquie", "la Tchéquie"],
  PRT: ["Portugal", "le Portugal"], DNK: ["Danemark", "le Danemark"], GRC: ["Grèce", "la Grèce"], IRL: ["Irlande", "l’Irlande"],
};

// ── the mixes, and the static beat's own assertions ────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const countries = csv
  .slice(1)
  .map((l) => l.split(","))
  .filter((c) => c[at("year")] === YEAR)
  .map((c) => {
    const total = ALL_SOURCES.reduce((s, k) => s + Number(c[at(k)]), 0);
    if (!(total > 0)) throw new Error(`${c[at("code")]} reports no generation at all in ${YEAR}`);
    if (!NAMES[c[at("code")]]) throw new Error(`${c[at("code")]} has no French name filed in this beat`);
    return { code: c[at("code")], shares: AXES.map((a) => (Number(c[at(a.key)]) / total) * 100) };
  });
const nuclearHeavy = countries.filter((c) => c.shares[0] >= NUCLEAR_FLOOR).sort((a, b) => b.shares[0] - a.shares[0]);
const windHeavy = countries.filter((c) => c.shares[1] >= WIND_FLOOR);
const both = nuclearHeavy.filter((c) => c.shares[1] >= WIND_FLOOR);
if (!(both.length >= 1 && both.length <= 3)) throw new Error(`the headline names a handful of countries that clear both floors; ${both.length} do`);
if (!(nuclearHeavy.length >= 3 && windHeavy.length >= 5)) throw new Error(`each floor needs a real group behind it; ${nuclearHeavy.length} nuclear, ${windHeavy.length} wind`);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const xs = countries.map((c) => c.shares[0]);
const ys = countries.map((c) => c.shares[1]);
const [mx, my] = [mean(xs), mean(ys)];
const r = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
if (!(r < -0.2)) throw new Error(`a card says the two lean against each other; their correlation is ${r.toFixed(2)}`);
/** Card 5's sentence: the two keep gas and coal each under the ceiling, and hydro and bioenergy carry a real part. */
for (const c of both) {
  if (!(c.shares[5] < FOSSIL_CEILING && c.shares[6] < FOSSIL_CEILING)) throw new Error(`a card says gas and coal stay under ${FOSSIL_CEILING} % in ${c.code}; ${c.shares[5].toFixed(1)} and ${c.shares[6].toFixed(1)}`);
  if (!(c.shares[3] + c.shares[4] >= 20)) throw new Error(`a card says hydro and bioenergy complete ${c.code}'s mix; together ${(c.shares[3] + c.shares[4]).toFixed(1)} %`);
}
console.log(`${countries.length} pays · nucléaire ≥ ${NUCLEAR_FLOOR} : ${nuclearHeavy.length} · éolien ≥ ${WIND_FLOOR} : ${windHeavy.length} · les deux : ${both.map((c) => c.code).join(", ")} · r ${r.toFixed(2)}\n`);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const signed = (v) => (v < 0 ? `−${one(-v)}` : one(v));
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
const NUMBER_WORDS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const axes = AXES.map((a, i) => ({
  name: a.name,
  ceiling: Math.ceil(Math.max(...countries.map((c) => c.shares[i])) / 10) * 10,
  floor: i === 0 ? NUCLEAR_FLOOR : i === 1 ? WIND_FLOOR : null,
  floorText: i === 0 ? `${NUCLEAR_FLOOR}${NB}%` : i === 1 ? `${WIND_FLOOR}${NB}%` : "",
}));
const lines = countries.map((c) => ({
  code: c.code,
  name: NAMES[c.code][0],
  values: c.shares,
  valueTexts: c.shares.map((v) => `${Math.round(v)}${NB}%`),
  thread: both.some((b) => b.code === c.code),
}));
const bothNames = both.map((c) => NAMES[c.code][1]);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `${cap(NUMBER_WORDS[both.length])} pays sur ${countries.length} font les deux : plus de ${NUCLEAR_FLOOR}${NB}% de nucléaire et plus de ${WIND_FLOOR}${NB}% d’éolien`,
  `${cap(listOf(bothNames))} sont les seuls pays à passer les deux seuils, nucléaire et éolien`,
  `Les mix électriques européens, axe par axe`,
];
const prose = [
  [`Seize pays européens, et la part du nucléaire dans leur électricité en ${YEAR}. ${cap(NUMBER_WORDS[nuclearHeavy.length])} dépassent ${NUCLEAR_FLOOR}${NB}% : ${listOf(nuclearHeavy.map((c) => NAMES[c.code][1]))}.`],
  [`À côté, l’éolien. Chaque pays tire une ligne de l’un à l’autre. ${cap(NUMBER_WORDS[windHeavy.length])} dépassent ${WIND_FLOOR}${NB}% d’éolien.`],
  [`Les lignes se croisent : plus un pays a de nucléaire, moins il a d’éolien, avec une corrélation de ${signed(r)}. ${cap(NUMBER_WORDS[both.length])} seulement passent les deux seuils : ${listOf(bothNames)}.`],
  [`Déplions le reste du mix : solaire, hydraulique, bioénergie, gaz, charbon. Chaque axe garde sa propre échelle.`],
  [`Suivons ${listOf(bothNames)} : l’hydraulique et la bioénergie complètent leur mix, le gaz et le charbon y restent chacun sous ${FOSSIL_CEILING}${NB}%.`],
  [`Lecture : seuls deux axes voisins se comparent ; un croisement entre eux est une relation. L’ordre des axes est donc un choix : nucléaire et éolien côte à côte, le fossile au bout.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  unit: `part de la production électrique du pays, en %, ${YEAR}`,
  nuclearNote: `${nuclearHeavy.length} pays à ${NUCLEAR_FLOOR}${NB}% de nucléaire ou plus`,
  windNote: `${windHeavy.length} pays à ${WIND_FLOOR}${NB}% d’éolien ou plus`,
  bothNote: `corrélation${NB}: ${signed(r)} · ${both.length} pays passent les deux`,
  scaleNote: `${AXES.length} axes, chacun à sa propre échelle`,
  fossilNote: `gaz et charbon${NB}: moins de ${FOSSIL_CEILING}${NB}% chacun`,
  threadNote: `en couleur${NB}: les pays qui passent les deux seuils`,
};
const alt =
  `Coordonnées parallèles : ${countries.length} pays européens, chacun une ligne traversant sept axes — nucléaire, éolien, solaire, hydraulique, bioénergie, gaz, charbon — ` +
  `chaque axe à sa propre échelle. ${nuclearHeavy.length} pays dépassent ${NUCLEAR_FLOOR} % de nucléaire, ${windHeavy.length} dépassent ${WIND_FLOOR} % d’éolien, ` +
  `et seuls ${NUMBER_WORDS[both.length]} font les deux, ${listOf(bothNames)} ; leurs lignes sont en couleur.`;

/** One state per card; see `parallel-drive.mjs` for what each field paints. */
const STATES = [
  { span: 1, floorN: 1, floorW: 0, mark: 1, dots: 1, groupN: 1, groupW: 0, accent: 0, retreat: 0, follow: 0, seats: 0, note: 0 },
  { span: 2, floorN: 1, floorW: 1, mark: 1, dots: 1, groupN: 0, groupW: 1, accent: 0, retreat: 0, follow: 0, seats: 0, note: 1 },
  { span: 2, floorN: 1, floorW: 1, mark: 1, dots: 1, groupN: 0, groupW: 1, accent: 1, retreat: 1, follow: 0, seats: 0, note: 2 },
  { span: 7, floorN: 0, floorW: 0, mark: 0, dots: 0, groupN: 0, groupW: 0, accent: 1, retreat: 0.55, follow: 0, seats: 1, note: 3 },
  { span: 7, floorN: 0, floorW: 0, mark: 0, dots: 0, groupN: 0, groupW: 0, accent: 1, retreat: 1, follow: 1, seats: 1, note: 4 },
  { span: 7, floorN: 0, floorW: 0, mark: 0, dots: 0, groupN: 0, groupW: 0, accent: 1, retreat: 0, follow: 0, seats: 2, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${axes.map((a) => `${a.name} ${a.ceiling} % ${a.floorText}`).join(" ")} 0 ${lines.map((l) => l.name).join(" ")}`,
  annot: lines.map((l) => l.name).join(" "),
  value: `${Object.entries(words).filter(([k]) => k !== "unit").map(([, v]) => v).join(" ")} ${lines.filter((l) => l.thread).flatMap((l) => l.valueTexts).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "parallel-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["nucleaire", "eolien", "croisement", "depli", "suivre", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedParallelScrolly, { axes, lines, words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted }),
        states: STATES,
        driver,
        apply: "applyParallelState",
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

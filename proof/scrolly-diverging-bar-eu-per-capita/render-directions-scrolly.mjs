// The change in CO₂ per person since 1990 in the 27 EU member states, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `diverging bar` type in the scrolly format.
//
// THE SUBJECT OF `static-diverging-bar-eu-per-capita`, CHOREOGRAPHED. The reading of the frozen CSV, the claim
// ("the only EU country") and its assertions are the static beat's own; the scroll tells them with its own
// gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. 1990: the 27 levels, sorted;
//   2. 2024: each bar shortens to its level, the 1990 length kept as an outline; the falls counted;
//   3. the change alone: bars out of the zero line, rows re-sorted from the rise to the largest fall;
//   4. the axis closes onto ±0.5 t: Croatia's 0.03 t has a length;
//   5. the whole axis again, the mean of the falls drawn down; the countries past it kept;
//   6. the pull back.
//
// Usage:  bun proof/scrolly-diverging-bar-eu-per-capita/render-directions-scrolly.mjs

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
import { DirectedDivergingScrolly } from "./DirectedDivergingScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Union européenne";
const NB = "\u00A0";
const FROM = 1990;
const TO = 2024;
const MEMBERS = 27;
/** The close-up's domain: wide enough for the smallest fall to start inside it, narrow enough for 0.03 t. */
const ZOOM_DOMAIN = [-0.5, 0.1];
/** French names, with the article a sentence needs. A country the data carries and this table does not throws. */
const FRENCH = {
  Austria: ["AUT", "Autriche", "l’Autriche"], Belgium: ["BEL", "Belgique", "la Belgique"], Bulgaria: ["BGR", "Bulgarie", "la Bulgarie"],
  Croatia: ["HRV", "Croatie", "la Croatie"], Cyprus: ["CYP", "Chypre", "Chypre"], Czechia: ["CZE", "Tchéquie", "la Tchéquie"],
  Denmark: ["DNK", "Danemark", "le Danemark"], Estonia: ["EST", "Estonie", "l’Estonie"], Finland: ["FIN", "Finlande", "la Finlande"],
  France: ["FRA", "France", "la France"], Germany: ["DEU", "Allemagne", "l’Allemagne"], Greece: ["GRC", "Grèce", "la Grèce"],
  Hungary: ["HUN", "Hongrie", "la Hongrie"], Ireland: ["IRL", "Irlande", "l’Irlande"], Italy: ["ITA", "Italie", "l’Italie"],
  Latvia: ["LVA", "Lettonie", "la Lettonie"], Lithuania: ["LTU", "Lituanie", "la Lituanie"], Luxembourg: ["LUX", "Luxembourg", "le Luxembourg"],
  Malta: ["MLT", "Malte", "Malte"], Netherlands: ["NLD", "Pays-Bas", "les Pays-Bas"], Poland: ["POL", "Pologne", "la Pologne"],
  Portugal: ["PRT", "Portugal", "le Portugal"], Romania: ["ROU", "Roumanie", "la Roumanie"], Slovakia: ["SVK", "Slovaquie", "la Slovaquie"],
  Slovenia: ["SVN", "Slovénie", "la Slovénie"], Spain: ["ESP", "Espagne", "l’Espagne"], Sweden: ["SWE", "Suède", "la Suède"],
};

// ── the readings: the static beat's reader, copied so this beat renders on its own ─────────────
function changesBetween(csv, from, to) {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("CO"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0) throw new Error(`csv has no Entity / Year / CO₂ per capita column, got: ${header}`);
  const byCountry = new Map();
  for (const line of lines) {
    const cells = line.split(",");
    const year = Number(cells[yearAt]);
    if (year !== from && year !== to) continue;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    if (!byCountry.has(cells[entityAt])) byCountry.set(cells[entityAt], {});
    byCountry.get(cells[entityAt])[year] = value;
  }
  return [...byCountry.entries()]
    .filter(([, years]) => years[from] !== undefined && years[to] !== undefined)
    .map(([country, years]) => ({ country, from: years[from], to: years[to], change: years[to] - years[from] }))
    .sort((a, b) => b.change - a.change);
}

const changes = changesBetween(await readFile(join(HERE, "data.csv"), "utf8"), FROM, TO);
if (changes.length !== MEMBERS) throw new Error(`expected the ${MEMBERS} member states with a reading in both ${FROM} and ${TO}, got ${changes.length}`);
const rose = changes.filter((r) => r.change > 0);
const fell = changes.filter((r) => r.change < 0);
if (rose.length !== 1 || fell.length !== MEMBERS - 1)
  throw new Error(`the headline says exactly one rose and ${MEMBERS - 1} fell; the data says ${rose.length} and ${fell.length}`);
const french = (country) => {
  if (!FRENCH[country]) throw new Error(`${country} has no French name filed in this beat`);
  const [code, name, withArticle] = FRENCH[country];
  return { code, name, withArticle };
};
const subject = rose[0];
const mean = fell.reduce((s, r) => s + r.change, 0) / fell.length;
const byFall = [...fell].sort((a, b) => a.change - b.change);
const [largest, second] = byFall;
const byLevel = [...changes].sort((a, b) => b.from - a.from);
if (byLevel[0].country !== largest.country || byLevel[1].country !== second.country)
  throw new Error(`the first card names the two highest 1990 levels, the fifth the two largest falls; they are no longer the same two countries`);
if (!(subject.change > ZOOM_DOMAIN[0] && subject.change < ZOOM_DOMAIN[1]))
  throw new Error(`the close-up's domain ${ZOOM_DOMAIN.join(" to ")} does not hold ${french(subject.country).name}'s change`);
const beyondMean = fell.filter((r) => r.change < mean);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const two = (v) => plainSpaces(Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const share = (subject.change / subject.from) * 100;
const S = french(subject.country);
const L1 = french(largest.country);
const L2 = french(second.country);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `${cap(S.withArticle)} est le seul pays de l’UE à émettre plus de CO₂ par personne qu’en ${FROM}`,
  `${cap(S.withArticle)}, seul pays de l’UE à émettre plus qu’en ${FROM}`,
  `Une seule hausse dans l’UE depuis ${FROM}`,
];
const prose = [
  [`En ${FROM}, ${L1.withArticle} émettait ${one(largest.from)}${NB}t de CO₂ par personne, ${L2.withArticle} ${one(second.from)}${NB}t. Les ${MEMBERS} pays de l’UE, rangés de la plus forte émission à la plus faible.`],
  [`En ${TO}, les barres raccourcissent : ${fell.length} pays sur ${MEMBERS} émettent moins par personne qu’en ${FROM}.`],
  [`Ne gardons que l’écart. Chaque barre part de zéro, vers la gauche quand le pays émet moins ; les pays sont rangés de la hausse à la plus forte baisse.`],
  [`Tout en haut, la seule hausse : ${S.withArticle}, +${two(subject.change)}${NB}t sur une base de ${two(subject.from)}${NB}t, soit ${two(share)}${NB}%. Il faut resserrer l’axe pour la voir.`],
  [`Les ${fell.length} autres baissent, de ${two(mean)}${NB}t en moyenne. ${cap(L1.withArticle)} a perdu ${two(largest.change)}${NB}t par personne, ${L2.withArticle} ${two(second.change)}${NB}t.`],
  [`Lecture : chaque barre est l’écart entre ${TO} et ${FROM} pour une personne. À gauche de zéro, le pays émet moins qu’en ${FROM} ; à droite, plus.`],
];
const source = `Source : Global Carbon Budget (2025) ; population d’après diverses sources (${TO}), traitement Our World in Data · combustibles fossiles et industrie uniquement`;
const words = {
  levelUnit: `tonnes de CO₂ par personne, {year}`,
  changeUnit: `variation de ${FROM} à ${TO}, en tonnes de CO₂ par personne`,
  fell: { template: `{n} pays sur ${MEMBERS} émettent moins`, value: fell.length },
  note: `${S.name}${NB}: +${two(subject.change)}${NB}t sur ${two(subject.from)}${NB}t, soit +${two(share)}${NB}%`,
  meanNote: `moyenne des ${fell.length} baisses${NB}: −${two(mean)}${NB}t`,
};
const top = Math.max(...changes.map((r) => r.from));
const ticks = {
  level: [0, 10, 20, 30].filter((t) => t <= top * 1.02),
  change: [-20, -15, -10, -5, 0].filter((t) => t >= largest.change * 1.02),
  zoom: [-0.5, -0.25, 0],
};
const alt =
  `Barres divergentes : la variation des émissions de CO₂ par personne entre ${FROM} et ${TO} dans les ${MEMBERS} pays de l’UE. ` +
  `${cap(S.withArticle)} est la seule en hausse (+${two(subject.change)} t) ; les ${fell.length} autres baissent, de ${two(mean)} t en moyenne, ` +
  `et de ${two(largest.change)} t pour ${L1.withArticle}, la plus forte baisse.`;

/** One state per card; see `diverging-drive.mjs` for what each field paints. */
const STATES = [
  { year: 0, fell: 0, subject: 0, swap: 0, zoom: 0, note: 0, mean: 0, beyond: 0 },
  { year: 1, fell: 1, subject: 1, swap: 0, zoom: 0, note: 0, mean: 0, beyond: 0 },
  { year: 1, fell: 0, subject: 1, swap: 1, zoom: 0, note: 0, mean: 0, beyond: 0 },
  { year: 1, fell: 0, subject: 1, swap: 1, zoom: 1, note: 1, mean: 0, beyond: 0 },
  { year: 1, fell: 0, subject: 1, swap: 1, zoom: 0, note: 0, mean: 1, beyond: 1 },
  { year: 1, fell: 0, subject: 1, swap: 1, zoom: 0, note: 0, mean: 1, beyond: 0 },
];
console.log(`${rose.length} hausse · ${fell.length} baisses · moyenne ${mean.toFixed(2)} · ${beyondMean.length} au-delà de la moyenne\n`);

const rows = changes.map((r) => ({ code: french(r.country).code, name: french(r.country).name, from: r.from, to: r.to, change: r.change }));
const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${rows.map((r) => r.name).join(" ")} ${words.levelUnit} ${words.changeUnit} ${FROM} ${TO} 0123456789,+−`,
  annot: "",
  value: `${words.fell.template} ${words.note} ${words.meanNote} 0123456789`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "diverging-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: [`niveaux-${FROM}`, `niveaux-${TO}`, "ecart", "croatie", "moyenne", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedDivergingScrolly, {
          rows,
          years: [String(FROM), String(TO)],
          subject: S.code,
          mean,
          zoomDomain: ZOOM_DOMAIN,
          ticks,
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
        apply: "applyDivergingState",
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

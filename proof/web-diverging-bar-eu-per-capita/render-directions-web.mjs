// twin/proof/web-diverging-bar-eu-per-capita/render-directions-web.mjs
//
// The 27 EU member states' CO₂ per person, rendered once per FILED DIRECTION into a self-contained
// interactive page whose ZERO IS THE THING THE READER OPERATES.
//
// THE 27 ARE THE UNION'S OWN MEMBERSHIP, and the beat asserts every one of them carries a reading in
// both years before anything is drawn — a diverging bar with a country silently missing is a ranking
// that is wrong and does not know it.
//
// EVERY NUMBER THE PAGE PRINTS IS COMPUTED HERE. The three references, the counts above and below
// each of them, the label under every bar in every state, and the sentence each reference owes the
// reader: all derived from `data.csv` in this file and asserted here, so the browser never formats a
// figure and there is one implementation of "what is this number" for the three formats to disagree
// about (`chart-web/references/directed-interaction.md`, rule 4).
//
// Usage:  bun proof/web-diverging-bar-eu-per-capita/render-directions-web.mjs

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
import { DirectedDivergingBarWeb } from "./DirectedDivergingBarWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Union européenne";
const FROM = 1990;
const TO = 2024;

// HOW MANY GEOMETRY UNITS ONE CSS PIXEL IS WORTH AT THE NARROWEST WIDTH THIS FORMAT IS VERIFIED AT,
// and it is a MEASUREMENT rather than an estimate: `verify-web.mjs`'s narrowest viewport is 375 CSS
// pixels, and at that width `svg.chart` in this beat's own rendered page measures 195 px for a
// 720-unit viewBox. That is the floor `assertDatumDeclaration` refuses an indistinguishable
// reference with — two pills whose bars nowhere differ by a whole pixel are two pills and one
// picture. Re-measure it if the gutter or the frame width changes.
const UNITS_PER_CSS_PX = 720 / 195;

const NAMES = {
  AUT: "Autriche", BEL: "Belgique", BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre",
  CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", FRA: "France",
  DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie", IRL: "Irlande", ITA: "Italie",
  LVA: "Lettonie", LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", NLD: "Pays-Bas",
  POL: "Pologne", PRT: "Portugal", ROU: "Roumanie", SVK: "Slovaquie", SVN: "Slovénie",
  ESP: "Espagne", SWE: "Suède",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 2) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const signed = (v, d = 2) => `${v >= 0 ? "+" : "−"}${fr(Math.abs(v), d)}`;
// A BAR'S OWN FIGURE. Two decimals under a tonne, one above it: the claim turns on 0,03 t and a
// label reading "+0,0" would print the headline as zero. A value of exactly zero carries no sign,
// because that country IS the reference and "+0,00" would say it is above itself.
const barLabel = (v) =>
  v === 0 ? fr(0, 2) : Math.abs(v) < 1 ? signed(v, 2) : signed(v, 1);

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const all = csv.slice(1).map((line) => {
  const c = line.split(",");
  return { code: c[at("Code")], year: Number(c[at("Year")]), value: Number(c[header.length - 1]) };
});
const value = (code, year) => all.find((r) => r.code === code && r.year === year)?.value ?? null;

// THE ROW ORDER, AND IT IS A DECISION THE CONTROL DEPENDS ON. Sorted by each country's 2024 level,
// descending — a property of the countries that NO choice of zero can change — so the rows can stay
// still while every bar re-aims. Sorting by the default reference's own ranking would have forced
// the rows to re-sort under every other one, which is the movement the owner refused twice and the
// movement `interaction.mjs` cannot survive (it resolves a pointer off coordinates read once).
const rows = Object.keys(NAMES)
  .map((code) => {
    const before = value(code, FROM);
    const after = value(code, TO);
    if (before === null || after === null)
      throw new Error(`${NAMES[code]} has no reading in ${before === null ? FROM : TO}`);
    return { code, name: NAMES[code], before, after, change: after - before };
  })
  .sort((a, b) => b.after - a.after);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const risers = rows.filter((r) => r.change > 0);
if (risers.length !== 1)
  throw new Error(`the headline says exactly one member emits more than in ${FROM}; ${risers.length} do`);
const subject = risers[0];
const biggestFall = [...rows].sort((a, b) => a.change - b.change)[0];
const meanFall = rows.filter((r) => r.change < 0).reduce((s, r) => s + r.change, 0) / (rows.length - risers.length);

// ── THE REFERENCES ────────────────────────────────────────────────────────────────────────────
// A MEDIAN OF PER-CAPITA FIGURES IS NOT THE UNION'S PER-CAPITA FIGURE, and this page does not carry
// the populations that would make it one. So both references are named for what they are — the level
// of the MEMBER sitting in the middle of the twenty-seven — and never as "the Union's level".
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const MED_FROM = median(rows.map((r) => r.before));
const MED_TO = median(rows.map((r) => r.after));

const sides = (of) => {
  const above = rows.filter((r) => of(r) > 0);
  const on = rows.filter((r) => of(r) === 0);
  const below = rows.filter((r) => of(r) < 0);
  return { above, on, below };
};
const ownFrom = (r) => r.change;
const vsMedFrom = (r) => r.after - MED_FROM;
const vsMedTo = (r) => r.after - MED_TO;
const top = (of) => [...rows].sort((a, b) => of(b) - of(a))[0];

const sOwn = sides(ownFrom);
const sMedFrom = sides(vsMedFrom);
const sMedTo = sides(vsMedTo);

// The finding the fixed axis exists to carry, computed rather than claimed: the spread among the 27
// TODAY against the distance the biggest faller has travelled since 1990.
const spreadToday = Math.max(...rows.map((r) => r.after)) - Math.min(...rows.map((r) => r.after));

console.log(
  `${rows.length} États membres · un seul en hausse : ${subject.name} ${signed(subject.change)} t ` +
    `(${fr(subject.before)} vers ${fr(subject.after)}) · plus forte baisse ${biggestFall.name} ` +
    `${signed(biggestFall.change)} · baisse moyenne des 26 ${fr(meanFall)}\n` +
    `références : propre niveau ${FROM} (${sOwn.above.length} au-dessus) · médiane ${FROM} ` +
    `${fr(MED_FROM)} t (${sMedFrom.above.length} au-dessus) · médiane ${TO} ${fr(MED_TO)} t ` +
    `(${sMedTo.above.length} au-dessus, ${sMedTo.on.length} sur la ligne)\n` +
    `écart entre les 27 aujourd'hui : ${fr(spreadToday)} t, contre ${fr(Math.abs(biggestFall.change))} t ` +
    `parcourus par le ${biggestFall.name} seul\n`,
);
console.table(
  rows.map((r, i) => ({
    rang: i + 1, pays: r.name, [FROM]: fr(r.before), [TO]: fr(r.after),
    "vs 1990": signed(ownFrom(r)), [`vs méd. ${FROM}`]: signed(vsMedFrom(r)), [`vs méd. ${TO}`]: signed(vsMedTo(r)),
  })),
);

const shaped = rows.map((r) => ({
  code: r.code,
  name: r.name,
  // TRUE IN EVERY STATE, on purpose: the reader may be standing in any of the three references when
  // they point at a row, so the answer names all three rather than the one the page happens to be
  // drawing. It is also strictly more than any one state prints.
  detail:
    `${r.name} · ${fr(r.before)} t par personne en ${FROM}, ${fr(r.after)} en ${TO} · ` +
    `écart depuis ${FROM} : ${signed(r.change)} t` +
    (r.change > 0 ? ` (seule hausse)` : ``) +
    ` · à la médiane de ${FROM} : ${signed(vsMedFrom(r))} t` +
    ` · à celle de ${TO} : ${signed(vsMedTo(r))} t`,
}));

const valuesFor = (of) => rows.map((r) => ({ key: r.code, value: of(r), label: barLabel(of(r)) }));

const span = Math.ceil(Math.max(...rows.map((r) => Math.abs(r.change))));
const xTicks = [-span, -span / 2, 0, span / 2, span].map((t) => Math.round(t * 10) / 10);

const LABEL_OWN = `son niveau de ${FROM}`;
const LABEL_MED_FROM = `la médiane de ${FROM}`;
const LABEL_MED_TO = `la médiane d'aujourd'hui`;

const datum = {
  label: "Mesurer chaque pays depuis",
  noneLabel: LABEL_OWN,
  noneAnnounce:
    `Mesurer chaque pays depuis ${LABEL_OWN} : un seul des Vingt-Sept est au-dessus du sien, ` +
    `la ${subject.name}, ${signed(subject.change)} tonne par personne`,
  noneNote:
    `Zéro = le niveau de chaque pays en ${FROM}. Un seul des Vingt-Sept est au-dessus du sien : la ` +
    `${subject.name}, ${signed(subject.change)} t. Les ${sOwn.below.length} autres ont baissé de ` +
    `${fr(Math.abs(meanFall))} t en moyenne, le ${biggestFall.name} de ${fr(Math.abs(biggestFall.change))} t.`,
  span,
  base: valuesFor(ownFrom),
  options: [
    {
      key: `med${FROM}`,
      label: LABEL_MED_FROM,
      announce:
        `Mesurer chaque pays depuis ${LABEL_MED_FROM}, ${fr(MED_FROM)} tonnes par personne : ` +
        `${sMedFrom.above.length} des Vingt-Sept est encore au-dessus, ${top(vsMedFrom).name}`,
      note:
        `Zéro = ${fr(MED_FROM)} t, le niveau du membre médian en ${FROM}. Un seul est encore au-dessus, ` +
        `et ce n'est plus la ${subject.name} : ${top(vsMedFrom).name}, ` +
        `${signed(vsMedFrom(top(vsMedFrom)))} t.`,
      values: valuesFor(vsMedFrom),
    },
    {
      key: `med${TO}`,
      label: LABEL_MED_TO,
      announce:
        `Mesurer chaque pays depuis ${LABEL_MED_TO}, ${fr(MED_TO)} tonnes par personne : ` +
        `${sMedTo.above.length} pays au-dessus, ${sMedTo.below.length} en dessous`,
      note:
        `Zéro = ${fr(MED_TO)} t, le niveau du membre médian aujourd'hui. ${sMedTo.above.length} pays ` +
        `au-dessus, ${sMedTo.below.length} en dessous, ${sMedTo.on.map((r) => r.name).join(", ")} sur ` +
        `la ligne. La ${subject.name} passe à gauche ; le ${top(vsMedTo).name}, plus forte baisse de ` +
        `l'Union, est le plus haut de tous. Les Vingt-Sept ne s'écartent que de ${fr(spreadToday)} t ` +
        `d'un bout à l'autre, contre ${fr(Math.abs(biggestFall.change))} t parcourus par le ` +
        `${biggestFall.name} seul depuis ${FROM}.`,
      values: valuesFor(vsMedTo),
    },
  ],
};

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.change })),
  { subject: subject.name, declaredSequence: "t CO₂ par personne" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `La ${subject.name} est le seul pays de l'Union à émettre plus de CO₂ par personne qu'en ${FROM}`;
const caveat =
  `Écart de chaque État membre à la référence choisie ci-dessous, en tonnes de CO₂ par personne : à ` +
  `gauche en dessous, à droite au-dessus. Ni le classement (du plus gros émetteur de ${TO} au plus ` +
  `petit) ni l'axe, ${span} t de part et d'autre, ne bougent d'une référence à l'autre.`;
const subjectNote = `${subject.name} : seule au-dessus de son niveau de ${FROM}`;
const readingLine =
  `Lecture : changez la référence ci-dessus — le zéro se déplace, et avec lui qui est « au-dessus ». ` +
  `Survolez ou tabulez une ligne pour lire ses deux niveaux et son écart aux trois références.`;
const source = `Source : Global Carbon Budget (2025) · population, avec traitement Our World in Data · ${FROM} et ${TO}`;

const controlText = [
  datum.label, datum.noneLabel, datum.noneAnnounce, datum.noneNote,
  ...datum.options.flatMap((o) => [o.label, o.announce, o.note]),
].join(" ");

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${controlText} ${shaped.map((r) => r.detail).join(" ")}`,
  axis: `${xTicks.join(" ")} + − ${rows.map((r) => r.name).join(" ")}`,
  annot: subjectNote,
  value: [datum.base, ...datum.options.map((o) => o.values)].flat().map((v) => v.label).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedDivergingBarWeb,
      props: {
        rows: shaped,
        subject: subject.code,
        xTicks,
        span,
        datum,
        unitsPerCssPx: UNITS_PER_CSS_PX,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, subjectNote,
        sideLabels: { left: "sous la référence", right: "au-dessus de la référence" },
        alt:
          `Vingt-sept barres horizontales de part et d'autre d'une ligne zéro, une par État membre, ` +
          `classées du plus gros émetteur de ${TO} en haut au plus petit en bas. La référence dont ` +
          `part le zéro est au choix du lecteur : mesurés depuis leur propre niveau de ${FROM}, ` +
          `${sOwn.above.length} seul pays part vers la droite, la ${subject.name}, ` +
          `${signed(subject.change)} tonne par personne, et les ${sOwn.below.length} autres vers la ` +
          `gauche jusqu'au ${biggestFall.name} à ${signed(biggestFall.change)} tonnes ; mesurés depuis ` +
          `le pays médian d'aujourd'hui, ${sMedTo.above.length} partent à droite et ` +
          `${sMedTo.below.length} à gauche, et la ${subject.name} change de côté.`,
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
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A RUNNER THAT SWALLOWS A REFUSAL MAKES A REFUSED PAGE LOOK LIKE A PRODUCED ONE, and leaves the
  // previous render on disk to be read as this one.
  process.exitCode = 1;
}

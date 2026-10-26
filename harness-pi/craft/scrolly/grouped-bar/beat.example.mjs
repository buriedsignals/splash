// beat.mjs for the worked example proof/scrolly-wind-vs-solar — "In 5 of these 6 countries wind
// leads solar — Switzerland is the exception", as a scrolly. The shares are computed from data.json
// here; the gaps, their order, the earlier gaps and the ratio come from render-beat.mjs as `r` and
// are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR_COL] = [col("Entity"), col("Year")];
const YEAR = 2024;
const BEFORE = 2015;
// Every source column: a share is of their sum.
const SOURCES = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];
const at = SOURCES.map(col);
if (at.some((i) => i < 0)) throw new Error(`data.json lacks a source column: ${SOURCES.filter((_, i) => at[i] < 0).join(", ")}`);
const shares = (entity, year) => {
  const r = data.rows.find((x) => x[ENTITY] === entity && Number(x[YEAR_COL]) === year);
  if (!r) throw new Error(`no ${year} row for ${entity}`);
  const total = at.reduce((s, i) => s + Number(r[i]), 0);
  return { wind: (Number(r[col("Wind")]) / total) * 100, solar: (Number(r[col("Solar")]) / total) * 100 };
};
const FRENCH = { France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"], Norway: ["Norvège", "la Norvège"], Poland: ["Pologne", "la Pologne"], Sweden: ["Suède", "la Suède"], Switzerland: ["Suisse", "la Suisse"] };
const entities = [...new Set(data.rows.map((r) => r[ENTITY]))];
for (const e of entities) if (!FRENCH[e]) throw new Error(`no French name recorded for ${e}`);
const groups = entities.map((e) => {
  const now = shares(e, YEAR);
  const then = shares(e, BEFORE);
  return { name: FRENCH[e][0], first: now.wind, second: now.solar, earlierFirst: then.wind, earlierSecond: then.solar };
});
// "la Suisse", from a group's name.
const ARTICLE = Object.fromEntries(Object.values(FRENCH));
const the = (g) => ARTICLE[g.name];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signed = (v) => `${v >= 0 ? "+" : "−"}${one(Math.abs(v))}`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  groups,
  firstName: "Éolien",
  secondName: "Solaire",
  firstLeads: "l’éolien mène",
  secondLeads: "le solaire mène",
  subject: "Suisse",
  format: one,
  signed,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    first: (r) => `La part de l’éolien dans la production électrique de six pays européens en ${YEAR} : de ${one(r.topFirst.first)} % en ${r.topFirst.name} à ${one(r.subject.first)} % en ${r.subject.name}.`,
    second: (r) => `À côté, le solaire : ${one(r.subject.second)} % en ${r.subject.name}.`,
    gap: (r) => `Gardons seulement l’écart, éolien moins solaire. Au-dessus de zéro, l’éolien mène ; en dessous, le solaire. Un seul pays passe sous zéro : ${the(r.subject)}, ${signed(r.subject.gap)} points.`,
    sort: (r) => `Rangés par écart : ${the(r.leader)} en tête, ${signed(r.leader.gap)} points ; ${the(r.trailer)} en dernier.`,
    earlier: (r) => `En ${BEFORE}, ${the(r.subject)} était déjà sous zéro, à ${signed(r.subject.earlierGap)}. L’écart est ${one(r.widened)} fois plus grand aujourd’hui.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    first: () => `part de l’éolien, ${YEAR}, en %`,
    second: () => `et du solaire, en %`,
    gap: () => `éolien moins solaire, en points`,
    sort: () => "rangés par écart",
    earlier: () => `pointillé : l’écart en ${BEFORE}`,
    reading: (r) => `${cap(r.subject.name)} : solaire devant éolien`,
  },
  title: [
    "Dans 5 de ces 6 pays l’éolien devance le solaire — la Suisse est l’exception",
    "L’éolien devance le solaire partout, sauf en Suisse",
    "Éolien et solaire dans six pays européens",
  ],
  // The last card: the accounting the shares rest on.
  limits: `Lecture : part de chaque source dans la production électrique nationale en ${YEAR}, en %. Les pays sont classés par l’écart entre les deux, pas par ordre alphabétique.`,
  source: "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Barres groupées : la part de l’éolien et du solaire dans la production électrique de six pays européens en ${YEAR}. ` +
    `L’éolien devance le solaire partout sauf en ${r.subject.name}, où le solaire fait ${one(r.subject.second)} % et l’éolien ${one(r.subject.first)} %.`,
  evidenceLevels: 3,
  check(r) {
    if (!(r.secondLeading.length === 1 && r.secondLeading[0].name === "Suisse"))
      throw new Error(`the headline names Switzerland as the only country where solar leads; ${r.secondLeading.map((g) => g.name).join(", ") || "none"} do`);
    if (r.count !== 6) throw new Error(`the headline counts 6 countries; the data holds ${r.count}`);
    if (!(r.subject.earlierGap < 0)) throw new Error(`card 5 says Switzerland was already below zero in ${BEFORE}; its gap was ${r.subject.earlierGap.toFixed(2)}`);
    if (!(r.widened > 3)) throw new Error(`card 5 says Switzerland's gap is several times wider than in ${BEFORE}; ×${r.widened.toFixed(2)}`);
  },
};

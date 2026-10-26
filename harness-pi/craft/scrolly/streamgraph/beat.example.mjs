// beat.mjs for the worked example proof/scrolly-streamgraph-swiss-electricity — "En 2016, le solaire
// est devenu la troisième source d’électricité suisse", as a scrolly. Every number in a card is
// COMPUTED: the giants, the totals, the year solar reached its rank, the band it passed and the last
// year's multiple come from render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = data.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [ENTITY, YEAR] = [col("Entity"), col("Year")];
const FIRST = 2000;
/** 2025 is in the file and partial: a partial year drawn on a stream reads as a collapse. */
const LAST = 2024;
const LABELS = { Hydropower: "Hydraulique", Nuclear: "Nucléaire", Solar: "Solaire", Oil: "Pétrole", Gas: "Gaz", Bioenergy: "Bioénergie", "Other renewables": "Autres renouv.", Wind: "Éolien", Coal: "Charbon" };
// The layers: every column after Entity, Code, Year.
const keys = data.columns.slice(3).map((c) => c.name);
for (const k of keys) if (!LABELS[k]) throw new Error(`${k} has no French name filed in this beat`);
const readings = data.rows
  .filter((r) => r[ENTITY] === "Switzerland" && Number(r[YEAR]) >= FIRST && Number(r[YEAR]) <= LAST)
  .map((r) => ({ year: Number(r[YEAR]), ...Object.fromEntries(keys.map((k) => [k, Number(r[col(k)])])) }));

const fr = (v, d) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const two = (v) => fr(v, 2);
const one = (v) => fr(v, 1);
/** Two decimals under 1 TWh, one above. */
const format = (v) => (v < 1 ? two(v) : one(v));
const lower = (k) => LABELS[k].toLowerCase();

export default {
  lang: "fr",
  eyebrow: "Énergie · Suisse",
  keys,
  labels: LABELS,
  tracked: "Solar",
  readings,
  rank: 3,
  excluded: [{ year: LAST + 1, why: "année incomplète" }],
  unit: "production électrique suisse, en TWh",
  format,
  // The crossing is written to two decimals: at one, 1,33 and 1,28 would both print 1,3.
  formatCross: two,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    stream: (r) => `La production électrique de la Suisse, source par source, de ${r.first} à ${r.last}. L’épaisseur d’une bande est sa production.`,
    giants: (r) => `L’hydraulique et le nucléaire font l’essentiel : ${format(r.lastValues.Hydropower)} et ${format(r.lastValues.Nuclear)} TWh en ${r.last}, sur ${format(r.lastTotal)}.`,
    retreat: () => `Retirons ces deux géants. Les petites sources remplissent le cadre.`,
    cross: (r) => `En ${r.crossYear}, le ${lower("Solar")} dépasse le ${lower(r.rival)} : ${two(r.crossValues.Solar)} contre ${two(r.crossValues[r.rival])} TWh. Il devient la troisième source du pays et le reste depuis.`,
    end: (r) => `En ${r.last}, le ${lower("Solar")} produit ${format(r.lastValues.Solar)} TWh, ${one(r.multiple)} fois le ${lower(r.rival)}. Il en produisait ${format(r.firstValues.Solar)} en ${r.first}.`,
  },
  // The short accent note in the header while each card is read; card 1's counts the playhead's year.
  notes: {
    stream: () => "{year}",
    giants: (r) => `total : de ${format(r.firstTotal)} à ${format(r.lastTotal)} TWh`,
    retreat: () => "sans hydraulique ni nucléaire",
    cross: (r) => `${LABELS.Solar}, 3e source en ${r.crossYear}`,
    end: (r) => `${LABELS.Solar} : ${one(r.multiple)} fois le ${lower(r.rival)}`,
    reading: () => "pas d’axe vertical : les quantités sont écrites",
  },
  // The words beside the two rules (cards 4 and 5).
  marks: {
    cross: (r) => `${r.crossYear} : ${lower("Solar")} ${two(r.crossValues.Solar)} · ${lower(r.rival)} ${two(r.crossValues[r.rival])}`,
    end: (r) => `${r.last} : ${lower("Solar")} ${format(r.lastValues.Solar)} · ${lower(r.rival)} ${format(r.lastValues[r.rival])}`,
  },
  title: [
    `En 2016, le solaire est devenu la troisième source d’électricité suisse`,
    `Le solaire, troisième source d’électricité suisse depuis 2016`,
    `L’électricité suisse, source par source`,
  ],
  // The last card: how to read the stream, and what is left out.
  limits: `Lecture : l’épaisseur d’une bande est sa production ; sa position ne veut rien dire, les plus grandes au centre. Il n’y a donc pas d’axe vertical : les quantités sont écrites. ${LAST + 1} est exclue, année incomplète.`,
  source: `Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · ${LAST + 1} exclue, année incomplète`,
  alt: (r) =>
    `Graphique en flux : la production électrique suisse par source, de ${r.first} à ${r.last}, chaque bande épaisse comme sa production. ` +
    `L’hydraulique et le nucléaire dominent ; le solaire passe de ${format(r.firstValues.Solar)} à ${format(r.lastValues.Solar)} TWh et dépasse le pétrole en ${r.crossYear}.`,
  evidenceLevels: 3,
  check(r) {
    if (r.crossYear !== 2016) throw new Error(`the title says solar became the third source in 2016; it did in ${r.crossYear}`);
    if (r.rival !== "Oil") throw new Error(`card 4 says solar passed oil; it passed ${r.rival}`);
    if (!(r.multiple > 4)) throw new Error(`card 5 says solar ends several times oil; it is ${r.multiple.toFixed(2)} times`);
    if ([...r.giants].sort().join() !== "Hydropower,Nuclear") throw new Error(`card 2 says hydropower and nuclear are the giants; they are ${r.giants.join(", ")}`);
  },
};

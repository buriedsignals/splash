// beat.mjs for the worked example proof/static-hex-grid-europe-protection — "Per inhabitant it is not
// Germany: Czechia hosts 36 Ukrainians per 1,000". Every number on the plate is COMPUTED from
// data.json; the runner reads the codes and the values itself, by the column names given here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, PEOPLE, POP, MONTH] = [col("code"), col("people"), col("population"), col("month")];

const hosts = table.rows.map((r) => ({ code: r[CODE], people: Number(r[PEOPLE]), rate: (Number(r[PEOPLE]) / Number(r[POP])) * 1000 }));
const byRate = [...hosts].sort((a, b) => b.rate - a.rate);
const byCount = [...hosts].sort((a, b) => b.people - a.people);
const top = byRate[0];
const last = byRate[byRate.length - 1];
const largest = byCount[0];
const largestRank = byRate.indexOf(largest) + 1;
const month = table.rows[0][MONTH];

const plain = (s) => s.replace(/[   ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Migrations · Europe",
  // THE JOIN: the column of ISO3 codes matched against the grid's cells, and the value drawn.
  key: "code",
  value: "people",
  // Optional: divide value by this column and multiply by perBase (a rate per 1,000 inhabitants).
  per: "population",
  perBase: 1000,
  // Optional: keep only the rows matching every { column: value }.
  where: {},
  // The unit whose cell is ringed in the accent: the one the takeaway is about.
  subject: "CZE",
  // Grid cells data.json does not report: kept on the map without a fill (unmeasured, explained by
  // unmeasuredNote) or removed from the layout as outside the study (drop).
  unmeasured: ["UKR"],
  unmeasuredNote: [
    `L’Ukraine est sur la carte et hors du compte : c’est d’elle que viennent les personnes que les autres cases comptent.`,
    `L’Ukraine est sur la carte, hors du compte.`,
  ],
  drop: [],
  // The class breaks, in the drawn measure's units (4 breaks = 5 classes). Leave out to use quintiles.
  breaks: [5, 12, 18, 25],
  unit: "Ukrainiens sous protection temporaire pour 1 000 habitants",
  format: (v) => one(v),
  title: [
    // The first form is the journalist's takeaway, copied as written; check() holds its figure.
    "Par habitant, ce n’est pas l’Allemagne : la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants",
    `Par habitant, la Tchéquie accueille ${one(top.rate)} Ukrainiens pour 1 000 habitants`,
    `La protection temporaire, par habitant`,
    `La Tchéquie, pas l’Allemagne`,
  ],
  limits: [
    `Un hexagone par pays, tous de même taille, rangés à peu près comme la carte : la couleur est le ` +
      `nombre d’Ukrainiens sous protection temporaire pour 1 000 habitants en ${month}. L’Allemagne, ` +
      `première en nombre, est ${largestRank}e par habitant, à ${one(largest.rate)} pour 1 000.`,
    `Un hexagone par pays : les Ukrainiens sous protection pour 1 000 habitants.`,
  ],
  reading: [
    `Lecture : chaque pays pèse une case, quelle que soit sa taille. La disposition est dessinée à la main.`,
    `Lecture : chaque pays pèse une case.`,
  ],
  source: `Sources : Eurostat (migr_asytpsm), ${month} · population 2023, via Our World in Data`,
  alt:
    `Grille d’hexagones : un hexagone par pays européen, tous de même taille. La teinte donne le nombre ` +
    `d’Ukrainiens sous protection temporaire pour 1 000 habitants en ${month}. La Tchéquie est la plus ` +
    `foncée à ${one(top.rate)} pour 1 000 ; l’Allemagne, première en nombre absolu, n’est que ` +
    `${largestRank}e ici avec ${one(largest.rate)}, et la case la plus claire est à ${one(last.rate)}. ` +
    `L’Ukraine a sa case, hors du compte.`,
  check() {
    if (Math.round(top.rate * 10) / 10 !== 36.1) throw new Error(`the title says 36,1 per 1 000; the data gives ${one(top.rate)}`);
    if (top.code !== "CZE") throw new Error(`the title says Czechia leads per inhabitant; ${top.code} does`);
    if (largest.code !== "DEU") throw new Error(`the title says Germany leads by count; ${largest.code} does`);
    if (largest.code === top.code) throw new Error(`the same unit leads both rankings: there is no reversal to show`);
    if (!(largestRank > 5)) throw new Error(`Germany is ${largestRank}th per inhabitant, not far down`);
  },
};

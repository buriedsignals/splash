// beat.mjs for the worked example proof/static-hex-grid-europe-protection, as a GESTURE beat — "Par habitant, ce n’est
// pas l’Allemagne : la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants". One hexagon per country on the kit's
// designed grid; the staging is the `gestures` list. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, PEOPLE, POP, MONTH] = [col("code"), col("people"), col("population"), col("month")];
const FRENCH = { CZE: "Tchéquie", DEU: "Allemagne", POL: "Pologne", UKR: "Ukraine" };

// THE JOIN: `key` is the code the grid places; the value is a rate per 1,000 inhabitants, computed.
const rows = table.rows.map((r) => ({ key: r[CODE], name: FRENCH[r[CODE]] ?? r[CODE], value: (Number(r[PEOPLE]) / Number(r[POP])) * 1000 }));
// Ukraine has a cell on the grid and no reading: it is where the people counted come from. Drawn as no data.
rows.push({ key: "UKR", name: "Ukraine", value: null });

const measured = rows.filter((r) => r.value !== null);
const byRate = [...measured].sort((a, b) => b.value - a.value);
const top = byRate[0];
const germany = rows.find((r) => r.key === "DEU");
const month = table.rows[0][MONTH];
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[  ]/g, " ");

export default {
  eyebrow: "Migrations · Europe",
  rows,
  breaks: [5, 12, 18, 25],
  gestures: [
    { do: "name", mark: "CZE", note: `Tchéquie : ${one(top.value)} pour 1 000 habitants` },
    { do: "compare", marks: ["CZE", "DEU"], note: `L’Allemagne, première en nombre, n’en accueille que ${one(germany.value)} pour 1 000` },
  ],
  unit: "Ukrainiens sous protection temporaire pour 1 000 habitants",
  missingLabel: "hors du compte (pays d’origine)",
  format: (v) => one(v),
  title: [
    "Par habitant, ce n’est pas l’Allemagne : la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants",
    `La Tchéquie, pas l’Allemagne`,
  ],
  limits: [
    `Un hexagone par pays, tous de même taille : le nombre d’Ukrainiens sous protection temporaire pour 1 000 habitants en ${month}.`,
    `Un hexagone par pays, en ${month}.`,
  ],
  reading: ["Lecture : chaque pays pèse une case, quelle que soit sa taille. La disposition est dessinée à la main.", "Lecture : un pays, une case."],
  source: `Sources : Eurostat (migr_asytpsm), ${month} · population 2023, via Our World in Data`,
  alt: `Grille d’hexagones : un par pays européen. La Tchéquie est la plus foncée à ${one(top.value)} pour 1 000 ; l’Allemagne est à ${one(germany.value)}. L’Ukraine a sa case, hors du compte.`,
  check() {
    if (Math.round(top.value * 10) / 10 !== 36.1) throw new Error(`the title says 36,1 per 1 000; the data gives ${one(top.value)}`);
    if (top.key !== "CZE") throw new Error(`the title says Czechia leads per inhabitant; ${top.key} does`);
  },
};

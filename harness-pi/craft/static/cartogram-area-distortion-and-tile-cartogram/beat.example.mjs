// beat.mjs for the worked example proof/static-cartogram-europe-lowcarbon — "Counted by country,
// Europe's low-carbon share is 65.1 %; counted by the square kilometre, 44.9 %". Every number on the
// plate is COMPUTED from data.json; the grid, the join and the territory weights are the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { meansOf } from "./tile-grid.mjs";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const CODE = col("code");
const CLEAN = [
  "hydro_generation__twh", "wind_generation__twh", "solar_generation__twh",
  "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh",
].map(col);
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"].map(col);
const sum = (r, cols) => cols.reduce((s, i) => s + Number(r[i] || 0), 0);

// The join: one { code, value } per row of data.json; value null where the source reports nothing.
const values = table.rows.map((r) => {
  const clean = sum(r, CLEAN);
  const total = clean + sum(r, FOSSIL);
  return { code: String(r[CODE]), value: total > 0 ? (clean / total) * 100 : null };
});

// The two readings: one tile per country, and the territory a choropleth would give each.
const { byCountry, byArea, widest } = meansOf(values);
const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/[  ]/g, " ");
const NAMES = { RUS: "la Russie", UKR: "l’Ukraine", TUR: "la Turquie" };

export default {
  eyebrow: "Énergie · Europe",
  keyColumn: "code",
  values,
  breaks: [40, 60, 75, 94],
  format: (b) => `${b} %`,
  unit: "part bas-carbone de la production",
  missingLabel: "donnée non rapportée",
  title: [
    `Compté par pays, le bas-carbone européen est à 65,1 % ; compté au kilomètre carré, à 44,9 %`,
    `Par pays ${fr(byCountry)} % de bas-carbone ; par territoire ${fr(byArea)} %`,
    `Une tuile par pays`,
  ],
  limits: [
    `Une tuile égale par pays, rangée à peu près comme la carte. Sur un choroplèthe l’encre est proportionnelle au TERRITOIRE : ` +
      `${NAMES[widest.code] ?? widest.code} occupe ${Math.round(widest.areaShare)} % du dessin à ${fr(widest.value)} % de bas-carbone, et tire la lecture vers le bas.`,
    `Une tuile égale par pays. Sur un choroplèthe l’encre suit le territoire : ${fr(byArea)} % au kilomètre carré contre ${fr(byCountry)} % par pays.`,
    `Une tuile égale par pays : ${fr(byCountry)} % de bas-carbone en moyenne.`,
  ],
  reading: [
    `Lecture : chaque tuile est un pays et vaut autant que les autres. La disposition est dessinée à la main pour rester reconnaissable ; elle n’est mesurée sur rien.`,
    `Lecture : une tuile par pays, toutes de même taille. La disposition est dessinée, pas mesurée.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · fonds Natural Earth 50 m",
  alt: (tiles) =>
    `Cartogramme en tuiles : ${tiles.length} pays européens, une tuile égale chacun, teintés par leur part d’électricité bas-carbone. ` +
    `Comptée par pays la moyenne est de ${fr(byCountry)} % ; pondérée par le territoire, ${fr(byArea)} %.`,
  check() {
    if (Math.round(byCountry * 10) / 10 !== 65.1) throw new Error(`the mean by country is ${fr(byCountry)} %, not 65,1 %`);
    if (Math.round(byArea * 10) / 10 !== 44.9) throw new Error(`the mean by territory is ${fr(byArea)} %, not 44,9 %`);
  },
};

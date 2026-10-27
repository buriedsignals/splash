// beat.mjs for the worked example proof/static-cartogram-europe-lowcarbon, as a video GESTURE beat — "Compté par pays, le
// bas-carbone européen est à 65,1 % ; compté au kilomètre carré, à 44,9 %". One equal tile per country on the kit's
// designed grid; the staging is the `gestures` list. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [ENTITY, CODE] = [col("entity"), col("code")];
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"].map(col);
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"].map(col);
const sum = (r, cols) => cols.reduce((s, i) => s + Number(r[i] || 0), 0);
const FRENCH = { RUS: "Russie", UKR: "Ukraine", TUR: "Turquie", FRA: "France", NOR: "Norvège", POL: "Pologne" };

// THE JOIN: `key` is the ISO alpha-3 code the grid places; value null where the source reports nothing.
const rows = table.rows.map((r) => {
  const clean = sum(r, CLEAN);
  const total = clean + sum(r, FOSSIL);
  return { key: String(r[CODE]), name: FRENCH[r[CODE]] ?? r[ENTITY], value: total > 0 ? (clean / total) * 100 : null };
});
const drawn = rows.filter((r) => r.value !== null);
const byCountry = drawn.reduce((s, r) => s + r.value, 0) / drawn.length;
const russia = rows.find((r) => r.key === "RUS");
const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/[  ]/g, " ");

export default {
  eyebrow: "Énergie · Europe",
  rows,
  breaks: [40, 60, 75, 94],
  // A video takes exactly three gestures: reveal, subject, conclusion (the third shows the whole map).
  gestures: [
    { do: "reveal", note: `Moyenne par pays : ${fr(byCountry)} %` },
    { do: "name", mark: "RUS", note: `Russie, ${fr(russia.value)} %` },
    { do: "compare", marks: ["RUS", "NOR"] },
  ],
  format: (v) => `${Math.round(v)} %`,
  unit: "part bas-carbone de la production",
  missingLabel: "donnée non rapportée",
  title: [
    "Compté par pays, le bas-carbone européen est à 65,1 % ; compté au kilomètre carré, à 44,9 %",
    `Par pays, ${fr(byCountry)} % de bas-carbone`,
  ],
  limits: [
    `Une tuile égale par pays, rangée à peu près comme la carte : part de l’électricité bas-carbone en 2024, dans les ${drawn.length} pays dont la production est rapportée ; chaque pays pèse autant que les autres, quelle que soit sa surface.`,
    `Une tuile égale par pays.`,
  ],
  reading: ["Lecture : la disposition est dessinée à la main pour rester reconnaissable ; elle n’est mesurée sur rien.", "Lecture : une tuile par pays."],
  source: "Source : Ember, Energy Institute (2025), via Our World in Data",
  alt: `Cartogramme en tuiles : ${drawn.length} pays européens, une tuile égale chacun, teintés par leur part d’électricité bas-carbone ; ${fr(byCountry)} % en moyenne par pays.`,
  check() {
    if (Math.round(byCountry * 10) / 10 !== 65.1) throw new Error(`the mean by country is ${fr(byCountry)} %, not 65,1 %`);
  },
};

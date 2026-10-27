// beat.mjs for the worked example proof/static-parallel-coordinates-electricity-mix — "2 pays sur 16 font les deux :
// plus de 25 % de nucléaire et plus de 20 % d’éolien" — written for the gesture kit: the staging is the `gestures`
// list. Each country is a line across seven axes, each axis its own scale; every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [CODE, YEAR] = [col("code"), col("year")];
// THE AXIS ORDER IS THE ARGUMENT: nuclear beside wind, because the crossing between them is the claim.
const AXES = [
  ["nuclear_generation__twh", "Nucléaire"], ["wind_generation__twh", "Éolien"], ["solar_generation__twh", "Solaire"],
  ["hydro_generation__twh", "Hydraulique"], ["bioenergy_stacked_generation__twh", "Bioénergie"], ["gas_generation__twh", "Gaz"], ["coal_generation__twh", "Charbon"],
];
const ALL = [...AXES.map(([c]) => c), "oil_generation__twh", "other_renewables_generation__twh"];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni", SWE: "Suède", ITA: "Italie", FIN: "Finlande", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", POL: "Pologne", CZE: "Tchéquie", PRT: "Portugal", DNK: "Danemark", GRC: "Grèce", IRL: "Irlande",
};
// One line per country, 2024: each value is the source's share of the country's own production, in %.
const entities = data.rows
  .filter((r) => Number(r[YEAR]) === 2024)
  .map((r) => {
    const total = ALL.reduce((s, c) => s + Number(r[col(c)]), 0);
    return { name: NAMES[r[CODE]] ?? r[CODE], values: Object.fromEntries(AXES.map(([c, a]) => [a, (Number(r[col(c)]) / total) * 100])) };
  });
const both = entities.filter((e) => e.values["Nucléaire"] >= 25 && e.values["Éolien"] >= 20);
const france = entities.find((e) => e.name === "France");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[  ]/g, " ");

export default {
  eyebrow: "Énergie · Europe",
  axes: AXES.map(([, a]) => a),
  entities,
  // Each gesture carries its card: the sentence the reader reads while it plays, stating the figure its picture shows.
  gestures: [
    { do: "highlight", marks: both.map((e) => e.name), card: `${both[0].name} : ${one(both[0].values["Nucléaire"])} % de nucléaire et ${one(both[0].values["Éolien"])} % d’éolien.` },
    { do: "filter", marks: both.map((e) => e.name), card: `${both[1].name} : ${one(both[1].values["Nucléaire"])} % de nucléaire, ${one(both[1].values["Éolien"])} % d’éolien. Seuls ces 2 pays sur 16 passent les deux seuils.` },
    { do: "compare", marks: [`${both[1].name} · Éolien`, "France · Éolien"], note: `${one(both[1].values["Éolien"])} % contre ${one(france.values["Éolien"])} %`, card: `La France, très nucléaire, n’a que ${one(france.values["Éolien"])} % d’éolien.` },
  ],
  format: (v) => `${Math.round(v)} %`,
  title: "2 pays sur 16 font les deux : plus de 25 % de nucléaire et plus de 20 % d’éolien",
  limits: [
    "Chaque pays est une ligne qui traverse sept axes : sa part de chaque source dans sa propre électricité en 2024, chaque axe à sa propre échelle.",
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Coordonnées parallèles : ${entities.length} pays européens, chacun une ligne traversant sept axes. Seuls ${both.map((e) => e.name).join(" et ")} dépassent 25 % de nucléaire et 20 % d’éolien.`,
  check() {
    if (both.length !== 2) throw new Error(`${both.length} countries clear both floors, not 2`);
    if (entities.length !== 16) throw new Error(`${entities.length} countries, not 16`);
  },
};

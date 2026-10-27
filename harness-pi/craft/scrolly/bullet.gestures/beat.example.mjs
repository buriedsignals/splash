// beat.mjs for the worked example proof/static-bullet-low-carbon-share — « La Pologne : +17,3 points de bas-carbone
// depuis 2015, et toujours la seule des six sous la moitié » — written for the paired gesture kit (scrolly): a track
// to 100 %, 2015 thick and pale, 2024 thin and full; one card per gesture. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR] = [col("Entity"), col("Year")];
const SOURCES = table.columns.slice(3).map((c) => c.name);
const LOW_CARBON = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear"];
const shareFor = (entity, year) => {
  const row = table.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === year);
  const total = SOURCES.reduce((s, c) => s + Number(row[col(c)]), 0);
  return (LOW_CARBON.reduce((s, c) => s + Number(row[col(c)]), 0) / total) * 100;
};
const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
const rows = [...new Set(table.rows.map((r) => r[ENTITY]))]
  .map((name) => ({ name: FRENCH[name] ?? name, before: shareFor(name, 2015), after: shareFor(name, 2024) }))
  .sort((a, b) => b.after - b.before - (a.after - a.before));
const poland = rows.find((r) => r.name === "Pologne");
// The nearest of the others in 2024: what "the only one under half" is measured against.
const next = rows.filter((r) => r !== poland).sort((a, b) => a.after - b.after)[0];
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  eyebrow: "Énergie · Europe",
  // The comparative state first (thick, pale), the measure second (thin, full).
  series: ["2015", "2024"],
  rows: rows.map((r) => ({ name: r.name, values: [r.before, r.after] })),
  unit: "% bas-carbone",
  ceiling: 100,
  format: (v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }),
  gestures: [
    { do: "highlight", mark: "Pologne", card: `La Pologne passe de ${one(poland.before)} % à ${one(poland.after)} % d’électricité bas-carbone.` },
    { do: "annotate", mark: "Pologne", note: `+${one(poland.after - poland.before)} pts`, card: `+${one(poland.after - poland.before)} points : le plus fort gain des six.` },
    {
      do: "compare",
      marks: ["Pologne · 2024", `${next.name} · 2024`],
      card: `Et elle reste la seule sous la moitié : ${next.name === "Allemagne" ? "l’Allemagne" : next.name}, la plus proche, est à ${one(next.after)} %.`,
    },
  ],
  title: "La Pologne a gagné 17,3 points de bas-carbone depuis 2015, et reste la seule des six sous la moitié",
  limits: "Part du bas-carbone — nucléaire et renouvelables — dans la production électrique de chaque pays, en 2015 et en 2024.",
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Graphique à puces : la part du bas-carbone dans l’électricité de six pays européens, 2015 contre 2024, sur une piste jusqu’à 100 %. La Pologne progresse de ${one(poland.before)} % à ${one(poland.after)} %.`,
  check() {
    if (one(poland.after - poland.before) !== "17,3") throw new Error(`Poland gained ${one(poland.after - poland.before)} points, not 17,3`);
    const under = rows.filter((r) => r.after < 50);
    if (under.length !== 1 || under[0].name !== "Pologne") throw new Error(`under half in 2024: ${under.map((r) => r.name).join(", ") || "none"}`);
  },
};

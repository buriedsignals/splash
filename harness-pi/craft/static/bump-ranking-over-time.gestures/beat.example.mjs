// beat.mjs for the worked example proof/static-bump-emitter-rank — "L’Inde est passée du 8e au 3e rang mondial des
// émetteurs de CO2". The kit ranks every country at every year from these readings; the chart draws the top 10.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, YEAR, VALUE] = [col("Entity"), col("Code"), col("Year"), col("Annual CO₂ emissions")];

// Countries only — a three-letter code — so regions and the world never take a rank. In millions of tonnes.
const points = table.rows
  .filter((r) => /^[A-Z]{3}$/.test(String(r[CODE])) && Number(r[YEAR]) >= 1990 && Number(r[YEAR]) <= 2024)
  .map((r) => ({ series: r[ENTITY], t: Number(r[YEAR]), value: Number(r[VALUE]) / 1e6 }));
const rankOf = (s, t) => {
  const year = points.filter((p) => p.t === t).sort((a, b) => b.value - a.value);
  return year.findIndex((p) => p.series === s) + 1;
};
const [from, to] = [rankOf("India", 1990), rankOf("India", 2024)];

export default {
  eyebrow: "Climat · Monde",
  points,
  entity: "India",
  slots: 10,
  unit: "rang mondial",
  format: (v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }).replace(/[  ]/g, " "),
  title: "L’Inde est passée du 8e au 3e rang mondial des émetteurs de CO2",
  limits: "Rang mondial par émissions annuelles de CO2, 1990–2024. Le rang est une position, pas une taille.",
  source: "Source : Global Carbon Budget (2025), via Our World in Data · combustibles fossiles et industrie",
  alt: `Graphique de rangs : les pays passés par le top 10 des émetteurs de CO2 entre 1990 et 2024, l’Inde passant du ${from}e au ${to}e rang.`,
  gestures: [
    { do: "highlight", mark: "India" },
    { do: "compare", marks: ["2024 · India", "1990 · India"], note: `du ${from}e au ${to}e rang` },
  ],
  check() {
    if (!(to < from)) throw new Error(`India did not rise: rank ${from} in 1990, ${to} in 2024`);
  },
};

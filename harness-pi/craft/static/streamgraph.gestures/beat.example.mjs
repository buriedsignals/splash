// beat.mjs for the worked example proof/static-streamgraph-swiss-electricity — "En 2016, le solaire est devenu la
// troisième source d’électricité suisse". Every number is COMPUTED from data.json: the rank is checked against the
// ranking at 2016, the crossing with oil is solved by the kit, never read off the picture.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const YEAR = col("Year");
const labels = {
  Hydropower: "Hydraulique", Nuclear: "Nucléaire", Solar: "Solaire", Oil: "Pétrole", Gas: "Gaz",
  Bioenergy: "Bioénergie", "Other renewables": "Autres renouv.", Wind: "Éolien", Coal: "Charbon",
};
// 2025 is in the file and is partial (an incomplete year drawn reads as a collapse): left out, said in the source.
const rows = table.rows.filter((r) => r[col("Entity")] === "Switzerland" && Number(r[YEAR]) <= 2024);
const points = Object.keys(labels).flatMap((k) => rows.map((r) => ({ series: labels[k], t: Number(r[YEAR]), value: Number(r[col(k)]) })));
const at = (s, t) => points.find((p) => p.series === s && p.t === t).value;
const rankIn = (t) => [...new Set(points.map((p) => p.series))].sort((a, b) => at(b, t) - at(a, t)).indexOf("Solaire") + 1;
const fr = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[  ]/g, " ");

export default {
  eyebrow: "Énergie · Suisse",
  points,
  unit: "TWh par an",
  format: (v) => (v < 1 ? v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : fr(v)),
  title: "En 2016, le solaire est devenu la troisième source d’électricité suisse",
  limits: "Production électrique suisse par source, 2000–2024, en TWh. L’épaisseur d’une bande est sa production ; sa position ne veut rien dire.",
  source: "Source : Ember, Energy Institute, via Our World in Data · 2025 exclue, année incomplète",
  alt: `Streamgraph de la production électrique suisse par source, 2000–2024 : la bande solaire passe de ${fr(at("Solaire", 2000))} à ${fr(at("Solaire", 2024))} TWh et devient la troisième source en 2016.`,
  gestures: [
    { do: "highlight", mark: "Solaire" },
    { do: "compare", marks: ["Solaire", "Pétrole"], note: "le solaire passe le pétrole" },
    { do: "annotate", mark: "2016 · Solaire", note: `3e source en 2016 : ${fr(at("Solaire", 2016))} TWh` },
  ],
  check() {
    if (rankIn(2016) !== 3 || rankIn(2015) <= 3) throw new Error(`solar ranks ${rankIn(2016)} in 2016 and ${rankIn(2015)} in 2015: it did not become third in 2016`);
  },
};

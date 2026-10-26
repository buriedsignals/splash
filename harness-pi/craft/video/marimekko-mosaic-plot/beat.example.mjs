// beat.mjs for the worked example proof/video-marimekko-electricity-mix — « Le charbon, 12 % de l’électricité de six
// pays, tient dans deux colonnes », told in time. Every number the video draws is COMPUTED from data.json; the tracked
// band's total, share and holders are computed by render-beat.mjs and handed to check().
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR] = [col("Entity"), col("Year")];

// The stack, bottom to top: fossil, nuclear, renewables — the tracked band first, at the foot.
const bandOrder = [
  { key: "Coal", label: "Charbon" },
  { key: "Oil", label: "Pétrole" },
  { key: "Gas", label: "Gaz" },
  { key: "Nuclear", label: "Nucléaire" },
  { key: "Bioenergy", label: "Bioénergie" },
  { key: "Other renewables", label: "Autres renouv." },
  { key: "Hydropower", label: "Hydraulique" },
  { key: "Solar", label: "Solaire" },
  { key: "Wind", label: "Éolien" },
];
const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };

// One column per country, 2024 only.
const columns = data.rows
  .filter((r) => Number(r[YEAR]) === 2024)
  .map((r) => ({ key: r[ENTITY], label: FRENCH[r[ENTITY]] ?? r[ENTITY], values: Object.fromEntries(bandOrder.map((b) => [b.key, Number(r[col(b.key)])])) }));

export default {
  lang: "fr",
  eyebrow: "Énergie\u00A0· Europe",
  columns,
  bandOrder,
  tracked: "Coal",
  // The two largest holders of the tracked band are named in the strip and ringed at the end.
  named: 2,
  when: "2024",
  unit: "TWh",
  // A column's total under its brace, and the whole's: whole TWh, French grouping.
  format: (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\s\u202F]/g, "\u00A0"),
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    "Le charbon, 12\u00A0% de l’électricité de six pays, tient dans deux colonnes",
    "Le charbon, 12\u00A0% de six pays, tient dans deux colonnes",
  ],
  source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  evidenceLevels: 3,
  check({ trackedShare, holders }) {
    if (Math.round(trackedShare * 100) !== 12) throw new Error(`the title says 12 %; coal is ${(trackedShare * 100).toFixed(1)} % of the six`);
    const two = holders[0].value + holders[1].value;
    const all = holders.reduce((s, h) => s + h.value, 0);
    if (!(two / all >= 0.95)) throw new Error(`the title says two columns hold the coal; the two largest hold ${((two / all) * 100).toFixed(1)} %`);
  },
};

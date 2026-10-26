// beat.mjs for the worked example proof/video-connected-scatter-lowcarbon — « Tous plus propres chez eux, 5 plus légers
// en Europe », told in time. Every number the video draws is COMPUTED from data.json; the entities that rose, the ones
// that moved left and the subject's two moves are found by render-beat.mjs and checked here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const LOW_CARBON = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const FRENCH = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni", SWE: "Suède", ITA: "Italie", FIN: "Finlande", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", POL: "Pologne", CZE: "Tchéquie", PRT: "Portugal", DNK: "Danemark", GRC: "Grèce", IRL: "Irlande",
};

// Each country's low-carbon and total generation, by year.
const reading = (code, year) => {
  const r = table.rows.find((row) => row[col("code")] === code && String(row[col("year")]) === year);
  const sum = (cols) => cols.reduce((s, c) => s + Number(r[col(c)]), 0);
  return { lc: sum(LOW_CARBON), total: sum(LOW_CARBON) + sum(FOSSIL) };
};
const codes = [...new Set(table.rows.map((r) => r[col("code")]))];
const group = (year) => codes.reduce((s, c) => s + reading(c, year).lc, 0);
// x: the country's weight in the group's low-carbon electricity, in %; y: the low-carbon share of its own, in %.
const state = (code, year) => ({ x: (reading(code, year).lc / group(year)) * 100, y: (reading(code, year).lc / reading(code, year).total) * 100 });
const entities = codes.map((code) => ({ name: code, label: FRENCH[code] ?? code, code, from: state(code, "2000"), to: state(code, "2024") }));

// The claim: every country cleaner at home, and five weigh less in the group.
const cleaner = entities.filter((e) => e.to.y > e.from.y);
const lighter = entities.filter((e) => e.to.x < e.from.x);
const n = entities.length;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  entities,
  subject: "FRA",
  from: "2000",
  to: "2024",
  closeUp: 12,
  xName: `part du bas-carbone des ${n} pays, en %`,
  yName: ["bas-carbone dans sa propre électricité, en %", "bas-carbone dans son électricité, en %", "bas-carbone chez soi, en %"],
  // The two counters: `k` of the `n` that rose as the discs land, then `k` of those that moved left as they are picked.
  cleaner: (k, all) => `${k} sur ${all} plus propres`,
  cleanerLines: (k, all) => [`${k} sur ${all}`, "plus propres"],
  lighter: (k) => `${k} plus légers`,
  // Written only when a narrow frame cannot name every country: `k` of `all` named.
  named: (k, all) => `${k} des ${all} pays nommés`,
  moveUnit: "pts",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["Tous plus propres chez eux, 5 plus légers en Europe", "Plus propres chez eux, plus légers en Europe"],
  source: [
    "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
    "Source : Ember, Energy Institute, via Our World in Data",
    "Source : Ember, via Our World in Data",
  ],
  evidenceLevels: 4,
  check() {
    if (cleaner.length !== n) throw new Error(`the title says every country cleaned up at home; ${n - cleaner.length} did not`);
    if (lighter.length !== 5) throw new Error(`the title says 5 weigh less in the group; ${lighter.length} do`);
  },
};

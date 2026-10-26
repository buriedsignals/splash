// beat.mjs for the worked example proof/video-slope-europe-lowcarbon — « Les seize pays ont tous gagné du bas-carbone
// depuis 2000 — un seul a doublé la France », told in time. Every number the video draws is COMPUTED from data.json;
// which lines started under France, which passed it and where the pair crosses are derived by render-beat.mjs, and
// check() tests the claim on the same data.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const FROM = 2000;
const TO = 2024;
const LOW = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande", France: "France",
  Germany: "Allemagne", Greece: "Grèce", Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne",
  Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède", "United Kingdom": "Royaume-Uni",
};
const ENTITY = col("entity");
const YEAR = col("year");
// The low-carbon share of a country's generation in one year, in percent.
const shareOf = (entity, year) => {
  const r = data.rows.find((z) => z[ENTITY] === entity && Number(z[YEAR]) === year);
  const sum = (keys) => keys.reduce((s, k) => s + Number(r[col(k)] || 0), 0);
  return (sum(LOW) / (sum(LOW) + sum(FOSSIL))) * 100;
};
const lines = [...new Set(data.rows.map((r) => r[ENTITY]))].sort().map((entity) => ({ key: entity, label: FRENCH[entity] ?? entity, from: shareOf(entity, FROM), to: shareOf(entity, TO) }));

const NB = " ";
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const france = lines.find((d) => d.key === "France");
const passers = lines.filter((d) => d !== france && d.from < france.from && d.to > france.to);

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  lines,
  rails: { left: String(FROM), right: String(TO) },
  held: "France",
  subject: "Finland",
  format: (v) => one(v),
  riseLabel: (n) => `${n}${NB}en hausse`,
  passLabel: (n) => `${n}${NB}dépasse la France`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["Les seize pays ont tous gagné du bas-carbone depuis 2000 — un seul a doublé la France", "Un seul pays a doublé la France"],
  source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, via Our World in Data"],
  evidenceLevels: 4,
  check() {
    if (lines.length !== 16) throw new Error(`the title says sixteen countries; data.json holds ${lines.length}`);
    const fell = lines.filter((d) => !(d.to > d.from));
    if (fell.length) throw new Error(`the title says all rose; ${fell.map((d) => d.label).join(", ")} did not`);
    if (passers.length !== 1 || passers[0].key !== "Finland") throw new Error(`the title says one country passed France (Finland); ${passers.map((d) => d.label).join(", ") || "none"} did`);
  },
};

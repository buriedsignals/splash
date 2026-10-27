// beat.mjs for the worked example proof/static-slope-europe-lowcarbon — "Les 16 pays ont tous gagné du bas-carbone
// depuis 2000 — un seul a doublé la France" — written for the Position gesture kit. Every number on the plate is
// COMPUTED from data.json; the title's first form is the journalist's takeaway, copied as written.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const rowsOf = table.rows.map((r) => Object.fromEntries(table.columns.map((c, i) => [c.name, r[i]])));
const FROM = 2000;
const TO = 2024;
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const ALL = [...CLEAN, "gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const sum = (row, keys) => keys.reduce((s, k) => s + Number(row[k] || 0), 0);
const shareOf = (row) => (sum(row, CLEAN) / sum(row, ALL)) * 100;
const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande", France: "France",
  Germany: "Allemagne", Greece: "Grèce", Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne",
  Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède", "United Kingdom": "Royaume-Uni",
};
const all = [...new Set(rowsOf.map((r) => r.entity))].map((entity) => {
  const a = rowsOf.find((r) => r.entity === entity && r.year === FROM);
  const b = rowsOf.find((r) => r.entity === entity && r.year === TO);
  return { name: FRENCH[entity] ?? entity, from: shareOf(a), to: shareOf(b), total: sum(b, ALL) };
});
const climber = all.find((d) => d.name === "Finlande");
const held = all.find((d) => d.name === "France");
const passed = all.filter((d) => d !== held && d.from < held.from && d.to > held.to);
// At most six lines: a slope prints every end it draws. The pair first, then the largest producers.
const rows = [climber, held, ...all.filter((d) => d !== climber && d !== held).sort((a, b) => b.total - a.total).slice(0, 4)].map(({ name, from, to }) => ({ name, from, to }));

const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Énergie · Europe",
  rows,
  moments: [String(FROM), String(TO)],
  gestures: [
    { do: "highlight", mark: "Finlande" , card: `La Finlande produisait ${one(climber.from)} % de son électricité sans carbone en ${FROM}.` },
    { do: "compare", marks: ["Finlande", "France"], note: `${one(climber.to)} % contre ${one(held.to)} % en ${TO}` , card: `En ${TO}, elle atteint ${one(climber.to)} %, devant la France à ${one(held.to)} %.` },
    { do: "name", mark: "France", note: `${one(held.from)} % en ${FROM}, ${one(held.to)} % en ${TO}` , card: `La France partait de ${one(held.from)} % en ${FROM}.` },
  ],
  unit: "Part de l’électricité bas-carbone, en %",
  format: (v) => one(v),
  title: [
    `Les ${all.length} pays ont tous gagné du bas-carbone depuis ${FROM} — un seul a doublé la France`,
    `Tous ont progressé depuis ${FROM}, et la Finlande a doublé la France`,
  ],
  limits: [
    `Part de l’électricité produite à partir de sources bas-carbone — renouvelables et nucléaire réunis — en ${FROM} et en ${TO}, seize pays européens ; les ${rows.length} plus gros producteurs, dont la paire, sont dessinés.`,
    `Électricité bas-carbone, ${FROM} et ${TO} : ${rows.length} des ${all.length} pays.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (drawn) => `Graphique de pente de ${drawn.length} pays européens : part de l’électricité bas-carbone en ${FROM} et en ${TO}. La Finlande passe de ${one(climber.from)} % à ${one(climber.to)} % et dépasse la France, à ${one(held.to)} %.`,
  check() {
    const fell = all.filter((d) => d.to <= d.from);
    if (fell.length) throw new Error(`the title says all rose; ${fell.map((d) => d.name).join(", ")} did not`);
    if (!(climber.from < held.from && climber.to > held.to)) throw new Error("Finland did not overtake France");
    if (passed.length !== 1) throw new Error(`the title says one country overtook France; ${passed.length} did`);
  },
};

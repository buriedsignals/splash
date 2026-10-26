// beat.mjs for the worked example proof/static-slope-europe-lowcarbon — "All sixteen countries
// gained low-carbon electricity since 2000, and only one overtook France". Every number on the
// plate is COMPUTED from data.json; every claim the title makes is checked against all sixteen.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const rows = table.rows.map((r) => Object.fromEntries(table.columns.map((c, i) => [c.name, r[i]])));

const FROM = 2000;
const TO = 2024;
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const ALL = [...CLEAN, "gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const sum = (row, keys) => keys.reduce((s, k) => s + Number(row[k] || 0), 0);
const shareOf = (row) => (sum(row, CLEAN) / sum(row, ALL)) * 100;

const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande",
  France: "France", Germany: "Allemagne", Greece: "Grèce", Ireland: "Irlande", Italy: "Italie",
  Netherlands: "Pays-Bas", Poland: "Pologne", Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède",
  "United Kingdom": "Royaume-Uni",
};

// Every country, with its share at both rails and its size (total generation at the right rail).
const all = [...new Set(rows.map((r) => r.entity))].map((entity) => {
  const a = rows.find((r) => r.entity === entity && r.year === FROM);
  const b = rows.find((r) => r.entity === entity && r.year === TO);
  return { key: entity, label: FRENCH[entity] ?? entity, from: shareOf(a), to: shareOf(b), total: sum(b, ALL) };
});

const climber = all.find((d) => d.key === "Finland");
const held = all.find((d) => d.key === "France");
const passedFrance = all.filter((d) => d !== held && d.from < held.from && d.to > held.to);
const biggestOfAll = all.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));

// AT MOST SIX LINES: a slope prints every end value it draws, so it cannot draw many. The pair the
// title is about first, then the largest producers. The pair is the thread (the accent).
const pair = [climber, held];
const lines = [...pair, ...all.filter((d) => !pair.includes(d)).sort((a, b) => b.total - a.total).slice(0, 4)]
  .map((d) => ({ key: d.key, label: d.label, from: d.from, to: d.to, thread: pair.includes(d) }));
const biggest = lines.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));

const plain = (s) => s.replace(/[   ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Énergie · Europe",
  lines,
  rails: { left: String(FROM), right: String(TO) },
  subject: climber.key,
  format: (v) => one(v),
  formatDelta: (v) => `${v >= 0 ? "+" : "−"}${one(Math.abs(v))}`,
  // The headline in forms, longest first: the renderer takes the longest that fits.
  title: [
    `Les ${all.length} pays ont tous gagné du bas-carbone depuis ${FROM} — un seul a doublé la France`,
    `Tous ont progressé depuis ${FROM}, et la Finlande a doublé la France`,
    `Tous ont progressé, et la Finlande a doublé la France`,
  ],
  limits: [
    `Part de l’électricité produite à partir de sources bas-carbone — renouvelables et nucléaire réunis — en ${FROM} et en ${TO}. ` +
      `Les ${lines.length} plus gros producteurs du groupe de ${all.length} pays étudiés ; plus fort progrès : ` +
      `${biggestOfAll.label} (+${Math.round(biggestOfAll.to - biggestOfAll.from)} points). La Finlande était ` +
      `${one(held.from - climber.from)} points sous la France en ${FROM} ; elle est devant en ${TO}.`,
    `Part de l’électricité bas-carbone en ${FROM} et en ${TO} : ${lines.length} des ${all.length} pays étudiés, qui ont tous progressé.`,
    `Électricité bas-carbone, ${FROM} et ${TO} : ${lines.length} des ${all.length} pays.`,
  ],
  // How to read the form, in forms; the renderer may drop it.
  reading: [
    `Lecture : chaque ligne est un pays, d’une teinte d’un bout à l’autre. Il n’y a pas d’axe : la pente donne le sens, les deux nombres donnent le niveau, l’écart est écrit à droite, en points.`,
    `Lecture : pas d’axe — la pente donne le sens, les nombres le niveau, l’écart est à droite.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt:
    `Slope chart de ${lines.length} pays européens : part de l’électricité bas-carbone en ${FROM} et en ${TO}. ` +
    `Toutes les lignes montent. ${biggest.label} passe de ${one(biggest.from)} % à ${one(biggest.to)} %. La Finlande, ` +
    `${one(climber.from)} % en ${FROM} contre ${one(held.from)} % pour la France, atteint ${one(climber.to)} % en ${TO} ` +
    `et passe devant la France à ${one(held.to)} %.`,
  // Four levels: the crossing pair, the other lines, the end values, the deltas.
  evidenceLevels: 4,
  check() {
    const fell = all.filter((d) => d.to <= d.from);
    if (fell.length) throw new Error(`the title says all rose; ${fell.map((d) => d.label).join(", ")} did not`);
    if (!(climber.from < held.from && climber.to > held.to)) throw new Error(`Finland did not overtake France`);
    if (passedFrance.length !== 1) throw new Error(`the title says one country overtook France; ${passedFrance.length} did`);
  },
};

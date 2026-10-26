// beat.mjs for the worked example proof/scrolly-dot-density-europe-stations — "72 réacteurs sur 8 900
// centrales bas-carbone — et un tiers de la puissance", as a scrolly. Every number in a card is
// COMPUTED: the counts, the shares and the focus region's averages come from render-beat.mjs as `r` and
// are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [COUNTRY, FUEL, MW, LON, LAT] = ["country", "fuel", "capacity_mw", "lon", "lat"].map(col);
// EVERY station, one dot each.
const sites = table.rows.map((r) => ({ value: Number(r[MW]), lon: Number(r[LON]), lat: Number(r[LAT]), group: r[FUEL], region: r[COUNTRY] }));

const FUEL_WORDS = { Solar: "solaire", Wind: "éolien", Hydro: "hydraulique", Biomass: "biomasse", Geothermal: "géothermie", "Wave and Tidal": "marées", Nuclear: "nucléaire" };
const IN_REGION = { France: "en France", "United Kingdom": "au Royaume-Uni", Germany: "en Allemagne", Russia: "en Russie" };
const REGION = { France: "France", "United Kingdom": "Royaume-Uni", Germany: "Allemagne", Russia: "Russie" };
const n0 = (v) => Math.round(v).toLocaleString("fr-FR");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const listOf = (xs) => `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`;
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const named = (table, key) => {
  if (!table[key]) throw new Error(`${key} is named by a card and this beat has no French word for it`);
  return table[key];
};

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  sites,
  // Card 3 rings this group's sites.
  subject: "Nuclear",
  // Card 5 sets the subject's mean site against this group's, in the focus region.
  compareGroup: "Solar",
  keySizes: [100, 1000, 5000],
  unit: "centrales bas-carbone recensées",
  counter: "{n} centrales",
  dotIs: "un point = une centrale bas-carbone",
  subjectIs: (r) => `${r.subject.count} sites nucléaires`,
  weightIs: "surface proportionnelle à la puissance",
  subjectNote: (r) => `${r.subject.count} sites nucléaires : ${one(r.subject.siteShare)} % des centrales`,
  weightNote: (r) => `${r.subject.count} sites nucléaires : ${one(r.subject.valueShare)} % de la puissance`,
  zoomNote: (r) => `${named(REGION, r.focus.region)} : ${n0(r.focus.subjectMean)} MW par site nucléaire, ${one(r.focus.compareMean)} MW par site solaire`,
  limitNote: "La base recense les centrales qu’elle connaît ; le petit solaire et le petit éolien y sont sous-représentés.",
  // A site's value is printed with one decimal under 10 MW, none above.
  format: (v) => `${v < 10 ? one(v) : n0(v)} MW`,
  count: n0,
  percent: (v) => `${one(v)} %`,
  cards: {
    empty: (r) => `La base mondiale des centrales du WRI recense ${n0(r.count)} centrales bas-carbone dans ce cadre, chacune à ses propres coordonnées.`,
    dots: (r) => `Un point par centrale, filière par filière : ${listOf(r.groups.map((g) => named(FUEL_WORDS, g.group)))}. ${n0(r.othersCount)} points.`,
    subject: (r) => `Il en manque ${r.subject.count} : les sites nucléaires. ${one(r.subject.siteShare)} % des centrales seulement.`,
    weight: (r) => `Donnons à chaque point la surface de sa puissance. Le solaire devient poussière ; les ${r.subject.count} sites nucléaires portent ${one(r.subject.valueShare)} % de la puissance.`,
    focus: (r) =>
      `${capital(named(IN_REGION, r.focus.region))}, qui compte ${r.focus.count} des ${r.subject.count} sites, un site nucléaire pèse en moyenne ${n0(r.focus.subjectMean)} MW ; un site solaire, ${one(r.focus.compareMean)} MW.`,
  },
  title: [
    "72 réacteurs sur 8 900 centrales bas-carbone — et un tiers de la puissance",
    "72 sites nucléaires, un tiers de la puissance bas-carbone",
    "Où sont les centrales bas-carbone d’Europe",
  ],
  limits: "Lecture : un point, une centrale, à ses coordonnées. La base recense les centrales qu’elle connaît : le petit solaire et le petit éolien y sont sous-représentés.",
  source: "Source : WRI Global Power Plant Database v1.3.0 · fond de carte © MapTiler © OpenStreetMap",
  alt: (r) =>
    `Carte de l’Europe où chacune des ${n0(r.count)} centrales bas-carbone est un point à ses coordonnées. Les ${r.subject.count} sites nucléaires, ` +
    `cerclés, ne sont que ${one(r.subject.siteShare)} % des centrales mais portent ${one(r.subject.valueShare)} % de la puissance installée.`,
  // The claim checked against the drawn data (CONTRACT.md).
  check(r) {
    if (r.subject.count !== 72 || r.count !== 8900) throw new Error(`the title says 72 reactors among 8 900 stations; there are ${r.subject.count} among ${r.count}`);
    if (!(r.subject.siteShare < 1)) throw new Error(`the title says nuclear is under 1 % of the sites; it is ${r.subject.siteShare.toFixed(2)} %`);
    if (!(r.subject.valueShare > 30)) throw new Error(`the title says nuclear carries a third of the capacity; it is ${r.subject.valueShare.toFixed(1)} %`);
    if (r.mostConcentrated !== "Nuclear") throw new Error(`card 4 says nuclear is the most concentrated; ${r.mostConcentrated} is`);
    if (!(r.focus.ratio > 100)) throw new Error(`card 5 says a nuclear site outweighs a solar site by orders of magnitude in ${r.focus.region}; the ratio is ${r.focus.ratio.toFixed(0)}`);
  },
};

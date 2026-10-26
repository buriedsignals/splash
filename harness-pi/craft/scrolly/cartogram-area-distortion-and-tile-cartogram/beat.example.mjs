// beat.mjs for the worked example proof/scrolly-cartogram-europe-lowcarbon — "Compté par pays, le
// bas-carbone européen est à 65,1 % ; compté au kilomètre carré, à 44,9 %", as a scrolly. Every
// number in a card is COMPUTED: the three means, the widest country's share of the territory and the
// production ranking come from render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [CODE, YEAR_COL] = [col("code"), col("year")];
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"].map(col);
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"].map(col);
const YEAR = table.rows[0][YEAR_COL];

// The value is the low-carbon share of generation; the weight is the generation itself (TWh). A
// country whose generation is not reported is null — a hollow tile.
const rows = table.rows.map((r) => {
  const clean = CLEAN.reduce((s, i) => s + Number(r[i] || 0), 0);
  const total = clean + FOSSIL.reduce((s, i) => s + Number(r[i] || 0), 0);
  return { iso: r[CODE], name: r[CODE], value: total > 0 ? (clean / total) * 100 : null, weight: total };
});
// The French names (and articles) the cards print.
const NAMES = {
  RUS: ["Russie", "la Russie"], UKR: ["Ukraine", "l’Ukraine"], FRA: ["France", "la France"],
  MLT: ["Malte", "Malte"], LUX: ["Luxembourg", "le Luxembourg"],
};
for (const r of rows) if (NAMES[r.iso]) r.name = NAMES[r.iso][0];
const article = (iso) => {
  if (!NAMES[iso]) throw new Error(`${iso} is named by a card and this beat has no French name for it`);
  return NAMES[iso][1];
};
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const number = (v, d) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const one = (v) => number(v, 1);
const twh = (v) => Math.round(v).toLocaleString("fr-FR");

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  rows,
  breaks: [40, 60, 75, 94],
  format: (b) => `${b} %`,
  number,
  unit: "part bas-carbone de la production",
  missingLabel: "donnée non rapportée",
  counters: { area: "au km² : {n} %", country: "par pays : {n} %", weight: "au kWh : {n} %" },
  subjectNote: (r) => `${r.widest.name} · ${Math.round(r.widest.areaShare)} % du territoire · ${one(r.widest.value)} %`,
  widestLabel: (r) => `${r.widest.name.toUpperCase()} · ${one(r.widest.value)} %`,
  missingNote: (r) => `${r.missing[0].name} · donnée non rapportée`,
  cards: {
    map: (r) => `Part d’électricité bas-carbone de ${r.count} pays européens en ${YEAR}, sur la carte : chaque pays prend la place de son territoire.`,
    widest: (r) =>
      `Sur une carte, l’encre suit le territoire : ${article(r.widest.iso)} pèse ${Math.round(r.widest.areaShare)} % de celui de ces pays, à ${one(r.widest.value)} % de bas-carbone. Au kilomètre carré, la moyenne tombe à ${one(r.byArea)} %.`,
    tiles: (r) => `Donnons à chaque pays la même place : une tuile égale, rangée à peu près comme la carte. Une tuile, une voix : comptée par pays, la moyenne monte à ${one(r.byCountry)} %.`,
    weight: (r) =>
      `Donnons maintenant à chaque tuile la taille de sa production. ${capital(article(r.heaviest.iso))} reste la plus grande, ${twh(r.heaviest.weight)} TWh, devant ${article(r.second.iso)}, ${twh(r.second.weight)} ; ` +
      `${capital(r.lightest.map((l) => article(l.iso)).sort((a, b) => (a < b ? -1 : 1)).join(" et "))} ne sont plus qu’un point. Au kilowattheure, ${one(r.byWeight)} %.`,
    means: (r) => `Trois moyennes, toutes vraies : ${one(r.byArea)} % au kilomètre carré, ${one(r.byWeight)} % au kilowattheure, ${one(r.byCountry)} % par pays. Chaque dessin n’en montre qu’une.`,
  },
  title: [
    "Compté par pays, le bas-carbone européen est à 65,1 % ; compté au kilomètre carré, à 44,9 %",
    "Par pays 65,1 % de bas-carbone ; par territoire 44,9 %",
    "Le bas-carbone européen, compté trois fois",
  ],
  // The last card: the hollow tile and the accounting the layout rests on.
  limits: `${capital(article(rows.find((r) => r.value === null).iso))} n’a pas de donnée ${YEAR} : sa tuile reste vide. La disposition est dessinée à la main pour rester reconnaissable ; elle n’est mesurée sur rien.`,
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · fond de carte © MapTiler © OpenStreetMap",
  alt: (r) =>
    `Carte de l’Europe qui devient un cartogramme en tuiles : ${r.count} pays teintés par leur part d’électricité ` +
    `bas-carbone en ${YEAR}. Comptée par pays la moyenne est de ${one(r.byCountry)} % ; pondérée par le territoire, ${one(r.byArea)} %.`,
  // The claim checked against the drawn data (CONTRACT.md).
  check(r) {
    if (Math.round(r.byCountry * 10) !== 651 || Math.round(r.byArea * 10) !== 449) throw new Error(`the title says 65,1 % by country and 44,9 % by km²; the means are ${one(r.byCountry)} and ${one(r.byArea)}`);
    if (!(r.widest.value < r.byCountry)) throw new Error(`card 2 says the largest country is below the country mean; ${r.widest.iso} is not`);
    if (!(r.byArea < r.byWeight && r.byWeight < r.byCountry)) throw new Error("card 5 orders the means km² < kWh < country");
    if (r.heaviest.iso !== r.widest.iso || r.second.iso !== "FRA") throw new Error(`card 4 says Russia then France produce most; they are ${r.heaviest.iso} and ${r.second.iso}`);
    if (r.lightest.map((l) => l.iso).sort().join() !== "LUX,MLT") throw new Error("card 4 names Malta and Luxembourg the smallest producers");
    if (r.missing.length !== 1) throw new Error(`card 6 names one country with no reading; there are ${r.missing.length}`);
  },
};

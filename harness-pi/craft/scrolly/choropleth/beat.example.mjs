// beat.mjs for the worked example proof/scrolly-choropleth-europe-lowcarbon — "Sept pays européens
// dépassent 94 % d'électricité bas-carbone — six au nord-ouest, et l'Albanie", as a scrolly. Every
// number in a card is COMPUTED: the study set, the classes, the top class and the subject's
// neighbours come from render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [CODE, YEAR_COL] = [col("code"), col("year")];
const LOW = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"].map(col);
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"].map(col);
const YEAR = table.rows[0][YEAR_COL];

// The page's language is French: the names the map and the cards print.
const FRENCH = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herzégovine", BGR: "Bulgarie",
  HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", FRA: "France",
  DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro", NLD: "Pays-Bas",
  MKD: "Macédoine du Nord", NOR: "Norvège", POL: "Pologne", PRT: "Portugal", ROU: "Roumanie", RUS: "Russie",
  SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie",
  UKR: "Ukraine", GBR: "Royaume-Uni",
};

// THE JOIN: `code` holds ISO alpha-3. The value is the low-carbon share of generation; a country
// whose generation is not reported (total 0) is null — the key's neutral, in no class.
const rows = table.rows.map((r) => {
  const low = LOW.reduce((s, i) => s + Number(r[i] || 0), 0);
  const total = low + FOSSIL.reduce((s, i) => s + Number(r[i] || 0), 0);
  return { iso: r[CODE], name: FRENCH[r[CODE]], value: total > 0 ? (low / total) * 100 : null };
});

const FLOOR = 94;
const SUBJECT = "ALB";
const above = rows.filter((r) => r.value !== null && r.value >= FLOOR).sort((a, b) => b.value - a.value);
const unreported = rows.filter((r) => r.value === null);
const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];
const ORDINAL = ["", "premier", "deuxième", "troisième", "quatrième", "cinquième", "sixième", "septième", "huitième", "neuvième", "dixième"];
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fr1 = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const format = (v) => `${Math.round(v)} %`;
// "l'Albanie", "l'Ukraine": the French article before a vowel (the worked example's countries).
const elided = (name) => `l’${name}`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  rows,
  // The class limits; the takeaway's threshold LAST — card 3 keeps only the top class.
  breaks: [40, 55, 70, 85, FLOOR],
  // Card 4: the countries named on the map, all in the top class. The subject is named on card 5.
  named: above.filter((r) => r.iso !== SUBJECT).map((r) => r.iso),
  subject: SUBJECT,
  // Card 5's sentence says the neighbours are all under 60 %: the kit checks it on the shapes.
  neighbourCeiling: 60,
  unit: "part bas-carbone de la production",
  missingLabel: "donnée non rapportée",
  format,
  counter: (r) => `{n} pays au-dessus de ${format(r.floor)}`,
  seas: { northSea: "Mer du Nord", mediterranean: "Méditerranée", baltic: "Baltique" },
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    countries: (r) =>
      `Part de l’électricité produite à partir de sources bas-carbone — renouvelables et nucléaire réunis — en ${YEAR}, dans les ${r.count} pays européens dont la production est rapportée.`,
    classes: (r) => `La couleur est une classe, pas un nombre : de moins de ${format(r.lowestBreak)} à ${format(r.floor)} et plus.`,
    floor: (r) => `Au-dessus de ${format(r.floor)}, il n’en reste que ${SPELLED[r.topCount]}.`,
    named: (r) => `${capital(SPELLED[r.namedCount])} sont au nord ou à l’ouest : ${r.named.map((n) => n.name).join(", ")}.`,
    subject: (r) =>
      `Le ${ORDINAL[r.namedCount + 1]} est ${elided(r.subject.name)}, ${fr1(r.subject.value)} % — et ses ${r.neighbourCount} voisins sont tous sous ${format(r.neighbourCeiling)}.`,
  },
  title: [
    "Sept pays européens dépassent 94 % d’électricité bas-carbone — six au nord-ouest, et l’Albanie",
    "Le bas-carbone européen est au nord-ouest — et en Albanie",
    "Le bas-carbone européen, et son exception",
  ],
  // The last card: the accounting the map rests on.
  limits: `${capital(elided(unreported[0].name))} n’a pas de production rapportée en ${YEAR}. La Russie et la Turquie sont colorées sur leur part nationale ; le cadre n’en montre que l’extrémité occidentale.`,
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · fond de carte et contours © MapTiler © OpenStreetMap",
  alt: (r) =>
    `Carte choroplèthe de l’Europe : la part d’électricité bas-carbone de ${r.count} pays en ${YEAR}, en ${SPELLED[r.classCount]} classes. ` +
    `${capital(SPELLED[r.topCount])} pays dépassent ${format(r.floor)} : ${r.top.map((t) => t.name).join(", ")}. ${capital(elided(r.subject.name))}, à ${fr1(r.subject.value)} %, ` +
    `a ${r.neighbourCount} voisins tous sous ${format(r.neighbourCeiling)}.`,
  // The claim checked against the drawn data (CONTRACT.md).
  check(r) {
    if (r.topCount !== 7) throw new Error(`the title says seven countries clear ${FLOOR} %; ${r.topCount} do`);
    if (!r.top.some((t) => t.iso === SUBJECT)) throw new Error("Albania is no longer above the floor");
    const [lon, lat] = r.seatOf(SUBJECT);
    const elsewhere = r.named.filter((n) => r.seatOf(n.iso)[1] < lat && r.seatOf(n.iso)[0] > lon);
    if (elsewhere.length) throw new Error(`the title says the other six are north or west of Albania; ${elsewhere.map((n) => n.name).join(", ")} is neither`);
    if (r.missingCount !== 1) throw new Error(`the last card names one country with no reported production; there are ${r.missingCount}`);
  },
};

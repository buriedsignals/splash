// beat.mjs for the worked example proof/scrolly-diverging-bar-eu-per-capita — "La Croatie est le seul pays
// de l'UE à émettre plus de CO₂ par personne qu'en 1990", as a scrolly. Every number in a card is COMPUTED:
// the changes, the falls and their mean, the subject's share come from render-beat.mjs as `r` and are only
// WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [COUNTRY, CODE, YEAR, VALUE] = [col("Entity"), col("Code"), col("Year"), col("CO₂ emissions per capita")];
const FROM = 1990;
const TO = 2024;

// French names, with the article a sentence needs.
const FRENCH = {
  Austria: ["Autriche", "l’Autriche"], Belgium: ["Belgique", "la Belgique"], Bulgaria: ["Bulgarie", "la Bulgarie"],
  Croatia: ["Croatie", "la Croatie"], Cyprus: ["Chypre", "Chypre"], Czechia: ["Tchéquie", "la Tchéquie"],
  Denmark: ["Danemark", "le Danemark"], Estonia: ["Estonie", "l’Estonie"], Finland: ["Finlande", "la Finlande"],
  France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"], Greece: ["Grèce", "la Grèce"],
  Hungary: ["Hongrie", "la Hongrie"], Ireland: ["Irlande", "l’Irlande"], Italy: ["Italie", "l’Italie"],
  Latvia: ["Lettonie", "la Lettonie"], Lithuania: ["Lituanie", "la Lituanie"], Luxembourg: ["Luxembourg", "le Luxembourg"],
  Malta: ["Malte", "Malte"], Netherlands: ["Pays-Bas", "les Pays-Bas"], Poland: ["Pologne", "la Pologne"],
  Portugal: ["Portugal", "le Portugal"], Romania: ["Roumanie", "la Roumanie"], Slovakia: ["Slovaquie", "la Slovaquie"],
  Slovenia: ["Slovénie", "la Slovénie"], Spain: ["Espagne", "l’Espagne"], Sweden: ["Suède", "la Suède"],
};

// Each member state's level in the two years.
const levelOf = (country, year) => table.rows.find((r) => r[COUNTRY] === country && Number(r[YEAR]) === year)?.[VALUE];
const countries = [...new Set(table.rows.map((r) => r[COUNTRY]))].filter((c) => levelOf(c, FROM) !== undefined && levelOf(c, TO) !== undefined);
const rows = countries.map((c) => ({
  name: FRENCH[c][0],
  code: table.rows.find((r) => r[COUNTRY] === c)[CODE],
  from: Number(levelOf(c, FROM)),
  to: Number(levelOf(c, TO)),
}));
const article = Object.fromEntries(Object.values(FRENCH).map(([name, withArticle]) => [name, withArticle]));
const the = (row) => article[row.name];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const two = (v) => Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default {
  lang: "fr",
  eyebrow: "Climat · Union européenne",
  rows,
  subject: "Croatie",
  from: FROM,
  to: TO,
  // A level (cards 1–2), and the size of a change, without its sign (cards 4–5).
  formatLevel: one,
  formatChange: two,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    levels: (r) =>
      `En ${r.from}, ${the(r.byLevel[0])} émettait ${one(r.byLevel[0].from)} t de CO₂ par personne, ${the(r.byLevel[1])} ${one(r.byLevel[1].from)} t. Les ${r.count} pays de l’UE, rangés de la plus forte émission à la plus faible.`,
    fall: (r) => `En ${r.to}, les barres raccourcissent : ${r.fell.length} pays sur ${r.count} émettent moins par personne qu’en ${r.from}.`,
    swap: () => `Ne gardons que l’écart. Chaque barre part de zéro, vers la gauche quand le pays émet moins ; les pays sont rangés de la hausse à la plus forte baisse.`,
    subject: (r) =>
      `Tout en haut, la seule hausse : ${the(r.subject)}, +${two(r.subject.change)} t sur une base de ${two(r.subject.from)} t, soit ${two(r.subject.share)} %. Il faut resserrer l’axe pour la voir.`,
    mean: (r) =>
      `Les ${r.fell.length} autres baissent, de ${two(r.mean)} t en moyenne. ${cap(the(r.byFall[0]))} a perdu ${two(r.byFall[0].change)} t par personne, ${the(r.byFall[1])} ${two(r.byFall[1].change)} t.`,
  },
  levelUnit: (year) => `tonnes de CO₂ par personne, ${year}`,
  changeUnit: (r) => `variation de ${r.from} à ${r.to}, en tonnes de CO₂ par personne`,
  // Card 2's counter: it climbs to the number it states.
  fellCount: (r) => `${r.fell.length} pays sur ${r.count} émettent moins`,
  subjectNote: (r) => `${r.subject.label} : +${two(r.subject.change)} t sur ${two(r.subject.from)} t, soit +${two(r.subject.share)} %`,
  meanNote: (r) => `moyenne des ${r.fell.length} baisses : −${two(r.mean)} t`,
  title: [
    "La Croatie est le seul pays de l’UE à émettre plus de CO₂ par personne qu’en 1990",
    "La Croatie, seul pays de l’UE à émettre plus qu’en 1990",
    "Une seule hausse dans l’UE depuis 1990",
  ],
  // The last card: how to read the bars.
  limits: `Lecture : chaque barre est l’écart entre ${TO} et ${FROM} pour une personne. À gauche de zéro, le pays émet moins qu’en ${FROM} ; à droite, plus.`,
  source: `Source : Global Carbon Budget (2025) ; population d’après diverses sources (${TO}), traitement Our World in Data · combustibles fossiles et industrie uniquement`,
  alt: (r) =>
    `Barres divergentes : la variation des émissions de CO₂ par personne entre ${r.from} et ${r.to} dans les ${r.count} pays de l’UE. ` +
    `${cap(the(r.subject))} est la seule en hausse (+${two(r.subject.change)} t) ; les ${r.fell.length} autres baissent, de ${two(r.mean)} t en moyenne, ` +
    `et de ${two(r.byFall[0].change)} t pour ${the(r.byFall[0])}, la plus forte baisse.`,
  evidenceLevels: 2,
  check(r) {
    if (r.count !== 27) throw new Error(`expected the 27 member states read in both ${FROM} and ${TO}, got ${r.count}`);
    if (r.rose.length !== 1 || r.rose[0].name !== "Croatie") throw new Error(`the title says Croatia is the only rise; ${r.rose.length} rose (${r.rose.map((x) => x.name).join(", ")})`);
    if (r.byLevel[0].name !== r.byFall[0].name || r.byLevel[1].name !== r.byFall[1].name)
      throw new Error("cards 1 and 5 name the two highest earlier levels as the two largest falls; they are no longer the same two");
  },
};

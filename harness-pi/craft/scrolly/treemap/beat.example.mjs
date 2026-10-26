// beat.mjs for the worked example proof/scrolly-treemap-europe-capacity — "L’eau et l’atome portent
// encore 77 % du bas-carbone européen — mais 10 pays ont déjà basculé", as a scrolly. Every number in
// a card is COMPUTED: the total, every share, the tipped countries and their share, France's own split
// come from render-beat.mjs as `r` and are only WORDED here. One item per power station.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = data.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [COUNTRY, FUEL, MW] = [col("country"), col("fuel"), col("capacity_mw")];
const NAMES = {
  France: "France", "United Kingdom": "Royaume-Uni", Spain: "Espagne", Germany: "Allemagne", Russia: "Russie", Norway: "Norvège", Sweden: "Suède", Ukraine: "Ukraine",
  Italy: "Italie", Turkey: "Turquie", Switzerland: "Suisse", Austria: "Autriche", Belgium: "Belgique", Portugal: "Portugal", Finland: "Finlande", "Czech Republic": "Tchéquie",
  Romania: "Roumanie", Poland: "Pologne", Bulgaria: "Bulgarie", Netherlands: "Pays-Bas", Greece: "Grèce", Iceland: "Islande", Serbia: "Serbie", Slovakia: "Slovaquie",
  Hungary: "Hongrie", Croatia: "Croatie", Slovenia: "Slovénie", Ireland: "Irlande", Denmark: "Danemark", Georgia: "Géorgie", Armenia: "Arménie",
  "Bosnia and Herzegovina": "Bosnie-Herzégovine", Albania: "Albanie", Macedonia: "Macédoine du Nord", Montenegro: "Monténégro", Lithuania: "Lituanie", Latvia: "Lettonie",
  Estonia: "Estonie", Belarus: "Biélorussie", Moldova: "Moldavie", Luxembourg: "Luxembourg", Morocco: "Maroc", Algeria: "Algérie", Tunisia: "Tunisie", Iraq: "Irak", "Syrian Arab Republic": "Syrie",
};
// Every station, its capacity in GW (so a card's "469 GW" is the total itself).
const items = data.rows.map((r) => {
  if (!NAMES[r[COUNTRY]]) throw new Error(`${r[COUNTRY]} has no French name filed in this beat`);
  return { member: NAMES[r[COUNTRY]], category: r[FUEL], value: Number(r[MW]) / 1000 };
});

const n0 = (v) => Math.round(v).toLocaleString("fr-FR");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (v) => `${Math.round(v)} %`;
/** A cell's power: in GW from 1 GW up, in MW below. */
const power = (gw) => (gw >= 1 ? `${one(gw)} GW` : `${n0(gw * 1000)} MW`);

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  items,
  categories: { Hydro: "Hydraulique", Nuclear: "Nucléaire", Wind: "Éolien", Solar: "Solaire" },
  otherCategory: "Biomasse, géothermie, marées",
  thread: ["Wind", "Solar"],
  tipAt: 0.5,
  drawCount: 12,
  wholeName: "Europe",
  unit: "puissance bas-carbone installée",
  format: power,
  formatShare: pct,
  recordsText: (n) => `${n0(n)} ${n > 1 ? "centrales" : "centrale"}`,
  restName: (n) => `${n} autres pays`,
  tippedRestName: (n) => `${n} pays basculés`,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    block: (r) => `La puissance bas-carbone installée en Europe : ${n0(r.total)} GW, répartis sur ${n0(r.records)} centrales. Un rectangle, dont la surface est cette puissance.`,
    split: (r) => `Découpons-le par filière. L’hydraulique en fait ${pct(r.categoryShare.Hydro)}, le nucléaire ${pct(r.categoryShare.Nuclear)} : l’eau et l’atome, ${pct(r.topTwoShare)}. L’éolien et le solaire, en couleur, ${pct(r.threadShare)}.`,
    byMember: (r) => `Redécoupons-le par pays. La France arrive en tête avec ${power(r.largest.value)}.`,
    tipped: (r) => `En couleur, les ${r.tippedCount} pays où l’éolien et le solaire font déjà plus de la moitié de la puissance bas-carbone. Ils ne pèsent que ${one(r.tippedShare)} % du total.`,
    open: (r) => `La France, le plus grand rectangle, ouverte par filière : ${pct(r.largest.categories.Nuclear)} de nucléaire, ${pct(r.largest.threadShare)} seulement d’éolien et de solaire.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    block: (r) => `${n0(r.total)} GW`,
    split: (r) => `eau et atome : ${pct(r.topTwoShare)}`,
    byMember: (r) => `${r.count} pays`,
    tipped: (r) => `${r.tippedCount} pays basculés : ${one(r.tippedShare)} %`,
    open: (r) => `France : ${pct(r.largest.threadShare)} éolien et solaire`,
    reading: () => "chaque case porte son chiffre",
  },
  title: [
    `L’eau et l’atome portent encore 77 % du bas-carbone européen — mais 10 pays ont déjà basculé`,
    `10 pays européens où l’éolien et le solaire pèsent déjà plus de la moitié`,
    `La puissance bas-carbone européenne, pays par pays`,
  ],
  // The last card: how to read the treemap.
  limits: `Lecture : la surface est la puissance, et une surface ne se compare pas d’un bout à l’autre du dessin — c’est pourquoi chaque case porte son chiffre. La couleur suit un fil, pas un maximum.`,
  source: "Source : WRI Global Power Plant Database v1.3.0 · puissance installée, non production",
  alt: (r) =>
    `Treemap de la puissance bas-carbone installée en Europe, ${n0(r.total)} GW : un rectangle par pays, sa surface est sa puissance. ` +
    `L’hydraulique et le nucléaire font ${pct(r.topTwoShare)} ; ${r.tippedCount} pays, en couleur, ont plus de la moitié en éolien et solaire et pèsent ${one(r.tippedShare)} % du total. La France, le plus grand rectangle, n’en fait pas partie.`,
  evidenceLevels: 3,
  check(r) {
    if ([...r.topTwo].sort().join() !== "Hydro,Nuclear") throw new Error(`card 2 says hydropower and nuclear are the two largest fuels; they are ${r.topTwo.join(", ")}`);
    if (Math.round(r.topTwoShare) !== 77) throw new Error(`the headline says water and the atom carry 77 %; they carry ${r.topTwoShare.toFixed(1)} %`);
    if (r.tippedCount !== 10) throw new Error(`the headline says 10 countries have tipped; ${r.tippedCount} have`);
    if (!(r.tippedShare < 25)) throw new Error(`the headline says the tipped countries are not the bulk; they hold ${r.tippedShare.toFixed(1)} %`);
    if (r.largest.name !== "France") throw new Error(`card 3 names France as the largest cell; it is ${r.largest.name}`);
    if (!(r.largest.threadShare < 20)) throw new Error(`card 5 says wind and solar are a small part of France's fleet; they are ${r.largest.threadShare.toFixed(1)} %`);
  },
};

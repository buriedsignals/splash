// beat.mjs for the worked example proof/static-treemap-europe-capacity — "Water and the atom still
// carry most of Europe's low-carbon capacity, but ten countries have already tipped to wind and solar".
// data.json holds one row per power station; the cells are the stations added up per country. Every
// number on the plate is COMPUTED from data.json; only the title's first form is typed, because it is
// the journalist's takeaway copied as written.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [COUNTRY, FUEL, MW] = [col("country"), col("fuel"), col("capacity_mw")];

const NEW_BUILD = ["Wind", "Solar"];
const LEGACY = ["Hydro", "Nuclear"];
const FRENCH = {
  France: "France", "United Kingdom": "Royaume-Uni", Spain: "Espagne", Germany: "Allemagne",
  Russia: "Russie", Norway: "Norvège", Sweden: "Suède", Ukraine: "Ukraine", Italy: "Italie",
  Turkey: "Turquie", Switzerland: "Suisse", Austria: "Autriche", Belgium: "Belgique",
  Portugal: "Portugal", Finland: "Finlande", "Czech Republic": "Tchéquie", Romania: "Roumanie",
  Poland: "Pologne", Bulgaria: "Bulgarie", Netherlands: "Pays-Bas", Greece: "Grèce",
  Iceland: "Islande", Serbia: "Serbie", Slovakia: "Slovaquie", Hungary: "Hongrie",
  Croatia: "Croatie", Slovenia: "Slovénie", Ireland: "Irlande", Denmark: "Danemark",
  Georgia: "Géorgie", Armenia: "Arménie", "Bosnia and Herzegovina": "Bosnie-Herzégovine",
  Albania: "Albanie", Macedonia: "Macédoine du Nord", Montenegro: "Monténégro",
  Lithuania: "Lituanie", Latvia: "Lettonie", Estonia: "Estonie", Belarus: "Biélorussie",
  Moldova: "Moldavie", Luxembourg: "Luxembourg", Morocco: "Maroc", Algeria: "Algérie",
  Tunisia: "Tunisie", Iraq: "Irak", "Syrian Arab Republic": "Syrie",
};

// One cell per country: the stations added up.
const by = new Map();
for (const r of table.rows) {
  const d = by.get(r[COUNTRY]) ?? { mw: 0, sites: 0, newBuild: 0, legacy: 0 };
  const mw = Number(r[MW]);
  d.mw += mw;
  d.sites += 1;
  if (NEW_BUILD.includes(r[FUEL])) d.newBuild += mw;
  if (LEGACY.includes(r[FUEL])) d.legacy += mw;
  by.set(r[COUNTRY], d);
}
const total = [...by.values()].reduce((s, d) => s + d.mw, 0);
const legacyShare = ([...by.values()].reduce((s, d) => s + d.legacy, 0) / total) * 100;
const cells = [...by]
  .map(([country, d]) => ({
    name: FRENCH[country] ?? country,
    value: d.mw,
    count: d.sites,
    // The thread: countries whose fleet is already more than half wind and solar.
    thread: d.newBuild / d.mw > 0.5,
    newShare: (d.newBuild / d.mw) * 100,
  }))
  .sort((a, b) => b.value - a.value);
const tipped = cells.filter((c) => c.thread);
const tippedShare = (tipped.reduce((s, c) => s + c.value, 0) / total) * 100;
const biggest = cells[0];

const plain = (s) => s.replace(/[   ]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Énergie · Europe",
  cells: cells.map(({ name, value, count, thread }) => ({ name, value, count, thread })),
  // The figure printed in each cell, with its unit.
  format: (mw) => (mw >= 1000 ? `${one(mw / 1000)} GW` : `${n0(mw)} MW`),
  // The quieter third line under the name (here: how many stations the capacity is spread over).
  basis: (n) => `${n0(n)} ${n > 1 ? "centrales" : "centrale"}`,
  unit: "puissance bas-carbone installée",
  threadNote: `En couleur : les ${tipped.length} pays où l’éolien et le solaire dépassent la moitié.`,
  restLabel: "autres pays",
  threadRestLabel: "pays basculés",
  reading: [
    `Lecture : la surface est la puissance, et une surface ne se compare pas d’un bout à l’autre du dessin — c’est pourquoi chaque case porte son chiffre. La couleur suit un fil, pas un maximum.`,
    `Lecture : chaque case porte son chiffre, parce qu’une surface ne se compare pas à distance.`,
  ],
  title: [
    `L’eau et l’atome portent encore 77 % du bas-carbone européen — mais 10 pays ont déjà basculé`,
    `${tipped.length} pays européens où l’éolien et le solaire pèsent déjà plus de la moitié`,
    `La puissance bas-carbone européenne, pays par pays`,
    `La puissance bas-carbone européenne`,
    `${tipped.length} pays ont déjà basculé`,
  ],
  limits: [
    `Un rectangle par pays, sa surface est sa puissance bas-carbone installée : ${n0(total / 1000)} GW en tout, sur ${n0(table.rows.length)} centrales. Les rectangles en couleur sont les ${tipped.length} pays où l’éolien et le solaire font déjà plus de la moitié de cette puissance — ${one(tippedShare)} % du total européen. Le plus grand rectangle, la ${biggest.name}, n’en fait pas partie : ${Math.round(biggest.newShare)} % seulement.`,
    `Un rectangle par pays, sa surface est sa puissance bas-carbone installée — ${n0(total / 1000)} GW en tout. En couleur, les ${tipped.length} pays où l’éolien et le solaire font plus de la moitié.`,
    `Un rectangle par pays : sa puissance bas-carbone installée.`,
  ],
  source: "Source : WRI Global Power Plant Database v1.3.0 · puissance installée, non production",
  alt: `Treemap de la puissance bas-carbone installée en Europe : un rectangle par pays, sa surface proportionnelle à ses mégawatts, sur ${n0(total / 1000)} GW au total. La ${biggest.name} occupe le plus grand rectangle avec ${one(biggest.value / 1000)} GW. Les ${tipped.length} pays où l’éolien et le solaire dépassent déjà la moitié sont en couleur et pèsent ${one(tippedShare)} % du total.`,
  evidenceLevels: 4,
  check() {
    if (Math.round(legacyShare) !== 77) throw new Error(`hydro and nuclear carry ${legacyShare.toFixed(1)} %, not 77 %`);
    if (tipped.length !== 10) throw new Error(`${tipped.length} countries have tipped, not 10`);
  },
};

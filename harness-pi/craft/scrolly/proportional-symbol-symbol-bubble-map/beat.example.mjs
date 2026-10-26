// beat.mjs for the worked example proof/scrolly-proportional-symbol-europe-capacity — "Un centième des
// sites porte plus d'un tiers de la puissance bas-carbone d'Europe", as a scrolly. Every number in a
// card is COMPUTED: the ranking, the cumulative shares, the nuclear sites and the cut come from
// render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [COUNTRY, FUEL, MW, LON, LAT] = ["country", "fuel", "capacity_mw", "lon", "lat"].map(col);
// EVERY station: the cards are about how few of them carry the power.
const sites = table.rows.map((r) => ({ value: Number(r[MW]), lon: Number(r[LON]), lat: Number(r[LAT]), group: r[FUEL], region: r[COUNTRY] }));

const n0 = (v) => Math.round(v).toLocaleString("fr-FR");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = (v) => `${one(v)} %`;
const format = (v) => `${n0(v)} MW`;
const IN_REGION = { France: "en France", Russia: "en Russie", Ukraine: "en Ukraine" };
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const CUT = 400;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  sites,
  // Card 4 isolates this group's sites, the camera on the region holding most of them.
  subject: "Nuclear",
  // The dataset carries no names: the largest station named from its place.
  largestName: "Zaporijia",
  largestLabel: (r) => `${r.largest.name} · ${format(r.largest.value)}`,
  // Card 6 keeps the sites at or above this value: the static plate's cut.
  cut: CUT,
  keySizes: [4000, 1000, 400],
  unit: "centrales bas-carbone, de la plus puissante à la plus petite",
  dotIs: "un cercle = une centrale, aire proportionnelle à la puissance",
  counter: "{n} centrales · {sites} des sites · {mw} de la puissance",
  format,
  count: n0,
  percent,
  cards: {
    largest: (r) =>
      `La base du WRI recense ${n0(r.count)} centrales bas-carbone en Europe. Rangeons-les de la plus puissante à la plus petite. La première, ${r.largest.name}, en Ukraine : ${format(r.largest.value)}, ${percent(r.largest.valueShare)} de la puissance à elle seule.`,
    ten: (r) => `Les dix plus puissantes : ${percent(r.ten.siteShare)} des sites, ${percent(r.ten.valueShare)} de la puissance.`,
    hundred: (r) => `Les ${r.hundred.count} plus puissantes : ${percent(r.hundred.siteShare)} des sites, ${percent(r.hundred.valueShare)} de la puissance. ${r.hundred.subjectCount} sont nucléaires.`,
    subject: (r) =>
      `Le nucléaire seul : ${n0(r.subject.count)} sites, ${percent(r.subject.siteShare)} des centrales, ${percent(r.subject.valueShare)} de la puissance. ${capital(IN_REGION[r.focus.region])}, ${r.focus.count} sites.`,
    all: (r) => `Ajoutons toutes les autres, jusqu’à la ${n0(r.count)}e. Le champ se referme : les petites centrales sont trop nombreuses pour se lire.`,
    cut: (r) => `D’où la coupe de la carte : les ${n0(r.cut.count)} centrales de ${format(r.cut.threshold)} ou plus, ${percent(r.cut.siteShare)} des sites et ${percent(r.cut.valueShare)} de la puissance.`,
  },
  subjectNote: (r) => `${r.subject.count} sites nucléaires : ${percent(r.subject.siteShare)} des sites, ${percent(r.subject.valueShare)} de la puissance`,
  cutNote: (r) => `${r.cut.count} centrales de ${format(r.cut.threshold)} ou plus : ${percent(r.cut.valueShare)} de la puissance`,
  limitNote: (r) => `Sous ${format(r.cut.threshold)}, non dessiné : à ${n0(r.count)} cercles le champ se referme. Le petit solaire et le petit éolien sont sous-représentés dans la base.`,
  title: [
    "Un centième des sites porte plus d’un tiers de la puissance bas-carbone d’Europe",
    "Un centième des sites, plus d’un tiers de la puissance",
    "La puissance tient dans peu de sites",
  ],
  // Closes card 6: how to read a circle.
  limits: "Lecture : l’aire du cercle est la puissance ; les cercles sont creux, un gros n’efface pas les petits.",
  source: "Source : WRI Global Power Plant Database v1.3.0 · fond de carte © MapTiler © OpenStreetMap",
  alt: (r) =>
    `Carte de l’Europe : chaque centrale bas-carbone est un cercle creux à ses coordonnées, d’aire proportionnelle à sa puissance. ` +
    `Les ${r.hundred.count} plus puissantes, ${one(r.hundred.siteShare)} % des ${n0(r.count)} sites, portent ${one(r.hundred.valueShare)} % de la puissance ; ` +
    `les ${r.subject.count} sites nucléaires ${one(r.subject.valueShare)} %.`,
  // The claim checked against the drawn data (CONTRACT.md).
  check(r) {
    if (!(r.largest.region === "Ukraine" && r.largest.group === "Nuclear" && r.largest.value === 6000)) throw new Error("card 1 names Zaporijia, 6 000 MW in Ukraine, as the largest station; it no longer is");
    if (!(r.hundred.siteShare < 2)) throw new Error(`the title calls the hundred largest a hundredth of the sites; they are ${r.hundred.siteShare.toFixed(2)} %`);
    if (!(r.hundred.valueShare > 100 / 3)) throw new Error(`the title says the hundred largest carry over a third of the power; they carry ${r.hundred.valueShare.toFixed(1)} %`);
    if (!(r.subject.siteShare < 1 && r.subject.valueShare > 30)) throw new Error("card 4 says nuclear is under 1 % of the sites and over 30 % of the power");
    if (!(r.hundred.subjectCount * 2 > r.hundred.count)) throw new Error("card 3 says most of the hundred largest are nuclear");
    if (!(r.cut.valueShare > 50)) throw new Error(`the cut note says the stations of ${CUT} MW or more carry over half the power`);
    if (!IN_REGION[r.focus.region]) throw new Error(`${r.focus.region} now holds most of the nuclear sites and this beat has no French name for it`);
  },
};

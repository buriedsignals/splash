// beat.mjs for the worked example proof/web-proportional-symbol-europe-capacity — "Cinq pays portent
// 55 % de la capacité bas-carbone européenne". data.json holds one row per power station; this file
// sums them per country and seats each circle at the capacity-weighted centre of its own stations.
// Every number on the page is COMPUTED from data.json or taken from the reading the render hands a
// word function.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { iso3Of } from "./countries.mjs";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [COUNTRY, FUEL, MW, LON, LAT] = ["country", "fuel", "capacity_mw", "lon", "lat"].map(col);
const OLD = ["Hydro", "Nuclear"];
const NEW = ["Wind", "Solar"];
// Outside the continent the claim is about.
const OUTSIDE = new Set(["Algeria", "Iraq", "Morocco", "Syrian Arab Republic", "Tunisia"]);
const stations = table.rows
  .map((r) => ({ country: r[COUNTRY], fuel: r[FUEL], mw: Number(r[MW]), lon: Number(r[LON]), lat: Number(r[LAT]) }))
  .filter((s) => [...OLD, ...NEW].includes(s.fuel) && s.mw > 0 && Number.isFinite(s.lon) && Number.isFinite(s.lat) && !OUTSIDE.has(s.country));

// The page's language is French: the names the map, the table and the tooltips print.
const NAMES = {
  France: "France", Germany: "Allemagne", Spain: "Espagne", Italy: "Italie", "United Kingdom": "Royaume-Uni",
  Sweden: "Suède", Norway: "Norvège", Turkey: "Turquie", Poland: "Pologne", Switzerland: "Suisse",
  Austria: "Autriche", Finland: "Finlande", Portugal: "Portugal", Netherlands: "Pays-Bas", Belgium: "Belgique",
  Romania: "Roumanie", Ukraine: "Ukraine", Russia: "Russie", Denmark: "Danemark", Greece: "Grèce",
  "Czech Republic": "Tchéquie", Ireland: "Irlande", Bulgaria: "Bulgarie", Hungary: "Hongrie",
  Slovakia: "Slovaquie", Slovenia: "Slovénie", Croatia: "Croatie", Serbia: "Serbie", Albania: "Albanie",
  Iceland: "Islande", Latvia: "Lettonie", Lithuania: "Lituanie", Estonia: "Estonie", Luxembourg: "Luxembourg",
  Belarus: "Biélorussie", Moldova: "Moldavie", Montenegro: "Monténégro", "Bosnia and Herzegovina": "Bosnie-Herz.",
  Macedonia: "Macédoine du N.", Armenia: "Arménie", Georgia: "Géorgie",
};

const byCountry = new Map();
for (const s of stations) {
  if (!byCountry.has(s.country)) byCountry.set(s.country, { mw: 0, count: 0, old: 0, fresh: 0, lon: 0, lat: 0 });
  const c = byCountry.get(s.country);
  c.mw += s.mw;
  c.count += 1;
  if (OLD.includes(s.fuel)) c.old += s.mw;
  else c.fresh += s.mw;
  c.lon += s.lon * s.mw;
  c.lat += s.lat * s.mw;
}
const countries = [...byCountry.keys()];
const codes = iso3Of(countries, import.meta.dirname);
const symbols = countries.map((country, i) => {
  const c = byCountry.get(country);
  return { iso: codes[i], name: NAMES[country] ?? country, value: c.mw, lon: c.lon / c.mw, lat: c.lat / c.mw, count: c.count, old: c.old, fresh: c.fresh };
});

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const ranked = [...symbols].sort((a, b) => b.value - a.value);
const total = ranked.reduce((s, r) => s + r.value, 0);
const topFive = ranked.slice(0, 5);
const topShare = (topFive.reduce((s, r) => s + r.value, 0) / total) * 100;
const gw = (mw) => `${fr(mw / 1000, 0)} GW`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  symbols,
  // The claim's own five carry a label on the map.
  labelled: topFive.map((r) => r.name),
  figure: gw,
  number: (v, d) => fr(v, d),
  detail: (s) =>
    `${s.name} · ${fr(s.value / 1000)} GW bas-carbone (${fr(s.share)} % de l'Europe) · ${s.count.toLocaleString("fr-FR")} centrales · ` +
    `eau + atome ${fr((s.old / s.value) * 100)} %, vent + soleil ${fr((s.fresh / s.value) * 100)} %`,
  lawLabel: "L'échelle des aires",
  laws: {
    area: {
      label: "Aire proportionnelle",
      announce: "Aire proportionnelle — la surface de chaque cercle est proportionnelle à la capacité ; c'est l'échelle honnête et celle que la page affiche par défaut",
    },
    radius: {
      label: "Rayon proportionnel",
      announce:
        "Rayon proportionnel — le rayon de chaque cercle est proportionnel à la capacité, l'échelle que la fiche de type appelle mécaniquement fausse ; " +
        "le seuil de lisibilité qu'elle fait franchir est de moins de deux pixels de diamètre",
      note: (f) =>
        `Rayon proportionnel — aire montrée, ${f.subject} contre ${f.reference} : ${fr(f.shown, 1)} fois. Aire réelle : ${fr(f.truth, 1)} fois. ` +
        `${fr(f.erased, 0)} des ${fr(f.total, 0)} pays passent sous le seuil de lisibilité.`,
    },
    flat: {
      label: "Aire aplatie",
      announce: "Aire aplatie — les écarts entre les cercles sont compressés, l'échelle flatteuse qu'on choisit quand le plus gros cercle écrase la carte",
      note: (f) =>
        `Aire aplatie — aire montrée, ${f.subject} contre ${f.reference} : ${fr(f.shown, 1)} fois. Aire réelle : ${fr(f.truth, 1)} fois. ` +
        (f.erased ? `${fr(f.erased, 0)} des ${fr(f.total, 0)} pays passent sous le seuil.` : "Aucun pays ne passe sous le seuil, mais l'écart que la carte doit prouver a fondu."),
    },
  },
  callout: () =>
    `${topFive.map((r) => `${r.name} ${gw(r.value)}`).join(", ")} — ${fr(topShare, 0)} % des ${fr(total / 1000, 0)} GW du continent, ` +
    `sur ${stations.length.toLocaleString("fr-FR")} centrales.`,
  // The three northern countries the Mercator sentence names, and their names in the page's language.
  inflated: ["NOR", "SWE", "FIN"],
  countryNames: { NOR: "Norvège", SWE: "Suède", FIN: "Finlande" },
  mercator: (m) =>
    `Carte MapTiler plate, en Web Mercator : les cercles gardent leur taille à l'écran et leurs rapports sont donc exacts, mais le PAYS sous le ` +
    `cercle est gonflé au nord — la ${m.names[0]}, la ${m.names[1]} et la ${m.names[2]} couvrent ${fr(m.pageShare, 0)} % de la terre dessinée pour ` +
    `${fr(m.trueShare, 0)} % de la terre réelle.`,
  hint:
    "Carte interactive : glissez-la pour la déplacer, pincez ou utilisez les boutons plus et moins pour zoomer, les flèches du clavier la déplacent " +
    "une fois qu'elle a le focus. Les cercles et la légende gardent leur taille à l'écran : la carte s'approche, l'échelle des aires ne change pas.",
  title: "Cinq pays portent 55 % de la capacité bas-carbone européenne",
  limits:
    "Un cercle par pays, sa SURFACE proportionnelle à la capacité bas-carbone installée, posé au centre pondéré de ses propres centrales et " +
    "translucide, pour qu'un recouvrement se voie.",
  reading:
    "Lecture : l'exposant qui fait la taille des cercles est le seul réglage qu'une carte à symboles ne montre jamais — il est ci-dessus, et aucun " +
    `pays ne bouge quand on en change. Sans JavaScript le geste ne quitte pas la page : il passe dans le tableau, dont les ${symbols.length} pastilles ` +
    "suivent la même loi en CSS pur.",
  source: "Source : Global Power Plant Database (WRI) · fond de carte MapTiler",
  tableCaption: (t) => `Les ${fr(t.places, 0)} pays, leur capacité et leur cercle — au ${fr(t.rowScale, 1)} % de l'échelle de la carte, tous les rapports intacts`,
  columns: ["Pays", "Capacité", "Rang"],
  alt: () =>
    `Une carte d'Europe sur fond MapTiler portant un cercle par pays, dont la SURFACE est proportionnelle à sa capacité bas-carbone. Le plus grand, ` +
    `${ranked[0].name}, fait ${gw(ranked[0].value)} ; viennent ensuite ${topFive.slice(1).map((r) => r.name).join(", ")}. Ces cinq cercles couvrent ` +
    `${fr(topShare, 0)} % de la capacité du continent ; le reste de la carte est un semis de petits cercles. Une commande au-dessus de la carte change la ` +
    "loi qui transforme une capacité en taille de cercle, sans déplacer aucun pays. La carte elle-même est vivante : elle se déplace et se zoome avec " +
    "les contrôles de MapTiler, sans que la taille des cercles change.",
  // The claim checked against the drawn data: the five largest hold 55 % of the total.
  check({ ranked: drawn, total: sum }) {
    const share = (drawn.slice(0, 5).reduce((s, r) => s + r.value, 0) / sum) * 100;
    if (Math.round(share) !== 55) throw new Error(`the title says five countries hold 55 %; they hold ${share.toFixed(1)} %`);
  },
};

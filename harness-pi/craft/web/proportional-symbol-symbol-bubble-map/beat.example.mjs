// beat.mjs for the worked example — "Un centième des sites porte plus d'un tiers de la puissance bas-carbone
// d'Europe". data.json holds one row per power station; the map draws ONE CIRCLE PER STATION, because the
// takeaway is about sites. Every number on the page is COMPUTED from data.json or taken from the reading the
// render hands a word function (`cut`, `f`, `m`, `c`).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { iso3Of } from "./countries.mjs";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
// A column by its name; an index already looked up passes through ([col("a"), col("b")].map(col) is harmless).
const col = (name) => {
  if (Number.isInteger(name)) return name;
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${JSON.stringify(name)}; its columns are ${table.columns.map((c) => c.name).join(", ")}`);
  return i;
};
const [COUNTRY, FUEL, MW, LON, LAT] = ["country", "fuel", "capacity_mw", "lon", "lat"].map(col);
// Outside the map's Europe frame: the standfirst says they are left out. Every fuel is kept — a low-carbon
// total that leaves one out is a different number.
const OUTSIDE = new Set(["Algeria", "Iraq", "Morocco", "Syrian Arab Republic", "Tunisia"]);
const stations = table.rows
  .map((r) => ({ country: r[COUNTRY], fuel: r[FUEL], mw: Number(r[MW]), lon: Number(r[LON]), lat: Number(r[LAT]) }))
  .filter((s) => s.mw > 0 && Number.isFinite(s.lon) && Number.isFinite(s.lat) && !OUTSIDE.has(s.country));
// The camera stops at 68°N: the stations beyond it are left out, and limits says how many and how much they weigh.
const NORTH = 68;
const beyond = stations.filter((s) => s.lat > NORTH);
const inFrame = stations.filter((s) => s.lat <= NORTH);

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

const FUELS = { Hydro: "hydraulique", Nuclear: "nucléaire", Wind: "éolien", Solar: "solaire", Biomass: "biomasse", Geothermal: "géothermie", "Wave and Tidal": "marémotrice" };

const countries = [...new Set(stations.map((s) => s.country))];
const codes = new Map(iso3Of(countries, import.meta.dirname).map((code, i) => [countries[i], code]));
// One symbol per station, named by its country (names may repeat: the kit keys each circle by its rank).
const symbols = inFrame.map((s) => ({ iso: codes.get(s.country), name: NAMES[s.country] ?? s.country, value: s.mw, lon: s.lon, lat: s.lat, fuel: s.fuel }));

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const mw = (v) => `${fr(v, 0)} MW`;
const ranked = [...symbols].sort((a, b) => b.value - a.value);
const total = ranked.reduce((s, r) => s + r.value, 0);
// "Un centième des sites": the hundredth of the stations, largest first.
const TOP = Math.round(ranked.length / 100);
const topShare = (ranked.slice(0, TOP).reduce((s, r) => s + r.value, 0) / total) * 100;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  symbols,
  // The largest station carries a label on the map (a name matches the largest symbol that carries it).
  labelled: [ranked[0].name],
  figure: mw,
  number: (v, d) => fr(v, d),
  detail: (s) => `${s.name} · ${FUELS[s.fuel] ?? s.fuel} · ${mw(s.value)} · ${fr(s.rank, 0)}e site sur ${fr(s.of, 0)} · ${fr(s.share, 2)} % de l'Europe`,
  lawLabel: "L'échelle des aires",
  laws: {
    area: {
      label: "Aire proportionnelle",
      announce: "Aire proportionnelle — la surface de chaque cercle est proportionnelle à la puissance ; c'est l'échelle honnête et celle que la page affiche par défaut",
    },
    radius: {
      label: "Rayon proportionnel",
      announce:
        "Rayon proportionnel — le rayon de chaque cercle est proportionnel à la puissance, l'échelle que la fiche de type appelle mécaniquement fausse ; " +
        "le seuil de lisibilité qu'elle fait franchir est de moins de deux pixels de diamètre",
      note: (f) =>
        `Rayon proportionnel — aire montrée, ${f.subject} contre ${f.reference} : ${fr(f.shown, 1)} fois. Aire réelle : ${fr(f.truth, 1)} fois. ` +
        `${fr(f.erased, 0)} des ${fr(f.total, 0)} sites dessinés passent sous le seuil de lisibilité.`,
    },
    flat: {
      label: "Aire aplatie",
      announce: "Aire aplatie — les écarts entre les cercles sont compressés, l'échelle flatteuse qu'on choisit quand le plus gros cercle écrase la carte",
      note: (f) =>
        `Aire aplatie — aire montrée, ${f.subject} contre ${f.reference} : ${fr(f.shown, 1)} fois. Aire réelle : ${fr(f.truth, 1)} fois. ` +
        (f.erased ? `${fr(f.erased, 0)} des ${fr(f.total, 0)} sites dessinés passent sous le seuil.` : "Aucun site ne passe sous le seuil, mais l'écart que la carte doit prouver a fondu."),
    },
  },
  callout: () =>
    `Les ${fr(TOP, 0)} plus grands sites, un centième des ${fr(ranked.length, 0)}, portent ${fr(topShare, 1)} % des ${fr(total / 1000, 0)} GW bas-carbone du continent.`,
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
  title: "Un centième des sites porte plus d’un tiers de la puissance bas-carbone d’Europe",
  // `cut` is the kit's legibility cut: { threshold, drawn, total, drawnShare }. When it draws fewer circles than
  // there are symbols, limits must print cut.threshold with figure().
  limits: (cut) =>
    `Un cercle par centrale, à ses propres coordonnées ; l’aire du cercle est sa puissance installée.` +
    (cut.threshold > 0 ? ` Sous ${mw(cut.threshold)}, non dessiné : ${fr(cut.total - cut.drawn, 0)} des ${fr(cut.total, 0)} sites.` : "") +
    ` L'Algérie, l'Irak, le Maroc, la Syrie et la Tunisie, hors cadre, sont laissés de côté, comme les ${fr(beyond.length, 0)} sites au-delà ` +
    `du ${NORTH}e parallèle (${fr((beyond.reduce((t, s) => t + s.mw, 0) / stations.reduce((t, s) => t + s.mw, 0)) * 100, 1)} % de la puissance).`,
  reading:
    "Lecture : l'exposant qui fait la taille des cercles est le seul réglage qu'une carte à symboles ne montre jamais — il est ci-dessus, et aucun " +
    "site ne bouge quand on en change. Sans JavaScript le geste ne quitte pas la page : il passe dans le tableau, dont les pastilles suivent la même loi en CSS pur.",
  source: "Source : Global Power Plant Database (WRI) · fond de carte MapTiler",
  tableCaption: (t) => `Les ${fr(t.places, 0)} plus grands des ${fr(t.of, 0)} sites, leur puissance et leur cercle — au ${fr(t.rowScale, 1)} % de l'échelle de la carte`,
  columns: ["Pays", "Puissance", "Rang"],
  alt: () =>
    `Une carte d'Europe sur fond MapTiler portant un cercle par centrale bas-carbone, dont la SURFACE est proportionnelle à sa puissance. Le plus grand ` +
    `site, en ${ranked[0].name}, fait ${mw(ranked[0].value)}. Les ${fr(TOP, 0)} plus grands sites, un centième des ${fr(ranked.length, 0)}, portent ` +
    `${fr(topShare, 1)} % de la puissance du continent ; le reste est un semis de petits cercles. Une commande au-dessus de la carte change la loi qui ` +
    "transforme une puissance en taille de cercle, sans déplacer aucun site. La carte se déplace et se zoome, sans que la taille des cercles change.",
  // The claim checked against every station: the hundredth largest carry more than a third of the total.
  check({ ranked: all, total: sum }) {
    const top = Math.round(all.length / 100);
    const share = (all.slice(0, top).reduce((s, r) => s + r.value, 0) / sum) * 100;
    if (!(share > 100 / 3)) throw new Error(`the title says a hundredth of the sites carries over a third; the ${top} largest carry ${share.toFixed(1)} %`);
  },
};

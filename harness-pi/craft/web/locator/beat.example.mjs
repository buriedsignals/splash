// beat.mjs for the worked example proof/web-locator-zaporizhzhia — "La plus grosse centrale
// bas-carbone d'Europe, et sa plus proche rivale à 2 367 km". data.json holds the low-carbon stations
// (kind "station") and the settlements (kind "city") in one table. Every number on the page is
// COMPUTED from data.json or taken from the reading the render hands a word function.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [NAME, KIND, COUNTRY, FUEL, MW, POP, LON, LAT] = ["name", "kind", "country", "fuel", "capacity_mw", "pop", "lon", "lat"].map(col);
const rows = table.rows.map((r) => ({
  name: r[NAME], kind: r[KIND], country: r[COUNTRY], fuel: r[FUEL],
  mw: Number(r[MW]), pop: Number(r[POP]), lon: Number(r[LON]), lat: Number(r[LAT]),
}));

// The page's language is French.
const FRENCH_PLACE = {
  Kyiv: "Kiev", Kharkiv: "Kharkiv", Dnipro: "Dnipro", Odessa: "Odessa", Donetsk: "Donetsk",
  Rostov: "Rostov", Bucharest: "Bucarest", Voronezh: "Voronej", "Chișinău": "Chisinau",
  Krasnodar: "Krasnodar", Sevastopol: "Sébastopol", Stavropol: "Stavropol",
  Mariupol: "Marioupol", Kherson: "Kherson", Simferopol: "Simferopol", Luhansk: "Louhansk",
  Zhytomyr: "Jytomyr", "Iași": "Iasi", "Constanța": "Constanta", Sochi: "Sotchi", Sukhumi: "Soukhoumi",
};
const FRENCH_FUEL = { Nuclear: "nucléaire", Hydro: "hydraulique", Wind: "éolien", Solar: "solaire", Biomass: "biomasse", Geothermal: "géothermie", Waste: "déchets" };
const FRENCH_COUNTRY = {
  Ukraine: "Ukraine", Russia: "Russie", Romania: "Roumanie", Moldova: "Moldavie", Bulgaria: "Bulgarie",
  Turkey: "Turquie", Poland: "Pologne", Belarus: "Biélorussie", Hungary: "Hongrie", Slovakia: "Slovaquie",
  Georgia: "Géorgie", Serbia: "Serbie", Austria: "Autriche", France: "France", Germany: "Allemagne",
  Spain: "Espagne", Sweden: "Suède", Finland: "Finlande", Norway: "Norvège", Switzerland: "Suisse",
  Czechia: "Tchéquie", "Czech Republic": "Tchéquie", Italy: "Italie", Croatia: "Croatie", Slovenia: "Slovénie",
  "Bosnia and Herzegovina": "Bosnie-Herzégovine", Albania: "Albanie", Greece: "Grèce", Portugal: "Portugal",
  Netherlands: "Pays-Bas", Belgium: "Belgique", Denmark: "Danemark", Estonia: "Estonie", Latvia: "Lettonie",
  Lithuania: "Lituanie", Iceland: "Islande", Ireland: "Irlande", "United Kingdom": "Royaume-Uni",
  Luxembourg: "Luxembourg", Montenegro: "Monténégro", "North Macedonia": "Macédoine du Nord",
  Armenia: "Arménie", Azerbaijan: "Azerbaïdjan", Cyprus: "Chypre", Malta: "Malte", Kosovo: "Kosovo",
};
const country = (name) => FRENCH_COUNTRY[name] ?? name;
const fuel = (name) => FRENCH_FUEL[name] ?? name;
const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const n0 = (v) => Math.round(v).toLocaleString("fr-FR");

const stations = rows.filter((r) => r.kind === "station");
const biggest = stations.reduce((a, b) => (b.mw > a.mw ? b : a));
const NAME_OF_SUBJECT = "Zaporijjia";

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  // THE SUBJECT: its row, with the name and kind the table prints, and its priority (capacity).
  subject: { lon: biggest.lon, lat: biggest.lat, name: NAME_OF_SUBJECT, label: NAME_OF_SUBJECT, kind: "le sujet", priority: biggest.mw, fuel: biggest.fuel, country: biggest.country },
  // Its peers: every other station, ranked by capacity (which decides who is drawn, never a size).
  others: stations
    .filter((s) => s !== biggest)
    .map((s) => ({ lon: s.lon, lat: s.lat, name: `${fuel(s.fuel)} ${n0(s.mw)} MW`, kind: `centrale, ${country(s.country)}`, priority: s.mw, fuel: s.fuel, country: s.country })),
  // The settlements, ranked by population.
  places: rows
    .filter((r) => r.kind === "city")
    .map((p) => ({ lon: p.lon, lat: p.lat, name: FRENCH_PLACE[p.name] ?? p.name, kind: `ville, ${country(p.country)}`, priority: p.pop, country: p.country })),
  // The removes: how far back the reader may stand. The last frames every station (radius null), and
  // draws no city — at that distance six regional names would place nobody.
  removes: [
    { key: "site", label: "Le site", announce: "Le site — dans un rayon de 130 km autour du sujet", radius: 130, places: true },
    { key: "region", label: "La région", announce: "La région — dans un rayon de 320 km autour du sujet", radius: 320, places: true },
    { key: "voisinage", label: "Le voisinage", announce: "Le voisinage — dans un rayon de 800 km autour du sujet", radius: 800, places: true },
    { key: "europe", label: "L'Europe", announce: "L'Europe — sur toute l'étendue du fichier", radius: null, places: false },
  ],
  defaultKey: "region",
  vantageLabel: "À quelle distance se placer",
  rule: (r) =>
    `${r.radius === null ? "sur toute l'étendue du fichier" : `dans un rayon de ${n0(r.radius)} km`} · ` +
    `${n0(r.drawnOthers)} ${r.drawnOthers === 1 ? "centrale dessinée" : "centrales dessinées"} sur ${n0(r.heldOthers)} · ` +
    (r.places ? `${n0(r.drawnPlaces)} ${r.drawnPlaces === 1 ? "ville" : "villes"} sur ${n0(r.heldPlaces)}` : "aucune ville : à ce recul, ce qui situe, ce sont les autres centrales") +
    ` · barre ${n0(r.barKm)} km`,
  note: (r) => {
    const scope = r.radius === null ? "Sur toute l'étendue du fichier" : `À ${n0(r.radius)} km à la ronde`;
    const head =
      `${scope}, la plus grosse voisine de Zaporijjia est ${fuel(r.rival.fuel)} ${n0(r.rival.priority)} MW en ${country(r.rival.country)}, ` +
      `à ${n0(r.rival.km)} km — ${fr((r.rival.priority / r.subject.priority) * 100)} % de sa puissance.`;
    if (r.key === "site") return `${head} À ce recul la question n'est plus l'Europe : c'est un site sur un fleuve, et la seule chose comparable à portée est un barrage.`;
    if (r.key === "voisinage") return `${head} Le cadre tient maintenant ${n0(r.heldOthers)} centrales bas-carbone et aucune n'atteint ${n0(r.subject.priority)} MW.`;
    return (
      `${head} C'est à ce recul, et à aucun autre, que le titre devient vérifiable — et c'est aussi celui où le sujet cesse d'être situable : ` +
      `un point parmi ${n0(r.totalOthers + 1)}. La barre d'échelle y est fausse de ${fr(r.edgeError, 1)} fois entre le bas et le haut du cadre.`
    );
  },
  detail: (m) => {
    if (m.role === "subject")
      return `Zaporijjia · ${fuel(m.fuel)} · ${n0(m.priority)} MW de puissance installée — la plus grosse centrale bas-carbone que la base recense en Europe, sur ${n0(stations.length)} sites`;
    if (m.role === "other")
      return `${fuel(m.fuel)} · ${n0(m.priority)} MW · ${country(m.country)} · à ${n0(m.km)} km de Zaporijjia · ${fr(m.share)} % de sa puissance`;
    return `${m.name} · ${country(m.country)} · ${n0(m.priority)} habitants · à ${n0(m.km)} km de Zaporijjia`;
  },
  distance: (m) => (m.role === "subject" ? "le sujet" : `${n0(m.km)} km`),
  kinds: ["le sujet", "les autres centrales bas-carbone", "les villes"],
  callout: (c) =>
    `${n0(c.subject.priority)} MW · la centrale la plus proche est à ${n0(c.nearest.km)} km (${fuel(c.nearest.fuel)}, ${n0(c.nearest.priority)} MW) · ` +
    `aucune des ${n0(c.others)} autres centrales bas-carbone du fichier n'atteint cette puissance.`,
  mercator: (m) =>
    `Carte MapTiler plate, en Web Mercator : l'échelle au sol suit le cosinus de la latitude, donc la barre d'échelle est juste au centre du cadre et ` +
    `fausse à ses bords — de ${fr(m.published, 2)} fois au cadrage publié, de ${fr(m.widest, 2)} fois au plus large. Le titre compte des mégawatts, pas des kilomètres.`,
  title: "La plus grosse centrale bas-carbone d'Europe, et sa plus proche rivale à 2 367 km",
  limits: `Zaporijjia, ${n0(biggest.mw)} MW de puissance installée, est la plus grosse centrale bas-carbone que la base recense en Europe.`,
  reading:
    "Lecture : une carte de repérage ne dit qu'une chose, où c'est — et cette chose entière est décidée par la distance à laquelle l'auteur s'est placé. " +
    "Choisissez la vôtre : chaque recul refait le cadrage, change ce qui mérite d'être dessiné, dit combien de centrales le cadre contient et combien il en cache, " +
    "et redonne sa barre d'échelle. Le tableau suit le même recul, avec ou sans JavaScript.",
  hint: "La carte est vivante : molette ou boutons pour zoomer, glisser pour déplacer, flèches du clavier une fois la carte au focus. Survolez une marque pour ce qu'elle est et sa distance à Zaporijjia.",
  source: "Source : WRI Global Power Plant Database v1.3.0 · lieux Natural Earth 50 m · frontières et fond MapTiler (Countries, dataviz), teintés par la direction",
  tableCaption: (t) => `Les ${n0(t.marks)} marques de la page, et le recul auquel chacune est dessinée`,
  columns: ["Marque", "Ce que c'est", "Distance", "À ce recul"],
  drawnWord: "dessinée",
  outWord: "hors du cadre",
  alt: (a) =>
    `Carte de repérage du sud de l'Ukraine sur fond MapTiler. La centrale de Zaporijjia, ${n0(biggest.mw)} MW, est marquée d'un cercle cerné au bord du Dniepr, ` +
    `au nord de la mer d'Azov. Autour d'elle, les ${n0(a.published.drawnOthers)} plus grosses des ${n0(a.published.heldOthers)} autres centrales bas-carbone du cadre et les ` +
    `${n0(a.published.drawnPlaces)} plus grandes villes, toutes les marques dessinées à la même taille. Une commande à ${n0(a.removes.length)} positions refait le cadrage, de ` +
    `${n0(a.removes[0].radius)} km à la ronde à toute l'étendue du fichier, et la carte se zoome et se déplace avec les contrôles de MapTiler.`,
  // The claim checked against the drawn data: the largest station is in Ukraine — by the border, not
  // by the data's own country cell — and its nearest equal is 2 367 km away.
  check({ countryOf, removes }) {
    if (biggest.country !== "Ukraine") throw new Error(`the largest station is in ${biggest.country}, not Ukraine`);
    if (countryOf(biggest.lon, biggest.lat) !== "UKR") throw new Error("the largest station's point does not fall inside Ukraine's polygon");
    const far = removes[removes.length - 1].rival;
    if (Math.round(far.km) !== 2367) throw new Error(`the title says its nearest rival is 2 367 km away; the largest other station is ${Math.round(far.km)} km away`);
  },
};

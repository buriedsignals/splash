// beat.mjs for the worked example proof/scrolly-locator-zaporizhzhia — "La plus grosse centrale
// bas-carbone d'Europe est en Ukraine", as a scrolly. data.json holds three kinds of row in one table:
// the low-carbon stations (kind "station"), the settlements (kind "city") and each country's 2024
// generation (kind "country"). Every number in a card is COMPUTED: the ranking, the drawn stations and
// the subject come from render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [KIND, NAME, COUNTRY, MW, POP, TWH, LON, LAT] = ["kind", "name", "country", "capacity_mw", "pop", "generation_twh", "lon", "lat"].map(col);
const rows = table.rows.map((r) => ({
  kind: r[KIND], name: r[NAME], country: r[COUNTRY], mw: Number(r[MW]), pop: Number(r[POP]), twh: Number(r[TWH]), lon: Number(r[LON]), lat: Number(r[LAT]),
}));

const stations = rows.filter((r) => r.kind === "station");
const sites = stations.map((s) => ({ value: s.mw, lon: s.lon, lat: s.lat, country: s.country }));
const biggest = stations.reduce((a, b) => (b.mw > a.mw ? b : a));
// The settlements named: the six most populous, chosen by a rule, not by hand. MapTiler's map spells
// two of them otherwise than the data (Odesa, Rostov-on-Don): the names must be the map's.
const TILE_NAME = { Odessa: "Odesa", Rostov: "Rostov-on-Don" };
const cities = rows.filter((r) => r.kind === "city").sort((a, b) => b.pop - a.pop).slice(0, 6);
const unreported = rows.filter((r) => r.kind === "country" && !(r.twh > 0));

const n0 = (v) => Math.round(v).toLocaleString("fr-FR");
const format = (v) => `${n0(v)} MW`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  // EVERY station of the kind the story ranks: card 1 draws the largest.
  sites,
  drawCount: 4,
  // THE SUBJECT: its own row's coordinates, and its name in the story's language.
  subject: { lon: biggest.lon, lat: biggest.lat },
  subjectName: "Zaporijjia",
  subjectLabel: (r) => `${r.subject.name} · ${format(r.subject.value)} installés`,
  // The country card 2 outlines (the subject's own).
  country: { iso: "UKR", name: "Ukraine" },
  // Card 4: MapTiler's own labels, filtered — countries by code, settlements and waters by the map's spelling.
  areas: ["UKR", "RUS", "ROU", "MDA", "BLR"],
  places: cities.map((c) => ({ name: TILE_NAME[c.name] ?? c.name, lon: c.lon, lat: c.lat })),
  waters: ["Black Sea", "Sea of Azov"],
  // A river the map carries no name for, drawn by the beat at a point on it.
  river: { text: "Dniepr", lon: 33.4, lat: 47.0 },
  unit: "centrales bas-carbone, puissance installée",
  format,
  cards: {
    tops: (r) =>
      `Les plus grosses centrales bas-carbone que la base mondiale du WRI recense en Europe : une en ${r.country.name}, ${format(r.subject.value)}, puis trois centrales nucléaires françaises, de ${n0(r.last.value)} à ${format(r.second.value)}.`,
    country: (r) => `La plus grosse est en ${r.country.name}, le seul pays du continent dont la production électrique de 2024 n’est pas rapportée.`,
    zoom: () => "Approchons : l’Ukraine, la mer Noire, la mer d’Azov.",
    places: () => "Pays en capitales, villes en bas de casse sur un point, eaux en italique : Kiev, Kharkiv, Dnipro, Odessa.",
    subject: (r) => `${r.subject.name}, sur le Dniepr : ${format(r.subject.value)} de puissance installée, la plus grosse centrale bas-carbone d’Europe.`,
  },
  // The header's accent note while each card is read.
  notes: {
    tops: (r) => `${format(r.subject.value)} en ${r.country.name}`,
    country: () => "production 2024 non rapportée",
    zoom: (r) => `${r.country.name} et mer Noire`,
    subject: (r) => `${r.subject.name} : ${format(r.subject.value)}`,
    limits: () => "puissance installée, jamais une production",
  },
  title: [
    "La plus grosse centrale bas-carbone d’Europe est en Ukraine",
    "La plus grosse centrale d’Europe est en Ukraine",
    `Zaporijjia, ${format(biggest.mw)}`,
  ],
  // The last card: the accounting the map rests on.
  limits: "Lecture : la base enregistre une puissance installée, jamais une production. La centrale est dessinée là où elle est, pas là où elle produit.",
  source: "Source : WRI Global Power Plant Database v1.3.0 · fond de carte © MapTiler © OpenStreetMap",
  alt: (r) =>
    `Carte de l’Europe puis de l’Ukraine : la centrale de ${r.subject.name}, ${format(r.subject.value)} de puissance installée, la plus grosse centrale bas-carbone ` +
    `recensée en Europe, sur le Dniepr près de la mer d’Azov. L’Ukraine est le seul pays du continent sans production électrique rapportée en 2024.`,
  // The claim checked against the drawn data (CONTRACT.md).
  check(r) {
    if (r.subject.rank !== 1) throw new Error("the title says the subject is the largest station");
    if (r.countryOf(r.subject.lon, r.subject.lat) !== "UKR") throw new Error("the title says the largest station is in Ukraine");
    const french = r.top.slice(1).filter((s) => r.countryOf(s.lon, s.lat) === "FRA").length;
    if (french !== 3) throw new Error(`card 1 says the next three are French; ${french} are`);
    if (unreported.length !== 1 || unreported[0].name !== "Ukraine")
      throw new Error(`card 2 says Ukraine is the only country with no reported 2024 generation; the file reports none for ${unreported.map((u) => u.name).join(", ") || "no country"}`);
  },
};

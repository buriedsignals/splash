// beat.mjs for the worked example proof/static-locator-zaporizhzhia — "Europe's largest low-carbon
// power station is in Ukraine" — written for the SCROLLY gesture kit: the staging is the `gestures` list. A
// mark is the subject (by the first line of subjectLines) or a settlement (by its printed label); a
// settlement's value is its distance to the subject in km, the one figure a locator draws. data.json holds the stations (kind "station") and the settlements
// (kind "city") in one table. Every number on the plate is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, KIND, COUNTRY, MW, POP, LON, LAT] = ["name", "kind", "country", "capacity_mw", "pop", "lon", "lat"].map(col);
const rows = table.rows.map((r) => ({
  name: r[NAME], kind: r[KIND], country: r[COUNTRY],
  mw: Number(r[MW]), pop: Number(r[POP]), lon: Number(r[LON]), lat: Number(r[LAT]),
}));

const biggest = rows.filter((r) => r.kind === "station").reduce((a, b) => (b.mw > a.mw ? b : a));
// The settlements named: the six most populous cities, chosen by a rule, not by hand.
const cities = rows.filter((r) => r.kind === "city").sort((a, b) => b.pop - a.pop).slice(0, 6);

const FRENCH = { Kyiv: "Kiev", Bucharest: "Bucarest" };
// Great-circle distance from the station, in km (the locator's own figure).
const kmTo = (p) => {
  const r = Math.PI / 180;
  const a = Math.sin(((p.lat - biggest.lat) * r) / 2) ** 2 + Math.cos(biggest.lat * r) * Math.cos(p.lat * r) * Math.sin(((p.lon - biggest.lon) * r) / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(a));
};
const plain = (s) => s.replace(/[   ]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));

export default {
  eyebrow: "Énergie · Europe",
  // Which columns of data.json hold every place's longitude and latitude.
  lon: "lon",
  lat: "lat",
  // THE SUBJECT: its coordinates, read from data.json (or { column, equals } naming its row).
  subject: { lon: biggest.lon, lat: biggest.lat },
  // The lines printed beside the subject's ring: its name first, then its figure (a name gesture's
  // note replaces the figure).
  subjectLines: ["Zaporijjia", `${n0(biggest.mw)} MW installés`],
  // The staging, in story order: the station ringed in the accent, then named with its capacity. A
  // gesture on a settlement serves the claim only when the takeaway names it (e.g. annotate "Kiev" with
  // its distance, `à ${n0(kmTo(...))} km`, for a takeaway about how near the capital is).
  gestures: [
    { do: "highlight", mark: "Zaporijjia", card: `Une centrale, au bord du Dniepr, au nord de la mer d’Azov.` },
    { do: "zoom", mark: "Zaporijjia", note: "×4", card: `Zaporijjia, la plus grosse centrale bas-carbone d’Europe.` },
    { do: "name", mark: "Zaporijjia", note: `${n0(biggest.mw)} MW installés`, card: `${n0(biggest.mw)} MW de puissance installée.` },
  ],

  // The settlements named: values of the placeName column, each found in data.json by that name.
  placeName: "name",
  // A place may be { name, label }: the name finds its row, the label is printed in the story's language.
  places: cities.map((c) => ({ name: c.name, label: FRENCH[c.name] ?? c.name })),
  // The countries named (ISO alpha-3 code → name in the story's language): the one the story is in
  // and the neighbours a reader needs to place it.
  areas: { UKR: "Ukraine", RUS: "Russie", ROU: "Roumanie", MDA: "Moldavie", BLR: "Biélorussie" },
  // Bodies of water, declared at their own centres (a sea has no polygon), each with shorter forms.
  waters: [
    { forms: ["Mer Noire", "Mer N."], lon: 33.5, lat: 43.6 },
    { forms: ["Mer d’Azov", "Azov"], lon: 36.5, lat: 46.2 },
    { forms: ["Dniepr"], lon: 33.4, lat: 47.0 },
  ],
  // Optional: degrees either side of the subject the camera holds (default 9 by 5.2).
  span: { lon: 9, lat: 5.2 },
  title: [
    `La plus grosse centrale bas-carbone d’Europe est en Ukraine`,
    `La plus grosse centrale d’Europe est en Ukraine`,
    `Zaporijjia, ${n0(biggest.mw)} MW`,
  ],
  limits: [
    `Zaporijjia, ${n0(biggest.mw)} MW de puissance installée, est la plus grosse centrale bas-carbone ` +
      `que la base recense en Europe.`,
    `Zaporijjia, ${n0(biggest.mw)} MW installés, plus grosse centrale bas-carbone d’Europe.`,
  ],
  reading: [
    `Lecture : la base enregistre une puissance installée, jamais une production. Pays en capitales ` +
      `grises, villes en bas de casse, eaux en italique.`,
    `Lecture : puissance installée, pas production.`,
  ],
  source: "Source : WRI Global Power Plant Database v1.3.0 · lieux Natural Earth 50 m · fond de carte MapTiler (dataviz)",
  alt:
    `Carte de repérage du sud de l’Ukraine et de ses voisins. La centrale de Zaporijjia, ` +
    `${n0(biggest.mw)} MW de puissance installée, est marquée d’un cercle dans la couleur d’accent, au ` +
    `bord du Dniepr, au nord de la mer d’Azov. Les pays sont nommés en capitales, les six plus grandes ` +
    `villes du cadre en bas de casse, les eaux en italique.`,
  check() {
    if (biggest.country !== "Ukraine") throw new Error(`the largest station is in ${biggest.country}, not Ukraine`);
  },
};

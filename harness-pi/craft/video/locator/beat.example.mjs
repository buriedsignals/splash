// beat.mjs for the worked example proof/video-locator-zaporizhzhia — « La plus grosse centrale bas-carbone d'Europe est
// en Ukraine », told in time. data.json holds the low-carbon stations (kind "station") and the settlements (kind
// "city") in one table. Every number the video draws is COMPUTED from data.json; the camera, the ring and the
// placement of every name are the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [NAME, KIND, MW, POP, LON, LAT] = ["name", "kind", "capacity_mw", "pop", "lon", "lat"].map(col);
const rows = table.rows.map((r) => ({ name: r[NAME], kind: r[KIND], mw: Number(r[MW]), pop: Number(r[POP]), lon: Number(r[LON]), lat: Number(r[LAT]) }));

// The video is in French.
const FRENCH_PLACE = {
  Kyiv: "Kiev", Kharkiv: "Kharkiv", Dnipro: "Dnipro", Odessa: "Odessa", Donetsk: "Donetsk", Rostov: "Rostov",
  Bucharest: "Bucarest", Voronezh: "Voronej", "Chișinău": "Chisinau", Krasnodar: "Krasnodar", Mariupol: "Marioupol",
};
const n0 = (v) => Math.round(v).toLocaleString("fr-FR");

// THE SUBJECT: the largest station of the register.
const stations = rows.filter((r) => r.kind === "station");
const biggest = stations.reduce((a, b) => (b.mw > a.mw ? b : a));

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["La plus grosse centrale bas-carbone d’Europe est en Ukraine", "La plus grosse centrale d’Europe est en Ukraine"],
  subject: { lon: biggest.lon, lat: biggest.lat, name: "Zaporijjia", priority: biggest.mw },
  country: "UKR",
  // The countries the close-up names, the subject's own first.
  areas: { UKR: "Ukraine", RUS: "Russie", ROU: "Roumanie", MDA: "Moldavie", BLR: "Biélorussie", TUR: "Turquie" },
  // The settlements, ranked by population: the close-up names the six largest in its frame.
  places: rows.filter((r) => r.kind === "city").map((r) => ({ lon: r.lon, lat: r.lat, name: r.name, label: FRENCH_PLACE[r.name] ?? r.name, priority: r.pop })),
  waters: [
    { name: "Mer Noire", lon: 33.5, lat: 43.6 },
    { name: "Mer d’Azov", lon: 36.5, lat: 46.2 },
    { name: "Dniepr", lon: 33.1, lat: 46.8 },
  ],
  valueText: (mw) => `${n0(mw)} MW installés`,
  source: [
    "Source : WRI Global Power Plant Database v1.3.0 · lieux Natural Earth 50 m · © MapTiler © OpenStreetMap",
    "Source : WRI Global Power Plant Database · Natural Earth · © MapTiler © OpenStreetMap",
    "WRI · Natural Earth · © MapTiler © OpenStreetMap",
    "WRI · © MapTiler © OpenStreetMap",
  ],
  // The claim checked against the drawn data: the largest station is in Ukraine.
  check(map) {
    const where = map.countryOf(biggest.lon, biggest.lat);
    if (where !== "UKR") throw new Error(`the title says the largest station is in Ukraine; it stands in ${where}`);
  },
};

// THE SUBJECT OF `static-locator-zaporizhzhia`, LOADED AND ASSERTED — the static beat's two checks and its naming rules.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-locator-zaporizhzhia");
/** The continent's land: the sibling Europe beats' frozen Natural Earth 50 m shapes (the locator's own file holds only
 *  the close-up's region, and the video starts on the continent). */
export const EUROPE_SHAPES = join(HERE, "..", "static-dot-density-europe-stations", "shapes.geojson");
export const EUROPE_WINDOW = { west: -25, east: 45, south: 34, north: 72 };
export const AREAS = ["UKR", "RUS", "ROU", "MDA", "BLR", "TUR"];
export const PLACES = 6;
export const FRENCH_COUNTRY = { UKR: "Ukraine", RUS: "Russie", ROU: "Roumanie", MDA: "Moldavie", BLR: "Biélorussie", TUR: "Turquie" };
export const FRENCH_PLACE = { Kyiv: "Kiev", Kharkiv: "Kharkiv", Dnipro: "Dnipro", Odessa: "Odessa", Rostov: "Rostov", Bucharest: "Bucarest" };
export const WATERS = [
  { forms: ["Mer Noire"], lon: 33.5, lat: 43.6 },
  { forms: ["Mer d’Azov"], lon: 36.5, lat: 46.2 },
  { forms: ["Dniepr"], lon: 33.4, lat: 47.0 },
];

const csv = (path) => {
  const lines = readFileSync(path, "utf8").trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const stations = csv(join(dir, "stations.csv")).map((r) => ({ ...r, mw: Number(r.capacity_mw), lon: Number(r.lon), lat: Number(r.lat) }));
  const biggest = stations.reduce((a, b) => (b.mw > a.mw ? b : a));
  if (biggest.country !== "Ukraine") throw new Error(`the title says the largest is in Ukraine; it is in ${biggest.country}`);
  if (!(biggest.mw >= 6000)) throw new Error(`the video counts 6 000 MW; it is ${biggest.mw}`);
  const rows = csv(join(dir, "electricity.csv"));
  const fuels = Object.keys(rows[0]).filter((h) => h.endsWith("__twh"));
  const unreported = rows.filter((r) => fuels.reduce((s, k) => s + Number(r[k] || 0), 0) <= 0);
  if (unreported.length !== 1 || unreported[0].entity !== "Ukraine") throw new Error(`Ukraine should be the one country with no reported 2024 generation; the file has ${unreported.map((r) => r.entity).join(", ") || "none"}`);
  const places = csv(join(dir, "places.csv"))
    .map((r) => ({ ...r, pop: Number(r.pop), lon: Number(r.lon), lat: Number(r.lat) }))
    .sort((a, b) => b.pop - a.pop)
    .slice(0, PLACES);
  for (const p of places) if (!FRENCH_PLACE[p.name]) throw new Error(`no French name recorded for ${p.name}`);
  const closeWindow = { west: biggest.lon - 9, east: biggest.lon + 9, south: biggest.lat - 5.2, north: biggest.lat + 5.2 };
  /** The focus country's regional borders — Natural Earth 10 m admin-1 lines, Ukraine's only, frozen beside this beat. */
  const regions = JSON.parse(readFileSync(join(HERE, "regions.geojson"), "utf8"));
  if (!regions.features.length || regions.features.some((f) => f.properties.adm0 !== "UKR")) throw new Error("regions.geojson should hold Ukraine's admin-1 lines and nothing else");
  return { biggest, places, closeWindow, regions, geo: JSON.parse(readFileSync(EUROPE_SHAPES, "utf8")) };
}

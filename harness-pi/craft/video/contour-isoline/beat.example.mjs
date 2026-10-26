// beat.mjs for the worked example proof/video-contour-europe-distance — « La moitié de l'Europe est à moins de 132 km de
// la mer », told in time. data.json lists the countries of the study area; the field (the distance to the sea, measured
// on the kit's frozen coastline) and every number the video draws are computed by the kit.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const CODE = table.columns.findIndex((c) => c.name === "code");
if (CODE < 0) throw new Error("data.json has no column code");
const NB = " ";

export default {
  lang: "fr",
  eyebrow: "Géographie · Europe",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [`La moitié de l’Europe est à moins de 132${NB}km de la mer`, "L’Europe, mesurée depuis la mer"],
  // The study area: the countries of data.json, minus Russia, which the frame cuts.
  study: table.rows.map((r) => r[CODE]).filter((code) => code && code !== "RUS"),
  // The climbing count: {p} is the percent of the land, {km} the distance the sweep has reached.
  count: `{p}${NB}% à moins de {km}${NB}km`,
  outsideLabel: "hors mesure",
  source: ["Natural Earth · grille de 6 km · © MapTiler © OpenStreetMap", "Natural Earth · © MapTiler © OpenStreetMap", "© MapTiler © OpenStreetMap"],
  // The claim checked against the field: half the land within 132 km, no point 1 000 km from the sea.
  check(map) {
    if (Math.round(map.median) !== 132) throw new Error(`the title says half of Europe is within 132 km of the sea; the median is ${map.median.toFixed(0)} km`);
    if (!(map.deepest < 1000)) throw new Error(`no point should be 1 000 km from the sea; the farthest is ${map.deepest.toFixed(0)} km`);
  },
};

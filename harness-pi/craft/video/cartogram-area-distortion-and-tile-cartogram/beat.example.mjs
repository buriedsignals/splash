// beat.mjs for the worked example proof/video-cartogram-europe-lowcarbon — « Par pays, 65,1 % de bas-carbone ; au km²,
// 44,9 % », told in time. Every number the video draws is COMPUTED from data.json; the territories, both means, the
// balance and the tiles are the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [CODE, YEAR_COL] = [col("code"), col("year")];
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"].map(col);
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"].map(col);
const YEAR = 2024;
const NB = " ";

// The video is in French; the map names only the country that takes the most room.
const NAMES = { RUS: "Russie" };

// THE JOIN: `code` holds ISO alpha-3. The value is the low-carbon share of generation, in %; a country whose generation
// is not reported (total 0) is null — a hollow tile.
const rows = table.rows
  .filter((r) => Number(r[YEAR_COL]) === YEAR)
  .map((r) => {
    const clean = CLEAN.reduce((s, i) => s + Number(r[i] || 0), 0);
    const total = clean + FOSSIL.reduce((s, i) => s + Number(r[i] || 0), 0);
    return { iso: r[CODE], name: NAMES[r[CODE]] ?? r[CODE], value: total > 0 ? (clean / total) * 100 : null };
  });

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [`Par pays, 65,1${NB}% de bas-carbone ; au km², 44,9${NB}%`, "Une tuile par pays"],
  rows,
  breaks: [40, 60, 75, 94],
  // The balance's two pivots; {n} is where the mean is printed, at one decimal.
  means: { area: `au km² {n}${NB}%`, country: `par pays {n}${NB}%` },
  missingLabel: "sans donnée",
  source: ["Ember, via OWID · © MapTiler © OpenStreetMap", "Ember · © MapTiler © OpenStreetMap"],
  // The claim checked against the drawn data: the two means as the title states them, more than 15 points apart, and
  // the country taking the most room below the country mean.
  check(map) {
    if (Math.round(map.byCountry * 10) / 10 !== 65.1) throw new Error(`the title says 65,1 % by country; the data gives ${map.byCountry.toFixed(1)}`);
    if (Math.round(map.byArea * 10) / 10 !== 44.9) throw new Error(`the title says 44,9 % by area; the data gives ${map.byArea.toFixed(1)}`);
    if (!(map.gap > 15)) throw new Error(`the two readings are ${map.gap.toFixed(1)} points apart, not twenty`);
    if (!(map.widest.value < map.byCountry)) throw new Error(`${map.widest.name} takes the most room and is no longer below the country mean`);
  },
};

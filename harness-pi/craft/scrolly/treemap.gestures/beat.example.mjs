// beat.mjs for the worked example proof/static-treemap-europe-capacity, written for the gesture SCROLLY (each gesture carries its card, the prose the reader reads while it plays): "10 European
// countries have already tipped to wind and solar; together they hold 14 % of the continent's low-carbon capacity."
// data.json holds one row per country (the stations added up). Every number on the plate is COMPUTED from
// data.json; only the title's first form is typed, because it is the journalist's takeaway copied as written.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, MW, WIND_SOLAR] = [col("country"), col("low_carbon_mw"), col("wind_solar_mw")];

// The parts: one tile per country, its low-carbon capacity in gigawatts.
const rows = data.rows.map((r) => ({ name: r[COUNTRY], value: Number(r[MW]) / 1000 })).sort((a, b) => b.value - a.value);
// The thread: the countries whose low-carbon fleet is already more than half wind and solar.
const tipped = data.rows.filter((r) => Number(r[WIND_SOLAR]) / Number(r[MW]) > 0.5).map((r) => r[COUNTRY]);
const total = rows.reduce((s, r) => s + r.value, 0);
const held = rows.filter((r) => tipped.includes(r.name)).reduce((s, r) => s + r.value, 0);
const share = (held / total) * 100;
const one = (v) => v.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  eyebrow: "Energy · Europe",
  rows,
  // The staging, in story order: the ten tipped countries take the accent, the bracket lays them together and
  // prints their share of the whole, the count states how many they are.
  gestures: [
    { do: "highlight", marks: tipped, card: `In colour, the ${tipped.length} countries where wind and solar already lead the low-carbon fleet: ${one(held)} GW between them.` },
    { do: "bracket", marks: tipped, of: "whole", note: `${Math.round(share)} % of Europe's ${Math.round(total)} GW`, card: `Laid together, they hold ${Math.round(share)} % of the continent's ${Math.round(total)} GW.` },
    { do: "count", marks: tipped, note: `${tipped.length} countries`, card: `${tipped.length} countries in all, from the United Kingdom's ${one(rows.find((r) => r.name === "United Kingdom").value)} GW down.` },
  ],
  format: (v) => `${one(v)} GW`,
  unit: "Installed low-carbon capacity",
  restLabel: "other countries",
  title: [
    "10 European countries have already tipped to wind and solar; together they hold 14 % of the continent's low-carbon capacity.",
    `${tipped.length} European countries have already tipped to wind and solar`,
  ],
  limits: [
    `One tile per country, its area its installed low-carbon capacity (hydro, nuclear, wind, solar and others): ${Math.round(total)} GW in all. In colour, the ${tipped.length} countries where wind and solar are more than half of it.`,
    `One tile per country, its area its installed low-carbon capacity.`,
  ],
  source: "Source: WRI Global Power Plant Database v1.3.0 · installed capacity, not generation",
  alt: () => `Treemap of Europe's installed low-carbon capacity, one tile per country, ${Math.round(total)} GW in all. The ${tipped.length} countries where wind and solar already make up more than half are in colour and hold ${Math.round(share)} % of the total.`,
  check() {
    if (tipped.length !== 10) throw new Error(`${tipped.length} countries have tipped, not 10`);
    if (Math.round(share) !== 14) throw new Error(`the tipped countries hold ${share.toFixed(1)} %, not 14 %`);
  },
};

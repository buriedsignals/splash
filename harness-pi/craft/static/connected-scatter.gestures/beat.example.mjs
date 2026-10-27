// beat.mjs for the worked example proof/static-connected-scatter-lowcarbon — "All 16 countries cleaned up their own
// electricity between 2000 and 2024, yet France lost 11.8 points of weight in Europe's low-carbon total" — written
// for the gesture kit: the staging is the `gestures` list. Both shares are COMPUTED from the generation columns.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const LOW_CARBON = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const [ENTITY, YEAR] = [col("entity"), col("year")];
const YEARS = [2000, 2024];
const sum = (r, cols) => cols.reduce((s, c) => s + Number(r[col(c)]), 0);
const at = (year) => data.rows.filter((r) => Number(r[YEAR]) === year);
const groupLow = (year) => at(year).reduce((s, r) => s + sum(r, LOW_CARBON), 0);

// The marks: one row per country and year. x = its share of the group's low-carbon output; value = the low-carbon
// share of its own electricity. A path per country, 2000 to 2024; the path's last step carries the country's name.
const rows = YEARS.flatMap((year) =>
  at(year).map((r) => {
    const low = sum(r, LOW_CARBON);
    return { series: r[ENTITY], key: year, x: (low / groupLow(year)) * 100, value: (low / (low + sum(r, FOSSIL))) * 100 };
  }),
);
const step = (name, year) => rows.find((r) => r.series === name && r.key === year);
const countries = [...new Set(rows.map((r) => r.series))];
const cleaner = countries.filter((c) => step(c, 2024).value > step(c, 2000).value);
const lighter = countries.filter((c) => step(c, 2024).x < step(c, 2000).x);
const SUBJECT = "France";
const weight = step(SUBJECT, 2024).x - step(SUBJECT, 2000).x;
const home = step(SUBJECT, 2024).value - step(SUBJECT, 2000).value;
const one = (v) => v.toFixed(1);

export default {
  eyebrow: "Energy · Europe",
  rows,
  // The staging, in story order: France's path in the accent and its two moves written on it; the countries that
  // lost weight kept, the others stepped back; France's path traced with its two years.
  gestures: [
    { do: "highlight", mark: SUBJECT },
    { do: "annotate", mark: SUBJECT, note: `France: ${one(weight)} points of weight, +${one(home)} at home` },
    { do: "filter", marks: lighter, note: `${lighter.length} of ${countries.length} weigh less than in 2000` },
  ],
  xName: `Share of the ${countries.length} countries' low-carbon power`,
  xQualifier: "(%)",
  yName: "Low-carbon share of its own power",
  yQualifier: "(%)",
  format: (v) => v.toFixed(0),
  xFormat: (v) => `${v.toFixed(1)}%`,
  xTick: (v) => `${v}%`,
  title: [
    "All 16 countries cleaned up their own electricity between 2000 and 2024, yet France lost 11.8 points of weight in Europe's low-carbon total",
    `All ${countries.length} cleaner at home; France ${one(weight)} points lighter in Europe`,
  ],
  limits: [
    `Shares of 16 European countries only; low-carbon means renewables plus nuclear. Each country is drawn twice: the hollow circle is 2000, the filled one 2024.`,
    `Shares of 16 European countries only. Hollow circle 2000, filled 2024.`,
  ],
  source: "Source: Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (marks) =>
    `Connected scatter of ${countries.length} European countries between 2000 and 2024. Every path rises: all cleaned up their own electricity. ${lighter.length} point left, France among them, which lost ${one(-weight)} points of weight in the group while gaining ${one(home)} points at home.`,
  evidenceLevels: 4,
  check() {
    if (cleaner.length !== countries.length) throw new Error(`${countries.length - cleaner.length} countries' own mix did not get cleaner`);
    if (Math.abs(-weight - 11.8) > 0.05) throw new Error(`France lost ${(-weight).toFixed(2)} points of weight, not 11.8`);
  },
};

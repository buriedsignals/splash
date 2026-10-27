// beat.mjs for the worked example proof/static-income-life-expectancy — "Beyond $30,000 per person, life
// expectancy fits in a band 3 times narrower" — written for the gesture kit: the staging is the `gestures` list.
// Every number on the plate is COMPUTED from data.json; the break is the journalist's, the spreads are arithmetic.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, CODE, LIFE, GDP, POP] = [col("Entity"), col("Code"), col("Life expectancy at birth"), col("GDP per capita"), col("Population")];

// The marks: one point per country with both measures (aggregates have no three-letter code). x = income, value =
// life expectancy, size = population (drawn as area: the plate keys it).
const rows = data.rows
  .filter((r) => /^[A-Z]{3}$/.test(r[CODE] ?? "") && Number(r[GDP]) > 0 && Number.isFinite(Number(r[LIFE])))
  .map((r) => ({ name: r[NAME], x: Number(r[GDP]), value: Number(r[LIFE]), size: Number(r[POP]) }));

// The claim: the spread of life expectancy on each side of $30,000.
const BREAK = 30000;
const spread = (keep) => {
  const ys = rows.filter(keep).map((r) => r.value);
  return { count: ys.length, range: Math.max(...ys) - Math.min(...ys) };
};
const below = spread((r) => r.x < BREAK);
const above = spread((r) => r.x >= BREAK);
const ratio = below.range / above.range;
const usd = (v) => `$${Math.round(v).toLocaleString("en-US")}`;

export default {
  restLabel: "The whole cloud",
  eyebrow: "Health · World",
  rows,
  // The staging, in story order: the break as a rule on the income axis, its two spreads in its note; then the
  // richer countries kept, the others stepped back.
  gestures: [
    { do: "reference", axis: "x", value: BREAK, note: `${usd(BREAK)}: ${below.range.toFixed(0)} years of spread below, ${above.range.toFixed(0)} above` },
    { do: "filter", axis: "x", value: BREAK, side: "above", note: `${above.count} countries above ${usd(BREAK)}` },
  ],
  xName: "GDP per person",
  xQualifier: "(log scale)",
  yName: "Life expectancy at birth",
  yQualifier: "(years)",
  xLog: true,
  format: (v) => v.toFixed(0),
  xFormat: usd,
  xTick: (v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`),
  sizeName: "Population",
  sizeFormat: (v) => (v >= 1e9 ? `${(v / 1e9).toFixed(1)} bn` : v >= 1e6 ? `${(v / 1e6).toFixed(0)} m` : `${Math.round(v / 1e3)} k`),
  title: [
    "Beyond $30,000 per person, life expectancy fits in a band 3 times narrower",
    `Beyond ${usd(BREAK)}, life expectancy fits in a band ${Math.round(ratio)} times narrower`,
  ],
  limits: [
    `${rows.length} countries with both measures in 2021; a point's area is its population. Correlation, not causation — health systems, conflict and disease move independently of income.`,
    `${rows.length} countries in 2021. Correlation, not causation.`,
  ],
  source: "Source: World Bank via Gapminder, UN WPP (2024), via Our World in Data",
  alt: (marks) =>
    `Scatter of income per person against life expectancy for ${marks.length} countries in 2021, income on a log scale. Below ${usd(BREAK)}, ${below.count} countries spread over ${below.range.toFixed(0)} years; above it, ${above.count} countries over ${above.range.toFixed(0)}.`,
  evidenceLevels: 3,
  check() {
    if (Math.round(ratio) !== 3) throw new Error(`the band above ${BREAK} is ${ratio.toFixed(2)} times narrower than below, not 3`);
  },
};

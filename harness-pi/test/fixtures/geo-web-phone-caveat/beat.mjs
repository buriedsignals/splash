import { readFileSync } from 'fs';
import { join } from 'path';

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);

const rows = [
  { key: "DEU", name: "Germany", value: table.rows[0][col("recycling_rate")] },
  { key: "CZE", name: "Czech Republic", value: table.rows[1][col("recycling_rate")] },
  { key: "NLD", name: "Holland", value: table.rows[2][col("recycling_rate")] },
  { key: "BEL", name: "Belgiumm", value: table.rows[3][col("recycling_rate")] },
  { key: "AUT", name: "Austria", value: table.rows[4][col("recycling_rate")] },
  { key: "MKD", name: "Macedonia", value: table.rows[5][col("recycling_rate")] },
  { key: "FRA", name: "France", value: table.rows[6][col("recycling_rate")] },
  { key: "ITA", name: "Italy", value: table.rows[7][col("recycling_rate")] },
  { key: "ESP", name: "Spain", value: table.rows[8][col("recycling_rate")] },
  { key: "POL", name: "Poland", value: table.rows[9][col("recycling_rate")] },
  { key: "SWE", name: "Sweden", value: table.rows[10][col("recycling_rate")] }
];

export default {
  eyebrow: "Recycling Rates",
  rows,
  breaks: [20, 40, 60],
  missingLabel: "no data",
  gestures: [
    {
      do: "filter",
      marks: ["DEU", "MKD"],
      note: "Germany has the highest recycling rate, at 67.8 per cent, and Macedonia has the lowest recycling rate, at 18.4 per cent."
    },
    {
      do: "highlight",
      mark: "DEU",
      note: "Germany: 67.8 %"
    },
    {
      do: "highlight",
      mark: "MKD",
      note: "Macedonia: 18.4 %"
    }
  ],
  unit: "per cent",
  format: (v) => `${v} %`,
  title: "Of the eleven national agencies that reported, Germany has the highest recycling rate, at 67.8 per cent, and Macedonia has the lowest recycling rate, at 18.4 per cent.",
  limits: ["eleven of forty-two European countries reported; the other thirty-one are drawn as no-data and are not part of any claim. The agencies do not share one definition of recycled -- some count material sent for sorting, others only material that re-entered production. One survey row (Sweden) is duplicated byte for byte in the frozen source and is counted once.", "11 of 42 countries reported."],
  reading: "Recycling rates, March 2025.",
  source: "national environment agencies, collected March 2025",
  alt: "A map of Europe shows recycling rates for 11 countries: Germany (67.8%), Sweden (48.7%), Holland (56.9%), Belgiumm (54.2%), Austria (58.0%), Italy (51.4%), France (44.3%), Czech Republic (42.1%), Poland (39.5%), Spain (36.9%), and Macedonia (18.4%)."
};

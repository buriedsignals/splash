// beat.mjs for the worked example proof/static-donut-world-co2-share, written for the gesture SCROLLY (each gesture carries its card, the prose the reader reads while it plays): "China emitted
// 32.9 % of the world's CO2 in 2023, more than twice the United States' 13.3 %." One ring is the world's emissions;
// each country is an arc, its angle its share; the countries the frame has no room for are one remainder arc. Every
// number on the plate is COMPUTED from data.json; only the title's first form is typed.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, PER, POP] = [col("entity"), col("t_per_person_2023"), col("population_2023")];

// Each country's 2023 emissions, in billions of tonnes: per person times population. The whole is every country.
const rows = data.rows.map((r) => ({ name: r[NAME], value: (Number(r[PER]) * Number(r[POP])) / 1e9 })).sort((a, b) => b.value - a.value);
const world = rows.reduce((s, r) => s + r.value, 0);
const shareOf = (n) => (rows.find((r) => r.name === n).value / world) * 100;
const china = rows.find((r) => r.name === "China");
const us = rows.find((r) => r.name === "United States");
const one = (v) => v.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  eyebrow: "Climate · World",
  rows,
  gestures: [
    { do: "highlight", mark: "China", card: `China, in colour: ${one(china.value)} Gt, ${one(shareOf("China"))} % of the world's CO2 in 2023.` },
    { do: "name", mark: "United States", note: `${one(shareOf("United States"))} % of the world`, card: `The United States, the second emitter: ${one(shareOf("United States"))} %.` },
    { do: "compare", marks: ["China", "United States"], note: `${one(shareOf("China"))} %, ${one(china.value / us.value)} times the United States`, card: `The dashed arc inside China's is the United States' ${one(us.value)} Gt, laid at the same angle per tonne: China emits ${one(china.value / us.value)} times as much.` },
  ],
  format: (v) => `${one(v)} Gt`,
  unit: "CO2 emitted in 2023",
  restLabel: "other countries",
  title: [
    "China emitted 32.9 % of the world's CO2 in 2023, more than twice the United States' 13.3 %.",
    "China: a third of the world's CO2, more than twice the United States",
  ],
  limits: [
    `One ring is the world's territorial CO2 in 2023, ${one(world)} Gt; each arc is a country's share of it. Territorial emissions only (no trade adjustment), one year (2023); totals computed as per-person emissions times population.`,
    `One ring is the world's CO2 in 2023; each arc a country's share.`,
  ],
  source: "Sources: Global Carbon Budget 2025 · population, via Our World in Data",
  alt: () => `Donut of the world's CO2 in 2023, ${one(world)} Gt. China's arc, in colour, is ${one(shareOf("China"))} %; the United States' ${one(shareOf("United States"))} %.`,
  check() {
    if (Math.round(shareOf("China") * 10) / 10 !== 32.9) throw new Error(`China is ${shareOf("China").toFixed(2)} %, not 32.9 %`);
    if (Math.round(shareOf("United States") * 10) / 10 !== 13.3) throw new Error(`the United States is ${shareOf("United States").toFixed(2)} %, not 13.3 %`);
    if (!(china.value > 2 * us.value)) throw new Error(`China is not more than twice the United States`);
  },
};

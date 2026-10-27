// beat.mjs for the worked example proof/static-beeswarm-co2-per-person — "Les 6 pays au-dessus de 20 t de CO₂ par
// personne pèsent 0,6 % de l’humanité" — written for the Position gesture kit. Every number on the plate is
// COMPUTED from data.json; the title's first form is the journalist's takeaway, copied as written.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, VALUE, SIZE] = [col("entity"), col("co2_t_per_person"), col("population")];
// One row per country: its value places it, its size (population) is its circle's area.
const rows = table.rows.map((r) => ({ name: r[NAME], value: Number(r[VALUE]), size: Number(r[SIZE]) }));

const HIGH = 20;
const people = rows.reduce((s, m) => s + m.size, 0);
const above = rows.filter((m) => m.value > HIGH);
const aboveShare = (above.reduce((s, m) => s + m.size, 0) / people) * 100;
const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Climat · Monde",
  rows,
  gestures: [
    { do: "reference", value: HIGH, note: `${HIGH} t : ${above.length} pays au-dessus, ${one(aboveShare)} % de l’humanité` , card: `Au-dessus de ${HIGH} t de CO₂ par personne, ${above.length} pays seulement, ${one(aboveShare)} % de l’humanité.` },
    { do: "highlight", marks: above.map((m) => m.name) , card: `Ces ${above.length} pays sont de petits cercles : peu d’habitants.` },
    { do: "filter", marks: above.map((m) => m.name), note: `${above.length} pays` , card: `Le reste du monde s’entasse sous la ligne.` },
  ],
  unit: "Tonnes de CO₂ par personne, 2023 — la surface d’un cercle est la population du pays",
  format: (v) => one(v),
  title: [
    `Les ${above.length} pays au-dessus de ${HIGH} t de CO₂ par personne pèsent ${one(aboveShare)} % de l’humanité`,
    `${above.length} pays au-dessus de ${HIGH} t de CO₂ par personne, ${one(aboveShare)} % de l’humanité`,
  ],
  limits: [
    `Un cercle par pays, placé selon ses tonnes de CO₂ par habitant en 2023 ; sa surface est sa population. ${rows.length} pays.`,
    `Un cercle par pays ; sa surface est sa population.`,
  ],
  source: "Sources : Global Carbon Budget 2025 · population (2023), via Our World in Data",
  alt: (drawn) => `Essaim de ${drawn.length} cercles, un par pays, placés selon les tonnes de CO₂ par habitant en 2023 et dimensionnés par leur population. Au-delà de ${HIGH} tonnes, ${above.length} pays et ${one(aboveShare)} % de l’humanité.`,
  check() {
    if (!(aboveShare < 1)) throw new Error(`the countries over ${HIGH} t hold ${aboveShare.toFixed(2)} % of people, not under 1 %`);
    if (above.length !== 6) throw new Error(`${above.length} countries are over ${HIGH} t, not 6`);
  },
};

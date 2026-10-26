// beat.mjs for the worked example proof/static-beeswarm-co2-per-person — "the countries over 20 t
// of CO2 per person hold under 1 % of humanity". Every number on the plate is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, VALUE, SIZE] = [col("entity"), col("co2_t_per_person"), col("population")];

// The marks: one per unit, at its value, its circle's area its size.
const marks = table.rows.map((r) => ({ name: r[NAME], value: Number(r[VALUE]), size: Number(r[SIZE]) }));

const HIGH = 20;
const people = marks.reduce((s, m) => s + m.size, 0);
const marker = marks.reduce((s, m) => s + m.value * m.size, 0) / people; // population-weighted mean
const above = marks.filter((m) => m.value > HIGH);
const aboveShare = (above.reduce((s, m) => s + m.size, 0) / people) * 100;
const belowMean = (marks.filter((m) => m.value <= marker).reduce((s, m) => s + m.size, 0) / people) * 100;
const ranked = [...marks].sort((a, b) => a.value - b.value);
const median = ranked[Math.floor(ranked.length / 2)].value;
// The two callouts are DERIVED: the biggest circle and the farthest one out.
const biggest = marks.reduce((a, b) => (b.size > a.size ? b : a));
const farthest = marks.reduce((a, b) => (b.value > a.value ? b : a));

// toLocaleString("fr-FR") emits narrow spaces no typeface covers: replace them with plain spaces.
const plain = (s) => s.replace(/[   ]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const FRENCH = { India: "Inde" };

export default {
  eyebrow: "Climat · Monde",
  marks,
  // The rule the field is read against, and its label.
  marker,
  markerLabel: `moyenne mondiale ${one(marker)} t`,
  axisName: "tonnes de CO₂ par personne, 2023",
  // The marks named in cards above the field: the name, then one or two computed facts.
  callouts: [
    { name: biggest.name, label: FRENCH[biggest.name] ?? biggest.name, lines: [`${one(biggest.size / 1e9)} md d’habitants`, `${one(biggest.value)} t par personne`] },
    { name: farthest.name, label: FRENCH[farthest.name] ?? farthest.name, lines: [`${n0(farthest.size / 1e6)} millions d’habitants`, `${one(farthest.value)} t par personne`] },
  ],
  title: [
    `Les ${above.length} pays au-dessus de ${HIGH} t de CO₂ par personne pèsent ${one(aboveShare)} % de l’humanité`,
    `${above.length} pays au-dessus de ${HIGH} t de CO₂ par personne, ${one(aboveShare)} % de l’humanité`,
    `Le CO₂ par personne, pays par pays`,
    `Le CO₂ par personne`,
  ],
  limits: [
    `Un cercle par pays, placé selon ses tonnes de CO₂ par habitant en 2023 ; sa surface est sa population. ` +
      `Le plus gros cercle du champ est l’${FRENCH[biggest.name] ?? biggest.name}, ${one(biggest.value)} t — sous la médiane des ${marks.length} pays, ${one(median)} t. ` +
      `La moyenne mondiale, ${one(marker)} t, est déjà plus haute que ce qu’émettent ${Math.round(belowMean)} % des gens.`,
    `Un cercle par pays, placé selon ses tonnes de CO₂ par habitant en 2023 ; sa surface est sa population. ` +
      `La moyenne mondiale, ${one(marker)} t, est plus haute que ce qu’émettent ${Math.round(belowMean)} % des gens.`,
    `Un cercle par pays ; sa surface est sa population.`,
  ],
  reading: [
    `Lecture : la position est le taux, la surface est le nombre de gens. Le champ est dense à gauche parce que c’est là que vit le monde, et la queue de droite est faite de petits pays.`,
    `Lecture : la position est le taux, la surface est le nombre de gens.`,
  ],
  source: "Sources : Global Carbon Budget 2025 · population (2023), via Our World in Data",
  alt:
    `Essaim de ${marks.length} cercles, un par pays, placés de gauche à droite selon les tonnes de CO₂ par habitant en 2023 et dimensionnés par leur population. ` +
    `Le champ est dense sous ${one(marker)} tonnes, où vivent ${Math.round(belowMean)} % des gens ; la queue de droite, au-delà de ${HIGH} tonnes, ne compte que ${above.length} pays et ${one(aboveShare)} % de l’humanité.`,
  evidenceLevels: 4,
  check() {
    if (!(aboveShare < 1)) throw new Error(`the countries over ${HIGH} t hold ${aboveShare.toFixed(2)} % of people, not under 1 %`);
    if (!(belowMean > 60)) throw new Error(`the world mean sits above only ${belowMean.toFixed(1)} % of people, not most`);
    if (!(biggest.value < median)) throw new Error(`the largest circle (${biggest.name}, ${biggest.value}) is not below the median country (${median})`);
  },
};

// beat.mjs for the worked example proof/video-beeswarm-co2-per-person — « Les 6 pays au-dessus de 20 t de CO₂ par
// personne pèsent 0,6 % de l’humanité », told in time. Every number the video draws is COMPUTED from data.json; the
// tail beyond the threshold and its share of the whole are found by render-beat.mjs and checked here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, VALUE, SIZE] = [col("entity"), col("co2_t_per_person"), col("population")];

// The marks: one per country, at its tonnes per person, its circle's area its population.
const marks = table.rows.map((r) => ({ name: r[NAME], value: Number(r[VALUE]), size: Number(r[SIZE]) }));

// The claim: the countries above 20 t, and their share of the world's people.
const HIGH = 20;
const people = marks.reduce((s, m) => s + m.size, 0);
const above = marks.filter((m) => m.value > HIGH);
const share = (above.reduce((s, m) => s + m.size, 0) / people) * 100;

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  marks,
  threshold: HIGH,
  // The one disc the video opens on: every mark together.
  wholeName: "Monde",
  // The weighted mean's rule: `v` is the mean already printed in the story's number format.
  markerLabel: (v) => `moyenne ${v} t`,
  // The unit on the first tick, in forms, longest first: `t` is the tick already printed.
  unit: [(t) => `${t} t de CO₂ par personne`, (t) => `${t} t par personne`, (t) => `${t} t`],
  // The count while the marks land, and the tail's name under its bracket.
  counted: (n) => `${n} pays`,
  tailLabel: (n) => `${n} pays`,
  // The marks named inside their circles.
  callouts: [
    { name: "India", label: "Inde" },
    { name: "China", label: "Chine" },
  ],
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    "Les 6 pays au-dessus de 20 t de CO₂ par personne pèsent 0,6 % de l’humanité",
    "6 pays au-dessus de 20 t de CO₂ par personne : 0,6 % de l’humanité",
  ],
  source: ["Sources : Global Carbon Budget 2025 · population (2023), via Our World in Data", "Sources : Global Carbon Budget, Our World in Data"],
  evidenceLevels: 4,
  check() {
    if (above.length !== 6) throw new Error(`the title says 6 countries are above ${HIGH} t; ${above.length} are`);
    if (Math.round(share * 10) / 10 !== 0.6) throw new Error(`the title says 0,6 % of humanity; the six hold ${share.toFixed(2)} %`);
  },
};

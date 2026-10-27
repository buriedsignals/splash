// beat.mjs for the worked example proof/static-germany-electricity-bridge — "Germany generated 143 TWh less
// electricity in 2024 than in 2015" — written for the Stack VIDEO gesture kit (exactly three gestures: reveal, subject, conclusion): the staging is the `gestures` list.
// Every number on the plate is COMPUTED from data.json; only the title is typed (the takeaway).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const row = (year) => table.rows.find((r) => Number(r[col("Year")]) === year);
const sum = (r, names) => names.reduce((t, n) => t + Number(r[col(n)] ?? 0), 0);
const RENEWABLE = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
const FOSSIL = ["Gas", "Oil", "Coal"];
const ALL = [...RENEWABLE, "Nuclear", ...FOSSIL];
const [FIRST, LAST] = [2015, 2024];
const [first, last] = [row(FIRST), row(LAST)];

// Each step is (later minus earlier) of the same columns the levels add up, so opening + steps = closing.
const step = (name, cols) => ({ name, value: sum(last, cols) - sum(first, cols) });
const steps = [step("Renouvelables", RENEWABLE), step("Nucléaire", ["Nuclear"]), step("Fossile", FOSSIL)];
const opening = sum(first, ALL);
const closing = sum(last, ALL);
const fr = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const [renew, nuclear, fossil] = steps;

export default {
  eyebrow: "Énergie · Allemagne",
  opening: { name: `${FIRST}`, value: opening },
  steps,
  closing: { name: `${LAST}`, value: closing },
  unit: "TWh",
  // The three changes bracketed with their net, the nuclear exit named, and the fossil fall laid against the
  // renewable rise.
  gestures: [
    { do: "bracket", marks: steps.map((s) => s.name), note: `${fr(opening - closing)} TWh de moins au bout du compte` },
    { do: "name", mark: "Nucléaire", note: `Sortie du nucléaire : −${fr(-nuclear.value)}` },
    { do: "compare", marks: ["Fossile", "Renouvelables"], note: `−${fr(-fossil.value)} pour le fossile, +${fr(renew.value)} pour les renouvelables` },
  ],
  title: `L’Allemagne a produit 143 TWh d’électricité de moins en 2024 qu’en 2015`,
  source: "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data",
  check() {
    if (Math.round(opening - closing) !== 143) throw new Error(`generation fell by ${fr(opening - closing)} TWh, not 143`);
  },
};

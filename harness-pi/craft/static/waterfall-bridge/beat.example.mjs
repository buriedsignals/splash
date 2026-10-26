// beat.mjs for the worked example proof/static-germany-electricity-bridge — "Germany generated 143 TWh
// less electricity in 2024 than in 2015". Every number on the plate is COMPUTED from data.json; only
// the title is typed, because it is the journalist's takeaway copied as written.
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
const first = row(FIRST);
const last = row(LAST);

// The two levels and the steps between them: each step is (later minus earlier) of the same
// columns the totals add up, so opening + steps = closing exactly.
const opening = sum(first, ALL);
const closing = sum(last, ALL);
const steps = [
  { label: `${FIRST} total`, value: opening, kind: "total" },
  { label: "Renouvelables", value: sum(last, RENEWABLE) - sum(first, RENEWABLE) },
  { label: "Nucléaire", value: sum(last, ["Nuclear"]) - sum(first, ["Nuclear"]) },
  { label: "Fossile", value: sum(last, FOSSIL) - sum(first, FOSSIL) },
  { label: `${LAST} total`, value: closing, kind: "total" },
].map((s) => ({ ...s, kind: s.kind ?? (s.value >= 0 ? "increase" : "decrease") }));

const fr = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  eyebrow: "Énergie · Allemagne",
  subject: "Allemagne",
  steps,
  format: fr,
  unit: "TWh",
  title: `L’Allemagne a produit 143 TWh d’électricité de moins en 2024 qu’en 2015`,
  limits: "La sortie du nucléaire et le recul du fossile l’emportent ensemble sur la montée des renouvelables.",
  source: "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Diagramme en cascade de la production électrique allemande, ${FIRST} à ${LAST}, en TWh : ${fr(opening)} au départ, ${steps.slice(1, -1).map((s) => `${s.label} ${s.value > 0 ? "+" : "−"}${fr(Math.abs(s.value))}`).join(", ")}, ${fr(closing)} à l’arrivée.`,
  evidenceLevels: 3,
  check() {
    if (Math.round(opening - closing) !== 143) throw new Error(`generation fell by ${fr(opening - closing)} TWh, not 143`);
  },
};

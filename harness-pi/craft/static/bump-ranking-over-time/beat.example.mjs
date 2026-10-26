// beat.mjs for the worked example proof/static-bump-emitter-rank — "India rose from Nth to Mth
// among the world's CO2 emitters". Every number on the plate is COMPUTED from data.json; the ranks
// come from ranks.mjs, the same function the render draws with.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rankTracks } from "./ranks.mjs";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, YEAR, VALUE] = [col("Entity"), col("Code"), col("Year"), col("Annual CO₂ emissions")];
const FIRST = 1990;
const LAST = 2024;
const SLOTS = 10;

// The values: one per entity per year. Countries only — a three-letter code — so regions and the
// world total never take a rank.
const values = table.rows
  .filter((r) => /^[A-Z]{3}$/.test(String(r[CODE])) && r[VALUE] !== "" && r[VALUE] !== null)
  .map((r) => ({ entity: r[ENTITY], year: Number(r[YEAR]), value: Number(r[VALUE]) }))
  .filter((v) => Number.isFinite(v.value) && v.year >= FIRST && v.year <= LAST);

const SUBJECT = "India";
const { years, everIn, rankOf } = rankTracks(values, SLOTS);
const from = rankOf(SUBJECT, years[0]);
const to = rankOf(SUBJECT, years[years.length - 1]);

export default {
  eyebrow: "Climat · Monde",
  values,
  slots: SLOTS,
  subject: SUBJECT,
  title: [
    `L’Inde est passée du ${from}e au ${to}e rang mondial des émetteurs de CO2`,
    `L’Inde est passée du ${from}e au ${to}e rang mondial`,
    `L’Inde, du ${from}e au ${to}e rang`,
  ],
  limits: [
    `Rang mondial par émissions annuelles de CO2, ${FIRST}–${LAST}. Les ${everIn.length} pays qui ont occupé une place dans le top ${SLOTS} au moins une fois sont dessinés ; ceux qui en sont sortis s’arrêtent là où ils sont sortis. Le rang est une position, pas une taille — rien ici ne dit de combien.`,
    `Rang mondial par émissions annuelles de CO2, ${FIRST}–${LAST}. Les ${everIn.length} pays passés par le top ${SLOTS} sont dessinés ; ceux qui en sont sortis s’arrêtent là. Le rang est une position, pas une taille.`,
    `Rang mondial par émissions annuelles de CO2, ${FIRST}–${LAST}. Le rang est une position, pas une taille.`,
  ],
  source: "Source : Global Carbon Budget (2025), via Our World in Data · combustibles fossiles et industrie uniquement",
  alt: `Graphique de rangs : le rang mondial de ${everIn.length} pays par émissions annuelles de CO2 entre ${FIRST} et ${LAST}, l’Inde passant du ${from}e au ${to}e.`,
  evidenceLevels: 3,
  check() {
    if (!(from && to)) throw new Error(`India is outside the top ${SLOTS} in ${years[0]} or ${years[years.length - 1]}`);
    if (!(to < from)) throw new Error(`India did not rise: rank ${from} in ${years[0]}, ${to} in ${years[years.length - 1]}`);
  },
};

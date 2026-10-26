// beat.mjs for the worked example proof/video-diverging-bar-eu-per-capita — « La Croatie est le seul pays de l’UE à
// émettre plus de CO₂ par personne qu’en 1990 », told in time. Every number the video draws is COMPUTED from data.json;
// the changes, their order and the falls counted are worked out by render-beat.mjs from `rows`, and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("CO₂ emissions per capita")];
const FROM = 1990;
const TO = 2024;
const FRENCH = {
  Croatia: "Croatie", Cyprus: "Chypre", Portugal: "Portugal", Spain: "Espagne", Slovenia: "Slovénie", Austria: "Autriche", Italy: "Italie",
  Poland: "Pologne", Greece: "Grèce", Hungary: "Hongrie", France: "France", Ireland: "Irlande", Sweden: "Suède", Malta: "Malte",
  Latvia: "Lettonie", Bulgaria: "Bulgarie", Romania: "Roumanie", Netherlands: "Pays-Bas", Belgium: "Belgique", Lithuania: "Lituanie",
  Denmark: "Danemark", Finland: "Finlande", Slovakia: "Slovaquie", Germany: "Allemagne", Czechia: "Tchéquie", Estonia: "Estonie",
  Luxembourg: "Luxembourg",
};
const valueAt = (entity, year) => data.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === year)?.[VALUE];

// One row per member state with a reading in both years: its two levels.
const rows = [...new Set(data.rows.map((r) => r[ENTITY]))]
  .map((entity) => ({ entity, from: Number(valueAt(entity, FROM)), to: Number(valueAt(entity, TO)) }))
  .filter((r) => Number.isFinite(r.from) && Number.isFinite(r.to))
  .map((r) => ({ name: FRENCH[r.entity] ?? r.entity, from: r.from, to: r.to }));
const rose = rows.filter((r) => r.to > r.from);
const fell = rows.filter((r) => r.to < r.from);

export default {
  lang: "fr",
  eyebrow: "Climat\u00A0· Union européenne",
  rows,
  // The one row that rose: the camera closes onto it, the last shot rings it.
  subject: rose[0]?.name ?? "",
  fromLabel: String(FROM),
  unit: "tonnes de CO₂ par personne",
  // The counter while the levels go to their second reading: n falls landed; `of` (the field's falls) only when the frame
  // draws fewer rows than the field.
  count: (n, of) => (of === undefined ? `${n}\u00A0baisse${n > 1 ? "s" : ""} depuis ${FROM}` : `${n} des ${of}\u00A0baisses depuis ${FROM}`),
  // Said on the plate only when the frame draws fewer rows than the field: which ones, in forms, longest first.
  scope: (drawn, all) => [
    `${drawn} des ${all} États membres\u00A0: la hausse et les ${drawn - 1} plus fortes baisses`,
    `${drawn} des ${all} pays\u00A0: la hausse et les ${drawn - 1} plus fortes baisses`,
    `La hausse et les ${drawn - 1} plus fortes baisses, sur ${all}`,
    `La hausse et les ${drawn - 1} plus fortes baisses`,
    `La hausse et ${drawn - 1} fortes baisses`,
  ],
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    "La Croatie est le seul pays de l’UE à émettre plus de CO₂ par personne qu’en 1990",
    "La Croatie, seule hausse du CO₂ par personne dans l’UE depuis 1990",
  ],
  source: ["Source : Global Carbon Budget (2025), via Our World in Data\u00A0· combustibles fossiles et industrie", "Source : Global Carbon Budget (2025), via Our World in Data"],
  evidenceLevels: 2,
  check() {
    if (rows.length !== 27) throw new Error(`expected the 27 member states in both ${FROM} and ${TO}, got ${rows.length}`);
    if (rose.length !== 1) throw new Error(`the title says one country rose; ${rose.length} did (${rose.map((r) => r.name).join(", ")})`);
    if (rose[0].name !== "Croatie") throw new Error(`the one rise is ${rose[0].name}, not Croatia`);
    if (fell.length !== rows.length - 1) throw new Error(`${rows.length - 1 - fell.length} member states are exactly flat`);
  },
};

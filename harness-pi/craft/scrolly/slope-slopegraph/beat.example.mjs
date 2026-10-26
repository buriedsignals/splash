// beat.mjs for the worked example proof/scrolly-slope-europe-lowcarbon — "Les seize pays ont tous
// gagné du bas-carbone depuis 2000 — un seul a doublé la France", as a scrolly. Every number in a card
// is COMPUTED: the rails' ends, the crossings, the pair's gaps and the gains come from render-beat.mjs
// as `r` and are only WORDED here; the shares themselves are computed below from the generation columns.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = data.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const FROM = 2000;
const TO = 2024;
const RENEWABLE = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh"].map(col);
const NUCLEAR = col("nuclear_generation__twh");
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"].map(col);
const ALL = [...RENEWABLE, NUCLEAR, ...FOSSIL];
const [ENTITY, YEAR] = [col("entity"), col("year")];
const FRENCH = {
  Austria: ["Autriche", "l’Autriche", "en Autriche"], Belgium: ["Belgique", "la Belgique", "en Belgique"], Czechia: ["Tchéquie", "la Tchéquie", "en Tchéquie"], Denmark: ["Danemark", "le Danemark", "au Danemark"],
  Finland: ["Finlande", "la Finlande", "en Finlande"], France: ["France", "la France", "en France"], Germany: ["Allemagne", "l’Allemagne", "en Allemagne"], Greece: ["Grèce", "la Grèce", "en Grèce"],
  Ireland: ["Irlande", "l’Irlande", "en Irlande"], Italy: ["Italie", "l’Italie", "en Italie"], Netherlands: ["Pays-Bas", "les Pays-Bas", "aux Pays-Bas"], Poland: ["Pologne", "la Pologne", "en Pologne"],
  Portugal: ["Portugal", "le Portugal", "au Portugal"], Spain: ["Espagne", "l’Espagne", "en Espagne"], Sweden: ["Suède", "la Suède", "en Suède"], "United Kingdom": ["Royaume-Uni", "le Royaume-Uni", "au Royaume-Uni"],
};
const sum = (row, cols) => cols.reduce((s, i) => s + Number(row[i] || 0), 0);
/** The low-carbon share (renewables + nuclear) of all generation, in percent. */
const lowCarbon = (row) => ((sum(row, [...RENEWABLE, NUCLEAR]) / sum(row, ALL)) * 100);

const entities = [...new Set(data.rows.map((r) => r[ENTITY]))].sort();
const lines = entities.map((entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  const a = data.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === FROM);
  const b = data.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === TO);
  if (!a || !b) throw new Error(`${entity} is missing ${FROM} or ${TO}`);
  // weight: total generation in the right rail's year — card 6 keeps the pair and the largest producers.
  return { key: entity, label: FRENCH[entity][0], from: lowCarbon(a), to: lowCarbon(b), weight: sum(b, ALL), thread: entity === "Finland" || entity === "France" };
});
const NAME = Object.fromEntries(entities.map((e) => [FRENCH[e][0], FRENCH[e]]));

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signed = (v) => `${v >= 0 ? "+" : "−"}${one(Math.abs(v))}`;
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  lines,
  rails: { left: String(FROM), right: String(TO) },
  subject: "France",
  drawCount: 6,
  unit: "part bas-carbone de l’électricité, en %",
  format: one,
  formatDelta: signed,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    rail: (r) => `La part de l’électricité bas-carbone, renouvelables et nucléaire réunis, dans seize pays européens en ${FROM} : de ${one(r.lowest.from)} % ${NAME[r.lowest.label][2]} à ${one(r.highest.from)} % ${NAME[r.highest.label][2]}. La France est à ${one(r.held.from)} %, la Finlande à ${one(r.climber.from)} %.`,
    rise: () => `En ${TO}, chaque pays tire sa pente. Toutes montent : seize sur seize.`,
    cross: (r) => `Quand deux pentes se croisent, deux pays ont échangé leur rang : ${r.crossings} croisements.`,
    pair: (r) => `Un seul concerne la France. ${cap(NAME[r.climber.label][1])} était ${one(r.gapBefore)} points sous elle en ${FROM} ; en ${TO}, elle est ${one(r.gapAfter)} point devant. C’est le seul pays à l’avoir dépassée.`,
    gains: (r) => `Les plus fortes hausses : ${listOf(r.gains.map((g) => `${NAME[g.label][1]}, ${signed(g.delta)} points`))}.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    rail: (r) => `${FROM} : de ${one(r.lowest.from)} à ${one(r.highest.from)} %`,
    rise: (r) => `${r.count} pays sur ${r.count} en hausse`,
    cross: (r) => `${r.crossings} croisements`,
    pair: (r) => `${r.climber.label} : de ${signed(-r.gapBefore)} à ${signed(r.gapAfter)} point`,
    gains: (r) => `${r.gains[0].label} ${signed(r.gains[0].delta)} points`,
    reading: (r) => `${r.drawCount} lignes : la paire et les plus gros producteurs`,
  },
  title: [
    `Les seize pays ont tous gagné du bas-carbone depuis ${FROM} — un seul a doublé la France`,
    `Seize pays en hausse, un seul devant la France`,
    `Le bas-carbone en Europe, ${FROM} et ${TO}`,
  ],
  // The last card: how to read the plate, and which lines it keeps.
  limits: `Lecture : chaque ligne est un pays. Il n’y a pas d’axe : la pente donne le sens, les deux nombres donnent le niveau, l’écart est écrit à droite, en points. Le graphique garde la paire et les quatre plus gros producteurs.`,
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Graphique en pente : la part d’électricité bas-carbone de seize pays européens en ${FROM} et en ${TO}. Les seize lignes montent. ` +
    `La Finlande passe de ${one(r.climber.from)} à ${one(r.climber.to)} % et dépasse la France (${one(r.held.from)} à ${one(r.held.to)} %) ; c’est le seul pays à la dépasser.`,
  evidenceLevels: 3,
  check(r) {
    if (r.count !== 16) throw new Error(`the title says sixteen countries; lines holds ${r.count}`);
    if (r.risers !== r.count) throw new Error(`the title says all ${r.count} rose; ${r.count - r.risers} did not`);
    if (r.passedHeld.length !== 1 || r.passedHeld[0].key !== "Finland")
      throw new Error(`the title says one country passed France; ${r.passedHeld.map((l) => l.key).join(", ") || "none"} did`);
  },
};

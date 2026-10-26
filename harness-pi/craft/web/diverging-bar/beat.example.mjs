// beat.mjs for the worked example proof/web-diverging-bar-eu-per-capita — "Croatia is the only EU
// country emitting more CO2 per person than in 1990", as an interactive page whose zero the reader
// moves. Every number on the page is COMPUTED from data.json; the references, the counts and every
// bar's value under each reference are computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, YEAR, VALUE] = [col("Code"), col("Year"), col("CO₂ emissions per capita")];
const FROM = 1990;
const TO = 2024;
const NAMES = {
  AUT: "Autriche", BEL: "Belgique", BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark",
  EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie", IRL: "Irlande",
  ITA: "Italie", LVA: "Lettonie", LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", NLD: "Pays-Bas", POL: "Pologne",
  PRT: "Portugal", ROU: "Roumanie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne", SWE: "Suède",
};
const valueAt = (code, year) => table.rows.find((r) => r[CODE] === code && Number(r[YEAR]) === year)?.[VALUE];

// One row per member state: its two levels.
const rows = Object.keys(NAMES).map((code) => {
  const from = Number(valueAt(code, FROM));
  const to = Number(valueAt(code, TO));
  if (!Number.isFinite(from) || !Number.isFinite(to)) throw new Error(`${code} has no reading in ${FROM} or ${TO}`);
  return { name: NAMES[code], from, to };
});
const risers = rows.filter((r) => r.to > r.from);
const subject = risers[0];
const biggestFall = rows.reduce((a, b) => (b.to - b.from < a.to - a.from ? b : a));
// The axis's half-extent, as the render computes it (the largest distance under any reference).
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const [medFrom, medTo] = [median(rows.map((r) => r.from)), median(rows.map((r) => r.to))];
const span = Math.ceil(Math.max(...rows.flatMap((r) => [Math.abs(r.to - r.from), Math.abs(r.to - medFrom), Math.abs(r.to - medTo)])));

const fr = (v, d = 2) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v, d = 2) => `${v >= 0 ? "+" : "−"}${fr(Math.abs(v), d)}`;

export default {
  lang: "fr",
  eyebrow: "Climat · Union européenne",
  rows,
  subject: subject.name,
  subjectNote: `${subject.name} : seule au-dessus de son niveau de ${FROM}`,
  // A bar's own figure: two decimals under one tonne, one above; zero carries no sign (that row IS the reference).
  format: (v) => (v === 0 ? fr(0, 2) : Math.abs(v) < 1 ? signed(v, 2) : signed(v, 1)),
  datumLabel: "Mesurer chaque pays depuis",
  sideLabels: { left: "sous la référence", right: "au-dessus de la référence" },
  references: {
    own: {
      label: `son niveau de ${FROM}`,
      announce: (o) => `Mesurer chaque pays depuis son niveau de ${FROM} : un seul des Vingt-Sept est au-dessus du sien, la ${o.subject.name}, ${signed(o.subject.value)} tonne par personne`,
      note: (o) =>
        `Zéro = le niveau de chaque pays en ${FROM}. Un seul des Vingt-Sept est au-dessus du sien : la ${o.subject.name}, ${signed(o.subject.value)} t. ` +
        `Les ${o.below.length} autres ont baissé de ${fr(Math.abs(o.meanBelow))} t en moyenne, le ${o.bottom.name} de ${fr(Math.abs(o.bottom.value))} t.`,
    },
    fromMedian: {
      label: `la médiane de ${FROM}`,
      announce: (o) => `Mesurer chaque pays depuis la médiane de ${FROM}, ${fr(o.reference)} tonnes par personne : ${o.above.length} des Vingt-Sept est encore au-dessus, ${o.top.name}`,
      note: (o) => `Zéro = ${fr(o.reference)} t, le niveau du membre médian en ${FROM}. Un seul est encore au-dessus, et ce n'est plus la ${o.subject.name} : ${o.top.name}, ${signed(o.top.value)} t.`,
    },
    toMedian: {
      label: "la médiane d'aujourd'hui",
      announce: (o) => `Mesurer chaque pays depuis la médiane d'aujourd'hui, ${fr(o.reference)} tonnes par personne : ${o.above.length} pays au-dessus, ${o.below.length} en dessous`,
      note: (o) =>
        `Zéro = ${fr(o.reference)} t, le niveau du membre médian aujourd'hui. ${o.above.length} pays au-dessus, ${o.below.length} en dessous, ` +
        `${o.on.map((r) => r.name).join(", ")} sur la ligne. La ${o.subject.name} passe à gauche ; le ${o.top.name}, plus forte baisse de l'Union, est le plus haut de tous. ` +
        `Les Vingt-Sept ne s'écartent que de ${fr(o.spread)} t d'un bout à l'autre, contre ${fr(Math.abs(biggestFall.to - biggestFall.from))} t parcourus par le ${biggestFall.name} seul depuis ${FROM}.`,
    },
  },
  // What a row answers in every state: its two levels and its distance from all three references.
  detail: (r) =>
    `${r.name} · ${fr(r.from)} t par personne en ${FROM}, ${fr(r.to)} en ${TO} · écart depuis ${FROM} : ${signed(r.change)} t` +
    (r.change > 0 ? " (seule hausse)" : "") +
    ` · à la médiane de ${FROM} : ${signed(r.vsFromMedian)} t · à celle de ${TO} : ${signed(r.vsToMedian)} t`,
  title: "La Croatie est le seul pays de l'Union à émettre plus de CO₂ par personne qu'en 1990",
  limits:
    `Écart de chaque État membre à la référence choisie ci-dessous, en tonnes de CO₂ par personne : à gauche en dessous, à droite au-dessus. ` +
    `Ni le classement (du plus gros émetteur de ${TO} au plus petit) ni l'axe, ${span} t de part et d'autre, ne bougent d'une référence à l'autre.`,
  reading:
    "Lecture : changez la référence ci-dessus — le zéro se déplace, et avec lui qui est « au-dessus ». " +
    "Survolez ou tabulez une ligne pour lire ses deux niveaux et son écart aux trois références.",
  source: `Source : Global Carbon Budget (2025) · population, avec traitement Our World in Data · ${FROM} et ${TO}`,
  alt: (s) =>
    `Vingt-sept barres horizontales de part et d'autre d'une ligne zéro, une par État membre, classées du plus gros émetteur de ${TO} en haut au plus petit en bas. ` +
    `La référence dont part le zéro est au choix du lecteur : mesurés depuis leur propre niveau de ${FROM}, ${s.own.above.length} seul pays part vers la droite, ` +
    `la ${s.own.subject.name}, ${signed(s.own.subject.value)} tonne par personne, et les ${s.own.below.length} autres vers la gauche jusqu'au ${s.own.bottom.name} à ` +
    `${signed(s.own.bottom.value)} tonnes ; mesurés depuis le pays médian d'aujourd'hui, ${s.toMedian.above.length} partent à droite et ${s.toMedian.below.length} à gauche, ` +
    `et la ${s.own.subject.name} change de côté.`,
  evidenceLevels: 2,
  check() {
    if (rows.length !== 27) throw new Error(`${rows.length} member states, not the Twenty-Seven`);
    if (risers.length !== 1) throw new Error(`${risers.length} members emit more than in ${FROM}, not exactly one`);
    if (subject.name !== "Croatie") throw new Error(`the one riser is ${subject.name}, not Croatia`);
  },
};

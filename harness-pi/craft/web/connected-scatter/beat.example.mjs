// beat.mjs for the worked example proof/web-connected-scatter-lowcarbon — "all sixteen cleaned up at
// home, five weigh less in Europe", as an interactive page. Every number on the page is COMPUTED from
// data.json; the legs, the counts and the de-collision are computed by render-beat.mjs and only
// WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const [CODE, YEAR] = [col("code"), col("year")];
const FROM = 2000;
const TO = 2024;
const NAMES = {
  AUT: "Autriche", BEL: "Belgique", CZE: "Tchéquie", DNK: "Danemark", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  IRL: "Irlande", ITA: "Italie", NLD: "Pays-Bas", POL: "Pologne", PRT: "Portugal", ESP: "Espagne", SWE: "Suède", GBR: "Royaume-Uni",
};

const sum = (r, cols) => cols.reduce((s, c) => s + Number(r[col(c)]), 0);
const rowOf = (code, year) => {
  const r = table.rows.find((row) => row[CODE] === code && Number(row[YEAR]) === year);
  if (!r) throw new Error(`no ${year} row for ${code}`);
  const low = sum(r, LOW);
  return { low, all: low + sum(r, FOSSIL) };
};
const codes = [...new Set(table.rows.map((r) => r[CODE]))];
const total = (year) => codes.reduce((s, c) => s + rowOf(c, year).low, 0);
const [total0, total1] = [total(FROM), total(TO)];
const euGrowth = (total1 / total0 - 1) * 100;

// x: low-carbon share of its own electricity; y: its share of the group's low-carbon output.
// whatIf: the later low-carbon output weighed against the EARLIER group total — "if the group had
// stood still" (a derived reading of the same file, not a third datum).
const entities = codes.map((code) => {
  const a = rowOf(code, FROM);
  const b = rowOf(code, TO);
  return {
    name: code,
    label: NAMES[code] ?? code,
    from: { x: (a.low / a.all) * 100, y: (a.low / total0) * 100 },
    to: { x: (b.low / b.all) * 100, y: (b.low / total1) * 100 },
    whatIf: { x: (b.low / b.all) * 100, y: (b.low / total0) * 100 },
    low0: a.low,
    low1: b.low,
    growth: (b.low / a.low - 1) * 100,
  };
});
const subject = entities.find((e) => e.name === "FRA");
const lost = entities.filter((e) => e.to.y < e.from.y);

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v, d = 1) => `${v >= 0 ? "+" : "−"}${fr(Math.abs(v), d)}`;
const WORDS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const word = (n) => WORDS[n] ?? String(n);

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  entities,
  subject: subject.name,
  from: FROM,
  to: TO,
  xName: "Part bas-carbone de son propre mix (%)",
  yName: `Part du bas-carbone des ${word(entities.length)} (%)`,
  xTicks: [0, 20, 40, 60, 80, 100],
  yTicks: [0, 10, 20, 30, 40],
  // The ceiling holds the highest head any option aims at, not only the default plate's.
  yTop: 45,
  tickLabel: (t) => `${t} %`,
  // The control: its legend, the untouched option, and each reading's words.
  aimLabel: "La flèche montre",
  tripLabel: "Le trajet",
  options: {
    across: {
      label: "Chez eux",
      announce: "Chez eux seulement",
      note: (s) =>
        `La jambe horizontale du déplacement, seule : les ${word(s.count)} ont tous nettoyé leur propre électricité, de ` +
        `${signed(s.smallestDx.dx)} points en ${s.smallestDx.label} à ${signed(s.biggestDx.dx)} au ${s.biggestDx.label}, médiane ${signed(s.medianDx)}.` +
        (s.left.length === 0 ? " Aucune flèche ne pointe à gauche." : ""),
    },
    up: {
      label: "En Europe",
      announce: "En Europe seulement",
      note: (s) =>
        `La jambe verticale, seule : ${s.up.length} montent, ${s.down.length} descendent — ` +
        `${s.down.map((r) => `${r.label} ${signed(r.dy, 2)}`).join(", ")} point de part. ` +
        `Les ${word(s.down.length)} ont pourtant tous produit plus de bas-carbone qu'en ${FROM}.`,
    },
    whatIf: {
      label: "Total figé",
      announce: `Total figé : à total européen de ${FROM}`,
      note: (s) =>
        `Le bas-carbone des ${word(s.count)} est passé de ${fr(total0, 0)} à ${fr(total1, 0)} TWh, ${signed(euGrowth)} %. ` +
        `Rapportée à ce total de ${FROM}, plus personne ne recule : ${s.biggestWhatIfDy.label} ${signed(s.biggestWhatIfDy.whatIfDy, 2)} points, ` +
        `${s.smallestWhatIfDy.label} ${signed(s.smallestWhatIfDy.whatIfDy, 2)}, et la ${s.subject.label} ${signed(s.subject.whatIfDy, 2)} au lieu de ${signed(s.subject.dy, 2)}. ` +
        `Le seuil est net : croître de plus de ${signed(euGrowth)} % fait gagner du poids, moins en fait perdre — les ${word(s.down.length)} sont entre ` +
        `${signed(Math.min(...s.down.map((r) => r.growth)), 0)} % et ${signed(Math.max(...s.down.map((r) => r.growth)), 0)} %.`,
    },
  },
  // The figure printed at the subject's head under each state; it starts with the subject's label.
  figure: (state, r) =>
    ({
      trip: `${r.label} : ${signed(r.dx)} chez elle, ${signed(r.dy)} en Europe`,
      across: `${r.label} : ${signed(r.dx)} points chez elle`,
      up: `${r.label} : ${signed(r.dy)} points de poids européen`,
      whatIf: `${r.label} : ${signed(r.whatIfDy)} points, à total figé`,
    })[state],
  // What one arrow answers when it is hovered, tapped or tabbed to.
  detail: (r) =>
    `${r.label} · ${FROM} : ${fr(r.from.x)} % de son mix, ${fr(r.from.y, 2)} % du bas-carbone des ${word(entities.length)}, ${fr(r.low0)} TWh · ` +
    `${TO} : ${fr(r.to.x)} %, ${fr(r.to.y, 2)} %, ${fr(r.low1)} TWh · production ${signed(r.growth, 0)} % contre ${signed(euGrowth)} % pour les ${word(entities.length)} · ` +
    `à total européen figé elle pèserait ${fr(r.whatIf.y, 2)} %`,
  title: "Tous plus propres chez eux, cinq plus légers en Europe",
  limits:
    `Part bas-carbone du mix national contre part du bas-carbone des ${word(entities.length)}, ${FROM} et ${TO}. ` +
    `L'anneau est ${FROM}, la pointe ${TO} : le fichier ne tient que ces deux dates.`,
  reading: "Lecture : survolez ou tabulez un pays pour ses deux dates et ses TWh.",
  source: "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data",
  alt: (s) =>
    `${word(s.count)[0].toUpperCase()}${word(s.count).slice(1)} flèches dans un plan. Horizontalement, la part bas-carbone du mix national ; ` +
    `verticalement, la part du bas-carbone des ${word(s.count)} pays. Chaque flèche part d'un anneau, la position du pays en ${FROM}, et pointe vers sa position en ${TO}. ` +
    `Toutes vont vers la droite : les ${word(s.count)} ont tous nettoyé leur électricité. ${word(s.down.length)[0].toUpperCase()}${word(s.down.length).slice(1)} pointent vers le bas — ` +
    `${s.down.map((r) => r.label).join(", ")} — parce qu'elles pèsent moins dans le total européen qu'en ${FROM}. ` +
    `La flèche de la ${s.subject.label}, en accent${s.down[0].isSubject ? ", est la plus longue vers le bas" : ""} : ${signed(s.subject.dy)} points. Un bouton choisit ce que la flèche montre : le déplacement entier, ` +
    `sa jambe horizontale seule, sa jambe verticale seule, ou la position de ${TO} rapportée au total européen de ${FROM} — état dans lequel aucune ne descend.`,
  evidenceLevels: 2,
  check() {
    const dirtier = entities.filter((e) => e.to.x < e.from.x);
    if (dirtier.length) throw new Error(`${dirtier.map((e) => e.name).join(", ")} got dirtier at home — the title says all of them cleaned up`);
    if (lost.length !== 5) throw new Error(`${lost.length} countries lost European weight, not five`);
    if (!(subject.to.x > subject.from.x && subject.to.y < subject.from.y)) throw new Error("France did not move right and down");
    const shrank = entities.filter((e) => e.low1 < e.low0);
    if (shrank.length) throw new Error(`${shrank.map((e) => e.name).join(", ")} produced less low-carbon than in ${FROM} — the whatIf note would be false`);
    if (entities.some((e) => e.whatIf.y < e.from.y)) throw new Error("a country still falls against the earlier total — the whatIf note says nobody does");
  },
};

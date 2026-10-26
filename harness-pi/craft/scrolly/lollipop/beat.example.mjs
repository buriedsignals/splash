// beat.mjs for the worked example proof/scrolly-lollipop-co2-per-person — "China tripled its CO₂ per
// person since 2000; the average American now emits only 1.7 times more", as a scrolly. The six
// (a computed rule) and their share of the world are computed from data.json here; the changes, the
// ratios and the growth come from render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [CODE, BEFORE, AFTER, PEOPLE] = [col("code"), col("t_per_person_2000"), col("t_per_person_2023"), col("population_2023")];
const FROM = 2000;
const TO = 2023;
const HOW_MANY = 6;
const NAMES = {
  CHN: ["Chine", "la Chine"], USA: ["États-Unis", "les États-Unis"], IND: ["Inde", "l’Inde"], RUS: ["Russie", "la Russie"], JPN: ["Japon", "le Japon"],
  IRN: ["Iran", "l’Iran"], IDN: ["Indonésie", "l’Indonésie"], SAU: ["Arabie saoudite", "l’Arabie saoudite"], DEU: ["Allemagne", "l’Allemagne"],
  KOR: ["Corée du Sud", "la Corée du Sud"], BRA: ["Brésil", "le Brésil"],
};

// Every country's total (per person × population); the six largest are drawn, and their share of the
// sum over every country is stated on the last card.
const all = data.rows.map((r) => ({ code: r[CODE], before: Number(r[BEFORE]), after: Number(r[AFTER]), people: Number(r[PEOPLE]) }));
for (const c of all) if (!c.code || !Number.isFinite(c.before) || !Number.isFinite(c.after) || !(c.people > 0)) throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);
const withTotals = all.map((c) => ({ ...c, total: (c.after * c.people) / 1e9 }));
const worldTotal = withTotals.reduce((s, c) => s + c.total, 0);
const chosen = [...withTotals].sort((a, b) => b.total - a.total).slice(0, HOW_MANY);
for (const c of chosen) if (!NAMES[c.code]) throw new Error(`${c.code} has no French name filed in this beat`);
const share = (chosen.reduce((s, c) => s + c.total, 0) / worldTotal) * 100;
const pairs = chosen.map((c) => ({ key: c.code, name: NAMES[c.code][0], before: c.before, after: c.after }));

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const the = (p) => NAMES[p.key][1];
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  pairs,
  subject: "CHN",
  other: "USA",
  from: FROM,
  to: TO,
  share,
  unit: "tonnes de CO₂ par personne",
  rule: (r) => `Sélection : les ${r.count} pays au plus fort total ${TO}, par personne × population.`,
  format: one,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    before: (r) => `Les six pays qui émettent le plus de CO₂. En ${FROM}, chaque tige part de zéro jusqu’aux tonnes émises par habitant : ${one(r.other.before)} t aux ${r.other.name}, ${one(r.subject.before)} t en ${r.subject.name}.`,
    after: (r) => `En ${TO}, une deuxième tige, pleine, pousse à côté de chacune. La ${r.subject.name} monte à ${one(r.subject.after)} t, les ${r.other.name} descendent à ${one(r.other.after)} t.`,
    pair: (r) => `Mettons ${the(r.subject)} et ${the(r.other)} côte à côte.`,
    ratio: (r) => `En ${FROM}, l’Américain moyen émettait ${one(r.ratioBefore)} fois plus que le Chinois moyen. En ${TO}, ${one(r.ratioAfter)} fois plus.`,
    change: (r) => `Sur les six, ${listOf(r.rose.map(the))} émettent plus par personne qu’en ${FROM} ; ${listOf(r.fell.map(the))}, moins.`,
  },
  // The header notes: card 4's ratios, card 5's count of directions, card 6's share.
  notes: {
    ratio: (r) => `${FROM} : × ${one(r.ratioBefore)} · ${TO} : × ${one(r.ratioAfter)}`,
    change: (r) => `${r.rose.length} en hausse, ${r.fell.length} en baisse`,
    share: (r) => `${one(r.share)} % du CO₂ mondial`,
  },
  beforeRatio: (r) => `× ${one(r.ratioBefore)}`,
  afterRatio: (r) => `× ${one(r.ratioAfter)}`,
  title: [
    "La Chine a triplé son CO₂ par personne depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus",
    "Le rapport entre l’Américain et le Chinois moyens est passé de 7,5 à 1,7",
    "Le CO₂ par personne des six plus gros émetteurs",
  ],
  // The last card: how to read the stems, and what the six weigh.
  limits: `Lecture : chaque tige part de zéro, donc la hauteur est le niveau et l’écart entre les deux têtes est le changement. Ces six pays émettent ${one(share)} % du CO₂ mondial.`,
  source: `Sources : Global Carbon Budget 2025 · population (${TO}), via Our World in Data`,
  alt: (r) =>
    `Six paires de sucettes, une par pays, mesurant les tonnes de CO₂ par personne en ${FROM} (teinte claire) et en ${TO} (plein), chaque tige partant de zéro. ` +
    `La Chine monte de ${one(r.subject.before)} à ${one(r.subject.after)} tonnes, les États-Unis descendent de ${one(r.other.before)} à ${one(r.other.after)} : le rapport passe de ${one(r.ratioBefore)} à ${one(r.ratioAfter)}.`,
  evidenceLevels: 4,
  check(r) {
    if (!(r.grew > 2.5)) throw new Error(`the headline says China roughly tripled; it multiplied by ${r.grew.toFixed(2)}`);
    if (Math.round(r.ratioAfter * 10) !== 17) throw new Error(`the headline says the American average is 1.7 times the Chinese; it is ${r.ratioAfter.toFixed(2)}`);
    if (!(r.ratioBefore > 5)) throw new Error(`card 4 says the ratio was above five in ${FROM}; it was ${r.ratioBefore.toFixed(1)}`);
    if (!(r.share > 55)) throw new Error(`a card says the six carry most of the world's emissions; they carry ${r.share.toFixed(1)} %`);
    if (!(r.other.after < r.other.before)) throw new Error("a card says the American average fell");
  },
};

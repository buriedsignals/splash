// beat.mjs for the worked example proof/scrolly-donut-world-co2-share — "En 2000 les États-Unis
// émettaient un quart du CO₂ mondial et la Chine un septième ; en 2023, c’est l’inverse", as a scrolly.
// Every number in a card is COMPUTED: the shares, the whole's growth and the part the growth hides
// come from render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

const FROM = 2000;
const TO = 2023;
const NAMES = {
  CHN: ["Chine", "la Chine"], USA: ["États-Unis", "les États-Unis"], IND: ["Inde", "l’Inde"], RUS: ["Russie", "la Russie"],
  JPN: ["Japon", "le Japon"], IRN: ["Iran", "l’Iran"], IDN: ["Indonésie", "l’Indonésie"], SAU: ["Arabie saoudite", "l’Arabie saoudite"],
  DEU: ["Allemagne", "l’Allemagne"], KOR: ["Corée du Sud", "la Corée du Sud"],
};

// Every country's tonnes at both dates, in gigatonnes: per-person emissions × population.
const all = data.rows.map((r) => ({
  code: r[at("code")],
  before: (Number(r[at("t_per_person_2000")]) * Number(r[at("population_2000")])) / 1e9,
  after: (Number(r[at("t_per_person_2023")]) * Number(r[at("population_2023")])) / 1e9,
}));
// The whole is every country, drawn or not; the rings are the six largest of 2023.
const wholeBefore = all.reduce((s, c) => s + c.before, 0);
const wholeAfter = all.reduce((s, c) => s + c.after, 0);
const rings = [...all]
  .sort((a, b) => b.after - a.after)
  .slice(0, 6)
  .map((c) => {
    if (!NAMES[c.code]) throw new Error(`${c.code} has no French name filed in this beat`);
    return { key: c.code, name: NAMES[c.code][0], before: c.before, after: c.after };
  });

const the = Object.fromEntries(Object.values(NAMES));
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (v) => `${one(v)} %`;
const gt = (v) => `${one(v)} Gt`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  rings,
  wholeBefore,
  wholeAfter,
  subject: "CHN",
  counterpart: "USA",
  trap: "RUS",
  from: String(FROM),
  to: String(TO),
  amountUnit: "Gt",
  // {year} is replaced by the state the ring shows.
  unit: "part du CO₂ mondial en {year}, un tour complet = 100 %",
  cards: {
    whole: (r) => `En ${r.from}, le monde émet ${gt(r.wholeBefore)} de CO₂. Un tour d’anneau, c’est tout ce CO₂ ; les six plus gros émetteurs d’aujourd’hui y ont chacun leur arc.`,
    pair: (r) => `${cap(the[r.counterpart.name])} en émettent ${pct(r.counterpart.shareBefore)}, un quart. ${cap(the[r.subject.name])}, ${pct(r.subject.shareBefore)}, un septième.`,
    turn: (r) => `En ${r.to}, les parts s’inversent : ${the[r.subject.name]} monte à ${pct(r.subject.shareAfter)}, ${the[r.counterpart.name]} tombent à ${pct(r.counterpart.shareAfter)}.`,
    grow: (r) => `Mais l’anneau n’a plus la même taille : le monde est passé de ${gt(r.wholeBefore)} à ${gt(r.wholeAfter)}, +${Math.round(r.growth)} %. Une part qui rétrécit n’est pas un chiffre qui baisse.`,
    trap: (r) => `${cap(the[r.trap.name])} en est l’exemple : sa part tombe de ${pct(r.trap.shareBefore)} à ${pct(r.trap.shareAfter)}, ses émissions montent de ${gt(r.trap.before)} à ${gt(r.trap.after)}. Le monde a grossi autour d’elle.`,
  },
  // The header's notes: the whole while the ring grows, the trap while it is alone, the split's key.
  notes: {
    grow: (r) => `Monde : ${gt(r.wholeBefore)} en ${r.from}, ${gt(r.wholeAfter)} en ${r.to}`,
    trap: (r) => `${r.trap.name} : part ${pct(r.trap.shareBefore)} puis ${pct(r.trap.shareAfter)}, ${gt(r.trap.before)} puis ${gt(r.trap.after)}`,
    split: (r) => `extérieur ${r.from} · intérieur ${r.to}`,
  },
  title: [
    "En 2000 les États-Unis émettaient un quart du CO₂ mondial et la Chine un septième ; en 2023, c’est l’inverse",
    "La Chine et les États-Unis ont échangé leurs parts du CO₂ mondial",
    "Les parts du CO₂ mondial, 2000 et 2023",
  ],
  // The last card: how the six rings read.
  limits: `Lecture : un anneau par pays, où un tour complet vaut 100 % du monde sur les six. L’arc extérieur est sa part en ${FROM}, l’arc intérieur sa part en ${TO}, et les tonnes sont écrites dessous.`,
  source: "Sources : Global Carbon Budget 2025 · population, via Our World in Data",
  alt: (r) =>
    `Un anneau pour le CO₂ mondial, découpé entre les six plus gros émetteurs. La Chine passe de ${one(r.subject.shareBefore)} à ${one(r.subject.shareAfter)} % ` +
    `et les États-Unis de ${one(r.counterpart.shareBefore)} à ${one(r.counterpart.shareAfter)} % : les deux ont échangé leurs places, pendant que le total mondial grossissait de ` +
    `${Math.round(r.growth)} %. ${cap(the[r.trap.name])} voit sa part baisser et ses tonnes monter. L’anneau se sépare enfin en six anneaux, un par pays.`,
  evidenceLevels: 4,
  check(r) {
    if (!(r.counterpart.shareBefore > r.subject.shareBefore && r.subject.shareAfter > r.counterpart.shareAfter)) throw new Error("the title says the two swapped; they did not");
    if (Math.abs(r.counterpart.shareBefore - 25) > 2.5) throw new Error(`the title calls the United States' ${FROM} share a quarter; it is ${r.counterpart.shareBefore.toFixed(1)} %`);
    if (Math.abs(r.subject.shareBefore - 100 / 7) > 1.5) throw new Error(`the title calls China's ${FROM} share a seventh; it is ${r.subject.shareBefore.toFixed(1)} %`);
    if (!(r.growth > 30)) throw new Error(`card 4 says the whole grew by about half; it grew ${r.growth.toFixed(0)} %`);
  },
};

// beat.mjs for the worked example proof/web-donut-world-co2-share — "En 2000, États-Unis 24,4 % du
// CO₂ mondial et Chine 14,7 % ; en 2023, l'inverse", as an interactive page. Every wedge, rank and
// band is COMPUTED by render-beat.mjs and only WORDED here; every other number is computed from
// data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran",
  IDN: "Indonésie", SAU: "Arabie saoudite", DEU: "Allemagne", KOR: "Corée du Sud", BRA: "Brésil",
};

// Every country of the file, as absolute tonnes (Gt) at both states: per person × population.
const parts = data.rows.map((r) => ({
  key: r[col("code")],
  name: NAMES[r[col("code")]] ?? r[col("entity")],
  before: (Number(r[col("t_per_person_2000")]) * Number(r[col("population_2000")])) / 1e9,
  after: (Number(r[col("t_per_person_2023")]) * Number(r[col("population_2023")])) / 1e9,
}));
const wholeBefore = parts.reduce((s, p) => s + p.before, 0);
const wholeAfter = parts.reduce((s, p) => s + p.after, 0);
const FROM = 2000;
const TO = 2023;
const growth = (wholeAfter / wholeBefore - 1) * 100;

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
// ASCII ordinals on purpose: no face here carries the superscript modifiers. "1er", not "1ᵉʳ".
const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  parts,
  drawCount: 6,
  wholeBefore,
  wholeAfter,
  subject: "CHN",
  counterpart: "USA",
  from: String(FROM),
  to: String(TO),
  restName: "tous les autres",
  restOption: "Tous les autres",
  unit: "% du CO₂ mondial",
  formatShare: (v) => `${fr(v)} %`,
  // The hole: the two wholes and their change.
  centreNote: [`${FROM} : ${fr(wholeBefore)} Gt`, `${TO} : ${fr(wholeAfter)} Gt`, `+${fr(growth, 0)} %`],
  // What one wedge answers when hovered, tapped or tabbed to.
  detail: (w) =>
    `${w.name} · ${w.label} : ${fr(w.share)} % du CO₂ mondial (${fr(w.value)} Gt sur ${fr(w.whole)}) · en ${w.otherLabel} : ` +
    `${fr(w.otherShare)} % (${fr(w.otherValue)} Gt)`,
  // The control: follow one part from one ring to the other.
  levelLabel: "Suivre un pays",
  noneLabel: "Les deux anneaux",
  announce: (o) => `${o.name} — ${fr(o.shareBefore)} % du CO₂ mondial en ${o.from}, ${fr(o.shareAfter)} % en ${o.to}`,
  note: (o) => {
    const movement = o.factor >= 1 ? `sa part est multipliée par ${fr(o.factor, o.factor >= 10 ? 0 : 1)}` : `sa part tombe à ${fr(o.factor * 100, 0)} % de ce qu'elle était`;
    const crossed = o.crossed ? ` — et sa part baisse pendant que ses tonnes MONTENT, parce que le tout a grandi de moitié` : "";
    const rank = o.rankBefore === o.rankAfter ? `reste au ${ordinal(o.rankAfter)} rang` : `passe du ${ordinal(o.rankBefore)} au ${ordinal(o.rankAfter)} rang`;
    const hides = o.isRest ? ` Ce sont ${o.restCount} pays ; le plus gros d'entre eux, ${o.biggestRest.name}, en pèse ${fr(o.biggestRest.shareAfter)} % du monde à lui seul en ${o.to}.` : "";
    return (
      `${o.name} : ${fr(o.shareBefore)} % du CO₂ mondial en ${o.from} (${fr(o.valueBefore)} Gt sur ${fr(o.wholeBefore)}) et ${fr(o.shareAfter)} % en ` +
      `${o.to} (${fr(o.valueAfter)} Gt sur ${fr(o.wholeAfter)}) — ${movement}${crossed}, et elle ${rank} des ${["", "", "deux", "trois", "quatre", "cinq", "six", "sept"][o.of]} parts de l'anneau.${hides}`
    );
  },
  title: "En 2000, États-Unis 24,4 % du CO₂ mondial et Chine 14,7 % ; en 2023, l'inverse",
  limits:
    `Deux anneaux concentriques : le CO₂ mondial en ${FROM} au centre, en ${TO} à l'extérieur. Deux camemberts côte à côte laisseraient ` +
    `croire que les deux touts sont égaux ; ici les totaux sont ÉCRITS au milieu.`,
  reading:
    // The worked example also said "Quatre tons pour sept parts": false where the ground leaves room for three, and the
    // two last sentences pushed the source line off a 375 × 812 screen (the proof's own page fails that check).
    `Lecture : choisissez un pays pour le suivre d'un anneau à l'autre ; survolez, touchez ou tabulez une part pour les Gt derrière elle.`,
  source: `Source : Global Carbon Budget 2025 · populations ${FROM} et ${TO}, via Our World in Data`,
  alt: ({ parts: drawn }) => {
    const chn = drawn.find((p) => p.key === "CHN");
    const usa = drawn.find((p) => p.key === "USA");
    return (
      `Deux anneaux concentriques. Sur l'anneau intérieur (${FROM}), la part des États-Unis, ${fr(usa.shareBefore)} %, est la plus large des six ` +
      `pays nommés ; celle de la Chine fait ${fr(chn.shareBefore)} %. Sur l'anneau extérieur (${TO}), c'est l'inverse : la Chine occupe ` +
      `${fr(chn.shareAfter)} % et les États-Unis ${fr(usa.shareAfter)} %. Au centre, les deux totaux mondiaux : ${fr(wholeBefore)} puis ${fr(wholeAfter)} Gt.`
    );
  },
  evidenceLevels: 3,
  check({ parts: drawn, wholeGrowth }) {
    const chn = drawn.find((p) => p.key === "CHN");
    const usa = drawn.find((p) => p.key === "USA");
    if (!(usa.shareBefore > chn.shareBefore && chn.shareAfter > usa.shareAfter)) throw new Error("the title says the two swapped; they did not");
    if (fr(usa.shareBefore) !== "24,4" || fr(chn.shareBefore) !== "14,7") throw new Error(`in ${FROM} the shares are ${fr(usa.shareBefore)} and ${fr(chn.shareBefore)} %, not 24,4 and 14,7`);
    if (!(wholeGrowth > 33)) throw new Error(`the whole grew ${fr(wholeGrowth)} %, not by a third or more`);
  },
};

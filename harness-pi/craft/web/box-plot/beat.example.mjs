// beat.mjs for the worked example proof/web-boxplot-france-co2-decades — "Le CO₂ par personne des
// Français a culminé dans les années 1970 et baisse à chaque décennie depuis", as an interactive page.
// Every number on the page is COMPUTED from data.json; the quartiles, the fences and each band's
// comparison with the others are computed by render-beat.mjs and only WORDED here. The sentences that
// need a median or an outlier compute it with the same quantile the render uses.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("CO₂ emissions per capita")];

// One reading per year from 1950, for the one entity drawn, grouped by decade.
const rows = table.rows
  .filter((r) => r[ENTITY] === "France" && Number(r[YEAR]) >= 1950)
  .map((r) => ({ year: Number(r[YEAR]), value: Number(r[VALUE]) }));
const decades = [...new Set(rows.map((r) => Math.floor(r.year / 10) * 10))].sort((a, b) => a - b);
const groups = decades.map((d) => ({
  label: `${d}s`,
  readings: rows.filter((r) => Math.floor(r.year / 10) * 10 === d).map((r) => ({ name: String(r.year), value: r.value })),
}));

// The same summary the render draws: linear quantiles, Tukey fences at 1.5 × IQR.
const quantile = (sorted, p) => {
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  return sorted[lo] + (sorted[Math.ceil(h)] - sorted[lo]) * (h - lo);
};
const summaries = groups.map((g) => {
  const v = g.readings.map((r) => r.value).sort((a, b) => a - b);
  const [q1, median, q3] = [0.25, 0.5, 0.75].map((p) => quantile(v, p));
  const outliers = g.readings.filter((r) => r.value < q1 - 1.5 * (q3 - q1) || r.value > q3 + 1.5 * (q3 - q1));
  return { label: g.label, n: v.length, median, outliers };
});
const peak = summaries.reduce((a, b) => (b.median > a.median ? b : a));
const last = summaries[summaries.length - 1];
const outliers = summaries.flatMap((s) => s.outliers);

const fr = (v, d = 2) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const counted = (n, one, many, none) => (n === 0 ? none : n === 1 ? one : `${n} ${many}`);
const band = (c) => `bande interquartile ${fr(c.q1)}-${fr(c.q3)} t CO₂ par personne`;
const pieces = (c) => [
  counted(c.above, "une décennie passe entièrement au-dessus", "décennies passent entièrement au-dessus", "aucune décennie ne passe au-dessus"),
  counted(c.below, "une entièrement au-dessous", "entièrement au-dessous", "aucune au-dessous"),
  c.overlapping.length ? `recoupée par ${c.overlapping.map((l) => `les ${l}`).join(" et ")}` : "aucune autre décennie ne la recoupe",
  counted(c.strangers, "une année d'une autre décennie y tombe", "années d'autres décennies y tombent", "aucune année d'une autre décennie n'y tombe"),
];

export default {
  lang: "fr",
  eyebrow: "Climat · France",
  groups,
  // The group drawn in the accent, with its note.
  subject: peak.label,
  unit: "t CO₂ par personne",
  format: (v) => fr(v),
  subjectNote: `pic : ${peak.label}, médiane ${fr(peak.median)}`,
  subjectNoteShort: `pic, médiane ${fr(peak.median)}`,
  // What one year answers when hovered, tapped or tabbed to (the page prints the year before it).
  detail: (r) =>
    `${fr(r.value)} t CO₂ par personne · décennie ${r.group} (médiane ${fr(r.median)}, n=${r.n}) · ` +
    (r.isOutlier ? "valeur aberrante au sens de Tukey" : r.aboveMedian ? "au-dessus de la médiane de sa décennie" : "au-dessous de la médiane de sa décennie"),
  // The control: lay one decade's three levels across the others.
  levelLabel: "À l'aune de",
  noneLabel: "Aucun repère",
  announce: (c) => {
    const [above, below, cut, strangers] = pieces(c);
    return `${c.label} — ${band(c)} ; ${above}, ${below} ; ${cut} ; ${strangers}`;
  },
  note: (c) => [c.label, band(c), ...pieces(c)].join(" · "),
  title: "Le CO₂ par personne des Français a culminé dans les années 1970 et baisse à chaque décennie depuis",
  limits:
    `Une boîte par décennie : quartiles, médiane en trait plein. Moustaches de Tukey — chacune s'arrête à la dernière lecture réelle ` +
    `située à moins de 1,5 écart interquartile de son quartile, jamais à l'extrême ; ` +
    (outliers.length
      ? `au-delà, l'année est un cercle creux (${outliers.map((o) => `${o.name}, ${fr(o.value)} t`).join(" ; ")}).`
      : `aucune lecture ne sort de sa clôture ici, donc aucun cercle creux n'est dessiné.`) +
    ` Axe ajusté aux lectures, pas à zéro.`,
  reading: "Lecture : une décennie choisie couche ses trois niveaux ; un point survolé ou tabulé donne son année.",
  source: `Source : Global Carbon Budget 2025, via Our World in Data · France, ${rows[0].year}-${rows[rows.length - 1].year}`,
  alt:
    `${groups.length} boîtes, une par décennie de ${rows[0].year} à aujourd'hui, mesurant le CO₂ émis par personne en France. La médiane monte de ` +
    `${fr(summaries[0].median)} tonnes dans les ${summaries[0].label} jusqu'à ${fr(peak.median)} dans les ${peak.label}, puis baisse à chaque décennie ` +
    `jusqu'à ${fr(last.median)} dans les ${last.label} (n=${last.n}, décennie incomplète). À droite de chaque boîte, les années qu'elle résume sont ` +
    `dessinées une à une. Choisir une décennie couche ses trois niveaux — Q1, médiane, Q3 — à travers les ${groups.length} boîtes.`,
  evidenceLevels: 3,
  check() {
    if (peak.label !== "1970s") throw new Error(`the highest median is the ${peak.label}, not the 1970s`);
    const at = summaries.indexOf(peak);
    for (let i = at + 1; i < summaries.length; i += 1)
      if (!(summaries[i].median < summaries[i - 1].median))
        throw new Error(`the ${summaries[i].label} (${fr(summaries[i].median)}) are not below the ${summaries[i - 1].label} (${fr(summaries[i - 1].median)})`);
  },
};

// beat.mjs for the worked example proof/web-marimekko-electricity-mix — "99.5 % of these six
// countries' coal is burned in two of them", as an interactive page. Every number on the page is
// COMPUTED from data.json; render-beat.mjs lays out the mosaic and both held states, computes the
// comparison between the two compared coal tiles and hands it to the hold words, check() and alt().
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

const YEAR = 2024;
const NAMES = { FRA: "France", DEU: "Allemagne", NOR: "Norvège", POL: "Pologne", SWE: "Suède", CHE: "Suisse" };
// The bands, bottom to top: the tracked band (coal) first, renewables last (drawn lightest, at the top).
const bandOrder = [
  { key: "Coal", label: "charbon" },
  { key: "Gas", label: "gaz" },
  { key: "Oil", label: "pétrole" },
  { key: "Nuclear", label: "nucléaire" },
  { key: "Hydropower", label: "hydraulique" },
  { key: "Wind", label: "éolien" },
  { key: "Solar", label: "solaire" },
  { key: "Bioenergy", label: "biomasse" },
  { key: "Other renewables", label: "autres renouv." },
];

const columns = data.rows
  .filter((r) => NAMES[r[at("Code")]] && r[at("Year")] === YEAR)
  .map((r) => ({ key: r[at("Code")], label: NAMES[r[at("Code")]], values: Object.fromEntries(bandOrder.map((b) => [b.key, Number(r[at(b.key)])])) }));
const grand = columns.reduce((s, c) => s + bandOrder.reduce((t, b) => t + c.values[b.key], 0), 0);
const coal = columns.reduce((s, c) => s + c.values.Coal, 0);
const holders = [...columns].sort((a, b) => b.values.Coal - a.values.Coal);
const twoShare = ((holders[0].values.Coal + holders[1].values.Coal) / coal) * 100;

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const totalOf = (c) => bandOrder.reduce((t, b) => t + c.values[b.key], 0);
const widest = [...columns].sort((a, b) => totalOf(b) - totalOf(a));

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  columns,
  bandOrder,
  tracked: "Coal",
  unit: "TWh",
  // Shorter than the proof's own words: the proof's phone page leaves the mosaic too short for any
  // tile to print its name (verify-web: "0 of 31 drawn at this size").
  widthName: `Largeur = production du pays en ${YEAR}, en TWh ; hauteur = part de chaque source.`,
  claimNote: `Charbon : ${fr(coal, 0)} TWh.`,
  // A column's total, printed under its name.
  format: (v) => fr(v, 0),
  // A tile's share (0–1), printed after its band's name inside the tile.
  percent: (share) => `${fr(share * 100, 0)} %`,
  detail: (t) =>
    `${t.columnLabel} · ${t.bandLabel} · ${fr(t.share)} % de son mix · ${fr(t.value, 1)} TWh · ` +
    `${fr(t.grandShare, 2)} % des ${fr(t.grand, 0)} TWh des six`,
  // The "hold still" control: its legend, its untouched option, and the two held states' words.
  hold: {
    label: "Tenir immobile",
    noneLabel: "La mosaïque",
    parts: {
      label: "Les largeurs",
      announce: () => `Les largeurs — six colonnes de même largeur, la hauteur ne dit plus que la part du mix`,
      note: (r) =>
        `La hauteur ne dit plus que la part du mix : le charbon fait ${fr(r.b.share)} % du mix en ${r.b.label} contre ` +
        `${fr(r.a.share)} % en ${r.a.label} — un rapport de ${fr(r.shareRatio, 2)} que la mosaïque avait ` +
        `dissous dans deux tuiles à ${fr(r.areaGapPct)} % de surface l'une de l'autre.`,
      figure: (r) => `${fr(r.b.share)} % contre ${fr(r.a.share)} %`,
    },
    scale: {
      label: "L'échelle des TWh",
      announce: () => `L'échelle des TWh — six colonnes de même largeur, la hauteur est la production absolue`,
      note: (r) =>
        `Les six colonnes partent d'un même sol et leur hauteur est la production : ${fr(r.a.value)} TWh de charbon en ` +
        `${r.a.label} contre ${fr(r.b.value)} en ${r.b.label}, soit ${fr(r.valueRatio, 2)} fois plus — mais sur une production ` +
        `${fr(r.totalRatio, 2)} fois plus grande, d'où une part ${fr(r.shareRatio, 2)} fois plus faible.`,
      figure: (r) => `${fr(r.a.value)} TWh contre ${fr(r.b.value)}`,
    },
  },
  title: "99,5 % du charbon de ces six pays est brûlé dans deux d'entre eux",
  limits:
    `Six pays européens en ${YEAR}, ${fr(grand, 0)} TWh, dont ${fr((coal / grand) * 100)} % de charbon. ` +
    `LARGEUR = production, HAUTEUR = mix : la SURFACE d'une bande est une quantité réelle en TWh.`,
  reading:
    `Lecture : une surface est un PRODUIT. Tenez une dimension immobile ; survolez ou tabulez une bande.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`,
  alt:
    `Six colonnes de largeurs inégales : la ${widest[0].label} est la plus large avec ` +
    `${fr(totalOf(widest[0]), 0)} TWh, la ${widest[widest.length - 1].label} la plus ` +
    `étroite avec ${fr(totalOf(widest[widest.length - 1]), 0)}. Chaque colonne est empilée ` +
    `par source, de la plus claire (renouvelables) à la plus foncée (charbon). Les bandes de ` +
    `charbon ne sont visibles que dans ${holders[0].label} et ${holders[1].label} ; ailleurs ` +
    `elles sont un filet ou rien.`,
  evidenceLevels: 3,
  check({ trackedTotal, holders }) {
    const share = ((holders[0].value + holders[1].value) / trackedTotal) * 100;
    if (fr(share) !== "99,5") throw new Error(`the two largest coal burners hold ${fr(share)} % of the six countries' coal, not 99,5 %`);
  },
};

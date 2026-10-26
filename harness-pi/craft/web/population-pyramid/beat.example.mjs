// beat.mjs for the worked example proof/web-population-pyramid-switzerland — "La tranche la plus
// large de la Suisse est celle des 55-59 ans, pas celle des 0-4 ans", as an interactive page. The
// widest band, the crossing and the runs of each half's lead are COMPUTED by render-beat.mjs and only
// WORDED here; every other number is computed from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [BAND, MALE, FEMALE, YEAR] = [col("age_band"), col("male"), col("female"), col("year")];

// One band per row, youngest first (the file's own order): men on the left, women on the right.
const bands = data.rows.map((r) => ({ band: String(r[BAND]), left: Number(r[MALE]), right: Number(r[FEMALE]) }));
const year = data.rows[0][YEAR];

const fr = (v, d = 0) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const MEN = "hommes";
const WOMEN = "femmes";

export default {
  lang: "fr",
  // The worked example said "Démographie · Suisse": the only words set at the eyebrow's weight, their letters
  // measure 0.3 px from the fallback face, so the browser check cannot see the face draw (the proof's own page fails it).
  eyebrow: "Population · Suisse",
  bands,
  leftName: MEN,
  rightName: WOMEN,
  unit: "personnes",
  format: (v) => fr(v),
  peakLabel: (p) => `${p.band} ans : ${fr(p.total)} personnes`,
  // What one band answers when hovered, tapped or tabbed to.
  detail: (b) =>
    `${b.band} ans · ${fr(b.left)} hommes, ${fr(b.right)} femmes · ${fr(b.total)} personnes, ${fr(b.share, 1)} % de la population · ` +
    `${b.gap === 0 ? "parité exacte" : `${fr(b.gap)} ${b.leader} de plus`}`,
  // The fold: one half laid over the other, offered both ways round.
  foldLabel: "Rabattre une moitié",
  noneLabel: "Aucune",
  foldPill: (f) => `les ${f.name}`,
  announce: (f) => `Rabattre les ${f.name} sur les ${f.host} : le profil ${f.name === MEN ? "masculin" : "féminin"} posé sur les barres ${f.host === MEN ? "masculines" : "féminines"}`,
  note: (f) => {
    const [first, second] = f.runs;
    if (f.name === MEN)
      return (
        `Le profil des ${f.name}, posé sur celui des ${f.host} : il SORT de la barre sur les ${first.count} tranches de ${first.from} à ${first.to}, ` +
        `et RENTRE dedans sur les ${second.count} suivantes. La bascule est à ${f.crossing.band} ans, où ${fr(f.crossing.gap)} ` +
        `${f.crossing.leader} de plus suffisent à faire pencher la tranche.`
      );
    return (
      `Le profil des ${f.name}, posé sur celui des ${f.host} : il reste DANS la barre jusqu'à ${first.to} ans — au plus loin à ${first.widest.band}, ` +
      `${fr(first.widest.gap)} ${first.leader} de plus — puis il en SORT et ne rentre plus, jusqu'à ${fr(f.widestGap.gap)} d'écart à ` +
      `${f.widestGap.band}. Au total ${fr(f.total)} ${f.name} contre ${fr(f.hostTotal)} ${f.host}.`
    );
  },
  crossingText: (f) => `${f.crossing.band} ans : le profil des ${f.name} ${f.name === MEN ? "rentre dans" : "sort de"} la barre`,
  title: "La tranche la plus large de la Suisse est celle des 55-59 ans, pas celle des 0-4 ans",
  limits:
    `Population suisse en ${year}, par tranche de cinq ans, hommes à gauche et femmes à droite d'une ligne centrale. Une pyramide la plus large ` +
    `au MILIEU est une population qui vieillit, pas une population qui croît — et rien d'autre que la tranche nommée ne dit laquelle.`,
  reading:
    `Lecture : rabattez une moitié sur l'autre — son profil vient se poser sur les barres d'en face, et là où il les traverse, les deux sexes ` +
    `changent de rang. Survolez, touchez ou tabulez une tranche pour ses deux effectifs, leur total, l'écart entre les sexes et sa part de la population.`,
  source: `Source : Office fédéral de la statistique · population résidente permanente, ${year}`,
  alt: ({ widest, youngest, crossings }) =>
    `Une pyramide des âges : ${bands.length} tranches de cinq ans empilées, les hommes vers la gauche et les femmes vers la droite. La silhouette ` +
    `ne s'élargit pas vers le bas : elle est la plus large à la tranche ${widest.band} ans (${fr(widest.total)} personnes) et se resserre vers les ` +
    `plus jeunes, où les 0-4 ans ne comptent que ${fr(youngest.total)} personnes. Un choix au-dessus du graphique rabat une moitié sur l'autre : son ` +
    `profil est redessiné en trait plein par-dessus les barres d'en face, et il les traverse une seule fois, à ${crossings[0]} ans.`,
  evidenceLevels: 2,
  check({ widest, youngest, runs }) {
    if (widest.band !== "55-59") throw new Error(`the widest band is ${widest.band}, not 55-59`);
    if (widest.band === youngest.band) throw new Error(`the widest band is the youngest`);
    // The fold's sentences say the lead turns ONCE: men, then women.
    if (runs.length !== 2 || runs[0].leader !== MEN) throw new Error(`the lead turns ${runs.length - 1} time(s), starting with ${runs[0].leader}: rewrite note()`);
  },
};

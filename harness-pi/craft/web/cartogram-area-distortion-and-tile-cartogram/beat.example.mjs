// beat.mjs for the worked example proof/web-cartogram-europe-lowcarbon — "Pondérée par la surface,
// l'Europe est à 45 % bas-carbone ; pondérée par pays, à 65 %". Every number on the page is COMPUTED
// from data.json or taken from the reading the render hands a word function; the grid, the stages
// and the territory weights are the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [CODE, YEAR_COL] = [col("code"), col("year")];
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"].map(col);
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"].map(col);
const YEAR = 2024;

// The page's language is French; a tile holds a short name.
const NAMES = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-H.",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark",
  EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxemb.", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro",
  NLD: "Pays-Bas", MKD: "Macéd. N.", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie",
  ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "R.-Uni",
};

// THE JOIN: `code` holds ISO alpha-3. The value is the low-carbon share of generation; a country
// whose generation is not reported (total 0) is null — a hollow tile. `low` and `total` ride along.
const rows = table.rows
  .filter((r) => Number(r[YEAR_COL]) === YEAR)
  .map((r) => {
    const low = LOW.reduce((s, i) => s + Number(r[i] || 0), 0);
    const total = low + FOSSIL.reduce((s, i) => s + Number(r[i] || 0), 0);
    return { iso: r[CODE], name: NAMES[r[CODE]], value: total > 0 ? (low / total) * 100 : null, low, total };
  });

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const reported = rows.filter((r) => r.value !== null);
const meanByCountry = reported.reduce((s, r) => s + r.value, 0) / reported.length;
const BREAKS = [30, 50, 70, 94];
const classOf = (v) => BREAKS.filter((b) => v >= b).length;
const classWords = (i) => (i === 0 ? `moins de ${BREAKS[0]} %` : i === BREAKS.length ? `${BREAKS[BREAKS.length - 1]} % et plus` : `${BREAKS[i - 1]}–${BREAKS[i]} %`);
const stem = (t) =>
  t.value === null
    ? `${t.name} · aucune production publiée pour ${YEAR} — case en creux, jamais rangée dans le palier le plus bas`
    : `${t.name} · ${fr(t.value)} % bas-carbone en ${YEAR} · palier ${classWords(classOf(t.value))} · ${fr(t.low, 0)} TWh bas-carbone sur ${fr(t.total, 0)} · ${t.rank}e sur ${t.of}`;
const suffix = (t) =>
  t.stage === "grid"
    ? `une case égale, comme les ${t.tiles - 1} autres`
    : t.stage === "place"
      ? `sa case a voyagé de ${fr(t.travel, 2)} case(s) depuis la grille et s'arrête à ${fr(t.displaced, 0)} unités de son vrai centroïde`
      : `son carré occupe ${fr(t.areaShare, 2)} % du dessin, vaut ${fr(t.scale, 3)} fois la case que la grille lui donnait, et s'arrête à ${fr(t.displaced, 0)} unités de son vrai centroïde`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  rows,
  breaks: BREAKS,
  format: (b) => `${b} %`,
  classLabel: ({ index }) => classWords(index),
  figure: (v) => fr(v, 0),
  number: (v, d) => fr(v, d),
  stageLabel: "Ce que la carte rend",
  stages: {
    grid: {
      label: "une case par pays",
      announce: `une case par pays — le cartogramme tel qu'il est déposé : ${rows.length} cases égales, moyenne ${fr(meanByCountry)} %`,
    },
    place: {
      label: "chaque case près de sa place",
      announce: `chaque case près de sa place — les mêmes ${rows.length} cases, parties des vrais centroïdes et écartées jusqu'à ce qu'aucune n'en recouvre une autre ; la moyenne ne bouge pas`,
      note: (s) =>
        `Le LIEU ne pèse rien : toujours ${fr(s.byCountry)} % par pays. Les cases partent des vrais centroïdes et sont écartées jusqu'à ce qu'aucune n'en ` +
        `recouvre une autre ; ce qu'il en coûte est ${fr(s.medianPct, 1)} % de la largeur de la carte en médiane et ${fr(s.worstPct, 1)} % au pire ` +
        `(${s.worstName}) — la grille déposée, elle, est à ${fr(s.gridMedianPct, 1)} % en médiane.`,
    },
    area: {
      label: "chaque case à sa surface",
      announce: "chaque case à sa surface — chaque carré à la surface exacte de son pays, écarté jusqu'à ne plus recouvrir ses voisins ; la moyenne tombe au chiffre du choroplèthe",
      note: (s) =>
        `La SURFACE rend le chiffre du choroplèthe : ${fr(s.byArea)} %. Chaque carré garde exactement la surface de son pays ; seule sa position cède, de ` +
        `${fr(s.medianPct, 1)} % de la largeur en médiane et ${fr(s.worstPct, 1)} % au pire. Le carré de la ${s.biggestName} vaut ${fr(s.biggestScale, 2)} fois ` +
        `sa case, celui de ${s.smallestName} ${fr(s.smallestScale, 3)}.`,
    },
  },
  total: (t) =>
    t.stage === "area"
      ? `Moyenne européenne pondérée par la SURFACE : ${fr(t.mean)} % · ${t.tiles} cases à leur vraie surface, ${t.named} noms · aucun recouvrement`
      : `Moyenne européenne pondérée par PAYS : ${fr(t.mean)} % · ${t.tiles} cases égales${t.stage === "place" ? " près de leur vraie place" : ""}, ${t.named} noms · aucun recouvrement`,
  detail: (t) => `${stem(t)} · ${suffix(t)}`,
  missingDetail: (t) => `${stem(t)} · ${suffix(t)}`,
  missingLabel: "pas de donnée",
  callout: (c) =>
    `La ${c.biggest.name} prend ${fr(c.biggest.areaShare, 0)} % du dessin du choroplèthe à ${fr(c.biggest.value)} %, et tire la première moyenne vers le bas. ` +
    `${c.missing} case sans lecture ${YEAR}, en creux.`,
  title: "Pondérée par la surface, l'Europe est à 45 % bas-carbone ; pondérée par pays, à 65 %",
  limits:
    "Une case égale par pays, teintée comme le choroplèthe voisin et calculée sur le même fichier. Un choroplèthe encre chaque pays sur SON territoire, " +
    "donc il ne montre que la première moyenne — celle que personne n'a choisie, la surface étant un fait de la Terre.",
  reading:
    "Lecture : rendez à la carte le lieu, puis la surface, et regardez la moyenne. Chaque carré garde exactement sa surface et part de son vrai centroïde ; " +
    "il n'en est écarté que de ce qu'il faut pour n'en recouvrir aucun autre, et chaque étape dit de combien. Survolez, touchez ou tabulez une case pour son détail.",
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`,
  alt: (a) =>
    "La grille garde la géographie approximative : c'est ce qui la sépare d'un pictogramme, où les mêmes pays seraient rangés par valeur et la carte aurait disparu. " +
    "Une grille de cases carrées disposées à peu près comme l'Europe, une par pays, toutes de la même taille et teintées selon la part bas-carbone de leur " +
    `électricité. Les cases les plus foncées sont au nord et à l'ouest ; la case de la ${a.biggest}, qui occupe presque les trois quarts d'un choroplèthe, n'est ici ` +
    `qu'une case parmi ${a.tiles}. Un contrôle rapproche chaque case de sa vraie place, puis sa vraie surface — les carrés partant de leur centroïde et n'étant ` +
    `écartés que de ce qu'il faut pour n'en recouvrir aucun autre : la première étape ne change pas la moyenne (${fr(a.byCountry)} %), la seconde la fait tomber ` +
    `à ${fr(a.byArea)} %, qui est le chiffre du choroplèthe.`,
  // The claim checked against the drawn data: 45 % by area, 65 % by country.
  check({ byCountry, byArea }) {
    if (Math.round(byArea) !== 45) throw new Error(`the title says 45 % by area; the area-weighted mean is ${fr(byArea)} %`);
    if (Math.round(byCountry) !== 65) throw new Error(`the title says 65 % by country; the mean by country is ${fr(byCountry)} %`);
  },
};

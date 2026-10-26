// beat.mjs for the worked example proof/web-hex-grid-europe-protection — "Par habitant, ce n'est pas
// l'Allemagne : la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants". The render reads the
// units by the column names given here; every number in a sentence is taken from the reading a word
// function receives. The grid, the three grains, the seams and the colours are the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const MONTH = table.rows[0][table.columns.findIndex((c) => c.name === "month")];

// The page is French; fr-FR's narrow no-break spaces are replaced by the render (plain()).
const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const count = (v) => Math.round(v).toLocaleString("fr-FR");
const BREAKS = [5, 10, 20, 30];

export default {
  lang: "fr",
  eyebrow: "Migrations · Europe",
  // THE JOIN: each unit's ISO alpha-3 code, the count, and the denominator of the rate.
  key: "code",
  value: "people",
  per: "population",
  perBase: 1000,
  where: { month: MONTH },
  // The built-in Europe grid places Ukraine: the origin country, kept on the map with no fill.
  unmeasured: ["UKR"],
  unmeasuredLabel: "Ukraine · origine",
  unmeasuredWord: "origine",
  unmeasuredDetail: (c) => `${c.name} · pays d'origine — la carte compte les personnes qui en sont parties, pas celles qui y sont, et aucun regroupement ne l'inclut`,
  names: {
    DEU: "Allemagne", POL: "Pologne", CZE: "Tchéquie", ESP: "Espagne", ROU: "Roumanie",
    SVK: "Slovaquie", NLD: "Pays-Bas", IRL: "Irlande", BEL: "Belgique", AUT: "Autriche",
    NOR: "Norvège", BGR: "Bulgarie", CHE: "Suisse", FIN: "Finlande", PRT: "Portugal",
    FRA: "France", DNK: "Danemark", LTU: "Lituanie", HUN: "Hongrie", SWE: "Suède", GRC: "Grèce",
    ITA: "Italie", LVA: "Lettonie", EST: "Estonie", HRV: "Croatie", CYP: "Chypre", SVN: "Slovénie",
    ISL: "Islande", LUX: "Luxembourg", MLT: "Malte", LIE: "Liechtenstein", UKR: "Ukraine",
  },
  // The third grain's blocks — an EDITORIAL partition, named the way a reader holds Europe.
  regions: {
    Nordiques: ["ISL", "NOR", "SWE", "FIN", "DNK"],
    Baltes: ["EST", "LVA", "LTU"],
    "Europe centrale": ["DEU", "POL", "CZE", "SVK", "AUT", "HUN", "SVN"],
    "Europe de l'Ouest": ["IRL", "NLD", "BEL", "LUX", "CHE", "FRA", "LIE"],
    "Europe du Sud": ["PRT", "ESP", "ITA", "MLT", "GRC", "CYP", "HRV"],
    "Europe du Sud-Est": ["ROU", "BGR"],
  },
  breaks: BREAKS,
  format: (v) => fr(v),
  count,
  classLabel: ({ lower, upper }) => (lower === null ? `moins de ${upper}` : upper === null ? `${lower} et plus` : `${lower}–${upper}`),
  poolLabel: "À quelle échelle la case met sa valeur en commun",
  unit: "pour 1 000 habitants",
  grains: {
    country: { label: "le pays", announce: "Chaque case mesure le pays, et le pays seul — le pays" },
    neighbourhood: { label: "le voisinage", announce: "Chaque case est mise en commun avec ses voisines par une arête — le voisinage" },
    region: { label: "la région", announce: "Chaque case prend le taux de son bloc régional — la région" },
  },
  neighbourhoodNote: (r) =>
    `Chaque case additionne ses personnes et ses habitants avec ceux de ses voisines par une arête, puis divise : ${r.moved} cases sur ${r.cells} changent de classe. ` +
    `${r.swing.name} passe de ${fr(r.swing.from)} à ${fr(r.swing.to)} pour 1 000, parce que ses ${count(r.swing.denominator)} habitants sont mis en commun avec les ` +
    `${count(r.swing.neighbour.denominator)} de ${r.swing.neighbour.name}, assis à côté de lui DANS LE DESSIN. Un voisinage n'est pas un découpage : les fenêtres se recouvrent, donc ` +
    "il n'y a aucun bloc à contourner ici.",
  regionNote: (r) =>
    `Les blocs sont ${r.blocks} ensembles de pays nommés à la main — ${r.blockNames.join(", ")} — et chaque bloc divise la somme de ses personnes par la ` +
    "somme de ses habitants, si bien que toutes ses cases affichent le MÊME chiffre. Le trait épais tombe partout où deux cases voisines ne sont pas dans le même bloc : " +
    `${r.moved} cases sur ${r.cells} changent de classe. ${r.widest.name} tombe à ${fr(r.widest.pooled)} quand la moyenne des taux de ses ${r.widest.members} membres est ` +
    `${fr(r.widest.mean)} : le quotient des sommes n'est pas la moyenne des quotients, et c'est ce que coûte un découpage.`,
  detail: (r) =>
    `${r.name} · seul ${fr(r.alone)} pour 1 000 · avec ses voisines ${fr(r.neighbourhood)} · ${r.regionName} ${fr(r.region)} · ${count(r.numerator)} personnes pour ` +
    `${count(r.denominator)} habitants · ${r.rateRank}e par habitant, ${r.countRank}e en nombre absolu`,
  tableCaption: ({ cells }) => `Les ${cells} cases, leur taux au grain choisi et ce qu'il compte`,
  columns: ["Pays", "Taux au grain choisi", "Personnes", "Classe"],
  claimNote: (c) => {
    const largest = c.byCount[0];
    const first = c.byRate[0];
    return (
      `En nombre absolu l'ordre s'inverse : ${largest.name} ${count(largest.numerator)} personnes (${largest.rateRank}e par habitant), ${first.name} ` +
      `${count(first.numerator)} (1re par habitant). Aucun des deux chiffres n'est le plus vrai — ils répondent à deux questions.`
    );
  },
  mercator: (m) =>
    "Carte MapTiler plate, en Web Mercator : les cases restent rigoureusement égales — elles sont construites en mètres de Mercator, c'est l'achat du type — mais la terre " +
    `sous elles ne l'est pas. Sous la case la plus au nord (${m.north.name}, ${fr(m.north.lat)}° N) le sol est dessiné ${fr(m.factor)} fois plus grand que sous la plus ` +
    `au sud (${m.south.name}, ${fr(m.south.lat)}° N). Ce que la planche fixe a dû trancher pour vous est en dessous : à quelle échelle une case met sa valeur en commun.`,
  reading: (r) =>
    `Lecture : changez le grain et les mêmes ${r.cells} cases, aux mêmes ${r.cells} places et sous la même légende, disent autre chose — ${r.moved} sur ${r.measured} changent ` +
    `de classe d'un grain à l'autre. Mise en commun sur toute l'Europe, la protection vaut ${fr(r.wholeRate)} pour 1 000 quand la moyenne des ${r.measured} taux vaut ` +
    `${fr(r.meanOfRates)}. Survolez une case pour lire ses trois taux d'un coup, les personnes, la population qui les divise et son rang dans LES DEUX classements.`,
  hint:
    "Carte vivante : zoomez avec les boutons de MapTiler, la molette ou les touches + et −, déplacez-la en la faisant glisser ou avec les flèches du clavier, et survolez une case " +
    "pour la lire. Le tableau sous la carte porte les mêmes lectures, et il change de grain sans JavaScript.",
  title: "Par habitant, ce n'est pas l'Allemagne : la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants",
  limits:
    "Une case par pays d'accueil, toutes de la même taille : la carte abandonne la surface et achète ce qu'un choroplèthe des mêmes données ne peut pas donner — chaque pays " +
    "également visible. Six voisins, tous par une arête.",
  source: `Source : Eurostat, migr_asytpsm — bénéficiaires de la protection temporaire, ${MONTH} · population 2023, via Our World in Data · fond de carte MapTiler`,
  alt: (a) =>
    "Une grille d'hexagones disposés à peu près comme l'Europe, posée sur un fond de carte MapTiler où l'on voit les vraies côtes autour d'elle. Un hexagone par pays d'accueil, " +
    "tous de la même taille et teintés selon le nombre d'Ukrainiens sous protection pour 1 000 habitants. Chaque case porte le code du pays et son taux. Les cases les plus " +
    `foncées sont en Europe centrale — la ${a.first.name} à ${fr(a.first.rate)} en tête — tandis que l'${a.largest.name}, la plus grande en nombre absolu, n'est qu'à ` +
    `${fr(a.largest.rate)}. La case de l'${a.unmeasured[0]} est neutre : c'est le pays d'origine. Un choix sous le titre change l'échelle à laquelle une case met sa valeur ` +
    `en commun — le pays seul, le pays avec ses voisines, ou le bloc régional — et ${a.moved} cases sur ${a.measured} changent de classe sans qu'aucune ne bouge : ` +
    `${a.swing.name} passe de ${fr(a.swing.from)} à ${fr(a.swing.to)}. La carte se zoome, se déplace et se survole avec les contrôles de MapTiler.`,
  evidenceLevels: 3,
  // The claim checked against the drawn data, at the takeaway's precision.
  check(c) {
    const first = c.byRate[0];
    if (first.code !== "CZE") throw new Error(`the title says Czechia leads per inhabitant; ${first.name} does`);
    if (fr(first.rate) !== fr(36.1)) throw new Error(`the title says 36,1 per 1 000; Czechia is at ${first.rate.toFixed(2)}`);
    if (c.byCount[0].code !== "DEU") throw new Error(`the title opposes Germany, the largest in number; the largest is ${c.byCount[0].name}`);
  },
};

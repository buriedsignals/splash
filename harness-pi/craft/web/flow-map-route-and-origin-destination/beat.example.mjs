// beat.mjs for the worked example proof/web-flow-map-ukraine-protection — "4,5 millions d'Ukrainiens
// protégés en Europe — en tête l'Allemagne, ou la Tchéquie, ou Malte". The render reads the
// destinations by the column names given here; every number in a sentence is taken from the reading
// a word function receives. The fan, the three measures, the camera and the colours are the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const MONTH = table.rows[0][table.columns.findIndex((c) => c.name === "month")];

// The page is French; fr-FR's narrow no-break spaces are replaced by the render (plain()).
const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const n0 = (v) => Math.round(v).toLocaleString("fr-FR");

export default {
  lang: "fr",
  eyebrow: "Migrations · Europe",
  // THE JOIN: the column with each destination's ISO alpha-3 code, the quantity a band's width draws,
  // and each destination's population (the per-inhabitant denominator).
  key: "code",
  value: "people",
  population: "population",
  where: { month: MONTH },
  origin: "UKR",
  names: {
    UKR: "Ukraine", DEU: "Allemagne", POL: "Pologne", CZE: "Tchéquie", ESP: "Espagne", ROU: "Roumanie",
    SVK: "Slovaquie", NLD: "Pays-Bas", IRL: "Irlande", BEL: "Belgique", AUT: "Autriche",
    NOR: "Norvège", BGR: "Bulgarie", CHE: "Suisse", FIN: "Finlande", PRT: "Portugal",
    FRA: "France", DNK: "Danemark", LTU: "Lituanie", HUN: "Hongrie", SWE: "Suède", GRC: "Grèce",
    ITA: "Italie", LVA: "Lettonie", EST: "Estonie", HRV: "Croatie", CYP: "Chypre", SVN: "Slovénie",
    ISL: "Islande", LUX: "Luxembourg", MLT: "Malte", LIE: "Liechtenstein",
  },
  // THE THREE MEASURES the reader picks between: what a band's width is divided by.
  measures: {
    count: { label: "Personnes", unit: "personnes", announce: "Personnes — la largeur d'une bande est le nombre de personnes sans diviseur", format: (v) => n0(v) },
    perCapita: { label: "Pour 1 000 habitants", unit: "pour 1 000 habitants", announce: "Pour 1 000 habitants — la largeur d'une bande est le nombre de personnes divisé par habitants du pays d'accueil", format: (v) => fr(v, 1) },
    perArea: { label: "Pour 1 000 km²", unit: "pour 1 000 km²", announce: "Pour 1 000 km² — la largeur d'une bande est le nombre de personnes divisé par km² du pays d'accueil", format: (v) => n0(v) },
  },
  controlLabel: "Largeur de bande : ce qui divise",
  note: (r) =>
    `${r.label} : ${r.podium[0].name} passe en tête (${r.format(r.podium[0].value)}), devant ${r.podium[1].name} et ${r.podium[2].name} ; ` +
    `${r.countLeader.name}, la plus large en nombre, tombe ${r.countLeader.rank}e. ${r.remainder.count} destinations passent sous le plancher ` +
    `(${n0(r.remainder.people)} personnes, ${fr(r.remainder.share)} %).`,
  rank: (n) => `${n}e`,
  detail: (r) =>
    `${r.name} · ${n0(r.people)} personnes sous protection en ${MONTH} · ${fr(r.sharePc)} % du total · ${r.ranks[0]}e en nombre, ${r.ranks[1]}e pour 1 000 habitants, ` +
    `${r.ranks[2]}e pour 1 000 km² · ${n0(r.inhabitants)} habitants, ${n0(r.areaKm2)} km²`,
  countedLabel: "comptée, trop fine pour être dessinée",
  tableCaption: ({ destinations }) => `Les ${destinations} destinations, et ce que la mesure choisie leur donne`,
  columns: ["Destination", "Personnes", "Pour 1 000 hab.", "Pour 1 000 km²", "Rang", "Largeur"],
  claimNote: (c) =>
    `${c.ranked.slice(0, 4).map((f) => `${f.name} ${n0(f.people)}`).join(", ")}. Par habitant c'est la ${c.leaders[1].name}, au kilomètre carré c'est ${c.leaders[2].name}. ` +
    `${c.remainder.count} destinations sur ${c.destinations} sont trop fines pour être dessinées ici : comptées sans être dessinées, ${n0(c.remainder.people)} personnes, ` +
    `${fr(c.remainder.share)} % du total.`,
  mercator: (m) =>
    `Carte MapTiler plate, en Web Mercator — sur un éventail le nord allonge les bras : la bande vers ${m.longest} est dessinée ${fr(m.spread, 2)} fois plus longue ` +
    `par kilomètre réel que celle vers ${m.shortest}.`,
  reading: (r) =>
    `Lecture : une largeur est une quantité divisée par quelque chose. Changez le diviseur — les ${r.destinations} bandes se redessinent sans qu'aucune extrémité ` +
    "ne bouge, et le tableau suit la même mesure avec ou sans JavaScript.",
  hint: "Carte vivante : molette ou boutons pour zoomer, glisser pour déplacer, flèches du clavier au focus ; survolez une bande pour ses trois rangs.",
  title: "4,5 millions d'Ukrainiens protégés en Europe — en tête l'Allemagne, ou la Tchéquie, ou Malte",
  limits:
    "Une bande par pays d'accueil, sa LARGEUR proportionnelle à la mesure choisie. La courbe est schématique et n'est pas un itinéraire : ce qui est exact, " +
    "c'est la largeur, les deux extrémités et la direction du départ.",
  source: `Source : Eurostat, migr_asytpsm, ${MONTH} · population 2023, via Our World in Data · surfaces calculées sur les formes gelées du beat · fond MapTiler (dataviz), teinté par la direction`,
  alt: (a) =>
    `Une carte d'Europe d'où partent ${a.drawn} bandes, toutes issues d'un même point en ${a.origin}. La plus large va vers l'${a.first.name} ` +
    `(${n0(a.first.people)} personnes), la deuxième vers la ${a.second.name} (${n0(a.second.people)}) ; ensemble elles font ${fr(a.topTwoShare)} % du total. Les autres ` +
    "s'amincissent rapidement vers l'ouest et le sud. Une commande à trois positions redivise les mêmes mouvements par la population puis par la surface du pays d'accueil, " +
    `et la bande la plus large devient celle de la ${a.leaders[1].name} puis celle de ${a.leaders[2].name} ; la carte elle-même se zoome et se déplace avec les contrôles de MapTiler.`,
  evidenceLevels: 3,
  // The claim checked against the drawn data, at the takeaway's precision.
  check(c) {
    if (Math.round(c.total / 1e5) / 10 !== 4.5) throw new Error(`the title says 4.5 million; the rows total ${c.total}`);
    const leaders = c.leaders.map((l) => l.code).join(",");
    if (leaders !== "DEU,CZE,MLT") throw new Error(`the title names Germany, Czechia and Malta as the three leaders; the measures crown ${leaders}`);
  },
};

// beat.mjs for the worked example proof/web-parallel-coordinates-electricity — "5 countries out of 16
// exceed 25 % nuclear, 10 exceed 20 % wind — 2 do both", as an interactive page. Every number on the
// page is COMPUTED from data.json; who falls in each band and what that set averages on another rail
// are computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

const YEAR = 2024;
const NUCLEAR_FLOOR = 25;
const WIND_FLOOR = 20;
// The rails, left to right; the two the takeaway relates (nuclear, wind) side by side.
const axes = [
  { key: "nuclear_generation__twh", name: "nucléaire" },
  { key: "wind_generation__twh", name: "éolien" },
  { key: "hydro_generation__twh", name: "hydraulique" },
  { key: "solar_generation__twh", name: "solaire" },
  { key: "bioenergy_stacked_generation__twh", name: "biomasse" },
  { key: "gas_generation__twh", name: "gaz" },
  { key: "coal_generation__twh", name: "charbon" },
];
const ALL = [...axes.map((a) => a.key), "oil_generation__twh", "other_renewables_generation__twh"];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", ITA: "Italie", GBR: "Royaume-Uni",
  POL: "Pologne", SWE: "Suède", NOR: "Norvège", CHE: "Suisse", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", FIN: "Finlande", DNK: "Danemark", PRT: "Portugal",
  CZE: "Tchéquie", GRC: "Grèce", IRL: "Irlande",
};

// One line per country in 2024: each value is the source's SHARE of the country's generation.
const lines = data.rows
  .filter((r) => r[at("year")] === YEAR)
  .map((r) => {
    const total = ALL.reduce((s, k) => s + Number(r[at(k)]), 0);
    return {
      key: r[at("code")],
      name: NAMES[r[at("code")]] ?? r[at("entity")],
      total,
      values: Object.fromEntries(axes.map((a) => [a.key, (Number(r[at(a.key)]) / total) * 100])),
    };
  });
const nuclear = (l) => l.values.nuclear_generation__twh;
const wind = (l) => l.values.wind_generation__twh;
const heavyNuclear = lines.filter((l) => nuclear(l) > NUCLEAR_FLOOR);
const heavyWind = lines.filter((l) => wind(l) > WIND_FLOOR);
const both = lines.filter((l) => nuclear(l) > NUCLEAR_FLOOR && wind(l) > WIND_FLOOR);

// The correlation between the two rails the takeaway relates, across every line.
const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const [mx, my] = [mean(lines.map(nuclear)), mean(lines.map(wind))];
const corr =
  lines.reduce((s, l) => s + (nuclear(l) - mx) * (wind(l) - my), 0) /
  Math.sqrt(lines.reduce((s, l) => s + (nuclear(l) - mx) ** 2, 0) * lines.reduce((s, l) => s + (wind(l) - my) ** 2, 0));
const bands = [
  { axis: "nuclear_generation__twh", from: NUCLEAR_FLOOR, to: null, against: "wind_generation__twh", label: "Nucléaire élevé" },
  { axis: "wind_generation__twh", from: WIND_FLOOR, to: null, against: "nuclear_generation__twh", label: "Éolien élevé" },
  { axis: "wind_generation__twh", from: 0, to: 10, against: "nuclear_generation__twh", label: "Éolien faible" },
  { axis: "hydro_generation__twh", from: 30, to: null, against: "gas_generation__twh", label: "Hydraulique élevée" },
  { axis: "coal_generation__twh", from: 15, to: null, against: "hydro_generation__twh", label: "Charbon élevé" },
];

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const bound = (b) => (b.from === 0 ? `sous ${b.to ?? b.ceiling} %` : `plus de ${b.from} %`);

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  axes,
  lines,
  thread: both.map((l) => l.key),
  claimAxes: ["nuclear_generation__twh", "wind_generation__twh"],
  threadNote: `${both.map((l) => l.name).join(" et ")} : au-dessus des deux seuils`,
  // What every vertex of a line answers: the country's whole row.
  detail: (l) => `${l.name} · ${axes.map((a) => `${a.name} ${fr(l.values[a.key])} %`).join(", ")} · ${fr(l.total, 0)} TWh au total`,
  // The brush: named spans of one rail, each read against another rail.
  bands,
  brushLabel: "Sélectionner une bande",
  noneLabel: "Toutes les lignes",
  announce: (b) => `${b.label}, ${bound(b)} — ${b.inside} pays sur ${b.total}`,
  note: (b) =>
    `${b.label}, ${bound(b)} : ${b.inside} pays sur ${b.total} · ${b.against} : ${fr(b.insideMean)} % en moyenne, ` +
    `contre ${fr(b.outsideMean)} % pour les ${b.outside} autres` +
    (b.adjacent ? "" : ` · ${b.axis} et ${b.against} ne sont pas voisins sur le tracé, une lecture que l'image fixe ne peut pas faire`),
  title: "5 pays sur 16 dépassent 25 % de nucléaire, 10 dépassent 20 % d'éolien — 2 font les deux",
  limits:
    `Sept axes, un par source, chacun avec SON PROPRE plafond : un axe partagé mentirait sur sept ` +
    `quantités. Une ligne par pays.`,
  // Shorter than the proof's own reading line: the proof's page overflows a 375 × 812 phone by 11 px.
  reading:
    `Lecture : survolez un point pour le pays et ses sept parts. Seuls deux axes VOISINS se ` +
    `comparent (nucléaire contre éolien : corrélation ${fr(corr, 2)}). Choisissez une des ${bands.length} bandes.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`,
  alt: ({ r }) =>
    `Sept axes verticaux, un par source d'électricité, reliés par ${lines.length} lignes, une ` +
    `par pays. Chaque axe a son propre plafond. Entre l'axe du nucléaire et celui de l'éolien, ` +
    `les lignes se croisent abondamment : les pays hauts sur l'un sont bas sur l'autre ` +
    `(corrélation ${fr(r, 2)}). Deux lignes, ${both.map((l) => l.name).join(" et ")}, sont ` +
    `hautes sur les deux et dessinées en couleur. ${bands.length} bandes nommées ` +
    `permettent de sélectionner une tranche d'un rail : les lignes qui la traversent ` +
    `s'épaississent et leurs sommets sont cerclés, et une phrase donne ce que cette ` +
    `sélection vaut sur un autre rail.`,
  evidenceLevels: 3,
  check() {
    if (lines.length !== 16) throw new Error(`the data holds ${lines.length} countries, not 16`);
    if (heavyNuclear.length !== 5) throw new Error(`${heavyNuclear.length} countries exceed ${NUCLEAR_FLOOR} % nuclear, not 5`);
    if (heavyWind.length !== 10) throw new Error(`${heavyWind.length} countries exceed ${WIND_FLOOR} % wind, not 10`);
    if (both.length !== 2) throw new Error(`${both.length} countries clear both thresholds, not 2`);
  },
};

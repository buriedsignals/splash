// beat.mjs for the worked example proof/web-radar-electricity-mix — "France et Allemagne : presque
// autant d'électricité, des mix opposés", as an interactive page. Every area, ratio and span is
// MEASURED by render-beat.mjs on the coordinates the page draws, and only WORDED here; every other
// number is computed from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const YEAR = 2024;
const AXES = [
  ["Nuclear", "nucléaire"], ["Wind", "éolien"], ["Solar", "solaire"], ["Hydropower", "hydraulique"],
  ["Bioenergy", "biomasse"], ["Gas", "gaz"], ["Coal", "charbon"], ["Oil", "pétrole"],
];
// The total each share is of counts "Other renewables" too, which is not a spoke.
const ALL = [...AXES.map(([k]) => k), "Other renewables"];
const NAMES = { FRA: "France", DEU: "Allemagne" };

// Each country: its share (%) of its own 2024 generation on every spoke, and the TWh behind it.
const shapes = ["FRA", "DEU"].map((code) => {
  const r = data.rows.find((row) => row[col("Code")] === code && row[col("Year")] === YEAR);
  const total = ALL.reduce((s, k) => s + Number(r[col(k)]), 0);
  return {
    key: code,
    name: NAMES[code],
    total,
    values: Object.fromEntries(AXES.map(([k]) => [k, (Number(r[col(k)]) / total) * 100])),
    amounts: Object.fromEntries(AXES.map(([k]) => [k, Number(r[col(k)])])),
  };
});
const [a, b] = shapes;
const sizeGap = Math.abs(a.total - b.total) / Math.max(a.total, b.total);

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const names = (list) => list.join(", ");

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  axes: AXES.map(([key, name]) => ({ key, name })),
  shapes,
  subject: "FRA",
  unit: "%",
  format: (v) => fr(v),
  ringLabel: (v) => `${v} %`,
  // What one vertex answers; `aside` when its spoke is out of the count.
  detail: (v) =>
    `${v.name} · ${v.axis} · ${fr(v.value)} % de son électricité (${fr(v.amount, 1)} TWh) · ${v.otherName} sur le même axe : ${fr(v.otherValue)} %` +
    (v.aside ? " · hors du compte : la forme ne passe plus par ce sommet" : ""),
  // The control: which spokes the outline counts.
  countLabel: "Sources comptées",
  noneLabel: "les huit",
  noneNote:
    "Les boutons ci-dessus retirent des sources du compte : les huit axes gardent leur place et leur nom, les sommets restent posés, la forme cesse d'y passer.",
  // The two areas, printed on the plot in every state.
  readout: (r) => `Aire · ${r.nameA} ${fr(r.areaA, 2)} % · ${r.nameB} ${fr(r.areaB, 2)} % du disque · ${fr(r.ratio, 2)} fois`,
  counts: [
    {
      label: "sans le nucléaire",
      axes: AXES.map(([k]) => k).filter((k) => k !== "Nuclear"),
      announce: () => `Ne compter que les sept autres sources, sans le nucléaire : l'axe où la ${a.name} fait ${fr(a.values.Nuclear)} % reste dessiné et sort du compte`,
      note: (r) =>
        `Sans le nucléaire, où la ${a.name} fait ${fr(a.values.Nuclear)} % : ${fr(r.areaA, 2)} % du disque contre ${fr(r.areaB, 2)} %, soit ` +
        `${fr(r.ratio, 2)} fois au lieu de ${fr(r.plateRatio, 2)}. Le sommet reste, il ne compte plus.`,
      alt: (r) =>
        `Les deux mêmes formes, sur les mêmes huit axes, le nucléaire écarté du compte : son rayon passe en pointillés et les deux sommets y ` +
        `restent posés, mais aucune des deux formes n'y passe plus. Elles couvrent ${fr(r.areaA, 2)} % et ${fr(r.areaB, 2)} % du disque.`,
    },
    {
      label: "le bas-carbone",
      axes: ["Nuclear", "Wind", "Solar", "Hydropower", "Bioenergy"],
      announce: (r) => `Ne compter que le bas-carbone : ${names(r.counted)}`,
      note: (r) =>
        `Bas-carbone seules : ${fr(r.areaA, 2)} % du disque contre ${fr(r.areaB, 2)} %, soit ${fr(r.ratio, 2)} fois au lieu de ${fr(r.plateRatio, 2)}` +
        (r.turnsOver ? " — la réponse s'est inversée." : "."),
      alt: (r) =>
        `Les deux mêmes formes, seules les cinq sources bas-carbone comptées (${names(r.counted)}) ; ${names(r.aside)} restent dessinés, en ` +
        `pointillés, hors du compte. La forme française est maintenant la plus grande des deux, à ${fr(r.areaA, 2)} % du disque contre ${fr(r.areaB, 2)} %.`,
    },
    {
      label: "les pilotables",
      axes: ["Nuclear", "Hydropower", "Bioenergy", "Gas", "Coal", "Oil"],
      announce: (r) => `Ne compter que les pilotables : ${names(r.counted)}, l'éolien et le solaire écartés`,
      note: (r) =>
        `Sans l'éolien ni le solaire : ${fr(r.areaA, 2)} % contre ${fr(r.areaB, 2)} %, soit ${fr(r.ratio, 2)} fois. Deux axes sortent du compte et la ` +
        `forme française GRANDIT : ${fr(r.plateAreaA, 2)} % avec les huit, ${fr(r.areaA, 2)} % sans eux.`,
      alt: (r) =>
        `Les deux mêmes formes, seules les six sources pilotables comptées ; l'éolien et le solaire restent dessinés, en pointillés, hors du compte. ` +
        `La forme française couvre ${fr(r.areaA, 2)} % du disque — plus qu'avec les huit axes — contre ${fr(r.areaB, 2)} % pour l'allemande.`,
    },
  ],
  title: "France et Allemagne : presque autant d'électricité, des mix opposés",
  limits:
    `Mix électrique ${YEAR}, en part de la production de chaque pays. ${fr(a.total, 0)} TWh contre ${fr(b.total, 0)} — à ${fr(sizeGap * 100, 0)} % ` +
    `l'un de l'autre. Nucléaire ${fr(a.values.Nuclear)} % contre ${fr(b.values.Nuclear, 0)} %, éolien et solaire ${fr(a.values.Wind + a.values.Solar)} % ` +
    `contre ${fr(b.values.Wind + b.values.Solar)} %.`,
  reading: ({ span, flipped, everyCount }) =>
    `Lecture : l'aire d'un radar ne mesure rien. Écartez une ou deux des huit sources : celle de la ${a.name} va de ${fr(span.lo, 2)} % à ` +
    `${fr(span.hi, 2)} % du disque, et ${fr(flipped, 0)} fois sur ${everyCount} elle dépasse l'${b.name}. Survolez un sommet.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`,
  alt:
    `Deux formes superposées sur huit axes. Celle de ${a.name} pointe très loin sur l'axe du nucléaire (${fr(a.values.Nuclear)} %) et reste près du ` +
    `centre partout ailleurs. Celle de ${b.name} est nulle sur le nucléaire et s'étend sur l'éolien (${fr(b.values.Wind)} %), le solaire ` +
    `(${fr(b.values.Solar)} %), le gaz (${fr(b.values.Gas)} %) et le charbon (${fr(b.values.Coal)} %). Les deux formes ne se recouvrent presque nulle ` +
    `part. Un choix au-dessus du graphique retire des sources du compte : les axes gardent leur place et leur nom, les sommets restent où ils sont, ` +
    `et les deux formes se referment sans eux.`,
  evidenceLevels: 2,
  check({ options }) {
    if (!(sizeGap < 0.2)) throw new Error(`the two totals differ by ${fr(sizeGap * 100)} %, not "nearly as much"`);
    if (!(a.values.Nuclear - b.values.Nuclear > 50)) throw new Error(`the nuclear gap is ${fr(a.values.Nuclear - b.values.Nuclear)} points: the mixes are not opposite`);
    // The low-carbon note says the answer turns over; it must.
    if (!options[1].turnsOver) throw new Error(`counting only low-carbon no longer turns "who covers more" over`);
  },
};

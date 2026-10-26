// beat.mjs for the worked example proof/scrolly-bar-top-emitters-2024 — "China emitted more CO2 in
// 2024 than the next five countries together", as a scrolly. Every number in a card is COMPUTED:
// the ranking, the run of five, the sums and the shares come from render-beat.mjs as `r` and are
// only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, CODE, YEAR_COL, VALUE] = [col("Entity"), col("Code"), col("Year"), col("Annual CO₂ emissions")];

// The whole ranking, every country (the tail is every one of them). OWID aggregates (World,
// continents, income groups) have no ISO-3 code and are left out; the World row is the whole.
const FRENCH = {
  China: { name: "Chine", withArticle: "la Chine" },
  "United States": { name: "États-Unis", withArticle: "les États-Unis" },
  India: { name: "Inde", withArticle: "l’Inde" },
  Russia: { name: "Russie", withArticle: "la Russie" },
  Japan: { name: "Japon", withArticle: "le Japon" },
  Indonesia: { name: "Indonésie", withArticle: "l’Indonésie" },
  Iran: { name: "Iran", withArticle: "l’Iran" },
  "Saudi Arabia": { name: "Arabie saoudite", withArticle: "l’Arabie saoudite" },
  "South Korea": { name: "Corée du Sud", withArticle: "la Corée du Sud" },
  Germany: { name: "Allemagne", withArticle: "l’Allemagne" },
};
const countries = data.rows.filter((r) => /^[A-Z]{3}$/.test(r[CODE]));
const rows = countries.map((r) => ({ name: FRENCH[r[COUNTRY]]?.name ?? r[COUNTRY], value: Number(r[VALUE]) / 1e9 }));
const world = Number(data.rows.find((r) => r[CODE] === "OWID_WRL")[VALUE]) / 1e9;
const YEAR = data.rows[0][YEAR_COL];

// The French article for a drawn country's name ("la Chine", "l’Inde").
const ARTICLE = Object.fromEntries(Object.values(FRENCH).map((f) => [f.name, f.withArticle]));
const named = (row) => {
  if (!ARTICLE[row.name]) throw new Error(`${row.name} reached the drawn rows and this beat has no French article for it`);
  return ARTICLE[row.name];
};
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
const fr = (v, digits) => v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** One decimal above 1 bn t, two below — at one decimal ranks 9 and 10 would both print `0,6`. */
const format = (v) => (v >= 1 ? v.toFixed(1) : v.toFixed(2)).replace(".", ",");
const percent = (v) => `${v.toFixed(0)} %`;

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  rows,
  drawCount: 10,
  subject: "Chine",
  whole: world,
  unit: `milliards de tonnes de CO₂, ${YEAR}`,
  format,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    tail: (r) => `Le CO₂ émis en ${YEAR} par chacun des ${r.count} pays, du plus gros au plus petit, en milliards de tonnes : quelques longues barres, puis une longue traîne.`,
    cut: (r) =>
      `Les ${SPELLED[r.drawCount]} plus gros gardent leur barre. Les ${r.othersCount} autres, mis bout à bout, font ${format(r.othersSum)} : moins que ${named(r.subject)} seule. Les ${SPELLED[r.drawCount]} pèsent ${percent(r.topShare)} des émissions mondiales.`,
    ranks: (r) => `Du dixième, ${named(r.last)} (${format(r.last.value)}), au deuxième, ${named(r.second)} (${format(r.second.value)}).`,
    subject: (r) => `Puis ${named(r.subject)} : ${format(r.subject.value)}, ${fr(r.ratio, 1)} fois ${named(r.second)}. À elle seule, ${percent(r.subjectShare)} du total mondial.`,
    stack: (r) => `Les ${SPELLED[r.stackCount]} suivants mis bout à bout : ${format(r.stackSum)}, moins que ${named(r.subject)} seule.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    tail: (r) => `${r.count} pays`,
    cut: (r) => `les ${SPELLED[r.drawCount]} : ${percent(r.topShare)} du monde`,
    ranks: () => `du 10e au 2e`,
    subject: (r) => `${r.subject.name} : ${percent(r.subjectShare)} du monde`,
    stack: (r) => `${format(r.stackSum)} contre ${format(r.subject.value)}`,
    reading: (r) => `les ${SPELLED[r.drawCount]} premiers en ${YEAR}`,
  },
  restName: (r) => `${r.othersCount} autres pays`,
  stackName: (r) => `${SPELLED[r.stackCount]} suivants`,
  title: [
    "La Chine a émis plus de CO₂ en 2024 que les cinq pays suivants réunis",
    "La Chine a émis plus que les cinq pays suivants réunis",
    "La Chine, plus que les cinq suivants",
  ],
  // The last card: the accounting the ranking rests on.
  limits:
    "Lecture : CO₂ territorial, combustibles fossiles et industrie. Les émissions contenues dans les biens importés sont comptées là où les biens sont produits.",
  source: `Source : Global Carbon Budget 2025, via Our World in Data · données ${YEAR}, extraites le 9 août 2026`,
  alt: (r) =>
    `Barres classant les ${SPELLED[r.drawCount]} pays qui ont le plus émis de CO₂ en ${YEAR}, et les ${r.othersCount} autres réunis. ` +
    `${capital(named(r.subject))} est très au-dessus avec ${format(r.subject.value)} milliards de tonnes, ` +
    `${fr(r.ratio, 1)} fois les ${format(r.second.value)} de ${named(r.second)}, et davantage que ` +
    `${r.stacked.map((s) => s.name).join(", ")} réunis (${format(r.stackSum)}).`,
  evidenceLevels: 2,
  check(r) {
    if (r.subject.name !== "Chine") throw new Error(`the leader is ${r.subject.name}, not China`);
    if (r.stackCount !== 5) throw new Error(`the title says the next five; the run of countries whose sum stays under China counts ${r.stackCount}`);
  },
};

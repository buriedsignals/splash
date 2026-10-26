// beat.mjs for the worked example proof/scrolly-bump-emitter-rank — "India rose from 8th to 3rd among
// the world's CO2 emitters", as a scrolly. Every rank is COMPUTED: each year's top ten, India's passes,
// the members it passed that later left come from render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, YEAR, VALUE] = [col("Entity"), col("Code"), col("Year"), col("Annual CO₂ emissions")];

// Every country, every year (aggregates have no ISO-3 code and are left out); the highest value ranks 1.
const rows = data.rows
  .filter((r) => /^[A-Z]{3}$/.test(r[CODE]) && Number.isFinite(Number(r[VALUE])) && Number(r[YEAR]) >= 1990 && Number(r[YEAR]) <= 2024)
  .map((r) => ({ name: r[ENTITY], year: Number(r[YEAR]), value: Number(r[VALUE]) }));

/** French names: [the name as printed, the name with its article]. Throws when the data brings a new member. */
const FRENCH = {
  "United States": ["États-Unis", "les États-Unis"], Russia: ["Russie", "la Russie"], China: ["Chine", "la Chine"], Japan: ["Japon", "le Japon"], Germany: ["Allemagne", "l’Allemagne"],
  Ukraine: ["Ukraine", "l’Ukraine"], "United Kingdom": ["Royaume-Uni", "le Royaume-Uni"], India: ["Inde", "l’Inde"], Canada: ["Canada", "le Canada"], Italy: ["Italie", "l’Italie"],
  Kuwait: ["Koweït", "le Koweït"], "South Korea": ["Corée du Sud", "la Corée du Sud"], France: ["France", "la France"], Iran: ["Iran", "l’Iran"],
  "Saudi Arabia": ["Arabie saoudite", "l’Arabie saoudite"], Indonesia: ["Indonésie", "l’Indonésie"],
};
const french = (name) => {
  if (!FRENCH[name]) throw new Error(`no French name recorded for ${name}`);
  return FRENCH[name];
};
const ORDINAL = (n) => (n === 1 ? "1er" : `${n}e`);
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  rows,
  subject: "India",
  maxRank: 10,
  // The two years cards 2 and 3 carry the playhead to.
  stops: [1999, 2009],
  display: (name) => french(name)[0],
  unit: "rang mondial, émissions annuelles de CO2",
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    start: (r) => `Les dix pays qui émettaient le plus de CO2 en ${r.first}, du premier en haut au dixième en bas. ${french(r.leaderFirst.name)[1].replace(/^./, (c) => c.toUpperCase())} mènent ; l’Inde est ${ORDINAL(r.subject.from)}.`,
    first: (r) => `Avançons dans le temps. D’ici ${r.stops[0]}, l’Inde dépasse ${listOf(r.passesFirst.map((p) => `${french(p.name)[1]} (${p.year})`))}.`,
    second: (r) =>
      `Puis ${listOf(r.passesSecond.map((p) => `${french(p.name)[1]} (${p.year})`))} : l’Inde est ${ORDINAL(r.subject.atStopB)} en ${r.stops[1]}. En ${r.leaderLast.since}, ${french(r.leaderLast.name)[1]} a pris la première place aux ${french(r.leaderFirst.name)[0]}.`,
    hold: (r) => `Jusqu’en ${r.last}, l’Inde tient cette ${ORDINAL(r.subject.to)} place.`,
    exit: (r) => `Deux des pays dépassés ont depuis quitté le top ${r.maxRank} : ${listOf(r.departed.map((d) => `${french(d.name)[1]} après ${d.lastYear}`))}. Leur ligne s’arrête là où ils sont sortis.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    start: (r) => `${r.first} : Inde ${ORDINAL(r.subject.from)}`,
    first: (r) => `${r.passesFirst.length} pays dépassés`,
    second: (r) => `${r.stops[1]} : Inde ${ORDINAL(r.subject.atStopB)}`,
    hold: (r) => `Inde ${ORDINAL(r.subject.to)} depuis ${r.stops[1]}`,
    exit: (r) => `${r.departed.length} sortis du top ${r.maxRank}`,
    reading: () => "le rang, pas la quantité",
  },
  // A pass `p` is { name, label, year, from, to }; a departed member `d` is { name, label, lastYear, maxRank }.
  labels: {
    crossing: (p) => `dépasse ${french(p.name)[1]} · ${p.year}`,
    exit: (d) => `sort du top ${d.maxRank} après ${d.lastYear}`,
  },
  title: ["L’Inde est passée du 8e au 3e rang mondial des émetteurs de CO2", "L’Inde, du 8e au 3e rang des émetteurs de CO2", "Les plus gros émetteurs de CO2, rang par rang"],
  // The last card: the accounting the ranking rests on.
  limits: "Lecture : la hauteur d’une ligne est son rang, pas ses émissions ; rien ici ne dit de combien. Émissions de combustibles fossiles et de l’industrie.",
  source: "Source : Global Carbon Budget (2025), via Our World in Data · combustibles fossiles et industrie uniquement",
  alt: (r) =>
    `Graphique de rangs : le rang mondial de ${r.members} pays par émissions annuelles de CO2 entre ${r.first} et ${r.last}. ` +
    `L’Inde passe du ${ORDINAL(r.subject.from)} au ${ORDINAL(r.subject.to)} rang en dépassant ${listOf(r.passes.map((p) => french(p.name)[1]))} ; ${french(r.leaderLast.name)[1]} prend la première place aux ${french(r.leaderFirst.name)[0]} en ${r.leaderLast.since}.`,
  evidenceLevels: 3,
  check(r) {
    if (!(r.subject.from === 8 && r.subject.to === 3)) throw new Error(`the title says India went from 8th to 3rd; ${r.subject.from} to ${r.subject.to}`);
    // Card 4 says India has held 3rd since the second stop; card 5 names two departed countries.
    if (!(r.heldFrom <= r.stops[1])) throw new Error(`card 4 says India has held rank ${r.subject.to} since ${r.stops[1]}; it holds it only from ${r.heldFrom}`);
    if (r.departed.length !== 2) throw new Error(`card 5 says two of the passed countries left the top ten; ${r.departed.length} did`);
    if (r.leaderLast.since === null) throw new Error(`card 3 says a new leader took first place; the leader never changed`);
  },
};

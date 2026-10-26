// beat.mjs for the worked example proof/scrolly-flow-map-ukraine-protection — "4,5 millions d'Ukrainiens
// sous protection temporaire — l'Allemagne et la Pologne en accueillent la moitié", as a scrolly. Every
// number in a card is COMPUTED: the total, the ranking and the shares come from render-beat.mjs as `r`
// and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [CODE, MONTH, PEOPLE] = [col("code"), col("month"), col("people")];
const month = table.rows[0][MONTH];
if (table.rows.some((r) => r[MONTH] !== month)) throw new Error("the map draws one month and data.json holds more than one");

// The French names (and articles) the cards print.
const NAMES = {
  DEU: ["Allemagne", "l’Allemagne"], POL: ["Pologne", "la Pologne"], CZE: ["Tchéquie", "la Tchéquie"], ESP: ["Espagne", "l’Espagne"],
  ROU: ["Roumanie", "la Roumanie"], SVK: ["Slovaquie", "la Slovaquie"], NLD: ["Pays-Bas", "les Pays-Bas"], IRL: ["Irlande", "l’Irlande"],
  BEL: ["Belgique", "la Belgique"], AUT: ["Autriche", "l’Autriche"], NOR: ["Norvège"], BGR: ["Bulgarie"], CHE: ["Suisse"], FIN: ["Finlande"],
  PRT: ["Portugal"], FRA: ["France"], DNK: ["Danemark"], LTU: ["Lituanie"], HUN: ["Hongrie"], SWE: ["Suède"], GRC: ["Grèce"], ITA: ["Italie"],
  LVA: ["Lettonie"], EST: ["Estonie"], HRV: ["Croatie"], CYP: ["Chypre"], SVN: ["Slovénie"], ISL: ["Islande"], LUX: ["Luxembourg"],
  MLT: ["Malte"], LIE: ["Liechtenstein"],
};
const named = (iso) => {
  if (!NAMES[iso]) throw new Error(`${iso} has no French name in this beat`);
  return NAMES[iso];
};
const article = (iso) => {
  if (!named(iso)[1]) throw new Error(`${iso} is named with its article by a card and this beat has none for it`);
  return named(iso)[1];
};
const flows = table.rows.map((r) => ({ iso: r[CODE], name: named(r[CODE])[0], value: Number(r[PEOPLE]) }));

const n0 = (v) => Math.round(v).toLocaleString("fr-FR");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const [year, mm] = month.split("-");
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const when = `${MONTHS[Number(mm) - 1]} ${year}`;
const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];

export default {
  lang: "fr",
  eyebrow: "Migrations · Europe",
  // The one country every band leaves; `short` is its name where a phone is narrow.
  origin: { iso: "UKR", name: "Ukraine", short: "UKR" },
  flows,
  drawCount: 10,
  unit: `personnes sous protection temporaire, ${when}`,
  totalNote: (r) => `${n0(r.total)} personnes`,
  counter: (r) => `{p} % des ${n0(r.total)} personnes`,
  othersNote: (r) => `${r.restCount} autres pays : ${Math.round(r.restShare)} %`,
  drawnNote: (r) => `${r.drawCount} rubans, ${Math.round(r.drawnShare)} % des personnes`,
  othersKey: (r) => `${r.restCount} autres pays, trop petits pour un ruban`,
  keySizes: [1e6, 1e5],
  format: (v) => `${n0(v)} personnes`,
  count: n0,
  percent: (v) => `${one(v)} %`,
  cards: {
    origin: (r) => `En ${when}, ${n0(r.total)} Ukrainiens bénéficient de la protection temporaire dans ${r.count} pays européens.`,
    first: (r) => `Un ruban par pays d’accueil ; sa largeur est le nombre de personnes. Le plus large va en ${r.first.name} : ${n0(r.first.value)} personnes, ${one(r.first.share)} %.`,
    second: (r) => `Le deuxième, en ${r.second.name} : ${n0(r.second.value)}. À elles deux, ${one(r.topTwoShare)} % : la moitié.`,
    drawn: (r) => `Les ${SPELLED[r.drawCount - 2]} pays suivants, de ${article(r.third.iso)} à ${article(r.last.iso)}. Les ${r.drawCount} rubans portent ${Math.round(r.drawnShare)} % des personnes.`,
    others: (r) => `Les ${r.restCount} autres pays en accueillent ${Math.round(r.restShare)} % : un point chacun, trop peu pour un ruban.`,
  },
  title: [
    "4,5 millions d’Ukrainiens sous protection temporaire — l’Allemagne et la Pologne en accueillent la moitié",
    "4,5 millions d’Ukrainiens sous protection temporaire en Europe",
    "La protection temporaire, pays par pays",
  ],
  limits: "Lecture : les rubans ne sont pas des itinéraires, personne n’a suivi ces courbes. Seule leur largeur est une mesure.",
  source: `Source : Eurostat, bénéficiaires de la protection temporaire (migr_asytpsm), ${month} · fond de carte © MapTiler © OpenStreetMap`,
  alt: (r) =>
    `Carte des flux : un ruban part de l’Ukraine vers chacun des ${r.drawCount} principaux pays d’accueil, sa largeur étant le nombre de personnes ` +
    `sous protection temporaire en ${when}. ${n0(r.total)} personnes au total ; l’Allemagne et la Pologne en accueillent ${one(r.topTwoShare)} %, ` +
    `les ${r.drawCount} rubans ${Math.round(r.drawnShare)} %.`,
  // The claim checked against the drawn data (CONTRACT.md).
  check(r) {
    if (r.first.iso !== "DEU" || r.second.iso !== "POL") throw new Error(`the title names Germany and Poland as the two largest hosts; they are ${r.first.iso} and ${r.second.iso}`);
    if (!(r.topTwoShare > 45 && r.topTwoShare < 55)) throw new Error(`the title says the two largest hosts take about half; they take ${r.topTwoShare.toFixed(1)} %`);
    if (Math.round(r.total / 1e5) !== 45) throw new Error(`the title says 4,5 million; the file totals ${r.total}`);
  },
};

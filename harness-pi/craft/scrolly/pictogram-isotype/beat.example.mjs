// beat.mjs for the worked example proof/scrolly-pictogram-europe-lowcarbon — "L’Europe électrique est
// aux deux bouts : 6 pays seulement au milieu", as a scrolly. Every number in a card is COMPUTED: the
// three blocks, their counts and the two ends of the axis come from render-beat.mjs as `r` and are
// only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

const YEAR = 2024;
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const FRENCH = {
  ALB: ["Albanie", "l’Albanie"], AUT: ["Autriche", "l’Autriche"], BLR: ["Biélorussie", "la Biélorussie"], BEL: ["Belgique", "la Belgique"],
  BIH: ["Bosnie-Herzégovine", "la Bosnie-Herzégovine"], BGR: ["Bulgarie", "la Bulgarie"], HRV: ["Croatie", "la Croatie"], CYP: ["Chypre", "Chypre"],
  CZE: ["Tchéquie", "la Tchéquie"], DNK: ["Danemark", "le Danemark"], EST: ["Estonie", "l’Estonie"], FIN: ["Finlande", "la Finlande"], FRA: ["France", "la France"],
  DEU: ["Allemagne", "l’Allemagne"], GRC: ["Grèce", "la Grèce"], HUN: ["Hongrie", "la Hongrie"], ISL: ["Islande", "l’Islande"], IRL: ["Irlande", "l’Irlande"],
  ITA: ["Italie", "l’Italie"], LVA: ["Lettonie", "la Lettonie"], LTU: ["Lituanie", "la Lituanie"], LUX: ["Luxembourg", "le Luxembourg"], MLT: ["Malte", "Malte"],
  MDA: ["Moldavie", "la Moldavie"], MNE: ["Monténégro", "le Monténégro"], NLD: ["Pays-Bas", "les Pays-Bas"], MKD: ["Macédoine du Nord", "la Macédoine du Nord"],
  NOR: ["Norvège", "la Norvège"], POL: ["Pologne", "la Pologne"], PRT: ["Portugal", "le Portugal"], ROU: ["Roumanie", "la Roumanie"], RUS: ["Russie", "la Russie"],
  SRB: ["Serbie", "la Serbie"], SVK: ["Slovaquie", "la Slovaquie"], SVN: ["Slovénie", "la Slovénie"], ESP: ["Espagne", "l’Espagne"], SWE: ["Suède", "la Suède"],
  CHE: ["Suisse", "la Suisse"], TUR: ["Turquie", "la Turquie"], UKR: ["Ukraine", "l’Ukraine"], GBR: ["Royaume-Uni", "le Royaume-Uni"],
};

// One square per country: its low-carbon share (renewables and nuclear) of its 2024 generation, in %.
// A country that reports no generation has no reading: it is not drawn, and the key says so.
const measured = data.rows
  .filter((r) => Number(r[at("year")]) === YEAR)
  .map((r) => {
    const code = r[at("code")];
    if (!FRENCH[code]) throw new Error(`no French name recorded for ${code}`);
    const clean = CLEAN.reduce((s, k) => s + Number(r[at(k)] || 0), 0);
    const total = clean + FOSSIL.reduce((s, k) => s + Number(r[at(k)] || 0), 0);
    return { key: code, label: FRENCH[code][0], value: total > 0 ? (clean / total) * 100 : null };
  });
const units = measured.filter((m) => m.value !== null);
const absent = measured.filter((m) => m.value === null).map((m) => m.label);

const the = Object.fromEntries(Object.values(FRENCH));
const whole = (v) => `${Math.round(v)} %`;
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  units,
  floors: [60, 75],
  breaks: [40, 60, 75, 94],
  formatBreak: (b) => `${b} %`,
  format: whole,
  unitIs: "un carré = un pays",
  absent,
  absentNote: `${cap(the[absent[0]])}, sans donnée ${YEAR}, n’est pas dessinée.`,
  // The name printed after each block's count.
  blockNames: {
    top: (r) => `pays au-dessus de ${r.floors.high} % d’électricité bas-carbone`,
    middle: (r) => `entre ${r.floors.low} et ${r.floors.high} %`,
    bottom: (r) => `sous ${r.floors.low} %`,
  },
  // The two ends of the axis, named on card 1.
  ends: {
    low: (r) => `${r.lowest.label} ${whole(r.lowest.value)}`,
    high: (r) => `${listOf(r.highest.map((u) => u.label))} ${whole(r.highest[0].value)}`,
  },
  // Written under the middle block on card 4.
  middleNames: (r) => r.middle.units.map((u) => `${u.label} ${whole(u.value)}`).join(" · "),
  cards: {
    axis: (r) => `Un carré, un pays : ${r.count} pays européens, chacun posé à sa part d’électricité bas-carbone en ${YEAR}, renouvelables et nucléaire réunis. De ${whole(r.lowest.value)} en ${r.lowest.label} à ${whole(r.highest[0].value)} en ${listOf(r.highest.map((u) => u.label))}.`,
    floors: (r) => `Traçons deux seuils : ${r.floors.low} % et ${r.floors.high} %.`,
    count: (r) => `Comptons les carrés de part et d’autre : ${r.top.count} pays au-dessus de ${r.floors.high} %, ${r.bottom.count} sous ${r.floors.low} %, ${r.middle.count} seulement entre les deux.`,
    middle: (r) => `Les ${r.middle.count} du milieu : ${listOf(r.middle.units.map((u) => the[u.label]))}.`,
    ends: (r) => `Aux deux bouts, ${r.endsCount} pays. Chaque carré prend la teinte de sa classe, de moins de ${r.breaks[0]} % à plus de ${r.breaks[r.breaks.length - 1]} %.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    axis: (r) => `de ${whole(r.lowest.value)} à ${whole(r.highest[0].value)}`,
    floors: (r) => `seuils : ${r.floors.low} % et ${r.floors.high} %`,
    count: (r) => `${r.top.count} · ${r.middle.count} · ${r.bottom.count}`,
    middle: (r) => `${r.middle.count} pays entre ${r.floors.low} et ${r.floors.high} %`,
    ends: (r) => `${r.endsCount} pays aux deux bouts`,
  },
  title: [
    "L’Europe électrique est aux deux bouts : 6 pays seulement au milieu",
    "L’Europe électrique est aux deux bouts",
    "Aux deux bouts, 6 au milieu",
  ],
  // The last card: how the plate reads.
  limits:
    "Lecture : chaque carré est un pays et se compte. Sa teinte donne sa classe, dont les bornes sont sous la grille ; le nombre devant chaque bloc est son compte, en pays.",
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Pictogramme : ${r.count} carrés, un par pays européen, rangés par part d’électricité bas-carbone en ${YEAR}. ` +
    `${r.top.count} pays dépassent ${r.floors.high} %, ${r.bottom.count} sont sous ${r.floors.low} %, et ${r.middle.count} seulement se tiennent entre les deux : ${listOf(r.middle.units.map((u) => u.label))}.`,
  evidenceLevels: 5,
  check(r) {
    if (r.middle.count !== 6) throw new Error(`the title says 6 countries in the middle; ${r.middle.count} sit between ${r.floors.low} and ${r.floors.high} %`);
    if (!(r.middle.count * 4 < r.count)) throw new Error(`the title says only a few sit in the middle; ${r.middle.count} of ${r.count} do`);
  },
};
